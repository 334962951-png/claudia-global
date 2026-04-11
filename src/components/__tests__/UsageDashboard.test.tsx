import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { I18nProvider } from "../I18nProvider";
import { UsageDashboard } from "../UsageDashboard";

// ── framer-motion ─────────────────────────────────────────────────────────────
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// ── Mock API with UsageStats data ─────────────────────────────────────────────
// Data is defined inline inside vi.mock because vitest hoists vi.mock to the top
// of the file, before any const declarations are initialized.
vi.mock("@/lib/api", () => ({
  api: {
    getUsageStats: vi.fn().mockResolvedValue({
      total_cost: 12.3456,
      total_tokens: 1500000,
      total_input_tokens: 800000,
      total_output_tokens: 700000,
      total_cache_creation_tokens: 200000,
      total_cache_read_tokens: 300000,
      total_sessions: 42,
      by_model: [
        {
          model: "claude-sonnet",
          session_count: 30,
          total_cost: 8.0,
          total_tokens: 1000000,
          input_tokens: 500000,
          output_tokens: 500000,
          cache_creation_tokens: 100000,
          cache_read_tokens: 100000,
        },
        {
          model: "claude-opus",
          session_count: 12,
          total_cost: 4.3456,
          total_tokens: 500000,
          input_tokens: 300000,
          output_tokens: 200000,
          cache_creation_tokens: 100000,
          cache_read_tokens: 200000,
        },
      ],
      by_date: [
        { date: "2026-04-10", total_cost: 1.5, total_tokens: 100000, models_used: ["claude-sonnet"] },
        { date: "2026-04-11", total_cost: 2.0, total_tokens: 200000, models_used: ["claude-sonnet", "claude-opus"] },
      ],
      by_project: [
        {
          project_path: "/home/user/project-a",
          session_count: 20,
          total_cost: 8.0,
          total_tokens: 900000,
        },
        {
          project_path: "/home/user/project-b",
          session_count: 22,
          total_cost: 4.3456,
          total_tokens: 600000,
        },
      ],
    }),
    getSessionStats: vi.fn().mockResolvedValue([
      {
        project_path: "/home/user/project-a",
        project_name: "Project A",
        total_cost: 8.0,
        total_tokens: 900000,
        session_count: 20,
        last_used: "2026-04-11T12:00:00Z",
      },
    ]),
    getUsageByDateRange: vi.fn().mockResolvedValue({
      total_cost: 12.3456,
      total_tokens: 1500000,
      total_input_tokens: 800000,
      total_output_tokens: 700000,
      total_cache_creation_tokens: 200000,
      total_cache_read_tokens: 300000,
      total_sessions: 42,
      by_model: [],
      by_date: [],
      by_project: [],
    }),
  },
}));

// ── errorHandler ──────────────────────────────────────────────────────────────
vi.mock("@/lib/errorHandler", () => ({
  handleError: vi.fn().mockResolvedValue(undefined),
}));

// ── lucide-react icons ────────────────────────────────────────────────────────
vi.mock("lucide-react", () => ({
  ArrowLeft: () => <span data-testid="icon-arrowleft">←</span>,
  TrendingUp: () => <span data-testid="icon-trending">trend</span>,
  Calendar: () => <span data-testid="icon-calendar">cal</span>,
  Filter: () => <span data-testid="icon-filter">filter</span>,
  Loader2: () => <span data-testid="icon-loader">...</span>,
  DollarSign: () => <span data-testid="icon-dollar">$</span>,
  Activity: () => <span data-testid="icon-activity">act</span>,
  FileText: () => <span data-testid="icon-file">file</span>,
  Briefcase: () => <span data-testid="icon-briefcase">brief</span>,
}));

// ── UI components ─────────────────────────────────────────────────────────────
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>,
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  TabsList: ({ children, ...props }: any) => <div role="tablist" {...props}>{children}</div>,
  TabsTrigger: ({ children, ...props }: any) => <button role="tab" {...props}>{children}</button>,
  TabsContent: ({ children, ...props }: any) => <div role="tabpanel" {...props}>{children}</div>,
}));

// ── render helper ─────────────────────────────────────────────────────────────
const renderWithProvider = (ui: React.ReactElement) => {
  return render(<I18nProvider>{ui}</I18nProvider>);
};

describe("UsageDashboard Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("renders usage data", () => {
    it("renders the dashboard header with back button", () => {
      renderWithProvider(<UsageDashboard onBack={vi.fn()} />);

      const backButton = screen.getByTestId("icon-arrowleft").closest("button");
      expect(backButton).toBeInTheDocument();
    });

    it("displays loading state initially", () => {
      renderWithProvider(<UsageDashboard onBack={vi.fn()} />);

      // Loading spinner should appear while data loads
      expect(screen.getByTestId("icon-loader")).toBeInTheDocument();
    });

    it("renders summary cards after loading", async () => {
      renderWithProvider(<UsageDashboard onBack={vi.fn()} />);

      // Wait for loading to complete and data to render
      await waitFor(() => {
        // Total cost — formatCurrency uses maximumFractionDigits: 4 → "$12.3456"
        expect(screen.getByText("$12.3456")).toBeInTheDocument();
      });

      // Total sessions should be displayed
      expect(screen.getByText("42")).toBeInTheDocument();

      // Total tokens should be formatted (1.5M)
      expect(screen.getByText("1.50M")).toBeInTheDocument();
    });

    it("calls onBack when back button is clicked", () => {
      const onBack = vi.fn();
      renderWithProvider(<UsageDashboard onBack={onBack} />);

      const backButton = screen.getByTestId("icon-arrowleft").closest("button")!;
      fireEvent.click(backButton);

      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });

  describe("displays token counts correctly", () => {
    it("shows token breakdown in overview tab", async () => {
      renderWithProvider(<UsageDashboard onBack={vi.fn()} />);

      await waitFor(() => {
        // Input tokens: 800K
        expect(screen.getAllByText("800.0K").length).toBeGreaterThan(0);
      });

      // Output tokens: 700K
      expect(screen.getAllByText("700.0K").length).toBeGreaterThan(0);

      // Cache write tokens: 200K — appears in overview + model tabs
      expect(screen.getAllByText("200.0K").length).toBeGreaterThan(0);

      // Cache read tokens: 300K — same value in both overview and model tabs
      expect(screen.getAllByText("300.0K").length).toBeGreaterThan(0);
    });

    it("displays average cost per session", async () => {
      renderWithProvider(<UsageDashboard onBack={vi.fn()} />);

      await waitFor(() => {
        // avg cost = 12.3456 / 42 = ~0.2939
        expect(screen.getByText("$0.2939")).toBeInTheDocument();
      });
    });
  });
});
