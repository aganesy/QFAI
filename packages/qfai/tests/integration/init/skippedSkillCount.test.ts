/**
 * Integration: a plain upgrade counts the shipped skills it skipped because the project's copy
 * differs from the template, ignoring line endings, and names the command that updates them.
 */
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runInit } from "../../../src/cli/commands/init.js";
import { captureStdout } from "../../helpers/stdout.js";
import { removeTempTree } from "../../helpers/tempTree.js";

const EDITED_SKILL = ".qfai/assistant/skill/qfai-verify/SKILL.md";
const CRLF_SKILL = ".qfai/assistant/skill/qfai-configure/SKILL.md";

async function initQuietly(root: string, force = false): Promise<string> {
  return captureStdout(() => runInit({ dir: root, force, dryRun: false, yes: true }));
}

describe("the skipped skills are counted", () => {
  it("counts a skipped skill once and leaves a CRLF-only copy out", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai init skill count-"));
    try {
      await initQuietly(root);
      const edited = path.join(root, EDITED_SKILL);
      const crlf = path.join(root, CRLF_SKILL);
      await writeFile(edited, `${await readFile(edited, "utf-8")}\nEdited by the project.\n`);
      await writeFile(crlf, (await readFile(crlf, "utf-8")).replace(/\r?\n/g, "\r\n"));
      const before = [await readFile(edited), await readFile(crlf)];

      const report = await initQuietly(root);

      expect([await readFile(edited), await readFile(crlf)]).toEqual(before);
      const lines = report.split("\n").filter((line) => /shipped skills? differs?/.test(line));
      expect(lines, "one line counts the skipped skills").toHaveLength(1);
      const [line = ""] = lines;
      expect(line).toMatch(/\b1 shipped skill differs\b/);
      expect(line).toContain("`qfai init --force`");
      expect(line).toMatch(/replaces it with the shipped version, overwriting local edits/);
    } finally {
      await removeTempTree(root);
    }
  });

  it("prints no count under --force, which replaces the edited skill", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai init skill count-"));
    try {
      await initQuietly(root);
      const edited = path.join(root, EDITED_SKILL);
      const shipped = await readFile(edited, "utf-8");
      await writeFile(edited, `${shipped}\nEdited by the project.\n`);

      const report = await initQuietly(root, true);

      expect(report).not.toMatch(/shipped skills? differs?/);
      expect(await readFile(edited, "utf-8")).toBe(shipped);
    } finally {
      await removeTempTree(root);
    }
  });
});
