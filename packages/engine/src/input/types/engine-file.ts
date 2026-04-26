import type { EngineFilePath } from "../../types/engine-file-path";
import type { EngineFileKind } from "./engine-file-kind";

/**
 * A built site file read by the engine from the output directory.
 */
export interface EngineFile {
  readonly filePath: EngineFilePath;
  readonly kind: EngineFileKind;
  readonly content: string;
}
