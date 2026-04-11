/**
 * Zod schemas for all Tauri IPC command payloads and responses.
 *
 * Mirrors the TypeScript types in `tauri-commands.d.ts` and provides runtime
 * validation via `validateCommandParams` and `validateCommandResponse`.
 *
 * Usage:
 * ```typescript
 * import { validateCommandParams, storageReadTableSchema } from './command-schemas';
 *
 * const params = validateCommandParams(storageReadTableSchema, rawInput);
 * const result = await invoke('storage_read_table', params);
 * ```
 */

import { z } from 'zod';

// ============================================================================
// Shared / Reusable Schemas
// ============================================================================

export const ColumnInfoSchema = z.object({
  cid: z.number(),
  name: z.string(),
  type_name: z.string(),
  notnull: z.boolean(),
  dflt_value: z.string().nullable(),
  pk: z.boolean(),
});

export const ProxySettingsSchema = z.object({
  http_proxy: z.string().nullable(),
  https_proxy: z.string().nullable(),
  no_proxy: z.string().nullable(),
  all_proxy: z.string().nullable(),
  enabled: z.boolean(),
});

// ============================================================================
// Storage Module (9 commands — complete)
// ============================================================================

/**
 * Schema for `storage_list_tables` response.
 * invoke('storage_list_tables'): Promise<TableInfo[]>
 */
export const storageListTablesResponseSchema = z.array(
  z.object({
    name: z.string(),
    row_count: z.number(),
    columns: z.array(ColumnInfoSchema),
  })
);

/**
 * Schema for `storage_read_table` args.
 * invoke('storage_read_table', { tableName, page, pageSize, searchQuery? })
 */
export const storageReadTableSchema = z.object({
  tableName: z.string().min(1),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(1000).default(20),
  searchQuery: z.string().optional(),
});

export const TableDataSchema = z.object({
  table_name: z.string(),
  columns: z.array(ColumnInfoSchema),
  rows: z.array(z.record(z.string(), z.unknown())),
  total_rows: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
});

/**
 * Schema for `storage_read_table` response.
 */
export const storageReadTableResponseSchema = TableDataSchema;

/**
 * Schema for `storage_update_row` args.
 * invoke('storage_update_row', { tableName, primaryKeyValues, updates })
 */
export const storageUpdateRowSchema = z.object({
  tableName: z.string().min(1),
  primaryKeyValues: z.record(z.string(), z.unknown()),
  updates: z.record(z.string(), z.unknown()),
});

/**
 * Schema for `storage_delete_row` args.
 * invoke('storage_delete_row', { tableName, primaryKeyValues })
 */
export const storageDeleteRowSchema = z.object({
  tableName: z.string().min(1),
  primaryKeyValues: z.record(z.string(), z.unknown()),
});

/**
 * Schema for `storage_insert_row` args.
 * invoke('storage_insert_row', { tableName, values })
 */
export const storageInsertRowSchema = z.object({
  tableName: z.string().min(1),
  values: z.record(z.string(), z.unknown()),
});

/**
 * Schema for `storage_execute_sql` args.
 * invoke('storage_execute_sql', { query })
 */
export const storageExecuteSqlSchema = z.object({
  query: z.string().min(1),
});

export const QueryResultSchema = z.object({
  columns: z.array(z.string()),
  rows: z.array(z.array(z.unknown())),
  rows_affected: z.number().nullable(),
  last_insert_rowid: z.number().nullable(),
});

/**
 * Schema for `get_app_setting` args.
 * invoke('get_app_setting', { key })
 */
export const getAppSettingSchema = z.object({
  key: z.string().min(1),
});

/**
 * Schema for `save_app_setting` args.
 * invoke('save_app_setting', { key, value })
 */
export const saveAppSettingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});

// ============================================================================
// Usage / Cost Module (4 commands — complete)
// ============================================================================

export const UsageEntrySchema = z.object({
  timestamp: z.string(),
  model: z.string(),
  input_tokens: z.number().int().nonnegative(),
  output_tokens: z.number().int().nonnegative(),
  cache_creation_tokens: z.number().int().nonnegative(),
  cache_read_tokens: z.number().int().nonnegative(),
  cost: z.number(),
  session_id: z.string(),
  project_path: z.string(),
});

export const ModelUsageSchema = z.object({
  model: z.string(),
  total_cost: z.number(),
  total_tokens: z.number(),
  input_tokens: z.number(),
  output_tokens: z.number(),
  cache_creation_tokens: z.number(),
  cache_read_tokens: z.number(),
  session_count: z.number(),
});

export const DailyUsageSchema = z.object({
  date: z.string(),
  total_cost: z.number(),
  total_tokens: z.number(),
  models_used: z.array(z.string()),
});

export const ProjectUsageSchema = z.object({
  project_path: z.string(),
  project_name: z.string(),
  total_cost: z.number(),
  total_tokens: z.number(),
  session_count: z.number(),
  last_used: z.string(),
});

export const UsageStatsSchema = z.object({
  total_cost: z.number(),
  total_tokens: z.number(),
  total_input_tokens: z.number(),
  total_output_tokens: z.number(),
  total_cache_creation_tokens: z.number(),
  total_cache_read_tokens: z.number(),
  total_sessions: z.number(),
  by_model: z.array(ModelUsageSchema),
  by_date: z.array(DailyUsageSchema),
  by_project: z.array(ProjectUsageSchema),
});

/** invoke('get_usage_stats', { days? }) */
export const getUsageStatsSchema = z.object({
  days: z.number().int().positive().optional(),
});

/** invoke('get_usage_by_date_range', { startDate, endDate }) */
export const getUsageByDateRangeSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
});

/** invoke('get_usage_details', { projectPath?, date? }) */
export const getUsageDetailsSchema = z.object({
  projectPath: z.string().optional(),
  date: z.string().optional(),
});

/** invoke('get_session_stats', { since?, until?, order? }) */
export const getSessionStatsSchema = z.object({
  since: z.string().optional(),
  until: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

// ============================================================================
// Slash Commands Module
// ============================================================================

export const SlashCommandSchema = z.object({
  id: z.string(),
  name: z.string(),
  full_command: z.string(),
  scope: z.string(),
  namespace: z.string().nullable(),
  file_path: z.string(),
  content: z.string(),
  description: z.string().nullable().optional(),
  allowed_tools: z.array(z.string()),
  has_bash_commands: z.boolean(),
  has_file_references: z.boolean(),
  accepts_arguments: z.boolean(),
});

export const slashCommandsListSchema = z.object({
  projectPath: z.string().optional(),
});

export const slashCommandGetSchema = z.object({
  commandId: z.string(),
});

export const slashCommandSaveSchema = z.object({
  scope: z.enum(['project', 'user']),
  name: z.string(),
  namespace: z.string().optional(),
  content: z.string(),
  description: z.string().optional(),
  allowedTools: z.array(z.string()).optional(),
  projectPath: z.string().optional(),
});

export const slashCommandDeleteSchema = z.object({
  commandId: z.string(),
  projectPath: z.string().optional(),
});

// ============================================================================
// MCP Module
// ============================================================================

export const ServerStatusSchema = z.object({
  running: z.boolean(),
  error: z.string().nullable(),
  last_checked: z.number().nullable(),
});

export const MCPServerSchema = z.object({
  name: z.string(),
  transport: z.string(),
  command: z.string().nullable(),
  args: z.array(z.string()),
  env: z.record(z.string()),
  url: z.string().nullable(),
  scope: z.string(),
  is_active: z.boolean(),
  status: ServerStatusSchema,
});

export const MCPServerConfigSchema = z.object({
  command: z.string(),
  args: z.array(z.string()),
  env: z.record(z.string()),
});

export const MCPProjectConfigSchema = z.object({
  mcpServers: z.record(z.string(), MCPServerConfigSchema),
});

export const AddServerResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  server_name: z.string().nullable(),
});

export const ImportServerResultSchema = z.object({
  name: z.string(),
  success: z.boolean(),
  error: z.string().nullable(),
});

export const ImportResultSchema = z.object({
  imported_count: z.number(),
  failed_count: z.number(),
  servers: z.array(ImportServerResultSchema),
});

export const mcpAddSchema = z.object({
  name: z.string(),
  transport: z.enum(['stdio', 'sse']),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  url: z.string().optional(),
  scope: z.enum(['local', 'project', 'user']),
});

export const mcpGetSchema = z.object({ name: z.string() });
export const mcpRemoveSchema = z.object({ name: z.string() });
export const mcpListSchema = z.object({});
export const mcpServeSchema = z.object({});
export const mcpAddJsonSchema = z.object({
  name: z.string(),
  jsonConfig: z.string(),
  scope: z.enum(['local', 'project', 'user']),
});
export const mcpAddFromClaudeDesktopSchema = z.object({
  scope: z.enum(['local', 'project', 'user']),
});
export const mcpTestConnectionSchema = z.object({ name: z.string() });
export const mcpResetProjectChoicesSchema = z.object({});
export const mcpGetServerStatusSchema = z.object({});
export const mcpReadProjectConfigSchema = z.object({ projectPath: z.string() });
export const mcpSaveProjectConfigSchema = z.object({
  projectPath: z.string(),
  config: MCPProjectConfigSchema,
});

// ============================================================================
// Claude Session / Project Module
// ============================================================================

export const ProjectSchema = z.object({
  id: z.string(),
  path: z.string(),
  sessions: z.array(z.string()),
  created_at: z.number(),
});

export const SessionSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  project_path: z.string(),
  todo_data: z.unknown().nullable(),
  created_at: z.number(),
  first_message: z.string().nullable(),
  message_timestamp: z.string().nullable(),
});

export const ClaudeSettingsSchema = z.record(z.string(), z.unknown());

export const ClaudeVersionStatusSchema = z.object({
  is_installed: z.boolean(),
  version: z.string().nullable(),
  output: z.string(),
});

export const ClaudeMdFileSchema = z.object({
  relative_path: z.string(),
  absolute_path: z.string(),
  size: z.number(),
  modified: z.number(),
});

export const FileEntrySchema = z.object({
  name: z.string(),
  path: z.string(),
  is_directory: z.boolean(),
  size: z.number(),
  extension: z.string().nullable(),
});

export const ProcessInfoSchema = z.object({
  pid: z.number(),
  session_id: z.string(),
  project_path: z.string(),
  started_at: z.string(),
  status: z.string(),
});

export const HookValidationResultSchema = z.object({
  valid: z.boolean(),
  error: z.string().optional(),
});

export const listProjectsSchema = z.object({});
export const getProjectSessionsSchema = z.object({ projectId: z.string() });
export const getClaudeSettingsSchema = z.object({});
export const openNewSessionSchema = z.object({ path: z.string().optional() });
export const getSystemPromptSchema = z.object({});
export const checkClaudeVersionSchema = z.object({});
export const saveSystemPromptSchema = z.object({ content: z.string() });
export const saveClaudeSettingsSchema = z.object({ settings: z.unknown() });
export const findClaudeMdFilesSchema = z.object({ projectPath: z.string() });
export const readClaudeMdFileSchema = z.object({ filePath: z.string() });
export const saveClaudeMdFileSchema = z.object({
  filePath: z.string(),
  content: z.string(),
});
export const loadSessionHistorySchema = z.object({
  sessionId: z.string(),
  projectId: z.string(),
});
export const executeClaudeCodeSchema = z.object({
  projectPath: z.string(),
  prompt: z.string(),
  model: z.string(),
});
export const continueClaudeCodeSchema = z.object({
  projectPath: z.string(),
  prompt: z.string(),
  model: z.string(),
});
export const resumeClaudeCodeSchema = z.object({
  projectPath: z.string(),
  sessionId: z.string(),
  prompt: z.string(),
  model: z.string(),
});
export const cancelClaudeExecutionSchema = z.object({
  sessionId: z.string().optional(),
});
export const listRunningClaudeSessionsSchema = z.object({});
export const getClaudeSessionOutputSchema = z.object({ sessionId: z.string() });
export const listDirectoryContentsSchema = z.object({ directoryPath: z.string() });
export const searchFilesSchema = z.object({ basePath: z.string(), query: z.string() });

// Checkpoint / process schemas
export const checkpointArgsSchema = z.object({
  sessionId: z.string(),
  projectId: z.string(),
  projectPath: z.string(),
});

export const restoreCheckpointSchema = z.object({
  checkpointId: z.string(),
  sessionId: z.string(),
  projectId: z.string(),
  projectPath: z.string(),
});

export const getCheckpointDiffSchema = z.object({
  fromCheckpointId: z.string(),
  toCheckpointId: z.string(),
  sessionId: z.string(),
  projectId: z.string(),
});

export const updateCheckpointSettingsSchema = checkpointArgsSchema;
export const listCheckpointsSchema = checkpointArgsSchema;
export const forkFromCheckpointSchema = checkpointArgsSchema.extend({ checkpointId: z.string() });
export const getSessionTimelineSchema = checkpointArgsSchema;
export const trackCheckpointMessageSchema = checkpointArgsSchema;
export const checkAutoCheckpointSchema = checkpointArgsSchema;
export const cleanupOldCheckpointsSchema = checkpointArgsSchema;
export const getCheckpointSettingsSchema = checkpointArgsSchema;
export const getRecentFilesSchema = checkpointArgsSchema;
export const trackSessionMessagesSchema = checkpointArgsSchema;
export const clearCheckpointManagerSchema = z.object({ sessionId: z.string() });
export const getCheckpointStateStatsSchema = z.object({});

export const getHooksConfigSchema = z.object({
  scope: z.enum(['local', 'user', 'project']),
  projectPath: z.string().optional(),
});

export const updateHooksConfigSchema = z.object({
  scope: z.enum(['local', 'user', 'project']),
  hooks: z.unknown(),
  projectPath: z.string().optional(),
});

export const validateHookCommandSchema = z.object({ command: z.string() });

export const deleteSessionSchema = z.object({
  sessionId: z.string(),
  projectId: z.string(),
});

// ============================================================================
// Agents Module
// ============================================================================

export const AgentSchema = z.object({
  id: z.number().optional(),
  name: z.string(),
  icon: z.string(),
  system_prompt: z.string(),
  default_task: z.string().nullable().optional(),
  model: z.string(),
  enable_file_read: z.boolean(),
  enable_file_write: z.boolean(),
  enable_network: z.boolean(),
  hooks: z.string().nullable().optional(),
  source: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const AgentRunSchema = z.object({
  id: z.number().optional(),
  agent_id: z.number(),
  agent_name: z.string(),
  agent_icon: z.string(),
  task: z.string(),
  model: z.string(),
  project_path: z.string(),
  session_id: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']),
  pid: z.number().optional(),
  process_started_at: z.string().optional(),
  created_at: z.string(),
  completed_at: z.string().nullable().optional(),
});

export const AgentRunMetricsSchema = z.object({
  duration_ms: z.number().optional(),
  total_tokens: z.number().optional(),
  cost_usd: z.number().optional(),
  message_count: z.number().optional(),
});

export const AgentRunWithMetricsSchema = AgentRunSchema.extend({
  metrics: AgentRunMetricsSchema.optional(),
  output: z.string().optional(),
});

export const AgentExportSchema = z.object({
  version: z.number(),
  exported_at: z.string(),
  agent: z.object({
    name: z.string(),
    icon: z.string(),
    system_prompt: z.string(),
    default_task: z.string().optional(),
    model: z.string(),
    hooks: z.string().optional(),
  }),
});

export const GitHubAgentFileSchema = z.object({
  name: z.string(),
  download_url: z.string(),
});

export const ClaudeInstallationSchema = z.object({
  path: z.string(),
  version: z.string(),
  source: z.string(),
});

export const listAgentsSchema = z.object({});
export const getAgentSchema = z.object({ id: z.number() });
export const deleteAgentSchema = z.object({ id: z.number() });

export const createAgentSchema = z.object({
  name: z.string(),
  icon: z.string(),
  systemPrompt: z.string(),
  defaultTask: z.string().optional(),
  model: z.string(),
  enableFileRead: z.boolean().default(false),
  enableFileWrite: z.boolean().default(false),
  enableNetwork: z.boolean().default(false),
  hooks: z.string().optional(),
});

export const updateAgentSchema = createAgentSchema.extend({ id: z.number() });

export const listAgentRunsSchema = z.object({
  agentId: z.number().optional(),
});
export const getAgentRunSchema = z.object({ id: z.number() });
export const getAgentRunWithRealTimeMetricsSchema = z.object({ id: z.number() });
export const listAgentRunsWithMetricsSchema = z.object({
  agentId: z.number().optional(),
});

export const executeAgentSchema = z.object({
  agentId: z.number(),
  projectPath: z.string(),
  task: z.string(),
});

export const listRunningSessionsSchema = z.object({});
export const killAgentSessionSchema = z.object({ runId: z.number() });
export const getSessionStatusSchema = z.object({ runId: z.number() });
export const cleanupFinishedProcessesSchema = z.object({});
export const getLiveSessionOutputSchema = z.object({ runId: z.number() });
export const getSessionOutputSchema = z.object({ runId: z.number() });
export const streamSessionOutputSchema = z.object({ runId: z.number() });
export const exportAgentSchema = z.object({ id: z.number() });
export const exportAgentToFileSchema = z.object({ id: z.number(), filePath: z.string() });
export const getClaudeBinaryPathSchema = z.object({});
export const setClaudeBinaryPathSchema = z.object({ path: z.string() });
export const refreshClaudeBinaryPathSchema = z.object({});
export const listClaudeInstallationsSchema = z.object({});
export const importAgentSchema = z.object({ jsonData: z.string() });
export const importAgentFromFileSchema = z.object({
  filePath: z.string(),
  source: z.string().optional(),
});
export const fetchGithubAgentsSchema = z.object({});
export const fetchGithubAgentContentSchema = z.object({ downloadUrl: z.string() });
export const importAgentFromGithubSchema = z.object({ downloadUrl: z.string() });
export const loadAgentSessionHistorySchema = z.object({ sessionId: z.string() });
export const listNativeAgentsSchema = z.object({});
export const importNativeAgentsSchema = z.object({});
export const deleteNativeAgentsSchema = z.object({});

// ============================================================================
// Environment Variables Module
// ============================================================================

export const EnvironmentVariableSchema = z.object({
  id: z.number().optional(),
  key: z.string(),
  value: z.string(),
  enabled: z.boolean(),
  group_id: z.number().nullable().optional(),
  sort_order: z.number(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

export const EnvironmentVariableGroupSchema = z.object({
  id: z.number().optional(),
  name: z.string(),
  description: z.string().nullable().optional(),
  enabled: z.boolean(),
  sort_order: z.number(),
  is_system: z.boolean(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

export const getEnvironmentVariablesSchema = z.object({});
export const saveEnvironmentVariablesSchema = z.object({
  envVars: z.array(EnvironmentVariableSchema),
});
export const getEnabledEnvironmentVariablesSchema = z.object({});
export const getEnvironmentVariableGroupsSchema = z.object({});

export const createEnvironmentVariableGroupSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  sortOrder: z.number().optional(),
});

export const updateEnvironmentVariableGroupSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().optional(),
  enabled: z.boolean().default(true),
  sortOrder: z.number().default(0),
});

export const deleteEnvironmentVariableGroupSchema = z.object({ id: z.number() });

// ============================================================================
// Proxy Module
// ============================================================================

export const getProxySettingsSchema = z.object({});
export const saveProxySettingsSchema = z.object({
  settings: ProxySettingsSchema,
});

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Validate a command's input params at runtime.
 *
 * In development, throws on validation failure.
 * In production, logs a warning and returns the raw data (permissive fallback).
 */
export function validateCommandParams<T extends z.ZodSchema>(
  schema: T,
  data: unknown
): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const formatted = result.error.format();
    console.warn('[Zod Validation Failed — params]', formatted);
    if (import.meta.env.DEV) {
      throw new Error(`Invalid params: ${result.error.message}\n${JSON.stringify(formatted, null, 2)}`);
    }
    // Production: return data as-is (permissive)
    return data as z.infer<T>;
  }
  return result.data;
}

/**
 * Validate a command's response at runtime.
 *
 * In development, throws on validation failure.
 * In production, logs a warning and returns the raw data.
 */
export function validateCommandResponse<T extends z.ZodSchema>(
  schema: T,
  data: unknown
): z.infer<T> {
  return validateCommandParams(schema, data);
}

