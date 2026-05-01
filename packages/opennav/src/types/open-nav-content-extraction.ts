/**
 * Optional HTML content extraction settings for generated readable files.
 */
export interface OpenNavContentExtractionOptions {
  /**
   * Removes documented repeated layout elements from parsed HTML page bodies before Markdown conversion.
   *
   * When `true`, generated Markdown page artifacts and `llms-full.txt` still
   * start from the whole HTML `<body>`, then drop the fixed layout selector list
   * documented by OpenNav. When omitted or `false`, the whole `<body>` is
   * converted so unusual page structures do not lose content.
   */
  readonly stripLayout?: boolean | undefined;
}
