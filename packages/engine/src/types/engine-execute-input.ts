import type { EngineAccessGuidanceOptions } from "./engine-access-guidance-options";
import type { EngineFilePath } from "./engine-file-path";

/**
 * Input required to run the OpenNav AI engine against a built static site.
 */
export interface EngineExecuteInput {
  /** The human-readable site name used in generated agent-facing files. */
  readonly siteName: string;

  /** The public base URL used to build canonical URLs. */
  readonly baseUrl: string;

  /** The built static site output directory. */
  readonly outputDirectory: string;

  /** Built file paths relative to the output directory. */
  readonly filePaths: readonly EngineFilePath[];

  /**
   * Optional static access guidance preferences.
   *
   * When omitted, the Phase 1 engine does not create or edit `robots.txt` for
   * Content Signals because no site owner policy has been configured.
   */
  readonly accessGuidance?: EngineAccessGuidanceOptions | undefined;
}
