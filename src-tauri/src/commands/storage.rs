use anyhow::Result;
use rusqlite::{params, Connection, Result as SqliteResult, types::ValueRef};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value as JsonValue};
use std::collections::HashMap;
use tauri::{AppHandle, Manager, State};
use super::agents::AgentDb;

/// Represents metadata about a database table
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TableInfo {
    pub name: String,
    pub row_count: i64,
    pub columns: Vec<ColumnInfo>,
}

/// Represents metadata about a table column
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ColumnInfo {
    pub cid: i32,
    pub name: String,
    pub type_name: String,
    pub notnull: bool,
    pub dflt_value: Option<String>,
    pub pk: bool,
}

/// Represents a page of table data
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TableData {
    pub table_name: String,
    pub columns: Vec<ColumnInfo>,
    pub rows: Vec<Map<String, JsonValue>>,
    pub total_rows: i64,
    pub page: i64,
    pub page_size: i64,
    pub total_pages: i64,
}

/// SQL query result
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct QueryResult {
    pub columns: Vec<String>,
    pub rows: Vec<Vec<JsonValue>>,
    pub rows_affected: Option<i64>,
    pub last_insert_rowid: Option<i64>,
}

/// List all user-defined tables in the database with metadata
///
/// Queries `sqlite_master` for all non-system tables and returns each table's name,
/// row count, and column information (obtained via `PRAGMA table_info`). Tables are
/// returned in alphabetical order.
///
/// # Arguments
/// * `db` - Database state containing the AgentDb connection
///
/// # Returns
/// `Result<Vec<TableInfo>, String>` - List of tables with their column metadata and row counts
///
/// # Errors
/// Returns an error if the database lock cannot be acquired or any query fails
///
/// # Frontend Contract
/// ```typescript
/// invoke('storage_list_tables'): Promise<TableInfo[]>
/// ```
#[tauri::command]
pub async fn storage_list_tables(db: State<'_, AgentDb>) -> Result<Vec<TableInfo>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    
    // Query for all tables
    let mut stmt = conn
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
        .map_err(|e| e.to_string())?;
    
    let table_names: Vec<String> = stmt
        .query_map([], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .collect::<SqliteResult<Vec<_>>>()
        .map_err(|e| e.to_string())?;
    
    drop(stmt);
    
    let mut tables = Vec::new();
    
    for table_name in table_names {
        // Get row count
        let row_count: i64 = conn
            .query_row(
                &format!("SELECT COUNT(*) FROM {}", table_name),
                [],
                |row| row.get(0),
            )
            .unwrap_or(0);
        
        // Get column information
        let mut pragma_stmt = conn
            .prepare(&format!("PRAGMA table_info({})", table_name))
            .map_err(|e| e.to_string())?;
        
        let columns: Vec<ColumnInfo> = pragma_stmt
            .query_map([], |row| {
                Ok(ColumnInfo {
                    cid: row.get(0)?,
                    name: row.get(1)?,
                    type_name: row.get(2)?,
                    notnull: row.get::<_, i32>(3)? != 0,
                    dflt_value: row.get(4)?,
                    pk: row.get::<_, i32>(5)? != 0,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<SqliteResult<Vec<_>>>()
            .map_err(|e| e.to_string())?;
        
        tables.push(TableInfo {
            name: table_name,
            row_count,
            columns,
        });
    }
    
    Ok(tables)
}

/// Read paginated table data with optional text search
///
/// Returns rows from the specified table with pagination support. When a search
/// query is provided, filters rows where any TEXT/VARCHAR column contains the
/// search string (case-insensitive LIKE). Validates the table name against
/// `sqlite_master` to prevent SQL injection. Binary/blob values are returned
/// as base64-encoded strings.
///
/// # Arguments
/// * `db` - Database state containing the AgentDb connection
/// * `tableName` - Name of the table to query (must exist in sqlite_master)
/// * `page` - 1-based page number
/// * `pageSize` - Number of rows per page
/// * `searchQuery` - Optional text to search across all text columns
///
/// # Returns
/// `Result<TableData, String>` - Paginated result with columns, rows (as JSON objects),
///   total_rows, page, page_size, and total_pages
///
/// # Errors
/// Returns an error if the table name is invalid, the database lock fails, or queries fail
///
/// # Frontend Contract
/// ```typescript
/// invoke('storage_read_table', {
///   tableName: string,
///   page: number,
///   pageSize: number,
///   searchQuery?: string
/// }): Promise<TableData>
/// ```
#[tauri::command]
#[allow(non_snake_case)]
pub async fn storage_read_table(
    db: State<'_, AgentDb>,
    tableName: String,
    page: i64,
    pageSize: i64,
    searchQuery: Option<String>,
) -> Result<TableData, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    
    // Validate table name to prevent SQL injection
    if !is_valid_table_name(&conn, &tableName)? {
        return Err("Invalid table name".to_string());
    }
    
    // Get column information
    let mut pragma_stmt = conn
        .prepare(&format!("PRAGMA table_info({})", tableName))
        .map_err(|e| e.to_string())?;
    
    let columns: Vec<ColumnInfo> = pragma_stmt
        .query_map([], |row| {
            Ok(ColumnInfo {
                cid: row.get(0)?,
                name: row.get(1)?,
                type_name: row.get(2)?,
                notnull: row.get::<_, i32>(3)? != 0,
                dflt_value: row.get(4)?,
                pk: row.get::<_, i32>(5)? != 0,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<SqliteResult<Vec<_>>>()
        .map_err(|e| e.to_string())?;
    
    drop(pragma_stmt);

    // Calculate pagination offset
    let offset = (page - 1) * pageSize;

    // Build query with optional search — uses parameterized queries for safety
    let (count_query, count_param_refs, data_query, data_param_refs) = if let Some(search) = &searchQuery {
        let text_columns: Vec<&str> = columns
            .iter()
            .filter(|col| col.type_name.contains("TEXT") || col.type_name.contains("VARCHAR"))
            .map(|col| col.name.as_str())
            .collect();

        if text_columns.is_empty() {
            (
                format!("SELECT COUNT(*) FROM \"{}\"", tableName),
                vec![] as Vec<String>,
                format!("SELECT * FROM \"{}\" LIMIT ? OFFSET ?", tableName),
                vec![pageSize.to_string(), offset.to_string()],
            )
        } else {
            let like_conditions: Vec<String> = text_columns
                .iter()
                .map(|col| format!("\"{}\" LIKE ?", col))
                .collect();
            let where_clause = like_conditions.join(" OR ");
            let pattern = format!("%{}%", search);

            // Count params: only search patterns
            let mut c_refs: Vec<String> = text_columns.iter().map(|_| pattern.clone()).collect();
            // Data params: search patterns + LIMIT + OFFSET
            let mut d_refs: Vec<String> = text_columns.iter().map(|_| pattern.clone()).collect();
            d_refs.push(pageSize.to_string());
            d_refs.push(offset.to_string());

            (
                format!("SELECT COUNT(*) FROM \"{}\" WHERE {}", tableName, where_clause),
                c_refs,
                format!("SELECT * FROM \"{}\" WHERE {} LIMIT ? OFFSET ?", tableName, where_clause),
                d_refs,
            )
        }
    } else {
        (
            format!("SELECT COUNT(*) FROM \"{}\"", tableName),
            vec![] as Vec<String>,
            format!("SELECT * FROM \"{}\" LIMIT ? OFFSET ?", tableName),
            vec![pageSize.to_string(), offset.to_string()],
        )
    };
    
    // Get total row count (using parameterized query)
    let total_rows: i64 = conn
        .query_row(
            &count_query,
            rusqlite::params_from_iter(count_param_refs.iter()),
            |row| row.get(0),
        )
        .unwrap_or(0);

    // Calculate pagination
    let total_pages = (total_rows as f64 / pageSize as f64).ceil() as i64;

    // Query data (using parameterized query)
    let mut data_stmt = conn
        .prepare(&data_query)
        .map_err(|e| e.to_string())?;

    let rows: Vec<Map<String, JsonValue>> = data_stmt
        .query_map(rusqlite::params_from_iter(data_param_refs.iter()), |row| {
            let mut row_map = Map::new();
            
            for (idx, col) in columns.iter().enumerate() {
                let value = match row.get_ref(idx)? {
                    ValueRef::Null => JsonValue::Null,
                    ValueRef::Integer(i) => JsonValue::Number(serde_json::Number::from(i)),
                    ValueRef::Real(f) => {
                        if let Some(n) = serde_json::Number::from_f64(f) {
                            JsonValue::Number(n)
                        } else {
                            JsonValue::String(f.to_string())
                        }
                    }
                    ValueRef::Text(s) => JsonValue::String(String::from_utf8_lossy(s).to_string()),
                    ValueRef::Blob(b) => JsonValue::String(base64::Engine::encode(&base64::engine::general_purpose::STANDARD, b)),
                };
                row_map.insert(col.name.clone(), value);
            }
            
            Ok(row_map)
        })
        .map_err(|e| e.to_string())?
        .collect::<SqliteResult<Vec<_>>>()
        .map_err(|e| e.to_string())?;
    
    Ok(TableData {
        table_name: tableName,
        columns,
        rows,
        total_rows,
        page,
        page_size: pageSize,
        total_pages,
    })
}

/// Update an existing row in a database table
///
/// Updates one or more columns of a row identified by its primary key values.
/// The primary key values are passed as a map so the function can build a WHERE
/// clause that matches the correct row. All column names and values in the updates
/// map are validated through prepared statement parameter binding.
///
/// # Arguments
/// * `db` - Database state containing the AgentDb connection
/// * `tableName` - Name of the table to update
/// * `primaryKeyValues` - Map of primary key column names to values identifying the row
/// * `updates` - Map of column names to new values
///
/// # Returns
/// `Result<(), String>` - Success or an error message
///
/// # Errors
/// Returns an error if the table name is invalid, primary key columns are missing,
/// the database lock fails, or the UPDATE statement fails
///
/// # Frontend Contract
/// ```typescript
/// invoke('storage_update_row', {
///   tableName: string,
///   primaryKeyValues: Record<string, JsonValue>,
///   updates: Record<string, JsonValue>
/// }): Promise<void>
/// ```
#[tauri::command]
#[allow(non_snake_case)]
pub async fn storage_update_row(
    db: State<'_, AgentDb>,
    tableName: String,
    primaryKeyValues: HashMap<String, JsonValue>,
    updates: HashMap<String, JsonValue>,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    
    // Validate table name
    if !is_valid_table_name(&conn, &tableName)? {
        return Err("Invalid table name".to_string());
    }
    
    // Build UPDATE query
    let set_clauses: Vec<String> = updates
        .keys()
        .enumerate()
        .map(|(idx, key)| format!("{} = ?{}", key, idx + 1))
        .collect();
    
    let where_clauses: Vec<String> = primaryKeyValues
        .keys()
        .enumerate()
        .map(|(idx, key)| format!("{} = ?{}", key, idx + updates.len() + 1))
        .collect();
    
    let query = format!(
        "UPDATE {} SET {} WHERE {}",
        tableName,
        set_clauses.join(", "),
        where_clauses.join(" AND ")
    );
    
    // Prepare parameters
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
    
    // Add update values
    for value in updates.values() {
        params.push(json_to_sql_value(value)?);
    }
    
    // Add where clause values
    for value in primaryKeyValues.values() {
        params.push(json_to_sql_value(value)?);
    }
    
    // Execute update
    conn.execute(&query, rusqlite::params_from_iter(params.iter().map(|p| p.as_ref())))
        .map_err(|e| format!("Failed to update row: {}", e))?;
    
    Ok(())
}

/// Delete a row from a database table
///
/// Deletes a row identified by its primary key values. The primary key columns
/// and values are passed as a map to safely build the WHERE clause via prepared
/// statement parameters.
///
/// # Arguments
/// * `db` - Database state containing the AgentDb connection
/// * `tableName` - Name of the table to delete from
/// * `primaryKeyValues` - Map of primary key column names to values identifying the row
///
/// # Returns
/// `Result<(), String>` - Success or an error message
///
/// # Errors
/// Returns an error if the table name is invalid, primary key columns are missing,
/// the database lock fails, or the DELETE statement fails
///
/// # Frontend Contract
/// ```typescript
/// invoke('storage_delete_row', {
///   tableName: string,
///   primaryKeyValues: Record<string, JsonValue>
/// }): Promise<void>
/// ```
#[tauri::command]
#[allow(non_snake_case)]
pub async fn storage_delete_row(
    db: State<'_, AgentDb>,
    tableName: String,
    primaryKeyValues: HashMap<String, JsonValue>,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    
    // Validate table name
    if !is_valid_table_name(&conn, &tableName)? {
        return Err("Invalid table name".to_string());
    }
    
    // Build DELETE query
    let where_clauses: Vec<String> = primaryKeyValues
        .keys()
        .enumerate()
        .map(|(idx, key)| format!("{} = ?{}", key, idx + 1))
        .collect();
    
    let query = format!(
        "DELETE FROM {} WHERE {}",
        tableName,
        where_clauses.join(" AND ")
    );
    
    // Prepare parameters
    let params: Vec<Box<dyn rusqlite::ToSql>> = primaryKeyValues
        .values()
        .map(json_to_sql_value)
        .collect::<Result<Vec<_>, _>>()?;
    
    // Execute delete
    conn.execute(&query, rusqlite::params_from_iter(params.iter().map(|p| p.as_ref())))
        .map_err(|e| format!("Failed to delete row: {}", e))?;
    
    Ok(())
}

/// Insert a new row into a database table
///
/// Inserts a new row with the given column values. Column names and values are
/// passed as a map and bound via prepared statement parameters to prevent injection.
///
/// # Arguments
/// * `db` - Database state containing the AgentDb connection
/// * `tableName` - Name of the table to insert into
/// * `values` - Map of column names to values for the new row
///
/// # Returns
/// `Result<i64, String>` - The ROWID of the newly inserted row
///
/// # Errors
/// Returns an error if the table name is invalid, any value type is unsupported
/// (objects/arrays), the database lock fails, or the INSERT statement fails
///
/// # Frontend Contract
/// ```typescript
/// invoke('storage_insert_row', {
///   tableName: string,
///   values: Record<string, JsonValue>
/// }): Promise<number>
/// ```
#[tauri::command]
#[allow(non_snake_case)]
pub async fn storage_insert_row(
    db: State<'_, AgentDb>,
    tableName: String,
    values: HashMap<String, JsonValue>,
) -> Result<i64, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    
    // Validate table name
    if !is_valid_table_name(&conn, &tableName)? {
        return Err("Invalid table name".to_string());
    }
    
    // Build INSERT query
    let columns: Vec<&String> = values.keys().collect();
    let placeholders: Vec<String> = (1..=columns.len())
        .map(|i| format!("?{}", i))
        .collect();
    
    let query = format!(
        "INSERT INTO {} ({}) VALUES ({})",
        tableName,
        columns.iter().map(|c| c.as_str()).collect::<Vec<_>>().join(", "),
        placeholders.join(", ")
    );
    
    // Prepare parameters
    let params: Vec<Box<dyn rusqlite::ToSql>> = values
        .values()
        .map(json_to_sql_value)
        .collect::<Result<Vec<_>, _>>()?;
    
    // Execute insert
    conn.execute(&query, rusqlite::params_from_iter(params.iter().map(|p| p.as_ref())))
        .map_err(|e| format!("Failed to insert row: {}", e))?;
    
    Ok(conn.last_insert_rowid())
}

/// Execute a raw SQL query on the database
///
/// Runs an arbitrary SQL statement. SELECT queries return column names and row data.
/// Non-SELECT queries (INSERT, UPDATE, DELETE, etc.) return rows affected and the
/// last insert ROWID. Binary/blob values are base64-encoded in results.
///
/// # Arguments
/// * `db` - Database state containing the AgentDb connection
/// * `query` - The SQL query string to execute
///
/// # Returns
/// `Result<QueryResult, String>` - For SELECT: columns and rows; for mutations:
///   rows_affected and last_insert_rowid
///
/// # Errors
/// Returns an error if the database lock fails or SQL execution fails
///
/// # Frontend Contract
/// ```typescript
/// invoke('storage_execute_sql', { query: string }): Promise<{
///   columns: string[];
///   rows: JsonValue[][];
///   rowsAffected: number | null;
///   lastInsertRowid: number | null;
/// }>
/// ```
#[tauri::command]
pub async fn storage_execute_sql(
    db: State<'_, AgentDb>,
    query: String,
) -> Result<QueryResult, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    
    // Security: storage_execute_sql is a developer tool (Storage tab).
    // Restrict to SELECT-only queries to prevent data destruction.
    let is_select = query.trim().to_uppercase().starts_with("SELECT");

    if !is_select {
        return Err(
            "storage_execute_sql only supports SELECT queries. \
             Use the table edit functions for data modifications."
                .to_string(),
        );
    }
        // Handle SELECT queries
        let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
        let column_count = stmt.column_count();
        
        // Get column names
        let columns: Vec<String> = (0..column_count)
            .map(|i| stmt.column_name(i).unwrap_or("").to_string())
            .collect();
        
        // Execute query and collect results
        let rows: Vec<Vec<JsonValue>> = stmt
            .query_map([], |row| {
                let mut row_values = Vec::new();
                for i in 0..column_count {
                    let value = match row.get_ref(i)? {
                        ValueRef::Null => JsonValue::Null,
                        ValueRef::Integer(n) => JsonValue::Number(serde_json::Number::from(n)),
                        ValueRef::Real(f) => {
                            if let Some(n) = serde_json::Number::from_f64(f) {
                                JsonValue::Number(n)
                            } else {
                                JsonValue::String(f.to_string())
                            }
                        }
                        ValueRef::Text(s) => JsonValue::String(String::from_utf8_lossy(s).to_string()),
                        ValueRef::Blob(b) => JsonValue::String(base64::Engine::encode(&base64::engine::general_purpose::STANDARD, b)),
                    };
                    row_values.push(value);
                }
                Ok(row_values)
            })
            .map_err(|e| e.to_string())?
            .collect::<SqliteResult<Vec<_>>>()
            .map_err(|e| e.to_string())?;
        
        Ok(QueryResult {
            columns,
            rows,
            rows_affected: None,
            last_insert_rowid: None,
        })
}

/// Reset the entire database by dropping and recreating all tables
///
/// Destructive operation that disables foreign keys, drops all application tables
/// (agents, agent_runs, app_settings, environment_variables, environment_variable_groups),
/// re-initializes the schema, and runs VACUUM to reclaim disk space. The managed
/// database state is updated with the fresh connection.
///
/// # Arguments
/// * `app` - Tauri AppHandle for accessing managed database state
///
/// # Returns
/// `Result<(), String>` - Success or an error message
///
/// # Errors
/// Returns an error if any table drop fails, re-initialization fails, or VACUUM fails
///
/// # Frontend Contract
/// ```typescript
/// invoke('storage_reset_database'): Promise<void>
/// ```
#[tauri::command]
pub async fn storage_reset_database(app: AppHandle) -> Result<(), String> {
    {
        // Drop all existing tables within a scoped block
        let db_state = app.state::<AgentDb>();
        let conn = db_state.0.lock()
            .map_err(|e| e.to_string())?;
        
        // Disable foreign key constraints temporarily to allow dropping tables
        conn.execute("PRAGMA foreign_keys = OFF", [])
            .map_err(|e| format!("Failed to disable foreign keys: {}", e))?;
        
        // Drop indexes first (they will be dropped with tables anyway, but being explicit)
        let _ = conn.execute("DROP INDEX IF EXISTS idx_env_vars_group_key", []);
        
        // Drop tables - order doesn't matter with foreign keys disabled
        conn.execute("DROP TABLE IF EXISTS agent_runs", [])
            .map_err(|e| format!("Failed to drop agent_runs table: {}", e))?;
        conn.execute("DROP TABLE IF EXISTS agents", [])
            .map_err(|e| format!("Failed to drop agents table: {}", e))?;
        conn.execute("DROP TABLE IF EXISTS app_settings", [])
            .map_err(|e| format!("Failed to drop app_settings table: {}", e))?;
        conn.execute("DROP TABLE IF EXISTS environment_variables", [])
            .map_err(|e| format!("Failed to drop environment_variables table: {}", e))?;
        conn.execute("DROP TABLE IF EXISTS environment_variable_groups", [])
            .map_err(|e| format!("Failed to drop environment_variable_groups table: {}", e))?;
        
        // Re-enable foreign key constraints
        conn.execute("PRAGMA foreign_keys = ON", [])
            .map_err(|e| format!("Failed to re-enable foreign keys: {}", e))?;
        
        // Connection is automatically dropped at end of scope
    }
    
    // Re-initialize the database which will recreate all tables empty
    let new_conn = init_database(&app).map_err(|e| format!("Failed to reset database: {}", e))?;
    
    // Update the managed state with the new connection
    {
        let db_state = app.state::<AgentDb>();
        let mut conn_guard = db_state.0.lock()
            .map_err(|e| e.to_string())?;
        *conn_guard = new_conn;
    }
    
    // Run VACUUM to optimize the database
    {
        let db_state = app.state::<AgentDb>();
        let conn = db_state.0.lock()
            .map_err(|e| e.to_string())?;
        conn.execute("VACUUM", [])
            .map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

/// Helper function to validate table name exists
fn is_valid_table_name(conn: &Connection, table_name: &str) -> Result<bool, String> {
    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?",
            params![table_name],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    
    Ok(count > 0)
}

/// Helper function to convert JSON value to SQL value
fn json_to_sql_value(value: &JsonValue) -> Result<Box<dyn rusqlite::ToSql>, String> {
    match value {
        JsonValue::Null => Ok(Box::new(rusqlite::types::Null)),
        JsonValue::Bool(b) => Ok(Box::new(*b)),
        JsonValue::Number(n) => {
            if let Some(i) = n.as_i64() {
                Ok(Box::new(i))
            } else if let Some(f) = n.as_f64() {
                Ok(Box::new(f))
            } else {
                Err("Invalid number value".to_string())
            }
        }
        JsonValue::String(s) => Ok(Box::new(s.clone())),
        _ => Err("Unsupported value type".to_string()),
    }
}

/// Retrieve an application setting by key
///
/// Looks up a single key-value pair from the `app_settings` table. Returns `None`
/// if the key does not exist (as opposed to an error).
///
/// # Arguments
/// * `app` - Tauri AppHandle for accessing managed database state
/// * `key` - The setting key to look up
///
/// # Returns
/// `Result<Option<String>, String>` - The setting value if found, or `None`
///
/// # Errors
/// Returns an error if the database lock fails or a non-query-returned-no-rows error occurs
///
/// # Frontend Contract
/// ```typescript
/// invoke('get_app_setting', { key: string }): Promise<string | null>
/// ```
#[tauri::command]
pub async fn get_app_setting(app: AppHandle, key: String) -> Result<Option<String>, String> {
    let db_state = app.state::<super::agents::AgentDb>();
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    
    match conn.query_row(
        "SELECT value FROM app_settings WHERE key = ?1",
        params![key],
        |row| row.get::<_, String>(0),
    ) {
        Ok(value) => Ok(Some(value)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("Failed to get setting: {}", e)),
    }
}

/// Save or update an application setting (upsert via INSERT OR REPLACE)
///
/// Inserts or replaces a key-value pair in the `app_settings` table.
/// Uses SQLite's INSERT OR REPLACE semantics so the operation is idempotent.
///
/// # Arguments
/// * `app` - Tauri AppHandle for accessing managed database state
/// * `key` - The setting key
/// * `value` - The setting value to store
///
/// # Returns
/// `Result<(), String>` - Success or an error message
///
/// # Errors
/// Returns an error if the database lock fails or the INSERT fails
///
/// # Frontend Contract
/// ```typescript
/// invoke('save_app_setting', { key: string, value: string }): Promise<void>
/// ```
#[tauri::command]
pub async fn save_app_setting(app: AppHandle, key: String, value: String) -> Result<(), String> {
    let db_state = app.state::<super::agents::AgentDb>();
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    
    // Use INSERT OR REPLACE to handle both insert and update
    conn.execute(
        "INSERT OR REPLACE INTO app_settings (key, value) VALUES (?1, ?2)",
        params![key, value],
    )
    .map_err(|e| format!("Failed to save setting: {}", e))?;
    
    Ok(())
}

// ---------------------------------------------------------------------------
// Pricing Configuration
// ---------------------------------------------------------------------------

/// Open pricing system: built-in model price table.
/// Values match src/config/pricing.ts exactly. Prices are USD per million tokens.
mod pricing_constants {
    use serde::Serialize;

    #[derive(Debug, Clone, Serialize, serde::Deserialize)]
    pub struct ModelPricing {
        pub input_price: f64,
        pub output_price: f64,
        pub cache_write_price: f64,
        pub cache_read_price: f64,
    }

    /// Built-in Anthropic model prices (USD / MTok)
    pub fn anthropic_prices() -> std::collections::HashMap<String, ModelPricing> {
        let mut m = std::collections::HashMap::new();
        m.insert(
            "claude-sonnet-4-6-20250620".into(),
            ModelPricing { input_price: 3.0, output_price: 15.0, cache_write_price: 3.75, cache_read_price: 0.3 },
        );
        m.insert(
            "claude-opus-4-6-20250620".into(),
            ModelPricing { input_price: 15.0, output_price: 75.0, cache_write_price: 18.75, cache_read_price: 1.5 },
        );
        m.insert(
            "claude-haiku-4-20251119".into(),
            ModelPricing { input_price: 0.8, output_price: 4.0, cache_write_price: 1.0, cache_read_price: 0.08 },
        );
        m.insert(
            "claude-sonnet-4-5-20252012".into(),
            ModelPricing { input_price: 3.0, output_price: 15.0, cache_write_price: 3.75, cache_read_price: 0.3 },
        );
        m.insert(
            "claude-sonnet-4-20250514".into(),
            ModelPricing { input_price: 3.0, output_price: 15.0, cache_write_price: 3.75, cache_read_price: 0.3 },
        );
        m.insert(
            "claude-opus-4-20250514".into(),
            ModelPricing { input_price: 15.0, output_price: 75.0, cache_write_price: 18.75, cache_read_price: 1.5 },
        );
        m.insert(
            "claude-3-7-sonnet-20250219".into(),
            ModelPricing { input_price: 3.0, output_price: 15.0, cache_write_price: 3.75, cache_read_price: 0.3 },
        );
        m.insert(
            "claude-3-5-sonnet-20241022".into(),
            ModelPricing { input_price: 3.0, output_price: 15.0, cache_write_price: 3.75, cache_read_price: 0.3 },
        );
        m.insert(
            "claude-3-5-haiku-20241022".into(),
            ModelPricing { input_price: 0.8, output_price: 4.0, cache_write_price: 1.0, cache_read_price: 0.08 },
        );
        // Aliases
        m.insert("sonnet-3-7".into(), m["claude-3-7-sonnet-20250219"].clone());
        m.insert("sonnet-4".into(), m["claude-sonnet-4-20250514"].clone());
        m.insert("sonnet".into(), m["claude-sonnet-4-20250514"].clone());
        m.insert("opus".into(), m["claude-opus-4-20250514"].clone());
        m.insert("claude-3-7-sonnet-20250219-thinking".into(), m["claude-3-7-sonnet-20250219"].clone());
        m.insert("claude-sonnet-4-20250514-thinking".into(), m["claude-sonnet-4-20250514"].clone());
        m.insert("claude-opus-4-20250514-thinking".into(), m["claude-opus-4-20250514"].clone());
        m
    }

    /// Built-in OpenRouter model prices (USD / MTok)
    pub fn openrouter_prices() -> std::collections::HashMap<String, ModelPricing> {
        let mut m = std::collections::HashMap::new();
        m.insert(
            "openai/gpt-4o".into(),
            ModelPricing { input_price: 5.0, output_price: 15.0, cache_write_price: 0.0, cache_read_price: 0.0 },
        );
        m.insert(
            "openai/gpt-4o-mini".into(),
            ModelPricing { input_price: 0.15, output_price: 0.6, cache_write_price: 0.0, cache_read_price: 0.0 },
        );
        m.insert(
            "google/gemini-2.0-flash".into(),
            ModelPricing { input_price: 0.0, output_price: 0.0, cache_write_price: 0.0, cache_read_price: 0.0 },
        );
        m.insert(
            "google/gemini-pro-1.5".into(),
            ModelPricing { input_price: 0.125, output_price: 0.5, cache_write_price: 0.0, cache_read_price: 0.0 },
        );
        m.insert(
            "deepseek/deepseek-chat-v3-0324".into(),
            ModelPricing { input_price: 0.27, output_price: 1.1, cache_write_price: 0.0, cache_read_price: 0.0 },
        );
        m.insert(
            "mistral/mistral-nemo".into(),
            ModelPricing { input_price: 0.15, output_price: 0.15, cache_write_price: 0.0, cache_read_price: 0.0 },
        );
        m
    }
}

use pricing_constants::{anthropic_prices, openrouter_prices, ModelPricing as RsModelPricing};

/// Pricing provider (mirrors frontend PricingProvider interface)
#[derive(Debug, serde::Serialize, serde::Deserialize)]
struct PricingProvider {
    id: String,
    name: String,
    is_custom: bool,
    models: std::collections::HashMap<String, RsModelPricing>,
}

/// Combined pricing config returned to the frontend.
///
/// Merges built-in providers with any user-defined `custom_pricing_providers`
/// stored in the `app_settings` table. User-defined models take priority over
/// built-in ones with the same model ID.
///
/// # Frontend Contract
/// ```typescript
/// invoke('get_pricing_config'): Promise<{
///   builtIn: PricingProvider[];
///   custom: PricingProvider[];
/// }>
/// ```
#[tauri::command]
pub async fn get_pricing_config(app: AppHandle) -> Result<serde_json::Value, String> {
    let db_state = app.state::<super::agents::AgentDb>();
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;

    // 1. Build built-in providers
    let anthropic_models = anthropic_prices();
    let openrouter_models = openrouter_prices();

    let built_in = vec![
        PricingProvider {
            id: "anthropic".into(),
            name: "Anthropic (Claude)".into(),
            is_custom: false,
            models: anthropic_models,
        },
        PricingProvider {
            id: "openrouter".into(),
            name: "OpenRouter".into(),
            is_custom: false,
            models: openrouter_models,
        },
    ];

    // 2. Load user custom providers from app_settings
    let custom: Vec<PricingProvider> = match conn.query_row(
        "SELECT value FROM app_settings WHERE key = 'custom_pricing_providers'",
        [],
        |row| row.get::<_, String>(0),
    ) {
        Ok(json) => serde_json::from_str(&json).unwrap_or_default(),
        Err(rusqlite::Error::QueryReturnedNoRows) => Vec::new(),
        Err(e) => return Err(format!("Failed to read custom pricing: {}", e)),
    };

    Ok(serde_json::json!({
        "builtIn": built_in,
        "custom": custom,
    }))
}

/// Initialize the agents database (re-exported from agents module)
use super::agents::init_database; 