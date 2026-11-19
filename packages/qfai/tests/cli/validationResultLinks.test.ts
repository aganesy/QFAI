/**
 * The validation result, `validate.json` and its profile-suffixed sibling, is
 * written only inside its own directory, by `qfai validate` and by
 * `qfai report --run-validate`.
 *
 * `validateProject` is mocked to a clean result: the subject is where the
 * result lands, not what the validators find.
 */
import { link, mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ValidationResult } from "../../src/core/types.js";

const { validateProjectSpy } = vi.hoisted(() => ({ validateProjectSpy: vi.fn() }));

vi.mock("../../src/core/validate.js", async () => {
  const actual = await vi.importActual<object>("../../src/core/validate.js");
  return { ...actual, validateProject: () => validateProjectSpy() };
});

const { runValidate } = await import("../../src/cli/commands/validate.js");
const { runReport } = await import("../../src/cli/commands/report.js");

const dirs: string[] = [];

function cleanResult(): ValidationResult {
  return {
    toolVersion: "0.0.0-test",
    profile: "full",
    issues: [],
    counts: { info: 0, warning: 0, error: 0 },
  };
}

beforeEach(() => {
  validateProjectSpy.mockReset();
  validateProjectSpy.mockImplementation(() => Promise.resolve(cleanResult()));
  vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});

afterEach(async () => {
  vi.restoreAllMocks();
  while (dirs.length > 0) {
    const dir = dirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-result-links-"));
  dirs.push(dir);
  return dir;
}

/** Link `linkPath` to the directory `target`: a junction on Windows, which needs no privilege. */
async function linkDirectory(target: string, linkPath: string): Promise<void> {
  await symlink(target, linkPath, process.platform === "win32" ? "junction" : "dir");
}

/** Link `linkPath` to the file `target`, or `false` where the platform refuses a file link. */
async function tryLinkFile(target: string, linkPath: string): Promise<boolean> {
  try {
    await symlink(target, linkPath, "file");
    return true;
  } catch {
    return false;
  }
}

function validate(root: string): Promise<number> {
  return runValidate({ root, strict: false, format: "text", toolVersionOverride: "0.0.0-test" });
}

// BR-CLI-0014-0299
describe("validation result destinations reached through a link", () => {
  // QFAI:EX-0001-0039-57
  it("qfai validate refuses a validate.json that is a link and leaves its target as it was", async (ctx) => {
    const root = await newTempDir();
    const outside = await newTempDir();
    const target = path.join(outside, "victim.json");
    await writeFile(target, "keep\n", "utf-8");
    const reportDir = path.join(root, ".qfai", "report");
    await mkdir(reportDir, { recursive: true });
    if (!(await tryLinkFile(target, path.join(reportDir, "validate.json")))) ctx.skip();

    await expect(validate(root)).rejects.toThrow(
      "qfai validate: the validation result was not written: .qfai/report/validate.json is a symbolic link or junction",
    );
    expect(await readFile(target, "utf-8")).toBe("keep\n");
  });

  // QFAI:EX-0001-0039-57
  it("qfai validate writes neither result file when only the profile-suffixed one is a link", async (ctx) => {
    // `validate.json` is written before `validate-full.json`, so a check made
    // file by file would write the first and then stop at the second.
    const root = await newTempDir();
    const outside = await newTempDir();
    const target = path.join(outside, "victim.json");
    await writeFile(target, "keep\n", "utf-8");
    const reportDir = path.join(root, ".qfai", "report");
    await mkdir(reportDir, { recursive: true });
    if (!(await tryLinkFile(target, path.join(reportDir, "validate-full.json")))) ctx.skip();

    await expect(validate(root)).rejects.toThrow(
      "qfai validate: the validation result was not written: .qfai/report/validate-full.json is a symbolic link or junction",
    );
    expect(await readFile(target, "utf-8")).toBe("keep\n");
    expect(await readdir(reportDir)).toEqual(["validate-full.json"]);
  });

  // QFAI:EX-0001-0039-57
  it("qfai report --run-validate writes neither result file when only the profile-suffixed one is a link", async (ctx) => {
    const root = await newTempDir();
    const outside = await newTempDir();
    const target = path.join(outside, "victim.json");
    await writeFile(target, "keep\n", "utf-8");
    const flow = path.join(root, ".qfai", "spec", "02_business-flow", "business-flow-0001");
    await mkdir(flow, { recursive: true });
    await writeFile(path.join(flow, "business-flow.md"), "# BF-0001: Checkout\n", "utf-8");
    await writeFile(
      path.join(root, "qfai.config.yaml"),
      "paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\n",
      "utf-8",
    );
    const reportDir = path.join(root, ".qfai", "report");
    await mkdir(reportDir, { recursive: true });
    if (!(await tryLinkFile(target, path.join(reportDir, "validate-full.json")))) ctx.skip();

    await expect(
      runReport({ root, format: "md", runValidate: true, failOn: "never" }),
    ).rejects.toThrow(
      "qfai report: the validation result was not written: .qfai/report/validate-full.json is a symbolic link or junction",
    );
    expect(await readFile(target, "utf-8")).toBe("keep\n");
    expect(await readdir(reportDir)).toEqual(["validate-full.json"]);
  });

  // QFAI:EX-0001-0039-57
  it("qfai validate refuses a configured result directory that is a link", async () => {
    const root = await newTempDir();
    const outside = await newTempDir();
    await writeFile(
      path.join(root, "qfai.config.yaml"),
      "output:\n  validateJsonPath: results/validate.json\n",
      "utf-8",
    );
    await linkDirectory(outside, path.join(root, "results"));

    await expect(validate(root)).rejects.toThrow("results is a symbolic link or junction");
    expect(await readdir(outside)).toEqual([]);
  });

  // QFAI:EX-0001-0039-57
  it("qfai report --run-validate refuses a report directory that is a link", async () => {
    const root = await newTempDir();
    const outside = await newTempDir();
    // `qfai report` reads only a story tree, so the project holds one flow.
    const flow = path.join(root, ".qfai", "spec", "02_business-flow", "business-flow-0001");
    await mkdir(flow, { recursive: true });
    await writeFile(path.join(flow, "business-flow.md"), "# BF-0001: Checkout\n", "utf-8");
    await writeFile(
      path.join(root, "qfai.config.yaml"),
      "paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\n",
      "utf-8",
    );
    await linkDirectory(outside, path.join(root, ".qfai", "report"));

    await expect(
      runReport({ root, format: "md", runValidate: true, failOn: "never" }),
    ).rejects.toThrow(
      "qfai report: the validation result was not written: .qfai/report is a symbolic link or junction",
    );
    expect(await readdir(outside)).toEqual([]);
  });

  // QFAI:EX-0001-0039-57
  it("qfai validate replaces validate.json with a new file rather than writing through it", async () => {
    // A hard link shares the old file's inode: a write in place would change
    // the other name as well, so an unchanged twin shows the file was replaced.
    const root = await newTempDir();
    const reportDir = path.join(root, ".qfai", "report");
    await mkdir(reportDir, { recursive: true });
    const resultPath = path.join(reportDir, "validate.json");
    await writeFile(resultPath, "old\n", "utf-8");
    const twin = path.join(root, "twin.json");
    await link(resultPath, twin);

    expect(await validate(root)).toBe(0);

    expect(JSON.parse(await readFile(resultPath, "utf-8"))).toMatchObject({
      toolVersion: "0.0.0-test",
      counts: { error: 0 },
    });
    expect(await readFile(twin, "utf-8")).toBe("old\n");
    expect((await readdir(reportDir)).filter((name) => name.endsWith(".tmp"))).toEqual([]);
  });
});
