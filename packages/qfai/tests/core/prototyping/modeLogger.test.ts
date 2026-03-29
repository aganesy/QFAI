// QFAI:SPEC-0006:TC-0006-0033
// QFAI:SPEC-0006:TC-0006-0034
// QFAI:SPEC-0006:TC-0006-0035
// QFAI:SPEC-0006:TC-0006-0039
// QFAI:SPEC-0006:TC-0006-0040
// QFAI:SPEC-0006:TC-0006-0041
import { describe, expect, it } from "vitest";

import {
  formatModeLog,
  VALID_MODE_SOURCES,
  type ModeLogEntry,
} from "../../../src/core/prototyping/modeLogger.js";

import type { ModeResolution } from "../../../src/core/prototyping/precedenceResolver.js";

describe("formatModeLog", () => {
  describe("TC-0006-0033: mode logging — CLI override output", () => {
    it("produces structured log with cli-override source and L2/L3 evidence expectations", () => {
      const resolution: ModeResolution = {
        effective_mode: "standard",
        mode_source: "cli-override",
        recommended_mode: null,
        rationale: "CLI override",
      };

      const log = formatModeLog(resolution);

      expect(log.mode_source).toBe("cli-override");
      expect(log.recommended_mode).toBeNull();
      expect(log.effective_mode).toBe("standard");
      expect(log.rationale).toBe("CLI override");
      expect(log.evidence_expectations).toBe("L2/L3");
    });
  });

  describe("TC-0006-0034: mode logging — discussion recommendation", () => {
    it("produces structured log with discussion-recommendation source", () => {
      const resolution: ModeResolution = {
        effective_mode: "low-cost",
        mode_source: "discussion-recommendation",
        recommended_mode: "low-cost",
        rationale: "Project is static-only",
      };

      const log = formatModeLog(resolution);

      expect(log.mode_source).toBe("discussion-recommendation");
      expect(log.recommended_mode).toBe("low-cost");
      expect(log.effective_mode).toBe("low-cost");
      expect(log.rationale).toBe("Project is static-only");
      expect(log.evidence_expectations).toBe("L1/L2");
    });
  });

  describe("TC-0006-0035: mode logging — default in evidence artifact", () => {
    it("produces structured log with default source and standard evidence expectations", () => {
      const resolution: ModeResolution = {
        effective_mode: "standard",
        mode_source: "default",
        recommended_mode: null,
        rationale: "system default",
      };

      const log = formatModeLog(resolution);

      expect(log.mode_source).toBe("default");
      expect(log.recommended_mode).toBeNull();
      expect(log.effective_mode).toBe("standard");
      expect(log.rationale).toBe("system default");
      expect(log.evidence_expectations).toBe("L2/L3");
    });
  });

  describe("TC-0006-0039: mode source enumeration validation", () => {
    it("VALID_MODE_SOURCES contains exactly the three allowed values", () => {
      expect(VALID_MODE_SOURCES).toEqual(
        new Set(["cli-override", "discussion-recommendation", "default"]),
      );
    });

    it("formatModeLog always returns a mode_source in the valid set", () => {
      const resolutions: ModeResolution[] = [
        { effective_mode: "standard", mode_source: "cli-override", recommended_mode: null, rationale: "CLI override" },
        { effective_mode: "low-cost", mode_source: "discussion-recommendation", recommended_mode: "low-cost", rationale: "test" },
        { effective_mode: "standard", mode_source: "default", recommended_mode: null, rationale: "system default" },
      ];

      for (const r of resolutions) {
        const log = formatModeLog(r);
        expect(VALID_MODE_SOURCES.has(log.mode_source)).toBe(true);
      }
    });
  });

  describe("TC-0006-0040: mode source cli-override check", () => {
    it("CLI override produces mode_source = cli-override", () => {
      const resolution: ModeResolution = {
        effective_mode: "low-cost",
        mode_source: "cli-override",
        recommended_mode: null,
        rationale: "CLI override",
      };

      const log = formatModeLog(resolution);
      expect(log.mode_source).toBe("cli-override");
      expect(VALID_MODE_SOURCES.has(log.mode_source)).toBe(true);
    });
  });

  describe("TC-0006-0041: mode source discussion-recommendation check", () => {
    it("discussion recommendation produces mode_source = discussion-recommendation", () => {
      const resolution: ModeResolution = {
        effective_mode: "standard",
        mode_source: "discussion-recommendation",
        recommended_mode: "standard",
        rationale: "Full coverage recommended",
      };

      const log = formatModeLog(resolution);
      expect(log.mode_source).toBe("discussion-recommendation");
      expect(VALID_MODE_SOURCES.has(log.mode_source)).toBe(true);
    });
  });

  describe("evidence_expectations mapping", () => {
    it("low-cost mode produces L1/L2", () => {
      const log = formatModeLog({
        effective_mode: "low-cost",
        mode_source: "cli-override",
        recommended_mode: null,
        rationale: "test",
      });
      expect(log.evidence_expectations).toBe("L1/L2");
    });

    it("full-harness mode produces L3/L4/L5", () => {
      const log = formatModeLog({
        effective_mode: "full-harness",
        mode_source: "cli-override",
        recommended_mode: null,
        rationale: "test",
      });
      expect(log.evidence_expectations).toBe("L3/L4/L5");
    });
  });
});
