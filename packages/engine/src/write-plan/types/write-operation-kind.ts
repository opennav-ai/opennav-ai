/**
 * Concrete action a later writer can apply to the static output folder.
 */
export type WriteOperationKind =
  | "create-file"
  | "overwrite-file"
  | "edit-html-page";
