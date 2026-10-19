/**
 * A relative link under `.instruction/` whose target was deleted or moved.
 *
 * A link in the project-facts layer kept pointing at a shipped template the package had stopped
 * writing, and only a reviewer who followed it noticed. This check resolves every relative link
 * in the tree, so the next deletion fails the scans lane instead.
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
const SCRIPT = path.join(repoRoot, "scripts", "check-instruction-links.mjs");
const FACTS = path.join(".instruction", "02_project", "development.md");

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function treeWith(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-instruction-links-"));
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

describe("check-instruction-links", () => {
  // QFAI:EX-0002-0028-01
  it("fails on a reference definition and an inline link whose files are gone, naming each line", async () => {
    const root = await treeWith({
      [FACTS]: [
        "# Development",
        "",
        "Shipped [AGENTS][agents] and [CLAUDE][claude]; see [the writer](../../src/init.ts#writer).",
        "",
        "[agents]: ../../assets/root/AGENTS.md",
        "[claude]: ../../assets/root/CLAUDE.md",
        "",
      ].join("\n"),
      [path.join("assets", "root", "AGENTS.md")]: "# Agents\n",
    });

    const run = check(root);

    expect(run.status, run.output).toBe(1);
    expect(run.output).toContain(
      ".instruction/02_project/development.md:3: ../../src/init.ts#writer does not exist.",
    );
    expect(run.output).toContain(
      ".instruction/02_project/development.md:6: ../../assets/root/CLAUDE.md does not exist.",
    );
    expect(run.output).not.toContain("AGENTS.md does not exist");
    expect(run.output).toContain("Point each link at the file that now holds what it cited");
  });

  // QFAI:EX-0002-0028-01
  it("fails on a link that leaves the repository", async () => {
    const root = await treeWith({
      [FACTS]: "See [outside](../../../elsewhere.md).\n",
    });

    const run = check(root);

    expect(run.status, run.output).toBe(1);
    expect(run.output).toContain(
      ".instruction/02_project/development.md:1: ../../../elsewhere.md does not exist.",
    );
  });

  // QFAI:EX-0002-0028-01
  it("names the whole target of a link with parentheses and resolves a root-relative link against the repository", async () => {
    const root = await treeWith({
      [FACTS]: "See [p](missing_(1).md), [readme](/README.md) and [gone](/gone.md).\n",
      "README.md": "# Root\n",
    });

    const run = check(root);

    expect(run.status, run.output).toBe(1);
    expect(run.output).toContain(
      ".instruction/02_project/development.md:1: missing_(1).md does not exist.",
    );
    expect(run.output).toContain(
      ".instruction/02_project/development.md:1: /gone.md does not exist.",
    );
    expect(run.output).not.toContain("README.md does not exist");
  });

  // QFAI:EX-0002-0028-02
  it("passes resolving links and skips URLs, same-file anchors, code spans and fenced blocks", async () => {
    const root = await treeWith({
      [FACTS]: [
        "# Development",
        "",
        "See [testing](../01_specialties/testing.md#layers), [the site](https://example.com),",
        "[mail](mailto:someone@example.com), [below](#development) and ![logo](<../logo file.png>).",
        "A code span `[gone](../../gone.md)` is prose. See [copy](../file_(1).md) and [root](/README.md).",
        "<!-- [gone](../../gone.md) -->",
        "<!--",
        "[gone](../../gone.md)",
        "-->",
        "",
        "    [gone](../../gone.md)",
        "",
        "- An item",
        "",
        "    [continued](../01_specialties/testing.md)",
        "",
        "[^1]: See the release notes.",
        "",
        "```md",
        "[gone](../../gone.md)",
        "[gone]: ../../gone.md",
        "```",
        "",
        "[tree]: ../../",
        "",
      ].join("\n"),
      [path.join(".instruction", "01_specialties", "testing.md")]: "# Testing\n",
      [path.join(".instruction", "logo file.png")]: "",
      [path.join(".instruction", "file_(1).md")]: "# Copy\n",
      "README.md": "# Root\n",
    });

    const run = check(root);

    expect(run.status, run.output).toBe(0);
    expect(run.output).toContain("Every relative link under .instruction/ resolves (6 links).");
  });

  // QFAI:EX-0002-0028-02
  it("fails closed on a symbolic link under the tree", async (ctx) => {
    const root = await treeWith({
      [FACTS]: "# Development\n",
      "outside.md": "[gone](gone.md)\n",
    });
    const linked = await createSymlinkFixture(
      path.join(root, "outside.md"),
      path.join(root, ".instruction", "linked.md"),
      "file",
    );
    if (!linked) ctx.skip();

    const run = check(root);

    expect(run.status, run.output).toBe(2);
    expect(run.output).toContain(".instruction/linked.md could not be read.");
  });

  // QFAI:EX-0002-0028-02
  it("fails closed when the tree is absent", async () => {
    const root = await treeWith({ "README.md": "# Root\n" });

    const run = check(root);

    expect(run.status, run.output).toBe(2);
    expect(run.output).toContain(".instruction could not be read.");
  });

  // QFAI:EX-0002-0028-03
  it("passes on this repository and runs in the scans lane of the pull request lint job", async () => {
    const run = check(repoRoot);
    expect(run.status, run.output).toBe(0);

    const manifest: unknown = JSON.parse(
      await readFile(path.join(repoRoot, "package.json"), "utf-8"),
    );
    expect(manifest).toMatchObject({
      scripts: {
        "ci:lint:scans": expect.stringContaining("node ./scripts/check-instruction-links.mjs"),
      },
    });
  });
});
