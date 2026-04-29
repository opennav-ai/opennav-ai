import type { OpenNavError } from "../../common/types/opennav-error";

/**
 * Inputs for preserving a fatal typed build failure.
 */
export interface BuildResultReportFailureInput {
  /**
   * Typed fatal error that stopped the build before a successful report existed.
   *
   * The reporter returns this as `err(OpenNavError)` instead of placing fatal
   * failures inside a successful build report payload.
   */
  readonly error: OpenNavError;
}
