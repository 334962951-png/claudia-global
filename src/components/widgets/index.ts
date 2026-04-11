/**
 * Widget components index
 *
 * Central export point for all widget components used in the application.
 * Widgets are specialized components for displaying different types of
 * Claude Code tool outputs and interactions.
 *
 * @example
 * ```tsx
 * import { TodoWidget, LSWidget, BashWidget } from '@/components/widgets';
 *
 * // Use widgets in your components
 * <TodoWidget data={todoData} />
 * <LSWidget data={lsData} />
 * <BashWidget data={bashData} />
 * ```
 */
export { TodoWidget } from "./TodoWidget";
export { LSWidget } from "./LSWidget";
export { BashWidget } from "./BashWidget";
