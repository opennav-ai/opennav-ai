declare module "turndown-plugin-gfm" {
  import type { TurndownPlugin } from "turndown";

  /**
   * Registers table, strikethrough, task-list, and highlighted-code rules.
   */
  export const gfm: TurndownPlugin;

  /**
   * Registers rules for GitHub-style highlighted code wrappers.
   */
  export const highlightedCodeBlock: TurndownPlugin;

  /**
   * Registers rules for `<del>`, `<s>`, and `<strike>` elements.
   */
  export const strikethrough: TurndownPlugin;

  /**
   * Registers rules for Markdown table output when a heading row exists.
   */
  export const tables: TurndownPlugin;

  /**
   * Registers rules for checkbox inputs inside list items.
   */
  export const taskListItems: TurndownPlugin;
}
