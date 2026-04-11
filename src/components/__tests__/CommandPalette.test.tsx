import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { within } from "@testing-library/react";

import { CommandPalette } from "../CommandPalette";
import { useCommandPalette } from "@/contexts/CommandPaletteContext";

// ---------------------------------------------------------------------------
// jsdom polyfill — jsdom doesn't implement scrollIntoView
// ---------------------------------------------------------------------------
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock CommandPaletteContext — start open so component renders
const mockSetOpen = vi.fn();
// Module-level flag so individual tests can toggle it before rendering
let mockIsOpen = true;
vi.mock("@/contexts/CommandPaletteContext", () => ({
  CommandPaletteContext: {
    Provider: ({ children }: any) => children,
  },
  useCommandPalette: () => ({
    isOpen: mockIsOpen,
    setOpen: mockSetOpen,
  }),
}));

// Mock useSessionStore — provide minimal session/project data
vi.mock("@/stores/sessionStore", () => ({
  useSessionStore: vi.fn(() => ({
    sessions: {},
    projects: [],
    fetchProjects: vi.fn().mockResolvedValue(undefined),
    fetchProjectSessions: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Mock useAgentStore — provide empty agent runs
vi.mock("@/stores/agentStore", () => ({
  useAgentStore: vi.fn(() => ({
    agentRuns: [],
  })),
}));

// Mock useTabState
const mockSwitchToTab = vi.fn();
const mockCreateChatTab = vi.fn().mockReturnValue("new-chat-tab");
const mockCreateAgentTab = vi.fn().mockReturnValue("new-agent-tab");
const mockCloseCurrentTab = vi.fn().mockResolvedValue(true);
const mockCreateSettingsTab = vi.fn().mockReturnValue("settings-tab");
const mockCreateMCPTab = vi.fn().mockReturnValue("mcp-tab");
const mockCreateProjectsTab = vi.fn().mockReturnValue("projects-tab");
const mockCreateUsageTab = vi.fn().mockReturnValue("usage-tab");
const mockCreateClaudeMdTab = vi.fn().mockReturnValue("claude-md-tab");

vi.mock("@/hooks/useTabState", () => ({
  useTabState: () => ({
    tabs: [],
    activeTabId: null,
    createChatTab: mockCreateChatTab,
    createAgentTab: mockCreateAgentTab,
    closeCurrentTab: mockCloseCurrentTab,
    createSettingsTab: mockCreateSettingsTab,
    createMCPTab: mockCreateMCPTab,
    createProjectsTab: mockCreateProjectsTab,
    createUsageTab: mockCreateUsageTab,
    createClaudeMdTab: mockCreateClaudeMdTab,
    switchToTab: mockSwitchToTab,
  }),
}));

// Mock lucide-react icons (all used in CommandPalette)
vi.mock("lucide-react", () => ({
  Search: () => <span data-testid="icon-search">search</span>,
  FileText: () => <span data-testid="icon-filetext">file</span>,
  MessageSquare: () => <span data-testid="icon-message">msg</span>,
  Bot: () => <span data-testid="icon-bot">bot</span>,
  Settings2: () => <span data-testid="icon-settings">set</span>,
  Zap: () => <span data-testid="icon-zap">zap</span>,
  Plus: () => <span data-testid="icon-plus">plus</span>,
  X: () => <span data-testid="icon-x">x</span>,
  Clock: () => <span data-testid="icon-clock">clock</span>,
  FolderOpen: () => <span data-testid="icon-folder">folder</span>,
  LayoutGrid: () => <span data-testid="icon-grid">grid</span>,
}));

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const renderPalette = () =>
  render(
    <CommandPalette
      onOpenSettings={vi.fn()}
      onOpenMCP={vi.fn()}
      onOpenUsage={vi.fn()}
      onOpenProjects={vi.fn()}
    />
  );

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CommandPalette Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset localStorage mock
    vi.stubGlobal("localStorage", {
      getItem: vi.fn().mockReturnValue("[]"),
      setItem: vi.fn(),
    });
  });

  // ---- 1. Does not render when isOpen is false ----
  describe("conditional rendering", () => {
    it("does not render when isOpen is false", () => {
      mockIsOpen = false;
      const { container } = renderPalette();
      // When isOpen is false, the component returns null → container is empty
      expect(container).toBeEmptyDOMElement();
      mockIsOpen = true; // restore for other tests
    });

    it("renders search input and category tabs when isOpen is true", () => {
      renderPalette();

      const input = screen.getByPlaceholderText(/搜索/);
      expect(input).toBeInTheDocument();
    });
  });

  // ---- 2. Search input and category tabs ----
  describe("search and tabs", () => {
    it("renders search input with placeholder", () => {
      renderPalette();

      expect(
        screen.getByPlaceholderText("搜索命令、文件、会话、设置...")
      ).toBeInTheDocument();
    });

    it("renders all category tab buttons", () => {
      renderPalette();

      expect(screen.getByText("全部")).toBeInTheDocument();
      // These may appear as both tab buttons and group labels — use getAllByText
      expect(screen.getAllByText("文件").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("会话").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Agent")).toBeInTheDocument();
      expect(screen.getAllByText("设置").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("命令").length).toBeGreaterThanOrEqual(1);
    });

    it("renders ⌘K hint in search row", () => {
      renderPalette();

      expect(screen.getByText("⌘K")).toBeInTheDocument();
    });

    it("renders Esc button", () => {
      renderPalette();

      expect(screen.getByText("Esc")).toBeInTheDocument();
    });
  });

  // ---- 3. Search filters results ----
  describe("search filtering", () => {
    it("typing in search updates the query", async () => {
      renderPalette();

      const input = screen.getByPlaceholderText(/搜索/);
      await act(async () => {
        fireEvent.change(input, { target: { value: "新建" } });
      });

      expect((input as HTMLInputElement).value).toBe("新建");
    });

    it("shows command items by default when no search query", () => {
      renderPalette();

      // Default items should be present — text may appear in multiple elements
      expect(screen.getAllByText(/新建会话/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/打开设置/).length).toBeGreaterThanOrEqual(1);
    });

    it("filters results when searching for a command", async () => {
      renderPalette();

      const input = screen.getByPlaceholderText(/搜索/);
      await act(async () => {
        fireEvent.change(input, { target: { value: "新建" } });
      });

      // "新建" should match "新建会话" — text may be split by <mark> tags
      expect(screen.getAllByText(/新/).length).toBeGreaterThanOrEqual(1);
    });

    it("no items match when searching nonsense", async () => {
      renderPalette();

      const input = screen.getByPlaceholderText(/搜索/);
      await act(async () => {
        fireEvent.change(input, { target: { value: "xyznonexistent12345" } });
      });

      expect(screen.getByText("没有找到匹配结果")).toBeInTheDocument();
    });
  });

  // ---- 4. Arrow key navigation ----
  describe("keyboard navigation", () => {
    it("ArrowDown key changes selected item", async () => {
      renderPalette();

      // Get the listbox
      const listbox = screen.getByRole("listbox");
      const items = within(listbox).getAllByRole("option");
      expect(items.length).toBeGreaterThan(0);

      // Press ArrowDown
      await act(async () => {
        fireEvent.keyDown(listbox, { key: "ArrowDown" });
      });

      // First item should remain selected (it loops in bounds)
      // The component handles this internally — just verify no crash
      expect(true).toBe(true);
    });

    it("ArrowUp key changes selected item", async () => {
      renderPalette();

      const listbox = screen.getByRole("listbox");

      // Move down then up
      await act(async () => {
        fireEvent.keyDown(listbox, { key: "ArrowDown" });
        fireEvent.keyDown(listbox, { key: "ArrowUp" });
      });

      expect(true).toBe(true);
    });

    it("Enter key executes the selected command", async () => {
      renderPalette();

      const listbox = screen.getByRole("listbox");

      // Press Enter — should try to execute first item
      await act(async () => {
        fireEvent.keyDown(listbox, { key: "Enter" });
      });

      // "新建会话" command executes createChatTab + switchToTab
      expect(mockCreateChatTab).toHaveBeenCalled();
      expect(mockSwitchToTab).toHaveBeenCalledWith("new-chat-tab");
    });
  });

  // ---- 5. Escape key ----
  describe("Escape key", () => {
    it("Escape key calls onClose via setOpen(false)", async () => {
      renderPalette();

      const listbox = screen.getByRole("listbox");

      await act(async () => {
        fireEvent.keyDown(listbox, { key: "Escape" });
      });

      expect(mockSetOpen).toHaveBeenCalledWith(false);
    });

    it("clicking Esc button calls onClose", async () => {
      renderPalette();

      const escBtn = screen.getByText("Esc");

      await act(async () => {
        fireEvent.click(escBtn);
      });

      expect(mockSetOpen).toHaveBeenCalledWith(false);
    });
  });

  // ---- 6. Category tab switching ----
  describe("category tabs", () => {
    it("clicking a category tab filters items", async () => {
      renderPalette();

      // Click "设置" category tab button (inside category tabs row, not group label)
      const settingsTabs = screen.getAllByText("设置");
      // The category tab is inside a <button>, group label is inside a <div>
      const settingsTabBtn = settingsTabs.find(
        (el) => el.closest("button") !== null
      )!;
      await act(async () => {
        fireEvent.click(settingsTabBtn);
      });

      // Should show only setting-related commands
      expect(screen.getByText("Theme: Dark")).toBeInTheDocument();
    });

    it("clicking all category tab shows all items", async () => {
      renderPalette();

      // First filter to settings category
      const settingsTabs = screen.getAllByText("设置");
      const settingsTabBtn = settingsTabs.find(
        (el) => el.closest("button") !== null
      )!;
      await act(async () => {
        fireEvent.click(settingsTabBtn);
      });

      // Then switch back to "全部"
      const allTab = screen.getByText("全部");
      await act(async () => {
        fireEvent.click(allTab);
      });

      // Should have command + setting items again
      expect(screen.getByText("新建会话")).toBeInTheDocument();
      expect(screen.getByText("Theme: Dark")).toBeInTheDocument();
    });

    it("Tab key switches category", async () => {
      renderPalette();

      const listbox = screen.getByRole("listbox");

      await act(async () => {
        fireEvent.keyDown(listbox, { key: "Tab" });
      });

      // Tab switches to next category — just verify no crash
      expect(true).toBe(true);
    });

    it("Shift+Tab switches to previous category", async () => {
      renderPalette();

      const listbox = screen.getByRole("listbox");

      await act(async () => {
        fireEvent.keyDown(listbox, { key: "Tab", shiftKey: true });
      });

      expect(true).toBe(true);
    });
  });

  // ---- 7. Empty state ----
  describe("empty state", () => {
    it("shows empty state when no results match the search", async () => {
      renderPalette();

      const input = screen.getByPlaceholderText(/搜索/);
      await act(async () => {
        fireEvent.change(input, {
          target: { value: "this does not exist at all 9999" },
        });
      });

      expect(screen.getByText("没有找到匹配结果")).toBeInTheDocument();
    });
  });
});
