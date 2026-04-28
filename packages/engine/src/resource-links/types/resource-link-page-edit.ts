import type { EngineFilePath } from "../../types/engine-file-path";
import type { ResourceLink } from "./resource-link";

/**
 * Planned HTML page edit for resource links inside a source `<head>` element.
 */
export interface ResourceLinkPageEdit {
  /**
   * Output-directory-relative HTML file path that should receive the edit.
   *
   * The path points to an existing source page file. The resource-link builder
   * does not write this file; a later write planner decides whether and how to
   * apply the edit.
   */
  readonly sourceFilePath: EngineFilePath;

  /**
   * Zero-based source string offset immediately after the opening `<head>` tag.
   *
   * Later write planning can use this as the intended insertion point, then
   * re-check the source file before writing to avoid stale edits.
   */
  readonly headInsertionOffset: number;

  /**
   * Semantic links represented by the planned HTML markup.
   *
   * The first link points at the page's generated Markdown alternate. The
   * second link points at root `llms.txt` as the site index.
   */
  readonly links: readonly ResourceLink[];

  /**
   * Exact HTML `<link>` markup to insert inside the page `<head>`.
   *
   * The string does not include the surrounding `<head>` element. It starts and
   * ends with a newline so insertion after `<head>` preserves readable HTML.
   */
  readonly headLinkMarkup: string;
}
