/**
 * Browser QA visual tests — spec-0036 TDD-0007, TDD-0010
 *
 * QFAI:SPEC-0036:TC-0036-0007
 * QFAI:SPEC-0036:TC-0036-0010
 */
import { describe, expect, it } from "vitest";

import { runVisualQa, type VisualQaFinding } from "../../../src/core/browserQa/visual.js";

describe("browser QA", () => {
  it("visual findings", async () => {
    const mockChecks = async (_url: string): Promise<VisualQaFinding[]> => [
      {
        selector: "div.card",
        issue: "Inconsistent border radius across cards",
        severity: "warning",
        suggestion: "Apply consistent border-radius token",
        screenshotRef: "evidence/card-radius.png",
      },
    ];

    const result = await runVisualQa("http://localhost:3000", mockChecks);

    expect(result.type).toBe("findings");
    if (result.type === "findings") {
      expect(result.findings.length).toBeGreaterThan(0);
    }
  });

  it("visual finding structure", async () => {
    const mockChecks = async (_url: string): Promise<VisualQaFinding[]> => [
      {
        selector: "header.nav",
        issue: "Color contrast ratio below 4.5:1",
        severity: "error",
        suggestion: "Increase text color contrast to meet WCAG AA",
      },
      {
        selector: "footer",
        issue: "Font size below minimum readable threshold",
        severity: "warning",
        suggestion: "Increase footer font size to at least 14px",
      },
    ];

    const result = await runVisualQa("http://localhost:3000", mockChecks);

    expect(result.type).toBe("findings");
    if (result.type === "findings") {
      for (const finding of result.findings) {
        expect(finding).toHaveProperty("selector");
        expect(finding).toHaveProperty("issue");
        expect(finding).toHaveProperty("severity");
        expect(finding).toHaveProperty("suggestion");
      }
    }
  });
});
