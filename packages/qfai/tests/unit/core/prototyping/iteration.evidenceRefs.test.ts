/**
 * TC-0012-0444: iterations[i].evidenceRefs[] bijects with screens[].id
 * and uses `iter-NN/<id>.<ext>` paths.
 *
 * Unit-tests the pure builder so the bijection contract is pinned at
 * a single SSOT location (consumed by `prototypingIterate.ts` when it
 * seeds the iteration entry at cycle 0).
 */

import { describe, expect, it } from "vitest";

import { buildEvidenceRefs } from "../../../../src/core/prototyping/iteration.js";

describe("buildEvidenceRefs — screen-id bijection", () => {
  it("returns one screenshot ref + one html ref per declared screen id", () => {
    const refs = buildEvidenceRefs(0, ["home", "settings"]);
    expect(refs).toEqual([
      { kind: "screenshot", path: "iter-00/home.png" },
      { kind: "html", path: "iter-00/home.html" },
      { kind: "screenshot", path: "iter-00/settings.png" },
      { kind: "html", path: "iter-00/settings.html" },
    ]);
  });

  it("uses underscore casing verbatim (no re-casing inside the builder)", () => {
    const refs = buildEvidenceRefs(3, ["home_page", "settings_panel"]);
    const paths = refs.map((r) => r.path);
    expect(paths).toEqual([
      "iter-03/home_page.png",
      "iter-03/home_page.html",
      "iter-03/settings_panel.png",
      "iter-03/settings_panel.html",
    ]);
  });

  it("zero-pads the iter index to width 2 (iter-00..iter-09)", () => {
    expect(buildEvidenceRefs(0, ["x"])[0]?.path).toBe("iter-00/x.png");
    expect(buildEvidenceRefs(9, ["x"])[0]?.path).toBe("iter-09/x.png");
  });

  it("returns an empty array when no screens are declared", () => {
    expect(buildEvidenceRefs(0, [])).toEqual([]);
  });

  it("kinds are exactly `screenshot` or `html` per entry (closed set)", () => {
    const refs = buildEvidenceRefs(1, ["home"]);
    const kinds = new Set(refs.map((r) => r.kind));
    expect([...kinds].sort()).toEqual(["html", "screenshot"]);
  });
});
