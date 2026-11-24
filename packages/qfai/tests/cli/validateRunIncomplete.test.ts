/**
 * `validate` produces a verdict even when a validator throws.
 *
 * `runValidate` awaited `validateProject` with no `try`, so an fs error from any
 * validator reached `cli/index.ts` as a single stderr line: no `counts:`, no
 * `run-log:`, no `validate.json`. Every shipped skill pipes validate through
 * `| tail`, so that line was all an agent saw where a gate verdict belonged —
 * and a Windows `git worktree` reaches that path on every run, because it writes
 * `.claude/skills/*` as FILE symlinks to directories and `stat` answers `EPERM`.
 *
 * Enumerating the `stat` sites that can raise reduces the ways in. These rows
 * pin what happens when the next one appears.
 *
 * `validateProject` is mocked rather than a filesystem being sabotaged, because
 * the subject is `runValidate`'s handling of an arbitrary rejection — not any
 * particular validator's. A row that broke one validator's input would pass
 * while the handler was narrowed to that errno.
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as ReportCommandModule from "../../src/cli/commands/report.js";
import type { ValidationResult } from "../../src/core/types.js";
import type * as CoreValidateModule from "../../src/core/validate.js";
import { graphProcessFixture } from "../helpers/graphProcess.js";

const { validateProjectSpy, runReportSpy } = vi.hoisted(() => ({
  validateProjectSpy: vi.fn(),
  runReportSpy: vi.fn(),
}));

vi.mock("../../src/core/validate.js", async () => {
  const actual = await vi.importActual<CoreValidate>("../../src/core/validate.js");
  return {
    ...actual,
    validateProject: (...args: unknown[]) => validateProjectSpy(actual, ...args),
  };
});

vi.mock("../../src/cli/commands/report.js", () => ({ runReport: runReportSpy }));

const { runValidate } = await import("../../src/cli/commands/validate.js");
const { run } = await import("../../src/cli/main.js");
const { describeIncompleteRun } = await import("../../src/cli/lib/warnings.js");

type CoreValidate = typeof CoreValidateModule;
type ReportModule = typeof ReportCommandModule;

const dirs: string[] = [];

function errno(code: string, target: string): NodeJS.ErrnoException {
  const error: NodeJS.ErrnoException = new Error(`${code}: simulated, stat '${target}'`);
  error.code = code;
  error.path = target;
  return error;
}

type Finding = { code: string; severity: string; message: string };

function isFinding(value: unknown): value is Finding {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    typeof value.code === "string" &&
    "severity" in value &&
    typeof value.severity === "string" &&
    "message" in value &&
    typeof value.message === "string"
  );
}

/** A written validation result, read as `unknown` for the caller to narrow. */
async function readResult(file: string): Promise<unknown> {
  const parsed: unknown = JSON.parse(await readFile(file, "utf-8"));
  return parsed;
}

/** The findings of a written validation result; throws when it holds no finding list. */
function findingsOf(result: unknown): Finding[] {
  const issues: unknown =
    typeof result === "object" && result !== null && "issues" in result ? result.issues : null;
  if (!Array.isArray(issues) || !issues.every(isFinding)) {
    throw new Error("the validation result holds no finding list");
  }
  return issues;
}

beforeEach(() => {
  validateProjectSpy.mockReset();
  validateProjectSpy.mockImplementation(
    (
      actual: CoreValidate,
      root: Parameters<CoreValidate["validateProject"]>[0],
      config: Parameters<CoreValidate["validateProject"]>[1],
      opts: Parameters<CoreValidate["validateProject"]>[2],
    ) => actual.validateProject(root, config, opts),
  );
});

afterEach(async () => {
  while (dirs.length > 0) {
    const dir = dirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

async function project(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-incomplete-"));
  dirs.push(dir);
  const { runInit } = await import("../../src/cli/commands/init.js");
  await runInit(
    { dir, force: false, dryRun: false, yes: true },
    undefined,
    graphProcessFixture().run,
  );
  return dir;
}

/** The newest run log `validate` wrote under the default `paths.outDir`. */
async function readRunLog(root: string): Promise<{
  validateLog: string;
  summary: string;
  runJson: unknown;
  validatorJson: unknown;
}> {
  const outDir = path.join(root, ".qfai", "report");
  const validateLog = await readFile(path.join(outDir, "validate.log"), "utf-8");
  const reportDir = /^- run_log: (.+)$/m.exec(validateLog)?.[1];
  if (reportDir === undefined) throw new Error("validate.log names no run_log");
  const dir = path.join(root, reportDir);
  return {
    validateLog,
    summary: await readFile(path.join(dir, "summary.md"), "utf-8"),
    runJson: JSON.parse(await readFile(path.join(dir, "run.json"), "utf-8")),
    validatorJson: JSON.parse(await readFile(path.join(dir, "validator.json"), "utf-8")),
  };
}

/** A libuv error as Node raises one: `code`, `syscall`, `errno` and `path`. */
const libuvError = (code: string, syscall: string, at: string): Error => {
  const err: NodeJS.ErrnoException = new Error(`${code}: operation failed, ${syscall} '${at}'`);
  err.code = code;
  err.syscall = syscall;
  err.path = at;
  return err;
};

// QFAI:EX-0001-0039-04
describe("describeIncompleteRun", () => {
  it("attributes a filesystem fault to the command that hit it", () => {
    // The line `cli/index.ts` used to print named the errno and the path and
    // nothing else. An agent reading one piped line could not tell which
    // command refused, nor that the run was undetermined rather than clean.
    const described = describeIncompleteRun(
      libuvError("EPERM", "stat", "C:\\repo\\.claude\\skills\\qfai-sdd"),
      "certify",
    );

    expect(described).not.toBeNull();
    expect(described?.message).toContain("certify");
    expect(described?.message).toContain("EPERM");
    expect(described?.message).toContain("stat");
    expect(described?.message).toContain(".claude\\skills\\qfai-sdd");
    // The verdict clause, in the language `repository-language.md` pins for
    // operator-facing strings: "this run is NOT a clean result".
    expect(described?.message).toContain("NOT a clean result");
  });

  it("keeps the original as `cause`", () => {
    // The rewrite replaces what an operator reads, not what a caller or a
    // stack trace can still reach.
    const original = libuvError("ELOOP", "stat", "/p/self");
    expect(describeIncompleteRun(original, "iterate")?.cause).toBe(original);
  });

  it("still names the errno when the error carries no path", () => {
    const err: NodeJS.ErrnoException = new Error("EMFILE: too many open files");
    err.code = "EMFILE";
    err.syscall = "open";

    const described = describeIncompleteRun(err, "init");
    expect(described?.message).toContain("EMFILE");
    expect(described?.message).toContain("init");
  });

  // QFAI:EX-0001-0039-67
  it("gives the worktree advice to EPERM alone", () => {
    // A permission fault on a configured directory is not the Windows worktree
    // case, and `qfai init` does not repair it.
    const denied = describeIncompleteRun(libuvError("EACCES", "access", "/p/.qfai/spec"), "report");
    expect(denied?.message).toContain("make it readable by this user");
    expect(denied?.message).not.toContain("worktree");
    expect(denied?.message).not.toContain("qfai init");

    const worktree = describeIncompleteRun(
      libuvError("EPERM", "stat", "C:\\repo\\.claude\\skills\\qfai-sdd"),
      "init",
    );
    expect(worktree?.message).toContain("make it readable by this user");
    expect(worktree?.message).toContain("re-run `qfai init` inside the worktree");
  });

  it("leaves a deliberate refusal alone", () => {
    // The command said something specific about this project's state. Prefixing
    // it with a filesystem story would be a regression, not a fix.
    const refusal = new Error("certify: iteration 3 has no verify.json — refusing to certify");
    expect(describeIncompleteRun(refusal, "certify")).toBeNull();
  });

  it("leaves an error already wrapped with its path alone", () => {
    // `core/fs/templateCopy.ts` wraps its `stat` failure in a message naming the entry.
    // That error has neither `code` nor `syscall`, and it has already said what
    // this function would add.
    const wrapped = new Error("Cannot determine the template entry's kind: /t/x — EPERM", {
      cause: libuvError("EPERM", "stat", "/t/x"),
    });
    expect(describeIncompleteRun(wrapped, "init")).toBeNull();
  });

  it("leaves an error carrying only a `code` alone", () => {
    // Half the discriminator. A hand-thrown error given a `code` for a caller
    // to switch on is not a filesystem fault, and a version of this function
    // that tested `code` alone would rewrite it.
    const tagged: NodeJS.ErrnoException = new Error("guardrails: gate closed");
    tagged.code = "QFAI_GATE_CLOSED";
    expect(describeIncompleteRun(tagged, "guardrails")).toBeNull();
  });

  it("leaves an error carrying only a `syscall` alone", () => {
    // The other half, for the same reason in reverse.
    const tagged: NodeJS.ErrnoException = new Error("something about stat");
    tagged.syscall = "stat";
    expect(describeIncompleteRun(tagged, "report")).toBeNull();
  });
});

describe("the boundary is wired into every command", () => {
  // `--root`, not `--dir`. `--dir` is an argument error outside `init`, so a
  // row written with `--dir` fails at argument parsing — `run` returns before
  // dispatching and never reaches the boundary below.
  // `validate` answers a fault with `QFAI-SCAN-002` because it wraps
  // `validateProject`. The rest have no verdict artifact, so the rows above
  // only matter if `run` actually consults them — which is what this checks,
  // through a command that is not `validate`.
  it("attributes a fault raised inside `report` to `report`", async () => {
    runReportSpy.mockRejectedValueOnce(libuvError("EPERM", "stat", "/p/.qfai"));

    await expect(run(["report", "--root", process.cwd()], process.cwd())).rejects.toThrow(/report/);
  });

  it("says the run is undetermined, not that it is clean", async () => {
    runReportSpy.mockRejectedValueOnce(libuvError("EPERM", "stat", "/p/.qfai"));

    await expect(run(["report", "--root", process.cwd()], process.cwd())).rejects.toThrow(
      /NOT a clean result/,
    );
  });

  it("passes a command's own refusal through unchanged", async () => {
    const refusal = new Error("report: .qfai/specs is empty — nothing to report");
    runReportSpy.mockRejectedValueOnce(refusal);

    await expect(run(["report", "--root", process.cwd()], process.cwd())).rejects.toBe(refusal);
  });
});

/**
 * Run `command` once on a clean project, then with validators that throw under
 * `--fail-on never` and `--fail-on error`, and check that each unfinished run
 * replaced the clean result with its own `QFAI-SCAN-002` and exited 0 and 1.
 */
async function expectCleanResultReplaced(
  name: "validate" | "report",
  runCommand: (root: string, failOn: "never" | "error") => Promise<number>,
): Promise<void> {
  for (const [failOn, expectedExit] of [
    ["never", 0],
    ["error", 1],
  ] as const) {
    validateProjectSpy.mockReset();
    validateProjectSpy.mockImplementation(
      (
        actual: CoreValidate,
        target: Parameters<CoreValidate["validateProject"]>[0],
        config: Parameters<CoreValidate["validateProject"]>[1],
        opts: Parameters<CoreValidate["validateProject"]>[2],
      ) => actual.validateProject(target, config, opts),
    );
    const root = await project();
    const resultPath = path.join(root, ".qfai", "report", "validate.json");
    const lines: string[] = [];
    const write = vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      lines.push(String(chunk));
      return true;
    });
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    try {
      await runCommand(root, "never");
      const clean = findingsOf(await readResult(resultPath));
      expect(clean.map((entry) => entry.code)).not.toContain("QFAI-SCAN-002");
      expect(lines.join("")).not.toContain("not a clean result");

      validateProjectSpy.mockImplementation(() => Promise.reject(errno("EPERM", root)));
      expect(await runCommand(root, failOn), `${name} --fail-on ${failOn}`).toBe(expectedExit);
      if (name === "report") {
        expect(lines.join("")).toContain(
          "report: validation did not finish, so this report is not a clean result.",
        );
      }
    } finally {
      write.mockRestore();
      stderr.mockRestore();
    }

    const parsed = await readResult(resultPath);
    const finding = findingsOf(parsed).find((entry) => entry.code === "QFAI-SCAN-002");
    expect(finding?.severity, name).toBe("error");
    expect(finding?.message, name).toContain(`${name}: validation could not run to completion`);
    expect(parsed, name).toMatchObject({ counts: { error: expect.any(Number) } });
    expect(parsed, name).not.toMatchObject({ counts: { error: 0 } });
    if (name === "report") {
      const report = await readFile(path.join(root, ".qfai", "report", "report.md"), "utf-8");
      expect(report).toContain("QFAI-SCAN-002");
    }
  }
}

describe("validate reports a run it could not finish", () => {
  it("emits QFAI-SCAN-002 instead of letting the error escape", async () => {
    const root = await project();
    const wrapper = path.join(root, ".claude", "skills", "qfai-implement");
    validateProjectSpy.mockImplementation(() => Promise.reject(errno("EPERM", wrapper)));

    const lines: string[] = [];
    const write = vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      lines.push(String(chunk));
      return true;
    });
    try {
      const code = await runValidate({ root, strict: false, format: "text" });
      // The gate fails, as it did when the error escaped — reporting a crash
      // better must not also make it pass.
      expect(code).toBe(1);
    } finally {
      write.mockRestore();
    }

    const out = lines.join("");
    expect(out).toContain("QFAI-SCAN-002");
    // The errno and the path are what make the cause actionable.
    expect(out).toContain("EPERM");
    expect(out).toContain(wrapper);
    // And the three things a crash took away.
    expect(out).toContain("counts:");
    expect(out).toContain("run-log:");
  });

  it("writes a validate.json that cannot be read as a clean run", async () => {
    const root = await project();
    validateProjectSpy.mockImplementation(() =>
      Promise.reject(errno("ELOOP", path.join(root, ".qfai", "assistant", "skills"))),
    );

    const write = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      await runValidate({ root, strict: false, format: "text" });
    } finally {
      write.mockRestore();
    }

    const parsed = await readResult(path.join(root, ".qfai", "report", "validate.json"));
    // A downstream reader must not be able to take this for "no problems
    // found": the error count is non-zero and the finding says why.
    expect(parsed).toMatchObject({ counts: { error: 1 } });
    const issues = findingsOf(parsed);
    expect(issues.map((entry) => entry.code)).toContain("QFAI-SCAN-002");
    expect(issues.find((entry) => entry.code === "QFAI-SCAN-002")?.severity).toBe("error");
  });

  // QFAI:EX-0001-0066-06
  it("records the requested flows in a scoped result of a run that did not finish", async () => {
    const root = await project();
    const flow = path.join(root, ".qfai", "spec", "02_business-flow", "business-flow-0001");
    await mkdir(flow, { recursive: true });
    await writeFile(path.join(flow, "business-flow.md"), "# BF-0001: Checkout\n", "utf8");
    validateProjectSpy.mockImplementation(() => Promise.reject(errno("EPERM", root)));

    const write = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    try {
      await runValidate({
        root,
        strict: false,
        format: "text",
        failOn: "never",
        flowIds: ["BF-0001", "BF-0001"],
      });
      const scoped = path.join(root, ".qfai", "report", "validate.flow-0001.json");
      expect(await readResult(scoped)).toMatchObject({ flowIds: ["BF-0001"] });

      const { runReport } = await vi.importActual<ReportModule>("../../src/cli/commands/report.js");
      expect(await runReport({ root, format: "md", failOn: "never", flowIds: ["BF-0001"] })).toBe(
        0,
      );
      const report = path.join(root, ".qfai", "report", "report.flow-0001.md");
      expect(await readFile(report, "utf-8")).toContain("QFAI-SCAN-002");
    } finally {
      write.mockRestore();
      stderr.mockRestore();
    }
  });

  it("fails the run whatever --fail-on says, except never", async () => {
    // The severity is fixed at `error`, so `--fail-on warning` and the default
    // both fail on the count alone. `--fail-on never` is the one exception a
    // caller asked for explicitly, and it stays honoured — the finding is still
    // in the output either way. Pinned because the exit code is deliberately
    // NOT derived from counting severities.
    for (const failOn of ["error", "warning"] as const) {
      const root = await project();
      validateProjectSpy.mockImplementation(() => Promise.reject(errno("EPERM", root)));
      const write = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
      try {
        expect(await runValidate({ root, strict: false, format: "text", failOn })).toBe(1);
      } finally {
        write.mockRestore();
      }
    }

    const root = await project();
    validateProjectSpy.mockImplementation(() => Promise.reject(errno("EPERM", root)));
    const write = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      expect(await runValidate({ root, strict: false, format: "text", failOn: "never" })).toBe(0);
    } finally {
      write.mockRestore();
    }
  });

  // QFAI:EX-0001-0039-22
  it("prints no pass summary for a run that did not finish, even under --fail-on never", async () => {
    const root = await project();
    validateProjectSpy.mockImplementation(() => Promise.reject(errno("EPERM", root)));
    const lines: string[] = [];
    const write = vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      lines.push(String(chunk));
      return true;
    });
    try {
      expect(await runValidate({ root, strict: false, format: "text", failOn: "never" })).toBe(0);
    } finally {
      write.mockRestore();
    }

    const out = lines.join("");
    expect(out).toContain("QFAI-SCAN-002");
    expect(out).not.toMatch(/^qfai validate: passed /m);
    expect(out.trimEnd().split("\n").at(-2)).toBe("fail-on: never");
  });

  // QFAI:EX-0001-0039-60
  it("records a run that did not finish as incomplete in every output, whatever --fail-on says", async () => {
    // `--fail-on never` decides the exit code only. Before this, the run log
    // and the GitHub summary derived their verdict from the exit threshold, so
    // the run the text output refused to call a pass was recorded as one.
    for (const failOn of ["never", "error"] as const) {
      const root = await project();
      validateProjectSpy.mockImplementation(() => Promise.reject(errno("EPERM", root)));
      const lines: string[] = [];
      const write = vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
        lines.push(String(chunk));
        return true;
      });
      try {
        await runValidate({ root, strict: false, format: "github", failOn });
      } finally {
        write.mockRestore();
      }

      expect(lines.join("")).toMatch(/^qfai validate summary: .* result=INCOMPLETE$/m);
      const run = await readRunLog(root);
      expect(run.validateLog).toMatch(/^- status: incomplete$/m);
      expect(run.summary).toMatch(/^- status: incomplete$/m);
      expect(run.runJson).toMatchObject({ result: { status: "incomplete", fail_on: failOn } });
      expect(run.validatorJson).toMatchObject({ status: "incomplete" });
    }
  });

  it("records a run that finished as a pass under --fail-on never", async () => {
    // The negative control for the row above: a completed run keeps its pass.
    const root = await project();
    const lines: string[] = [];
    const write = vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      lines.push(String(chunk));
      return true;
    });
    try {
      await runValidate({ root, strict: false, format: "github", failOn: "never" });
    } finally {
      write.mockRestore();
    }

    expect(lines.join("")).toMatch(/^qfai validate summary: .* result=PASS$/m);
    const run = await readRunLog(root);
    expect(run.validateLog).toMatch(/^- status: pass$/m);
    expect(run.summary).toMatch(/^- status: pass$/m);
    expect(run.runJson).toMatchObject({ result: { status: "pass", fail_on: "never" } });
    expect(run.validatorJson).toMatchObject({ status: "pass" });
  });

  // QFAI:EX-0001-0039-69
  it("replaces an earlier clean result with the unfinished verdict, from validate", async () => {
    await expectCleanResultReplaced("validate", (root, failOn) =>
      runValidate({ root, strict: false, format: "text", failOn }),
    );
  });

  // QFAI:EX-0001-0061-03
  it("replaces an earlier clean result with the unfinished verdict, from report --run-validate", async () => {
    // `report --run-validate` let the rejection escape before it wrote any
    // result, so the clean `validate.json` of the run before stayed in place
    // and `--fail-on never` ended in an uncaught error instead of a verdict.
    await expectCleanResultReplaced("report", async (root, failOn) => {
      const { runReport } = await vi.importActual<ReportModule>("../../src/cli/commands/report.js");
      return runReport({ root, format: "md", runValidate: true, failOn });
    });
  });

  // QFAI:EX-0001-0061-05
  it("says a plain report of an unfinished run is not a clean result", async () => {
    // The notice belongs to the result the report renders, not to the
    // `--run-validate` path: a plain `qfai report` reading the result an
    // unfinished `qfai validate` wrote holds no verdict on the tree either.
    const { runReport } = await vi.importActual<ReportModule>("../../src/cli/commands/report.js");
    const notice = "report: validation did not finish, so this report is not a clean result.";
    const root = await project();
    const lines: string[] = [];
    const write = vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      lines.push(String(chunk));
      return true;
    });
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    try {
      // The control: a plain report of a finished run says nothing of the kind.
      await runValidate({ root, strict: false, format: "text", failOn: "never" });
      expect(await runReport({ root, format: "md", failOn: "never" })).toBe(0);
      expect(lines.join("")).not.toContain(notice);

      validateProjectSpy.mockImplementation(() => Promise.reject(errno("EPERM", root)));
      await runValidate({ root, strict: false, format: "text", failOn: "never" });
      lines.length = 0;
      expect(await runReport({ root, format: "md", failOn: "never" })).toBe(0);
      expect(lines.join("")).toContain(notice);
      expect(await runReport({ root, format: "md", failOn: "error" })).toBe(1);
    } finally {
      write.mockRestore();
      stderr.mockRestore();
    }
    const report = await readFile(path.join(root, ".qfai", "report", "report.md"), "utf-8");
    expect(report).toContain("QFAI-SCAN-002");
  });

  it("does not report an incomplete run when validation completes", async () => {
    // The negative control. Without it a handler that always reported would
    // pass every row above. The subject is the handler, not the validators, so
    // the spy resolves a completed result and the root holds only the output
    // directory `runValidate` writes into: no installation is needed.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-incomplete-"));
    dirs.push(root);
    await mkdir(path.join(root, ".qfai", "report"), { recursive: true });
    const completed: ValidationResult = {
      toolVersion: "0.0.0-test",
      profile: "full",
      profileValidatorsRan: true,
      issues: [],
      counts: { info: 0, warning: 0, error: 0 },
    };
    validateProjectSpy.mockImplementation(() => Promise.resolve(completed));

    const lines: string[] = [];
    const write = vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      lines.push(String(chunk));
      return true;
    });
    try {
      expect(await runValidate({ root, strict: false, format: "text", failOn: "never" })).toBe(0);
    } finally {
      write.mockRestore();
    }

    expect(validateProjectSpy).toHaveBeenCalledTimes(1);
    const out = lines.join("");
    expect(out).not.toContain("QFAI-SCAN-002");
    // The positive half: an early return would print no pass summary and
    // write no result, so the absence above alone could not tell it apart.
    expect(out).toMatch(/^qfai validate: passed \(fail-on never\): profile full, 0 errors/m);
    const parsed = await readResult(path.join(root, ".qfai", "report", "validate.json"));
    expect(parsed).toMatchObject({ counts: { error: 0 } });
    expect(findingsOf(parsed).map((entry) => entry.code)).not.toContain("QFAI-SCAN-002");
    const run = await readRunLog(root);
    expect(run.validateLog).toMatch(/^- status: pass$/m);
  });
});
