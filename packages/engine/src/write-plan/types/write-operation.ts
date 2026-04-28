import type { WriteFileOperation } from "./write-file-operation";
import type { WriteHtmlPageEditOperation } from "./write-html-page-edit-operation";

/**
 * One approved file change in a dry-run write plan.
 */
export type WriteOperation = WriteFileOperation | WriteHtmlPageEditOperation;
