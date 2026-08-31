/**
 * Unit: `D-SCAFFOLD-PLACEHOLDER` validator.
 *
 * Pins the bridge between `qfai atdd scaffold` (which emits
 * skeleton files containing `QFAI-SCAFFOLD-PLACEHOLDER` +
 * `// TODO: implement assertion for <TC-ID>`) and
 * `qfai validate --profile atdd|full`, so unfilled scaffolds are
 * visible to the validate surface AND the validate-only per-(spec,
 * TC) cycle counter (`atdd.scaffoldValidateCycles`) advances every
 * validate cycle.
 *
 * Severity contract:
 *   - Cycles 1, 2: severity `warning`
 *   - Cycle 3 onward: severity `error` (default
 *     `atdd.scaffoldEscalateCycles = 3`)
 *
 * Counter separation: the validate counter
 * (`atdd.scaffoldValidateCycles`) is decoupled from the scaffold
 * counter (`atdd.scaffoldAttempts`) so the spec's "consecutive
 * `qfai validate` cycles" semantics survives interleaved scaffold
 * runs (one `qfai atdd scaffold` invocation does NOT count toward
 * the validate cycle).
 */
// QFAI:SPEC-0008:TC-0008-0013
// QFAI:SPEC-0008:TC-0008-0014

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { defaultConfig } from "../../../../src/core/config.js";
import { validateScaffoldPlaceholder } from "../../../../src/core/validators/scaffoldPlaceholder.js";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-scaffold-placeholder-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function seedScaffold(specId: string, tcId: string, body: string): Promise<void> {
  const dir = path.join(root, "tests", "atdd", specId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${tcId}.test.ts`), body, "utf-8");
}

// Source-level split of the `*.skip(` token so this fixture does not
// false-positive when `validateTestTodoStubs` scans this repo's own test
// files. Mirrors the `const TODO = ".todo"` split in `testTodoStubs.test.ts`;
// the on-disk fixture content is identical.
const SKIP = ".skip";

/**
 * The pytest shape `qfai atdd scaffold` emits on a project whose
 * `testFileGlobs` derive `.py`: neither the `*.test.ts` basename this
 * validator used to glob, nor the `//` comment prefix its TODO marker used to
 * anchor on. Both had to move with the writer, or the stack-aware skeleton
 * would be a placeholder no gate ever reports.
 */
async function seedPythonScaffold(specId: string, tcId: string): Promise<void> {
  const dir = path.join(root, "tests", "integration", specId);
  await mkdir(dir, { recursive: true });
  const snake = tcId.toLowerCase().replace(/-/g, "_");
  const body = [
    `# QFAI:SPEC-0008:${tcId}`,
    `# QFAI-SCAFFOLD-PLACEHOLDER — replace this block with a real assertion.`,
    `# AC refs: AC-0008-0001`,
    "",
    `import unittest`,
    "",
    "",
    `class Test_${tcId.replace(/-/g, "_")}(unittest.TestCase):`,
    `    def test_${snake}(self) -> None:`,
    `        # TODO: implement assertion for ${tcId}`,
    `        raise NotImplementedError("pending — scaffold placeholder")`,
    "",
  ].join("\n");
  await writeFile(path.join(dir, `test_${snake}.py`), body, "utf-8");
}

function placeholderBodyFor(tcId: string): string {
  return `// QFAI:SPEC-0008:${tcId}
// QFAI-SCAFFOLD-PLACEHOLDER — replace this block with a real assertion.
// AC refs: AC-0008-0001
// US refs: US-0008-0001

import { describe, it } from "vitest";

describe("${tcId}", () => {
  // TODO: implement assertion for ${tcId}
  it${SKIP}("pending — scaffold placeholder", () => {
    // TODO: implement assertion for ${tcId}
  });
});
`;
}

const FILLED_BODY = `// QFAI:SPEC-0008:TC-0008-0001
// AC refs: AC-0008-0001

import { describe, it, expect } from "vitest";

describe("TC-0008-0001", () => {
  it("passes the real assertion", () => {
    expect(1 + 1).toBe(2);
  });
});
`;

describe("validateScaffoldPlaceholder", () => {
  it("emits D-SCAFFOLD-PLACEHOLDER (warning) for unfilled scaffold files on the first validate cycle", async () => {
    await seedScaffold("spec-0008", "TC-0008-0001", placeholderBodyFor("TC-0008-0001"));
    const issues = await validateScaffoldPlaceholder(root, defaultConfig);
    const finding = issues.find((i) => i.code === "D-SCAFFOLD-PLACEHOLDER");
    expect(finding).toBeDefined();
    // First cycle: warning.
    expect(finding?.severity).toBe("warning");
    expect(finding?.message ?? "").toMatch(/TC-0008-0001/);
    expect(finding?.message ?? "").toMatch(/tests\/atdd\/spec-0008\/TC-0008-0001\.test\.ts/);
  });

  it("emits D-SCAFFOLD-PLACEHOLDER for a pytest skeleton (`#` comments, `test_*.py` name)", async () => {
    await seedPythonScaffold("spec-0008", "TC-0008-0001");
    const issues = await validateScaffoldPlaceholder(root, defaultConfig);
    const finding = issues.find((i) => i.code === "D-SCAFFOLD-PLACEHOLDER");
    expect(finding).toBeDefined();
    expect(finding?.message ?? "").toMatch(/TC-0008-0001/);
    expect(finding?.message ?? "").toMatch(/tests\/integration\/spec-0008\/test_tc_0008_0001\.py/);
  });

  it("does NOT emit when the placeholder marker has been removed (operator filled the scaffold)", async () => {
    await seedScaffold("spec-0008", "TC-0008-0001", FILLED_BODY);
    const issues = await validateScaffoldPlaceholder(root, defaultConfig);
    expect(issues.filter((i) => i.code === "D-SCAFFOLD-PLACEHOLDER")).toEqual([]);
  });

  it("does NOT emit when tests/atdd does not exist (fresh project)", async () => {
    const issues = await validateScaffoldPlaceholder(root, defaultConfig);
    expect(issues).toEqual([]);
  });

  it("captures TC IDs from multiple placeholder files in one finding per file", async () => {
    await seedScaffold("spec-0008", "TC-0008-0001", placeholderBodyFor("TC-0008-0001"));
    await seedScaffold("spec-0008", "TC-0008-0002", placeholderBodyFor("TC-0008-0002"));
    const issues = await validateScaffoldPlaceholder(root, defaultConfig);
    const findings = issues.filter((i) => i.code === "D-SCAFFOLD-PLACEHOLDER");
    expect(findings.length).toBe(2);
    expect(findings.map((f) => f.message ?? "").join("\n")).toMatch(/TC-0008-0001/);
    expect(findings.map((f) => f.message ?? "").join("\n")).toMatch(/TC-0008-0002/);
  });

  // Pin the escalation contract: after `atdd.scaffoldEscalateCycles`
  // (default 3) consecutive validate cycles with the SAME placeholder
  // unremoved, the finding escalates from warning to error. The
  // validator increments a per-(spec, TC) counter in
  // `.qfai/state.json#atdd.scaffoldValidateCycles` on every call, so
  // running validate three times in a row trips the gate.
  it("escalates from warning to error after 3 consecutive validate cycles (default threshold)", async () => {
    await seedScaffold("spec-0008", "TC-0008-0001", placeholderBodyFor("TC-0008-0001"));

    // Cycle 1: counter advances 0 → 1; warning.
    const issues1 = await validateScaffoldPlaceholder(root, defaultConfig);
    const finding1 = issues1.find((i) => i.code === "D-SCAFFOLD-PLACEHOLDER");
    expect(finding1?.severity).toBe("warning");

    // Cycle 2: counter advances 1 → 2; still warning.
    const issues2 = await validateScaffoldPlaceholder(root, defaultConfig);
    const finding2 = issues2.find((i) => i.code === "D-SCAFFOLD-PLACEHOLDER");
    expect(finding2?.severity).toBe("warning");

    // Cycle 3: counter advances 2 → 3; threshold reached → error.
    const issues3 = await validateScaffoldPlaceholder(root, defaultConfig);
    const finding3 = issues3.find((i) => i.code === "D-SCAFFOLD-PLACEHOLDER");
    expect(finding3?.severity).toBe("error");
    expect(finding3?.message ?? "").toMatch(/escalated to error/);
  });

  it("honors qfai.config.yaml#atdd.scaffoldEscalateCycles override", async () => {
    await seedScaffold("spec-0008", "TC-0008-0001", placeholderBodyFor("TC-0008-0001"));
    const customConfig = {
      ...defaultConfig,
      atdd: { ...defaultConfig.atdd, scaffoldEscalateCycles: 1 },
    };
    // Threshold = 1 → very first cycle escalates immediately to
    // error (counter 0 → 1, `shouldEscalate(1, 1)` is true).
    const issues = await validateScaffoldPlaceholder(root, customConfig);
    const finding = issues.find((i) => i.code === "D-SCAFFOLD-PLACEHOLDER");
    expect(finding?.severity).toBe("error");
  });

  // Pin: scaffoldEscalateCycles = 0 means "escalation disabled" and
  // is honored identically by both `qfai validate` (this validator)
  // and `qfai atdd scaffold` (DRY threshold resolver). The previous
  // implementation defaulted 0 back to 3 in validate but honored 0
  // in scaffold, so the same config key meant opposite things.
  it("honors scaffoldEscalateCycles=0 (escalation disabled) and never advances to error", async () => {
    await seedScaffold("spec-0008", "TC-0008-0001", placeholderBodyFor("TC-0008-0001"));
    const customConfig = {
      ...defaultConfig,
      atdd: { ...defaultConfig.atdd, scaffoldEscalateCycles: 0 },
    };
    // Run 5 cycles — counter advances, but threshold=0 means
    // `shouldEscalate` always returns false → stays warning.
    for (let i = 0; i < 5; i += 1) {
      const issues = await validateScaffoldPlaceholder(root, customConfig);
      const finding = issues.find((i2) => i2.code === "D-SCAFFOLD-PLACEHOLDER");
      expect(finding?.severity).toBe("warning");
    }
  });

  // Pin: validate's cycle counter is DECOUPLED from scaffold's
  // `recordScaffoldAttempt`. The scaffold command may advance
  // `atdd.scaffoldAttempts` arbitrarily, but it MUST NOT spill into
  // `atdd.scaffoldValidateCycles` — so the spec contract "consecutive
  // `qfai validate` cycles" stays single-writer on the validate side.
  // Pre-fix: a single shared counter meant `scaffold ×2 + validate ×1`
  // tripped the threshold-3 gate on the first validate call.
  it("scaffold-side counter advances do NOT spill into the validate-side counter", async () => {
    const { recordScaffoldAttempt } =
      await import("../../../../src/core/atdd/scaffoldEscalation.js");
    await seedScaffold("spec-0008", "TC-0008-0001", placeholderBodyFor("TC-0008-0001"));
    // Simulate two `qfai atdd scaffold` invocations leaving the
    // placeholder unprogressed (counter advances on both).
    await recordScaffoldAttempt(root, "spec-0008", "TC-0008-0001");
    await recordScaffoldAttempt(root, "spec-0008", "TC-0008-0001");
    // Now run validate ONCE — pre-fix this would have escalated
    // (shared counter 2 + 1 = 3). Post-fix the validate counter is
    // separate (0 + 1 = 1) so severity remains warning.
    const issues = await validateScaffoldPlaceholder(root, defaultConfig);
    const finding = issues.find((i) => i.code === "D-SCAFFOLD-PLACEHOLDER");
    expect(finding?.severity).toBe("warning");
    expect(finding?.message ?? "").toMatch(/1\/3 validate cycles/);
  });

  // Pin: when the state-write fails (read-only FS / disk full /
  // permission denied / etc.), the finding still surfaces (fail-soft
  // to warning) AND the progress note clearly indicates the counter
  // is unavailable — so the operator is NOT misled into thinking
  // they have a fresh "0/N" grace window when the placeholder may
  // have persisted across many cycles already.
  it("surfaces 'counter unavailable' in the message when state write fails (fail-soft)", async () => {
    const escalationMod = await import("../../../../src/core/atdd/scaffoldEscalation.js");
    const original = escalationMod.recordValidateCycle;
    const spy = vi
      .spyOn(escalationMod, "recordValidateCycle")
      .mockRejectedValue(new Error("EACCES: read-only state.json"));
    try {
      await seedScaffold("spec-0008", "TC-0008-0001", placeholderBodyFor("TC-0008-0001"));
      const issues = await validateScaffoldPlaceholder(root, defaultConfig);
      const finding = issues.find((i) => i.code === "D-SCAFFOLD-PLACEHOLDER");
      // Still surfaces (fail-soft).
      expect(finding).toBeDefined();
      // Stays warning when the counter is unavailable.
      expect(finding?.severity).toBe("warning");
      // Message must NOT show a misleading "0/3" zero-progress display.
      expect(finding?.message ?? "").not.toMatch(/0\/3 validate cycles observed/);
      // Instead it should explicitly signal counter unavailability.
      expect(finding?.message ?? "").toMatch(/counter unavailable/);
    } finally {
      spy.mockRestore();
      void original;
    }
  });

  // Pin: one state-write failure disables the counter writes for the
  // REST of the pass. `updateState` waits out its whole lock budget
  // before it fails, so retrying per TC would multiply that wait by
  // the number of unfilled placeholders — a repo with 100 of them
  // would stall for minutes and then emit exactly the same fail-soft
  // findings.
  it("stops writing counters after the first state-write failure in a pass", async () => {
    const escalationMod = await import("../../../../src/core/atdd/scaffoldEscalation.js");
    const recordSpy = vi
      .spyOn(escalationMod, "recordValidateCycle")
      .mockRejectedValue(new Error("qfai: state lock ... is still held after 5000ms"));
    const resetSpy = vi.spyOn(escalationMod, "resetValidateCycle");
    try {
      await seedScaffold("spec-0008", "TC-0008-0001", placeholderBodyFor("TC-0008-0001"));
      await seedScaffold("spec-0008", "TC-0008-0002", placeholderBodyFor("TC-0008-0002"));
      await seedScaffold("spec-0008", "TC-0008-0003", placeholderBodyFor("TC-0008-0003"));
      // Two tracked-but-unobserved keys: the reset sweep would visit
      // both, and each visit is another full lock wait.
      await mkdir(path.join(root, ".qfai"), { recursive: true });
      await writeFile(
        path.join(root, ".qfai", "state.json"),
        JSON.stringify({
          atdd: {
            scaffoldValidateCycles: { "spec-0008:TC-0008-0008": 1, "spec-0008:TC-0008-0009": 1 },
          },
        }),
        "utf-8",
      );

      const issues = await validateScaffoldPlaceholder(root, defaultConfig);

      // Every placeholder is still reported (fail-soft), but only the
      // first one paid for a lock wait.
      expect(issues.filter((i) => i.code === "D-SCAFFOLD-PLACEHOLDER")).toHaveLength(3);
      expect(recordSpy).toHaveBeenCalledTimes(1);
      // The reset sweep must not restart the same wait either.
      expect(resetSpy).not.toHaveBeenCalled();
      for (const finding of issues.filter((i) => i.code === "D-SCAFFOLD-PLACEHOLDER")) {
        expect(finding.message).toMatch(/counter unavailable/);
      }
    } finally {
      recordSpy.mockRestore();
      resetSpy.mockRestore();
    }
  });

  // Pin: stale counters from a previous run are reset when the
  // placeholder is no longer observed this pass. This preserves the
  // "consecutive" semantics — an operator who fills the placeholder
  // and only re-runs `qfai validate` (not `qfai atdd scaffold`)
  // should not leave a leftover counter that turns a later
  // regression into a 1-cycle escalation.
  it("resets the validate-cycle counter when a previously-tracked placeholder is filled", async () => {
    const { readValidateCycles } = await import("../../../../src/core/atdd/scaffoldEscalation.js");
    await seedScaffold("spec-0008", "TC-0008-0001", placeholderBodyFor("TC-0008-0001"));
    // Two cycles → counter at 2.
    await validateScaffoldPlaceholder(root, defaultConfig);
    await validateScaffoldPlaceholder(root, defaultConfig);
    expect(await readValidateCycles(root, "spec-0008", "TC-0008-0001")).toBe(2);

    // Operator fills the placeholder. Run validate again — the
    // file is no longer "still placeholder" so the validator
    // observes nothing for this (spec, TC), and the stale counter
    // gets cleared.
    await writeFile(
      path.join(root, "tests", "atdd", "spec-0008", "TC-0008-0001.test.ts"),
      `// QFAI:SPEC-0008:TC-0008-0001
import { describe, it, expect } from "vitest";
describe("TC-0008-0001", () => {
  it("passes", () => {
    expect(1 + 1).toBe(2);
  });
});
`,
      "utf-8",
    );
    const issues = await validateScaffoldPlaceholder(root, defaultConfig);
    expect(issues.filter((i) => i.code === "D-SCAFFOLD-PLACEHOLDER")).toEqual([]);
    expect(await readValidateCycles(root, "spec-0008", "TC-0008-0001")).toBe(0);
  });
});

describe("a skeleton that moved to its declared home is still a skeleton", () => {
  it("reports a placeholder under tests/api and tests/e2e", async () => {
    // `D-SCAFFOLD-FOREIGN-HOME` sends an L4/L5 skeleton to exactly these
    // directories, and a move without an implementation used to leave every
    // gate at once: this scan did not reach it, the ATDD scan counted its
    // annotation as coverage so `QFAI-ATDD-112` and `-123` both cleared, and
    // the generated skip call was not the `*.todo` form `QFAI-TEST-001`
    // matched. Following the remediation literally turned a reported
    // placeholder into a silent one.
    for (const kind of ["api", "e2e"]) {
      const dir = path.join(root, "tests", kind, "spec-0008");
      await mkdir(dir, { recursive: true });
      await writeFile(
        path.join(dir, "TC-0008-0001.test.ts"),
        placeholderBodyFor("TC-0008-0001"),
        "utf-8",
      );
    }

    const issues = await validateScaffoldPlaceholder(root, defaultConfig);
    const placeholders = issues.filter((i) => i.code === "D-SCAFFOLD-PLACEHOLDER");
    expect(placeholders.map((i) => i.file).sort()).toEqual([
      "tests/api/spec-0008/TC-0008-0001.test.ts",
      "tests/e2e/spec-0008/TC-0008-0001.test.ts",
    ]);
  });

  it("leaves a hand-written test in those directories alone", async () => {
    // Only the scaffold sentinel puts a file in scope, so widening the scan
    // does not claim tests nobody generated.
    const dir = path.join(root, "tests", "api", "spec-0008");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "mine.test.ts"), FILLED_BODY, "utf-8");

    const issues = await validateScaffoldPlaceholder(root, defaultConfig);
    expect(issues.filter((i) => i.code === "D-SCAFFOLD-PLACEHOLDER")).toEqual([]);
  });
});

describe("a skeleton in its declared home is an ordinary placeholder", () => {
  it("does not park an L4 skeleton under tests/api on the foreign warning", async () => {
    // `foreignHomeTcIds` was keyed on `Level` alone. Once `api` and `e2e` are
    // scanned, a skeleton that followed the remediation there is in its home:
    // its annotation counts, so what it needs is the placeholder gate and its
    // escalation. Classified foreign it left `tcIds`, hit the `continue`, and
    // sat on a non-escalating warning however many times validate ran.
    const specDir = path.join(root, ".qfai", "specs", "spec-0008");
    await mkdir(specDir, { recursive: true });
    await writeFile(
      path.join(specDir, "06_Test-Cases.md"),
      [
        "# 06 Test Cases",
        "",
        "## Test Case Table",
        "",
        "| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected |",
        "| ----- | ----- | ------- | ------ | ----- | -------- |",
        "| TC-0008-0001 | L4 | AC-0008-0001 | - | s | e |",
        "",
      ].join("\n"),
      "utf-8",
    );
    const dir = path.join(root, "tests", "api", "spec-0008");
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, "TC-0008-0001.test.ts"),
      placeholderBodyFor("TC-0008-0001"),
      "utf-8",
    );

    const issues = await validateScaffoldPlaceholder(root, defaultConfig);
    expect(issues.map((i) => i.code)).toContain("D-SCAFFOLD-PLACEHOLDER");
    expect(issues.map((i) => i.code)).not.toContain("D-SCAFFOLD-FOREIGN-HOME");
  });

  it("still calls an L4 skeleton under tests/integration foreign", async () => {
    const specDir = path.join(root, ".qfai", "specs", "spec-0008");
    await mkdir(specDir, { recursive: true });
    await writeFile(
      path.join(specDir, "06_Test-Cases.md"),
      [
        "# 06 Test Cases",
        "",
        "## Test Case Table",
        "",
        "| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected |",
        "| ----- | ----- | ------- | ------ | ----- | -------- |",
        "| TC-0008-0001 | L4 | AC-0008-0001 | - | s | e |",
        "",
      ].join("\n"),
      "utf-8",
    );
    const dir = path.join(root, "tests", "integration", "spec-0008");
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, "TC-0008-0001.test.ts"),
      placeholderBodyFor("TC-0008-0001"),
      "utf-8",
    );

    const issues = await validateScaffoldPlaceholder(root, defaultConfig);
    expect(issues.map((i) => i.code)).toContain("D-SCAFFOLD-FOREIGN-HOME");
  });
});
