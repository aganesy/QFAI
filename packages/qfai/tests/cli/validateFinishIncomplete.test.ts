/**
 * A fault while finishing the validation result is an unfinished run, not a crash.
 *
 * After the validators return, `validate` and `report --run-validate` finish the result: they
 * add the CI profile finding and the coverage notice, and the notice reads the filesystem to
 * learn which self-governance families the run could not evaluate. A fault there escaped both
 * commands, so the run ended with no `validate.json`, no `counts:` and no `run-log:`.
 *
 * The read is mocked to reject, because the subject is how the commands handle a finishing
 * fault, not which path raises one.
 */
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as PackageSelfGovernanceModule from "../../src/core/validators/packageSelfGovernance.js";
import { graphProcessFixture } from "../helpers/graphProcess.js";

type PackageSelfGovernance = typeof PackageSelfGovernanceModule;

const { unevaluatedSpy } = vi.hoisted(() => ({ unevaluatedSpy: vi.fn() }));

vi.mock("../../src/core/validators/packageSelfGovernance.js", async () => {
  const actual = await vi.importActual<PackageSelfGovernance>(
    "../../src/core/validators/packageSelfGovernance.js",
  );
  return {
    ...actual,
    unevaluatedPackageSelfGovernanceFamilies: (
      ...args: Parameters<PackageSelfGovernance["unevaluatedPackageSelfGovernanceFamilies"]>
    ) => unevaluatedSpy(actual, ...args),
  };
});

const { runInit } = await import("../../src/cli/commands/init.js");
const { runValidate } = await import("../../src/cli/commands/validate.js");
const { runReport } = await import("../../src/cli/commands/report.js");

const dirs: string[] = [];

beforeEach(() => {
  unevaluatedSpy.mockReset();
  unevaluatedSpy.mockImplementation((actual: PackageSelfGovernance, root: string) =>
    actual.unevaluatedPackageSelfGovernanceFamilies(root),
  );
});

afterEach(async () => {
  for (const dir of dirs.splice(0)) {
    await rm(dir, { recursive: true, force: true });
  }
});

async function project(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-finish-incomplete-"));
  dirs.push(dir);
  await runInit(
    { dir, force: false, dryRun: false, yes: true },
    undefined,
    graphProcessFixture().run,
  );
  return dir;
}

/** A libuv error as Node raises one. */
function libuvError(code: string, syscall: string, at: string): NodeJS.ErrnoException {
  const error: NodeJS.ErrnoException = new Error(`${code}: operation failed, ${syscall} '${at}'`);
  error.code = code;
  error.syscall = syscall;
  error.path = at;
  return error;
}

type Finding = { code: string; severity: string; message: string };

function isFindingList(value: unknown): value is Finding[] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry: unknown) =>
        typeof entry === "object" &&
        entry !== null &&
        "code" in entry &&
        typeof entry.code === "string" &&
        "severity" in entry &&
        typeof entry.severity === "string" &&
        "message" in entry &&
        typeof entry.message === "string",
    )
  );
}

/** The findings of the `validate.json` at `root`. */
async function writtenFindings(root: string): Promise<Finding[]> {
  const parsed: unknown = JSON.parse(
    await readFile(path.join(root, ".qfai", "report", "validate.json"), "utf-8"),
  );
  const issues: unknown =
    typeof parsed === "object" && parsed !== null && "issues" in parsed ? parsed.issues : null;
  if (!isFindingList(issues)) throw new Error("validate.json holds no finding list");
  return issues;
}

/** Run one command with its output captured, and return its exit code and output. */
async function captured(command: () => Promise<number>): Promise<{ code: number; out: string }> {
  const lines: string[] = [];
  const write = vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    lines.push(String(chunk));
    return true;
  });
  const stderr = vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
    lines.push(String(chunk));
    return true;
  });
  try {
    return { code: await command(), out: lines.join("") };
  } finally {
    write.mockRestore();
    stderr.mockRestore();
  }
}

describe("a fault while finishing the validation result", () => {
  // QFAI:EX-0001-0039-68
  it("makes qfai validate write an incomplete-run QFAI-SCAN-002 and fail", async () => {
    const root = await project();
    const fault = path.join(root, ".qfai", "spec");
    unevaluatedSpy.mockImplementation(() => Promise.reject(libuvError("EACCES", "stat", fault)));

    const { code, out } = await captured(() =>
      runValidate({ root, strict: false, format: "text", failOn: "error" }),
    );

    expect(code).toBe(1);
    expect(unevaluatedSpy).toHaveBeenCalled();
    expect(out).toContain("QFAI-SCAN-002");
    expect(out).toContain("counts:");
    expect(out).toContain("run-log:");
    const incomplete = (await writtenFindings(root)).filter(
      (entry) => entry.code === "QFAI-SCAN-002",
    );
    expect(incomplete).toHaveLength(1);
    expect(incomplete[0]?.severity).toBe("error");
    expect(incomplete[0]?.message).toContain("validate: validation could not run to completion");
    expect(incomplete[0]?.message).toContain("EACCES");
  });

  // QFAI:EX-0001-0061-04
  it("makes qfai report --run-validate write and render the incomplete-run verdict and fail", async () => {
    const root = await project();
    const fault = path.join(root, ".qfai", "spec");
    unevaluatedSpy.mockImplementation(() => Promise.reject(libuvError("EACCES", "stat", fault)));

    const { code, out } = await captured(() =>
      runReport({ root, format: "md", runValidate: true, failOn: "error" }),
    );

    expect(code).toBe(1);
    expect(out).toContain(
      "report: validation did not finish, so this report is not a clean result.",
    );
    const incomplete = (await writtenFindings(root)).filter(
      (entry) => entry.code === "QFAI-SCAN-002",
    );
    expect(incomplete).toHaveLength(1);
    expect(incomplete[0]?.message).toContain("report: validation could not run to completion");
    const report = await readFile(path.join(root, ".qfai", "report", "report.md"), "utf-8");
    expect(report).toContain("QFAI-SCAN-002");
  });

  it("keeps the finished result when finishing succeeds", async () => {
    // The control: without it, a handler that always reported an unfinished run would pass both
    // rows above.
    const root = await project();

    const { out } = await captured(() =>
      runValidate({ root, strict: false, format: "text", failOn: "never" }),
    );

    expect(unevaluatedSpy).toHaveBeenCalled();
    expect(out).not.toContain("QFAI-SCAN-002");
    const codes = (await writtenFindings(root)).map((entry) => entry.code);
    expect(codes).not.toContain("QFAI-SCAN-002");
  });
});
