import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FloatingPromptInput } from "../FloatingPromptInput";
import { I18nProvider } from "../I18nProvider";

// ── framer-motion ─────────────────────────────────────────────────────────────
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// ── Tauri APIs ────────────────────────────────────────────────────────────────
vi.mock("@tauri-apps/api/webviewWindow", () => ({
  getCurrentWebviewWindow: () => ({
    onDragDropEvent: () => ({
      then: vi.fn(),
    }),
  }),
}));

// ── lib/logger & errorHandler ────────────────────────────────────────────────
vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/lib/errorHandler", () => ({
  handleError: vi.fn().mockResolvedValue(undefined),
}));

// ── lucide-react icons ────────────────────────────────────────────────────────
vi.mock("lucide-react", () => ({
  Send: () => <span data-testid="icon-send">send</span>,
  Maximize2: () => <span data-testid="icon-max">max</span>,
  Minimize2: () => <span data-testid="icon-min">min</span>,
  ChevronUp: () => <span data-testid="icon-chevron">up</span>,
  Sparkles: () => <span data-testid="icon-sparkles">sparkle</span>,
  Zap: () => <span data-testid="icon-zap">zap</span>,
  Square: () => <span data-testid="icon-square">sq</span>,
  Brain: () => <span data-testid="icon-brain">brain</span>,
}));

// ── UI components (imported directly, not via mock file) ──────────────────────
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: any) => <div data-testid="popover">{children}</div>,
  PopoverTrigger: ({ children }: any) => children,
  PopoverContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/components/ui/resizable-textarea", () => ({
  ResizableTextarea: ({ id, onChange, onKeyDown, value, ...props }: any) => (
    <textarea
      id={id}
      onChange={onChange}
      onKeyDown={onKeyDown}
      value={value}
      data-testid="prompt-textarea"
      {...props}
    />
  ),
}));

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: any) => children,
  TooltipProvider: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children }: any) => children,
  TooltipContent: ({ children }: any) => <>{children}</>,
}));

// ── Sub-components rendered by FloatingPromptInput ─────────────────────────────
vi.mock("@/components/FilePicker", () => ({
  FilePicker: () => <div data-testid="file-picker">FilePicker</div>,
}));

vi.mock("@/components/SlashCommandPicker", () => ({
  SlashCommandPicker: () => <div data-testid="slash-picker">SlashCommandPicker</div>,
}));

vi.mock("@/components/ImagePreview", () => ({
  ImagePreview: () => <div data-testid="image-preview">ImagePreview</div>,
}));

// ── render helper ────────────────────────────────────────────────────────────
const renderWithProvider = (ui: React.ReactElement) => {
  return render(<I18nProvider>{ui}</I18nProvider>);
};

describe("FloatingPromptInput Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("renders input field", () => {
    it("renders the textarea element", () => {
      renderWithProvider(
        <FloatingPromptInput onSend={vi.fn()} />
      );

      expect(screen.getByTestId("prompt-textarea")).toBeInTheDocument();
    });

    it("renders the send button", () => {
      renderWithProvider(
        <FloatingPromptInput onSend={vi.fn()} />
      );

      // Send button has a send icon inside
      const sendButton = screen.getByTestId("icon-send").closest("button");
      expect(sendButton).toBeInTheDocument();
    });

    it("is enabled by default", () => {
      renderWithProvider(
        <FloatingPromptInput onSend={vi.fn()} />
      );

      const textarea = screen.getByTestId("prompt-textarea");
      expect(textarea).not.toBeDisabled();
    });

    it("renders in disabled state when disabled prop is true", () => {
      renderWithProvider(
        <FloatingPromptInput onSend={vi.fn()} disabled={true} />
      );

      const textarea = screen.getByTestId("prompt-textarea");
      expect(textarea).toBeDisabled();
    });
  });

  describe("typing in input updates value", () => {
    it("updates the textarea value when user types", () => {
      renderWithProvider(
        <FloatingPromptInput onSend={vi.fn()} />
      );

      const textarea = screen.getByTestId("prompt-textarea");
      fireEvent.change(textarea, { target: { value: "Hello world" } });

      expect(textarea).toHaveValue("Hello world");
    });

    it("appends text on multiple keystrokes", () => {
      renderWithProvider(
        <FloatingPromptInput onSend={vi.fn()} />
      );

      const textarea = screen.getByTestId("prompt-textarea");
      fireEvent.change(textarea, { target: { value: "foo" } });
      fireEvent.change(textarea, { target: { value: "foo bar" } });

      expect(textarea).toHaveValue("foo bar");
    });
  });

  describe("submit triggers callback", () => {
    it("calls onSend with prompt text and model when send button is clicked", () => {
      const onSend = vi.fn();

      renderWithProvider(
        <FloatingPromptInput onSend={onSend} />
      );

      const textarea = screen.getByTestId("prompt-textarea");
      fireEvent.change(textarea, { target: { value: "Hello Claude" } });

      const sendButton = screen.getByTestId("icon-send").closest("button")!;
      fireEvent.click(sendButton);

      expect(onSend).toHaveBeenCalledTimes(1);
      // onSend is called with (prompt: string, model: ClaudeModel)
      expect(onSend).toHaveBeenCalledWith(
        "Hello Claude",
        expect.any(String)
      );
    });

    it("clears the input after send", () => {
      const onSend = vi.fn();

      renderWithProvider(
        <FloatingPromptInput onSend={onSend} />
      );

      const textarea = screen.getByTestId("prompt-textarea");
      fireEvent.change(textarea, { target: { value: "Test prompt" } });

      const sendButton = screen.getByTestId("icon-send").closest("button")!;
      fireEvent.click(sendButton);

      expect(textarea).toHaveValue("");
    });

    it("does not call onSend when textarea is empty", () => {
      const onSend = vi.fn();

      renderWithProvider(
        <FloatingPromptInput onSend={onSend} />
      );

      const sendButton = screen.getByTestId("icon-send").closest("button")!;
      fireEvent.click(sendButton);

      expect(onSend).not.toHaveBeenCalled();
    });

    it("does not call onSend when input is disabled", () => {
      const onSend = vi.fn();

      renderWithProvider(
        <FloatingPromptInput onSend={onSend} disabled={true} />
      );

      const sendButton = screen.getByTestId("icon-send").closest("button")!;
      fireEvent.click(sendButton);

      expect(onSend).not.toHaveBeenCalled();
    });

    it("calls onSend with correct model when defaultModel prop is provided", () => {
      const onSend = vi.fn();

      renderWithProvider(
        <FloatingPromptInput onSend={onSend} defaultModel="opus" />
      );

      const textarea = screen.getByTestId("prompt-textarea");
      fireEvent.change(textarea, { target: { value: "Use opus model" } });

      const sendButton = screen.getByTestId("icon-send").closest("button")!;
      fireEvent.click(sendButton);

      expect(onSend).toHaveBeenCalledWith("Use opus model", "opus");
    });
  });
});
