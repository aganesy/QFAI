/**
 * The plain-text duty reaches the agents that write and review screens.
 *
 * The writers state the `qfai-text` comment and the four remedies, deletion
 * first; the reviewers judge each reason and the copy UI contracts describe.
 * No shipped guidance still says validate checks `supplements` or `structure`.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import fg from "fast-glob";
import { describe, expect, it } from "vitest";

const assistant = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "assets",
  "init",
  ".qfai",
  "assistant",
);
const read = (relative: string): Promise<string> =>
  readFile(path.join(assistant, ...relative.split("/")), "utf-8");

const WRITERS = [
  "skill/qfai-prototyping/references/generator-prompt.md",
  "skill/qfai-implement/references/ui-affecting.md",
  "agent/fullstack-engineer.md",
];
const REVIEWERS = [
  "skill/qfai-prototyping/references/reviewer-prompt.md",
  "agent/product-surface-reviewer.md",
];

// QFAI:EX-0001-0297-13
describe("the plain-text duty reaches writers and reviewers", () => {
  it.each(WRITERS)("%s states the comment and the remedies, deletion first", async (file) => {
    const text = await read(file);
    expect(text).toContain("qfai-text:");
    expect(text).toContain("why=");
    expect(text).toContain("without=");
    expect(text).toMatch(
      /^1\. Delete[\s\S]*?^2\. Replace[\s\S]*?^3\. Move[\s\S]*?^4\. Only then write the reason/m,
    );
  });

  it.each(REVIEWERS)("%s reviews each reason and the copy a contract describes", async (file) => {
    const text = await read(file);
    expect(text).toContain("qfai-text");
    expect(text).toContain("supplements");
  });

  it("leaves no shipped statement that validate checks contract copy or a rendered dump", async () => {
    const files = await fg("**/*.{md,yaml}", { cwd: assistant });
    const offenders: string[] = [];
    for (const file of files) {
      const text = await readFile(path.join(assistant, file), "utf-8");
      if (/QFAI-CONTRACT-04[3-8]|--rendered\b/.test(text)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });
});
