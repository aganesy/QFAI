// QFAI:AC-0001-0189-09
// QFAI:EX-0001-0189-09

import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import type * as FsPromises from "node:fs/promises";
import path from "node:path";

import { afterEach, expect, it, vi } from "vitest";

import { runWorkflow } from "../../../src/cli/commands/workflow.js";
import { readJournal, RUNS_DIR } from "../../../src/core/workflow/persistence.js";
import { field, minimalProject, removeProjects, startRun, treeDigest } from "./workflowProject.js";

const fault = vi.hoisted(
  (): {
    journal: string | null;
    error: Error | null;
    diagnosticError: Error | null;
    attempts: number;
  } => ({ journal: null, error: null, diagnosticError: null, attempts: 0 }),
);

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof FsPromises>();
  return {
    ...actual,
    readdir: async (...args: Parameters<typeof actual.readdir>) => {
      if (fault.journal !== null && path.resolve(String(args[0])) === fault.journal) {
        fault.attempts += 1;
        throw fault.attempts > 1 && fault.diagnosticError ? fault.diagnosticError : fault.error;
      }
      return actual.readdir(...args);
    },
  };
});

afterEach(async () => {
  fault.journal = null;
  fault.error = null;
  fault.diagnosticError = null;
  fault.attempts = 0;
  vi.restoreAllMocks();
  await removeProjects();
});

const CODES = ["EBUSY", "EPERM", "EACCES"];

it.each(CODES)(
  "readJournal preserves the original %s directory error after one attempt",
  async (code) => {
    const root = await minimalProject();
    const runDir = path.join(root, RUNS_DIR, "run-20200101000000000");
    const journal = path.join(runDir, "journal");
    await mkdir(journal, { recursive: true });
    const error = Object.assign(new Error(`Directory read failed with ${code}`), {
      code,
      path: journal,
    });
    fault.journal = journal;
    fault.error = error;

    await expect(readJournal(runDir)).rejects.toBe(error);
    expect(fault.attempts).toBe(1);
  },
);

for (const operation of ["status", "next"] as const) {
  it.each(CODES)(
    `${operation} reports the primary %s directory fault without changing the run`,
    async (code) => {
      const root = await minimalProject();
      const runId = await startRun(root);
      const runDir = path.join(root, RUNS_DIR, runId);
      const journal = path.join(runDir, "journal");
      const before = await treeDigest(runDir);
      fault.journal = journal;
      fault.error = Object.assign(new Error(`Primary directory read failed with ${code}`), {
        code,
        path: journal,
      });
      fault.diagnosticError = Object.assign(new Error("Diagnostic directory read failed"), {
        code: code === "EACCES" ? "EPERM" : "EACCES",
        path: journal,
      });
      const lines: string[] = [];
      const stdout = vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
        lines.push(String(chunk));
        return true;
      });
      let exit: number;
      try {
        exit = await runWorkflow({ root, operation, runId });
      } finally {
        stdout.mockRestore();
        fault.journal = null;
      }
      const document: unknown = JSON.parse(lines.join(""));

      expect({
        ok: field(document, "ok"),
        error: field(document, "error.code"),
        cause: field(document, "error.cause"),
        exit,
        unchanged: (await treeDigest(runDir)) === before,
        lock: existsSync(path.join(root, RUNS_DIR, ".lock")),
      }).toEqual({
        ok: false,
        error: "io-error",
        cause: code,
        exit: 1,
        unchanged: true,
        lock: false,
      });
      // The failed operation reads once; error reporting may make one best-effort metadata read.
      expect(fault.attempts).toBeGreaterThanOrEqual(1);
      expect(fault.attempts).toBeLessThanOrEqual(2);
    },
  );
}

it("a missing journal directory remains legacy", async () => {
  const root = await minimalProject();
  const runDir = path.join(root, RUNS_DIR, "run-20200101000000000");
  await mkdir(runDir, { recursive: true });

  await expect(readJournal(runDir)).resolves.toEqual({ ok: false, fault: "legacy" });
});

it("a legacy-format first event remains legacy", async () => {
  const root = await minimalProject();
  const runDir = path.join(root, RUNS_DIR, "run-20200101000000000");
  const journal = path.join(runDir, "journal");
  await mkdir(journal, { recursive: true });
  await writeFile(path.join(journal, "000001.json"), JSON.stringify({ state: "running" }));

  await expect(readJournal(runDir)).resolves.toEqual({ ok: false, fault: "legacy" });
});

it("malformed event JSON remains an integrity fault", async () => {
  const root = await minimalProject();
  const runDir = path.join(root, RUNS_DIR, "run-20200101000000000");
  const journal = path.join(runDir, "journal");
  await mkdir(journal, { recursive: true });
  await writeFile(path.join(journal, "000001.json"), "{");

  await expect(readJournal(runDir)).resolves.toEqual({ ok: false, fault: "torn-event" });
});

it("a valid journal still reads its published records", async () => {
  const root = await minimalProject();
  const runId = await startRun(root);

  await expect(readJournal(path.join(root, RUNS_DIR, runId))).resolves.toMatchObject({
    ok: true,
    records: expect.arrayContaining([expect.objectContaining({ sequence: 1 })]),
    lastHash: expect.any(String),
  });
});
