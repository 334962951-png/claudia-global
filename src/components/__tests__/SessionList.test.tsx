import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SessionList } from "../SessionList";
import { I18nProvider } from "../I18nProvider";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock the API module (SessionList calls api.deleteSession etc.)
vi.mock("@/lib/api", () => ({
  api: {
    deleteSession: vi.fn().mockResolvedValue(undefined),
    listRunningClaudeSessions: vi.fn().mockResolvedValue([]),
    cancelClaudeExecution: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock lucide-react icons (include all icons used by SessionList AND by ui/dialog.tsx)
// Dialog uses: X, etc.
vi.mock("lucide-react", () => ({
  FileText: () => <span data-testid="icon-filetext">file</span>,
  ArrowLeft: () => <span data-testid="icon-arrowleft">←</span>,
  Calendar: () => <span data-testid="icon-calendar">cal</span>,
  Clock: () => <span data-testid="icon-clock">clock</span>,
  MessageSquare: () => <span data-testid="icon-message">msg</span>,
  Trash2: () => <span data-testid="icon-trash">trash</span>,
  // Needed by ui/dialog.tsx
  X: () => <span data-testid="icon-x">x</span>,
}));

// Mock ClaudeMemoriesDropdown (imported directly in SessionList)
vi.mock("@/components/ClaudeMemoriesDropdown", () => ({
  ClaudeMemoriesDropdown: () => <div data-testid="claude-memories">Memories</div>,
}));

// Provide minimal i18n translations
const mockTranslations = {
  language: "en" as const,
  setLanguage: vi.fn(),
  isRTL: false,
  t: {
    common: {
      cancel: "Cancel",
      delete: "Delete",
      save: "Save",
    },
    sessions: {
      deleteSessionConfirm: "Delete this session?",
      deleteSessionDesc: (sessionId: string) => `Are you sure you want to delete session ${sessionId}?`,
      deletingSession: "Deleting...",
      sessionName: "Session",
    },
    time: {
      yesterday: "Yesterday",
    },
  },
};

const mockSession = {
  id: "session-abc123",
  project_id: "proj-1",
  project_path: "/test/project",
  created_at: 1710000000,
  first_message: "Hello, world!",
  message_timestamp: "2026-04-10T10:00:00Z",
  todo_data: undefined,
};

const mockSessions = [
  { ...mockSession, id: "session-1", first_message: "First session message" },
  { ...mockSession, id: "session-2", first_message: "Second session message" },
  { ...mockSession, id: "session-3", first_message: "Third session message" },
];

const renderWithProvider = (ui: React.ReactElement) => {
  return render(<I18nProvider>{ui}</I18nProvider>);
};

describe("SessionList Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("renders session list", () => {
    it("renders sessions passed via props", () => {
      renderWithProvider(
        <SessionList
          sessions={mockSessions}
          projectPath="/test/project"
          projectId="proj-1"
          onBack={vi.fn()}
          onSessionClick={vi.fn()}
        />
      );

      // Session IDs should appear in the document
      expect(screen.getByText("session-1")).toBeInTheDocument();
      expect(screen.getByText("session-2")).toBeInTheDocument();
      expect(screen.getByText("session-3")).toBeInTheDocument();
    });

    it("shows session count in header", () => {
      renderWithProvider(
        <SessionList
          sessions={mockSessions}
          projectPath="/test/project"
          projectId="proj-1"
          onBack={vi.fn()}
        />
      );

      // Shows "3 sessions" in the subtitle
      expect(screen.getByText("3 sessions")).toBeInTheDocument();
    });

    it("displays first message preview when available", () => {
      renderWithProvider(
        <SessionList
          sessions={[mockSessions[0]]}
          projectPath="/test/project"
          projectId="proj-1"
          onBack={vi.fn()}
        />
      );

      expect(screen.getByText("First session message")).toBeInTheDocument();
    });
  });

  describe("clicking a session selects it", () => {
    it("calls onSessionClick when a session card is clicked", () => {
      const onSessionClick = vi.fn();

      renderWithProvider(
        <SessionList
          sessions={[mockSessions[0]]}
          projectPath="/test/project"
          projectId="proj-1"
          onBack={vi.fn()}
          onSessionClick={onSessionClick}
        />
      );

      // Click the card (it has a cursor-pointer class)
      const card = screen.getByText("session-1").closest(".cursor-pointer")!;
      fireEvent.click(card);

      expect(onSessionClick).toHaveBeenCalledWith(mockSessions[0]);
    });

    it("does not call onSessionClick when delete button is clicked", () => {
      const onSessionClick = vi.fn();

      renderWithProvider(
        <SessionList
          sessions={[mockSessions[0]]}
          projectPath="/test/project"
          projectId="proj-1"
          onBack={vi.fn()}
          onSessionClick={onSessionClick}
        />
      );

      // Find and click the delete button
      const deleteBtn = screen.getByTestId("icon-trash").closest("button")!;
      fireEvent.click(deleteBtn);

      // Session click should NOT have been triggered
      expect(onSessionClick).not.toHaveBeenCalled();
    });
  });

  describe("empty state display", () => {
    it("shows 0 sessions when list is empty", () => {
      renderWithProvider(
        <SessionList
          sessions={[]}
          projectPath="/test/project"
          projectId="proj-1"
          onBack={vi.fn()}
        />
      );

      // Header shows "0 sessions"
      expect(screen.getByText("0 sessions")).toBeInTheDocument();
    });

    it("renders back button regardless of session count", () => {
      renderWithProvider(
        <SessionList
          sessions={[]}
          projectPath="/test/project"
          projectId="proj-1"
          onBack={vi.fn()}
        />
      );

      const backButton = screen.getByTestId("icon-arrowleft").closest("button");
      expect(backButton).toBeInTheDocument();
    });
  });

  describe("back navigation", () => {
    it("calls onBack when back button is clicked", () => {
      const onBack = vi.fn();

      renderWithProvider(
        <SessionList
          sessions={[]}
          projectPath="/test/project"
          projectId="proj-1"
          onBack={onBack}
        />
      );

      const backButton = screen.getByTestId("icon-arrowleft").closest("button")!;
      fireEvent.click(backButton);

      expect(onBack).toHaveBeenCalled();
    });
  });
});
