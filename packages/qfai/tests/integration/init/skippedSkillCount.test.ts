/**
 * Integration: a plain upgrade counts the shipped skills it skipped because the project's copy
 * differs from the template, ignoring line endings, and names the command that updates them.
 */
// QFAI:SPEC-0003:TC-0003-0089
import { readFile, writeFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { assistantFile, initQuietly, withInstall } from "./upgradeStates.js";

const EDITED_SKILL = "skills/qfai-verify/SKILL.md";
const CRLF_SKILL = "skills/qfai-configure/SKILL.md";

describe("the skipped skills are counted", () => {
  it("TC-0003-0089: Plain upgrade counts skipped skills; a CRLF-only copy is not one", async () => {
    await withInstall([], async (root) => {
      const edited = assistantFile(root, EDITED_SKILL);
      const crlf = assistantFile(root, CRLF_SKILL);
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
    });
  });
});
