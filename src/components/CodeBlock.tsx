import { motion, AnimatePresence } from "framer-motion";
import { Check, Copy } from "lucide-react";
import React, { useState, useCallback, useRef, useMemo } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";

import { useTheme } from "@/hooks";
import { getClaudeSyntaxTheme } from "@/lib/claudeSyntaxTheme";

/**
 * Props interface for the CodeBlock component
 */
interface CodeBlockProps {
  /** The code content to render */
  code: string;
  /** Programming language for syntax highlighting */
  language?: string;
  /** Whether to show line numbers */
  showLineNumbers?: boolean;
  /** Additional CSS class names */
  className?: string;
}

/**
 * Detects language from code content patterns when no explicit language is given.
 */
function detectLanguage(code: string): string {
  const trimmed = code.trim();
  if (!trimmed) return "text";

  // Rust
  if (/^(fn |impl |pub fn |let mut |use std|macro_rules!|struct |enum |trait |mod )/m.test(trimmed)) return "rust";
  // TypeScript / JavaScript
  if (/^(import .+ from |export (default )?(function|const|class|interface|type)|const .+: .+=)/m.test(trimmed)) return "typescript";
  if (/^(import .+ from |export (default )?(function|const|class)|const .+=)/m.test(trimmed)) return "javascript";
  // Python
  if (/^(def |class |import |from .+ import |if __name__|@dataclass|print\()/m.test(trimmed)) return "python";
  // Go
  if (/^(package |func |import \(|func \(.*\) \w+\(|fmt\.Print)/m.test(trimmed)) return "go";
  // Java / Kotlin
  if (/^(public class |private |protected |package |fun |val |var )/m.test(trimmed)) return "java";
  // Shell / Bash
  if (/^(\$ |#!\/bin\/(bash|sh|zsh)|npm |yarn |cargo |git |sudo |cd |ls |mkdir |echo |export |chmod )/m.test(trimmed)) return "bash";
  // SQL
  if (/^(SELECT |INSERT |UPDATE |DELETE |CREATE TABLE|ALTER TABLE|DROP TABLE|WITH )/im.test(trimmed)) return "sql";
  // HTML
  if (/^<!DOCTYPE|^<html|^<head|^<div|^<span|^<section/m.test(trimmed)) return "html";
  // CSS / SCSS
  if (/^(\.|#|@media|@import|body|html\s*\{|:root)/m.test(trimmed)) return "css";
  // JSON
  if (/^\{[\s\S]*"[^"]+"\s*:/m.test(trimmed)) return "json";
  // YAML
  if (/^---\n|\w+:\s*$/m.test(trimmed)) return "yaml";

  return "text";
}

/**
 * Normalizes language identifiers to Prism-compatible names.
 */
function normalizeLanguage(lang: string): string {
  const lower = lang.toLowerCase().replace(/[^a-z0-9+]/g, "");
  const aliases: Record<string, string> = {
    js: "javascript",
    ts: "typescript",
    tsx: "tsx",
    jsx: "jsx",
    py: "python",
    rb: "ruby",
    rs: "rust",
    sh: "bash",
    shell: "bash",
    zsh: "bash",
    yml: "yaml",
    md: "markdown",
    dockerfile: "docker",
    makefile: "makefile",
    txt: "text",
  };
  return aliases[lower] || lower || "text";
}

/**
 * CodeBlock component with copy-to-clipboard toolbar and language badge.
 *
 * Renders syntax-highlighted code with a hover toolbar featuring:
 * - Language badge (top-left)
 * - Copy button with visual feedback (top-right)
 * - Optional line numbers
 * - Keyboard shortcut: Cmd/Ctrl+C when block is focused
 *
 * @param code - The code content to render
 * @param language - Programming language for syntax highlighting
 * @param showLineNumbers - Whether to show line numbers (default: false)
 * @param className - Additional CSS class names
 */
const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language,
  showLineNumbers = false,
  className,
}) => {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLDivElement>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { theme } = useTheme();
  const syntaxTheme = getClaudeSyntaxTheme(theme);

  const resolvedLanguage = useMemo(
    () => normalizeLanguage(language || detectLanguage(code)),
    [language, code]
  );

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);

      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = code;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 1500);
    }
  }, [code]);

  // Keyboard shortcut: Cmd/Ctrl+C copies code when block is focused
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "c") {
        // Only intercept if there's no text selection (otherwise allow normal copy)
        const selection = window.getSelection();
        if (!selection || selection.toString().length === 0) {
          e.preventDefault();
          handleCopy();
        }
      }
    },
    [handleCopy]
  );

  return (
    <div
      className={className}
      style={{ position: "relative" }}
      ref={codeRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Toolbar: language badge + copy button */}
      <div className="code-block-toolbar">
        <span className="code-block-lang-badge">{resolvedLanguage}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="code-block-copy-btn"
          title="Copy code"
          aria-label="Copy code to clipboard"
        >
          <AnimatePresence mode="wait">
            {copied ? (
              <motion.span
                key="copied"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="code-block-copied-label"
              >
                <Check className="h-3.5 w-3.5" />
                Copied
              </motion.span>
            ) : (
              <motion.span
                key="copy"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Copy className="h-3.5 w-3.5" />
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Syntax-highlighted code */}
      <SyntaxHighlighter
        style={syntaxTheme}
        language={resolvedLanguage}
        PreTag="div"
        showLineNumbers={showLineNumbers}
        lineNumberStyle={{
          opacity: 0.4,
          userSelect: "none",
          minWidth: "2.5em",
          paddingRight: "1em",
        }}
        customStyle={{
          margin: 0,
          borderRadius: "0.375rem",
          paddingTop: "0.857em",
          paddingBottom: "0.857em",
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
};

export default React.memo(CodeBlock);
