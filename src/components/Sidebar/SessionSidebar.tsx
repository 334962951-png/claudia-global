import { Plus, ChevronLeft, FileText, Clock, MessageSquare, Trash2, Edit3, FolderOpen } from "lucide-react";
import React, { useState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api, type Session, type Project } from "@/lib/api";
import { formatTimeAgo, truncateText, getFirstLine } from "@/lib/date-utils";
import { handleApiError } from "@/lib/errorHandler";
import { cn } from "@/lib/utils";

interface SessionSidebarProps {
  project: Project | null;
  selectedSessionId: string | null;
  onSessionSelect: (session: Session) => void;
  onBack?: () => void;
  onSessionDeleted?: (sessionId: string) => void;
  onNewSession?: () => void;
  collapsed?: boolean;
  onCollapseToggle?: () => void;
}

/**
 * Groups sessions by time period
 */
interface GroupedSessions {
  today: Session[];
  yesterday: Session[];
  thisWeek: Session[];
  older: Session[];
}

const groupSessionsByTime = (sessions: Session[]): GroupedSessions => {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const weekMs = 7 * dayMs;

  const groups: GroupedSessions = { today: [], yesterday: [], thisWeek: [], older: [] };

  sessions.forEach((session) => {
    const sessionTime = (session.message_timestamp
      ? new Date(session.message_timestamp).getTime()
      : session.created_at * 1000);
    const age = now - sessionTime;

    if (age < dayMs) {
      groups.today.push(session);
    } else if (age < 2 * dayMs) {
      groups.yesterday.push(session);
    } else if (age < weekMs) {
      groups.thisWeek.push(session);
    } else {
      groups.older.push(session);
    }
  });

  return groups;
};

/**
 * SessionSidebar - Text-based session list panel
 *
 * Displays sessions grouped by time (Today / Yesterday / This Week / Older).
 * Supports selection, hover actions, and context menu.
 */
export const SessionSidebar: React.FC<SessionSidebarProps> = ({
  project,
  selectedSessionId,
  onSessionSelect,
  onBack,
  onSessionDeleted,
  onNewSession,
  collapsed = false,
  onCollapseToggle,
}) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [contextMenuSession, setContextMenuSession] = useState<Session | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [, setRenamingSession] = useState<Session | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Load sessions when project changes
  useEffect(() => {
    if (!project) {
      setSessions([]);
      return;
    }

    const loadSessions = async () => {
      setLoading(true);
      try {
        const sessionList = await api.getProjectSessions(project.id);
        setSessions(sessionList);
      } catch (err) {
        await handleApiError(err as Error, { operation: "loadSessions", component: "SessionSidebar" });
      } finally {
        setLoading(false);
      }
    };

    loadSessions();
  }, [project]);

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenuSession(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDeleteSession = async () => {
    if (!sessionToDelete || !project) return;
    setIsDeleting(true);
    try {
      try {
        const runningSessions = await api.listRunningClaudeSessions();
        const runningSession = runningSessions.find((s: any) => s.session_id === sessionToDelete.id);
        if (runningSession) {
          await api.cancelClaudeExecution(sessionToDelete.id);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch {
        // Continue with deletion
      }
      await api.deleteSession(sessionToDelete.id, project.id);
      setSessions((prev) => prev.filter((s) => s.id !== sessionToDelete.id));
      onSessionDeleted?.(sessionToDelete.id);
    } catch (error) {
      console.error("Failed to delete session:", error);
    } finally {
      setIsDeleting(false);
      setSessionToDelete(null);
    }
  };

  const getProjectName = (path: string): string => {
    const parts = path.split("/").filter(Boolean);
    return parts[parts.length - 1] || path;
  };

  const grouped = groupSessionsByTime(sessions);

  const renderSessionGroup = (label: string, groupSessions: Session[]) => {
    if (groupSessions.length === 0) return null;
    return (
      <div className="mb-4">
        <div className="px-3 py-1.5 text-[11px] uppercase tracking-wide text-zinc-500 font-medium">
          {label}
        </div>
        <div className="space-y-0.5">
          {groupSessions.map((session) => {
            const isSelected = session.id === selectedSessionId;
            const isHovered = hoveredId === session.id;
            const sessionTime = session.message_timestamp
              ? formatTimeAgo(new Date(session.message_timestamp).getTime())
              : formatTimeAgo(session.created_at * 1000);

            return (
              <div key={session.id} className="relative">
                <button
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-xl transition-all duration-150 group",
                    isSelected
                      ? "bg-zinc-800 ring-1 ring-white/10"
                      : "hover:bg-zinc-800/80"
                  )}
                  onClick={() => onSessionSelect(session)}
                  onMouseEnter={() => setHoveredId(session.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenuSession(session);
                  }}
                >
                  <div className="min-w-0">
                    {/* Session title from first message */}
                    <div className="truncate text-sm font-medium text-zinc-200">
                      {session.first_message
                        ? truncateText(getFirstLine(session.first_message), 40)
                        : session.id.slice(0, 8)}
                    </div>
                    {/* Meta info */}
                    <div className="mt-0.5 text-xs text-zinc-500 flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {sessionTime}
                      </span>
                      {session.first_message && (
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          msg
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quick actions on hover */}
                  {isHovered && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                      <button
                        className="h-6 w-6 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700 flex items-center justify-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenamingSession(session);
                        }}
                        title="Rename"
                      >
                        <Edit3 className="h-3 w-3" />
                      </button>
                      <button
                        className="h-6 w-6 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSessionToDelete(session);
                        }}
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </button>

                {/* Context menu */}
                {contextMenuSession?.id === session.id && (
                  <div
                    ref={contextMenuRef}
                    className="absolute left-full top-0 ml-1 z-50 w-40 rounded-xl border border-white/10 bg-zinc-900 shadow-xl py-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 flex items-center gap-2"
                      onClick={() => {
                        setRenamingSession(session);
                        setContextMenuSession(null);
                      }}
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Rename
                    </button>
                    <button
                      className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                      onClick={() => {
                        setSessionToDelete(session);
                        setContextMenuSession(null);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Collapsed view
  if (collapsed) {
    return (
      <aside className="shrink-0 w-12 border-r border-white/10 bg-zinc-950 flex flex-col items-center py-3 gap-2 transition-all duration-200 ease-out">
        <button
          className="h-10 w-10 rounded-xl bg-zinc-800 text-zinc-400 flex items-center justify-center"
          onClick={onCollapseToggle}
          title="Expand session bar"
        >
          <FolderOpen className="h-4 w-4" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="shrink-0 w-72 border-r border-white/10 bg-zinc-900 flex flex-col transition-all duration-200 ease-out">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          {onBack && (
            <button
              className="h-6 w-6 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 flex items-center justify-center shrink-0"
              onClick={onBack}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <div className="min-w-0">
            <div className="text-sm font-semibold text-zinc-100 truncate">
              {project ? getProjectName(project.path) : "No Project"}
            </div>
            <div className="text-xs text-zinc-500">{sessions.length} session{sessions.length !== 1 ? "s" : ""}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onCollapseToggle && (
            <button
              className="h-7 w-7 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 flex items-center justify-center"
              onClick={onCollapseToggle}
              title="Collapse"
            >
              ‹
            </button>
          )}
        </div>
      </div>

      {/* New session button */}
      {project && onNewSession && (
        <div className="px-3 py-2">
          <button
            className="w-full h-9 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white flex items-center justify-center gap-1.5 transition-colors"
            onClick={onNewSession}
          >
            <Plus className="h-4 w-4" />
            New Session
          </button>
        </div>
      )}

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 rounded-full border-2 border-zinc-600 border-t-zinc-300 animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="py-8 text-center">
            <FileText className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-xs text-zinc-500">No sessions yet</p>
          </div>
        ) : (
          <>
            {renderSessionGroup("Today", grouped.today)}
            {renderSessionGroup("Yesterday", grouped.yesterday)}
            {renderSessionGroup("This Week", grouped.thisWeek)}
            {renderSessionGroup("Older", grouped.older)}
          </>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!sessionToDelete}
        onOpenChange={(open) => {
          if (!open) setSessionToDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Session</DialogTitle>
            <DialogDescription className="space-y-2">
              <div>Are you sure you want to delete this session?</div>
              {sessionToDelete?.first_message && (
                <div className="text-xs text-zinc-500 bg-zinc-800 p-2 rounded">
                  <span className="font-medium">First message:</span>{" "}
                  {truncateText(getFirstLine(sessionToDelete.first_message), 80)}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSessionToDelete(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteSession} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
};
