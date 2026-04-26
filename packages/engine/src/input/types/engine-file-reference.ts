import type { EngineFilePath } from "../../types/engine-file-path";
import type { EngineFileKind } from "./engine-file-kind";

/**
 * Lightweight reference to a supported built site file.
 */
export interface EngineFileReference {
  /**
   * Output-directory-relative path for a supported file the engine can process.
   *
   * The path points to an existing file under `outputDirectory`; its content is
   * not stored here so large sites do not keep every page body in memory.
   */
  readonly filePath: EngineFilePath;

  /**
   * Detected handling category for the referenced file.
   *
   * Later page readers and guidance builders use this value to decide whether
   * to process the path as HTML, Markdown, `robots.txt`, or `sitemap.xml`.
   */
  readonly kind: EngineFileKind;
}
