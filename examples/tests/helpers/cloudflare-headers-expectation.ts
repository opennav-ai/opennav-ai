/**
 * Provides exact Cloudflare Pages `_headers` expectations for example tests.
 */
export class CloudflareHeadersExpectation {
  private readonly normalizedFingerprint = "sha256:[opennav-build-fingerprint]";

  /**
   * Returns deterministic `_headers` content with the build fingerprint normalized.
   *
   * @param input - Public site URL and expected HTML page route links.
   * @returns Exact normalized Cloudflare Pages `_headers` content.
   */
  public expectedNormalizedContent(
    input: CloudflareHeadersExpectationInput,
  ): string {
    return `# Begin OpenNav AI
# opennav compatible="true" version="1.0" profile="static-agent-ready" build-fingerprint="${this.normalizedFingerprint}" manifest="/.well-known/opennav.json"
/*.md
  Content-Type: text/markdown; charset=utf-8
  X-Content-Type-Options: nosniff

/llms.txt
  Content-Type: text/plain; charset=utf-8
  X-Content-Type-Options: nosniff

/llms-full.txt
  Content-Type: text/plain; charset=utf-8
  X-Content-Type-Options: nosniff

/.well-known/llms.txt
  Content-Type: text/plain; charset=utf-8
  X-Content-Type-Options: nosniff

/.well-known/llms-full.txt
  Content-Type: text/plain; charset=utf-8
  X-Content-Type-Options: nosniff

/.well-known/opennav.json
  Content-Type: application/json; charset=utf-8
  X-Content-Type-Options: nosniff${this.buildPageLinkBlocks(input)}
# End OpenNav AI
`;
  }

  /**
   * Replaces the per-build OpenNav fingerprint with a stable placeholder.
   *
   * @param content - Raw `_headers` file content emitted by an example build.
   * @returns The same content with `sha256` fingerprints normalized.
   */
  public normalize(content: string): string {
    return content.replace(/sha256:[0-9a-f]{12}/gu, this.normalizedFingerprint);
  }

  private buildPageLinkBlocks(
    input: CloudflareHeadersExpectationInput,
  ): string {
    const pageBlocks = input.pages.map(
      (page: CloudflareHeadersExpectationPage): string =>
        `${page.route}
  Link: <${this.buildPublicUrl(input.siteUrl, page.markdownPath)}>; rel="alternate"; type="text/markdown"
  Link: <${this.buildPublicUrl(input.siteUrl, "llms.txt")}>; rel="index"; type="text/plain"`,
    );

    if (pageBlocks.length === 0) {
      return "";
    }

    return `\n\n${pageBlocks.join("\n\n")}`;
  }

  private buildPublicUrl(siteUrl: string, filePath: string): string {
    const trimmedSiteUrl = siteUrl.replace(/\/+$/u, "");
    const normalizedFilePath = filePath.replace(/^\/+/u, "");

    return `${trimmedSiteUrl}/${normalizedFilePath}`;
  }
}

interface CloudflareHeadersExpectationInput {
  readonly siteUrl: string;
  readonly pages: readonly CloudflareHeadersExpectationPage[];
}

interface CloudflareHeadersExpectationPage {
  readonly route: string;
  readonly markdownPath: string;
}
