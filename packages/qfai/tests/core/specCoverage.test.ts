import { describe, expect, it } from "vitest";

import { buildSpecCoverageSummary } from "../../src/core/prototyping/specCoverage.js";

describe("specCoverage", () => {
  it("compares declared and observed canonical routes without URL fallback", async () => {
    const summary = await buildSpecCoverageSummary(
      "missing-specs-dir",
      {
        ui: [
          {
            screenId: "dashboard",
            route: "/dashboard",
            url: "http://localhost:3000/dashboard",
            rendered: true,
            browserVisited: false,
            renderEvidenceRefs: ["render/dashboard.html"],
            browserQaEvidenceRefs: [],
          },
          {
            screenId: "settings",
            route: "/settings",
            url: "http://localhost:3000/settings",
            rendered: false,
            browserVisited: true,
            renderEvidenceRefs: [],
            browserQaEvidenceRefs: ["browser-qa.json#/settings"],
          },
        ],
      },
      ".qfai/evidence",
    );

    expect(summary.checked.uiOk).toBe(0);
    expect(summary.evidenceRefs).toContain(".qfai/evidence");
  });
});
