/**
 * Step Tree Store — Zustand store for agent execution step tree visualization.
 *
 * Maintains a per-session tree of execution steps that can be toggled between
 * the traditional stream view and a structured tree view. Each step node
 * captures one discrete agent action (thinking, tool use, result, error).
 */
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StepNodeType = 'thinking' | 'action' | 'result' | 'error';

export interface StepNode {
  id: string;
  /** What kind of step this node represents */
  type: StepNodeType;
  /** Short human-readable label shown in the tree row */
  label: string;
  /** Full content (may be markdown, tool output, etc.) */
  content: string;
  /** Timestamp when the step was detected */
  timestamp: number;
  /** Optional tool name (only populated for `action` nodes) */
  toolName?: string;
  /** Nesting children – e.g. a tool_use action may have a result child */
  children: StepNode[];
  /** UI-only: whether the node's children / content are expanded */
  expanded: boolean;
}

export type ViewMode = 'stream' | 'tree';

interface StepTreeState {
  /** Flat list of top-level step nodes (ordered chronologically) */
  stepTree: StepNode[];
  /** Current view toggle */
  viewMode: ViewMode;
  /** Running counter used to generate unique IDs */
  _idCounter: number;

  // Actions
  addStep: (node: Omit<StepNode, 'id' | 'children' | 'expanded'>) => string;
  addChildStep: (parentId: string, node: Omit<StepNode, 'id' | 'children' | 'expanded'>) => string;
  updateStep: (id: string, patch: Partial<Pick<StepNode, 'label' | 'content' | 'type'>>) => void;
  toggleExpand: (id: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  setViewMode: (mode: ViewMode) => void;
  clearTree: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _globalCounter = 0;

function nextId(): string {
  _globalCounter += 1;
  return `step-${Date.now()}-${_globalCounter}`;
}

/** Deeply toggle a node in an immutable fashion */
function toggleInTree(nodes: StepNode[], id: string): StepNode[] {
  return nodes.map((n) => {
    if (n.id === id) {
      return { ...n, expanded: !n.expanded };
    }
    if (n.children.length > 0) {
      return { ...n, children: toggleInTree(n.children, id) };
    }
    return n;
  });
}

/** Deeply set `expanded` on every node */
function setExpandedAll(nodes: StepNode[], expanded: boolean): StepNode[] {
  return nodes.map((n) => ({
    ...n,
    expanded,
    children: n.children.length > 0 ? setExpandedAll(n.children, expanded) : [],
  }));
}

/** Deeply update a node's content/label/type */
function updateInTree(
  nodes: StepNode[],
  id: string,
  patch: Partial<Pick<StepNode, 'label' | 'content' | 'type'>>,
): StepNode[] {
  return nodes.map((n) => {
    if (n.id === id) {
      return { ...n, ...patch };
    }
    if (n.children.length > 0) {
      return { ...n, children: updateInTree(n.children, id, patch) };
    }
    return n;
  });
}

/** Find a node by id and push a new child */
function addChildInTree(nodes: StepNode[], parentId: string, child: StepNode): StepNode[] {
  return nodes.map((n) => {
    if (n.id === parentId) {
      return { ...n, children: [...n.children, child], expanded: true };
    }
    if (n.children.length > 0) {
      return { ...n, children: addChildInTree(n.children, parentId, child) };
    }
    return n;
  });
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useStepTreeStore = create<StepTreeState>()(
  subscribeWithSelector((set) => ({
    stepTree: [],
    viewMode: 'stream',
    _idCounter: 0,

    addStep: (node) => {
      const id = nextId();
      const full: StepNode = { ...node, id, children: [], expanded: false };
      set((s) => ({ stepTree: [...s.stepTree, full] }));
      return id;
    },

    addChildStep: (parentId, node) => {
      const id = nextId();
      const full: StepNode = { ...node, id, children: [], expanded: false };
      set((s) => ({ stepTree: addChildInTree(s.stepTree, parentId, full) }));
      return id;
    },

    updateStep: (id, patch) => {
      set((s) => ({ stepTree: updateInTree(s.stepTree, id, patch) }));
    },

    toggleExpand: (id) => {
      set((s) => ({ stepTree: toggleInTree(s.stepTree, id) }));
    },

    expandAll: () => {
      set((s) => ({ stepTree: setExpandedAll(s.stepTree, true) }));
    },

    collapseAll: () => {
      set((s) => ({ stepTree: setExpandedAll(s.stepTree, false) }));
    },

    setViewMode: (mode) => {
      set({ viewMode: mode });
    },

    clearTree: () => {
      set({ stepTree: [], _idCounter: 0 });
    },
  })),
);
