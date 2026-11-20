/**
 * A plain copy whose exclusive create loses to a file created after its existence check accounts
 * for that file as it does for one that was already there: skipped, and kept when its content is
 * not the template's.
 *
 * `copyFile` is wrapped so that the destination appears between the check and the create, the
 * moment no real process can be scheduled into reliably. The writer runs only on an exclusive
 * create, so a copy that stopped creating exclusively would never meet the racing file and fail
 * these cases by listing the path as copied. `vi.mock` is hoisted to module scope, so these cases
 * live in their own file.
 */

import { constants as fsConstants } from "node:fs";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type * as fsPromises from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";

import { removeTempTree } from "../../helpers/tempTree.js";

type FsPromises = typeof fsPromises;

/** The content the racing writer puts at the destination, or `undefined` for no race. */
const race = vi.hoisted((): { content: string | undefined } => ({ content: undefined }));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<FsPromises>("node:fs/promises");
  return {
    ...actual,
    copyFile: async (...args: Parameters<FsPromises["copyFile"]>) => {
      const [, dest, mode] = args;
      if (race.content !== undefined && mode === fsConstants.COPYFILE_EXCL) {
        await actual.writeFile(dest, race.content);
      }
      return actual.copyFile(...args);
    },
  };
});

const { copyTemplateTree } = await import("../../../src/core/fs/templateCopy.js");

let root: string | undefined;

afterEach(async () => {
  race.content = undefined;
  if (root !== undefined) await removeTempTree(root);
  root = undefined;
});

/** A template tree holding `doc.md` with `template`, and an empty project. */
async function trees(template: string) {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-template-race-"));
  const source = path.join(root, "source");
  const dest = path.join(root, "dest");
  await mkdir(source, { recursive: true });
  await mkdir(dest, { recursive: true });
  await writeFile(path.join(source, "doc.md"), template);
  return { source, dest, destFile: path.join(dest, "doc.md") };
}

const plain = { force: false, dryRun: false, conflictPolicy: "skip" } as const;

describe("a destination created after the existence check", () => {
  it("is reported as kept when its content differs from the template", async () => {
    const { source, dest, destFile } = await trees("template\n");
    race.content = "adopter edit\n";

    const result = await copyTemplateTree(source, dest, plain);

    expect(result.copied).toEqual([]);
    expect(result.skipped).toEqual([destFile]);
    expect(result.kept).toEqual([destFile]);
    expect(await readFile(destFile, "utf-8")).toBe("adopter edit\n");
  });

  it("is skipped but not kept when it already holds the template", async () => {
    const { source, dest, destFile } = await trees("template\n");
    race.content = "template\n";

    const result = await copyTemplateTree(source, dest, plain);

    expect(result.copied).toEqual([]);
    expect(result.skipped).toEqual([destFile]);
    expect(result.kept).toEqual([]);
  });
});
