import { ChevronRight, Plus, FolderOpen, Folder, FileText } from "lucide-react";
import React, { useState, useEffect, useCallback } from "react";
import { api, type Project, type Session } from "@/lib/api";
import { handleApiError } from "@/lib/errorHandler";
import { cn } from "@/lib/utils";

interface ProjectSidebarProps {
  selectedProjectId: string | null;
  selectedSessionId?: string | null;
  onProjectSelect: (project: Project) => void;
  onSessionSelect?: (sessionId: string) => void;
  onProjectSettings?: (project: Project) => void;
  onCollapseToggle?: () => void;
  collapsed?: boolean;
}

/**
 * Extracts the project name from the full path
 */
const getProjectName = (path: string): string => {
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] || path;
};

/**
 * Truncates a name to a max character length
 */
const truncate = (name: string, max: number): string => {
  return name.length > max ? name.slice(0, max - 1) + "\u2026" : name;
};

interface SessionItemProps {
  session: Session;
  isSelected: boolean;
  onClick: () => void;
  depth: number;
}

const SessionItem: React.FC<SessionItemProps> = ({ session, isSelected, onClick, depth }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      className={cn(
        "w-full flex items-center gap-1.5 py-1 rounded text-left text-xs transition-colors duration-100",
        "truncate",
        isSelected
          ? "bg-blue-500/15 text-blue-300"
          : hovered
          ? "bg-zinc-800/60 text-zinc-200"
          : "text-zinc-500"
      )}
      style={{ paddingLeft: `${8 + depth * 12}px`, paddingRight: "8px" }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={session.first_message || "Untitled session"}
    >
      <FileText className="shrink-0 w-3 h-3 opacity-70" />
      <span className="truncate flex-1">
        {truncate(session.first_message || "Untitled", 28)}
      </span>
    </button>
  );
};

interface ProjectItemProps {
  project: Project;
  isSelected: boolean;
  expandedIds: Set<string>;
  loadedSessions: Map<string, Session[]>;
  selectedSessionId?: string | null;
  onToggleExpand: (id: string) => void;
  onProjectClick: () => void;
  onSessionClick: (sessionId: string) => void;
}

const ProjectItem: React.FC<ProjectItemProps> = ({
  project,
  isSelected,
  expandedIds,
  loadedSessions,
  selectedSessionId,
  onToggleExpand,
  onProjectClick,
  onSessionClick,
}) => {
  const [hovered, setHovered] = useState(false);
  const name = getProjectName(project.path);
  const isExpanded = expandedIds.has(project.id);
  const sessions = loadedSessions.get(project.id) ?? [];
  const sessionCount = sessions.length;
  const hasSessions = sessionCount > 0;

  const handleChevronClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpand(project.id);
  };

  return (
    <div className="w-full">
      {/* Project row */}
      <div
        className={cn(
          "group flex items-center gap-1 px-1.5 py-1 rounded cursor-pointer transition-all duration-100",
          isSelected
            ? "bg-blue-500/15 text-blue-300"
            : hovered
            ? "bg-zinc-800/60 text-zinc-100"
            : "text-zinc-300"
        )}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Expand/collapse chevron */}
        <button
          className={cn(
            "shrink-0 flex items-center justify-center w-4 h-4 rounded transition-transform duration-200",
            hovered || hasSessions ? "opacity-100" : "opacity-0",
            isExpanded ? "text-zinc-400" : "text-zinc-600"
          )}
          onClick={handleChevronClick}
          title={isExpanded ? "Collapse" : "Expand"}
        >
          <ChevronRight
            className={cn(
              "w-3 h-3 transition-transform duration-200",
              isExpanded && "rotate-90"
            )}
          />
        </button>

        {/* Project icon */}
        <button
          className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-xs font-bold transition-colors"
          onClick={onProjectClick}
          title={name}
        >
          {isExpanded ? (
            <FolderOpen className="w-4 h-4 opacity-80" />
          ) : (
            <Folder className="w-4 h-4 opacity-80" />
          )}
        </button>

        {/* Project name */}
        <button
          className="flex-1 min-w-0 text-left text-xs font-medium truncate"
          onClick={onProjectClick}
          title={name}
        >
          {truncate(name, 22)}
        </button>

        {/* Session count badge */}
        {hasSessions && (
          <span
            className={cn(
              "shrink-0 text-[10px] px-1 py-0.5 rounded-full font-medium leading-none",
              isSelected
                ? "bg-blue-500/20 text-blue-400"
                : "bg-zinc-800 text-zinc-500"
            )}
          >
            {sessionCount}
          </span>
        )}
      </div>

      {/* Expanded sessions list */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        {hasSessions ? (
          sessions.map((session: Session) => (
            <SessionItem
              key={session.id}
              session={session}
              isSelected={session.id === selectedSessionId}
              onClick={() => onSessionClick(session.id)}
              depth={1}
            />
          ))
        ) : (
          <p
            className="text-[10px] text-zinc-600 italic px-4 py-1"
            style={{ paddingLeft: "28px" }}
          >
            No sessions
          </p>
        )}
      </div>
    </div>
  );
};

/**
 * ProjectSidebar - Left sidebar showing project list with expandable sessions.
 *
 * Supports project selection, expand/collapse sessions, session selection,
 * new project creation, and context menu for project settings.
 */
export const ProjectSidebar: React.FC<ProjectSidebarProps> = ({
  selectedProjectId,
  selectedSessionId,
  onProjectSelect,
  onSessionSelect,
  onProjectSettings: _onProjectSettings,
  onCollapseToggle,
  collapsed = false,
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [loadedSessions, setLoadedSessions] = useState<Map<string, Session[]>>(new Map());
  const [loadingSessions, setLoadingSessions] = useState<Set<string>>(new Set());

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const projectList = await api.listProjects();
      setProjects(projectList);
    } catch (err) {
      await handleApiError(err as Error, { operation: "loadProjects", component: "ProjectSidebar" });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSessions = useCallback(async (projectId: string) => {
    if (loadedSessions.has(projectId) || loadingSessions.has(projectId)) return;
    try {
      setLoadingSessions((prev) => new Set(prev).add(projectId));
      const sessions = await api.getProjectSessions(projectId);
      setLoadedSessions((prev) => new Map(prev).set(projectId, sessions));
    } catch (err) {
      await handleApiError(err as Error, { operation: "loadSessions", component: "ProjectSidebar", projectId });
    } finally {
      setLoadingSessions((prev) => {
        const next = new Set(prev);
        next.delete(projectId);
        return next;
      });
    }
  }, [loadedSessions, loadingSessions]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        // Lazy-load sessions when expanding
        loadSessions(id);
      }
      return next;
    });
  }, [loadSessions]);

  const handleProjectClick = (project: Project) => {
    onProjectSelect(project);
  };

  const handleSessionClick = (sessionId: string) => {
    if (onSessionSelect) {
      onSessionSelect(sessionId);
    }
  };

  const handleNewProject = () => {
    window.dispatchEvent(new CustomEvent("create-chat-tab"));
  };

  // Auto-hide when only 0-1 project (still render with 1 to allow switching)
  if (!loading && projects.length <= 1) {
    return null;
  }

  return (
    <aside
      className={cn(
        "shrink-0 border-r border-white/10 bg-zinc-950 flex flex-col transition-all duration-200 ease-out",
        collapsed ? "w-14" : "w-56"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-2 border-b border-white/5">
        {!collapsed && (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
            Projects
          </span>
        )}
        <button
          className="shrink-0 p-1 rounded text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors"
          onClick={onCollapseToggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronRight
            className={cn(
              "w-3.5 h-3.5 transition-transform duration-200",
              collapsed && "rotate-180"
            )}
          />
        </button>
      </div>

      {/* Project list */}
      <div className="flex-1 overflow-y-auto py-1.5 scrollbar-none">
        {loading ? (
          <div className="flex flex-col items-center gap-2 py-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-7 w-36 rounded-md bg-zinc-800/40 animate-pulse"
              />
            ))}
          </div>
        ) : (
          projects.map((project) => (
            <ProjectItem
              key={project.id}
              project={project}
              isSelected={project.id === selectedProjectId}
              expandedIds={expandedIds}
              loadedSessions={loadedSessions}
              selectedSessionId={selectedSessionId}
              onToggleExpand={toggleExpand}
              onProjectClick={() => handleProjectClick(project)}
              onSessionClick={handleSessionClick}
            />
          ))
        )}
      </div>

      {/* Add project button */}
      <div className="px-2 py-2 border-t border-white/5">
        <button
          className={cn(
            "w-full rounded-lg border border-dashed border-white/15 text-zinc-500 hover:text-zinc-200 hover:border-white/30 flex items-center gap-2 transition-colors",
            collapsed ? "justify-center px-0 py-2" : "justify-start px-3 py-2"
          )}
          onClick={handleNewProject}
          title="New Session"
        >
          <Plus className="h-4 w-4 shrink-0" />
          {!collapsed && (
            <span className="text-xs">New Project</span>
          )}
        </button>
      </div>
    </aside>
  );
};
