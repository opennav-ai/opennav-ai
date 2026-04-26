import type { EngineFilePath } from "../../types/engine-file-path";

/**
 * Input required to read one output-directory-relative built site file.
 */
export interface EngineFileReadInput {
  /** The built static site output directory. */
  readonly outputDirectory: string;

  /** The built file path relative to the output directory. */
  readonly filePath: EngineFilePath;
}
