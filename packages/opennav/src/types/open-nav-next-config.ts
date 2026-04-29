/**
 * Minimal Next.js config shape accepted without depending on Next types.
 */
export interface OpenNavNextConfig {
  /**
   * Framework-specific Next.js config values passed through by the shell.
   *
   * The public wrapper keeps these values untouched so projects can continue to
   * use their exact `next.config.*` shape.
   */
  readonly [key: string]: unknown;
}
