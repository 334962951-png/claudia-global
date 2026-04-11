/**
 * Backward-compatible re-export from the new SettingsPage two-column layout.
 *
 * The original tab-based Settings UI has been refactored into a two-column
 * layout with a left sidebar navigation and right content area.
 *
 * All settings functionality is preserved. This file re-exports the new
 * SettingsPage component as `Settings` so existing imports continue to work.
 */

export { SettingsPage as Settings } from "./Settings/SettingsPage";
export type { SettingsSection } from "./Settings/SettingsPage";
