/**
 * Integration: spec-0010 CHG-006 — mock anchor-form href validation
 * (QFAI-MOCK-010 anchor/external PASS, same-origin /path/ FAIL).
 * Deterministic: each case exercises the production parser directly.
 */

import { describe, expect, it } from "vitest";

import { parseHtmlMock } from "../../src/core/uiux/htmlMockDom.js";

describe("spec-0010 mock anchor-form hrefs CHG-006", () => {
  it("TC-0010-0009 — #anchor and external http(s) hrefs both PASS QFAI-MOCK-010 (normal)", async () => {
    const anchor = await parseHtmlMock('<a href="#orders">Orders</a>');
    const external = await parseHtmlMock('<a href="https://x.test/">External</a>');
    expect(anchor.localRefs).toEqual([]);
    expect(external.localRefs).toEqual([]);
  });

  it("TC-0010-0010 — same-origin absolute /path/ href FAILS QFAI-MOCK-010; validator not broadened (error)", async () => {
    const result = await parseHtmlMock('<a href="/orders/">Orders</a>');
    expect(result.localRefs).toContain("/orders/");
  });
});
