/**
 * Tests for validateLighthouseGateIssues (v1.8.4 Phase 3).
 *
 * spec-0012 TC-0012-0299 / TC-0012-0300 / AC-0012-0182
 */
import { describe, expect, it } from "vitest";

import { validateLighthouseGateIssues } from "../../../src/core/validators/prototyping/lighthouseGate.js";

describe("validateLighthouseGateIssues", () => {
  const path = ".qfai/evidence/prototyping.json";

  it("returns empty when mode is not full-harness", () => {
    const record = {
      mode: { effective: "standard", source: "config", rationale: "default" },
      surface: "web",
    };
    expect(validateLighthouseGateIssues(record, path)).toEqual([]);
  });

  it("returns empty when surface is not web (e.g. mobile, mixed)", () => {
    const record = {
      mode: { effective: "full-harness", source: "explicit-request", rationale: "test" },
      surface: "mobile",
    };
    expect(validateLighthouseGateIssues(record, path)).toEqual([]);
  });

  it("returns empty when lighthouseReport object exists with at least one key", () => {
    const record = {
      mode: { effective: "full-harness", source: "explicit-request", rationale: "test" },
      surface: "web",
      lighthouseReport: { performance: 95 },
    };
    expect(validateLighthouseGateIssues(record, path)).toEqual([]);
  });

  it("returns empty when 'lighthouse' alias points to a non-empty string", () => {
    const record = {
      mode: { effective: "full-harness", source: "explicit-request", rationale: "test" },
      surface: "web",
      lighthouse: "https://example.com/report.html",
    };
    expect(validateLighthouseGateIssues(record, path)).toEqual([]);
  });

  it("emits QFAI-PROT-332 (error) when full-harness + web has no lighthouse report", () => {
    const record = {
      mode: { effective: "full-harness", source: "explicit-request", rationale: "test" },
      surface: "web",
    };
    const issues = validateLighthouseGateIssues(record, path);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-PROT-332");
    expect(issues[0]?.severity).toBe("error");
    expect(issues[0]?.category).toBe("canonical");
    expect(issues[0]?.file).toBe(path);
    expect(issues[0]?.message).toMatch(/Lighthouse Gate is MUST/);
  });

  it("treats empty lighthouseReport object as missing", () => {
    const record = {
      mode: { effective: "full-harness", source: "explicit-request", rationale: "test" },
      surface: "web",
      lighthouseReport: {}, // empty object
    };
    const issues = validateLighthouseGateIssues(record, path);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-PROT-332");
  });
});
