import type { OpenNavManifestGenerateInput } from "../types/opennav-manifest-generate-input";
import type { OpenNavManifestGenerateResult } from "../types/opennav-manifest-generate-result";

/**
 * Generates the static OpenNav compatibility manifest.
 */
export class OpenNavManifestGenerator {
  /**
   * Generates `/.well-known/opennav.json` for the static agent-ready profile.
   *
   * @param input - Site URL, build fingerprint, and enabled static capabilities.
   * @returns Output path and valid JSON content for the compatibility manifest.
   */
  public generate(
    input: OpenNavManifestGenerateInput,
  ): OpenNavManifestGenerateResult {
    const manifest = {
      opennav: true,
      version: "1.0",
      profile: "static-agent-ready",
      site: input.baseUrl,
      build_fingerprint: input.buildFingerprint,
      spec: "https://opennav.ai/spec/1.0",
      artifacts: {
        llms_txt: "/llms.txt",
        llms_full_txt: "/llms-full.txt",
        well_known_llms_txt: "/.well-known/llms.txt",
        well_known_llms_full_txt: "/.well-known/llms-full.txt",
      },
      capabilities: {
        clean_markdown: true,
        llms_txt: true,
        llms_full_txt: true,
        html_resource_links: input.htmlResourceLinks,
        content_signals: input.contentSignals,
      },
    };

    return {
      outputFilePath: ".well-known/opennav.json",
      content: `${JSON.stringify(manifest, null, 2)}\n`,
    };
  }
}
