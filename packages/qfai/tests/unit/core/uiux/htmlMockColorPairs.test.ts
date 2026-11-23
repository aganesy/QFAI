/**
 * The colour pair of an element is read from the declarations its inline style holds, so a
 * longer property name ending in `background` is never taken for the background, and the
 * declaration CSS applies wins over an earlier or later one it overrides.
 */

import { describe, expect, it } from "vitest";

import { parseHtmlMock } from "../../../../src/core/uiux/htmlMockDom.js";

async function backgroundsOf(html: string): Promise<string[]> {
  return (await parseHtmlMock(html)).colorPairs.map((pair) => pair.backgroundColor);
}

describe("HTML mock colour pairs", () => {
  it("does not take a longer property name ending in background for the background", async () => {
    const html = '<p style="color: #222222; x-background: #000000; background: #ffffff">t</p>';
    expect(await backgroundsOf(html)).toEqual(["rgb(255, 255, 255)"]);
  });

  it("uses the !important background over a later plain one", async () => {
    const html =
      '<p style="color: #000000; background: #ffffff !important; background: #000000">t</p>';
    expect(await backgroundsOf(html)).toEqual(["rgb(255, 255, 255)"]);
  });

  it("reads the colour and the background whatever the case of their property names", async () => {
    const pairs = (
      await parseHtmlMock('<p style="COLOR: #000000; Background-Color: #FFFFFF">t</p>')
    ).colorPairs;
    expect(pairs).toEqual([
      { element: "p", color: "rgb(0, 0, 0)", backgroundColor: "rgb(255, 255, 255)" },
    ]);
  });

  it("records no pair when either colour is missing", async () => {
    const html = [
      '<p style="color: #000000">a</p>',
      '<p style="background: #ffffff">b</p>',
      '<p style="color: #000000; background: var(--bg)">c</p>',
    ].join("");
    expect(await backgroundsOf(html)).toEqual([]);
  });

  it("records no pair when either colour holds only whitespace", async () => {
    const html = [
      '<p style="color: ; background: #ffffff">a</p>',
      '<p style="color: #000000; background:  ">b</p>',
      '<p style="color: #000000; background-color: \t">c</p>',
    ].join("");
    expect(await backgroundsOf(html)).toEqual([]);
  });
});
