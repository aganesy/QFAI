/**
 * An element counts as an interactive control by its tag, its role or a non-negative
 * `tabindex`, and never while it is disabled.
 */

import { describe, expect, it } from "vitest";

import { countScreenElements } from "../../../../src/core/uiux/htmlMockDom.js";

async function controlsIn(html: string): Promise<number> {
  return (await countScreenElements(html)).interactiveControls;
}

describe("HTML mock interactive elements", () => {
  it.each(["a", "button", "select", "textarea", "summary"])(
    "counts a <%s> by its tag",
    async (tag) => {
      expect(await controlsIn(`<${tag}>x</${tag}>`)).toBe(1);
    },
  );

  it("counts an <input> by its tag", async () => {
    expect(await controlsIn("<input>")).toBe(1);
  });

  it.each(["button", "link", "checkbox", "radio", "switch", "tab", "menuitem", "TAB"])(
    'counts a <div role="%s"> by its role',
    async (role) => {
      expect(await controlsIn(`<div role="${role}">x</div>`)).toBe(1);
    },
  );

  it("counts an element with a non-negative tabindex only", async () => {
    expect(await controlsIn('<div tabindex="0">x</div><div tabindex="-1">y</div>')).toBe(1);
  });

  it("counts no element that is disabled or has no interactive tag or role", async () => {
    const html = [
      "<button disabled>x</button>",
      '<a aria-disabled="TRUE">y</a>',
      '<div role="dialog">z</div>',
      "<div>w</div>",
    ].join("");
    expect(await controlsIn(html)).toBe(0);
  });
});
