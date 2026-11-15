/**
 * A product whose locale is Japanese gets its formats and input rules from the
 * locale reference shipped under `assets/init`, through the two steps that
 * write contracts and build screens, and the repository's own assistant tree
 * carries the same file.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const initRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "assets",
  "init",
);
const CITATION = ".qfai/assistant/rule/references/locale/ja.md";

// QFAI:AC-0001-0314-01
describe("the contract and implementation steps read the Japanese locale reference", () => {
  it("each step cites a reference init ships, covering every settled point", async () => {
    for (const step of [
      ".qfai/assistant/step/sdd-contract/STEP.md",
      ".qfai/assistant/step/implement-tdd/STEP.md",
    ]) {
      const body = await readFile(path.join(initRoot, step), "utf-8");
      expect(body.replace(/\s+/g, " "), step).toContain(`\`${CITATION}\``);
    }
    const reference = await readFile(path.join(initRoot, CITATION), "utf-8");
    const repoRoot = path.resolve(initRoot, "..", "..", "..", "..");
    expect(await readFile(path.join(repoRoot, CITATION), "utf-8")).toBe(reference);
    for (const heading of [
      "Input normalisation",
      "IME composition",
      "Currency and numbers",
      "Dates and eras",
      "Identifier fields",
      "Line breaking",
      "Line height",
      "Fonts",
    ]) {
      expect(reference.split(/\r?\n/), heading).toContain(`## ${heading}`);
    }
  });
});
