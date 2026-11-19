/**
 * How `qfai catalog design` writes its pair of files: only inside the project, through staging
 * files of its own, and undoing only what the run itself did when a step fails.
 *
 * `vi.mock` is hoisted to module scope, so the rename fault lives apart from the other design
 * catalogue acceptance tests, where every rename must be the real one.
 */

import type * as fsPromises from "node:fs/promises";
import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

type FsPromises = typeof fsPromises;
type RenameFault = (from: string, to: string) => boolean;

const fault = vi.hoisted((): { rename: RenameFault | null; noInodes: boolean } => ({
  rename: null,
  noInodes: false,
}));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<FsPromises>("node:fs/promises");
  return {
    ...actual,
    default: actual,
    // A volume with no inode numbers reports 0 for every file; the staging file's handle stands in.
    open: async (...args: Parameters<FsPromises["open"]>): Promise<fsPromises.FileHandle> => {
      const handle = await actual.open(...args);
      if (!fault.noInodes || !String(args[0]).endsWith(".tmp")) return handle;
      const stat = async (): Promise<{ dev: bigint; ino: bigint }> => ({
        dev: (await handle.stat({ bigint: true })).dev,
        ino: 0n,
      });
      return new Proxy(handle, {
        get: (target, key): unknown => {
          if (key === "stat") return stat;
          const value: unknown = Reflect.get(target, key, target);
          return typeof value === "function" ? value.bind(target) : value;
        },
      });
    },
    rename: async (...args: Parameters<FsPromises["rename"]>): Promise<void> => {
      const [from, to] = args;
      if (fault.rename?.(String(from), String(to)) === true) {
        throw Object.assign(new Error("EBUSY: resource busy or locked, rename"), {
          code: "EBUSY",
        });
      }
      return actual.rename(...args);
    },
  };
});

const { run } = await import("../../src/cli/main.js");
const { getInitAssetsDir } = await import("../../src/shared/assets.js");

const roots: string[] = [];
const CATALOG = [".qfai", "catalog"];
const SAMPLE = path.join(
  getInitAssetsDir(),
  ".qfai",
  "assistant",
  "skill",
  "qfai-prototyping",
  "templates",
  "DESIGN.md.sample",
);

afterEach(async () => {
  fault.rename = null;
  fault.noInodes = false;
  vi.restoreAllMocks();
  while (roots.length > 0) {
    const root = roots.pop();
    if (root) await rm(root, { recursive: true, force: true });
  }
});

async function tempDir(prefix: string): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), prefix));
  roots.push(dir);
  return dir;
}

/** A project whose root `DESIGN.md` is the shipped sample. */
async function project(): Promise<string> {
  const root = await tempDir("qfai-design-catalog-write-");
  await writeFile(path.join(root, "DESIGN.md"), await readFile(SAMPLE, "utf-8"), "utf-8");
  return root;
}

const catalogFile = (root: string, name: string): string => path.join(root, ...CATALOG, name);

/** Changes `primary` in `DESIGN.md`, so the next run writes both files anew. */
async function changePrimary(root: string): Promise<void> {
  const file = path.join(root, "DESIGN.md");
  const text = await readFile(file, "utf-8");
  await writeFile(file, text.replace('"#1F2937"', '"#202938"'), "utf-8");
}

/** Runs the CLI and returns its exit code with what it wrote to each stream. */
async function cli(args: string[]): Promise<{ code: number; out: string; err: string }> {
  const out: string[] = [];
  const err: string[] = [];
  vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    out.push(String(chunk));
    return true;
  });
  vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
    err.push(String(chunk));
    return true;
  });
  const previous = process.exitCode;
  process.exitCode = undefined;
  try {
    await run(args, process.cwd());
    return { code: Number(process.exitCode ?? 0), out: out.join(""), err: err.join("") };
  } finally {
    process.exitCode = previous;
    vi.restoreAllMocks();
  }
}

/** Whether a rename moves one of this run's staging files onto the theme. */
const placesTheme: RenameFault = (from, to) =>
  from.endsWith(".tmp") && path.basename(to) === "theme.css";

// QFAI:AC-0001-0312-08
describe("the design catalogue is written only inside the project, by the run that owns it", () => {
  // QFAI:EX-0001-0312-17
  it("refuses a catalogue directory that links outside and leaves the file there as it was", async () => {
    const root = await project();
    const outside = await tempDir("qfai-design-catalog-outside-");
    await writeFile(path.join(outside, "theme.css"), "keep\n", "utf-8");
    await mkdir(path.join(root, ".qfai"), { recursive: true });
    await symlink(
      outside,
      path.join(root, ...CATALOG),
      process.platform === "win32" ? "junction" : "dir",
    );
    const result = await cli(["catalog", "design", "--root", root]);
    expect(result.code).toBe(1);
    expect(result.err).toBe(
      "qfai catalog design: could not write the design catalogue, so both files are as they were: .qfai/catalog is a symbolic link.\n",
    );
    expect(await readFile(path.join(outside, "theme.css"), "utf-8")).toBe("keep\n");
    expect(await readdir(outside)).toEqual(["theme.css"]);
  });

  // QFAI:EX-0001-0312-18
  it("leaves another run's staging and moved-aside files as they were, on success and on failure", async () => {
    const root = await project();
    await mkdir(path.join(root, ...CATALOG), { recursive: true });
    const foreign = [
      `theme.css.${process.pid}.tmp`,
      `design.tokens.json.${process.pid}.tmp`,
      `theme.css.${process.pid}.old`,
      ".theme.css.another-run.tmp",
    ];
    for (const name of foreign) {
      await writeFile(catalogFile(root, name), `${name} of another run\n`, "utf-8");
    }
    const written = await cli(["catalog", "design", "--root", root]);
    expect(written.code).toBe(0);
    const theme = await readFile(catalogFile(root, "theme.css"), "utf-8");
    expect(theme).toContain("--color-primary: #1F2937;");

    await changePrimary(root);
    await rm(catalogFile(root, "theme.css"));
    await mkdir(catalogFile(root, "theme.css"));
    const failed = await cli(["catalog", "design", "--root", root]);
    expect(failed.code).toBe(1);
    expect(failed.err).toBe(
      "qfai catalog design: could not write the design catalogue, so both files are as they were: .qfai/catalog/theme.css is not a file.\n",
    );

    for (const name of foreign) {
      expect(await readFile(catalogFile(root, name), "utf-8")).toBe(`${name} of another run\n`);
    }
    const left = await readdir(path.join(root, ...CATALOG));
    expect(left.sort()).toEqual(["design.tokens.json", "theme.css", ...foreign].sort());
  });

  // QFAI:EX-0001-0312-19
  it("puts the replaced token file back when the theme cannot be renamed into place", async () => {
    const root = await project();
    expect((await cli(["catalog", "design", "--root", root])).code).toBe(0);
    const tokens = await readFile(catalogFile(root, "design.tokens.json"));
    const theme = await readFile(catalogFile(root, "theme.css"));
    await changePrimary(root);
    fault.rename = placesTheme;
    const failed = await cli(["catalog", "design", "--root", root]);
    expect(failed.code).toBe(1);
    expect(failed.err).toBe(
      "qfai catalog design: could not write the design catalogue, so both files are as they were: EBUSY: resource busy or locked, rename\n",
    );
    expect(await readFile(catalogFile(root, "design.tokens.json"))).toEqual(tokens);
    expect(await readFile(catalogFile(root, "theme.css"))).toEqual(theme);
    expect((await readdir(path.join(root, ...CATALOG))).sort()).toEqual([
      "design.tokens.json",
      "theme.css",
    ]);
  });

  // QFAI:EX-0001-0312-19
  it("names the moved-aside file that could not be renamed back and keeps it", async () => {
    const root = await project();
    expect((await cli(["catalog", "design", "--root", root])).code).toBe(0);
    const tokens = await readFile(catalogFile(root, "design.tokens.json"));
    const theme = await readFile(catalogFile(root, "theme.css"));
    await changePrimary(root);
    fault.rename = (from, to) =>
      placesTheme(from, to) || (from.endsWith(".old") && path.basename(to) === "theme.css");
    const failed = await cli(["catalog", "design", "--root", root]);
    expect(failed.code).toBe(1);
    expect(failed.err).toMatch(
      /^qfai catalog design: could not write the design catalogue, and could not put both files back: EBUSY: resource busy or locked, rename \.qfai\/catalog\/\.theme\.css\.[0-9a-f-]+\.old still holds the earlier \.qfai\/catalog\/theme\.css: EBUSY: resource busy or locked, rename\n$/,
    );
    expect(await readFile(catalogFile(root, "design.tokens.json"))).toEqual(tokens);
    const left = await readdir(path.join(root, ...CATALOG));
    const aside = left.filter((name) => name.endsWith(".old"));
    expect(left.sort()).toEqual(["design.tokens.json", ...aside].sort());
    expect(aside).toHaveLength(1);
    expect(await readFile(catalogFile(root, aside[0] ?? ""))).toEqual(theme);
  });

  // QFAI:EX-0001-0312-19
  it("leaves a placed file it cannot tell apart on a volume with no inode numbers", async () => {
    const root = await project();
    expect((await cli(["catalog", "design", "--root", root])).code).toBe(0);
    const tokens = await readFile(catalogFile(root, "design.tokens.json"));
    const theme = await readFile(catalogFile(root, "theme.css"));
    await changePrimary(root);
    fault.noInodes = true;
    fault.rename = placesTheme;
    const failed = await cli(["catalog", "design", "--root", root]);
    expect(failed.code).toBe(1);
    expect(failed.err).toMatch(
      /^qfai catalog design: could not write the design catalogue, and could not put both files back: EBUSY: resource busy or locked, rename \.qfai\/catalog\/design\.tokens\.json was left in place: the file system gives no inode number, so it cannot be told apart from another run's file\. \.qfai\/catalog\/\.design\.tokens\.json\.[0-9a-f-]+\.old still holds the earlier \.qfai\/catalog\/design\.tokens\.json: another file is at \.qfai\/catalog\/design\.tokens\.json\.\n$/,
    );
    expect(await readFile(catalogFile(root, "theme.css"))).toEqual(theme);
    expect(await readFile(catalogFile(root, "design.tokens.json"))).not.toEqual(tokens);
    const left = await readdir(path.join(root, ...CATALOG));
    const aside = left.filter((name) => name.endsWith(".old"));
    expect(left.sort()).toEqual(["design.tokens.json", "theme.css", ...aside].sort());
    expect(aside).toHaveLength(1);
    expect(await readFile(catalogFile(root, aside[0] ?? ""))).toEqual(tokens);
  });
});
