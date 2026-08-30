/**
 * Unit: QFAI-MOCK-010 href classification stays strict (anchor-form
 * default). Anchor (`#name`) and external `http(s)://` hrefs PASS
 * (no localRefs / handled as externalUrls); same-origin absolute
 * `/path/` hrefs FAIL (classified as localRefs → QFAI-MOCK-010).
 *
 * Also asserts the shipped discussion mock template emits anchor-form
 * links by default and that the discussion SKILL.md instructs
 * anchor-form authoring. These guard the template ↔ validator contract.
 */
// QFAI:SPEC-0010:TC-0010-0009
// QFAI:SPEC-0010:TC-0010-0010

import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, it, expect } from "vitest";

import { parseHtmlMock } from "../../../../src/core/uiux/htmlMockDom.js";

const TEMPLATE_REL = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "skills",
  "qfai-discussion",
  "templates",
  "03_Story-Workshop.md",
);
const SKILL_REL = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "skills",
  "qfai-discussion",
  "SKILL.md",
);

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

describe("TC-0010-0009: shipped discussion mock template + SKILL.md default to anchor-form", () => {
  it('the Story-Workshop mock template emits an anchor-form <a href="#..."> link', async () => {
    const text = await readFile(TEMPLATE_REL, "utf-8");
    expect(text).toMatch(/<a\s+href="#[a-z0-9-]+"/i);
    // The drift form (same-origin absolute) must NOT be the template default.
    expect(text).not.toMatch(/<a\s+href="\/[a-z0-9-]+\/?"/i);
  });

  it("the discussion SKILL.md instructs anchor-form (#name) mock authoring", async () => {
    const text = await readFile(SKILL_REL, "utf-8");
    expect(text).toMatch(/anchor-form/i);
    expect(text).toMatch(/QFAI-MOCK-010/);
  });
});
