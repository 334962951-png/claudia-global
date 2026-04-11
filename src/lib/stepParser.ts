/**
 * Step Parser — converts raw Claude Code JSONL stream messages into step nodes.
 *
 * The parser listens to the same `claude-output` events that power the stream view
 * and derives step boundaries from message types and content structures.
 *
 * ## Step detection rules
 *
 * | Message type / content                  | Step type  | Label                       |
 * |-----------------------------------------|------------|-----------------------------|
 * | `type: "assistant"` + thinking block    | `thinking` | "Thinking"                  |
 * | `type: "assistant"` + tool_use block    | `action`   | Tool name (e.g. "Edit")     |
 * | `type: "user"` + tool_result block      | `result`   | Tool name + " result"       |
 * | `type: "result"` (error)                | `error`    | "Execution Failed"          |
 * | `type: "result"` (success)              | `result`   | "Execution Complete"         |
 * | `type: "system"` (error)                | `error`    | System error message summary |
 * | `type: "system"` (init)                | `action`   | "Session Initialized"        |
 */

import type { ClaudeStreamMessage } from '@/components/AgentExecution';
import type { StepNodeType } from './stepTreeStore';
import { useStepTreeStore } from './stepTreeStore';

// Keep a ref to the most recent action node so we can attach result children
let _lastActionNodeId: string | null = null;

// ---------------------------------------------------------------------------
// Type guards & helpers
// ---------------------------------------------------------------------------

function getToolName(content: Record<string, unknown>): string {
  const name = content.name as string | undefined;
  if (!name) return 'Unknown Tool';
  // Humanise the tool name: "TodoWrite" → "TodoWrite", "mcp__github__create_issue" → "GitHub: Create Issue"
  if (name.startsWith('mcp__')) {
    return name
      .replace(/^mcp__/, '')
      .replace(/__/g, ': ')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function extractTextContent(content: Record<string, unknown>): string {
  if (typeof content.text === 'string') return content.text;
  if (typeof content.thinking === 'string') return content.thinking;
  if (typeof content.content === 'string') return content.content;
  return JSON.stringify(content, null, 2);
}

function extractInputSummary(input: unknown): string {
  if (!input || typeof input !== 'object') return '';
  const obj = input as Record<string, unknown>;

  // Produce a short one-line summary useful for the tree label
  if (obj.file_path) return String(obj.file_path);
  if (obj.command) return String(obj.command);
  if (obj.pattern) return String(obj.pattern);
  if (obj.query) return String(obj.query);
  if (obj.url) return String(obj.url);
  if (obj.description) return String(obj.description);
  if (obj.todos) return `${(obj.todos as unknown[]).length} task(s)`;
  if (obj.path) return String(obj.path);

  // Fallback: first key
  const key = Object.keys(obj)[0];
  if (key) return `${key}: ${JSON.stringify(obj[key])}`;
  return '';
}

// ---------------------------------------------------------------------------
// Main parse function — call this for every JSONL line received
// ---------------------------------------------------------------------------

export function parseStreamMessage(payload: string): void {
  let msg: ClaudeStreamMessage;
  try {
    msg = JSON.parse(payload) as ClaudeStreamMessage;
  } catch {
    return; // malformed line, skip
  }

  const store = useStepTreeStore.getState();
  const now = Date.now();

  // 1. Assistant thinking block
  if (msg.type === 'assistant' && msg.message?.content) {
    for (const block of msg.message.content) {
      const obj = block as unknown as Record<string, unknown>;

      // Thinking
      if (obj.type === 'thinking') {
        const text = extractTextContent(obj);
        const id = store.addStep({
          type: 'thinking',
          label: 'Thinking',
          content: text,
          timestamp: now,
        });
        _lastActionNodeId = id;
        return; // one thinking block per message
      }
    }
  }

  // 2. Assistant tool_use blocks
  if (msg.type === 'assistant' && msg.message?.content) {
    for (const block of msg.message.content) {
      const obj = block as unknown as Record<string, unknown>;

      if (obj.type === 'tool_use') {
        const toolName = getToolName(obj);
        const inputSummary = extractInputSummary(obj.input);
        const label = inputSummary
          ? `${toolName}  ${inputSummary}`
          : toolName;

        const id = store.addStep({
          type: 'action',
          label,
          content: JSON.stringify(obj.input ?? {}, null, 2),
          toolName: obj.name as string,
          timestamp: now,
        });
        _lastActionNodeId = id;
      }
    }
    return;
  }

  // 3. User tool_result blocks — attach as child of the last action
  if (msg.type === 'user' && msg.message?.content) {
    for (const block of msg.message.content) {
      const obj = block as unknown as Record<string, unknown>;

      if (obj.type === 'tool_result') {
        const text = extractTextContent(obj);
        const isError = Boolean(obj.is_error);
        const type: StepNodeType = isError ? 'error' : 'result';

        if (_lastActionNodeId) {
          store.addChildStep(_lastActionNodeId, {
            type,
            label: isError ? 'Error' : 'Result',
            content: text,
            timestamp: now,
          });
        } else {
          // No parent action found — promote to top-level
          store.addStep({
            type,
            label: isError ? 'Tool Error' : 'Tool Result',
            content: text,
            timestamp: now,
          });
        }
      }
    }
    return;
  }

  // 4. Result message (session complete / failed)
  if (msg.type === 'result') {
    const isError = msg.is_error || Boolean(msg.error);
    if (isError) {
      store.addStep({
        type: 'error',
        label: 'Execution Failed',
        content: msg.error ?? msg.result ?? '',
        timestamp: now,
      });
    } else {
      store.addStep({
        type: 'result',
        label: 'Execution Complete',
        content: msg.result ?? '',
        timestamp: now,
      });
    }
    _lastActionNodeId = null;
    return;
  }

  // 5. System error messages
  if (msg.type === 'system' && (msg.subtype === 'error' || msg.error)) {
    store.addStep({
      type: 'error',
      label: 'System Error',
      content: msg.error ?? String(msg.subtype),
      timestamp: now,
    });
    return;
  }

  // 6. System init — treat as a "session start" action
  if (msg.type === 'system' && msg.subtype === 'init') {
    store.addStep({
      type: 'action',
      label: 'Session Initialized',
      content: [
        `Model: ${msg.model ?? 'unknown'}`,
        `CWD: ${msg.cwd ?? 'unknown'}`,
        `Session: ${msg.session_id ?? 'unknown'}`,
      ].join('\n'),
      timestamp: now,
    });
    _lastActionNodeId = null;
  }
}

/** Call this when a new session starts to reset parser state */
export function resetStepParser(): void {
  _lastActionNodeId = null;
}
