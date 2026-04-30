/**
 * Minimal Astro logger methods used by the OpenNav integration.
 */
export interface OpenNavAstroLogger {
  /**
   * Optional build failure output channel supplied by Astro.
   *
   * When available, OpenNav writes typed failure messages here before the hook
   * aborts the Astro build.
   */
  readonly error?: ((message: string) => void) | undefined;

  /**
   * Optional normal build output channel supplied by Astro.
   *
   * When available, OpenNav writes a short success summary here after generated
   * files and page edits are complete.
   */
  readonly info?: ((message: string) => void) | undefined;

  /**
   * Optional warning output channel supplied by Astro.
   *
   * When available, OpenNav writes non-fatal engine warnings here after a
   * successful run.
   */
  readonly warn?: ((message: string) => void) | undefined;
}
