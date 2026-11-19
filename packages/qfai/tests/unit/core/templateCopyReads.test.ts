/**
 * A plain copy that finds a destination already there compares it with the template once: each
 * file is read a single time, and the destination, which the adopter owns, only within a bound.
 *
 * `readFile` is wrapped to count the calls per path, because the number of reads leaves no other
 * trace. `vi.mock` is hoisted to module scope, so these cases live in their own file.
 */

import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type * as fsPromises from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { removeTempTree } from "../../helpers/tempTree.js";

type FsPromises = typeof fsPromises;

const { reads } = vi.hoisted(() => ({ reads: new Map<string, number>() }));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<FsPromises>("node:fs/promises");
  return {
    ...actual,
    readFile: (...args: Parameters<FsPromises["readFile"]>) => {
      if (typeof args[0] === "string") {
        const key = path.resolve(args[0]);
        reads.set(key, (reads.get(key) ?? 0) + 1);
      }
      return actual.readFile(...args);
    },
  };
});

const { copyTemplateTree } = await import("../../../src/core/fs/templateCopy.js");

let root: string | undefined;

beforeEach(() => {
  reads.clear();
});

afterEach(async () => {
  if (root !== undefined) await removeTempTree(root);
  root = undefined;
});

/** A template tree holding `doc.md` with `template`, and a project holding it with `installed`. */
async function trees(template: string, installed: string) {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-template-reads-"));
  const source = path.join(root, "source");
  const dest = path.join(root, "dest");
  await mkdir(source, { recursive: true });
  await mkdir(dest, { recursive: true });
  await writeFile(path.join(source, "doc.md"), template);
  await writeFile(path.join(dest, "doc.md"), installed);
  return {
    source,
    dest,
    sourceFile: path.resolve(source, "doc.md"),
    destFile: path.resolve(dest, "doc.md"),
  };
}

const plain = { force: false, dryRun: false, conflictPolicy: "skip" } as const;

describe("comparing an installed template", () => {
  it("reads each file once when only the line endings differ", async () => {
    const { source, dest, sourceFile, destFile } = await trees("a\nb\n", "a\r\nb\r\n");

    const result = await copyTemplateTree(source, dest, plain);

    expect(result.skipped).toEqual([path.join(dest, "doc.md")]);
    expect(result.kept).toEqual([]);
    expect(reads.get(sourceFile) ?? 0).toBe(1);
    // The destination is read through the bounded reader, which opens it rather than calling
    // `readFile` on a path the adopter controls.
    expect(reads.get(destFile) ?? 0).toBe(0);
  });

  it("reports a destination larger than twice the template as kept", async () => {
    const { source, dest, destFile } = await trees("a\n", "a\n".repeat(64));

    const result = await copyTemplateTree(source, dest, plain);

    expect(result.kept).toEqual([path.join(dest, "doc.md")]);
    expect(reads.get(destFile) ?? 0).toBe(0);
  });
});
