/**
 * Spawn-based tests for `scripts/list-startup-context.mjs`.
 *
 * The script lists what Claude Code reads at launch for a checkout, so a size
 * comparison before and after a change to the always-loaded files can be
 * repeated. The cases build a small tree and read the JSON the script prints.
 */
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// tests/scripts → tests → packages/qfai → packages → repo root
const REPO_ROOT = path.resolve(__dirname, "../../../..");
const SCRIPT = path.join(REPO_ROOT, "scripts/list-startup-context.mjs");

type Listed = { path: string; how: string; lines: number; bytes: number; link?: string };
type Report = {
  listed: Listed[];
  scoped: { path: string; lines: number; bytes: number }[];
  unresolved: { from: string; written: string }[];
  total: { lines: number; bytes: number };
};

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function newTree(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-startup-"));
  tempDirs.push(dir);
  for (const [relative, content] of Object.entries(files)) {
    const target = path.join(dir, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
  }
  return dir;
}

function report(root: string): Report {
  const child = spawnSync(process.execPath, [SCRIPT, "--root", root, "--json"], {
    encoding: "utf-8",
  });
  expect(child.status, child.stderr).toBe(0);
  return JSON.parse(child.stdout) as Report;
}

describe("list-startup-context", () => {
  it("counts the entry file's lines and raw bytes", async () => {
    const root = await newTree({ "CLAUDE.md": "one\ntwo\nthree\n" });
    const { listed, total } = report(root);
    expect(listed).toEqual([{ path: "CLAUDE.md", how: "entry", lines: 3, bytes: 14 }]);
    expect(total).toEqual({ lines: 3, bytes: 14 });
  });

  it("follows an import, once, and ignores one in fenced or inline code", async () => {
    const root = await newTree({
      "CLAUDE.md": [
        "See @docs/a.md for the rules.",
        "Inline `@docs/skipped.md` is code.",
        "```",
        "@docs/skipped.md",
        "```",
        "Again @docs/a.md.",
        "",
      ].join("\n"),
      "docs/a.md": "A, which imports @b.md\n",
      "docs/b.md": "B\n",
      "docs/skipped.md": "never listed\n",
    });
    const { listed } = report(root);
    expect(listed.map((item) => [item.path, item.how])).toEqual([
      ["CLAUDE.md", "entry"],
      ["docs/a.md", "import from CLAUDE.md"],
      ["docs/b.md", "import from docs/a.md"],
    ]);
  });

  it("reads an import cycle once and reports an import that names no file", async () => {
    const root = await newTree({
      "CLAUDE.md": "@a.md and @missing/file.md\n",
      "a.md": "@CLAUDE.md\n",
    });
    const { listed, unresolved } = report(root);
    expect(listed.map((item) => item.path)).toEqual(["CLAUDE.md", "a.md"]);
    expect(unresolved).toEqual([{ from: "CLAUDE.md", written: "missing/file.md" }]);
  });

  it("totals the rules without front matter paths and prints the scoped ones apart", async () => {
    const root = await newTree({
      "AGENTS.md": "entry\n",
      ".claude/rules/always.md": "always\nloaded\n",
      ".claude/rules/nested/deep.md": "deep\n",
      ".claude/rules/scoped.md": "---\npaths:\n  - 'src/**'\n---\nscoped\n",
    });
    const { listed, scoped, total } = report(root);
    expect(listed.map((item) => [item.path, item.how])).toEqual([
      ["AGENTS.md", "entry"],
      [".claude/rules/always.md", "rule"],
      [".claude/rules/nested/deep.md", "rule"],
    ]);
    expect(scoped.map((item) => item.path)).toEqual([".claude/rules/scoped.md"]);
    expect(total.lines).toBe(4);
  });

  it("counts a flattened link by its target, not by its one line", async () => {
    const root = await newTree({
      "CLAUDE.md": "@rules/linked.md\n",
      "rules/linked.md": "../shared/real.md",
      "shared/real.md": "a\nb\nc\nd\n",
    });
    const { listed } = report(root);
    const linked = listed.find((item) => item.path === "rules/linked.md");
    expect(linked?.lines).toBe(4);
    expect(linked?.link).toBe("flattened link -> shared/real.md");
  });

  it("counts a symbolic link by its target", async (ctx) => {
    const root = await newTree({ "shared/real.md": "a\nb\n" });
    try {
      await symlink(path.join(root, "shared", "real.md"), path.join(root, "CLAUDE.md"));
    } catch {
      ctx.skip();
    }
    const { listed } = report(root);
    expect(listed).toEqual([
      { path: "CLAUDE.md", how: "entry", lines: 2, bytes: 4, link: "link -> shared/real.md" },
    ]);
  });

  it("lists AGENTS.md only when neither CLAUDE.md nor CLAUDE.local.md is present", async () => {
    const both = await newTree({ "CLAUDE.md": "c\n", "AGENTS.md": "a\n" });
    expect(report(both).listed.map((item) => item.path)).toEqual(["CLAUDE.md"]);

    const local = await newTree({ "CLAUDE.local.md": "c\n", "AGENTS.md": "a\n" });
    expect(report(local).listed.map((item) => item.path)).toEqual(["CLAUDE.local.md"]);

    const nested = await newTree({ ".claude/CLAUDE.md": "c\n", "AGENTS.md": "a\n" });
    expect(report(nested).listed.map((item) => item.path)).toEqual([".claude/CLAUDE.md"]);

    // A CLAUDE.md that imports AGENTS.md lists it, as an import.
    const imported = await newTree({ "CLAUDE.md": "@AGENTS.md\n", "AGENTS.md": "a\n" });
    expect(report(imported).listed.map((item) => [item.path, item.how])).toEqual([
      ["CLAUDE.md", "entry"],
      ["AGENTS.md", "import from CLAUDE.md"],
    ]);
  });

  it("lists CLAUDE.local.md and .claude/CLAUDE.md as entry files", async () => {
    const root = await newTree({
      "CLAUDE.md": "a\n",
      "CLAUDE.local.md": "b\n",
      ".claude/CLAUDE.md": "c\n",
    });
    expect(report(root).listed.map((item) => [item.path, item.how])).toEqual([
      ["CLAUDE.md", "entry"],
      ["CLAUDE.local.md", "entry"],
      [".claude/CLAUDE.md", "entry"],
    ]);
  });

  it("counts lines and imports in a file with CRLF line ends", async () => {
    const root = await newTree({
      "CLAUDE.md": "one\r\n@docs/a.md\r\n```\r\n@docs/skipped.md\r\n```\r\n",
      "docs/a.md": "A\r\nB\r\n",
      "docs/skipped.md": "never\r\n",
    });
    const { listed } = report(root);
    expect(listed.map((item) => [item.path, item.lines, item.bytes])).toEqual([
      ["CLAUDE.md", 5, 45],
      ["docs/a.md", 2, 6],
    ]);
  });

  it("follows imports five levels deep and no further", async () => {
    const files: Record<string, string> = { "CLAUDE.md": "@f1.md\n" };
    for (let level = 1; level <= 6; level += 1)
      files[`f${String(level)}.md`] = `@f${String(level + 1)}.md\n`;
    files["f7.md"] = "end\n";
    const { listed } = report(await newTree(files));
    expect(listed.map((item) => item.path)).toEqual([
      "CLAUDE.md",
      "f1.md",
      "f2.md",
      "f3.md",
      "f4.md",
      "f5.md",
    ]);
  });

  it("reads a rule behind a symbolic link to a directory", async (ctx) => {
    const root = await newTree({
      "AGENTS.md": "x\n",
      "shared/linked.md": "l\n",
    });
    await mkdir(path.join(root, ".claude", "rules"), { recursive: true });
    try {
      await symlink(
        path.join(root, "shared"),
        path.join(root, ".claude", "rules", "team"),
        "junction",
      );
    } catch {
      ctx.skip();
    }
    const { listed } = report(root);
    expect(listed.map((item) => item.path)).toEqual(["AGENTS.md", ".claude/rules/team/linked.md"]);
  });

  it("counts an empty file as no lines", async () => {
    const root = await newTree({ "CLAUDE.md": "" });
    expect(report(root).listed).toEqual([{ path: "CLAUDE.md", how: "entry", lines: 0, bytes: 0 }]);
  });

  it("lists nothing for a tree with no instruction files", async () => {
    const root = await newTree({ "README.md": "x\n" });
    expect(report(root).listed).toEqual([]);
  });

  it("says a directory is needed when --root has none", () => {
    const child = spawnSync(process.execPath, [SCRIPT, "--root"], { encoding: "utf-8" });
    expect(child.status).toBe(2);
    expect(child.stderr).toContain("--root needs a directory");
  });

  it("rejects an unknown argument", () => {
    const child = spawnSync(process.execPath, [SCRIPT, "--nope"], { encoding: "utf-8" });
    expect(child.status).toBe(2);
  });
});
