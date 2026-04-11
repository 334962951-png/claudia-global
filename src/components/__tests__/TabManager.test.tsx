import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TabManager } from "../TabManager";

// Mock framer-motion — Reorder.Item renders its children; Reorder.Group renders its children
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  Reorder: {
    Group: ({ children, ...props }: any) => <ul {...props}>{children}</ul>,
    Item: ({ children, onClick, ...props }: any) => (
      <li onClick={onClick} {...props}>
        {children}
      </li>
    ),
  },
}));

// Mock hooks — useTabState returns tab data + operations
const mockCreateChatTab = vi.fn().mockReturnValue("new-chat-id");
const mockCreateProjectsTab = vi.fn().mockReturnValue("new-projects-id");
const mockCloseTab = vi.fn().mockResolvedValue(true);
const mockSwitchToTab = vi.fn();
const mockCanAddTab = vi.fn().mockReturnValue(true);

vi.mock("@/hooks/useTabState", () => ({
  useTabState: () => ({
    tabs: [
      {
        id: "tab-1",
        title: "Chat Session",
        type: "chat",
        status: "active",
        hasUnsavedChanges: false,
      },
      {
        id: "tab-2",
        title: "Settings",
        type: "settings",
        status: "idle",
        hasUnsavedChanges: false,
      },
    ],
    activeTabId: "tab-1",
    createChatTab: mockCreateChatTab,
    createProjectsTab: mockCreateProjectsTab,
    closeTab: mockCloseTab,
    switchToTab: mockSwitchToTab,
    canAddTab: mockCanAddTab,
  }),
}));

// Mock useTabContext (from @/hooks re-export -> @/contexts/hooks)
vi.mock("@/contexts/hooks", () => ({
  useTabContext: () => ({
    reorderTabs: vi.fn(),
  }),
}));

// Mock analytics
vi.mock("@/hooks/useAnalytics", () => ({
  useTrackEvent: () => ({
    tabCreated: vi.fn(),
    tabClosed: vi.fn(),
    featureUsed: vi.fn(),
  }),
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  X: () => <span data-testid="icon-x">X</span>,
  Plus: () => <span data-testid="icon-plus">+</span>,
  MessageSquare: () => <span data-testid="icon-message">msg</span>,
  Bot: () => <span data-testid="icon-bot">bot</span>,
  AlertCircle: () => <span data-testid="icon-alert">!</span>,
  Loader2: () => <span data-testid="icon-loader">...</span>,
  Folder: () => <span data-testid="icon-folder">fld</span>,
  BarChart: () => <span data-testid="icon-chart">chart</span>,
  Server: () => <span data-testid="icon-server">srv</span>,
  Settings: () => <span data-testid="icon-settings">set</span>,
  FileText: () => <span data-testid="icon-file">file</span>,
}));

describe("TabManager Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders correct number of tabs", () => {
    render(<TabManager />);

    // Should render 2 tab items: "Chat Session" and "Settings"
    expect(screen.getByText("Chat Session")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
    // Plus the new-tab button
    const addButton = screen.getByTitle("Browse projects (Ctrl+T)");
    expect(addButton).toBeInTheDocument();
  });

  it("clicking a tab switches active tab", () => {
    render(<TabManager />);

    // Click the Settings tab
    const settingsTab = screen.getByText("Settings").closest("li")!;
    fireEvent.click(settingsTab);

    expect(mockSwitchToTab).toHaveBeenCalledWith("tab-2");
  });

  it("close button removes a tab", () => {
    render(<TabManager />);

    // Find close buttons — they contain the X icon
    const closeButtons = screen.getAllByRole("button").filter(
      (btn) =>
        btn.getAttribute("title")?.startsWith("Close") ||
        btn.querySelector('[data-testid="icon-x"]')
    );

    expect(closeButtons.length).toBeGreaterThan(0);

    // Click the first close button
    fireEvent.click(closeButtons[0]);

    expect(mockCloseTab).toHaveBeenCalledWith("tab-1");
  });

  it("add new tab button works", () => {
    render(<TabManager />);

    const addButton = screen.getByTitle("Browse projects (Ctrl+T)");
    fireEvent.click(addButton);

    expect(mockCreateProjectsTab).toHaveBeenCalled();
  });

  it("add tab button is disabled when canAddTab returns false", () => {
    mockCanAddTab.mockReturnValue(false);

    render(<TabManager />);

    const addButton = screen.getByTitle(/Maximum tabs reached/);
    expect(addButton).toBeDisabled();
  });
});
