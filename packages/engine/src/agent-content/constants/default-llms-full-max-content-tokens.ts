/**
 * Version 1 token cap used when callers do not expose llms-full configuration yet.
 *
 * The value is passed into `LlmsFullTxtGenerator` by higher-level builders so
 * the generator never chooses its own token limit.
 */
export const DEFAULT_LLMS_FULL_MAX_CONTENT_TOKENS = 100_000;
