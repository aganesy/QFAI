import { describe, expect, it } from "vitest";

import {
  DEFAULT_PROTOTYPING_MODE,
  derivePrototypingObligations,
  isValidPrototypingMode,
} from "../../src/core/review/prototyping.js";

describe("prototyping mode helpers", () => {
  it("exports the current default prototyping mode", () => {
    expect(isValidPrototypingMode(DEFAULT_PROTOTYPING_MODE)).toBe(true);
  });

  it("derives obligations for full-harness web surfaces", () => {
    const obligations = derivePrototypingObligations({
      surface: "web",
      effectiveMode: "full-harness",
    });
    expect(obligations.requireRuntimeGate).toBe(true);
    expect(obligations.requireUiFidelity).toBe(true);
  });
});
