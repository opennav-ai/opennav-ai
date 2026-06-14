/**
 * Parsed Accept header entry used during content negotiation.
 */
interface AcceptEntry {
  readonly type: string;
  readonly q: number;
  readonly specificity: number;
}

/**
 * Negotiated content type decision after parsing an Accept header.
 *
 * Returns the best matching type from the produces list, or null
 * when no type is acceptable (triggers a 406 response).
 */
export type AcceptDecision = string | null;

/**
 * Input required to negotiate an Accept header against available
 * content types.
 */
export interface AcceptNegotiateInput {
  /** Raw Accept header value from the incoming request, or null when
   * the client did not send one. */
  readonly acceptHeader: string | null;

  /** Content types the server can produce in priority order. The
   * first entry is the default when no Accept header is present. */
  readonly produces: readonly string[];
}

/**
 * Parses an HTTP Accept request header and returns the best matching
 * content type from a list of types the server can produce.
 *
 * Implements RFC 9110 §12.5.1 semantics:
 * - More specific media ranges override less specific ones
 *   regardless of q-value (so text/html;q=0 combined with
 *   the wildcard `*\/*;q=1` correctly rejects text/html).
 * - Across candidates, highest q wins. Ties are broken by client
 *   order (the entry that appears earlier in the Accept header
 *   takes precedence).
 * - `q=0` on every matching entry means the type is explicitly
 *   rejected and will not be selected.
 * - When no Accept header is present, returns the first entry in
 *   the produces list (the caller's default).
 * - Returns null when no candidate matches or all candidates are
 *   explicitly rejected (q=0).
 */
export class AcceptHeaderNegotiator {
  /**
   * Negotiates the best content type from the Accept header.
   *
   * @param input - The raw Accept header and the list of content
   * types the server can produce.
   * @returns The best matching content type, or null when the client
   * rejects everything.
   */
  public negotiate(input: AcceptNegotiateInput): AcceptDecision {
    if (input.acceptHeader === null) {
      return input.produces[0] ?? null;
    }

    const entries: readonly AcceptEntry[] = this.parseAccept(
      input.acceptHeader,
    );

    if (entries.length === 0) {
      return input.produces[0] ?? null;
    }

    let bestType: string | null = null;
    let bestQ = -1;
    let bestPosition = Infinity;

    for (const candidate of input.produces) {
      let matched: AcceptEntry | null = null;
      let matchedPosition = Infinity;

      for (let idx = 0; idx < entries.length; idx++) {
        const entry: AcceptEntry = entries[idx];

        if (!this.matches(entry, candidate)) {
          continue;
        }

        if (
          matched === null ||
          entry.specificity > matched.specificity ||
          (entry.specificity === matched.specificity && idx < matchedPosition)
        ) {
          matched = entry;
          matchedPosition = idx;
        }
      }

      if (matched === null || matched.q <= 0) {
        continue;
      }

      if (
        matched.q > bestQ ||
        (matched.q === bestQ && matchedPosition < bestPosition)
      ) {
        bestQ = matched.q;
        bestPosition = matchedPosition;
        bestType = candidate;
      }
    }

    return bestType;
  }

  private parseAccept(header: string): AcceptEntry[] {
    return header
      .split(",")
      .map((raw: string): AcceptEntry | null => {
        const parts: readonly string[] = raw
          .trim()
          .split(";")
          .map((s: string): string => s.trim());
        const type: string = (parts[0] ?? "").toLowerCase();

        if (type === "") {
          return null;
        }

        let q = 1;

        for (const param of parts.slice(1)) {
          const [name, value] = param
            .split("=")
            .map((s: string): string => s.trim());

          if (name === "q" && value !== undefined) {
            const parsed: number = Number(value);

            if (!Number.isNaN(parsed)) {
              q = Math.max(0, Math.min(1, parsed));
            }
          }
        }

        const specificity: number =
          type === "*/*" ? 0 : type.endsWith("/*") ? 1 : 2;

        return { type, q, specificity };
      })
      .filter((e: AcceptEntry | null): e is AcceptEntry => e !== null);
  }

  private matches(entry: AcceptEntry, candidate: string): boolean {
    if (entry.type === "*/*") {
      return true;
    }

    if (entry.type.endsWith("/*")) {
      return candidate.startsWith(entry.type.slice(0, -1));
    }

    return entry.type === candidate;
  }
}
