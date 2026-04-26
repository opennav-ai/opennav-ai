import type { EngineFilePath } from "../../types/engine-file-path";

/**
 * Input required to read one built site file from an output directory.
 */
export interface EngineFileReadInput {
  readonly outputDirectory: string;
  readonly filePath: EngineFilePath;
}
