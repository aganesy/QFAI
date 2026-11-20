/**
 * The tree digest the migration suites compare before and after a refused step tells apart trees
 * that an unbounded join of paths and contents fed the same bytes.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { treeHash } from "../helpers/treeHash.js";

const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

async function tree(files: Record<string, string>, directories: string[] = []): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "qfai-tree-hash-"));
  roots.push(root);
  for (const directory of directories) await mkdir(path.join(root, directory), { recursive: true });
  for (const [relative, content] of Object.entries(files)) {
    const target = path.join(root, ...relative.split("/"));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content, "utf8");
  }
  return root;
}

describe("treeHash", () => {
  it("tells apart a file `a` holding `bc` from a file `ab` holding `c`", async () => {
    // Path then contents with no boundary fed both trees the bytes "abc".
    const first = await tree({ a: "bc" });
    const second = await tree({ ab: "c" });
    expect(await treeHash(first)).not.toBe(await treeHash(second));
  });

  it("tells apart an empty directory from an empty file of the same name", async () => {
    // A directory and an empty file both fed only their path, "a".
    const directory = await tree({}, ["a"]);
    const file = await tree({ a: "" });
    expect(await treeHash(directory)).not.toBe(await treeHash(file));
  });

  it("gives two trees with the same entries the same digest", async () => {
    const first = await tree({ "a/b.md": "# B\n", c: "" }, ["d"]);
    const second = await tree({ "a/b.md": "# B\n", c: "" }, ["d"]);
    expect(await treeHash(first)).toBe(await treeHash(second));
  });
});
