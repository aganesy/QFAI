/**
 * The Japanese locale reference.
 *
 * A Japanese product met full-width search, IME Enter, yen and date formats,
 * corporate-number input, font loading and mid-word line breaks one screen at a
 * time as bugs. One shipped reference settles them, and the contract and
 * implementation steps read it when the product's locale is Japanese.
 */

import { access, readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const assistant = path.join(repoRoot, "packages/qfai/assets/init/.qfai/assistant");
const CITATION = ".qfai/assistant/rule/references/locale/ja.md";

async function read(relative: string): Promise<string> {
  return readFile(path.join(assistant, relative), "utf-8");
}

function flat(text: string): string {
  return text.replace(/\s+/g, " ");
}

// QFAI:EX-0001-0314-01
describe("the Japanese locale reference covers each settled point", () => {
  it("has one section per point", async () => {
    const headings = (await read("rule/references/locale/ja.md"))
      .split(/\r?\n/)
      .filter((line) => line.startsWith("## "));
    expect(headings).toEqual([
      "## Input normalisation",
      "## IME composition",
      "## Currency and numbers",
      "## Dates and eras",
      "## Identifier fields",
      "## Line breaking",
      "## Line height",
      "## Fonts",
    ]);
  });

  it("states the rule each section settles", async () => {
    const text = flat(await read("rule/references/locale/ja.md"));
    for (const phrase of [
      '`value.normalize("NFKC")` on both sides',
      "returns early while `event.isComposing` is true",
      "`event.keyCode === 229`",
      'new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" })',
      'timeZone: "Asia/Tokyo"',
      "`ja-JP-u-ca-japanese`",
      "`7000012050002` is valid",
      "`word-break: auto-phrase`",
      'new Intl.Segmenter("ja", { granularity: "word" })',
      "`line-height: 1.7`",
      "`font-display: swap`",
      "`9 - (sum of digit_n * (n is odd ? 1 : 2)) mod 9`",
      "Load only subsets",
      "`word-break: keep-all`",
      "runs once more on `compositionend`",
      "has 10 or 11 digits",
      "full-width yen sign U+FFE5",
    ]) {
      expect(text, phrase).toContain(phrase);
    }
  });

  it("gives a corporate-number example that passes its own check digit rule", () => {
    const digits = [..."7000012050002"].map(Number);
    const [check, ...body] = digits;
    const sum = body
      .reverse()
      .reduce((total, digit, index) => total + digit * ((index + 1) % 2 === 1 ? 1 : 2), 0);
    expect(9 - (sum % 9)).toBe(check);
  });
});

// QFAI:EX-0001-0314-02
describe("the contract and implementation steps read the locale reference", () => {
  it("names it in each step's Reads, and the cited file exists", async () => {
    for (const step of ["step/sdd-contract/STEP.md", "step/implement-tdd/STEP.md"]) {
      const body = await read(step);
      const reads = body.split(/^## /m).find((part) => /^Reads\r?\n/.test(part)) ?? "";
      expect(flat(reads), step).toContain(`\`${CITATION}\` for Japanese`);
      expect(flat(reads), step).toContain("states the product's locale");
    }
    await expect(
      access(path.join(repoRoot, "packages/qfai/assets/init", CITATION)),
    ).resolves.toBeUndefined();
  });
});
