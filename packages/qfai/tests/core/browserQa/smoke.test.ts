/**
 * Browser QA smoke tests — spec-0036 TDD-0005, TDD-0006, TDD-0009
 *
 * QFAI:SPEC-0036:TC-0036-0005
 * QFAI:SPEC-0036:TC-0036-0006
 * QFAI:SPEC-0036:TC-0036-0009
 */
import { describe, expect, it } from "vitest";

import { runSmokeQa, type SmokeQaFinding } from "../../../src/core/browserQa/smoke.js";

describe("browser QA", () => {
  it("smoke findings", async () => {
    const mockChecks = async (_url: string): Promise<SmokeQaFinding[]> => [
      {
        selector: "button.submit",
        issue: "Touch target too small (32x32)",
        severity: "warning",
        suggestion: "Increase button size to at least 44x44px",
      },
      {
        selector: "img.hero",
        issue: "Missing alt attribute",
        severity: "error",
        suggestion: "Add descriptive alt text to image",
      },
    ];

    const result = await runSmokeQa("http://localhost:3000", true, mockChecks);

    expect(result.type).toBe("findings");
    if (result.type === "findings") {
      expect(result.findings.length).toBeGreaterThan(0);
      for (const finding of result.findings) {
        expect(finding).toHaveProperty("selector");
        expect(finding).toHaveProperty("issue");
        expect(finding).toHaveProperty("severity");
        expect(finding).toHaveProperty("suggestion");
      }
    }
  });

  it("no-URL error", async () => {
    const result = await runSmokeQa(undefined, true);

    expect(result.type).toBe("error");
    if (result.type === "error") {
      expect(result.message).toContain("URL");
    }
  });

  it("non-web skip", async () => {
    const result = await runSmokeQa(undefined, false);

    expect(result.type).toBe("skip");
    if (result.type === "skip") {
      expect(result.reason).toBeTruthy();
    }
  });
});
