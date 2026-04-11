/**
 * Command Palette — Global Cmd+K Command Panel
 *
 * Features:
 * - Fuzzy search across files, sessions, agents, settings, and commands
 * - Category tab filtering (全部 / 文件 / 会话 / Agent / 设置)
 * - Keyboard navigation (↑↓ navigate, Enter execute, Esc close, Tab switch category)
 * - Recent items shown when search is empty
 * - framer-motion open/close animation
 * - React Portal rendering outside the main layout tree
 */
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  FileText,
  MessageSquare,
  Bot,
  Settings2,
  Zap,
  Plus,
  X,
  Clock,
  FolderOpen,
  LayoutGrid,
} from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { useCommandPalette } from "@/contexts/CommandPaletteContext";
import { useAgentStore } from "@/stores/agentStore";
import { useSessionStore } from "@/stores/sessionStore";
import { useTabState } from "@/hooks/useTabState";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type CommandCategory = "all" | "file" | "session" | "agent" | "setting" | "command";

export interface CommandItem {
  id: string;
  category: CommandCategory;
  label: string;
  description?: string;
  icon?: ReactNode;
  action: () => void;
}

// ─── Fuzzy search ─────────────────────────────────────────────────────────────

/** Simple fuzzy matcher: each char of `query` must appear in order in `text`. */
function fuzzyMatch(text: string, query: string): boolean {
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  let ti = 0;
  for (const ch of q) {
    const idx = t.indexOf(ch, ti);
    if (idx === -1) return false;
    ti = idx + 1;
  }
  return true;
}

/** Returns highlighted JSX by wrapping matched chars in <mark>. */
function highlightMatch(text: string, query: string): ReactNode {
  if (!query) return text;
  const q = query.toLowerCase();
  const result: ReactNode[] = [];
  let last = 0;
  let qi = 0;
  for (let i = 0; i < text.length && qi < q.length; i++) {
    if (text[i].toLowerCase() === q[qi]) {
      if (last < i) result.push(text.slice(last, i));
      result.push(
        <mark key={i} className="text-blue-300 bg-blue-500/20 rounded-sm">
          {text[i]}
        </mark>
      );
      last = i + 1;
      qi++;
    }
  }
  if (last < text.length) result.push(text.slice(last));
  return result.length > 0 ? result : text;
}

// ─── Category metadata ────────────────────────────────────────────────────────

const CATEGORIES: { id: CommandCategory; label: string; icon: ReactNode }[] = [
  { id: "all", label: "全部", icon: <LayoutGrid className="w-3.5 h-3.5" /> },
  { id: "file", label: "文件", icon: <FileText className="w-3.5 h-3.5" /> },
  { id: "session", label: "会话", icon: <MessageSquare className="w-3.5 h-3.5" /> },
  { id: "agent", label: "Agent", icon: <Bot className="w-3.5 h-3.5" /> },
  { id: "setting", label: "设置", icon: <Settings2 className="w-3.5 h-3.5" /> },
  { id: "command", label: "命令", icon: <Zap className="w-3.5 h-3.5" /> },
];

// ─── Command builders ─────────────────────────────────────────────────────────

function buildSessionCommands(
  sessions: ReturnType<typeof useSessionStore.getState>["sessions"],
  projects: ReturnType<typeof useSessionStore.getState>["projects"],
  switchToTab: (id: string) => void,
  createChatTab: (projectId?: string) => string
): CommandItem[] {
  const items: CommandItem[] = [];

  for (const project of projects) {
    const projectSessions = sessions[project.id] || [];
    for (const session of projectSessions) {
      const label =
        session.first_message?.slice(0, 40) ||
        `Session ${session.id.slice(0, 8)}`;
      items.push({
        id: `session-${session.id}`,
        category: "session",
        label,
        description: project.path.split("/").pop() || project.path,
        icon: <MessageSquare className="w-4 h-4 text-zinc-400 shrink-0" />,
        action: () => {
          const tabId = createChatTab(project.id);
          switchToTab(tabId);
        },
      });
    }
  }

  return items;
}

function buildAgentCommands(
  agentRuns: ReturnType<typeof useAgentStore.getState>["agentRuns"],
  switchToTab: (id: string) => void,
  createAgentTab: (runId: string, name: string) => string
): CommandItem[] {
  return agentRuns.map((run) => ({
    id: `agent-${run.id}`,
    category: "agent",
    label: run.agent_name,
    description: run.task?.slice(0, 50) || run.project_path.split("/").pop(),
    icon: <Bot className="w-4 h-4 text-zinc-400 shrink-0" />,
    action: () => {
      const runId = run.id?.toString() || "";
      const tabId = createAgentTab(runId, run.agent_name);
      switchToTab(tabId);
    },
  }));
}

function buildSettingCommands(
  onOpenSettings: () => void,
  onOpenMCP: () => void,
  onOpenUsage: () => void,
  onOpenProjects: () => void
): CommandItem[] {
  return [
    {
      id: "setting-theme",
      category: "setting",
      label: "Theme: Dark",
      description: "打开外观设置",
      icon: <Settings2 className="w-4 h-4 text-zinc-400 shrink-0" />,
      action: onOpenSettings,
    },
    {
      id: "setting-mcp",
      category: "setting",
      label: "MCP Server Config",
      description: "配置 MCP 服务器",
      icon: <Settings2 className="w-4 h-4 text-zinc-400 shrink-0" />,
      action: onOpenMCP,
    },
    {
      id: "setting-proxy",
      category: "setting",
      label: "Proxy Settings",
      description: "配置代理服务器",
      icon: <Settings2 className="w-4 h-4 text-zinc-400 shrink-0" />,
      action: onOpenSettings,
    },
    {
      id: "setting-usage",
      category: "setting",
      label: "Usage Dashboard",
      description: "查看用量统计",
      icon: <Settings2 className="w-4 h-4 text-zinc-400 shrink-0" />,
      action: onOpenUsage,
    },
    {
      id: "setting-projects",
      category: "setting",
      label: "CC Projects",
      description: "管理所有项目",
      icon: <FolderOpen className="w-4 h-4 text-zinc-400 shrink-0" />,
      action: onOpenProjects,
    },
  ];
}

function buildCommandItems(
  createChatTab: () => string,
  closeCurrentTab: () => Promise<boolean>,
  createSettingsTab: () => string | null,
  createMCPTab: () => string | null,
  createProjectsTab: () => string | null,
  createUsageTab: () => string | null,
  createClaudeMdTab: () => string | null,
  switchToTab: (id: string) => void
): CommandItem[] {
  const setters: CommandItem[] = [
    {
      id: "cmd-new-chat",
      category: "command",
      label: "新建会话",
      description: "打开新聊天标签",
      icon: <Plus className="w-4 h-4 text-zinc-400 shrink-0" />,
      action: () => {
        const tabId = createChatTab();
        switchToTab(tabId);
      },
    },
    {
      id: "cmd-new-settings",
      category: "command",
      label: "打开设置",
      description: "打开设置面板",
      icon: <Settings2 className="w-4 h-4 text-zinc-400 shrink-0" />,
      action: () => {
        const tabId = createSettingsTab();
        if (tabId) switchToTab(tabId);
      },
    },
    {
      id: "cmd-new-mcp",
      category: "command",
      label: "打开 MCP 管理器",
      description: "配置 MCP 服务器",
      icon: <Settings2 className="w-4 h-4 text-zinc-400 shrink-0" />,
      action: () => {
        const tabId = createMCPTab();
        if (tabId) switchToTab(tabId);
      },
    },
    {
      id: "cmd-new-projects",
      category: "command",
      label: "打开项目列表",
      description: "查看所有项目",
      icon: <FolderOpen className="w-4 h-4 text-zinc-400 shrink-0" />,
      action: () => {
        const tabId = createProjectsTab();
        if (tabId) switchToTab(tabId);
      },
    },
    {
      id: "cmd-new-usage",
      category: "command",
      label: "打开用量统计",
      description: "查看 API 使用情况",
      icon: <Settings2 className="w-4 h-4 text-zinc-400 shrink-0" />,
      action: () => {
        const tabId = createUsageTab();
        if (tabId) switchToTab(tabId);
      },
    },
    {
      id: "cmd-new-claude-md",
      category: "command",
      label: "打开 CLAUDE.md",
      description: "编辑项目说明文件",
      icon: <FileText className="w-4 h-4 text-zinc-400 shrink-0" />,
      action: () => {
        const tabId = createClaudeMdTab();
        if (tabId) switchToTab(tabId);
      },
    },
    {
      id: "cmd-close-tab",
      category: "command",
      label: "关闭当前标签",
      description: "关闭活跃标签页",
      icon: <X className="w-4 h-4 text-zinc-400 shrink-0" />,
      action: () => {
        closeCurrentTab();
      },
    },
  ];
  return setters;
}

// ─── Recent history (localStorage) ──────────────────────────────────────────

const RECENT_KEY = "cmd-palette-recent";

function getRecentIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

function pushRecentId(id: string): void {
  const recent = getRecentIds().filter((r) => r !== id).slice(0, 8);
  recent.unshift(id);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
}

// ─── CommandPalette component ─────────────────────────────────────────────────

interface CommandPaletteProps {
  onOpenSettings: () => void;
  onOpenMCP: () => void;
  onOpenUsage: () => void;
  onOpenProjects: () => void;
}

export function CommandPalette({
  onOpenSettings,
  onOpenMCP,
  onOpenUsage,
  onOpenProjects,
}: CommandPaletteProps) {
  const { isOpen, setOpen: setIsOpen } = useCommandPalette();

  const { sessions, projects, fetchProjects, fetchProjectSessions } = useSessionStore();
  const { agentRuns } = useAgentStore();

  const {
    createChatTab,
    createAgentTab,
    closeCurrentTab,
    createSettingsTab,
    createMCPTab,
    createProjectsTab,
    createUsageTab,
    createClaudeMdTab,
    switchToTab,
  } = useTabState();

  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CommandCategory>("all");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Fetch data on mount
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Fetch sessions for each project when projects load
  useEffect(() => {
    for (const p of projects) {
      fetchProjectSessions(p.id);
    }
  }, [projects, fetchProjectSessions]);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setActiveCategory("all");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build all commands
  const allCommands = useMemo<CommandItem[]>(() => {
    const sessionCmds = buildSessionCommands(sessions, projects, switchToTab, createChatTab);
    const agentCmds = buildAgentCommands(agentRuns, switchToTab, createAgentTab);
    const settingCmds = buildSettingCommands(
      onOpenSettings,
      onOpenMCP,
      onOpenUsage,
      onOpenProjects
    );
    const commandCmds = buildCommandItems(
      createChatTab,
      closeCurrentTab,
      createSettingsTab,
      createMCPTab,
      createProjectsTab,
      createUsageTab,
      createClaudeMdTab,
      switchToTab
    );
    return [...commandCmds, ...sessionCmds, ...agentCmds, ...settingCmds];
  }, [
    sessions,
    projects,
    agentRuns,
    createChatTab,
    createAgentTab,
    closeCurrentTab,
    createSettingsTab,
    createMCPTab,
    createProjectsTab,
    createUsageTab,
    createClaudeMdTab,
    switchToTab,
    onOpenSettings,
    onOpenMCP,
    onOpenUsage,
    onOpenProjects,
  ]);

  // Filter commands by query and category
  const filteredCommands = useMemo<CommandItem[]>(() => {
    const recentIds = getRecentIds();

    let cmds = query.trim()
      ? allCommands.filter((c) => fuzzyMatch(c.label, query) || (c.description && fuzzyMatch(c.description, query)))
      : [...allCommands].sort((a, b) => {
          const ai = recentIds.indexOf(a.id);
          const bi = recentIds.indexOf(b.id);
          if (ai !== -1 && bi === -1) return -1;
          if (ai === -1 && bi !== -1) return 1;
          if (ai !== -1 && bi !== -1) return ai - bi;
          return 0;
        });

    if (activeCategory !== "all") {
      cmds = cmds.filter((c) => c.category === activeCategory);
    }

    return cmds;
  }, [allCommands, query, activeCategory]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands]);

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const selected = list.querySelector<HTMLElement>("[data-selected='true']");
    selected?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  // Close handler
  const handleClose = useCallback(() => setIsOpen(false), [setIsOpen]);

  // Execute command
  const handleExecute = useCallback(
    (item: CommandItem) => {
      pushRecentId(item.id);
      item.action();
      handleClose();
    },
    [handleClose]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            handleExecute(filteredCommands[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          handleClose();
          break;
        case "Tab":
          e.preventDefault();
          const cats = CATEGORIES.map((c) => c.id);
          const curIdx = cats.indexOf(activeCategory);
          const next = e.shiftKey
            ? cats[(curIdx - 1 + cats.length) % cats.length]
            : cats[(curIdx + 1) % cats.length];
          setActiveCategory(next);
          break;
      }
    },
    [filteredCommands, selectedIndex, handleExecute, handleClose, activeCategory]
  );

  // Group commands by category for display
  const groupedCommands = useMemo(() => {
    if (activeCategory !== "all") {
      return [{ category: activeCategory, items: filteredCommands }];
    }
    const groups: { category: CommandCategory; items: CommandItem[] }[] = [];
    const seen = new Set<CommandCategory>();
    for (const item of filteredCommands) {
      if (!seen.has(item.category)) {
        seen.add(item.category);
        groups.push({ category: item.category, items: [] });
      }
      groups.find((g) => g.category === item.category)!.items.push(item);
    }
    return groups;
  }, [filteredCommands, activeCategory]);

  // Compute flat index from grouped view
  const getFlatIndex = useCallback(
    (groupIdx: number, itemIdx: number): number => {
      let offset = 0;
      for (let g = 0; g < groupIdx; g++) {
        offset += groupedCommands[g].items.length;
      }
      return offset + itemIdx;
    },
    [groupedCommands]
  );

  if (!isOpen) return null;

  const panel = (
    <AnimatePresence>
      <motion.div
        key="palette-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) handleClose();
        }}
      >
        <motion.div
          key="palette-panel"
          initial={{ opacity: 0, scale: 0.96, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -8 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="w-full max-w-2xl rounded-2xl border border-white/10 bg-zinc-900/95 shadow-2xl overflow-hidden"
          onKeyDown={handleKeyDown}
        >
          {/* Search input row */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
            <div className="text-zinc-400 text-sm font-medium shrink-0">
              ⌘K
            </div>
            <Search className="w-4 h-4 text-zinc-500 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="搜索命令、文件、会话、设置..."
              className="flex-1 bg-transparent outline-none text-sm text-zinc-100 placeholder:text-zinc-500"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
            <button
              onClick={handleClose}
              className="text-xs text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded-md hover:bg-zinc-800 transition-colors shrink-0"
            >
              Esc
            </button>
          </div>

          {/* Category tabs */}
          <div className="flex gap-1.5 px-4 py-2 border-b border-white/10">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`
                  flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors
                  ${
                    activeCategory === cat.id
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200"
                  }
                `}
              >
                {cat.icon}
                {cat.label}
              </button>
            ))}
          </div>

          {/* Results list */}
          <div
            ref={listRef}
            className="max-h-[420px] overflow-y-auto px-2 py-2"
            role="listbox"
          >
            {groupedCommands.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-zinc-500">
                没有找到匹配结果
              </div>
            ) : (
              groupedCommands.map((group, gi) => (
                <div key={group.category}>
                  {/* Category label */}
                  <div className="px-3 py-2 text-[11px] uppercase tracking-wide text-zinc-500 flex items-center gap-2">
                    {CATEGORIES.find((c) => c.id === group.category)?.icon}
                    {CATEGORIES.find((c) => c.id === group.category)?.label}
                  </div>

                  {/* Items */}
                  <div className="space-y-0.5 pb-1">
                    {group.items.map((item, ii) => {
                      const flatIdx = getFlatIndex(gi, ii);
                      const isSelected = flatIdx === selectedIndex;
                      return (
                        <div
                          key={item.id}
                          data-selected={isSelected}
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => handleExecute(item)}
                          onMouseEnter={() => setSelectedIndex(flatIdx)}
                          className={`
                            flex items-center justify-between px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors
                            ${
                              isSelected
                                ? "bg-blue-500/15 text-blue-100 ring-1 ring-blue-400/30"
                                : "text-zinc-300 hover:bg-zinc-800/80"
                            }
                          `}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {item.icon}
                            <div className="min-w-0">
                              <div className="truncate font-medium">
                                {highlightMatch(item.label, query)}
                              </div>
                              {item.description && (
                                <div className="truncate text-xs text-zinc-500">
                                  {item.description}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="ml-4 text-[11px] text-zinc-500 shrink-0">
                            {!query && getRecentIds().includes(item.id) ? (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                              </span>
                            ) : (
                              <span>↵</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer hint */}
          <div className="flex items-center gap-4 px-4 py-2 border-t border-white/10 text-[11px] text-zinc-500">
            <span>↑↓ 导航</span>
            <span>Enter 选择</span>
            <span>Tab 切换分类</span>
            <span>Esc 关闭</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  // Render via portal to escape layout stacking contexts
  return createPortal(panel, document.body);
}
