/**
 * Unit: QFAI-MOCK-010 href classification stays strict (anchor-form
 * default). Anchor (`#name`) and external `http(s)://` hrefs PASS
 * (no localRefs / handled as externalUrls); same-origin absolute
 * `/path/` hrefs FAIL (classified as localRefs → QFAI-MOCK-010).
 */

import { describe, it, expect } from "vitest";

import { parseHtmlMock } from "../../../../src/core/uiux/htmlMockDom.js";

describe("TC-0010-0009/0010: QFAI-MOCK-010 href classification (anchor-form strict)", () => {
  it("anchor-form #href produces no localRefs (PASS QFAI-MOCK-010)", async () => {
    const result = await parseHtmlMock('<a href="#orders">Orders</a>');
    expect(result.localRefs).toEqual([]);
  });

  it("external http(s):// href is externalUrls, not localRefs (PASS QFAI-MOCK-010)", async () => {
    const result = await parseHtmlMock('<a href="https://x.test/">External</a>');
    expect(result.localRefs).toEqual([]);
    expect(result.externalUrls).toContain("https://x.test/");
  });

  it("same-origin absolute /path/ href is a localRef (FAILS QFAI-MOCK-010; validator stays strict)", async () => {
    const result = await parseHtmlMock('<a href="/orders/">Orders</a>');
    expect(result.localRefs).toContain("/orders/");
  });
});
