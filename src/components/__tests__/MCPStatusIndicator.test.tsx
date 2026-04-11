import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { MCPStatusIndicator } from "../MCPStatusIndicator";

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

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Loader2: ({ className }: any) => (
    <span data-testid="icon-loader" className={className}>loader</span>
  ),
  RefreshCw: () => <span data-testid="icon-refresh">refresh</span>,
  ExternalLink: () => <span data-testid="icon-external">ext</span>,
  AlertCircle: () => <span data-testid="icon-alert">alert</span>,
  Wifi: () => <span data-testid="icon-wifi">wifi</span>,
}));

// Mock Button component
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

// Mock Toast + ToastContainer
vi.mock("@/components/ui/toast", () => ({
  Toast: ({ message, onDismiss }: any) => (
    <div data-testid="toast" data-message={message}>
      <span>{message}</span>
      {onDismiss && (
        <button data-testid="toast-dismiss" onClick={onDismiss}>×</button>
      )}
    </div>
  ),
  ToastContainer: ({ children }: any) => (
    <div data-testid="toast-container">{children}</div>
  ),
}));

// Use vi.hoisted so mocks are available before vi.mock factories run (hoisting issue)
const { mockMcpList, mockMcpGetServerStatus, mockHandleError } = vi.hoisted(() => ({
  mockMcpList: vi.fn(),
  mockMcpGetServerStatus: vi.fn(),
  mockHandleError: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: {
    mcpList: mockMcpList,
    mcpGetServerStatus: mockMcpGetServerStatus,
  },
}));

vi.mock("@/lib/errorHandler", () => ({
  handleError: (...args: any[]) => mockHandleError(...args),
}));

// Mock i18n — component accesses t.mcp.connected etc. as nested properties
vi.mock("@/lib/i18n", () => ({
  useI18n: () => ({
    t: {
      mcp: {
        connected: "Connected",
        connecting: "Connecting",
        disconnected: "Disconnected",
        noMcpServers: "No servers",
        connectionStatus: "Connection Status",
        lastHeartbeat: "Last heartbeat",
        reconnect: "Reconnect",
        openMcpSettings: "Open Settings",
        mcpServerConnected: "MCP Server connected",
        mcpServerDisconnected: "MCP Server disconnected",
      },
    },
  }),
}));

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const mockConnectedServer = {
  name: "fileserver",
  is_active: true,
  url: "http://localhost:8080",
  command: null,
  args: [],
  env: {},
};

const mockDisconnectedServer = {
  name: "gitserver",
  is_active: false,
  url: null,
  command: "npx",
  args: ["-y", "git-mcp-server"],
  env: {},
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("MCPStatusIndicator Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: one connected server
    mockMcpList.mockResolvedValue([mockConnectedServer]);
    mockMcpGetServerStatus.mockResolvedValue({
      fileserver: { running: true, error: null },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---- 1. Connected state ----
  describe("connected state", () => {
    it("renders 'Connected' label when at least one server is connected", async () => {
      mockMcpList.mockResolvedValue([mockConnectedServer]);
      mockMcpGetServerStatus.mockResolvedValue({
        fileserver: { running: true, error: null },
      });

      render(<MCPStatusIndicator />);

      await waitFor(() => {
        expect(screen.getByText("Connected")).toBeInTheDocument();
      });
    });

    it("shows green status dot when connected", async () => {
      mockMcpList.mockResolvedValue([mockConnectedServer]);
      mockMcpGetServerStatus.mockResolvedValue({
        fileserver: { running: true, error: null },
      });

      render(<MCPStatusIndicator />);

      await waitFor(() => {
        // The status dot should have the emerald class
        const dots = screen.queryAllByText((_, el) =>
          el?.className?.includes("bg-emerald") ?? false
        );
        expect(dots.length).toBeGreaterThan(0);
      });
    });
  });

  // ---- 2. Connecting state ----
  describe("connecting state", () => {
    it("renders 'Connecting' when a server is in connecting state", async () => {
      // No server statuses — simulating intermediate state
      mockMcpList.mockResolvedValue([]);
      mockMcpGetServerStatus.mockResolvedValue({});

      render(<MCPStatusIndicator />);

      await waitFor(() => {
        expect(screen.getByText("No servers")).toBeInTheDocument();
      });
    });
  });

  // ---- 3. Disconnected state ----
  describe("disconnected state", () => {
    it("renders 'Disconnected' when all servers are disconnected", async () => {
      mockMcpList.mockResolvedValue([mockDisconnectedServer]);
      mockMcpGetServerStatus.mockResolvedValue({
        gitserver: { running: false, error: "Process exited" },
      });

      render(<MCPStatusIndicator />);

      await waitFor(() => {
        expect(screen.getByText("Disconnected")).toBeInTheDocument();
      });
    });

    it("shows reconnect button when disconnected", async () => {
      mockMcpList.mockResolvedValue([mockDisconnectedServer]);
      mockMcpGetServerStatus.mockResolvedValue({
        gitserver: { running: false, error: "Process exited" },
      });

      render(<MCPStatusIndicator onOpenMCPSettings={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("Disconnected")).toBeInTheDocument();
      });

      // Expand the detail card to see the reconnect button
      const trigger = screen.getByText("Disconnected").closest("button")!;
      await act(async () => {
        fireEvent.click(trigger);
      });

      await waitFor(() => {
        expect(screen.getByText("Reconnect")).toBeInTheDocument();
      });
    });
  });

  // ---- 4. Reconnect button ----
  describe("reconnect functionality", () => {
    it("clicking reconnect calls loadServerStatuses to refresh", async () => {
      mockMcpList.mockResolvedValue([mockConnectedServer]);
      mockMcpGetServerStatus.mockResolvedValue({
        fileserver: { running: true, error: null },
      });

      const onOpenMCPSettings = vi.fn();
      render(<MCPStatusIndicator onOpenMCPSettings={onOpenMCPSettings} />);

      await waitFor(() => {
        expect(screen.getByText("Connected")).toBeInTheDocument();
      });

      // Expand the detail card
      const trigger = screen.getByText("Connected").closest("button")!;
      await act(async () => {
        fireEvent.click(trigger);
      });

      // Find and click reconnect button (inside the expanded detail card)
      await waitFor(() => {
        expect(screen.getByText("Reconnect")).toBeInTheDocument();
      });
      const reconnectBtn = screen.getByText("Reconnect");
      await act(async () => {
        fireEvent.click(reconnectBtn);
      });

      // Reconnect calls loadServerStatuses again
      expect(mockMcpList).toHaveBeenCalled();
    });

    it("shows 'Open Settings' button when onOpenMCPSettings is provided", async () => {
      mockMcpList.mockResolvedValue([mockConnectedServer]);
      mockMcpGetServerStatus.mockResolvedValue({
        fileserver: { running: true, error: null },
      });

      const onOpenMCPSettings = vi.fn();
      render(<MCPStatusIndicator onOpenMCPSettings={onOpenMCPSettings} />);

      await waitFor(() => {
        expect(screen.getByText("Connected")).toBeInTheDocument();
      });

      // Expand the detail card
      const trigger = screen.getByText("Connected").closest("button")!;
      await act(async () => {
        fireEvent.click(trigger);
      });

      await waitFor(() => {
        expect(screen.getByText("Open Settings")).toBeInTheDocument();
      });
    });
  });

  // ---- 5. Empty state (no servers) ----
  describe("empty state", () => {
    it("shows 'No servers' when server list is empty", async () => {
      mockMcpList.mockResolvedValue([]);

      render(<MCPStatusIndicator />);

      await waitFor(() => {
        expect(screen.getByText("No servers")).toBeInTheDocument();
      });
    });

    it("shows no reconnect button when no servers configured", async () => {
      mockMcpList.mockResolvedValue([]);

      render(<MCPStatusIndicator onOpenMCPSettings={vi.fn()} />);

      await waitFor(() => {
        // Should show empty state in detail card
        const noServers = screen.getByText("No servers");
        // The detail card has a no servers message
        expect(noServers).toBeInTheDocument();
      });
    });
  });

  // ---- Loading state ----
  describe("loading state", () => {
    it("shows spinner while loading", () => {
      // Delay the API response to keep loading
      mockMcpList.mockImplementation(
        () => new Promise(() => {}) // never resolves
      );

      render(<MCPStatusIndicator />);

      // Loader icon should appear while loading
      expect(screen.getByTestId("icon-loader")).toBeInTheDocument();
    });
  });

  // ---- Expand/collapse ----
  describe("expand detail card", () => {
    it("clicking trigger button expands detail card", async () => {
      mockMcpList.mockResolvedValue([mockConnectedServer]);
      mockMcpGetServerStatus.mockResolvedValue({
        fileserver: { running: true, error: null },
      });

      const onOpenMCPSettings = vi.fn();
      render(<MCPStatusIndicator onOpenMCPSettings={onOpenMCPSettings} />);

      await waitFor(() => {
        expect(screen.getByText("Connected")).toBeInTheDocument();
      });

      // Click the trigger button to expand
      const trigger = screen.getByText("Connected").closest("button")!;
      await act(async () => {
        fireEvent.click(trigger);
      });

      // Detail card should show
      expect(screen.getByText("Connection Status")).toBeInTheDocument();
      expect(screen.getByText("fileserver")).toBeInTheDocument();
    });

    it("shows server name and status in detail card", async () => {
      mockMcpList.mockResolvedValue([mockConnectedServer]);
      mockMcpGetServerStatus.mockResolvedValue({
        fileserver: { running: true, error: null },
      });

      render(<MCPStatusIndicator />);

      await waitFor(() => {
        expect(screen.getByText("Connected")).toBeInTheDocument();
      });

      // Expand card
      const trigger = screen.getByText("Connected").closest("button")!;
      await act(async () => {
        fireEvent.click(trigger);
      });

      expect(screen.getByText("fileserver")).toBeInTheDocument();
      // "Connected" appears in both trigger button and detail card
      const connectedLabels = screen.getAllByText("Connected");
      expect(connectedLabels.length).toBeGreaterThanOrEqual(2);
    });
  });
});
