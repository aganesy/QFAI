/**
 * Integration: shipped GitHub Actions workflow-set ownership.
 *
 * Covers what `qfai init` does in an adopter's `.github/workflows/` directory
 * (contract: `.qfai/spec/03_contract/cli/cli-0018-shipped-workflows.md`). A
 * shipped workflow is written only where no file of that name exists, nothing
 * is recorded, and nothing in the directory is removed. The reserved `qfai-`
 * filename prefix is a reservation notice, not a selector.
 */
import { mkdir, readdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { loadConfig, readSkippedWorkflows } from "../../src/core/config.js";
import { isEnoent } from "../../src/core/fs/errno.js";
import { QFAI_GITIGNORE_BLOCK } from "../../src/core/gitignore.js";
import {
  RETIRED_WORKFLOW_NAMES,
  SHIPPED_WORKFLOW_NAMES,
} from "../../src/shared/shippedWorkflowNames.js";
import { shippedWorkflowPath, useTempDirPool } from "../helpers/shippedWorkflowFixtures.js";
import { captureStdout } from "../helpers/stdout.js";

// tests/integration/<this file> -> tests -> packages/qfai
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const INIT_MODULE_PATH = path.join(packageRoot, "src", "cli", "commands", "init.ts");

const readInitSource = (): Promise<string> => readFile(INIT_MODULE_PATH, "utf-8");

const newTempDir = useTempDirPool("qfai-wfown-");

const workflowAt = (dir: string, name: string): string =>
  path.join(dir, ".github", "workflows", name);

async function runInitQuiet(dir: string): Promise<string> {
  return captureStdout(() => runInit({ dir, force: false, dryRun: false, yes: true }));
}

/** The text of a function's body, from its definition to the first line holding only `}`. */
function functionBody(source: string, marker: string): string {
  const at = source.indexOf(marker);
  expect(at, `${marker} must exist`).toBeGreaterThan(-1);
  return source.slice(at, source.indexOf("\n}", at));
}

/** The entry names of a directory, or none where it does not exist. Any other read failure is rethrown unchanged. */
async function namesOrNoneWhereMissing(
  dir: string,
  list: (path: string) => Promise<string[]> = readdir,
): Promise<string[]> {
  try {
    return await list(dir);
  } catch (error) {
    if (isEnoent(error)) return [];
    throw error;
  }
}
describe("a workflows directory reached through a link is not this tree's to write", () => {
  /** The error codes a filesystem raises when it cannot create a link at all. */
  const UNSUPPORTED_LINK_CODES = new Set(["EPERM", "ENOTSUP", "EOPNOTSUPP"]);

  /**
   * The link, as a JUNCTION on Windows and an ordinary symlink elsewhere.
   * `false` means the filesystem cannot create one, so the caller reports the
   * test as skipped. Any other failure is rethrown unchanged.
   */
  async function linkDir(
    target: string,
    at: string,
    create: typeof symlink = symlink,
  ): Promise<boolean> {
    try {
      await create(target, at, "junction");
      return true;
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        typeof error.code === "string" &&
        UNSUPPORTED_LINK_CODES.has(error.code)
      ) {
        return false;
      }
      throw error;
    }
  }

  it("reports a filesystem that cannot link as unsupported", async () => {
    const refuse = (): Promise<void> =>
      Promise.reject(Object.assign(new Error("operation not permitted"), { code: "EPERM" }));
    await expect(linkDir("target", "link", refuse)).resolves.toBe(false);
  });

  it("rethrows an unexpected link failure with its code, path and cause", async () => {
    const cause = new Error("root cause");
    const fail = (): Promise<void> =>
      Promise.reject(
        Object.assign(new Error("permission denied", { cause }), {
          code: "EACCES",
          path: "link",
        }),
      );
    await expect(linkDir("target", "link", fail)).rejects.toMatchObject({
      code: "EACCES",
      path: "link",
      cause,
    });
  });

  for (const linked of [".github", ".github/workflows"] as const) {
    it(`writes no shipped workflow through a symlinked ${linked}`, async (ctx) => {
      const dir = await newTempDir();
      const outside = await newTempDir();
      if (linked === ".github/workflows") {
        await mkdir(path.join(dir, ".github"), { recursive: true });
      }
      if (!(await linkDir(outside, path.join(dir, ...linked.split("/"))))) {
        ctx.skip();
      }

      await runInitQuiet(dir);

      expect((await readdir(path.join(dir, ".qfai"))).length).toBeGreaterThan(0);
      const escaped = linked === ".github" ? path.join(outside, "workflows") : outside;
      const escapedNames = await namesOrNoneWhereMissing(escaped);
      for (const name of SHIPPED_WORKFLOW_NAMES) {
        expect(escapedNames, `${name} was written through the linked ${linked}`).not.toContain(
          name,
        );
      }
    });
  }
});

describe("an absence check keeps a read failure apart from a missing directory", () => {
  const failWith =
    (code: string): ((path: string) => Promise<string[]>) =>
    () =>
      Promise.reject(Object.assign(new Error(`${code} on read`), { code, path: "dir" }));

  it("reads a missing directory as holding no entries", async () => {
    await expect(namesOrNoneWhereMissing("dir", failWith("ENOENT"))).resolves.toEqual([]);
  });

  for (const code of ["EACCES", "EIO"]) {
    it(`rethrows ${code} with its code and path`, async () => {
      await expect(namesOrNoneWhereMissing("dir", failWith(code))).rejects.toMatchObject({
        code,
        path: "dir",
      });
    });
  }
});
describe("the write set is the shipped list and the listed set is the retired list", () => {
  // QFAI:AC-0002-0007-01
  // QFAI:EX-0002-0007-01
  it("writes exactly the shipped names and leaves a qfai-prefixed orphan untouched and unlisted", async () => {
    expect([...SHIPPED_WORKFLOW_NAMES].filter((name) => RETIRED_WORKFLOW_NAMES.has(name))).toEqual(
      [],
    );
    const dir = await newTempDir();
    const orphan = "# the adopter's own workflow\nname: orphan\n";
    await mkdir(path.join(dir, ".github", "workflows"), { recursive: true });
    await writeFile(workflowAt(dir, "qfai-orphan.yml"), orphan, "utf-8");

    const output = await runInitQuiet(dir);

    const present = (await readdir(path.join(dir, ".github", "workflows"))).sort();
    expect(present).toEqual(["qfai-orphan.yml", ...SHIPPED_WORKFLOW_NAMES].sort());
    expect(await readFile(workflowAt(dir, "qfai-orphan.yml"), "utf-8")).toBe(orphan);
    expect(output).not.toContain("qfai-orphan.yml");
  });
});

describe("no install record", () => {
  // QFAI:EX-0002-0007-02
  it("writes no install-provenance record and no managed-block line names one", async () => {
    const dir = await newTempDir();
    await runInitQuiet(dir);

    await expect(readFile(path.join(dir, ".qfai", "install-provenance.json"))).rejects.toThrow();
    const block = await readFile(path.join(dir, ".gitignore"), "utf-8");
    expect(block).not.toContain("install-provenance");
    expect(QFAI_GITIGNORE_BLOCK).not.toContain("install-provenance");
  });
});

describe("a shipped workflow is written only where none is on disk", () => {
  const NAME = "qfai-validate.yml";

  // QFAI:EX-0002-0007-03
  it("writes the absent file and leaves an unchanged and a hand-edited one byte-for-byte", async () => {
    const packaged = await readFile(shippedWorkflowPath(NAME), "utf-8");
    const edited = `${packaged}# hand edit\n`;
    for (const state of ["absent", "unchanged", "edited"] as const) {
      const dir = await newTempDir();
      if (state !== "absent") {
        await mkdir(path.join(dir, ".github", "workflows"), { recursive: true });
        await writeFile(workflowAt(dir, NAME), state === "edited" ? edited : packaged, "utf-8");
      }

      const output = await runInitQuiet(dir);

      expect(await readFile(workflowAt(dir, NAME), "utf-8"), state).toBe(
        state === "edited" ? edited : packaged,
      );
      if (state === "absent") {
        expect(output).toContain(`.github/workflows/${NAME}`);
      } else {
        expect(output, `${state}: init says nothing about the file`).not.toContain(NAME);
      }
    }
  });

  // QFAI:AC-0002-0007-02
  // QFAI:EX-0002-0007-05
  it("writes a shipped workflow the adopter deleted again", async () => {
    const dir = await newTempDir();
    await runInitQuiet(dir);
    await rm(workflowAt(dir, NAME));

    await runInitQuiet(dir);

    expect(await readFile(workflowAt(dir, NAME), "utf-8")).toBe(
      await readFile(shippedWorkflowPath(NAME), "utf-8"),
    );
  });
});

describe("a shipped workflow the project lists under workflow.skipShipped is not written", () => {
  const SKIPPED = "qfai-tests.yml";

  const listedIn = (dir: string, value: string): Promise<void> =>
    writeFile(path.join(dir, "qfai.config.yaml"), `workflow:\n  skipShipped: ${value}\n`, "utf-8");

  // QFAI:AC-0002-0007-04
  // QFAI:EX-0002-0007-07
  it("leaves the listed file out on every run and writes the others", async () => {
    const dir = await newTempDir();
    await listedIn(dir, `[${SKIPPED}]`);

    await runInitQuiet(dir);
    const first = (await readdir(path.join(dir, ".github", "workflows"))).sort();
    await runInitQuiet(dir);
    const second = (await readdir(path.join(dir, ".github", "workflows"))).sort();

    const expected = [...SHIPPED_WORKFLOW_NAMES].filter((name) => name !== SKIPPED).sort();
    expect(first).toEqual(expected);
    expect(second).toEqual(expected);
  });

  // QFAI:AC-0002-0007-04
  // QFAI:EX-0002-0007-08
  it("reports a value that is not a list of shipped names and still writes every workflow", async () => {
    for (const value of ["[qfai-orphan.yml]", "qfai-tests.yml", "[1]"]) {
      const dir = await newTempDir();
      await listedIn(dir, value);

      await runInitQuiet(dir);

      expect((await readdir(path.join(dir, ".github", "workflows"))).sort(), value).toEqual(
        [...SHIPPED_WORKFLOW_NAMES].sort(),
      );
      const { issues } = await loadConfig(dir);
      const named = issues.filter((issue) => issue.message.includes("workflow.skipShipped"));
      expect(named, value).toHaveLength(1);
      expect(named[0]?.code, value).toBe("QFAI_CONFIG_INVALID");
    }
  });

  it("reads an absent key and an empty list as no skipped workflow", () => {
    expect(readSkippedWorkflows({})).toEqual(new Set());
    expect(readSkippedWorkflows({ workflow: { mode: "off" } })).toEqual(new Set());
    expect(readSkippedWorkflows({ workflow: { skipShipped: [] } })).toEqual(new Set());
    expect(readSkippedWorkflows({ workflow: { skipShipped: [SKIPPED] } })).toEqual(
      new Set([SKIPPED]),
    );
  });
});

describe("the workflow write path has no filesystem call of its own", () => {
  // QFAI:EX-0002-0007-04
  it("copies through the template helpers with a create-only literal and removes nothing", async () => {
    const source = await readInitSource();
    for (const marker of [
      "async function workflowAncestorsAreRealDirectories(",
      "async function retiredWorkflowLines(",
    ]) {
      expect(functionBody(source, marker)).not.toMatch(/\b(?:copyFile|writeFile|rm|unlink)\s*\(/);
    }
    const run = functionBody(source, "export async function runInit(");
    const copy = run.slice(run.indexOf("const workflowResult = await copyTemplatePaths("));
    expect(copy.slice(0, copy.indexOf(");"))).toContain(
      '{ force: false, dryRun: options.dryRun, conflictPolicy: "skip" }',
    );
    for (const call of source.matchAll(/pruneMatchingEntries\(\s*([^,]+),/g)) {
      expect(call[1], "no prune runs over the workflows directory").not.toContain("workflows");
    }
  });
});

describe("moving a file aside claims something nothing else can replace", () => {
  // Races between processes, with no in-process seam a fixture can drive, so
  // these are asserted on the source.

  it("claims a directory, which mkdir refuses to create over", async () => {
    const body = functionBody(await readInitSource(), "async function quarantineEntry(");
    expect(body).toMatch(/await mkdir\(quarantineDir\)/);
    expect(body).not.toMatch(/mkdir\(quarantineDir, \{[^}]*recursive/);
    expect(body).not.toMatch(/open\(quarantinePath/);
    expect(body).toMatch(/path\.join\(quarantineDir, base\)/);
  });

  it("restores by link only, so a name somebody else took is never overwritten", async () => {
    const body = functionBody(await readInitSource(), "async function restoreQuarantined(");
    expect(body).toMatch(/await link\(/);
    expect(body).not.toMatch(/rename\(/);
    expect(body).toMatch(/return false;/);
  });

  it("stops the run when a file could not be put back, naming where it is", async () => {
    const body = functionBody(
      await readInitSource(),
      "export async function pruneMatchingEntries(",
    );
    expect(body).toMatch(/stranded\.push/);
    expect(body).toMatch(/stranded\.length > 0/);
  });
});
