import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  normalizeAllowedModes,
  parseDiscussionModeRecommendation,
  resolvePrototypingMode,
} from "../../src/core/prototyping/mode.js";

describe("prototyping mode resolver", () => {
  it("prefers explicit mode over discussion recommendation", () => {
    const result = resolvePrototypingMode({
      explicitMode: "full-harness",
      discussionRecommendation: {
        recommendedMode: "standard",
        rationale: "default recommendation",
      },
    });

    expect(result).toEqual({
      requested: "full-harness",
      effective: "full-harness",
      source: "explicit-request",
      rationale: "User explicitly selected full-harness.",
    });
  });

  it("uses discussion recommendation when explicit mode is absent", () => {
    const result = resolvePrototypingMode({
      discussionRecommendation: {
        recommendedMode: "low-cost",
        rationale: "cost-first draft",
      },
    });

    expect(result.effective).toBe("low-cost");
    expect(result.source).toBe("discussion-recommendation");
  });

  it("falls back to standard default", () => {
    const result = resolvePrototypingMode({});
    expect(result.effective).toBe("standard");
    expect(result.source).toBe("default");
  });

  it("normalizes allowed modes by de-duplicating valid entries", () => {
    expect(normalizeAllowedModes(["standard", "full-harness", "standard", "invalid"])).toEqual([
      "full-harness",
      "standard",
    ]);
  });

  it("parses discussion recommendation yaml", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-prototyping-mode-"));
    try {
      await mkdir(root, { recursive: true });
      const target = path.join(root, "prototyping.yaml");
      await writeFile(
        target,
        [
          "recommended_mode: standard",
          "rationale: customer presentable",
          "allowed_modes:",
          "  - low-cost",
          "  - standard",
          "surface: web-ui",
          "updated_at: 2026-04-04T00:00:00Z",
          "",
        ].join("\n"),
        "utf-8",
      );

      await expect(parseDiscussionModeRecommendation(target)).resolves.toEqual({
        recommendedMode: "standard",
        rationale: "customer presentable",
        allowedModes: ["low-cost", "standard"],
        surface: "web-ui",
        updatedAt: "2026-04-04T00:00:00Z",
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
