/**
 * Integration: init prepends the entry directive, which sends a first free-text change request to
 * `qfai-run`, to `AGENTS.md` and `CLAUDE.md` when no operative copy exists, and never to the
 * Copilot instructions. The oracle is the directive's place and the skill it names, never its
 * wording.
 */
// QFAI:SPEC-0003:TC-0003-0066
// QFAI:SPEC-0003:TC-0003-0067
// QFAI:SPEC-0003:TC-0003-0068
// QFAI:SPEC-0003:TC-0003-0069
// QFAI:SPEC-0003:TC-0003-0070
import { lstat, readFile, readlink, symlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getInitAssetsDir } from "../../../src/cli/lib/assets.js";
import { initQuietly, withEmptyRepo, withInstall } from "./upgradeStates.js";

const ENTRY_POINTS = ["AGENTS.md", "CLAUDE.md"];
const COPILOT = ".github/copilot-instructions.md";
const PROJECT_TEXT = "# Project rules\n\nKeep every original byte.\n";

const namesRun = (line: string): boolean => line.includes("`qfai-run`");
const isReviewDirective = (line: string): boolean =>
  line.startsWith("Read `REVIEW.md` before reviewing a pull request");

/** The directive line as the release ships it, for a fixture that must hold a copy. */
async function shippedDirective(): Promise<string> {
  const template = await readFile(path.join(getInitAssetsDir(), "root", "AGENTS.md"), "utf-8");
  const line = template.split(/\r?\n/).find(namesRun);
  expect(line, "the shipped AGENTS.md carries the entry directive").toBeDefined();
  return line ?? "";
}

async function read(root: string, name: string): Promise<string> {
  return readFile(path.join(root, name), "utf-8");
}

async function writeEntryPoints(root: string, text: string): Promise<void> {
  for (const name of ENTRY_POINTS) await writeFile(path.join(root, name), text, "utf-8");
}

describe("the entry directive", () => {
  it("TC-0003-0066: Fresh init: directive in AGENTS.md and CLAUDE.md, not Copilot", async () => {
    await withEmptyRepo(async (root) => {
      await initQuietly(root);
      for (const name of ENTRY_POINTS) {
        const lines = (await read(root, name)).split(/\r?\n/);
        expect(namesRun(lines[0] ?? ""), `${name} begins with the directive`).toBe(true);
        expect(lines.filter(namesRun), `${name} holds one directive`).toHaveLength(1);
      }
      const copilot = (await read(root, COPILOT)).split(/\r?\n/);
      expect(copilot.filter(namesRun), "the Copilot instructions hold none").toEqual([]);
    });
  });

  it("TC-0003-0067: Directive prepended to existing CRLF entry points, bytes kept", async () => {
    await withEmptyRepo(async (root) => {
      const original = PROJECT_TEXT.replace(/\n/g, "\r\n");
      await writeEntryPoints(root, original);
      await initQuietly(root);
      for (const name of ENTRY_POINTS) {
        const after = await read(root, name);
        const first = after.slice(0, after.indexOf("\r\n"));
        expect(namesRun(first), `${name} begins with the directive`).toBe(true);
        expect(after.startsWith(`${first}\r\n${original}`), `${name} keeps its bytes`).toBe(true);
      }
    });
  });

  it("TC-0003-0068: Entry directive with and without REVIEW.md", async () => {
    for (const withReview of [false, true]) {
      await withEmptyRepo(async (root) => {
        await writeEntryPoints(root, PROJECT_TEXT);
        if (withReview) await writeFile(path.join(root, "REVIEW.md"), "# Review\n", "utf-8");
        await initQuietly(root);
        for (const name of ENTRY_POINTS) {
          const lines = (await read(root, name)).split(/\r?\n/);
          expect(lines.filter(namesRun), `${name} carries the entry directive`).toHaveLength(1);
          expect(
            lines.filter(isReviewDirective),
            `${name} carries the review directive only with REVIEW.md`,
          ).toHaveLength(withReview ? 1 : 0);
        }
      });
    }
  });

  it("TC-0003-0069: Operative copy on a rerun, and a copy only inside a fence", async () => {
    await withInstall([], async (root) => {
      const before = await Promise.all(ENTRY_POINTS.map((name) => read(root, name)));
      await initQuietly(root);
      expect(await Promise.all(ENTRY_POINTS.map((name) => read(root, name)))).toEqual(before);
    });
    await withEmptyRepo(async (root) => {
      const fence = `\`\`\`md\n${await shippedDirective()}\n\`\`\`\n`;
      await writeFile(path.join(root, "AGENTS.md"), `# Notes\n\n${fence}`, "utf-8");
      await initQuietly(root);
      const after = await read(root, "AGENTS.md");
      expect(namesRun(after.split("\n")[0] ?? ""), "one directive is prepended").toBe(true);
      expect(after.split("\n").filter(namesRun)).toHaveLength(2);
      expect(after, "the fence is unchanged").toContain(`# Notes\n\n${fence}`);
    });
  });

  it("TC-0003-0070: A symlinked AGENTS.md is refused", async () => {
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
