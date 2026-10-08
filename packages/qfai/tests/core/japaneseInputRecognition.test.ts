import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  collectDeclaredTcIds,
  collectDeclaredUsIds,
  collectHeadingTcIdsFrom,
  collectTcLevels,
} from "../../src/core/atddTraceability.js";
import { validateDiscussionVisuals } from "../../src/core/validators/discussionVisuals.js";
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
// The screen word followed by the katakana for "mock" is the Japanese phrase for "screen mock".
const SCREEN_MOCK_PHRASE = "\u753B\u9762\u30E2\u30C3\u30AF";
// U+30E2 U+30C3 U+30AF is the Japanese word for "mock", used here after "HTML/CSS" and "HTML+CSS".
const MOCK_WORD = "\u30E2\u30C3\u30AF";

describe("a discussion pack written in Japanese is still checked for its mock fallback", () => {
  async function storyWorkshopIssues(storyText: string) {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-japanese-visuals-"));
    try {
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260303101010101");
      await mkdir(packDir, { recursive: true });
      await writeFile(
        path.join(packDir, "01_Context.md"),
        ["# 01 Context", "", "```mermaid", "flowchart TD", "  A --> B", "```", ""].join("\n"),
        "utf-8",
      );
      await writeFile(path.join(packDir, "03_Story-Workshop.md"), storyText, "utf-8");
      return await validateDiscussionVisuals(root);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }

  it.each([
    ["screen mock", SCREEN_MOCK_PHRASE],
    ["HTML/CSS mock", `HTML/CSS${MOCK_WORD}`],
    ["HTML+CSS mock", `HTML+CSS${MOCK_WORD}`],
  ])(
    "reports QFAI-VIS-002 for the Japanese spelling of %s with no fallback artifact",
    async (_name, phrase) => {
      const issues = await storyWorkshopIssues(
        ["# 03 Story Workshop", "", `The order page uses the ${phrase} direction.`, ""].join("\n"),
      );

      expect(issues.find((item) => item.code === "QFAI-VIS-002")?.severity).toBe("info");
    },
  );
});

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

describe("a test case catalogue written with full-width colons is still read", () => {
  it("declares a TC heading that follows its id with a full-width colon", () => {
    const text = [`## TC-0001-0002${FULL_WIDTH_COLON} order is placed`, "", "- Level: L4", ""].join(
      "\n",
    );

    expect(collectHeadingTcIdsFrom(text)).toEqual(["TC-0001-0002"]);
    expect(collectDeclaredTcIds(text).has("TC-0001-0002")).toBe(true);
  });

  it("reads the Level meta line of a TC block when the colon is full-width", () => {
    const text = [
      `## TC-0001-0002${FULL_WIDTH_COLON} order is placed`,
      "",
      `- Level${FULL_WIDTH_COLON} L4`,
      "",
    ].join("\n");

    expect(collectTcLevels(text).get("TC-0001-0002")).toBe("l4");
  });
});

describe("a user story catalogue written with full-width colons is still read", () => {
  it("declares a US heading that follows its id with a full-width colon", () => {
    const text = `## US-0001-0002${FULL_WIDTH_COLON} place an order\n`;

    expect(collectDeclaredUsIds(text).has("US-0001-0002")).toBe(true);
  });

  it("declares a catalogue list item that follows its id with a full-width colon", () => {
    const text = `- US-0001-0003${FULL_WIDTH_COLON} cancel an order\n`;

    expect(collectDeclaredUsIds(text).has("US-0001-0003")).toBe(true);
  });
});
