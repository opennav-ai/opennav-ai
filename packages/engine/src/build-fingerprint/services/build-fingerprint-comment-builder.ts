import type { BuildFingerprintCommentInput } from "../types/build-fingerprint-comment-input";
import type { BuildFingerprintCommentResult } from "../types/build-fingerprint-comment-result";

/**
 * Formats OpenNav build fingerprint markers for generated files and managed blocks.
 */
export class BuildFingerprintCommentBuilder {
  /**
   * Builds an exact one-line build fingerprint marker for the requested comment format.
   *
   * @param input - Build fingerprint and comment syntax.
   * @returns Formatted build fingerprint marker content.
   */
  public build(
    input: BuildFingerprintCommentInput,
  ): BuildFingerprintCommentResult {
    if (input.format === "line-comment") {
      return {
        content: `# opennav compatible="true" version="1.0" profile="static-agent-ready" build-fingerprint="${input.buildFingerprint}" manifest="/.well-known/opennav.json"\n`,
      };
    }

    return {
      content: `<!-- opennav compatible="true" version="1.0" profile="static-agent-ready" build-fingerprint="${input.buildFingerprint}" manifest="/.well-known/opennav.json" -->\n`,
    };
  }
}
