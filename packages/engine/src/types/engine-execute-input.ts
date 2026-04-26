import type { EngineFilePath } from "./engine-file-path";

/**
 * Input required to run the OpenNav AI engine against a built static site.
 */
export interface EngineExecuteInput {
  readonly siteName: string;
  readonly baseUrl: string;
  readonly outputDirectory: string;
  readonly filePaths: readonly EngineFilePath[];
}
