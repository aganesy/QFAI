/**
 * Integration: `qfai audit log` filters + newest-first ordering
 * (TC-0015-0028, AC-0015-0019).
 *
 * - lists records newest-first (timestamp-desc)
 * - `--scope` / `--operator` / `--clause` filter via AND composition
 * - `--format json` emits JSON; `--format table` (default) emits a
 *   tab-separated table
 */
// QFAI:SPEC-0015:TC-0015-0028

import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runAuditLog } from "../../../../src/cli/commands/auditLog.js";
import { writeDecisionRecord } from "../../../../src/core/decisionRecord.js";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-auditlog-int-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function seedRecords(): Promise<void> {
  // Three records with distinct envelope-deviation contexts +
  // controlled timestamps. We override `now` so timestamps are
  // deterministic (newest-first ordering is the contract).
  await writeDecisionRecord({
    root,
    question: "Q1 — scope expansion?",
    answer: "approved",
    scope: "scope-expansion",
    operatorIdentity: "alice",
    envelopeContractClause: "scope-expansion: extra spec-0099",
    now: () => new Date("2026-05-27T08:15:30Z"),
  });
  await writeDecisionRecord({
    root,
    question: "Q2 — architectural decision?",
    answer: "option-X",
    scope: "architectural-decision",
    operatorIdentity: "bob",
    envelopeContractClause: "architectural-decision: cross-spec",
    now: () => new Date("2026-05-28T10:00:00Z"),
  });
  await writeDecisionRecord({
    root,
    question: "Q3 — skill envelope?",
    answer: "ok",
    scope: "skill-envelope",
    operatorIdentity: "alice",
    envelopeContractClause: "skill-envelope: SKILL.md edit",
    now: () => new Date("2026-05-26T12:30:45Z"),
  });
}

describe("TC-0015-0028: runAuditLog filters and orders records", () => {
  it("emits all three records newest-first as JSON", async () => {
    await seedRecords();
    const written: string[] = [];
    const code = await runAuditLog({
      root,
      format: "json",
      write: (m) => written.push(m),
      writeErr: () => undefined,
    });
    expect(code).toBe(0);
    const parsed = JSON.parse(written[0] ?? "[]");
    expect(parsed).toHaveLength(3);
    const records = parsed as Array<Record<string, string>>;
    // Newest-first: 2026-05-28 > 2026-05-27 > 2026-05-26
    expect(records[0]?.scope).toBe("architectural-decision");
    expect(records[1]?.scope).toBe("scope-expansion");
    expect(records[2]?.scope).toBe("skill-envelope");
  });

  it("filters by --scope (AND-composed)", async () => {
    await seedRecords();
    const written: string[] = [];
    const code = await runAuditLog({
      root,
      format: "json",
      scope: "scope-expansion",
      write: (m) => written.push(m),
      writeErr: () => undefined,
    });
    expect(code).toBe(0);
    const parsed = JSON.parse(written[0] ?? "[]") as Array<Record<string, string>>;
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.scope).toBe("scope-expansion");
  });

  it("filters by --operator", async () => {
    await seedRecords();
    const written: string[] = [];
    await runAuditLog({
      root,
      format: "json",
      operator: "alice",
      write: (m) => written.push(m),
      writeErr: () => undefined,
    });
    const parsed = JSON.parse(written[0] ?? "[]") as Array<Record<string, string>>;
    expect(parsed).toHaveLength(2);
    for (const r of parsed) expect(r.operatorIdentity).toBe("alice");
  });

  it("filters by --clause (substring on envelopeContractClause)", async () => {
    await seedRecords();
    const written: string[] = [];
    await runAuditLog({
      root,
      format: "json",
      clause: "spec-0099",
      write: (m) => written.push(m),
      writeErr: () => undefined,
    });
    const parsed = JSON.parse(written[0] ?? "[]") as Array<Record<string, string>>;
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.envelopeContractClause).toMatch(/spec-0099/);
  });

  it("AND-composes filters: --scope + --operator", async () => {
    await seedRecords();
    const written: string[] = [];
    await runAuditLog({
      root,
      format: "json",
      scope: "scope-expansion",
      operator: "alice",
      write: (m) => written.push(m),
      writeErr: () => undefined,
    });
    const parsed = JSON.parse(written[0] ?? "[]") as Array<Record<string, string>>;
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.scope).toBe("scope-expansion");
    expect(parsed[0]?.operatorIdentity).toBe("alice");
  });

  it("emits a tab-separated table by default", async () => {
    await seedRecords();
    const written: string[] = [];
    const code = await runAuditLog({
      root,
      write: (m) => written.push(m),
      writeErr: () => undefined,
    });
    expect(code).toBe(0);
    const out = written.join("\n");
    // Header line + 3 record rows.
    expect(out).toMatch(/timestamp\tscope\toperator\tclause/);
    expect(out.split("\n").length).toBeGreaterThanOrEqual(4);
  });

  it("keeps the table a valid TSV stream when a filter matches nothing", async () => {
    await seedRecords();
    const written: string[] = [];
    const errs: string[] = [];
    const code = await runAuditLog({
      root,
      scope: "no-such-scope",
      write: (m) => written.push(m),
      writeErr: (m) => errs.push(m),
    });
    expect(code).toBe(0);
    const rows = written.join("\n").split("\n");
    // Header row, zero data rows — `cut -f2` must see `scope` only.
    expect(rows).toEqual(["timestamp\tscope\toperator\tclause"]);
    const scopeColumn = rows.slice(1).map((line) => line.split("\t")[1]);
    expect(scopeColumn).toEqual([]);
    // The prose hint is on stderr, never in the piped data channel.
    expect(errs.join("\n")).toMatch(/no decision records/i);
  });
});
