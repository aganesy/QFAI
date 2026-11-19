import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { legacyLayoutConfig as defaultConfig } from "./legacyLayoutConfig.js";
import { validateHtmlMock } from "../../src/core/validators/htmlMock.js";
import { collectHtmlMockBlocks } from "../../src/core/validators/htmlMockBlocks.js";

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

describe("each HTML mock block is collected once", () => {
  it("collects a fenced mock under the standard mock heading once", () => {
    const content = [
      "## Screen Mock (HTML+CSS)",
      "",
      "```html",
      '<button class="primary">Pay</button>',
      "```",
      "",
    ].join("\n");

    const blocks = collectHtmlMockBlocks(content);

    expect(blocks.map((block) => block.html)).toEqual(['<button class="primary">Pay</button>']);
  });

  it("collects a fenced mock and its adjacent CSS fence under the heading once", () => {
    const content = [
      "## Screen Mock (HTML+CSS)",
      "",
      "```html",
      '<div class="card">Card</div>',
      "```",
      "",
      "```css",
      ".card { color: red; }",
      "```",
      "",
    ].join("\n");

    const blocks = collectHtmlMockBlocks(content);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.html).toContain(".card { color: red; }");
  });

  it("collects a section once when a mock comment sits under the mock heading", () => {
    const content = [
      "## HTML+CSS Visual Mock: List",
      "<!-- Screen Mock: List -->",
      '<div class="list"></div>',
      "",
    ].join("\n");

    const blocks = collectHtmlMockBlocks(content);

    expect(blocks).toHaveLength(1);
  });

  it("keeps each mock comment under one heading as its own block", () => {
    const content = [
      "## Screens",
      "<!-- Screen Mock: A -->",
      '<div data-state="default"></div>',
      "<!-- Screen Mock: B -->",
      '<div data-state="error"></div>',
      "",
    ].join("\n");

    const blocks = collectHtmlMockBlocks(content);

    expect(blocks.map((block) => block.html)).toEqual([
      '<div data-state="default"></div>',
      '<div data-state="error"></div>',
    ]);
  });

  it("keeps two separate fences with identical HTML as two blocks", () => {
    const fence = ["```html", "<p>Same</p>", "```", ""];
    const content = ["## First", "", ...fence, "## Second", "", ...fence].join("\n");

    const blocks = collectHtmlMockBlocks(content);

    expect(blocks.map((block) => block.html)).toEqual(["<p>Same</p>", "<p>Same</p>"]);
  });

  it("still collects inline HTML beside a fence under the mock heading", () => {
    const content = [
      "## Screen Mock (HTML+CSS)",
      "",
      "```html",
      "<p>Fenced</p>",
      "```",
      "",
      "<p>Inline</p>",
      "",
    ].join("\n");

    const blocks = collectHtmlMockBlocks(content);

    expect(blocks.map((block) => block.html)).toEqual(["<p>Fenced</p>", "<p>Inline</p>"]);
  });

  it("reports a finding in a fenced mock under the mock heading once", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-html-mock-once-"));
    tempDirs.push(root);
    const specsDir = path.join(root, ".qfai", "specs");
    await mkdir(specsDir, { recursive: true });
    const md = [
      "## Screen Mock (HTML+CSS)",
      "",
      "```html",
      '<link rel="stylesheet" href="https://cdn.example.com/app.css">',
      "```",
      "",
    ].join("\n");
    await writeFile(path.join(specsDir, "mock.md"), md, "utf-8");

    const issues = await validateHtmlMock(root, "web", defaultConfig);

    expect(issues.filter((item) => item.code === "QFAI-MOCK-002")).toHaveLength(1);
  });
});
