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

const { validateProjectSpy } = vi.hoisted(() => ({ validateProjectSpy: vi.fn() }));

vi.mock("../../src/core/validate.js", async () => {
  const actual = await vi.importActual<CoreValidate>("../../src/core/validate.js");
  return {
    ...actual,
    validateProject: (...args: unknown[]) => validateProjectSpy(actual, ...args),
  };
});

const { runValidate } = await import("../../src/cli/commands/validate.js");

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
