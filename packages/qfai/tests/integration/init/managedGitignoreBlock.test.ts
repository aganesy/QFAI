/**
 * Integration: the managed `.gitignore` block ignores run state and keeps run evidence tracked.
 *
 * `git check-ignore` is the oracle. The block's single source is `core/gitignore.ts`, so no case
 * counts its lines.
 */
// QFAI:AC-0001-0033-03
// QFAI:EX-0001-0033-05
// QFAI:EX-0001-0033-06
// QFAI:EX-0001-0033-07
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { QFAI_GITIGNORE_MARKER } from "../../../src/core/gitignore.js";
import { initQuietly, isIgnored, withEmptyRepo, withInstall } from "./upgradeStates.js";

const RUN_PATH = ".qfai/run/x";
const EVIDENCE_PATH = ".qfai/evidence/workflow/x/summary.json";

const occurrences = (text: string, line: string): number =>
  text.split(/\r?\n/).filter((candidate) => candidate === line).length;

const readGitignore = (root: string): Promise<string> =>
  readFile(path.join(root, ".gitignore"), "utf-8");

function expectRunStateIgnored(root: string): void {
  expect(isIgnored(root, RUN_PATH), RUN_PATH).toBe(true);
  expect(isIgnored(root, EVIDENCE_PATH), EVIDENCE_PATH).toBe(false);
}

describe("the managed gitignore block", () => {
  it("Fresh init ignores run state and keeps run evidence tracked", async () => {
    await withEmptyRepo(async (root) => {
      await initQuietly(root);
      expectRunStateIgnored(root);
      expect(occurrences(await readGitignore(root), QFAI_GITIGNORE_MARKER)).toBe(1);
    });
  });

  it("Upgrade over the previous managed block, then a rerun", async () => {
    await withInstall(["older-gitignore"], async (root) => {
      await initQuietly(root);
      const upgraded = await readGitignore(root);
      expect(occurrences(upgraded, QFAI_GITIGNORE_MARKER)).toBe(1);
      expect(occurrences(upgraded, ".qfai/run/")).toBe(1);
      expect(occurrences(upgraded, "!.qfai/evidence/workflow/")).toBe(1);
      expectRunStateIgnored(root);

      await initQuietly(root);
      expect(await readGitignore(root)).toBe(upgraded);
    });
  });

  it("The previous managed block in a CRLF .gitignore", async () => {
    await withInstall(["older-gitignore"], async (root) => {
      const file = path.join(root, ".gitignore");
      await writeFile(file, (await readFile(file, "utf-8")).replace(/\r?\n/g, "\r\n"), "utf-8");
      await initQuietly(root);

      const lines = (await readFile(file, "utf-8")).split(/\r?\n/).filter((line) => line !== "");
      expect(lines.filter((line) => line === QFAI_GITIGNORE_MARKER)).toHaveLength(1);
      const duplicated = lines.filter((line, index) => lines.indexOf(line) !== index);
      expect(duplicated, "no block line is duplicated").toEqual([]);
      expectRunStateIgnored(root);
    });
  });
});
