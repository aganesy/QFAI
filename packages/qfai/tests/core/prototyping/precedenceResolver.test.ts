// QFAI:SPEC-0006:TC-0006-0028
// QFAI:SPEC-0006:TC-0006-0029
// QFAI:SPEC-0006:TC-0006-0030
// QFAI:SPEC-0006:TC-0006-0031
// QFAI:SPEC-0006:TC-0006-0032
import { describe, expect, it } from "vitest";

import {
  resolvePrecedence,
  type ModeResolution,
  type ModeSource,
} from "../../../src/core/prototyping/precedenceResolver.js";

import type { DiscussionRecommendation } from "../../../src/core/prototyping/discussionReader.js";

describe("resolvePrecedence", () => {
  describe("TC-0006-0028: CLI override wins", () => {
    it("uses CLI --mode when provided, overriding discussion recommendation", () => {
      const discussion: DiscussionRecommendation = {
        recommended_mode: "low-cost",
        rationale: "Static-only project",
      };
      const result = resolvePrecedence({ cliMode: "standard", discussion });

      expect(result.effective_mode).toBe("standard");
      expect(result.mode_source).toBe("cli-override");
      expect(result.recommended_mode).toBe("low-cost");
      expect(result.rationale).toBe("CLI override");
    });
  });

  describe("TC-0006-0029: discussion recommendation used", () => {
    it("uses discussion recommended_mode when no CLI --mode flag", () => {
      const discussion: DiscussionRecommendation = {
        recommended_mode: "low-cost",
        rationale: "Project is static-only",
      };
      const result = resolvePrecedence({ cliMode: null, discussion });

      expect(result.effective_mode).toBe("low-cost");
      expect(result.mode_source).toBe("discussion-recommendation");
      expect(result.recommended_mode).toBe("low-cost");
      expect(result.rationale).toBe("Project is static-only");
    });
  });

  describe("TC-0006-0030: system default fallback", () => {
    it("falls back to system default standard when no CLI flag and no discussion recommendation", () => {
      const discussion: DiscussionRecommendation = {
        recommended_mode: null,
        rationale: null,
      };
      const result = resolvePrecedence({ cliMode: null, discussion });

      expect(result.effective_mode).toBe("standard");
      expect(result.mode_source).toBe("default");
      expect(result.recommended_mode).toBeNull();
      expect(result.rationale).toBe("system default");
    });

    it("emits note about missing discussion recommendation", () => {
      const result = resolvePrecedence({ cliMode: null, discussion: null });

      expect(result.effective_mode).toBe("standard");
      expect(result.mode_source).toBe("default");
    });
  });

  describe("TC-0006-0031: missing discussion artifact — note not error", () => {
    it("returns standard default when discussion is null (artifact missing)", () => {
      const result = resolvePrecedence({ cliMode: null, discussion: null });

      expect(result.effective_mode).toBe("standard");
      expect(result.mode_source).toBe("default");
      expect(result.recommended_mode).toBeNull();
      expect(result.rationale).toBe("system default");
    });
  });

  describe("TC-0006-0032: missing recommendation key — note not error", () => {
    it("returns standard default when discussion exists but has no recommendation", () => {
      const discussion: DiscussionRecommendation = {
        recommended_mode: null,
        rationale: null,
      };
      const result = resolvePrecedence({ cliMode: null, discussion });

      expect(result.effective_mode).toBe("standard");
      expect(result.mode_source).toBe("default");
      expect(result.recommended_mode).toBeNull();
    });
  });

  describe("mode_source type safety", () => {
    it("mode_source is always a valid ModeSource value", () => {
      const validSources: ModeSource[] = ["cli-override", "discussion-recommendation", "default"];

      const r1 = resolvePrecedence({ cliMode: "low-cost", discussion: null });
      expect(validSources).toContain(r1.mode_source);

      const r2 = resolvePrecedence({
        cliMode: null,
        discussion: { recommended_mode: "standard", rationale: "test" },
      });
      expect(validSources).toContain(r2.mode_source);

      const r3 = resolvePrecedence({ cliMode: null, discussion: null });
      expect(validSources).toContain(r3.mode_source);
    });
  });
});
