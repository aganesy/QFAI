/**
 * `validate` produces a verdict even when a validator throws (#1104).
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
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as CoreValidateModule from "../../src/core/validate.js";

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

const dirs: string[] = [];

function errno(code: string, target: string): NodeJS.ErrnoException {
  const error = new Error(`${code}: simulated, stat '${target}'`) as NodeJS.ErrnoException;
  error.code = code;
  error.path = target;
  return error;
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
  await runInit({ dir, force: false, dryRun: false, yes: true });
  return dir;
}

/** A libuv error as Node raises one: `code`, `syscall`, `errno` and `path`. */
const libuvError = (code: string, syscall: string, at: string): Error => {
  const err: NodeJS.ErrnoException = new Error(`${code}: operation failed, ${syscall} '${at}'`);
  err.code = code;
  err.syscall = syscall;
  err.path = at;
  return err;
};

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
    expect(described?.message).toContain("未判定");
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

  it("leaves a deliberate refusal alone", () => {
    // The command said something specific about this project's state. Prefixing
    // it with a filesystem story would be a regression, not a fix.
    const refusal = new Error("certify: iteration 3 has no verify.json — refusing to certify");
    expect(describeIncompleteRun(refusal, "certify")).toBeNull();
  });

  it("leaves an error already wrapped with its path alone", () => {
    // `cli/lib/fs.ts` wraps its `stat` failure in a message naming the entry.
    // That error has neither `code` nor `syscall`, and it has already said what
    // this function would add.
    const wrapped = new Error("テンプレートの種別を判定できません: /t/x — EPERM", {
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
  // `validate` answers a fault with `QFAI-SCAN-002` because #1112 wrapped
  // `validateProject`. The rest have no verdict artifact, so the rows above
  // only matter if `run` actually consults them — which is what this checks,
  // through a command that is not `validate`.
  it("attributes a fault raised inside `report` to `report`", async () => {
    runReportSpy.mockRejectedValueOnce(libuvError("EPERM", "stat", "/p/.qfai"));

    await expect(run(["report", "--dir", process.cwd()], process.cwd())).rejects.toThrow(/report/);
  });

  it("says the run is undetermined, not that it is clean", async () => {
    runReportSpy.mockRejectedValueOnce(libuvError("EPERM", "stat", "/p/.qfai"));

    await expect(run(["report", "--dir", process.cwd()], process.cwd())).rejects.toThrow(/未判定/);
  });

  it("passes a command's own refusal through unchanged", async () => {
    const refusal = new Error("report: .qfai/specs is empty — nothing to report");
    runReportSpy.mockRejectedValueOnce(refusal);

    await expect(run(["report", "--dir", process.cwd()], process.cwd())).rejects.toBe(refusal);
  });
});

describe("validate reports a run it could not finish", () => {
  it("emits QFAI-SCAN-002 instead of letting the error escape", async () => {
    const root = await project();
    const wrapper = path.join(root, ".claude", "skills", "qfai-atdd");
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

    const raw = await readFile(path.join(root, ".qfai", "report", "validate.json"), "utf-8");
    const parsed = JSON.parse(raw) as {
      counts: { error: number; warning: number; info: number };
      issues: { code: string; severity: string }[];
    };
    // A downstream reader must not be able to take this for "no problems
    // found": the error count is non-zero and the finding says why.
    expect(parsed.counts.error).toBe(1);
    expect(parsed.issues.map((entry) => entry.code)).toContain("QFAI-SCAN-002");
    expect(parsed.issues.find((entry) => entry.code === "QFAI-SCAN-002")?.severity).toBe("error");
  });

  it("fails the run whatever --fail-on says, except never", async () => {
    // The severity is fixed at `error`, so `--fail-on warning` and the default
    // both fail on the count alone. `--fail-on never` is the one exception a
    // caller asked for explicitly, and it stays honoured — the finding is still
    // in the output either way. Pinned because the exit code is deliberately
    // NOT derived from counting severities: a promotion window would have made
    // this a warning, and a warning exits 0 under the default.
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

  it("does not report an incomplete run when validation completes", async () => {
    // The negative control. Without it a handler that always reported would
    // pass every row above.
    const root = await project();

    const lines: string[] = [];
    const write = vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      lines.push(String(chunk));
      return true;
    });
    try {
      await runValidate({ root, strict: false, format: "text", failOn: "never" });
    } finally {
      write.mockRestore();
    }

    expect(lines.join("")).not.toContain("QFAI-SCAN-002");
  });
});
