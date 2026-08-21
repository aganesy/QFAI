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
 * Severity is deliberately NOT a catalog column: the catalog governs
 * membership only. Each code's own severity belongs to its detector
 * (`designMdPatchZone.ts` emits R-DESIGN-MD-PATCH-OUT-OF-ZONE at
 * `warning`), while the empty-justification ingestion rejection in
 * `reviewerJustification.ts` is always `error`. A per-entry `severity`
 * field would be read by no production path, so its absence is pinned
 * here as a regression guard.
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

  it("every catalog entry carries a non-empty description", () => {
    for (const entry of JUSTIFICATION_CATALOG) {
      expect(entry.code).toMatch(/^R-/);
      expect(typeof entry.description).toBe("string");
      expect(entry.description.length).toBeGreaterThan(0);
    }
  });

  // Regression for the decorative-severity defect: the catalog used to
  // declare a per-code `severity` that no production path read, so a
  // code documented `warning` was ingested at `error`. Entries MUST
  // expose code + description only.
  it("catalog entries declare no severity column (membership-only SSOT)", () => {
    for (const entry of JUSTIFICATION_CATALOG) {
      expect(Object.keys(entry).sort()).toEqual(["code", "description"]);
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

  // Regression for description-vs-implementation drift on R-PACK-LOCATION-DRIFT
  // and R-SKILL-MANIFEST-DRIFT. The catalog text MUST describe what the
  // implementation actually detects so reviewer-facing surfaces stay
  // accurate.
  it("R-PACK-LOCATION-DRIFT description matches the check-pack-locations.mjs implementation contract", () => {
    const entry = JUSTIFICATION_CATALOG.find((e) => e.code === "R-PACK-LOCATION-DRIFT");
    expect(entry).toBeDefined();
    const desc = entry?.description ?? "";
    // The implementation flags `review-*` / `discussion-*` pack
    // directories outside their allowed roots. Description MUST name
    // these two pack kinds.
    expect(desc).toMatch(/review-\*/);
    expect(desc).toMatch(/discussion-\*/);
    // It must NOT (falsely) claim it covers `.qfai/specs/` pack drift —
    // the implementation does not check that surface.
    expect(desc).not.toMatch(/\.qfai\/specs\//);
  });

  it("R-SKILL-MANIFEST-DRIFT description matches the per-skill manifest probe SSOT-sync pair", () => {
    const entry = JUSTIFICATION_CATALOG.find((e) => e.code === "R-SKILL-MANIFEST-DRIFT");
    expect(entry).toBeDefined();
    const desc = entry?.description ?? "";
    // The implementation (`skillManifestDrift.ts` + `skillManifestPairs.ts`)
    // checks per-skill `manifest.json#runtimeDependencies` ↔ doctor
    // probe — NOT agent-catalog / agent-routing / review-profiles.
    expect(desc).toMatch(/manifest\.json/);
    expect(desc).toMatch(/runtimeDependencies/i);
    expect(desc).toMatch(/doctor/i);
    expect(desc).not.toMatch(/agent-catalog/);
    expect(desc).not.toMatch(/agent-routing/);
    expect(desc).not.toMatch(/review-profiles/);
  });

  // Regression for the WIDENED auxiliary code: it is NOT part of the
  // closed 8-code catalog (warning-class auxiliary; outside the
  // advisory-failing contract).
  it("R-AUTOPILOT-POLICY-WIDENED is NOT a catalog code (auxiliary warning-class)", () => {
    expect(isAdvisoryFailingCatalogCode("R-AUTOPILOT-POLICY-WIDENED")).toBe(false);
    const codes = JUSTIFICATION_CATALOG.map((e) => e.code);
    expect(codes).not.toContain("R-AUTOPILOT-POLICY-WIDENED");
  });
});
