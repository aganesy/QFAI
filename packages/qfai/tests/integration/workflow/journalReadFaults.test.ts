// QFAI:AC-0001-0189-09
// QFAI:EX-0001-0189-09
// QFAI:EX-0001-0189-33

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
    writeJournal: string | null;
    writeError: Error | null;
    writeAttempts: number;
  } => ({
    journal: null,
    error: null,
    diagnosticError: null,
    attempts: 0,
    writeJournal: null,
    writeError: null,
    writeAttempts: 0,
  }),
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
    writeFile: async (...args: Parameters<typeof actual.writeFile>) => {
      const file = path.resolve(String(args[0]));
      if (
        fault.writeJournal !== null &&
        path.dirname(file) === fault.writeJournal &&
        path.basename(file).endsWith(".tmp")
      ) {
        fault.writeAttempts += 1;
        throw fault.writeError;
      }
      return actual.writeFile(...args);
    },
  };
});

afterEach(async () => {
  fault.journal = null;
  fault.error = null;
  fault.diagnosticError = null;
  fault.attempts = 0;
  fault.writeJournal = null;
  fault.writeError = null;
  fault.writeAttempts = 0;
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

for (const { operation, named, label } of [
  { operation: "status", named: true, label: "status --run" },
  { operation: "next", named: true, label: "next --run" },
  { operation: "status", named: false, label: "status" },
  { operation: "start", named: false, label: "start" },
] as const) {
  it.each(CODES)(
    `${label} reports the primary %s directory fault after one attempt without changing runs`,
    async (code) => {
      const root = await minimalProject();
      const runId = await startRun(root);
      const runDir = path.join(root, RUNS_DIR, runId);
      const journal = path.join(runDir, "journal");
      const before = await treeDigest(path.join(root, RUNS_DIR));
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
        exit = await runWorkflow({ root, operation, ...(named ? { runId } : {}) });
      } finally {
        stdout.mockRestore();
        fault.journal = null;
      }
      const document: unknown = JSON.parse(lines.join(""));

      expect({
        ok: field(document, "ok"),
        error: field(document, "error.code"),
        cause: field(document, "error.cause"),
        run: field(document, "run"),
        exit,
        unchanged: (await treeDigest(path.join(root, RUNS_DIR))) === before,
        lock: existsSync(path.join(root, RUNS_DIR, ".lock")),
      }).toEqual({
        ok: false,
        error: "io-error",
        cause: code,
        run: null,
        exit: 1,
        unchanged: true,
        lock: false,
      });
      expect(fault.attempts).toBe(1);
    },
  );
}

it.each(CODES)(
  "next retains verified run metadata after a later %s journal write fault",
  async (code) => {
    const root = await minimalProject();
    const runId = await startRun(root);
    const journal = path.join(root, RUNS_DIR, runId, "journal");
    fault.writeJournal = journal;
    fault.writeError = Object.assign(new Error(`Journal write failed with ${code}`), {
      code,
      path: journal,
    });
    const lines: string[] = [];
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      lines.push(String(chunk));
      return true;
    });
    let exit: number;
    try {
      exit = await runWorkflow({ root, operation: "next", runId });
    } finally {
      stdout.mockRestore();
      fault.writeJournal = null;
    }
    const document: unknown = JSON.parse(lines.join(""));

    expect({
      ok: field(document, "ok"),
      error: field(document, "error.code"),
      cause: field(document, "error.cause"),
      run: field(document, "run"),
      exit,
      lock: existsSync(path.join(root, RUNS_DIR, ".lock")),
    }).toEqual({
      ok: false,
      error: "io-error",
      cause: code,
      run: { id: runId, state: "routing", sequence: 2 },
      exit: 1,
      lock: false,
    });
    expect(fault.writeAttempts).toBe(1);
  },
);

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
