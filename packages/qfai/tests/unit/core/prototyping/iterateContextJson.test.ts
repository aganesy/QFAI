/**
 * iterate-context.json schema lockdown
 * (spec-0012 Phase 4 / REQ-0012-0072 / TC-0012-0469).
 *
 * The advisory file has exactly the 4 top-level keys:
 *   { priorCycle, priorScores, openBlockers, priorTailwindContract }
 *
 * No additional top-level keys are accepted by `isIterateContext`; any
 * additive field requires an explicit spec amendment.
 */

import { describe, expect, it } from "vitest";

import {
  ITERATE_CONTEXT_KEYS,
  canonicalIterateContext,
  isIterateContext,
} from "../../../../src/core/prototyping/iterateContext.js";

const canonical = {
  priorCycle: 3,
  priorScores: {
    informationArchitecture: "acceptable",
    navigationFlow: "exceptional",
    usability: "exceptional",
    functionality: "exceptional",
  },
  openBlockers: ["lap-009 on home/dashboard"],
  priorTailwindContract: "phase-1",
} as const;

describe("isIterateContext: exact 4-key schema lockdown", () => {
  it("accepts the canonical 4-key shape", () => {
    expect(isIterateContext(canonical)).toBe(true);
  });

  it("rejects records with additional top-level keys", () => {
    expect(
      isIterateContext({
        ...canonical,
        notes: "extra",
      }),
    ).toBe(false);
  });

  it("rejects records missing any of the 4 required keys", () => {
    for (const k of ITERATE_CONTEXT_KEYS) {
      const copy = { ...canonical } as Record<string, unknown>;
      delete copy[k];
      expect(isIterateContext(copy), `missing ${k}`).toBe(false);
    }
  });

  it("rejects non-integer priorCycle", () => {
    expect(
      isIterateContext({
        ...canonical,
        priorCycle: 1.5,
      }),
    ).toBe(false);
  });

  it("rejects non-string openBlockers entries", () => {
    expect(
      isIterateContext({
        ...canonical,
        openBlockers: [42],
      }),
    ).toBe(false);
  });

  it("rejects missing axis in priorScores", () => {
    expect(
      isIterateContext({
        ...canonical,
        priorScores: {
          informationArchitecture: "acceptable",
          navigationFlow: "exceptional",
          usability: "exceptional",
          // functionality missing
        },
      }),
    ).toBe(false);
  });
});

describe("ITERATE_CONTEXT_KEYS: stable identifier set", () => {
  it("matches the locked 4-element key list", () => {
    expect([...ITERATE_CONTEXT_KEYS]).toEqual([
      "priorCycle",
      "priorScores",
      "openBlockers",
      "priorTailwindContract",
    ]);
  });
});

describe("canonicalIterateContext: stable key order", () => {
  it("produces a record whose JSON serialisation has the locked key order", () => {
    const ctx = canonicalIterateContext({ ...canonical });
    const keys = Object.keys(ctx);
    expect(keys).toEqual([
      "priorCycle",
      "priorScores",
      "openBlockers",
      "priorTailwindContract",
    ]);
  });
});
