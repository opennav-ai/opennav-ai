/**
 * Build settings for a static-site OpenNav run.
 */
export interface OpenNavStaticSiteBuildOptions {
  /**
   * Preview generated file changes without writing them to the output folder.
   *
   * When `true`, the static runner should report created and modified paths as
   * planned changes only. When omitted, OpenNav should write planned changes.
   */
  readonly dryRun?: boolean | undefined;
}
