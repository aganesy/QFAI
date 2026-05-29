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
  it("returns 0 and writes the table-default no-records marker when the directory is absent", async () => {
    const written: string[] = [];
    const errs: string[] = [];
    const code = await runAuditLog({
      root,
      write: (m) => written.push(m),
      writeErr: (m) => errs.push(m),
    });
    expect(code).toBe(0);
    expect(errs).toEqual([]);
    // table format default: prints the no-records marker rather than [].
    expect(written.length).toBeGreaterThanOrEqual(1);
    expect(written.join("\n")).toMatch(/no decision records|^\(/i);
  });

  it("emits a JSON empty array when --format json is set on empty store", async () => {
    const written: string[] = [];
    const code = await runAuditLog({
      root,
      format: "json",
      write: (m) => written.push(m),
      writeErr: () => undefined,
    });
    expect(code).toBe(0);
    expect(written.length).toBe(1);
    const parsed = JSON.parse(written[0] ?? "null");
    expect(Array.isArray(parsed)).toBe(true);
    expect((parsed as unknown[]).length).toBe(0);
  });
});
