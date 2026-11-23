/**
 * How `qfai catalog components` treats a catalogue whose metadata cannot be read: only a
 * catalogue that is not there counts as absent, so any other inspection failure stops the command
 * before it writes or compares anything.
 *
 * `vi.mock` is hoisted to module scope, so the `lstat` fault lives apart from the other component
 * catalogue acceptance tests, where every `lstat` must be the real one.
 */

import type * as fsPromises from "node:fs/promises";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

type FsPromises = typeof fsPromises;

const fault = vi.hoisted((): { lstat: ((file: string) => boolean) | null } => ({ lstat: null }));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<FsPromises>("node:fs/promises");
  return {
    ...actual,
    default: actual,
    // A file whose metadata cannot be read, as when its directory denies the lookup.
    lstat: (...args: Parameters<FsPromises["lstat"]>): ReturnType<FsPromises["lstat"]> => {
      if (fault.lstat?.(String(args[0])) === true) {
        return Promise.reject(
          Object.assign(new Error("EACCES: permission denied, lstat"), { code: "EACCES" }),
        );
      }
      return actual.lstat(...args);
    },
  };
});

const { runCliCaptured: cli } = await import("../helpers/cliCapture.js");

const roots: string[] = [];
const CATALOG = ".qfai/catalog/components.yaml";

afterEach(async () => {
  fault.lstat = null;
  vi.restoreAllMocks();
  while (roots.length > 0) {
    const root = roots.pop();
    if (root) await rm(root, { recursive: true, force: true });
  }
});

/** A project selecting `src/**`, which holds no component, with a catalogue holding `keep`. */
async function project(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-component-catalog-write-"));
  roots.push(root);
  await writeFile(
    path.join(root, "qfai.config.yaml"),
    'uiux:\n  surfacePaths: ["src/**"]\n',
    "utf-8",
  );
  await mkdir(path.join(root, ".qfai", "catalog"), { recursive: true });
  await writeFile(path.join(root, ...CATALOG.split("/")), "keep\n", "utf-8");
  return root;
}

// QFAI:AC-0001-0307-08
describe("a catalogue that cannot be inspected stops the command", () => {
  // QFAI:EX-0001-0307-25
  it("exits 1 naming the catalogue and the cause, and leaves the catalogue as it was", async () => {
    const root = await project();
    fault.lstat = (file) => path.basename(file) === "components.yaml";
    const written = await cli(["catalog", "components", "--root", root]);
    const checked = await cli(["catalog", "components", "--check", "--root", root]);
    fault.lstat = null;
    expect(written.code).toBe(1);
    expect(written.err).toBe(
      `qfai catalog components: could not write ${CATALOG}, so any existing catalogue is as it was: ${CATALOG} could not be inspected: EACCES: permission denied, lstat\n`,
    );
    expect(checked.code).toBe(1);
    expect(checked.err).toBe(
      `qfai catalog components: could not read ${CATALOG}, so nothing was compared: ${CATALOG} could not be inspected: EACCES: permission denied, lstat\n`,
    );
    expect(await readFile(path.join(root, ...CATALOG.split("/")), "utf-8")).toBe("keep\n");
    expect(await readdir(path.join(root, ".qfai", "catalog"))).toEqual(["components.yaml"]);
  });
});
