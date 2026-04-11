/**
 * TypeScript type contracts for all Tauri IPC commands.
 * Auto-generated from src-tauri/src/commands/.
 *
 * These types mirror the Rust backend command signatures and return types.
 * Frontend code should use `invoke<T>(command, payload)` with these types.
 */

// ─── Shared Data Types ────────────────────────────────────────────────────────

export interface ProxySettings {
  http_proxy: string | null;
  https_proxy: string | null;
  no_proxy: string | null;
  all_proxy: string | null;
  enabled: boolean;
}

// ─── Claude Session Types ────────────────────────────────────────────────────

export interface Project {
  id: string;
  path: string;
  sessions: string[];
  created_at: number;
}

export interface Session {
  id: string;
  project_id: string;
  project_path: string;
  todo_data: unknown | null;
  created_at: number;
  first_message: string | null;
  message_timestamp: string | null;
}

export interface ClaudeSettings {
  [key: string]: unknown;
}

export interface ClaudeVersionStatus {
  is_installed: boolean;
  version: string | null;
  output: string;
}

export interface ClaudeMdFile {
  relative_path: string;
  absolute_path: string;
  size: number;
  modified: number;
}

export interface FileEntry {
  name: string;
  path: string;
  is_directory: boolean;
  size: number;
  extension: string | null;
}

// ─── MCP Types ───────────────────────────────────────────────────────────────

export interface MCPServer {
  name: string;
  transport: string;
  command: string | null;
  args: string[];
  env: Record<string, string>;
  url: string | null;
  scope: string;
  is_active: boolean;
  status: ServerStatus;
}

export interface ServerStatus {
  running: boolean;
  error: string | null;
  last_checked: number | null;
}

export interface MCPServerConfig {
  command: string;
  args: string[];
  env: Record<string, string>;
}

export interface MCPProjectConfig {
  mcpServers: Record<string, MCPServerConfig>;
}

export interface AddServerResult {
  success: boolean;
  message: string;
  server_name: string | null;
}

export interface ImportResult {
  imported_count: number;
  failed_count: number;
  servers: ImportServerResult[];
}

export interface ImportServerResult {
  name: string;
  success: boolean;
  error: string | null;
}

// ─── Agent Types ─────────────────────────────────────────────────────────────

export interface Agent {
  id?: number;
  name: string;
  icon: string;
  system_prompt: string;
  default_task: string | null;
  model: string;
  enable_file_read: boolean;
  enable_file_write: boolean;
  enable_network: boolean;
  hooks?: string | null;
  source?: string;
  created_at: string;
  updated_at: string;
}

export interface AgentRun {
  id?: number;
  agent_id: number;
  agent_name: string;
  agent_icon: string;
  task: string;
  model: string;
  project_path: string;
  session_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  pid?: number;
  process_started_at?: string;
  created_at: string;
  completed_at?: string | null;
}

export interface AgentRunMetrics {
  duration_ms?: number;
  total_tokens?: number;
  cost_usd?: number;
  message_count?: number;
}

export interface AgentRunWithMetrics extends AgentRun {
  metrics?: AgentRunMetrics;
  output?: string;
}

export interface AgentExport {
  version: number;
  exported_at: string;
  agent: AgentData;
}

export interface AgentData {
  name: string;
  icon: string;
  system_prompt: string;
  default_task?: string;
  model: string;
  hooks?: string;
}

export interface GitHubAgentFile {
  name: string;
  download_url: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface ClaudeInstallation {
  path: string;
  version: string;
  source: string;
}

// ─── Environment Variable Types ───────────────────────────────────────────────

export interface EnvironmentVariable {
  id?: number;
  key: string;
  value: string;
  enabled: boolean;
  group_id?: number | null;
  sort_order: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface EnvironmentVariableGroup {
  id?: number;
  name: string;
  description?: string | null;
  enabled: boolean;
  sort_order: number;
  is_system: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

// ─── Storage Types ────────────────────────────────────────────────────────────

export interface TableInfo {
  name: string;
  row_count: number;
  columns: ColumnInfo[];
}

export interface ColumnInfo {
  cid: number;
  name: string;
  type_name: string;
  notnull: boolean;
  dflt_value: string | null;
  pk: boolean;
}

export interface TableData {
  table_name: string;
  columns: ColumnInfo[];
  rows: Record<string, unknown>[];
  total_rows: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface QueryResult {
  columns: string[];
  rows: unknown[][];
  rows_affected: number | null;
  last_insert_rowid: number | null;
}

// ─── Usage / Cost Types ───────────────────────────────────────────────────────

export interface UsageEntry {
  timestamp: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens: number;
  cache_read_tokens: number;
  cost: number;
  session_id: string;
  project_path: string;
}

export interface UsageStats {
  total_cost: number;
  total_tokens: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cache_creation_tokens: number;
  total_cache_read_tokens: number;
  total_sessions: number;
  by_model: ModelUsage[];
  by_date: DailyUsage[];
  by_project: ProjectUsage[];
}

export interface ModelUsage {
  model: string;
  total_cost: number;
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens: number;
  cache_read_tokens: number;
  session_count: number;
}

export interface DailyUsage {
  date: string;
  total_cost: number;
  total_tokens: number;
  models_used: string[];
}

export interface ProjectUsage {
  project_path: string;
  project_name: string;
  total_cost: number;
  total_tokens: number;
  session_count: number;
  last_used: string;
}

// ─── Slash Command Types ──────────────────────────────────────────────────────

export interface SlashCommand {
  id: string;
  name: string;
  full_command: string;
  scope: string;
  namespace: string | null;
  file_path: string;
  content: string;
  description?: string | null;
  allowed_tools: string[];
  has_bash_commands: boolean;
  has_file_references: boolean;
  accepts_arguments: boolean;
}

// ─── Checkpoint / Process Types ───────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CheckpointSettings = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CheckpointResult = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type HookConfig = Record<string, any>;
export type HookValidationResult = { valid: boolean; error?: string };

export interface ProcessInfo {
  pid: number;
  session_id: string;
  project_path: string;
  started_at: string;
  status: string;
}

// ─── Tauri Command Signatures ─────────────────────────────────────────────────

// NOTE: All commands are invoked via `invoke<T>('command_name', payload)`.
// The payload keys below match the Rust parameter names exactly (camelCase).

export const TauriCommands = {
  // ── proxy ────────────────────────────────────────────────────────────────
  'get_proxy_settings': {
    returns: 'Promise<ProxySettings>',
  },
  'save_proxy_settings': {
    args: { settings: null as unknown as ProxySettings },
    returns: 'Promise<void>',
  },

  // ── usage ────────────────────────────────────────────────────────────────
  'get_usage_stats': {
    args: { days: null as unknown as number | undefined },
    returns: 'Promise<UsageStats>',
  },
  'get_usage_by_date_range': {
    args: { startDate: '', endDate: '' },
    returns: 'Promise<UsageStats>',
  },
  'get_usage_details': {
    args: {
      projectPath: null as unknown as string | undefined,
      date: null as unknown as string | undefined,
    },
    returns: 'Promise<UsageEntry[]>',
  },
  'get_session_stats': {
    args: {
      since: null as unknown as string | undefined,
      until: null as unknown as string | undefined,
      order: null as unknown as 'asc' | 'desc' | undefined,
    },
    returns: 'Promise<ProjectUsage[]>',
  },

  // ── slash_commands ──────────────────────────────────────────────────────
  'slash_commands_list': {
    args: { projectPath: null as unknown as string | undefined },
    returns: 'Promise<SlashCommand[]>',
  },
  'slash_command_get': {
    args: { commandId: '' },
    returns: 'Promise<SlashCommand>',
  },
  'slash_command_save': {
    args: {
      scope: '' as 'project' | 'user',
      name: '',
      namespace: null as unknown as string | undefined,
      content: '',
      description: null as unknown as string | undefined,
      allowedTools: null as unknown as string[],
      projectPath: null as unknown as string | undefined,
    },
    returns: 'Promise<SlashCommand>',
  },
  'slash_command_delete': {
    args: {
      commandId: '',
      projectPath: null as unknown as string | undefined,
    },
    returns: 'Promise<string>',
  },

  // ── storage ──────────────────────────────────────────────────────────────
  'storage_list_tables': {
    returns: 'Promise<TableInfo[]>',
  },
  'storage_read_table': {
    args: {
      tableName: '',
      page: 1,
      pageSize: 20,
      searchQuery: null as unknown as string | undefined,
    },
    returns: 'Promise<TableData>',
  },
  'storage_update_row': {
    args: {
      tableName: '',
      primaryKeyValues: null as unknown as Record<string, unknown>,
      updates: null as unknown as Record<string, unknown>,
    },
    returns: 'Promise<void>',
  },
  'storage_delete_row': {
    args: {
      tableName: '',
      primaryKeyValues: null as unknown as Record<string, unknown>,
    },
    returns: 'Promise<void>',
  },
  'storage_insert_row': {
    args: {
      tableName: '',
      values: null as unknown as Record<string, unknown>,
    },
    returns: 'Promise<number>',
  },
  'storage_execute_sql': {
    args: { query: '' },
    returns: 'Promise<QueryResult>',
  },
  'storage_reset_database': {
    returns: 'Promise<void>',
  },
  'get_app_setting': {
    args: { key: '' },
    returns: 'Promise<string | null>',
  },
  'save_app_setting': {
    args: { key: '', value: '' },
    returns: 'Promise<void>',
  },

  // ── mcp ─────────────────────────────────────────────────────────────────
  'mcp_add': {
    args: {
      name: '',
      transport: '' as 'stdio' | 'sse',
      command: null as unknown as string | undefined,
      args: null as unknown as string[],
      env: null as unknown as Record<string, string>,
      url: null as unknown as string | undefined,
      scope: '' as 'local' | 'project' | 'user',
    },
    returns: 'Promise<AddServerResult>',
  },
  'mcp_list': {
    returns: 'Promise<MCPServer[]>',
  },
  'mcp_get': {
    args: { name: '' },
    returns: 'Promise<MCPServer>',
  },
  'mcp_remove': {
    args: { name: '' },
    returns: 'Promise<string>',
  },
  'mcp_add_json': {
    args: { name: '', jsonConfig: '', scope: '' as 'local' | 'project' | 'user' },
    returns: 'Promise<AddServerResult>',
  },
  'mcp_add_from_claude_desktop': {
    args: { scope: '' as 'local' | 'project' | 'user' },
    returns: 'Promise<ImportResult>',
  },
  'mcp_serve': {
    returns: 'Promise<string>',
  },
  'mcp_test_connection': {
    args: { name: '' },
    returns: 'Promise<string>',
  },
  'mcp_reset_project_choices': {
    returns: 'Promise<string>',
  },
  'mcp_get_server_status': {
    returns: 'Promise<Record<string, ServerStatus>>',
  },
  'mcp_read_project_config': {
    args: { projectPath: '' },
    returns: 'Promise<MCPProjectConfig>',
  },
  'mcp_save_project_config': {
    args: {
      projectPath: '',
      config: null as unknown as MCPProjectConfig,
    },
    returns: 'Promise<string>',
  },

  // ── claude ───────────────────────────────────────────────────────────────
  'list_projects': {
    returns: 'Promise<Project[]>',
  },
  'get_project_sessions': {
    args: { projectId: '' },
    returns: 'Promise<Session[]>',
  },
  'get_claude_settings': {
    returns: 'Promise<ClaudeSettings>',
  },
  'open_new_session': {
    args: { path: null as unknown as string | undefined },
    returns: 'Promise<string>',
  },
  'get_system_prompt': {
    returns: 'Promise<string>',
  },
  'check_claude_version': {
    returns: 'Promise<ClaudeVersionStatus>',
  },
  'save_system_prompt': {
    args: { content: '' },
    returns: 'Promise<string>',
  },
  'save_claude_settings': {
    args: { settings: null as unknown as unknown },
    returns: 'Promise<string>',
  },
  'find_claude_md_files': {
    args: { projectPath: '' },
    returns: 'Promise<ClaudeMdFile[]>',
  },
  'read_claude_md_file': {
    args: { filePath: '' },
    returns: 'Promise<string>',
  },
  'save_claude_md_file': {
    args: { filePath: '', content: '' },
    returns: 'Promise<string>',
  },
  'load_session_history': {
    args: { sessionId: '', projectId: '' },
    returns: 'Promise<unknown[]>',
  },
  'execute_claude_code': {
    args: { projectPath: '', prompt: '', model: '' },
    returns: 'Promise<string>',
  },
  'continue_claude_code': {
    args: { projectPath: '', prompt: '', model: '' },
    returns: 'Promise<string>',
  },
  'resume_claude_code': {
    args: { projectPath: '', sessionId: '', prompt: '', model: '' },
    returns: 'Promise<string>',
  },
  'cancel_claude_execution': {
    args: { sessionId: null as unknown as string | undefined },
    returns: 'Promise<void>',
  },
  'list_running_claude_sessions': {
    returns: 'Promise<ProcessInfo[]>',
  },
  'get_claude_session_output': {
    args: { sessionId: '' },
    returns: 'Promise<string>',
  },
  'list_directory_contents': {
    args: { directoryPath: '' },
    returns: 'Promise<FileEntry[]>',
  },
  'search_files': {
    args: { basePath: '', query: '' },
    returns: 'Promise<FileEntry[]>',
  },
  'create_checkpoint': {
    args: { sessionId: '', projectId: '', projectPath: '' },
    returns: 'Promise<string>',
  },
  'restore_checkpoint': {
    args: { checkpointId: '', sessionId: '', projectId: '', projectPath: '' },
    returns: 'Promise<string>',
  },
  'list_checkpoints': {
    args: { sessionId: '', projectId: '', projectPath: '' },
    returns: 'Promise<unknown>',
  },
  'fork_from_checkpoint': {
    args: { checkpointId: '', sessionId: '', projectId: '', projectPath: '' },
    returns: 'Promise<string>',
  },
  'get_session_timeline': {
    args: { sessionId: '', projectId: '', projectPath: '' },
    returns: 'Promise<unknown>',
  },
  'update_checkpoint_settings': {
    args: { sessionId: '', projectId: '', projectPath: '' },
    returns: 'Promise<unknown>',
  },
  'get_checkpoint_diff': {
    args: { fromCheckpointId: '', toCheckpointId: '', sessionId: '', projectId: '' },
    returns: 'Promise<unknown>',
  },
  'track_checkpoint_message': {
    args: { sessionId: '', projectId: '', projectPath: '' },
    returns: 'Promise<unknown>',
  },
  'check_auto_checkpoint': {
    args: { sessionId: '', projectId: '', projectPath: '' },
    returns: 'Promise<unknown>',
  },
  'cleanup_old_checkpoints': {
    args: { sessionId: '', projectId: '', projectPath: '' },
    returns: 'Promise<unknown>',
  },
  'get_checkpoint_settings': {
    args: { sessionId: '', projectId: '', projectPath: '' },
    returns: 'Promise<unknown>',
  },
  'clear_checkpoint_manager': {
    args: { sessionId: '' },
    returns: 'Promise<void>',
  },
  'get_checkpoint_state_stats': {
    returns: 'Promise<unknown>',
  },
  'get_recently_modified_files': {
    args: { sessionId: '', projectId: '', projectPath: '' },
    returns: 'Promise<unknown>',
  },
  'track_session_messages': {
    args: { sessionId: '', projectId: '', projectPath: '' },
    returns: 'Promise<unknown>',
  },
  'get_hooks_config': {
    args: {
      scope: '' as 'local' | 'user' | 'project',
      projectPath: null as unknown as string | undefined,
    },
    returns: 'Promise<unknown>',
  },
  'update_hooks_config': {
    args: {
      scope: '' as 'local' | 'user' | 'project',
      hooks: null as unknown as unknown,
      projectPath: null as unknown as string | undefined,
    },
    returns: 'Promise<string>',
  },
  'validate_hook_command': {
    args: { command: '' },
    returns: 'Promise<HookValidationResult>',
  },
  'delete_session': {
    args: { sessionId: '', projectId: '' },
    returns: 'Promise<void>',
  },

  // ── agents ───────────────────────────────────────────────────────────────
  'list_agents': {
    returns: 'Promise<Agent[]>',
  },
  'create_agent': {
    args: {
      name: '',
      icon: '',
      systemPrompt: '',
      defaultTask: null as unknown as string | undefined,
      model: '',
      enableFileRead: false,
      enableFileWrite: false,
      enableNetwork: false,
      hooks: null as unknown as string | undefined,
    },
    returns: 'Promise<Agent>',
  },
  'update_agent': {
    args: {
      id: 0,
      name: '',
      icon: '',
      systemPrompt: '',
      defaultTask: null as unknown as string | undefined,
      model: '',
      enableFileRead: false,
      enableFileWrite: false,
      enableNetwork: false,
      hooks: null as unknown as string | undefined,
    },
    returns: 'Promise<Agent>',
  },
  'delete_agent': {
    args: { id: 0 },
    returns: 'Promise<void>',
  },
  'get_agent': {
    args: { id: 0 },
    returns: 'Promise<Agent>',
  },
  'list_agent_runs': {
    args: { agentId: null as unknown as number | undefined },
    returns: 'Promise<AgentRun[]>',
  },
  'get_agent_run': {
    args: { id: 0 },
    returns: 'Promise<AgentRun>',
  },
  'get_agent_run_with_real_time_metrics': {
    args: { id: 0 },
    returns: 'Promise<AgentRunWithMetrics>',
  },
  'list_agent_runs_with_metrics': {
    args: { agentId: null as unknown as number | undefined },
    returns: 'Promise<AgentRunWithMetrics[]>',
  },
  'execute_agent': {
    args: { agentId: 0, projectPath: '', task: '' },
    returns: 'Promise<AgentRun>',
  },
  'list_running_sessions': {
    returns: 'Promise<AgentRun[]>',
  },
  'kill_agent_session': {
    args: { runId: 0 },
    returns: 'Promise<void>',
  },
  'get_session_status': {
    args: { runId: 0 },
    returns: 'Promise<string | null>',
  },
  'cleanup_finished_processes': {
    returns: 'Promise<number[]>',
  },
  'get_live_session_output': {
    args: { runId: 0 },
    returns: 'Promise<string>',
  },
  'get_session_output': {
    args: { runId: 0 },
    returns: 'Promise<string>',
  },
  'stream_session_output': {
    args: { runId: 0 },
    returns: 'Promise<void>',
  },
  'export_agent': {
    args: { id: 0 },
    returns: 'Promise<string>',
  },
  'export_agent_to_file': {
    args: { id: 0, filePath: '' },
    returns: 'Promise<void>',
  },
  'get_claude_binary_path': {
    returns: 'Promise<string | null>',
  },
  'set_claude_binary_path': {
    args: { path: '' },
    returns: 'Promise<void>',
  },
  'refresh_claude_binary_path': {
    returns: 'Promise<string>',
  },
  'list_claude_installations': {
    returns: 'Promise<ClaudeInstallation[]>',
  },
  'import_agent': {
    args: { jsonData: '' },
    returns: 'Promise<Agent>',
  },
  'import_agent_from_file': {
    args: {
      filePath: '',
      source: null as unknown as string | undefined,
    },
    returns: 'Promise<Agent>',
  },
  'fetch_github_agents': {
    returns: 'Promise<GitHubAgentFile[]>',
  },
  'fetch_github_agent_content': {
    args: { downloadUrl: '' },
    returns: 'Promise<AgentExport>',
  },
  'import_agent_from_github': {
    args: { downloadUrl: '' },
    returns: 'Promise<Agent>',
  },
  'load_agent_session_history': {
    args: { sessionId: '' },
    returns: 'Promise<unknown[]>',
  },
  'list_native_agents': {
    returns: 'Promise<Agent[]>',
  },
  'import_native_agents': {
    returns: 'Promise<number>',
  },
  'delete_native_agents': {
    returns: 'Promise<number>',
  },
  'get_environment_variables': {
    returns: 'Promise<EnvironmentVariable[]>',
  },
  'save_environment_variables': {
    args: { envVars: null as unknown as EnvironmentVariable[] },
    returns: 'Promise<void>',
  },
  'get_enabled_environment_variables': {
    returns: 'Promise<Record<string, string>>',
  },
  'get_environment_variable_groups': {
    returns: 'Promise<EnvironmentVariableGroup[]>',
  },
  'create_environment_variable_group': {
    args: {
      name: '',
      description: null as unknown as string | undefined,
      sortOrder: null as unknown as number | undefined,
    },
    returns: 'Promise<EnvironmentVariableGroup>',
  },
  'update_environment_variable_group': {
    args: {
      id: 0,
      name: '',
      description: null as unknown as string | undefined,
      enabled: false,
      sortOrder: 0,
    },
    returns: 'Promise<EnvironmentVariableGroup>',
  },
  'delete_environment_variable_group': {
    args: { id: 0 },
    returns: 'Promise<void>',
  },
} as const;

// ─── Helper: typed invoke wrapper ─────────────────────────────────────────────

export type CommandName = keyof typeof TauriCommands;
