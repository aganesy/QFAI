/**
 * How `qfai catalog components` writes its catalogue: only a catalogue that is not there counts as
 * absent, so any other inspection failure stops the command before it writes or compares
 * anything, and one run at a time scans and writes it.
 *
 * `vi.mock` is hoisted to module scope, so the `lstat` fault and the rename pause live apart from
 * the other component catalogue acceptance tests, where every call must be the real one.
 */

import { randomUUID } from "node:crypto";
import type * as fsPromises from "node:fs/promises";
import { mkdir, mkdtemp, readdir, readFile, rm, stat, truncate, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { waitForCatalogueWriteHold } from "../helpers/catalogWriteHold.js";

type FsPromises = typeof fsPromises;

const fault = vi.hoisted(
  (): {
    lstat: ((file: string) => boolean) | null;
    pause: ((from: string, to: string) => Promise<void>) | null;
    catalogueRead: {
      file: string;
      beforeRead: (position: number, length: number) => Promise<void>;
    } | null;
  } => ({ lstat: null, pause: null, catalogueRead: null }),
);

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
    open: async (...args: Parameters<FsPromises["open"]>): ReturnType<FsPromises["open"]> => {
      const handle = await actual.open(...args);
      const probe = fault.catalogueRead;
      if (probe?.file !== String(args[0])) return handle;
      const read = handle.read.bind(handle);
      return Object.assign(handle, {
        read: async (buffer: Buffer, offset: number, length: number, position: number) => {
          await probe.beforeRead(position, length);
          return read(buffer, offset, length, position);
        },
      });
    },
    rename: async (...args: Parameters<FsPromises["rename"]>): Promise<void> => {
      // A run held just before this rename, while another run starts.
      await fault.pause?.(String(args[0]), String(args[1]));
      return actual.rename(...args);
    },
  };
});

const { runCliCaptured: cli } = await import("../helpers/cliCapture.js");
const { runCatalogComponents } = await import("../../src/cli/commands/catalog.js");

const roots: string[] = [];
const CATALOG = ".qfai/catalog/components.yaml";

afterEach(async () => {
  fault.lstat = null;
  fault.pause = null;
  fault.catalogueRead = null;
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

/** This package's own `typescript`, which a temporary project cannot resolve from its root. */
const packageRequire = createRequire(import.meta.url);
const loadTypescript = (): unknown => packageRequire("typescript");

const catalogFile = (root: string): string => path.join(root, ...CATALOG.split("/"));

// QFAI:EX-0001-0307-29
it("stops reading the verified catalogue descriptor when the file grows past the limit", async () => {
  const root = await project();
  const file = catalogFile(root);
  const limit = 8 * 1024 * 1024;
  const grownSize = limit + 128;
  const requestedEnds: number[] = [];
  fault.catalogueRead = {
    file,
    beforeRead: async (position, length) => {
      if (requestedEnds.length === 0) await truncate(file, grownSize);
      requestedEnds.push(position + length);
    },
  };

  const checked = await cli(["catalog", "components", "--check", "--root", root]);
  expect(checked.code).toBe(1);
  expect(checked.err).toContain(`The component catalogue exceeds ${limit} bytes.`);
  expect(Math.max(...requestedEnds)).toBe(limit + 1);
  expect((await stat(file)).size).toBe(grownSize);
});

const lockFile = (root: string): string =>
  path.join(root, ".qfai", "tools", "state", "component-catalog.lock");

/** A lock record of another run, as the command writes its own. */
const otherRecord = (pid: number): string =>
  JSON.stringify({
    kind: "component-catalog-lock",
    pid,
    createdAt: Date.now(),
    token: randomUUID(),
  });

/** A component file the scan lists. */
async function addComponent(root: string, name: string, file: string): Promise<void> {
  await mkdir(path.join(root, "src"), { recursive: true });
  await writeFile(
    path.join(root, "src", file),
    `export function ${name}() {
  return <div />;
}
`,
    "utf-8",
  );
}

/**
 * Holds the next run just before it renames its temporary file onto the catalogue. Resolves once
 * it is held; `resume` lets it go on.
 */
function holdBeforeRename(): { held: Promise<void>; resume: () => void } {
  let resume = (): void => undefined;
  const resumed = new Promise<void>((resolve) => {
    resume = resolve;
  });
  const held = new Promise<void>((resolve) => {
    fault.pause = async (from, to) => {
      if (!from.endsWith(".tmp") || path.basename(to) !== "components.yaml") return;
      fault.pause = null;
      resolve();
      await resumed;
    };
  });
  return { held, resume };
}

/** Silences standard output and collects what is written to standard error. */
function collectStderr(): string[] {
  const err: string[] = [];
  vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
    err.push(String(chunk));
    return true;
  });
  return err;
}

// QFAI:AC-0001-0307-10
describe("one run at a time scans and writes the catalogue", () => {
  // QFAI:EX-0001-0307-26
  it("refuses a second run while the first writes, so the catalogue is the first run's", async () => {
    const root = await project();
    await addComponent(root, "Alpha", "a.tsx");
    expect(await runCatalogComponents({ root, loadTypescript })).toBe(0);
    const hold = holdBeforeRename();
    const err = collectStderr();
    const first = runCatalogComponents({ root, loadTypescript });
    await waitForCatalogueWriteHold(hold.held, first, err);
    await addComponent(root, "Beta", "b.tsx");
    const second = await runCatalogComponents({ root, loadTypescript });
    hold.resume();
    expect(await first).toBe(0);
    vi.restoreAllMocks();
    expect(second).toBe(1);
    expect(err.join("")).toBe(
      `qfai catalog components: could not write ${CATALOG}, so any existing catalogue is as it was: another run of qfai catalog components is writing it and holds .qfai/tools/state/component-catalog.lock. Run the command again once that run finishes.
`,
    );
    const text = await readFile(catalogFile(root), "utf-8");
    expect(text).toContain("name: Alpha");
    expect(text).not.toContain("name: Beta");
    expect(await readdir(path.join(root, ".qfai", "catalog"))).toEqual(["components.yaml"]);
    expect(await readdir(path.join(root, ".qfai", "tools", "state"))).toEqual([]);
  });

  // QFAI:EX-0001-0307-26
  it("keeps a lock whose owner is not running and names it for removal by hand", async () => {
    const root = await project();
    await addComponent(root, "Alpha", "a.tsx");
    await mkdir(path.dirname(lockFile(root)), { recursive: true });
    const lock = otherRecord(2147483647);
    await writeFile(lockFile(root), lock, "utf-8");
    const failed = await cli(["catalog", "components", "--root", root]);
    expect(failed.code).toBe(1);
    expect(failed.err).toBe(
      `qfai catalog components: could not write ${CATALOG}, so any existing catalogue is as it was: .qfai/tools/state/component-catalog.lock is held by no running qfai catalog components. Remove it once no run is writing the catalogue, then run the command again.
`,
    );
    expect(await readFile(lockFile(root), "utf-8")).toBe(lock);
    expect(await readFile(catalogFile(root), "utf-8")).toBe("keep\n");
  });

  // QFAI:EX-0001-0307-27
  it("leaves a lock that another record replaced while it wrote, and says the catalogue was written", async () => {
    const root = await project();
    await addComponent(root, "Alpha", "a.tsx");
    const hold = holdBeforeRename();
    const err = collectStderr();
    const running = runCatalogComponents({ root, loadTypescript });
    await waitForCatalogueWriteHold(hold.held, running, err);
    const lock = otherRecord(process.pid);
    await writeFile(lockFile(root), lock, "utf-8");
    hold.resume();
    const code = await running;
    vi.restoreAllMocks();
    expect(code).toBe(1);
    expect(err.join("")).toBe(
      `qfai catalog components: wrote ${CATALOG}, but .qfai/tools/state/component-catalog.lock no longer holds this run's record, so it was left in place.
`,
    );
    expect(await readFile(lockFile(root), "utf-8")).toBe(lock);
    expect(await readFile(catalogFile(root), "utf-8")).toContain("name: Alpha");
    expect(await readdir(path.join(root, ".qfai", "catalog"))).toEqual(["components.yaml"]);
  });
});
