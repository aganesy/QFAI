/**
 * `qfai validate` saves its result files before it prints a verdict, so a run
 * that could not save them never announces a pass.
 *
 * `validateProject` is mocked to a clean result: the subject is what the run
 * prints when the write fails, not what the validators find. The write fails
 * because the configured result directory is a regular file, which needs no
 * link privilege on any runner.
 */
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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

const dirs: string[] = [];
let stdout: string[] = [];

function cleanResult(): ValidationResult {
  return {
    toolVersion: "0.0.0-test",
    profile: "full",
    issues: [],
    counts: { info: 0, warning: 0, error: 0 },
  };
}

beforeEach(() => {
  stdout = [];
  validateProjectSpy.mockReset();
  validateProjectSpy.mockImplementation(() => Promise.resolve(cleanResult()));
  vi.spyOn(process.stdout, "write").mockImplementation((chunk: string | Uint8Array) => {
    stdout.push(String(chunk));
    return true;
  });
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});

afterEach(async () => {
  vi.restoreAllMocks();
  while (dirs.length > 0) {
    const dir = dirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

/** A project whose result directory `results` is a regular file. */
async function projectWithUnwritableResult(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-verdict-after-write-"));
  dirs.push(root);
  await writeFile(
    path.join(root, "qfai.config.yaml"),
    "output:\n  validateJsonPath: results/validate.json\n",
    "utf-8",
  );
  await writeFile(path.join(root, "results"), "not a directory\n", "utf-8");
  return root;
}

function lines(): string[] {
  return stdout.join("").split("\n");
}

// BR-CLI-0014-0247
describe("the validation verdict follows the saved result", () => {
  // QFAI:EX-0001-0039-61
  it("a text run that cannot write its result prints no pass summary and still ends with run-log", async () => {
    const root = await projectWithUnwritableResult();

    await expect(
      runValidate({ root, strict: false, format: "text", toolVersionOverride: "0.0.0-test" }),
    ).rejects.toThrow(
      "qfai validate: the validation result was not written: results is not a directory",
    );

    const printed = lines();
    expect(printed.some((line) => line.startsWith("counts: "))).toBe(true);
    expect(printed.some((line) => line.startsWith("fail-on: "))).toBe(true);
    expect(printed.some((line) => line.startsWith("qfai validate: passed"))).toBe(false);
    expect(printed.filter((line) => line !== "").at(-1)).toMatch(/^run-log: /);
    expect(await readFile(path.join(root, "results"), "utf-8")).toBe("not a directory\n");
  });

  // QFAI:EX-0001-0039-61
  it("a github run that cannot write its result prints no summary naming the result", async () => {
    const root = await projectWithUnwritableResult();

    await expect(
      runValidate({ root, strict: false, format: "github", toolVersionOverride: "0.0.0-test" }),
    ).rejects.toThrow(
      "qfai validate: the validation result was not written: results is not a directory",
    );

    const printed = lines();
    expect(printed.some((line) => line.startsWith("qfai validate summary:"))).toBe(false);
    expect(printed.some((line) => line.includes("result=PASS"))).toBe(false);
    expect(printed.some((line) => line.includes("validate.json"))).toBe(false);
  });
});
