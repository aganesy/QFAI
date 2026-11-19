import { describe, expect, it } from "vitest";

import { collectHtmlMockBlocks } from "../../src/core/validators/htmlMockBlocks.js";

// A CSS block beside an HTML mock is inserted into the mock as a `<style>`
// element. The CSS text may hold `$&`, `$'`, `` $` `` and `$$`, which a string
// replacement reads as replacement patterns; the CSS must arrive unchanged.
const CSS_WITH_REPLACEMENT_PATTERNS = [
  '.price::before { content: "$$"; }',
  '.match::after { content: "$&"; }',
  '.before::after { content: "$`"; }',
  '.after::after { content: "$\'"; }',
].join("\n");

function mockWithCss(html: string): string {
  return ["```html", html, "```", "```css", CSS_WITH_REPLACEMENT_PATTERNS, "```", ""].join("\n");
}

describe("CSS beside an HTML mock is inserted literally", () => {
  it("keeps replacement patterns in CSS inserted before </head>", () => {
    const html = "<html><head><title>Checkout</title></head><body><p>Order</p></body></html>";

    const [block] = collectHtmlMockBlocks(mockWithCss(html));

    expect(block?.html).toBe(
      `<html><head><title>Checkout</title><style>\n${CSS_WITH_REPLACEMENT_PATTERNS}\n</style>\n</head><body><p>Order</p></body></html>`,
    );
  });

  it("keeps replacement patterns in CSS inserted before </BODY>, and the tag's case", () => {
    const html = "<BODY><p>Order</p></BODY>";

    const [block] = collectHtmlMockBlocks(mockWithCss(html));

    expect(block?.html).toBe(
      `<BODY><p>Order</p><style>\n${CSS_WITH_REPLACEMENT_PATTERNS}\n</style>\n</BODY>`,
    );
  });
});
