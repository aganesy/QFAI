/**
 * A register ID that the union merge driver left on two rows.
 *
 * The two registers merge with the union driver, which keeps both versions of
 * a row that both sides edited. The full validation in the build job reports
 * the duplicate, but only minutes into the run; this check reports it in the
 * scans lane and in the catch-up helper.
 */
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { createSymlinkFixture } from "../helpers/symlinkFixture.js";

// tests/scripts/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const SCRIPT = path.join(repoRoot, "scripts", "check-register-duplicates.mjs");
const DECISIONS = path.join(".qfai", "spec", "decisions.md");
const QUESTIONS = path.join(".qfai", "spec", "open-questions.md");

const decisions = (rows: string[]): string =>
  [
    "# Decisions",
    "",
    "## Decisions",
    "",
    "| ID | Content | Approach |",
    "| --- | --- | --- |",
    ...rows,
    "",
  ].join("\n");

const questions = (rows: string[]): string =>
  [
    "# Open Questions",
    "",
    "## Open Questions",
    "",
    "| ID | Content | Approach |",
    "| --- | --- | --- |",
    ...rows,
    "",
  ].join("\n");

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function treeWith(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-register-duplicates-"));
  tempDirs.push(root);
  for (const [relative, body] of Object.entries(files)) {
    const absolute = path.join(root, relative);
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, body, "utf-8");
  }
  return root;
}

function check(root: string): { status: number; output: string } {
  const result = spawnSync(process.execPath, [SCRIPT], { cwd: root, encoding: "utf-8" });
  return { status: result.status ?? -1, output: (result.stdout ?? "") + (result.stderr ?? "") };
}

describe("check-register-duplicates", () => {
  // QFAI:EX-0002-0025-24
  it("fails on a register ID defined on two rows, naming the ID, the register and both lines", async () => {
    const root = await treeWith({
      [DECISIONS]: decisions([
        "| DEC-0001 | first | - Approach |",
        "| DEC-0002 | second | - Approach |",
        "| DEC-0003 | third | - Approach |",
        "| DEC-0002 | second | - Approach |",
      ]),
      [QUESTIONS]: questions(["| OQ-0001 | open | - |", "| OQ-0002 | open | - |"]),
    });

    const run = check(root);

    expect(run.status, run.output).toBe(1);
    expect(run.output).toContain(
      ".qfai/spec/decisions.md:8,10: DEC-0002 is defined more than once",
    );
    expect(run.output).not.toContain("DEC-0001");
    expect(run.output).not.toContain("OQ-");
    expect(run.output).toContain("delete that row and append it again under a new timestamp ID");
  });

  // QFAI:EX-0002-0025-24
  it("fails on an open-question ID defined twice", async () => {
    const root = await treeWith({
      [DECISIONS]: decisions(["| DEC-0001 | first | - Approach |"]),
      [QUESTIONS]: questions(["| OQ-0007 | open | - |", "| OQ-0007 | resolved | - |"]),
    });

    const run = check(root);

    expect(run.status, run.output).toBe(1);
    expect(run.output).toContain(
      ".qfai/spec/open-questions.md:7,8: OQ-0007 is defined more than once",
    );
  });

  // QFAI:EX-0002-0025-24
  it("passes two registers whose IDs are unique, ignoring header, prose and malformed ID cells", async () => {
    const root = await treeWith({
      [DECISIONS]:
        decisions([
          "| DEC-0001 | supersedes nothing | - Approach |",
          "| DEC-0002 | cites DEC-0001 in its content | - Approach |",
          "| DEC-12 | malformed, left to validation | - Approach |",
          "| DEC-12 | malformed, left to validation | - Approach |",
        ]) + "\nDEC-0001 is cited in prose.\n- DEC-0002 is cited in a list.\n",
      [QUESTIONS]: questions(["| OQ-0001 | see DEC-0002 | - |"]),
    });

    const run = check(root);

    expect(run.status, run.output).toBe(0);
    expect(run.output).toContain(
      "No register ID is defined more than once (3 rows in 2 registers).",
    );
  });

  // QFAI:EX-0002-0025-24
  it("fails closed when a register cannot be read", async () => {
    const root = await treeWith({
      [DECISIONS]: decisions(["| DEC-0001 | first | - Approach |"]),
    });

    const run = check(root);

    expect(run.status, run.output).toBe(2);
    expect(run.output).toContain(".qfai/spec/open-questions.md could not be read");
  });

  describe("with decision pages", () => {
    const PAGE_ONE = path.join(".qfai", "spec", "decisions", "page-0001.md");
    const PAGE_TWO = path.join(".qfai", "spec", "decisions", "page-0002.md");
    const row = (id: string): string => `| ${id} | text | - Approach |`;

    // QFAI:EX-0002-0025-24
    it("fails on an ID defined in two pages, naming both pages and lines", async () => {
      const root = await treeWith({
        [DECISIONS]: decisions([row("DEC-0003")]),
        [QUESTIONS]: questions(["| OQ-0001 | open | - |"]),
        [PAGE_ONE]: decisions([row("DEC-0001"), row("DEC-0002")]),
        [PAGE_TWO]: decisions([row("DEC-0004"), row("DEC-0001")]),
      });

      const run = check(root);

      expect(run.status, run.output).toBe(1);
      expect(run.output).toContain(
        ".qfai/spec/decisions/page-0001.md:7 and .qfai/spec/decisions/page-0002.md:8: DEC-0001 is defined more than once",
      );
      expect(run.output).not.toContain("DEC-0002");
      expect(run.output).not.toContain("DEC-0003");
    });

    // QFAI:EX-0002-0025-24
    it("fails on an ID defined in a page and in the root tail", async () => {
      const root = await treeWith({
        [DECISIONS]: decisions([row("DEC-0009"), row("DEC-0002")]),
        [QUESTIONS]: questions(["| OQ-0001 | open | - |"]),
        [PAGE_ONE]: decisions([row("DEC-0001"), row("DEC-0002")]),
      });

      const run = check(root);

      expect(run.status, run.output).toBe(1);
      expect(run.output).toContain(
        ".qfai/spec/decisions.md:8 and .qfai/spec/decisions/page-0001.md:8: DEC-0002 is defined more than once",
      );
    });

    // QFAI:EX-0002-0025-24
    it("fails on an ID defined twice in one page, naming both lines", async () => {
      const root = await treeWith({
        [DECISIONS]: decisions([row("DEC-0009")]),
        [QUESTIONS]: questions(["| OQ-0001 | open | - |"]),
        [PAGE_ONE]: decisions([row("DEC-0001"), row("DEC-0001")]),
      });

      const run = check(root);

      expect(run.status, run.output).toBe(1);
      expect(run.output).toContain(
        ".qfai/spec/decisions/page-0001.md:7,8: DEC-0001 is defined more than once",
      );
    });

    // QFAI:EX-0002-0025-24
    it("fails on a timestamp ID in a page and in the root, and passes the pair once unique", async () => {
      const files = {
        [QUESTIONS]: questions(["| OQ-20261105120000 | open | - |"]),
        [PAGE_ONE]: decisions([row("DEC-20261105120000")]),
      };
      const duplicate = check(
        await treeWith({ ...files, [DECISIONS]: decisions([row("DEC-20261105120000")]) }),
      );
      expect(duplicate.status, duplicate.output).toBe(1);
      expect(duplicate.output).toContain(
        ".qfai/spec/decisions.md:7 and .qfai/spec/decisions/page-0001.md:7: DEC-20261105120000 is defined more than once",
      );
      const unique = check(
        await treeWith({ ...files, [DECISIONS]: decisions([row("DEC-20261105120001")]) }),
      );
      expect(unique.status, unique.output).toBe(0);
    });

    // QFAI:EX-0002-0025-24
    it("passes unique IDs across the pages and the root, counting every row", async () => {
      const root = await treeWith({
        [DECISIONS]: decisions([row("DEC-0003")]),
        [QUESTIONS]: questions(["| OQ-0001 | open | - |"]),
        [PAGE_ONE]: decisions([row("DEC-0001")]),
        [PAGE_TWO]: decisions([row("DEC-0002")]),
        [path.join(".qfai", "spec", "decisions", "notes.md")]: decisions([row("DEC-0001")]),
      });

      const run = check(root);

      expect(run.status, run.output).toBe(0);
      expect(run.output).toContain(
        "No register ID is defined more than once (4 rows in 2 registers).",
      );
    });

    // QFAI:EX-0002-0025-24
    it("fails closed when a page cannot be read", async () => {
      const root = await treeWith({
        [DECISIONS]: decisions([row("DEC-0003")]),
        [QUESTIONS]: questions(["| OQ-0001 | open | - |"]),
      });
      await mkdir(path.join(root, PAGE_ONE), { recursive: true });

      const run = check(root);

      expect(run.status, run.output).toBe(2);
      expect(run.output).toContain(".qfai/spec/decisions/page-0001.md could not be read");
    });

    // QFAI:EX-0002-0025-24
    it("fails closed on a pages directory that is a link, reading nothing through it", async (context) => {
      const root = await treeWith({
        [DECISIONS]: decisions([row("DEC-0001")]),
        [QUESTIONS]: questions(["| OQ-0001 | open | - |"]),
        [path.join("elsewhere", "page-0001.md")]: decisions([row("DEC-0001")]),
      });
      const linked = await createSymlinkFixture(
        path.join(root, "elsewhere"),
        path.join(root, ".qfai", "spec", "decisions"),
        process.platform === "win32" ? "junction" : "dir",
      );
      if (!linked) {
        context.skip();
        return;
      }

      const run = check(root);

      expect(run.status, run.output).toBe(2);
      expect(run.output).toContain(".qfai/spec/decisions could not be read");
      expect(run.output).not.toContain("DEC-0001 is defined more than once");
    });

    // QFAI:EX-0002-0025-24
    it("fails closed on a page that is a link, reading nothing through it", async (context) => {
      const root = await treeWith({
        [DECISIONS]: decisions([row("DEC-0001")]),
        [QUESTIONS]: questions(["| OQ-0001 | open | - |"]),
        [path.join("elsewhere", "page.md")]: decisions([row("DEC-0001")]),
      });
      await mkdir(path.join(root, ".qfai", "spec", "decisions"), { recursive: true });
      const linked = await createSymlinkFixture(
        path.join(root, "elsewhere", "page.md"),
        path.join(root, PAGE_ONE),
        "file",
      );
      if (!linked) {
        context.skip();
        return;
      }

      const run = check(root);

      expect(run.status, run.output).toBe(2);
      expect(run.output).toContain(".qfai/spec/decisions/page-0001.md could not be read");
      expect(run.output).not.toContain("DEC-0001 is defined more than once");
    });

    // QFAI:EX-0002-0025-24
    it("fails closed on a pages path that is a plain file", async () => {
      const root = await treeWith({
        [DECISIONS]: decisions([row("DEC-0001")]),
        [QUESTIONS]: questions(["| OQ-0001 | open | - |"]),
        [path.join(".qfai", "spec", "decisions")]: decisions([row("DEC-0001")]),
      });

      const run = check(root);

      expect(run.status, run.output).toBe(2);
      expect(run.output).toContain(".qfai/spec/decisions could not be read");
    });
  });

  // QFAI:EX-0002-0025-29
  it("passes once the branch appends its own colliding row again under a new ID", async () => {
    const base = "| DEC-20261105120000 | Base decision | Kept on the default branch |";
    const own = (id: string): string => `| ${id} | Branch decision | Kept |`;
    const citing = (id: string): string =>
      `| DEC-20261105120200 | Later branch decision | Narrows ${id} |`;
    const stopped = await treeWith({
      [DECISIONS]: decisions([base, own("DEC-20261105120000"), citing("DEC-20261105120000")]),
      [QUESTIONS]: questions([]),
    });
    const first = check(stopped);
    expect(first.status, first.output).toBe(1);
    expect(first.output).toContain("DEC-20261105120000 is defined more than once");
    expect(first.output).toMatch(/row your branch added/);
    expect(first.output).toMatch(/updating each citation your branch added/);
    expect(first.output).toMatch(/Never renumber or edit a row the default branch holds/);

    const repaired = await treeWith({
      [DECISIONS]: decisions([base, citing("DEC-20261105120107"), own("DEC-20261105120107")]),
      [QUESTIONS]: questions([]),
    });
    const second = check(repaired);
    expect(second.status, second.output).toBe(0);
    expect(await readFile(path.join(repaired, DECISIONS), "utf-8")).toContain(base);
  });

  // QFAI:EX-0002-0025-24
  it("runs in the scans lane of the pull request lint job", async () => {
    const manifest = JSON.parse(await readFile(path.join(repoRoot, "package.json"), "utf-8")) as {
      scripts: Record<string, string>;
    };

    expect(manifest.scripts["ci:lint:scans"]).toContain(
      "node ./scripts/check-register-duplicates.mjs",
    );
  });
});
