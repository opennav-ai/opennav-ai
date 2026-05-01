import type { EngineAccessGuidanceOptions } from "./engine-access-guidance-options";
import type { EngineFilePath } from "./engine-file-path";

/**
 * Static hosting platform recognized by the engine.
 */
export type EngineStaticPlatform = "cloudflare-pages";

/**
 * Optional static hosting header artifact settings.
 */
export interface EngineStaticHeadersOptions {
  /**
   * Whether OpenNav should plan a deploy-time response-header artifact.
   *
   * When `true`, `platform` must identify the static host whose file format
   * OpenNav should write. When `false`, OpenNav should not create or edit a
   * static hosting header file.
   */
  readonly enabled: boolean;
}

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
   * Optional static hosting platform for platform-specific output behavior.
   *
   * `"cloudflare-pages"` lets enabled static headers create or update the
   * Cloudflare Pages `_headers` file inside `outputDirectory`.
   */
  readonly platform?: EngineStaticPlatform | undefined;

  /**
   * Optional static access guidance preferences.
   *
   * When omitted, the Phase 1 engine does not create or edit `robots.txt` for
   * Content Signals because no site owner policy has been configured.
   */
  readonly accessGuidance?: EngineAccessGuidanceOptions | undefined;

  /**
   * Optional static hosting response-header artifact settings.
   *
   * When omitted or disabled, the Phase 1 engine does not create or edit
   * platform header files such as Cloudflare Pages `_headers`.
   */
  readonly staticHeaders?: EngineStaticHeadersOptions | undefined;
}
