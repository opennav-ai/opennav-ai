/**
 * Minimal Astro config fields consumed by the OpenNav integration.
 */
export interface OpenNavAstroConfig {
  /**
   * Public absolute site URL from Astro's top-level `site` setting.
   *
   * OpenNav uses this value only when `OpenNavAstro({ siteUrl })` is omitted.
   */
  readonly site?: string | undefined;
}
