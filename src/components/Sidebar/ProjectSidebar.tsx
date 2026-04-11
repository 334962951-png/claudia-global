import { Plus } from "lucide-react";
import React, { useState, useEffect, useCallback } from "react";
import { api, type Project } from "@/lib/api";
import { handleApiError } from "@/lib/errorHandler";
import { cn } from "@/lib/utils";

interface ProjectSidebarProps {
  selectedProjectId: string | null;
  onProjectSelect: (project: Project) => void;
  onProjectSettings?: (project: Project) => void;
}

/**
 * Extracts the project name from the full path
 */
const getProjectName = (path: string): string => {
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] || path;
};

/**
 * ProjectSidebar - Left-most icon-based panel showing project list
 *
 * Displays projects as round icon buttons with first letter.
 * Supports selection, hover tooltips, and adding new projects.
 */
export const ProjectSidebar: React.FC<ProjectSidebarProps> = ({
  selectedProjectId,
  onProjectSelect,
  onProjectSettings,
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

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

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleNewProject = () => {
    window.dispatchEvent(new CustomEvent("create-chat-tab"));
  };

  // Auto-hide when only 0-1 project (still render with 1 to allow switching)
  if (!loading && projects.length <= 1) {
    return null;
  }

  return (
    <aside className="shrink-0 w-16 border-r border-white/10 bg-zinc-950 flex flex-col items-center py-3 gap-2 transition-all duration-200 ease-out">
      {/* Project icons */}
      <div className="flex flex-col items-center gap-2 flex-1 overflow-y-auto scrollbar-none">
        {projects.map((project) => {
          const isSelected = project.id === selectedProjectId;
          const name = getProjectName(project.path);
          const initial = name.charAt(0).toUpperCase();

          return (
            <div key={project.id} className="relative group">
              <button
                className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center text-sm font-semibold transition-all duration-150",
                  isSelected
                    ? "bg-blue-500/20 text-blue-300 ring-1 ring-blue-400/30"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                )}
                onClick={() => onProjectSelect(project)}
                onMouseEnter={() => setHoveredId(project.id)}
                onMouseLeave={() => setHoveredId(null)}
                onContextMenu={(e) => {
                  if (onProjectSettings) {
                    e.preventDefault();
                    onProjectSettings(project);
                  }
                }}
              >
                {initial}
              </button>

              {/* Tooltip */}
              {hoveredId === project.id && (
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 px-2.5 py-1.5 rounded-md bg-zinc-800 border border-white/10 text-xs text-zinc-200 whitespace-nowrap shadow-lg pointer-events-none">
                  {name}
                  {project.sessions.length > 0 && (
                    <span className="ml-1.5 text-zinc-500">
                      ({project.sessions.length})
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add project button */}
      <div className="mt-auto">
        <button
          className="h-10 w-10 rounded-xl border border-dashed border-white/15 text-zinc-500 hover:text-zinc-200 hover:border-white/30 flex items-center justify-center transition-colors"
          onClick={handleNewProject}
          title="New Session"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
};
