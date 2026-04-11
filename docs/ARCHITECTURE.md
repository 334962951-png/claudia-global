# Claudia Enterprise — Architecture

> Version: v0.2.0 | Updated: 2026-04-12

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Desktop Shell | Tauri 2 | Rust backend |
| Frontend | React 18 + TypeScript 5.6 | Vite 6 |
| Styling | Tailwind CSS v4 | PostCSS plugin |
| State | Zustand | Lightweight store |
| Virtual Scroll | @tanstack/react-virtual | Message list |
| Animation | framer-motion | UI transitions |
| E2E | Playwright | Smoke tests |
| Unit | Vitest + Testing Library | 203 tests |

---

## Directory Structure

```
claudia-enterprise/
├── e2e/                         # Playwright E2E smoke tests
├── src/
│   ├── components/              # React components
│   │   ├── __tests__/           # Unit tests (*.test.tsx)
│   │   ├── Sidebar/             # ProjectSidebar + SessionSidebar
│   │   ├── Settings/            # Settings page + sub-components
│   │   ├── claude-code-session/ # MessageList helper
│   │   ├── ui/                  # Shared UI primitives (button, card, dialog...)
│   │   ├── widgets/             # Reusable display widgets
│   │   ├── App.tsx              # Main app layout (tab-based)
│   │   ├── AgentStepTree.tsx    # Step tree visualization
│   │   ├── ClaudeCodeSession.tsx # Core session component
│   │   ├── CodeBlock.tsx        # Syntax-highlighted code blocks
│   │   ├── CommandPalette.tsx   # Cmd+K global search
│   │   ├── MCPStatusIndicator.tsx # MCP connection status
│   │   ├── StreamMessage.tsx    # Message renderer
│   │   ├── TabManager.tsx       # Tab bar
│   │   ├── ToolWidgets.tsx      # 22 tool result widgets
│   │   └── ...
│   ├── contexts/                # React contexts
│   │   ├── CommandPaletteContext.ts
│   │   ├── TabContext.tsx
│   │   ├── ThemeContext.tsx
│   │   └── ToastContext.tsx
│   ├── hooks/                   # Custom React hooks
│   ├── lib/                     # Core utilities
│   │   ├── api.ts               # Tauri invoke wrapper (50+ methods)
│   │   ├── i18n.ts              # Internationalization
│   │   ├── stepParser.ts        # JSONL stream parser
│   │   ├── stepTreeStore.ts     # Step tree Zustand store
│   │   └── ...
│   ├── locales/                 # i18n translations (12 languages)
│   ├── stores/                  # Zustand stores
│   │   ├── sessionStore.ts      # Projects + sessions
│   │   └── agentStore.ts        # Agent runs
│   └── types/                   # TypeScript type definitions
│       ├── command-schemas.ts   # 143 Zod schemas
│       └── models.ts            # Model definitions
├── src-tauri/                   # Rust backend
│   └── src/                     # Tauri commands (invoke handlers)
├── docs/                        # Project documentation
├── .github/workflows/           # CI/CD (test.yml)
└── playwright.config.ts         # E2E test config
```

---

## Data Flow

```
┌─────────────────────────────────────────────────────┐
│                   Tauri Backend (Rust)                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐│
│  │ Sessions  │ │ Agents   │ │ MCP      │ │ Settings ││
│  └─────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬────┘│
└────────┼────────────┼────────────┼────────────┼─────┘
         │ invoke()   │            │            │
┌────────┼────────────┼────────────┼────────────┼─────┐
│        ▼            ▼            ▼            ▼     │
│  ┌─────────────────────────────────────────────┐    │
│  │              API Layer (api.ts)              │    │
│  │  listProjects()  executeAgent()  mcpList()  │    │
│  └──────────────────┬──────────────────────────┘    │
│                     │                                │
│         ┌───────────┼───────────┐                    │
│         ▼           ▼           ▼                    │
│  ┌───────────┐ ┌──────────┐ ┌──────────┐            │
│  │sessionStore│ │agentStore│ │stepTree  │  Zustand   │
│  │           │ │          │ │  Store    │  Stores    │
│  └─────┬─────┘ └────┬─────┘ └────┬─────┘            │
│        │            │            │                    │
│        ▼            ▼            ▼                    │
│  ┌─────────────────────────────────────────────┐    │
│  │            React Components                  │    │
│  │  App → TabManager → ClaudeCodeSession →      │    │
│  │    StreamMessage → ToolWidgets               │    │
│  └──────────────────────────────────────────────┘   │
│                    Frontend (React)                   │
└──────────────────────────────────────────────────────┘
```

---

## Tab System

The app uses a **tab-based interface** managed by `TabProvider` + `TabManager`:

| Tab Type | Component | Description |
|----------|-----------|-------------|
| Chat | `ClaudeCodeSession` | Interactive Claude Code session |
| Agent | `AgentRunView` | Agent execution view |
| Projects | `ProjectList` | Project browser |
| Usage | `UsageDashboard` | Token usage stats |
| MCP | `MCPManager` | MCP server management |
| Settings | `Settings` | App configuration |
| Claude-md | `MarkdownEditor` | CLAUDE.md file editor |

Lazy loading: `TabContent.tsx` uses `React.lazy` + `Suspense` to load tab content on demand.

---

## Key Components

| Component | File | Purpose |
|-----------|------|---------|
| `App` | `App.tsx` | Main layout with sidebar + tabs |
| `CommandPalette` | `CommandPalette.tsx` | Cmd+K global search (Cmd+K shortcut) |
| `ProjectSidebar` | `Sidebar/ProjectSidebar.tsx` | Left icon-based project selector |
| `SessionSidebar` | `Sidebar/SessionSidebar.tsx` | Session list with time grouping |
| `MCPStatusIndicator` | `MCPStatusIndicator.tsx` | 3-state connection indicator |
| `AgentStepTree` | `AgentStepTree.tsx` | Step tree with retry/delete actions |
| `CodeBlock` | `CodeBlock.tsx` | Syntax highlighting + copy |
| `StreamMessage` | `StreamMessage.tsx` | Message renderer with 22 tool widgets |
| `ToolWidgets` | `ToolWidgets.tsx` | Tool result display (separate chunk) |
| `Settings` | `Settings/` | Two-column settings with sub-tabs |

---

## Bundle Strategy

Vite splits code via `manualChunks`:

| Chunk | Contents | Size (gzip) |
|-------|----------|-------------|
| `index` | Main app code | ~595 KB |
| `editor-vendor` | Markdown editor | ~324 KB |
| `syntax-vendor` | Syntax highlighter | ~228 KB |
| `tool-widgets` | 22 tool result widgets | ~180 KB |
| `ui-vendor` | Radix UI primitives | ~78 KB |
| `tauri` | Tauri APIs | ~4 KB |

---

## Testing

| Level | Tool | Scope |
|-------|------|-------|
| L1 Type Check | `tsc --noEmit` | Zero TS errors |
| L2 Lint | `eslint src/` | Code quality |
| L3 Unit | `vitest run` | 203 tests, 18 files |
| L4 Build | `vite build` | Production build |
| L5 Rust | `cargo clippy` | Backend quality |
| L6 E2E | `playwright test` | 6 smoke tests |
| L7 CI | GitHub Actions | Push/PR automation |

---

## Store Architecture

### sessionStore
- `projects: Project[]` — All known projects
- `sessions: Session[]` — Sessions for selected project
- `currentSessionId` — Active session
- Actions: `fetchProjects`, `fetchProjectSessions`, `deleteSession`

### agentStore
- `agentRuns: AgentRun[]` — Agent execution history
- `runningAgents` — Currently executing agents
- Actions: `createAgentRun`, `cancelAgentRun`, `startPolling`

### stepTreeStore
- `stepTree: StepNode[]` — Hierarchical execution steps
- `viewMode: 'stream' | 'tree'` — Display mode toggle
- Actions: `toggleExpand`, `expandAll`, `collapseAll`, `retryStep`, `deleteStep`
