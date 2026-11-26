/**
 * A plain copy that finds a destination already there compares it with the template once: each
 * file is read a single time, and the destination, which the adopter owns, only within a bound.
 *
 * `readFile` and the bounded reader are wrapped to record their calls, because the number of reads
 * and their bound leave no other trace. `vi.mock` is hoisted to module scope, so these cases live in their own file.
 *
 * The bounded reader can also be made to refuse every read, as it does a file with no read
 * permission: `chmod 000` does not stop a root user or a Windows process reading the file.
 */

import { lstat, mkdir, mkdtemp, readFile, rm as rmFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type * as fsPromises from "node:fs/promises";
import type * as boundedRead from "../../../src/shared/boundedRead.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createFifoFixture } from "../../helpers/fifoFixture.js";
import { removeTempTree } from "../../helpers/tempTree.js";

type FsPromises = typeof fsPromises;

type BoundedRead = typeof boundedRead;

const { reads, boundedReads, reader } = vi.hoisted(() => ({
  reads: new Map<string, number>(),
  boundedReads: new Array<{ path: string; maxBytes: number }>(),
  reader: { refuses: false },
}));

vi.mock("../../../src/shared/boundedRead.js", async (importOriginal) => {
  const actual = await importOriginal<BoundedRead>();
  return {
    ...actual,
    readBoundedRegularFile: (filePath: string, maxBytes: number) => {
      boundedReads.push({ path: path.resolve(filePath), maxBytes });
      if (reader.refuses) return Promise.resolve(undefined);
      return actual.readBoundedRegularFile(filePath, maxBytes);
    },
  };
});

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
  boundedReads.length = 0;
  reader.refuses = false;
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
    // The destination is read once, through the bounded reader, capped at twice the template.
    expect(reads.get(destFile) ?? 0).toBe(0);
    expect(boundedReads).toEqual([{ path: destFile, maxBytes: 8 }]);
  });

  it("reports a destination larger than twice the template as kept", async () => {
    const { source, dest, destFile } = await trees("a\n", "a\n".repeat(64));

    const result = await copyTemplateTree(source, dest, plain);

    expect(result.kept).toEqual([path.join(dest, "doc.md")]);
    expect(reads.get(destFile) ?? 0).toBe(0);
    expect(boundedReads).toEqual([{ path: destFile, maxBytes: 4 }]);
  });
});

describe("an installed file the bounded reader refuses", () => {
  it("is kept by a plain run, which does not stop", async () => {
    const { source, dest, destFile } = await trees("a\n", "a\n");
    reader.refuses = true;

    const result = await copyTemplateTree(source, dest, plain);

    expect(result.skipped).toEqual([path.join(dest, "doc.md")]);
    expect(result.kept).toEqual([path.join(dest, "doc.md")]);
    expect(result.copied).toEqual([]);
    expect(await readFile(destFile, "utf-8")).toBe("a\n");
  });

  it("is written over by a forced copy, though it holds the template's bytes", async () => {
    const { source, dest, destFile } = await trees("a\n", "a\n");
    reader.refuses = true;

    const result = await copyTemplateTree(source, dest, { force: true, dryRun: false });

    expect(result.copied).toEqual([path.join(dest, "doc.md")]);
    expect(result.skipped).toEqual([]);
    expect(await readFile(destFile, "utf-8")).toBe("a\n");
  });
});

describe("a directory where a template file goes", () => {
  it.each([
    { mode: "copy", dryRun: false },
    { mode: "dry run", dryRun: true },
  ])("refuses that destination and continues the forced $mode", async ({ dryRun }) => {
    const { source, dest, destFile } = await trees("template\n", "installed\n");
    await rmFile(destFile);
    await mkdir(destFile);
    const ownedFile = path.join(destFile, "owned.md");
    await writeFile(ownedFile, "project content\n");
    await writeFile(path.join(source, "z-other.md"), "other template\n");

    const result = await copyTemplateTree(source, dest, { force: true, dryRun });

    const other = path.join(dest, "z-other.md");
    expect(result.refused).toEqual([destFile]);
    expect(result.copied).toEqual([other]);
    expect((await lstat(destFile)).isDirectory()).toBe(true);
    expect(await readFile(ownedFile, "utf-8")).toBe("project content\n");
    if (dryRun) {
      await expect(lstat(other)).rejects.toMatchObject({ code: "ENOENT" });
    } else {
      expect(await readFile(other, "utf-8")).toBe("other template\n");
    }
  });
});

describe("a FIFO where a template file goes", () => {
  it.for([
    { mode: "copy", dryRun: false },
    { mode: "dry run", dryRun: true },
  ])(
    "refuses the destination and preserves the FIFO in a forced $mode",
    async ({ dryRun }, ctx) => {
      const { source, dest, destFile } = await trees("a\n", "a\n");
      await rmFile(destFile);
      const original = await createFifoFixture(destFile);
      if (original === undefined) return ctx.skip("No usable FIFO fixture on this host.");

      const result = await copyTemplateTree(source, dest, { force: true, dryRun });

      expect(result.refused).toEqual([destFile]);
      expect(result.copied).toEqual([]);
      const current = await lstat(destFile, { bigint: true });
      expect(current.isFIFO()).toBe(true);
      expect([current.dev, current.ino]).toEqual([original.dev, original.ino]);
    },
  );
});
