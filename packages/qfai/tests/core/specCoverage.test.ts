import { describe, expect, it } from "vitest";

import { buildSpecCoverageSummary } from "../../src/core/prototyping/specCoverage.js";

describe("specCoverage", () => {
  it("compares declared and observed canonical routes without URL fallback", async () => {
    const summary = await buildSpecCoverageSummary(
      "missing-specs-dir",
      {
        ui: [
          { route: "/dashboard", status: 200, url: "http://localhost:3000/dashboard" },
          { route: "/settings", status: 200, url: "http://localhost:3000/settings" },
        ],
        api: [],
      },
      ".qfai/evidence",
    );

    expect(summary.checked.uiOk).toBe(0);
    expect(summary.evidenceRefs).toContain(".qfai/evidence");
  });
});
