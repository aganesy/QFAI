/**
 * Unit: catalog of 8 Reviewer-Gate finding codes with mandatory
 * non-empty justification (TC-0015-0026, AC-0015-0018).
 *
 * The catalog SSOT lives at
 * `packages/qfai/src/core/validators/justificationCatalog.ts`. The
 * eight registered codes are:
 *   - R-AUTOPILOT-POLICY-MISSING
 *   - R-HANDOFF-SCHEMA-DRIFT
 *   - R-EVIDENCE-MUTATION-UNLOGGED
 *   - R-DESIGN-MD-PATCH-OUT-OF-ZONE
 *   - R-PACK-LOCATION-DRIFT
 *   - R-SKILL-MANIFEST-DRIFT
 *   - R-EXPLORATION-CERTIFY-ATTEMPT
 *   - R-MOCK-HREF-DRIFT
 *
 * Severity: every code is `error` (R-DESIGN-MD-PATCH-OUT-OF-ZONE is
 * documented warning per REQ-0151 but kept in the catalog).
 */
// QFAI:SPEC-0015:TC-0015-0026

import { describe, expect, it } from "vitest";

import {
  CATALOG_ADVISORY_FAILING_CODES,
  JUSTIFICATION_CATALOG,
  isAdvisoryFailingCatalogCode,
} from "../../../../src/core/validators/justificationCatalog.js";

describe("TC-0015-0026: justification catalog SSOT", () => {
  it("registers exactly the 8 catalog codes", () => {
    const codes = JUSTIFICATION_CATALOG.map((e) => e.code).sort();
    expect(codes).toEqual(
      [
        "R-AUTOPILOT-POLICY-MISSING",
        "R-DESIGN-MD-PATCH-OUT-OF-ZONE",
        "R-EVIDENCE-MUTATION-UNLOGGED",
        "R-EXPLORATION-CERTIFY-ATTEMPT",
        "R-HANDOFF-SCHEMA-DRIFT",
        "R-MOCK-HREF-DRIFT",
        "R-PACK-LOCATION-DRIFT",
        "R-SKILL-MANIFEST-DRIFT",
      ].sort(),
    );
  });

  it("every catalog entry carries a non-empty description and severity 'error' (R-DESIGN-MD-PATCH-OUT-OF-ZONE documented warning)", () => {
    for (const entry of JUSTIFICATION_CATALOG) {
      expect(entry.code).toMatch(/^R-/);
      expect(typeof entry.description).toBe("string");
      expect(entry.description.length).toBeGreaterThan(0);
      if (entry.code === "R-DESIGN-MD-PATCH-OUT-OF-ZONE") {
        expect(entry.severity).toBe("warning");
      } else {
        expect(entry.severity).toBe("error");
      }
    }
  });

  it("isAdvisoryFailingCatalogCode returns true for all 8 codes", () => {
    for (const entry of JUSTIFICATION_CATALOG) {
      expect(isAdvisoryFailingCatalogCode(entry.code)).toBe(true);
    }
  });

  it("isAdvisoryFailingCatalogCode returns false for unrelated codes", () => {
    expect(isAdvisoryFailingCatalogCode("R-WORKLOG-DRIFT")).toBe(false);
    expect(isAdvisoryFailingCatalogCode("QFAI-CRIT-008")).toBe(false);
    expect(isAdvisoryFailingCatalogCode("")).toBe(false);
  });

  it("CATALOG_ADVISORY_FAILING_CODES exposes the same 8-code set as a Set", () => {
    expect(CATALOG_ADVISORY_FAILING_CODES.size).toBe(8);
    for (const entry of JUSTIFICATION_CATALOG) {
      expect(CATALOG_ADVISORY_FAILING_CODES.has(entry.code)).toBe(true);
    }
  });
});
