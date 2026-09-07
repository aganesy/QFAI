/**
 * Integration test for the ATDD scaffold escalation path — counter
 * persistence in `.qfai/state.json` and the warning→error escalation
 * after 3 cycles without progress (configurable threshold).
 *
 * Tests run against a deterministic temp-dir fixture (mkdtemp +
 * afterEach rm) and exercise the production helpers directly.
 */
// QFAI:SPEC-0008:TC-0008-0014

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runAtddScaffold } from "../../src/cli/commands/atddScaffold.js";
import {
  listValidateCycleKeys,
  readScaffoldAttempts,
  readValidateCycles,
  recordScaffoldAttempt,
  recordValidateCycle,
  resetValidateCycle,
  shouldEscalate,
} from "../../src/core/atdd/scaffoldEscalation.js";

let root: string;

async function writeSeedSpec(specDir: string): Promise<void> {
  await mkdir(specDir, { recursive: true });
  const testCases = [
    "# 06 Test Cases",
    "",
    "## TC-0001-0001: Lingering case",
    "",
    "- EX-Ref: EX-0001-0001",
    "- AC-Refs: AC-0001-0001",
    "- Verify normal path behavior.",
    "",
  ].join("\n");
  await writeFile(path.join(specDir, "06_Test-Cases.md"), testCases, "utf-8");
}

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-scaffold-esc-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("atdd scaffold — idempotency + 3-cycle escalation", () => {
  it("TC-0008-0014 — shouldEscalate returns false below threshold and true at/above threshold", () => {
    expect(shouldEscalate(0, 3)).toBe(false);
    expect(shouldEscalate(1, 3)).toBe(false);
    expect(shouldEscalate(2, 3)).toBe(false);
    expect(shouldEscalate(3, 3)).toBe(true);
    expect(shouldEscalate(4, 3)).toBe(true);
  });

  it("TC-0008-0014 — recordScaffoldAttempt increments a per-(spec, tc) counter in state.json across runs (boundary)", async () => {
    const specId = "spec-0001";
    const tcId = "TC-0001-0001";

    expect(await readScaffoldAttempts(root, specId, tcId)).toBe(0);
    await recordScaffoldAttempt(root, specId, tcId);
    expect(await readScaffoldAttempts(root, specId, tcId)).toBe(1);
    await recordScaffoldAttempt(root, specId, tcId);
    await recordScaffoldAttempt(root, specId, tcId);
    expect(await readScaffoldAttempts(root, specId, tcId)).toBe(3);

    // A sibling TC has its own independent counter.
    expect(await readScaffoldAttempts(root, specId, "TC-0001-0002")).toBe(0);
  });

  it("TC-0008-0014 — running scaffold 3 times against an unprogressed placeholder triggers an escalation warning naming the TC (error)", async () => {
    const specId = "spec-0001";
    const specDir = path.join(root, ".qfai", "specs", specId);
    await writeSeedSpec(specDir);

    const errsRun1: string[] = [];
    const errsRun2: string[] = [];
    const errsRun3: string[] = [];

    await runAtddScaffold({ root, specId, write: () => {}, writeErr: (m) => errsRun1.push(m) });
    await runAtddScaffold({ root, specId, write: () => {}, writeErr: (m) => errsRun2.push(m) });
    await runAtddScaffold({ root, specId, write: () => {}, writeErr: (m) => errsRun3.push(m) });

    // First two runs MUST NOT escalate (placeholder is fresh, then 1
    // unprogressed cycle).
    expect(errsRun1.join("\n")).not.toMatch(/escalat/i);
    expect(errsRun2.join("\n")).not.toMatch(/escalat/i);

    // Third run escalates and names the TC ID + suggests manual review.
    const joined = errsRun3.join("\n");
    expect(joined).toMatch(/escalat/i);
    expect(joined).toContain("TC-0001-0001");
    expect(joined).toMatch(/manual review/i);

    // Counter persisted in `.qfai/state.json` and survives across runs.
    const raw = await readFile(path.join(root, ".qfai", "state.json"), "utf-8");
    const parsed: unknown = JSON.parse(raw);
    expect(parsed && typeof parsed === "object").toBe(true);
  });

  it("TC-0008-0014 — once the skeleton is replaced with a real assertion, the counter resets and escalation does not fire (recovery)", async () => {
    const specId = "spec-0001";
    const specDir = path.join(root, ".qfai", "specs", specId);
    await writeSeedSpec(specDir);

    // First run emits skeleton.
    await runAtddScaffold({ root, specId, write: () => {}, writeErr: () => {} });

    // Replace the placeholder with a "real" test body (no placeholder marker).
    const filePath = path.join(root, "tests", "integration", specId, "TC-0001-0001.test.ts");
    const realBody = [
      'import { describe, it, expect } from "vitest";',
      "// QFAI:SPEC-0001:TC-0001-0001",
      'describe("TC-0001-0001", () => {',
      '  it("asserts real behavior", () => { expect(1).toBe(1); });',
      "});",
      "",
    ].join("\n");
    await writeFile(filePath, realBody, "utf-8");

    // Two further runs should observe progress and not escalate.
    const errs2: string[] = [];
    const errs3: string[] = [];
    await runAtddScaffold({ root, specId, write: () => {}, writeErr: (m) => errs2.push(m) });
    await runAtddScaffold({ root, specId, write: () => {}, writeErr: (m) => errs3.push(m) });

    expect(errs2.join("\n")).not.toMatch(/escalat/i);
    expect(errs3.join("\n")).not.toMatch(/escalat/i);

    // Counter reset to 0 after progress detected.
    expect(await readScaffoldAttempts(root, specId, "TC-0001-0001")).toBe(0);
  });

  it("TC-0008-0014 — escalation threshold is configurable via qfai.config.yaml#atdd.scaffoldEscalateCycles (special)", async () => {
    const specId = "spec-0001";
    const specDir = path.join(root, ".qfai", "specs", specId);
    await writeSeedSpec(specDir);

    // Lower the threshold to 1: even the first run escalates because
    // the placeholder is unprogressed after one cycle is recorded.
    const cfg = ["atdd:", "  scaffoldEscalateCycles: 1", ""].join("\n");
    await writeFile(path.join(root, "qfai.config.yaml"), cfg, "utf-8");

    const errs: string[] = [];
    await runAtddScaffold({ root, specId, write: () => {}, writeErr: (m) => errs.push(m) });

    expect(errs.join("\n")).toMatch(/escalat/i);
    expect(errs.join("\n")).toContain("TC-0001-0001");
  });
});

describe("atdd scaffold — concurrent counter updates keep every increment", () => {
  it("TC-0008-0014 — 12 overlapping increments on one (spec, TC) all land (boundary)", async () => {
    const specId = "spec-0001";
    const tcId = "TC-0001-0001";
    const attempts = 12;

    // A lock-free load-mutate-store loses updates here: every call reads the
    // same snapshot before any of them writes, so the counter ends at 1 and
    // the escalation never trips.
    await Promise.all(
      Array.from({ length: attempts }, () => recordValidateCycle(root, specId, tcId)),
    );

    expect(await readValidateCycles(root, specId, tcId)).toBe(attempts);
  });

  it("TC-0008-0014 — increments interleaved across specs do not drop a sibling's key (error)", async () => {
    const pairs = [
      { specId: "spec-0001", tcId: "TC-0001-0001" },
      { specId: "spec-0002", tcId: "TC-0002-0001" },
      { specId: "spec-0003", tcId: "TC-0003-0001" },
    ];

    await Promise.all(
      pairs.flatMap((pair) => [
        recordValidateCycle(root, pair.specId, pair.tcId),
        recordValidateCycle(root, pair.specId, pair.tcId),
      ]),
    );

    for (const pair of pairs) {
      expect(await readValidateCycles(root, pair.specId, pair.tcId)).toBe(2);
    }
    expect(await listValidateCycleKeys(root)).toHaveLength(pairs.length);
  });

  it("TC-0008-0014 — a reset concurrent with increments leaves the other counters intact (recovery)", async () => {
    const kept = { specId: "spec-0002", tcId: "TC-0002-0001" };
    await recordValidateCycle(root, "spec-0001", "TC-0001-0001");

    await Promise.all([
      resetValidateCycle(root, "spec-0001", "TC-0001-0001"),
      recordValidateCycle(root, kept.specId, kept.tcId),
      recordValidateCycle(root, kept.specId, kept.tcId),
    ]);

    expect(await readValidateCycles(root, "spec-0001", "TC-0001-0001")).toBe(0);
    expect(await readValidateCycles(root, kept.specId, kept.tcId)).toBe(2);
  });
});
