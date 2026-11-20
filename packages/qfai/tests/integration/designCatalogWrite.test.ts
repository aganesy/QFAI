/**
 * How `qfai catalog design` writes its pair of files: only inside the project, through staging
 * files of its own, one run at a time, and undoing only what the run itself did when a step fails.
 *
 * `vi.mock` is hoisted to module scope, so the rename fault lives apart from the other design
 * catalogue acceptance tests, where every rename must be the real one.
 */

import { randomUUID } from "node:crypto";
import type * as fsPromises from "node:fs/promises";
import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

type FsPromises = typeof fsPromises;
type RenameFault = (from: string, to: string) => boolean;
type LstatFault = (file: string) => boolean;
type RenamePause = (from: string, to: string) => Promise<void>;

const fault = vi.hoisted(
  (): {
    rename: RenameFault | null;
    lstat: LstatFault | null;
    noInodes: boolean;
    pause: RenamePause | null;
  } => ({
    rename: null,
    lstat: null,
    noInodes: false,
    pause: null,
  }),
);

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
    // A file whose metadata cannot be read, as when its directory denies the lookup.
    lstat: (...args: Parameters<FsPromises["lstat"]>): ReturnType<FsPromises["lstat"]> => {
      if (fault.lstat?.(String(args[0])) === true) {
        return Promise.reject(
          Object.assign(new Error("EACCES: permission denied, lstat"), { code: "EACCES" }),
        );
      }
      return actual.lstat(...args);
    },
    rename: async (...args: Parameters<FsPromises["rename"]>): Promise<void> => {
      const [from, to] = args;
      // A run held just before this rename, while another run starts.
      await fault.pause?.(String(from), String(to));
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
const { runCatalogDesign } = await import("../../src/cli/commands/catalog.js");
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
  fault.lstat = null;
  fault.noInodes = false;
  fault.pause = null;
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
const lockFile = (root: string): string =>
  path.join(root, ".qfai", "tools", "state", "design-catalog.lock");

/** A lock record of another run, as the command writes its own. */
const otherRecord = (pid: number): string =>
  JSON.stringify({ kind: "design-catalog-lock", pid, createdAt: Date.now(), token: randomUUID() });

/**
 * Holds the next run just before it renames its theme into place, after its token file is in
 * place. Resolves once it is held; `resume` lets it go on.
 */
function holdBeforeTheme(): { held: Promise<void>; resume: () => void } {
  let resume = (): void => undefined;
  const resumed = new Promise<void>((resolve) => {
    resume = resolve;
  });
  const held = new Promise<void>((resolve) => {
    fault.pause = async (from, to) => {
      if (!placesTheme(from, to)) return;
      fault.pause = null;
      resolve();
      await resumed;
    };
  });
  return { held, resume };
}

/** Silences standard output and collects what is written to standard error. */
function captureStderr(): string[] {
  const err: string[] = [];
  vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
    err.push(String(chunk));
    return true;
  });
  return err;
}

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
      /^qfai catalog design: could not write the design catalogue, and could not put both files back: EBUSY: resource busy or locked, rename \.qfai\/catalog\/\.theme\.css\.[0-9a-f-]+\.old still holds the earlier \.qfai\/catalog\/theme\.css: EBUSY: resource busy or locked, rename \.qfai\/catalog\/design\.tokens\.json is as it was\.\n$/,
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
      /^qfai catalog design: could not write the design catalogue, and could not put both files back: EBUSY: resource busy or locked, rename \.qfai\/catalog\/design\.tokens\.json was left in place: the file system gives no inode number, so it cannot be told apart from another run's file\. \.qfai\/catalog\/\.design\.tokens\.json\.[0-9a-f-]+\.old still holds the earlier \.qfai\/catalog\/design\.tokens\.json: another file is at \.qfai\/catalog\/design\.tokens\.json\. \.qfai\/catalog\/theme\.css is as it was\.\n$/,
    );
    expect(await readFile(catalogFile(root, "theme.css"))).toEqual(theme);
    expect(await readFile(catalogFile(root, "design.tokens.json"))).not.toEqual(tokens);
    const left = await readdir(path.join(root, ...CATALOG));
    const aside = left.filter((name) => name.endsWith(".old"));
    expect(left.sort()).toEqual(["design.tokens.json", "theme.css", ...aside].sort());
    expect(aside).toHaveLength(1);
    expect(await readFile(catalogFile(root, aside[0] ?? ""))).toEqual(tokens);
  });

  // QFAI:EX-0001-0312-20
  it("stops and leaves both files as they were when a target cannot be inspected", async () => {
    const root = await project();
    expect((await cli(["catalog", "design", "--root", root])).code).toBe(0);
    const tokens = await readFile(catalogFile(root, "design.tokens.json"));
    const theme = await readFile(catalogFile(root, "theme.css"));
    await changePrimary(root);
    // First every look at the theme fails; then every look after the first.
    let looks = 0;
    const faults: LstatFault[] = [
      (file) => path.basename(file) === "theme.css",
      (file) => path.basename(file) === "theme.css" && (looks += 1) > 1,
    ];
    for (const lstatFault of faults) {
      fault.lstat = lstatFault;
      const failed = await cli(["catalog", "design", "--root", root]);
      fault.lstat = null;
      expect(failed.code).toBe(1);
      expect(failed.err).toBe(
        "qfai catalog design: could not write the design catalogue, so both files are as they were: EACCES: permission denied, lstat\n",
      );
      expect(await readFile(catalogFile(root, "design.tokens.json"))).toEqual(tokens);
      expect(await readFile(catalogFile(root, "theme.css"))).toEqual(theme);
      expect((await readdir(path.join(root, ...CATALOG))).sort()).toEqual([
        "design.tokens.json",
        "theme.css",
      ]);
    }
  });

  // QFAI:EX-0001-0312-20
  it("keeps a file it cannot inspect while undoing, and names the file put back", async () => {
    const root = await project();
    expect((await cli(["catalog", "design", "--root", root])).code).toBe(0);
    const tokens = await readFile(catalogFile(root, "design.tokens.json"));
    const theme = await readFile(catalogFile(root, "theme.css"));
    await changePrimary(root);
    let undoing = false;
    fault.rename = (from, to) => {
      if (!placesTheme(from, to)) return false;
      undoing = true;
      return true;
    };
    fault.lstat = (file) => undoing && path.basename(file) === "design.tokens.json";
    const failed = await cli(["catalog", "design", "--root", root]);
    fault.lstat = null;
    expect(failed.code).toBe(1);
    expect(failed.err).toMatch(
      /^qfai catalog design: could not write the design catalogue, and could not put both files back: EBUSY: resource busy or locked, rename \.qfai\/catalog\/design\.tokens\.json was left in place, as it could not be inspected: EACCES: permission denied, lstat \.qfai\/catalog\/\.design\.tokens\.json\.[0-9a-f-]+\.old still holds the earlier \.qfai\/catalog\/design\.tokens\.json: EACCES: permission denied, lstat \.qfai\/catalog\/theme\.css is as it was\.\n$/,
    );
    expect(await readFile(catalogFile(root, "theme.css"))).toEqual(theme);
    expect(await readFile(catalogFile(root, "design.tokens.json"))).not.toEqual(tokens);
    const left = await readdir(path.join(root, ...CATALOG));
    const aside = left.filter((name) => name.endsWith(".old"));
    expect(left.sort()).toEqual(["design.tokens.json", "theme.css", ...aside].sort());
    expect(aside).toHaveLength(1);
    expect(await readFile(catalogFile(root, aside[0] ?? ""))).toEqual(tokens);
  });

  // QFAI:EX-0001-0312-21
  it("refuses a second run while the first places the pair, so both files come from one DESIGN.md", async () => {
    const root = await project();
    expect((await cli(["catalog", "design", "--root", root])).code).toBe(0);
    const hold = holdBeforeTheme();
    const err = captureStderr();
    const first = runCatalogDesign({ root });
    await hold.held;
    await changePrimary(root);
    const second = await runCatalogDesign({ root });
    hold.resume();
    expect(await first).toBe(0);
    vi.restoreAllMocks();
    expect(second).toBe(1);
    expect(err.join("")).toBe(
      "qfai catalog design: could not write the design catalogue, so both files are as they were: another run of qfai catalog design is writing it and holds .qfai/tools/state/design-catalog.lock. Run the command again once that run finishes.\n",
    );
    const tokens = await readFile(catalogFile(root, "design.tokens.json"), "utf-8");
    const theme = await readFile(catalogFile(root, "theme.css"), "utf-8");
    expect(tokens).toContain('"#1f2937"');
    expect(tokens).not.toContain('"#202938"');
    expect(theme).toContain("--color-primary: #1F2937;");
    expect((await readdir(path.join(root, ...CATALOG))).sort()).toEqual([
      "design.tokens.json",
      "theme.css",
    ]);
  });

  // QFAI:EX-0001-0312-21
  it("keeps a lock whose owner is not running and names it for removal by hand", async () => {
    const root = await project();
    expect((await cli(["catalog", "design", "--root", root])).code).toBe(0);
    const tokens = await readFile(catalogFile(root, "design.tokens.json"));
    const theme = await readFile(catalogFile(root, "theme.css"));
    await changePrimary(root);
    const lock = otherRecord(2147483647);
    await writeFile(lockFile(root), lock, "utf-8");
    const failed = await cli(["catalog", "design", "--root", root]);
    expect(failed.code).toBe(1);
    expect(failed.err).toBe(
      "qfai catalog design: could not write the design catalogue, so both files are as they were: .qfai/tools/state/design-catalog.lock is held by no running qfai catalog design. Remove it once no run is writing the catalogue, then run the command again.\n",
    );
    expect(await readFile(lockFile(root), "utf-8")).toBe(lock);
    expect(await readFile(catalogFile(root, "design.tokens.json"))).toEqual(tokens);
    expect(await readFile(catalogFile(root, "theme.css"))).toEqual(theme);
  });

  // QFAI:EX-0001-0312-22
  it("leaves a lock that another record replaced while it wrote, and says both files were written", async () => {
    const root = await project();
    expect((await cli(["catalog", "design", "--root", root])).code).toBe(0);
    await changePrimary(root);
    const hold = holdBeforeTheme();
    const err = captureStderr();
    const running = runCatalogDesign({ root });
    await hold.held;
    const lock = otherRecord(process.pid);
    await writeFile(lockFile(root), lock, "utf-8");
    hold.resume();
    const code = await running;
    vi.restoreAllMocks();
    expect(code).toBe(1);
    expect(err.join("")).toBe(
      "qfai catalog design: wrote .qfai/catalog/design.tokens.json and .qfai/catalog/theme.css, but .qfai/tools/state/design-catalog.lock no longer holds this run's record, so it was left in place.\n",
    );
    expect(await readFile(lockFile(root), "utf-8")).toBe(lock);
    expect(await readFile(catalogFile(root, "theme.css"), "utf-8")).toContain(
      "--color-primary: #202938;",
    );
    expect((await readdir(path.join(root, ...CATALOG))).sort()).toEqual([
      "design.tokens.json",
      "theme.css",
    ]);
  });

  // QFAI:EX-0001-0312-22
  it("names the replaced lock after saying both files are as they were when a step fails too", async () => {
    const root = await project();
    expect((await cli(["catalog", "design", "--root", root])).code).toBe(0);
    const tokens = await readFile(catalogFile(root, "design.tokens.json"));
    const theme = await readFile(catalogFile(root, "theme.css"));
    await changePrimary(root);
    const hold = holdBeforeTheme();
    fault.rename = placesTheme;
    const err = captureStderr();
    const running = runCatalogDesign({ root });
    await hold.held;
    const lock = otherRecord(process.pid);
    await writeFile(lockFile(root), lock, "utf-8");
    hold.resume();
    const code = await running;
    vi.restoreAllMocks();
    expect(code).toBe(1);
    expect(err.join("")).toBe(
      "qfai catalog design: could not write the design catalogue, so both files are as they were: EBUSY: resource busy or locked, rename .qfai/tools/state/design-catalog.lock no longer holds this run's record, so it was left in place.\n",
    );
    expect(await readFile(lockFile(root), "utf-8")).toBe(lock);
    expect(await readFile(catalogFile(root, "design.tokens.json"))).toEqual(tokens);
    expect(await readFile(catalogFile(root, "theme.css"))).toEqual(theme);
  });
});
