/**
 * `Evidence` is a required ledger column, but nothing ever read a cell of it.
 *
 * `qfai-implement` states four MUST-level "Evidence hard rules" over it and
 * makes fresh evidence item 10 of the completion gate, but the string
 * "Evidence" reached only `REQUIRED_COLUMNS` — a header-name check. A ledger
 * whose every row said `Evidence: -` passed
 * `qfai validate --profile tdd --fail-on error` with `error: 0`, which is the
 * one machine gate the skill's FINAL CHECKLIST names.
 *
 * These tests pin the two rules that have a machine form. Freshness (hard rule
 * 3) deliberately has none — the ledger records no run identity — and the skill
 * now says so instead of advertising a gate that does not exist.
 *
 * They also pin `TDDLIST_EVIDENCE_EMPTY`'s promotion window. Shipped straight
 * at `error`, the rule took a consuming repository from 3 errors to 27 in one
 * `qfai init`, 20 of them on rows already at `done`. The finding still fires on
 * exactly the same rows; what the window changes is whether an upgrade can
 * convert them into a build failure before the operator has seen them.
 */

import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { RULE_PROMOTIONS } from "../../src/core/sunset.js";
import { validateTddList } from "../../src/core/validators/tddList.js";
import type * as VersionModule from "../../src/core/version.js";

/**
 * The version the validator reads, overridable per test.
 *
 * An empty string means "defer to the real `resolveToolVersion`", so every
 * other case in this file keeps running against the shipped version.
 */
const toolVersion = vi.hoisted(() => ({ override: "" }));

vi.mock("../../src/core/version.js", async (importOriginal) => {
  const actual = await importOriginal<typeof VersionModule>();
  return {
    ...actual,
    resolveToolVersion: async (): Promise<string> =>
      toolVersion.override.length > 0 ? toolVersion.override : actual.resolveToolVersion(),
  };
});

afterEach(() => {
  toolVersion.override = "";
});

const TEST_FILE = "tests/unit/sample.test.ts";

const TC_TABLE = `# 06 Test Cases

| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected | Notes |
| ----- | ----- | ------- | ------ | ----- | -------- | ----- |
| TC-0001 | unit | AC-0001 | EX-0001 | step | expected | |
`;

const HEADER = `# TDD Execution Ledger

| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence |
| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- |`;

function ledger(rows: Array<{ status: string; evidence: string; tddId?: string }>): string {
  const body = rows
    .map(
      (r, i) =>
        `| ${r.tddId ?? `TDD-000${i + 1}`} | TC-0001 | Unit | ${TEST_FILE} | sample | ${r.status} | - | ${r.evidence} |`,
    )
    .join("\n");
  return `${HEADER}\n${body}\n`;
}

async function withProject(fn: (root: string) => Promise<void>): Promise<void> {
  const root = path.join(
    os.tmpdir(),
    `qfai-evidence-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  await mkdir(root, { recursive: true });
  try {
    await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function runOn(root: string, testList: string): Promise<string[]> {
  const specDir = path.join(root, ".qfai", "specs", "spec-0001");
  await mkdir(path.join(specDir, "tdd"), { recursive: true });
  await mkdir(path.join(root, ".qfai", "specs", "_policies"), { recursive: true });
  for (const [name, body] of [
    ["01_Spec.md", "# Spec\n"],
    ["02_User-stories.md", "# US\n"],
    ["03_Acceptance-Criteria.md", "# AC\n"],
    ["06_Test-Cases.md", TC_TABLE],
  ] as const) {
    await writeFile(path.join(specDir, name), body, "utf-8");
  }
  await writeFile(path.join(specDir, "tdd", "test-list.md"), testList, "utf-8");
  const testPath = path.join(root, TEST_FILE);
  await mkdir(path.dirname(testPath), { recursive: true });
  await writeFile(testPath, "// test\n", "utf-8");

  const issues = await validateTddList(root, defaultConfig);
  return issues.map((i) => i.code);
}

describe("TDDLIST_EVIDENCE_EMPTY", () => {
  // The observed failure: 63 rows of `Evidence: -` reported clean.
  for (const status of ["green", "refactor", "review-fix", "done"]) {
    it(`fires on a dash placeholder at Status=${status}`, async () => {
      await withProject(async (root) => {
        const codes = await runOn(root, ledger([{ status, evidence: "-" }]));
        expect(codes).toContain("TDDLIST_EVIDENCE_EMPTY");
      });
    });
  }

  it("fires on an empty cell", async () => {
    await withProject(async (root) => {
      const codes = await runOn(root, ledger([{ status: "done", evidence: "" }]));
      expect(codes).toContain("TDDLIST_EVIDENCE_EMPTY");
    });
  });

  it("fires on en/em dash placeholders, not only the ASCII hyphen", async () => {
    await withProject(async (root) => {
      const codes = await runOn(
        root,
        ledger([
          { status: "done", evidence: "–", tddId: "TDD-0001" },
          { status: "done", evidence: "—", tddId: "TDD-0002" },
        ]),
      );
      expect(codes.filter((c) => c === "TDDLIST_EVIDENCE_EMPTY")).toHaveLength(2);
    });
  });

  // A row that has not run a cycle owes nothing yet; erroring there would make
  // the ledger unwritable during normal work.
  for (const status of ["todo", "red"]) {
    it(`stays silent at Status=${status}`, async () => {
      await withProject(async (root) => {
        const codes = await runOn(root, ledger([{ status, evidence: "-" }]));
        expect(codes).not.toContain("TDDLIST_EVIDENCE_EMPTY");
      });
    });
  }

  // A parked row's reason lives in DR-ID, which TDDLIST_EXCEPTION_MISSING_DR
  // already gates; demanding evidence too would double-report one gap.
  it("stays silent at Status=exception", async () => {
    await withProject(async (root) => {
      const codes = await runOn(root, ledger([{ status: "exception", evidence: "-" }]));
      expect(codes).not.toContain("TDDLIST_EVIDENCE_EMPTY");
    });
  });

  it("reports the TDD-ID so the offending row is identifiable", async () => {
    await withProject(async (root) => {
      const specDir = path.join(root, ".qfai", "specs", "spec-0001");
      await mkdir(path.join(specDir, "tdd"), { recursive: true });
      await runOn(root, ledger([{ status: "done", evidence: "-", tddId: "TDD-0042" }]));
      const issues = await validateTddList(root, defaultConfig);
      const found = issues.find((i) => i.code === "TDDLIST_EVIDENCE_EMPTY");
      expect(found?.message).toContain("TDD-0042");
    });
  });

  it("tells a terminal row how to satisfy the rule without a transition", async () => {
    // `done` has no outgoing edge, so "go back to red" is not a remedy there.
    // The advice has to name the in-place backfill or the only reading left is
    // an out-of-lifecycle status edit.
    await withProject(async (root) => {
      await runOn(root, ledger([{ status: "done", evidence: "-" }]));
      const issues = await validateTddList(root, defaultConfig);
      const found = issues.find((i) => i.code === "TDDLIST_EVIDENCE_EMPTY");
      expect(found?.suggested_action).toContain("Status を変えずに Evidence セルだけを追記");
    });
  });
});

describe("TDDLIST_EVIDENCE_EMPTY promotion window", () => {
  const promotion = RULE_PROMOTIONS.tddListEvidenceEmpty;

  async function severityAt(version: string): Promise<{ severity: string; message: string }> {
    toolVersion.override = version;
    let found: { severity: string; message: string } = { severity: "", message: "" };
    await withProject(async (root) => {
      await runOn(root, ledger([{ status: "done", evidence: "-" }]));
      const issues = await validateTddList(root, defaultConfig);
      const issue = issues.find((i) => i.code === "TDDLIST_EVIDENCE_EMPTY");
      if (issue) found = { severity: issue.severity, message: issue.message };
    });
    return found;
  }

  it("reports a warning before the promotion release, naming the release", async () => {
    // The regression this is here for: a `--fail-on error` gate that was
    // passing must not latch on an upgrade, and the operator must be able to
    // read when it will.
    const found = await severityAt("1.9.9");
    expect(found.severity).toBe("warning");
    expect(found.message).toContain(promotion);
  });

  it("reports an error from the promotion release onwards", async () => {
    const found = await severityAt("99.0.0");
    expect(found.severity).toBe("error");
    // No window left to advertise once the window has closed.
    expect(found.message).not.toContain("until the");
  });

  it("stays inside the window when the version cannot be read", async () => {
    // `resolveToolVersion` answers "unknown" on a read failure. An unreadable
    // version must never be the thing that turns a warning into a build break.
    const found = await severityAt("unknown");
    expect(found.severity).toBe("warning");
  });
});

describe("TDDLIST_EVIDENCE_STATUS_ONLY", () => {
  // `SKILL.md` names this shape verbatim. Reported at `warning`: see the rule
  // comment — ledgers written before the check exist in the wild, and this
  // repository itself carries 99 such rows.
  for (const evidence of [
    "Status: PASS",
    "PASS",
    "looks good",
    "should pass",
    "all tests green",
    "OK",
    // The arrow form: a verdict with a result and still no command. A
    // `-[^\s]` flag branch matched `->`, so this read as command-shaped and
    // slipped past the gate — which is what the branch was tightened for.
    "Status: PASS -> 3 passed",
    "RED -> GREEN, all good",
    // Backquoting the whole verdict sentence. The inline-code acceptor takes a
    // span with whitespace in it, so a multi-word verdict must not be able to
    // launder itself into a command by adding backticks.
    "`Status: PASS`",
  ]) {
    it(`errors on "${evidence}"`, async () => {
      await withProject(async (root) => {
        const codes = await runOn(root, ledger([{ status: "done", evidence }]));
        expect(codes).toContain("TDDLIST_EVIDENCE_STATUS_ONLY");
      });
    });
  }

  // A verdict backed by a command is what the rule asks for. The runners below
  // span stacks on purpose: an allowlist-only matcher is what makes
  // QFAI-TEST-001 JS/TS-only, and this rule must not repeat it.
  for (const evidence of [
    "RED: `npx vitest run tests/unit/sample.test.ts` -> 1 failed. GREEN: 1 passed",
    "pytest -q tests/test_a.py::test_b -> 1 passed",
    "go test ./internal/... -> ok",
    "cargo test --lib -> 3 passed",
    "mvn -Dtest=SampleTest test -> BUILD SUCCESS",
    "dotnet test --filter Sample -> Passed: 1",
    "swift test --filter SampleTests -> 1 passed",
    "npm test -> 12 passing",
    "`bazel test //pkg:sample` -> PASSED",
  ]) {
    it(`accepts "${evidence}"`, async () => {
      await withProject(async (root) => {
        const codes = await runOn(root, ledger([{ status: "done", evidence }]));
        expect(codes).not.toContain("TDDLIST_EVIDENCE_STATUS_ONLY");
        expect(codes).not.toContain("TDDLIST_EVIDENCE_EMPTY");
      });
    });
  }

  // A backticked verdict is still a verdict — the inline-code acceptor requires
  // the span to hold more than one word, so it cannot be used to launder one.
  it("is not satisfied by backticking the verdict", async () => {
    await withProject(async (root) => {
      const codes = await runOn(root, ledger([{ status: "done", evidence: "Status: `PASS`" }]));
      expect(codes).toContain("TDDLIST_EVIDENCE_STATUS_ONLY");
    });
  });

  // Only a verdict claim can be status-only. A note without one is
  // under-specified, but reporting it as "status-only" would be false and no
  // shipped hard rule describes it.
  it("stays silent on a non-verdict note with no command", async () => {
    await withProject(async (root) => {
      const codes = await runOn(root, ledger([{ status: "done", evidence: "see DR-0001" }]));
      expect(codes).not.toContain("TDDLIST_EVIDENCE_STATUS_ONLY");
    });
  });

  it("stays silent on an unstarted row", async () => {
    await withProject(async (root) => {
      const codes = await runOn(root, ledger([{ status: "todo", evidence: "Status: PASS" }]));
      expect(codes).not.toContain("TDDLIST_EVIDENCE_STATUS_ONLY");
    });
  });

  // An empty cell is one defect, not two.
  it("does not double-report with TDDLIST_EVIDENCE_EMPTY", async () => {
    await withProject(async (root) => {
      const codes = await runOn(root, ledger([{ status: "done", evidence: "-" }]));
      expect(codes).toContain("TDDLIST_EVIDENCE_EMPTY");
      expect(codes).not.toContain("TDDLIST_EVIDENCE_STATUS_ONLY");
    });
  });
});
