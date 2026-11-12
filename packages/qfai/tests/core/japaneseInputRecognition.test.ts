import { describe, expect, it } from "vitest";

import {
  collectHtmlMockBlocks,
  collectScreenMockLabels,
} from "../../src/core/validators/htmlMockBlocks.js";

// An adopter may write specs and discussion packs in Japanese, which the
// repository language rule allows for an adopter's own repository. Each suite
// below pins one place that keeps recognising Japanese input. The Japanese text
// is written as \uXXXX escapes, with a comment beside each saying what it is.

// U+FF1A is the full-width colon.
const FULL_WIDTH_COLON = "\uFF1A";
// U+753B U+9762 is the Japanese word for "screen".
const SCREEN_WORD = "\u753B\u9762";

describe("an HTML mock label written in Japanese is still collected", () => {
  it("reads a heading that uses the Japanese word for screen and a full-width colon", () => {
    const labels = collectScreenMockLabels(`## ${SCREEN_WORD}${FULL_WIDTH_COLON}Checkout\n`);

    expect(labels).toEqual(["Checkout"]);
  });

  it("reads a heading that uses the Japanese word for screen and an ASCII colon", () => {
    const labels = collectScreenMockLabels(`### ${SCREEN_WORD}: Checkout\n`);

    expect(labels).toEqual(["Checkout"]);
  });

  it("reads an English heading that uses a full-width colon", () => {
    const labels = collectScreenMockLabels(`## Screen${FULL_WIDTH_COLON} Checkout\n`);

    expect(labels).toEqual(["Checkout"]);
  });

  it("opens an HTML+CSS Visual Mock block at a heading that ends in a full-width colon", () => {
    const content = [
      `## HTML+CSS Visual Mock${FULL_WIDTH_COLON} Checkout`,
      "",
      '<section class="screen">Order form</section>',
      "",
    ].join("\n");

    const blocks = collectHtmlMockBlocks(content);

    expect(blocks.map((block) => block.html)).toEqual([
      '<section class="screen">Order form</section>',
    ]);
  });
});
