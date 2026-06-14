import { describe, expect, it } from "vitest";
import { AcceptHeaderNegotiator } from "./accept-header-negotiator";

describe("AcceptHeaderNegotiator", (): void => {
  const PRODUCES: readonly string[] = ["text/html", "text/markdown"];
  const negotiator = new AcceptHeaderNegotiator();

  describe("negotiate", (): void => {
    it("returns the first produces entry when no Accept header is present", (): void => {
      expect(
        negotiator.negotiate({
          acceptHeader: null,
          produces: PRODUCES,
        }),
      ).toEqual("text/html");
    });

    it("returns the first produces entry when Accept header is empty", (): void => {
      expect(
        negotiator.negotiate({
          acceptHeader: "",
          produces: PRODUCES,
        }),
      ).toEqual("text/html");
    });

    it("returns text/markdown when accept header is exactly text/markdown", (): void => {
      expect(
        negotiator.negotiate({
          acceptHeader: "text/markdown",
          produces: PRODUCES,
        }),
      ).toEqual("text/markdown");
    });

    it("returns text/html when accept header is exactly text/html", (): void => {
      expect(
        negotiator.negotiate({
          acceptHeader: "text/html",
          produces: PRODUCES,
        }),
      ).toEqual("text/html");
    });

    it("picks the higher q-value when both types are listed", (): void => {
      expect(
        negotiator.negotiate({
          acceptHeader: "text/markdown;q=0.8, text/html;q=0.9",
          produces: PRODUCES,
        }),
      ).toEqual("text/html");
    });

    it("picks the first entry on equal q-values (client-order tiebreak)", (): void => {
      expect(
        negotiator.negotiate({
          acceptHeader: "text/markdown;q=0.8, text/html;q=0.8",
          produces: PRODUCES,
        }),
      ).toEqual("text/markdown");
    });

    it("honors q=0 rejection and falls through to the next candidate", (): void => {
      expect(
        negotiator.negotiate({
          acceptHeader: "text/markdown;q=0, text/html",
          produces: PRODUCES,
        }),
      ).toEqual("text/html");
    });

    it("returns null when all candidates have q=0", (): void => {
      expect(
        negotiator.negotiate({
          acceptHeader: "text/html;q=0, text/markdown;q=0",
          produces: PRODUCES,
        }),
      ).toBeNull();
    });

    it("matches text/* wildcard", (): void => {
      expect(
        negotiator.negotiate({
          acceptHeader: "text/*",
          produces: PRODUCES,
        }),
      ).toEqual("text/html");
    });

    it("matches */* wildcard", (): void => {
      expect(
        negotiator.negotiate({
          acceptHeader: "*/*",
          produces: PRODUCES,
        }),
      ).toEqual("text/html");
    });

    it("allows specific match to override wildcard regardless of q (RFC 9110 specificity)", (): void => {
      expect(
        negotiator.negotiate({
          acceptHeader: "text/html;q=0, */*;q=1",
          produces: PRODUCES,
        }),
      ).toEqual("text/markdown");
    });

    it("returns null when accept header lists only unknown types", (): void => {
      expect(
        negotiator.negotiate({
          acceptHeader: "application/pdf, image/png",
          produces: PRODUCES,
        }),
      ).toBeNull();
    });

    it("handles whitespace in accept header", (): void => {
      expect(
        negotiator.negotiate({
          acceptHeader: "  text/markdown  ,   text/html  ",
          produces: PRODUCES,
        }),
      ).toEqual("text/markdown");
    });

    it("handles implicit wildcard via */* matching both candidates", (): void => {
      // No Accept header means the client accepts everything, default to first
      expect(
        negotiator.negotiate({
          acceptHeader: null,
          produces: PRODUCES,
        }),
      ).toEqual("text/html");
    });
  });
});
