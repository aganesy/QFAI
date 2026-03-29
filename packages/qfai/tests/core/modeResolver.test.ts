// QFAI:SPEC-0028:TC-0028-0001
// QFAI:SPEC-0028:TC-0028-0002
// QFAI:SPEC-0028:TC-0028-0003
// QFAI:SPEC-0028:TC-0028-0004
// QFAI:SPEC-0028:TC-0028-0005
// QFAI:SPEC-0028:TC-0028-0006
// QFAI:SPEC-0028:TC-0028-0007
import { describe, expect, it } from "vitest";

import {
  resolveObligations,
  resolveObligationsWithOptIn,
  RUNTIME_HEAVY_CHECKS,
  STATIC_OBLIGATIONS,
} from "../../src/core/prototyping/modeResolver.js";

describe("resolveObligations", () => {
  describe("static-first default (TC-0028-0001, TC-0028-0002)", () => {
    it("returns only static obligations when mode is default", () => {
      const obligations = resolveObligations("default");
      for (const o of obligations) {
        expect(STATIC_OBLIGATIONS).toContain(o);
      }
      expect(obligations.length).toBeGreaterThan(0);
    });

    it("does not include runtime-heavy checks in default mode", () => {
      const obligations = resolveObligations("default");
      for (const heavy of RUNTIME_HEAVY_CHECKS) {
        expect(obligations).not.toContain(heavy);
      }
    });

    it("includes source, route, state, contract-level obligations in default mode", () => {
      const obligations = resolveObligations("default");
      const required = ["source", "route", "state", "contract-level"];
      for (const r of required) {
        expect(obligations).toContain(r);
      }
    });

    it("excludes api-non-404, db-existence, ui-route-reachability from default", () => {
      const obligations = resolveObligations("default");
      expect(obligations).not.toContain("api-non-404");
      expect(obligations).not.toContain("db-existence");
      expect(obligations).not.toContain("ui-route-reachability");
    });
  });

  describe("runtime-heavy exclusion and opt-in (TC-0028-0003, TC-0028-0004)", () => {
    it("default hard gate list does not contain runtime-heavy checks", () => {
      const obligations = resolveObligations("default");
      for (const heavy of RUNTIME_HEAVY_CHECKS) {
        expect(obligations).not.toContain(heavy);
      }
    });

    it("enables a runtime-heavy check when explicitly opted in", () => {
      const obligations = resolveObligationsWithOptIn("default", ["api-non-404"]);
      expect(obligations).toContain("api-non-404");
      // static obligations still present
      for (const s of STATIC_OBLIGATIONS) {
        expect(obligations).toContain(s);
      }
    });

    it("opt-in does not add checks not in RUNTIME_HEAVY_CHECKS", () => {
      const obligations = resolveObligationsWithOptIn("default", ["unknown-check"]);
      expect(obligations).not.toContain("unknown-check");
    });
  });

  describe("mode isolation (TC-0028-0005, TC-0028-0006, TC-0028-0007)", () => {
    it("standard mode contains only standard obligations, no low-cost or full-harness extras", () => {
      const standard = resolveObligations("standard");
      const lowCost = resolveObligations("low-cost");
      const fullHarness = resolveObligations("full-harness");
      // standard and low-cost should be identical (both static-only)
      expect(standard).toEqual(lowCost);
      // full-harness should be a superset
      for (const o of standard) {
        expect(fullHarness).toContain(o);
      }
    });

    it("low-cost mode excludes runtime-heavy checks", () => {
      const obligations = resolveObligations("low-cost");
      for (const heavy of RUNTIME_HEAVY_CHECKS) {
        expect(obligations).not.toContain(heavy);
      }
    });

    it("full-harness mode includes runtime-heavy checks separated from standard/low-cost", () => {
      const fullHarness = resolveObligations("full-harness");
      for (const heavy of RUNTIME_HEAVY_CHECKS) {
        expect(fullHarness).toContain(heavy);
      }
      // also includes static
      for (const s of STATIC_OBLIGATIONS) {
        expect(fullHarness).toContain(s);
      }
    });

    it("each mode returns a distinct array reference (no shared state)", () => {
      const a = resolveObligations("standard");
      const b = resolveObligations("standard");
      expect(a).not.toBe(b);
      expect(a).toEqual(b);
    });
  });
});
