/**
 * Integration: the managed `.gitignore` block ignores run state and keeps run evidence tracked.
 *
 * `git check-ignore` is the oracle. The block's single source is `core/gitignore.ts`, so no case
 * counts its lines.
 */
// QFAI:SPEC-0003:TC-0003-0059
// QFAI:SPEC-0003:TC-0003-0060
import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { QFAI_GITIGNORE_MARKER } from "../../../src/core/gitignore.js";
import { initQuietly, isIgnored, withEmptyRepo, withInstall } from "./upgradeStates.js";

const RUN_PATH = ".qfai/runs/x";
const EVIDENCE_PATH = ".qfai/evidence/workflow/x/summary.json";

const occurrences = (text: string, line: string): number =>
  text.split(/\r?\n/).filter((candidate) => candidate === line).length;

const readGitignore = (root: string): Promise<string> =>
  readFile(path.join(root, ".gitignore"), "utf-8");

describe("the managed gitignore block", () => {
  it("TC-0003-0059: Fresh init ignores run state and keeps run evidence tracked", async () => {
    await withEmptyRepo(async (root) => {
      await initQuietly(root);
      expect(isIgnored(root, RUN_PATH), RUN_PATH).toBe(true);
      expect(isIgnored(root, EVIDENCE_PATH), EVIDENCE_PATH).toBe(false);
      expect(occurrences(await readGitignore(root), QFAI_GITIGNORE_MARKER)).toBe(1);
    });
  });

  it("TC-0003-0060: Upgrade over the previous managed block, then a rerun", async () => {
    await withInstall(["older-gitignore"], async (root) => {
      await initQuietly(root);
      const upgraded = await readGitignore(root);
      expect(occurrences(upgraded, QFAI_GITIGNORE_MARKER)).toBe(1);
      expect(occurrences(upgraded, ".qfai/runs/")).toBe(1);
      expect(occurrences(upgraded, "!.qfai/evidence/workflow/")).toBe(1);
      expect(isIgnored(root, RUN_PATH), RUN_PATH).toBe(true);
      expect(isIgnored(root, EVIDENCE_PATH), EVIDENCE_PATH).toBe(false);

      await initQuietly(root);
      expect(await readGitignore(root)).toBe(upgraded);
    });
  });
});
