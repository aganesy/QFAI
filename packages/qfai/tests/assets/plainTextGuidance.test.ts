/**
 * The plain-text duty reaches the agents that write and review screens.
 *
 * The implementation UI guidance holds the one copy of the procedure: a text
 * the user needs stays with its reason, any other is deleted, replaced or
 * moved first. The other writers state the comment and point to that copy; the
 * reviewers judge each reason and the copy UI contracts describe.
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

const PROCEDURE = "skill/qfai-implement/references/ui-affecting.md";
const WRITERS = [
  "skill/qfai-prototyping/references/generator-prompt.md",
  PROCEDURE,
  "agent/fullstack-engineer.md",
];
/** Each writer that defers to the one copy, and the file that names its path for it. */
const POINTERS = [
  ["agent/fullstack-engineer.md", "agent/fullstack-engineer.md"],
  ["skill/qfai-prototyping/references/generator-prompt.md", "step/prototyping-loop/STEP.md"],
] as const;
const REVIEWERS = [
  "skill/qfai-prototyping/references/reviewer-prompt.md",
  "agent/product-surface-reviewer.md",
];

// QFAI:EX-0001-0297-13
describe("the plain-text duty reaches writers and reviewers", () => {
  it.each(WRITERS)("%s states the comment form", async (file) => {
    const text = await read(file);
    expect(text).toContain("qfai-text:");
    expect(text).toContain("why=");
    expect(text).toContain("without=");
  });

  it("keeps the one copy of the procedure, a needed text first", async () => {
    const text = await read(PROCEDURE);
    expect(text).toContain("the one copy of the procedure");
    expect(text).toMatch(
      /is needed\. Keep it and write its reason\.[\s\S]*?^ {2}1\. Delete[\s\S]*?^ {2}2\. Replace[\s\S]*?^ {2}3\. Move[\s\S]*?^ {2}4\. If none of these works/m,
    );
  });

  it.each(POINTERS)("%s defers to the one copy, which %s names", async (file, namer) => {
    expect(await read(namer)).toContain(`.qfai/assistant/${PROCEDURE}`);
    const text = await read(file);
    expect(text).toMatch(/a text the user needs[\s\S]*?stays with its reason/);
    expect(text).not.toMatch(/^\s*1\. Delete it\./m);
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
