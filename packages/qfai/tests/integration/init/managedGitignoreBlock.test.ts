/**
 * Integration: the managed `.gitignore` block keeps the evidence directory local, and a rerun
 * rebuilds a block that lacks a governance negation without duplicating it.
 *
 * `git check-ignore` is the oracle. The block's single source is `core/gitignore.ts`, so no case
 * counts its lines.
 */
// QFAI:AC-0001-0033-02
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  QFAI_GITIGNORE_GOVERNANCE_NEGATIONS,
  QFAI_GITIGNORE_MARKER,
} from "../../../src/core/gitignore.js";
import { initQuietly, isIgnored, withEmptyRepo, withInstall } from "./upgradeStates.js";

const EVIDENCE_PATH = ".qfai/evidence/workflow/x/summary.json";

const occurrences = (text: string, line: string): number =>
  text.split(/\r?\n/).filter((candidate) => candidate === line).length;

const readGitignore = (root: string): Promise<string> =>
  readFile(path.join(root, ".gitignore"), "utf-8");

// QFAI:EX-0001-0033-03
// QFAI:EX-0001-0033-07
describe("the managed gitignore block", () => {
  it("Fresh init ignores the evidence records", async () => {
    await withEmptyRepo(async (root) => {
      await initQuietly(root);
      expect(isIgnored(root, EVIDENCE_PATH), EVIDENCE_PATH).toBe(true);
      expect(occurrences(await readGitignore(root), QFAI_GITIGNORE_MARKER)).toBe(1);
    });
  });

  it("A block missing a governance negation is rebuilt once, then left alone", async () => {
    await withInstall(["block-missing-negation"], async (root) => {
      await initQuietly(root);
      const rebuilt = await readGitignore(root);
      expect(occurrences(rebuilt, QFAI_GITIGNORE_MARKER)).toBe(1);
      for (const negation of QFAI_GITIGNORE_GOVERNANCE_NEGATIONS) {
        expect(occurrences(rebuilt, negation), negation).toBe(1);
      }
      expect(isIgnored(root, EVIDENCE_PATH), EVIDENCE_PATH).toBe(true);

      await initQuietly(root);
      expect(await readGitignore(root)).toBe(rebuilt);
    });
  });

  it("The same block in a CRLF .gitignore", async () => {
    await withInstall(["block-missing-negation"], async (root) => {
      const file = path.join(root, ".gitignore");
      await writeFile(file, (await readFile(file, "utf-8")).replace(/\r?\n/g, "\r\n"), "utf-8");
      await initQuietly(root);

      const lines = (await readFile(file, "utf-8")).split(/\r?\n/).filter((line) => line !== "");
      expect(lines.filter((line) => line === QFAI_GITIGNORE_MARKER)).toHaveLength(1);
      const duplicated = lines.filter((line, index) => lines.indexOf(line) !== index);
      expect(duplicated, "no block line is duplicated").toEqual([]);
      expect(isIgnored(root, EVIDENCE_PATH), EVIDENCE_PATH).toBe(true);
    });
  });
});
