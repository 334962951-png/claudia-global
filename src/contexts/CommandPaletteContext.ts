/**
 * Command palette context for global Cmd+K toggle
 *
 * Provides open/close state for the command palette modal.
 * Used by the keyboard listener in App.tsx and the CommandPalette component.
 */
import { createContext, useContext } from "react";

interface CommandPaletteContextValue {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
}

export const CommandPaletteContext = createContext<CommandPaletteContextValue>({
  isOpen: false,
  setOpen: () => {},
});

export const useCommandPalette = () => useContext(CommandPaletteContext);
