/**
 * Provides exact Cloudflare Pages `_headers` expectations for example tests.
 */
export class CloudflareHeadersExpectation {
  private readonly normalizedFingerprint = "sha256:[opennav-build-fingerprint]";

  /**
   * Returns deterministic `_headers` content with the build fingerprint normalized.
   *
   * @returns Exact normalized Cloudflare Pages `_headers` content.
   */
  public expectedNormalizedContent(): string {
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
  X-Content-Type-Options: nosniff
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
}
