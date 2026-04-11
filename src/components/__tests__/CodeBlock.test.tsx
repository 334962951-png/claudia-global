import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import CodeBlock from "../CodeBlock";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock framer-motion — AnimatePresence renders children, motion.* renders children
vi.mock("framer-motion", () => ({
  motion: {
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock react-syntax-highlighter
vi.mock("react-syntax-highlighter", () => ({
  Prism: vi.fn(({ children }: any) => (
    <pre data-testid="syntax-highlighter">{children}</pre>
  )),
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Copy: () => <span data-testid="icon-copy">copy</span>,
  Check: () => <span data-testid="icon-check">check</span>,
}));

// Mock useTheme hook
vi.mock("@/hooks", () => ({
  useTheme: () => ({
    theme: "dark",
    setTheme: vi.fn(),
    accentColor: "#d97757",
    setAccentColor: vi.fn(),
  }),
}));

// Mock claudeSyntaxTheme
vi.mock("@/lib/claudeSyntaxTheme", () => ({
  getClaudeSyntaxTheme: vi.fn(() => ({})),
}));

// Mock clipboard API
const writeTextMock = vi.fn().mockResolvedValue(undefined);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CodeBlock Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("navigator", {
      clipboard: { writeText: writeTextMock },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---- 1. Renders code content ----
  describe("renders code content", () => {
    it("renders code content inside a pre element", () => {
      render(<CodeBlock code="const x = 1;" />);

      const pre = screen.getByTestId("syntax-highlighter");
      expect(pre).toBeInTheDocument();
      expect(pre).toHaveTextContent("const x = 1;");
    });

    it("renders without a language prop", () => {
      render(<CodeBlock code="hello world" />);
      expect(screen.getByTestId("syntax-highlighter")).toBeInTheDocument();
    });
  });

  // ---- 2. Language badge ----
  describe("language badge", () => {
    it("shows language badge when language prop is provided", () => {
      render(<CodeBlock code="const x = 1;" language="typescript" />);

      expect(screen.getByText("typescript")).toBeInTheDocument();
    });

    it("shows language badge when language is a short alias", () => {
      render(<CodeBlock code="const x = 1;" language="ts" />);

      // normalizeLanguage maps ts -> typescript
      expect(screen.getByText("typescript")).toBeInTheDocument();
    });

    it("auto-detects rust from fn keyword", () => {
      render(<CodeBlock code={'fn main() { println!("Hello"); }'} />);

      expect(screen.getByText("rust")).toBeInTheDocument();
    });

    it("auto-detects typescript from import keyword", () => {
      render(<CodeBlock code='import { useState } from "react";' />);

      expect(screen.getByText("typescript")).toBeInTheDocument();
    });

    it("auto-detects python from def keyword", () => {
      render(<CodeBlock code="def hello():\n    print('hi')" />);

      expect(screen.getByText("python")).toBeInTheDocument();
    });

    it("auto-detects bash from $ prompt", () => {
      render(<CodeBlock code="$ echo hello\ngoodbye" />);

      expect(screen.getByText("bash")).toBeInTheDocument();
    });

    it("shows text as default when language cannot be detected", () => {
      render(<CodeBlock code="hello world" />);

      expect(screen.getByText("text")).toBeInTheDocument();
    });
  });

  // ---- 3. Copy button exists ----
  describe("copy button", () => {
    it("copy button is present in the DOM", () => {
      render(<CodeBlock code="const x = 1;" language="typescript" />);

      const copyBtn = screen.getByRole("button", { name: /copy/i });
      expect(copyBtn).toBeInTheDocument();
    });

    it("copy button is accessible with aria-label", () => {
      render(<CodeBlock code="const x = 1;" language="typescript" />);

      const copyBtn = screen.getByRole("button", { name: /copy code/i });
      expect(copyBtn).toBeInTheDocument();
    });
  });

  // ---- 4. Copy triggers clipboard API ----
  describe("copy to clipboard", () => {
    it("clicking copy button calls navigator.clipboard.writeText", async () => {
      render(<CodeBlock code="const greeting = 'hello';" language="typescript" />);

      const copyBtn = screen.getByRole("button", { name: /copy/i });
      await act(async () => {
        fireEvent.click(copyBtn);
      });

      expect(writeTextMock).toHaveBeenCalledWith("const greeting = 'hello';");
    });

    it("copy button works with Cmd/Ctrl+C keyboard shortcut when block is focused", async () => {
      render(<CodeBlock code="const key = 'value';" language="typescript" />);

      // Focus the block
      const block = screen.getByTestId("syntax-highlighter").closest("div")!;
      await act(async () => {
        fireEvent.keyDown(block, { key: "c", metaKey: true });
      });

      expect(writeTextMock).toHaveBeenCalledWith("const key = 'value';");
    });
  });

  // ---- 5. Copied feedback ----
  describe("copied feedback", () => {
    it("shows 'Copied' feedback after copy", async () => {
      vi.useFakeTimers();

      render(<CodeBlock code="const x = 1;" language="typescript" />);

      const copyBtn = screen.getByRole("button", { name: /copy/i });

      await act(async () => {
        fireEvent.click(copyBtn);
      });

      // After click, should show "Copied" text
      expect(screen.getByText("Copied")).toBeInTheDocument();

      vi.useRealTimers();
    });

    it("hides 'Copied' feedback after timeout", async () => {
      vi.useFakeTimers();

      render(<CodeBlock code="const x = 1;" language="typescript" />);

      const copyBtn = screen.getByRole("button", { name: /copy/i });

      await act(async () => {
        fireEvent.click(copyBtn);
      });

      // Before timer fires
      expect(screen.getByText("Copied")).toBeInTheDocument();

      // Advance past the 1500ms timeout
      await act(async () => {
        vi.advanceTimersByTime(1600);
      });

      // After timeout, "Copied" is gone
      expect(screen.queryByText("Copied")).not.toBeInTheDocument();

      vi.useRealTimers();
    });
  });

  // ---- 6. Language detection ----
  describe("language detection from content", () => {
    it("detects Go from package keyword", () => {
      render(<CodeBlock code="package main\n\nfunc main() {}" />);
      expect(screen.getByText("go")).toBeInTheDocument();
    });

    it("detects SQL from SELECT keyword", () => {
      render(<CodeBlock code="SELECT * FROM users WHERE id = 1" />);
      expect(screen.getByText("sql")).toBeInTheDocument();
    });

    it("detects HTML from DOCTYPE", () => {
      render(<CodeBlock code="<!DOCTYPE html>\n<html><body>Hello</body></html>" />);
      expect(screen.getByText("html")).toBeInTheDocument();
    });

    it("detects CSS from class selector", () => {
      render(<CodeBlock code=".container { display: flex; }" />);
      expect(screen.getByText("css")).toBeInTheDocument();
    });

    it("detects JSON from object pattern", () => {
      const jsonCode = '{"name": "test", "value": 42}';
      render(<CodeBlock code={jsonCode} />);
      expect(screen.getByText("json")).toBeInTheDocument();
    });

    it("detects YAML from --- document start", () => {
      const yamlCode = "---\nname: test\nversion: 1.0";
      render(<CodeBlock code={yamlCode} />);
      expect(screen.getByText("yaml")).toBeInTheDocument();
    });
  });
});
