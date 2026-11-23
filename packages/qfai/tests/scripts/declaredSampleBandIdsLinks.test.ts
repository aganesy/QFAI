/**
 * The declared-ID scan stays inside the contract tree: it never follows a
 * link, so a linked directory cannot add declarations from elsewhere or loop
 * the walk, and it stops naming the link rather than passing over what the
 * link stands for.
 */
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { declaredSampleBandIds } from "../../scripts/lib/declared-sample-band-ids.mjs";

const CONTRACTS = path.join(".qfai", "spec", "03_contract");
const DIR_LINK = process.platform === "win32" ? "junction" : "dir";
const tempDirs: string[] = [];

/** A tree with one declared rule in `cli/`, and a declaration outside the contract tree. */
async function newTree(): Promise<{ root: string; outside: string }> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-declared-links-"));
  tempDirs.push(root);
  await mkdir(path.join(root, CONTRACTS, "cli"), { recursive: true });
  await writeFile(
    path.join(root, CONTRACTS, "cli", "cli-0001-sample.md"),
    "| BR-CLI-0001-0001 | A rule. | EX-0001-0001-01 |\n",
    "utf-8",
  );
  const outside = path.join(root, "elsewhere");
  await mkdir(outside, { recursive: true });
  await writeFile(
    path.join(outside, "api-0002-outside.md"),
    "| BR-API-0002-0003 | A rule from outside. | EX-0001-0001-02 |\n",
    "utf-8",
  );
  return { root, outside };
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir !== undefined) await rm(dir, { recursive: true, force: true });
  }
});

describe("links inside the contract tree", () => {
  it("lists the declarations of an ordinary nested directory", async () => {
    const { root } = await newTree();
    await mkdir(path.join(root, CONTRACTS, "cli", "nested"), { recursive: true });
    await writeFile(
      path.join(root, CONTRACTS, "cli", "nested", "cli-0003-nested.md"),
      "| BR-CLI-0003-0001 | A nested rule. | EX-0001-0001-03 |\n",
      "utf-8",
    );

    expect(declaredSampleBandIds(root)).toEqual({
      businessRules: ["BR-CLI-0001-0001", "BR-CLI-0003-0001"],
      contractNames: ["cli-0001-sample", "cli-0003-nested"],
    });
  });

  it("throws naming a linked directory instead of reading the tree it points at", async () => {
    const { root, outside } = await newTree();
    const link = path.join(root, CONTRACTS, "api");
    await symlink(outside, link, DIR_LINK);

    expect(() => declaredSampleBandIds(root)).toThrow(link);
  });

  it("throws naming a link that loops back to its own parent", async () => {
    const { root } = await newTree();
    const link = path.join(root, CONTRACTS, "cli", "loop");
    await symlink(path.join(root, CONTRACTS), link, DIR_LINK);

    expect(() => declaredSampleBandIds(root)).toThrow(link);
  });

  it("throws when the contract root itself is a link", async () => {
    const { root, outside } = await newTree();
    await rm(path.join(root, CONTRACTS), { recursive: true, force: true });
    await symlink(outside, path.join(root, CONTRACTS), DIR_LINK);

    expect(() => declaredSampleBandIds(root)).toThrow(path.join(root, CONTRACTS));
  });
});
