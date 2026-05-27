/**
 * lap-010 missing-route advisory-failing finding
 * (spec-0012 Phase 4 / REQ-0012-0070 / TC-0012-0454).
 *
 * SPA missing route surfaces lap-010. Both `targetUrl#/<route>` and
 * `targetUrl/<route>` are accepted as proof-of-reachability. Override
 * without Reviewer justification is rejected.
 */

// QFAI:SPEC-0012:TC-0012-0454

import { describe, expect, it } from "vitest";

import {
  findMissingRoutes,
  htmlReachesRoute,
  isAdvisoryOverrideAccepted,
} from "../../../../src/core/prototyping/layoutAntiPatternsAdvisory.js";

describe("lap-010 missing-route advisory-failing", () => {
  it("emits lap-010 when the declared route is not reachable in the captured html", () => {
    const findings = findMissingRoutes([
      {
        screenId: "settings",
        route: "/settings",
        html: '<html><body><a href="/home">Home</a></body></html>',
      },
    ]);
    expect(findings.length).toBe(1);
    expect(findings[0]?.code).toBe("lap-010");
    expect(findings[0]?.category).toBe("missing-route");
    expect(findings[0]?.screenId).toBe("settings");
    expect(findings[0]?.route).toBe("/settings");
  });

  it("accepts targetUrl#/<route> form (hash routing)", () => {
    const html = '<html><body><a href="#/settings">Settings</a></body></html>';
    expect(htmlReachesRoute(html, "/settings")).toBe(true);
    expect(htmlReachesRoute(html, "settings")).toBe(true);
    expect(findMissingRoutes([{ screenId: "settings", route: "/settings", html }])).toEqual([]);
  });

  it("accepts targetUrl/<route> form (path routing)", () => {
    const html = '<html><body><a href="/settings">Settings</a></body></html>';
    expect(htmlReachesRoute(html, "/settings")).toBe(true);
    expect(findMissingRoutes([{ screenId: "settings", route: "/settings", html }])).toEqual([]);
  });

  it("rejects override without Reviewer justification", () => {
    expect(isAdvisoryOverrideAccepted({ findingCode: "lap-010", justification: "" })).toBe(false);
    expect(
      isAdvisoryOverrideAccepted({
        findingCode: "lap-010",
        justification: "Route is documentation-only and intentionally unreachable.",
      }),
    ).toBe(true);
  });

  it("emits multiple lap-010 findings when several screens are missing their routes", () => {
    const findings = findMissingRoutes([
      { screenId: "a", route: "/a", html: "<html></html>" },
      { screenId: "b", route: "/b", html: "<html></html>" },
      { screenId: "c", route: "/c", html: '<html><a href="/c"></a></html>' },
    ]);
    expect(findings.length).toBe(2);
    expect(findings.map((f) => f.screenId).sort()).toEqual(["a", "b"]);
  });
});
