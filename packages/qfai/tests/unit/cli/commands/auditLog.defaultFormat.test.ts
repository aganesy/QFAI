/**
 * Unit: `qfai audit log` boundary (TC-0015-0029, AC-0015-0019).
 *
 * - default `--format` is `table`
 * - empty / absent `.qfai/evidence/decisions/` yields empty result,
 *   exit 0 (no error)
 */
// QFAI:SPEC-0015:TC-0015-0029

import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runAuditLog } from "../../../../src/cli/commands/auditLog.js";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-auditlog-unit-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("TC-0015-0029: runAuditLog default format + empty store", () => {
  it("returns 0 and writes a header-only TSV table when the directory is absent", async () => {
    const written: string[] = [];
    const errs: string[] = [];
    const code = await runAuditLog({
      root,
      write: (m) => written.push(m),
      writeErr: (m) => errs.push(m),
    });
    expect(code).toBe(0);
    // table format default: stdout stays a well-formed TSV stream — the
    // header row and zero data rows — so `cut -f2` yields only `scope`.
    expect(written.join("\n")).toBe("timestamp\tscope\toperator\tclause");
    for (const line of written.join("\n").split("\n")) {
      expect(line.split("\t")).toHaveLength(4);
    }
    // the human-facing hint lives on stderr, so pipes never see it.
    expect(errs.join("\n")).toMatch(/no decision records/i);
  });

  it("emits a JSON empty array when --format json is set on empty store", async () => {
    const written: string[] = [];
    const errs: string[] = [];
    const code = await runAuditLog({
      root,
      format: "json",
      write: (m) => written.push(m),
      writeErr: (m) => errs.push(m),
    });
    expect(code).toBe(0);
    expect(written.length).toBe(1);
    const parsed = JSON.parse(written[0] ?? "null");
    expect(Array.isArray(parsed)).toBe(true);
    expect((parsed as unknown[]).length).toBe(0);
    // `[]` is already the correct empty value in JSON: no extra hint.
    expect(errs).toEqual([]);
  });
});
