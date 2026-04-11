import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  Wifi,
} from "lucide-react";
import React, { useState, useEffect, useCallback, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Toast, ToastContainer } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { handleError } from "@/lib/errorHandler";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Individual MCP server status for the indicator
 */
export interface MCPServerStatus {
  name: string;
  status: "connected" | "connecting" | "disconnected";
  endpoint?: string;
  lastHeartbeat?: Date;
  error?: string;
}

/**
 * Props interface for the MCPStatusIndicator component
 */
interface MCPStatusIndicatorProps {
  /**
   * Callback to open MCP settings page
   */
  onOpenMCPSettings?: () => void;
  /**
   * Polling interval in milliseconds (default: 30000)
   */
  pollInterval?: number;
  /**
   * Optional className for the trigger button
   */
  className?: string;
}

/**
 * Aggregate connection status across all servers
 */
type AggregateStatus = "connected" | "connecting" | "disconnected" | "none";

/**
 * MCP Status Indicator Component
 *
 * Displays MCP server connection status with three states:
 * - Green: Connected
 * - Yellow (pulsing): Connecting
 * - Red: Disconnected
 *
 * Clicking the indicator opens a detail card with:
 * - Current status
 * - Server names and endpoints
 * - Last heartbeat times
 * - Error messages (if disconnected)
 * - Reconnect button
 * - Link to MCP settings
 *
 * @example
 * <MCPStatusIndicator
 *   onOpenMCPSettings={() => setShowMCPSettings(true)}
 *   pollInterval={30000}
 * />
 */
export const MCPStatusIndicator: React.FC<MCPStatusIndicatorProps> = ({
  onOpenMCPSettings,
  pollInterval = 30000,
  className,
}) => {
  const { t } = useI18n();
  const [serverStatuses, setServerStatuses] = useState<MCPServerStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Track previous status for toast notifications
  const prevStatusesRef = useRef<Map<string, MCPServerStatus["status"]>>(new Map());

  /**
   * Load MCP servers and compute their statuses
   */
  const loadServerStatuses = useCallback(async () => {
    try {
      const serverList = await api.mcpList();

      const statuses: MCPServerStatus[] = await Promise.all(
        serverList.map(async (server) => {
          // Determine status based on is_active and runtime status
          let status: MCPServerStatus["status"] = "disconnected";

          if (server.is_active) {
            try {
              // Try to get runtime status for this server
              const runtimeStatuses = await api.mcpGetServerStatus();
              const runtimeStatus = runtimeStatuses[server.name];

              if (runtimeStatus) {
                if (runtimeStatus.running) {
                  status = "connected";
                } else if (runtimeStatus.error) {
                  status = "disconnected";
                }
              } else {
                // Server is marked active but no runtime status = assume connected
                status = "connected";
              }
            } catch {
              // Can't get runtime status - server might still be active
              status = "connected";
            }
          }

          return {
            name: server.name,
            status,
            endpoint: server.url || (server.command ? `${server.command} ${server.args.join(" ")}` : undefined),
            lastHeartbeat: status === "connected" ? new Date() : undefined,
            error: undefined,
          };
        })
      );

      setServerStatuses(statuses);
      setLoading(false);

      // Check for status changes and show toasts
      const prevStatuses = prevStatusesRef.current;
      statuses.forEach((newStatus) => {
        const prevStatus = prevStatuses.get(newStatus.name);
        if (prevStatus && prevStatus !== newStatus.status) {
          if (newStatus.status === "disconnected" && prevStatus === "connected") {
            setToast({ message: t.mcp.mcpServerDisconnected, type: "error" });
          } else if (newStatus.status === "connected" && prevStatus === "disconnected") {
            setToast({ message: t.mcp.mcpServerConnected, type: "success" });
          }
        }
        prevStatuses.set(newStatus.name, newStatus.status);
      });
    } catch (err) {
      await handleError("MCPStatusIndicator: Failed to load server statuses", { context: err });
      setLoading(false);
    }
  }, [t.mcp.mcpServerConnected, t.mcp.mcpServerDisconnected]);

  // Initial load and polling
  useEffect(() => {
    loadServerStatuses();

    // Set up polling
    pollTimerRef.current = setInterval(loadServerStatuses, pollInterval);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [loadServerStatuses, pollInterval]);

  // Close expanded card on click outside
  useEffect(() => {
    if (!expanded) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setExpanded(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [expanded]);

  // Compute aggregate status
  const aggregateStatus: AggregateStatus = serverStatuses.length === 0
    ? "none"
    : serverStatuses.some(s => s.status === "connecting")
      ? "connecting"
      : serverStatuses.some(s => s.status === "connected")
        ? "connected"
        : "disconnected";

  // Status dot styles
  const statusDotStyles = {
    connected: {
      base: "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]",
      label: t.mcp.connected,
    },
    connecting: {
      base: "bg-amber-400 animate-pulse shadow-[0_0_10px_rgba(251,191,36,0.6)]",
      label: t.mcp.connecting,
    },
    disconnected: {
      base: "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]",
      label: t.mcp.disconnected,
    },
    none: {
      base: "bg-zinc-500",
      label: t.mcp.noMcpServers,
    },
  };

  const currentStatus = statusDotStyles[aggregateStatus];

  /**
   * Format a date to relative time string
   */
  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);

    if (diffSecs < 60) return `${diffSecs}s ago`;
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  /**
   * Handle reconnect for all servers
   */
  const handleReconnect = async () => {
    setReconnecting(true);
    try {
      // Reload servers and refresh statuses
      await loadServerStatuses();
      setToast({ message: t.mcp.mcpServerConnected, type: "success" });
    } catch (err) {
      await handleError("MCPStatusIndicator: Reconnect failed", { context: err });
      setToast({ message: t.mcp.disconnected, type: "error" });
    } finally {
      setReconnecting(false);
    }
  };

  /**
   * Compact trigger button (shown in Topbar)
   */
  const TriggerButton = () => (
    <button
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900 px-3 py-1.5",
        "text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-800",
        "focus:outline-none focus:ring-2 focus:ring-blue-500/50",
        className
      )}
      onClick={() => setExpanded(!expanded)}
      title={`MCP: ${currentStatus.label}`}
    >
      {/* Status Dot */}
      {loading ? (
        <Loader2 className="h-2.5 w-2.5 animate-spin text-zinc-400" />
      ) : (
        <span
          className={cn(
            "h-2.5 w-2.5 rounded-full",
            currentStatus.base
          )}
        />
      )}

      {/* Status Label */}
      <span>{currentStatus.label}</span>

      {/* Expand indicator */}
      <span className={cn(
        "text-zinc-500 transition-transform duration-200",
        expanded && "rotate-180"
      )}>
        ▼
      </span>
    </button>
  );

  /**
   * Expanded detail card
   */
  const DetailCard = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -4 }}
      transition={{ duration: 0.15 }}
      className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-white/10 bg-zinc-900 shadow-xl p-4 z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
          <Wifi className="h-4 w-4 text-blue-400" />
          {t.mcp.connectionStatus}
        </h3>
        <span
          className={cn(
            "h-2.5 w-2.5 rounded-full",
            currentStatus.base
          )}
        />
      </div>

      {/* Server List */}
      {serverStatuses.length === 0 ? (
        <div className="text-center py-6 text-zinc-500 text-sm">
          {t.mcp.noMcpServers}
        </div>
      ) : (
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {serverStatuses.map((server) => (
            <div
              key={server.name}
              className="rounded-lg bg-zinc-800/50 p-3 border border-white/5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      server.status === "connected" && "bg-emerald-400",
                      server.status === "connecting" && "bg-amber-400 animate-pulse",
                      server.status === "disconnected" && "bg-rose-500"
                    )}
                  />
                  <span className="text-sm font-medium text-zinc-200">
                    {server.name}
                  </span>
                </div>
                <span className="text-xs text-zinc-500">
                  {server.status === "connected" ? t.mcp.connected :
                   server.status === "connecting" ? t.mcp.connecting :
                   t.mcp.disconnected}
                </span>
              </div>

              {/* Endpoint */}
              {server.endpoint && (
                <div className="mt-1 text-xs text-zinc-500 truncate pl-4">
                  {server.endpoint}
                </div>
              )}

              {/* Last Heartbeat */}
              {server.lastHeartbeat && (
                <div className="mt-1 text-xs text-zinc-500 pl-4">
                  {t.mcp.lastHeartbeat}: {formatRelativeTime(server.lastHeartbeat)}
                </div>
              )}

              {/* Error */}
              {server.error && (
                <div className="mt-2 flex items-start gap-1 text-xs text-rose-400 pl-4">
                  <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                  <span className="truncate">{server.error}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-8 text-xs"
          onClick={handleReconnect}
          disabled={reconnecting || aggregateStatus === "none"}
        >
          {reconnecting ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3 mr-1" />
          )}
          {t.mcp.reconnect}
        </Button>

        {onOpenMCPSettings && (
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-8 text-xs"
            onClick={onOpenMCPSettings}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            {t.mcp.openMcpSettings}
          </Button>
        )}
      </div>
    </motion.div>
  );

  return (
    <>
      <div ref={containerRef} className="relative inline-block">
        <TriggerButton />

        <AnimatePresence>
          {expanded && <DetailCard />}
        </AnimatePresence>
      </div>

      {/* Toast Notifications */}
      <ToastContainer>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onDismiss={() => setToast(null)}
          />
        )}
      </ToastContainer>
    </>
  );
};
