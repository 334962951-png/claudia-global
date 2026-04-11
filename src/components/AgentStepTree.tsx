/**
 * AgentStepTree — tree visualization for agent execution steps.
 *
 * Renders a collapsible tree where each node represents one discrete step
 * in an agent run (thinking, action, result, error). Supports keyboard
 * navigation and smooth expand/collapse animations via framer-motion.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

import { useStepTreeStore } from '@/lib/stepTreeStore';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StepNodeProps {
  nodeId: string;
  depth: number;
  /** Flat index for keyboard navigation (pre-order traversal) */
  flatIndex: number;
  /** Called with the flat index of the currently focused node */
  onFocusChange: (idx: number) => void;
  /** Total number of visible (flattened) nodes */
  totalVisible: number;
}

// ---------------------------------------------------------------------------
// Icon mapping
// ---------------------------------------------------------------------------

const STEP_ICON: Record<string, string> = {
  thinking: '🤔',
  action: '🔧',
  result: '✅',
  error: '❌',
};

const STEP_LABEL_COLOR: Record<string, string> = {
  thinking: 'text-gray-500 dark:text-gray-400',
  action: 'text-blue-600 dark:text-blue-400',
  result: 'text-green-600 dark:text-green-400',
  error: 'text-red-600 dark:text-red-400',
};

const STEP_ACCENT_COLOR: Record<string, string> = {
  thinking: 'border-l-gray-400',
  action: 'border-l-blue-500',
  result: 'border-l-green-500',
  error: 'border-l-red-500',
};

const STEP_BG: Record<string, string> = {
  thinking: 'bg-gray-50 dark:bg-gray-900/50',
  action: 'bg-blue-50 dark:bg-blue-950/30',
  result: 'bg-green-50 dark:bg-green-950/30',
  error: 'bg-red-50 dark:bg-red-950/30',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function truncateContent(content: string, maxLen = 120): string {
  const stripped = content.replace(/\n+/g, ' ').trim();
  if (stripped.length <= maxLen) return stripped;
  return stripped.slice(0, maxLen - 1) + '…';
}

// Flatten tree into an ordered list for keyboard navigation
type FlatEntry = { nodeId: string; depth: number };

function flattenTree(
  nodes: import('@/lib/stepTreeStore').StepNode[],
  depth = 0,
): FlatEntry[] {
  return nodes.flatMap((node) => [
    { nodeId: node.id, depth },
    ...(node.expanded ? flattenTree(node.children, depth + 1) : []),
  ]);
}

// ---------------------------------------------------------------------------
// Single node row
// ---------------------------------------------------------------------------

const StepNodeRow: React.FC<StepNodeProps> = ({
  nodeId,
  depth,
  flatIndex,
  onFocusChange,
  totalVisible,
}) => {
  const node = useStepTreeStore((s) => {
    const find = (ns: import('@/lib/stepTreeStore').StepNode[]): import('@/lib/stepTreeStore').StepNode | undefined =>
      ns.find((n) => n.id === nodeId);
    for (const n of s.stepTree) {
      const found = find([n]);
      if (found) return found;
    }
    return undefined;
  });

  const toggleExpand = useStepTreeStore((s) => s.toggleExpand);
  const ref = useRef<HTMLDivElement>(null);

  // Scroll focused node into view
  useEffect(() => {
    if (ref.current?.dataset.focused === 'true') {
      ref.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, []);

  if (!node) return null;

  const hasChildren = node.children.length > 0;
  const isExpanded = node.expanded;

  const handleToggle = () => {
    if (hasChildren) toggleExpand(node.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (hasChildren && !isExpanded) toggleExpand(node.id);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (hasChildren && isExpanded) toggleExpand(node.id);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      onFocusChange(Math.min(flatIndex + 1, totalVisible - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      onFocusChange(Math.max(flatIndex - 1, 0));
    }
  };

  return (
    <div
      ref={ref}
      role="treeitem"
      aria-expanded={hasChildren ? isExpanded : undefined}
      tabIndex={0}
      data-flat-index={flatIndex}
      onKeyDown={handleKeyDown}
      className={cn(
        'group relative flex items-start gap-1 py-2 pr-3 cursor-pointer rounded-md',
        'transition-colors duration-100',
        'hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        'border-l-2 pl-2',
        STEP_ACCENT_COLOR[node.type] ?? 'border-l-gray-300',
        STEP_BG[node.type] ?? '',
      )}
      style={{ paddingLeft: `${depth * 24 + 8}px` }}
      onClick={handleToggle}
    >
      {/* Tree connector lines (vertical line from parent) */}
      {depth > 0 &&
        Array.from({ length: depth }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'absolute top-0 bottom-0 w-4 border-l border-border/40',
              STEP_BG[node.type] ?? '',
            )}
            style={{ left: `${i * 24 + 8}px` }}
          />
        ))}

      {/* Expand / collapse chevron */}
      <div className="flex-shrink-0 w-4 h-4 mt-0.5 flex items-center justify-center">
        {hasChildren ? (
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.15 }}
          >
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </motion.div>
        ) : (
          <span className="text-sm leading-none">{STEP_ICON[node.type] ?? '•'}</span>
        )}
      </div>

      {/* Node content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Type icon */}
          <span className="text-base leading-none flex-shrink-0">{STEP_ICON[node.type]}</span>

          {/* Label */}
          <span className={cn('text-sm font-medium truncate', STEP_LABEL_COLOR[node.type] ?? '')}>
            {node.label}
          </span>

          {/* Timestamp */}
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {formatTimestamp(node.timestamp)}
          </span>
        </div>

        {/* Content preview when collapsed */}
        {!isExpanded && node.content && (
          <p className="mt-0.5 text-xs text-muted-foreground truncate">
            {truncateContent(node.content)}
          </p>
        )}

        {/* Expanded children */}
        <AnimatePresence initial={false}>
          {isExpanded && hasChildren && (
            <motion.div
              role="group"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="mt-1">
                {node.children.map((child, idx) => (
                  <StepNodeRow
                    key={child.id}
                    nodeId={child.id}
                    depth={depth + 1}
                    flatIndex={flatIndex + 1 + idx}
                    onFocusChange={onFocusChange}
                    totalVisible={totalVisible}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Expanded content (no animation — too large for framer-motion height) */}
        {isExpanded && node.content && (
          <div className="mt-1.5 p-2 bg-muted/40 rounded border border-border/50 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all max-h-64 overflow-y-auto">
            {node.content}
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground py-16">
    <div className="text-5xl opacity-30">🌳</div>
    <p className="text-sm font-medium">No steps recorded yet</p>
    <p className="text-xs text-center max-w-xs">
      Agent execution steps will appear here as the session progresses.
    </p>
  </div>
);

// ---------------------------------------------------------------------------
// AgentStepTree — root component
// ---------------------------------------------------------------------------

export const AgentStepTree: React.FC = () => {
  const stepTree = useStepTreeStore((s) => s.stepTree);
  const expandAll = useStepTreeStore((s) => s.expandAll);
  const collapseAll = useStepTreeStore((s) => s.collapseAll);

  // Build flat list for keyboard navigation
  const flatList = React.useMemo(() => flattenTree(stepTree), [stepTree]);

  const handleFocusChange = useCallback((idx: number) => {
    // Update data-focused on the target element
    setTimeout(() => {
      const el = document.querySelector(`[data-flat-index="${idx}"]`) as HTMLElement | null;
      if (el) {
        document.querySelectorAll('[data-focused="true"]').forEach((e) => {
          (e as HTMLElement).dataset.focused = 'false';
        });
        el.dataset.focused = 'true';
        el.focus();
      }
    }, 0);
  }, []);

  const handleExpandAll = () => {
    expandAll();
  };

  const handleCollapseAll = () => {
    collapseAll();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border flex-shrink-0">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
          Steps
        </span>
        <div className="flex-1" />
        {stepTree.length > 0 && (
          <>
            <button
              onClick={handleExpandAll}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted"
            >
              Expand all
            </button>
            <span className="text-muted-foreground/30">|</span>
            <button
              onClick={handleCollapseAll}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted"
            >
              Collapse all
            </button>
          </>
        )}
        <span className="text-xs text-muted-foreground tabular-nums">
          {stepTree.length > 0 ? `${flatList.length} node${flatList.length !== 1 ? 's' : ''}` : ''}
        </span>
      </div>

      {/* Tree body */}
      <div
        role="tree"
        aria-label="Agent execution steps"
        className="flex-1 overflow-y-auto px-2 py-1"
        tabIndex={0}
      >
        {stepTree.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-0.5">
            {flatList.map((entry, idx) => (
              <StepNodeRow
                key={entry.nodeId}
                nodeId={entry.nodeId}
                depth={entry.depth}
                flatIndex={idx}
                onFocusChange={handleFocusChange}
                totalVisible={flatList.length}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
