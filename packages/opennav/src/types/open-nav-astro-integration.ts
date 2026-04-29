/**
 * Minimal Astro integration shape returned without depending on Astro types.
 */
export interface OpenNavAstroIntegration {
  /**
   * Stable integration name Astro can display in build output.
   *
   * The shell uses the public subpath so users can connect messages to their
   * `astro.config.*` import.
   */
  readonly name: string;

  /**
   * Astro hook map installed by the integration.
   *
   * Milestone 12 leaves this empty; later milestones populate build hooks for
   * static output detection and execution.
   */
  readonly hooks: Readonly<Record<string, unknown>>;
}
