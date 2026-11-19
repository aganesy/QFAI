/**
 * An element with an inline size is marked interactive by its tag, its role or a
 * non-negative `tabindex`, and never while it is disabled.
 */

import { describe, expect, it } from "vitest";

import { parseHtmlMock } from "../../../../src/core/uiux/htmlMockDom.js";

const SIZED = 'style="width: 10px"';

async function interactiveFlags(html: string): Promise<boolean[]> {
  return (await parseHtmlMock(html)).inlineDimensions.map((item) => item.interactive);
}

describe("HTML mock interactive elements", () => {
  it.each(["a", "button", "select", "textarea", "summary"])(
    "marks a <%s> interactive by its tag",
    async (tag) => {
      expect(await interactiveFlags(`<${tag} ${SIZED}>x</${tag}>`)).toEqual([true]);
    },
  );

  it("marks an <input> interactive by its tag", async () => {
    expect(await interactiveFlags(`<input ${SIZED}>`)).toEqual([true]);
  });

  it.each(["button", "link", "checkbox", "radio", "switch", "tab", "menuitem", "TAB"])(
    'marks a <div role="%s"> interactive by its role',
    async (role) => {
      expect(await interactiveFlags(`<div role="${role}" ${SIZED}>x</div>`)).toEqual([true]);
    },
  );

  it("marks an element interactive by a non-negative tabindex only", async () => {
    const html = `<div tabindex="0" ${SIZED}>x</div><div tabindex="-1" ${SIZED}>y</div>`;
    expect(await interactiveFlags(html)).toEqual([true, false]);
  });

  it("marks no element that is disabled or has no interactive tag or role", async () => {
    const html = [
      `<button disabled ${SIZED}>x</button>`,
      `<a aria-disabled="TRUE" ${SIZED}>y</a>`,
      `<div role="dialog" ${SIZED}>z</div>`,
      `<div ${SIZED}>w</div>`,
    ].join("");
    expect(await interactiveFlags(html)).toEqual([false, false, false, false]);
  });
});
