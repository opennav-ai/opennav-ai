import { describe, expect, it } from "vitest";
import type { ContentSignalsGuidanceBuildResult } from "../types/content-signals-guidance-build-result";
import { ContentSignalsGuidanceBuilder } from "./content-signals-guidance-builder";

describe("ContentSignalsGuidanceBuilder", (): void => {
  it("serializes exact configured Content Signals in deterministic order", (): void => {
    const builder = new ContentSignalsGuidanceBuilder();
    const result: ContentSignalsGuidanceBuildResult = builder.build({
      contentSignals: {
        aiTrain: "disallow",
        search: "allow",
        aiInput: "allow",
      },
    });

    expect(result).toEqual({
      contentSignalLine:
        "Content-signal: search=yes, ai-input=yes, ai-train=no",
    });
  });

  it("serializes exact partial Content Signals without unconfigured uses", (): void => {
    const builder = new ContentSignalsGuidanceBuilder();
    const result: ContentSignalsGuidanceBuildResult = builder.build({
      contentSignals: {
        search: "allow",
        aiTrain: "disallow",
      },
    });

    expect(result).toEqual({
      contentSignalLine: "Content-signal: search=yes, ai-train=no",
    });
  });

  it("returns no directive when Content Signals are not configured", (): void => {
    const builder = new ContentSignalsGuidanceBuilder();
    const result: ContentSignalsGuidanceBuildResult = builder.build({});

    expect(result).toEqual({
      contentSignalLine: undefined,
    });
  });

  it("returns no directive when the configured policy is empty", (): void => {
    const builder = new ContentSignalsGuidanceBuilder();
    const result: ContentSignalsGuidanceBuildResult = builder.build({
      contentSignals: {},
    });

    expect(result).toEqual({
      contentSignalLine: undefined,
    });
  });

  it("serializes exact fingerprint signals in deterministic order", (): void => {
    const builder = new ContentSignalsGuidanceBuilder();
    const result: readonly string[] = builder.buildFingerprintSignals({
      contentSignals: {
        aiTrain: "disallow",
        search: "allow",
        aiInput: "allow",
      },
    });

    expect(result).toEqual(["search=yes", "ai-input=yes", "ai-train=no"]);
  });

  it("keeps empty configured policy distinct from omitted Content Signals", (): void => {
    const builder = new ContentSignalsGuidanceBuilder();

    expect({
      omitted: builder.hasConfiguredSignals({}),
      empty: builder.hasConfiguredSignals({ contentSignals: {} }),
      emptyFingerprintSignals: builder.buildFingerprintSignals({
        contentSignals: {},
      }),
      emptyDirective: builder.build({ contentSignals: {} }),
    }).toEqual({
      omitted: false,
      empty: true,
      emptyFingerprintSignals: [],
      emptyDirective: {
        contentSignalLine: undefined,
      },
    });
  });
});
