import type { EngineFilePath } from "../../types/engine-file-path";

/**
 * Input required to read a list of output-directory-relative built site files.
 */
export interface EngineFileListReadInput {
  /** The built static site output directory. */
  readonly outputDirectory: string;

  /** Built file paths relative to the output directory. */
  readonly filePaths: readonly EngineFilePath[];
}
