/**
 * Integration: init writes no line into `AGENTS.md` or `CLAUDE.md` that sends a request to
 * `qfai-run`, whether it seeds the file or edits one the project owns, and keeps a line an earlier
 * init wrote as written, without removing or editing it. The review directive is the only line init still prepends.
 */
// QFAI:AC-0001-0196-03
// QFAI:EX-0001-0196-05
// QFAI:EX-0001-0196-06
// QFAI:EX-0001-0196-07
// QFAI:EX-0001-0196-08
// QFAI:EX-0001-0196-09
import { lstat, readFile, readlink, symlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { initQuietly, withEmptyRepo } from "./upgradeStates.js";

const ENTRY_POINTS = ["AGENTS.md", "CLAUDE.md"];
const COPILOT = ".github/copilot-instructions.md";
const PROJECT_TEXT = "# Project rules\n\nKeep every original byte.\n";
// The line that earlier releases seeded, kept as they wrote it.
const EARLIER_LINE =
  "Send a first free-text change request to the `qfai-run` skill, which takes it through `npx qfai workflow` to completion.";

const namesRun = (line: string): boolean => line.includes("`qfai-run`");
const isReviewDirective = (line: string): boolean =>
  line.startsWith("Read `REVIEW.md` before reviewing a pull request");

async function read(root: string, name: string): Promise<string> {
  return readFile(path.join(root, name), "utf-8");
}

async function writeEntryPoints(root: string, text: string): Promise<void> {
  for (const name of ENTRY_POINTS) await writeFile(path.join(root, name), text, "utf-8");
}

/** Plain init over entry points holding `text`; what each file holds afterwards. */
async function entryPointsAfterInit(root: string, text: string): Promise<string[]> {
  await writeEntryPoints(root, text);
  await initQuietly(root);
  return Promise.all(ENTRY_POINTS.map((name) => read(root, name)));
}

describe("the entry line", () => {
  it("Fresh init: no line naming qfai-run in AGENTS.md, CLAUDE.md or Copilot", async () => {
    await withEmptyRepo(async (root) => {
      await initQuietly(root);
      for (const name of [...ENTRY_POINTS, COPILOT]) {
        const lines = (await read(root, name)).split(/\r?\n/);
        expect(lines.filter(namesRun), `${name} holds no such line`).toEqual([]);
      }
      for (const name of ENTRY_POINTS) {
        const first = (await read(root, name)).split(/\r?\n/)[0] ?? "";
        expect(first.startsWith("# "), `${name} opens with its heading`).toBe(true);
      }
    });
  });

  it("Existing CRLF entry points keep every byte", async () => {
    await withEmptyRepo(async (root) => {
      const original = PROJECT_TEXT.replace(/\n/g, "\r\n");
      for (const after of await entryPointsAfterInit(root, original)) {
        expect(after.startsWith(original), "the project's bytes stay first").toBe(true);
        expect(after.split(/\r?\n/).filter(namesRun)).toEqual([]);
      }
    });
  });

  it("No entry line with or without REVIEW.md; the review directive only with it", async () => {
    for (const withReview of [false, true]) {
      await withEmptyRepo(async (root) => {
        await writeEntryPoints(root, PROJECT_TEXT);
        if (withReview) await writeFile(path.join(root, "REVIEW.md"), "# Review\n", "utf-8");
        await initQuietly(root);
        for (const name of ENTRY_POINTS) {
          const lines = (await read(root, name)).split(/\r?\n/);
          expect(lines.filter(namesRun), `${name} carries no entry line`).toEqual([]);
          expect(
            lines.filter(isReviewDirective),
            `${name} carries the review directive only with REVIEW.md`,
          ).toHaveLength(withReview ? 1 : 0);
        }
      });
    }
  });

  it("A line an earlier init wrote stays as it is, on top or inside a fence", async () => {
    await withEmptyRepo(async (root) => {
      const text = `${EARLIER_LINE}\n${PROJECT_TEXT}`;
      for (const after of await entryPointsAfterInit(root, text)) {
        expect(after.startsWith(text), "the earlier line and the project text stay first").toBe(
          true,
        );
        expect(after.split("\n").filter(namesRun)).toHaveLength(1);
      }
      const again = await Promise.all(ENTRY_POINTS.map((name) => read(root, name)));
      await initQuietly(root);
      expect(await Promise.all(ENTRY_POINTS.map((name) => read(root, name)))).toEqual(again);
    });
    await withEmptyRepo(async (root) => {
      const fence = `\`\`\`md\n${EARLIER_LINE}\n\`\`\`\n`;
      await writeFile(path.join(root, "AGENTS.md"), `# Notes\n\n${fence}`, "utf-8");
      await initQuietly(root);
      const after = await read(root, "AGENTS.md");
      expect(after.startsWith(`# Notes\n\n${fence}`), "the fenced copy is unchanged").toBe(true);
      expect(after.split("\n").filter(namesRun)).toHaveLength(1);
    });
  });

  it("An earlier line is kept once when REVIEW.md makes init prepend the review directive", async () => {
    await withEmptyRepo(async (root) => {
      await writeFile(path.join(root, "REVIEW.md"), "# Review\n", "utf-8");
      const text = `${EARLIER_LINE}\n${PROJECT_TEXT}`;
      for (const after of await entryPointsAfterInit(root, text)) {
        const lines = after.split("\n");
        expect(lines.filter(isReviewDirective)).toHaveLength(1);
        expect(lines.filter((line) => line === EARLIER_LINE)).toHaveLength(1);
        expect(after.includes(`${EARLIER_LINE}\n${PROJECT_TEXT}`), "kept as written").toBe(true);
      }
    });
  });

  it("A symlinked AGENTS.md is refused and its target gains no line", async () => {
    await withEmptyRepo(async (root) => {
      const target = path.join(root, "shared.md");
      await writeFile(target, PROJECT_TEXT, "utf-8");
      await symlink("shared.md", path.join(root, "AGENTS.md"), "file");
      const report = await initQuietly(root);

      const refusal = report.split("\n").find((line) => line.includes("AGENTS.md"));
      expect(refusal, "the output names AGENTS.md").toBeDefined();
      expect(refusal).toMatch(/symbolic link/);
      expect((await lstat(path.join(root, "AGENTS.md"))).isSymbolicLink()).toBe(true);
      expect(await readlink(path.join(root, "AGENTS.md"))).toBe("shared.md");
      expect(await readFile(target, "utf-8")).toBe(PROJECT_TEXT);
    });
  });
});
