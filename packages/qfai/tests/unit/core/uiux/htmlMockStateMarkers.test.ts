/**
 * `data-state` and `data-breakpoint` are read from every element, whether it carries
 * inline CSS or is styled only through its classes.
 */

import { describe, expect, it } from "vitest";

import { parseHtmlMock } from "../../../../src/core/uiux/htmlMockDom.js";

describe("HTML mock state markers", () => {
  it("reads a class-styled variant beside an inline-styled one", async () => {
    const html = [
      '<div data-state="default" style="color: #000">ok</div>',
      '<div data-state="error" class="error">failed</div>',
    ].join("");

    expect((await parseHtmlMock(html)).stateAttributes).toEqual(["default", "error"]);
  });

  it("reads variants that are all styled through classes", async () => {
    const html = [
      '<div data-state="default" class="card">ok</div>',
      '<div data-state="error" class="card card--error">failed</div>',
    ].join("");

    expect((await parseHtmlMock(html)).stateAttributes).toEqual(["default", "error"]);
  });

  it("reads breakpoints on elements with and without inline CSS", async () => {
    const html = [
      '<section data-breakpoint="mobile" class="narrow"></section>',
      '<section data-breakpoint="desktop" style="width: 960px"></section>',
    ].join("");

    expect((await parseHtmlMock(html)).breakpointAttributes).toEqual(["mobile", "desktop"]);
  });
});
