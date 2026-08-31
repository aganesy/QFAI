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
import {
  EVIDENCE_CELL_MALFORMED_RULE_ID,
  EVIDENCE_CELL_OVERSIZE_RULE_ID,
  EVIDENCE_RED_PROVENANCE_RULE_ID,
  ROW_EXTRA_CELLS_RULE_ID,
  validateTddList,
} from "../../src/core/validators/tddList.js";
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

type Row = {
  status: string;
  evidence: string;
  tddId?: string;
  /** Defaults to `Unit`; the ATDD-owned layers pick a different evidence file. */
  layer?: string;
  testFile?: string;
};

function ledger(rows: Row[]): string {
  const body = rows
    .map(
      (r, i) =>
        `| ${r.tddId ?? `TDD-000${i + 1}`} | TC-0001 | ${r.layer ?? "Unit"} | ${r.testFile ?? TEST_FILE} | sample | ${r.status} | - | ${r.evidence} |`,
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

async function seedProject(
  root: string,
  testList: string,
  extraTestFiles: string[] = [],
): Promise<void> {
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
  for (const rel of [TEST_FILE, ...extraTestFiles]) {
    const testPath = path.join(root, rel);
    await mkdir(path.dirname(testPath), { recursive: true });
    await writeFile(testPath, "// test\n", "utf-8");
  }
}

async function runOn(
  root: string,
  testList: string,
  extraTestFiles: string[] = [],
): Promise<string[]> {
  await seedProject(root, testList, extraTestFiles);
  const issues = await validateTddList(root, defaultConfig);
  return issues.map((i) => i.code);
}

/** The one `TDDLIST_EVIDENCE_EMPTY` a single-row ledger produces. */
async function remediationFor(root: string, row: Row): Promise<string> {
  const testFile = row.testFile;
  await seedProject(root, ledger([row]), testFile === undefined ? [] : [testFile]);
  const issues = await validateTddList(root, defaultConfig);
  const found = issues.find((i) => i.code === "TDDLIST_EVIDENCE_EMPTY");
  expect(found, "TDDLIST_EVIDENCE_EMPTY did not fire on the fixture row").toBeDefined();
  return found?.suggested_action ?? "";
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
      await seedProject(root, ledger([{ status: "done", evidence: "-", tddId: "TDD-0042" }]));
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
      const action = await remediationFor(root, { status: "done", evidence: "-" });
      expect(action).toContain("Status を変えずに Evidence セルだけを追記");
    });
  });

  it("routes the payload to the evidence file and leaves a pointer in the cell", async () => {
    // The remedy has to match the ledger the same release redefined: the cell
    // is a pointer, and a command plus its output pasted into it ends the row
    // at the first newline or splits it at the first `|`. Advice that says
    // "write the command and its result here" would reintroduce exactly the
    // corruption `references/execution-ledger.md` documents.
    await withProject(async (root) => {
      const action = await remediationFor(root, { status: "done", evidence: "-" });
      expect(action).toContain("evidence ファイルに記録");
      expect(action).toContain("pointer");
      // The terminal-row remedy is a backfill entry in that file, anchored
      // from the cell — not prose about the missing run written into the row.
      expect(action).toContain("backfill entry");
    });
  });
});

describe("TDDLIST_EVIDENCE_EMPTY remediation — the pointer it hands back", () => {
  // The example used to be a constant, `implement-spec-<n>.md#tdd-0042`. Two
  // things were wrong with it at once: the anchor named an entry that exists
  // for exactly one row in the world, and the file named the implement stage
  // for every row including the ones `/qfai-atdd` runs, whose evidence lives in
  // `atdd-<spec-id>.md` and whose completion gate reads that split. Following
  // the advice on any other row produced a pointer that resolves to nothing.
  it("anchors the example at the row's own TDD-ID", async () => {
    await withProject(async (root) => {
      const action = await remediationFor(root, {
        status: "done",
        evidence: "-",
        tddId: "TDD-0007",
      });
      expect(action).toContain(".qfai/evidence/implement-spec-0001.md#tdd-0007");
      expect(action).not.toContain("#tdd-0042");
    });
  });

  for (const [layer, testFile] of [
    ["Integration", "tests/integration/sample.test.ts"],
    ["API", "tests/api/sample.test.ts"],
    ["E2E", "tests/e2e/sample.test.ts"],
  ] as const) {
    it(`sends a ${layer} row at the ATDD evidence file`, async () => {
      await withProject(async (root) => {
        const action = await remediationFor(root, {
          status: "done",
          evidence: "-",
          tddId: "TDD-0007",
          layer,
          testFile,
        });
        expect(action).toContain(".qfai/evidence/atdd-spec-0001.md#tdd-0007");
        expect(action).not.toContain("implement-spec-0001.md");
      });
    });
  }

  // The over-correction pin: every non-ATDD layer keeps the implement file.
  for (const [layer, testFile] of [
    ["Unit", "tests/unit/sample.test.ts"],
    ["Component", "tests/unit/sample.test.ts"],
  ] as const) {
    it(`keeps a ${layer} row on the implement evidence file`, async () => {
      await withProject(async (root) => {
        const action = await remediationFor(root, {
          status: "done",
          evidence: "-",
          tddId: "TDD-0007",
          layer,
          testFile,
        });
        expect(action).toContain(".qfai/evidence/implement-spec-0001.md#tdd-0007");
        expect(action).not.toContain("atdd-spec-0001.md");
      });
    });
  }
});

describe("TDDLIST_EVIDENCE_EMPTY remediation — the recovery it names", () => {
  // The finding fires only at `green`, `refactor`, `review-fix` and `done`, and
  // the advice closed with "if you have not run it yet, put the row back to
  // todo / red" on all four. `references/execution-ledger.md` prohibits that on
  // three of them: `green -> red` is the transition table's own example of a
  // prohibited backward edge, `refactor -> red` needs a routed `qa-gatekeeper`
  // REVISE, and **any status** -> `todo` is the upstream reset, which needs an
  // approved `CR-*` in `DR-ID`. An operator with no run to show was being told
  // to commit a second lifecycle violation to clear the first.
  for (const status of ["green", "refactor", "review-fix", "done"]) {
    it(`does not tell a ${status} row to move back to todo / red`, async () => {
      await withProject(async (root) => {
        const action = await remediationFor(root, { status, evidence: "-" });
        expect(action).not.toContain("Status を todo / red に戻して");
      });
    });
  }

  it("routes a green row through exception, the only edge it has", async () => {
    await withProject(async (root) => {
      const action = await remediationFor(root, { status: "green", evidence: "-" });
      expect(action).toContain("`green -> red` は禁止");
      expect(action).toContain("exception");
    });
  });

  it("gates a refactor row's return to red on a qa-gatekeeper REVISE", async () => {
    await withProject(async (root) => {
      const action = await remediationFor(root, { status: "refactor", evidence: "-" });
      expect(action).toContain("qa-gatekeeper");
      expect(action).toContain("`refactor -> red`");
    });
  });

  it("tells a review-fix row it can re-run without changing status", async () => {
    await withProject(async (root) => {
      const action = await remediationFor(root, { status: "review-fix", evidence: "-" });
      expect(action).toContain("Status を変えないまま RED/GREEN サイクルを再実行");
    });
  });

  it("leaves a done row only the approved upstream reset", async () => {
    await withProject(async (root) => {
      const action = await remediationFor(root, { status: "done", evidence: "-" });
      expect(action).toContain("upstream reset");
      expect(action).toContain("CR-*");
      // The pin that must keep working: the in-place backfill is still the
      // remedy a terminal row reaches for first.
      expect(action).toContain("Status を変えずに Evidence セルだけを追記");
    });
  });
});

describe("TDDLIST_EVIDENCE_EMPTY promotion window", () => {
  const promotion = RULE_PROMOTIONS.tddListEvidenceEmpty.promoteAt;

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

/**
 * The contract calls the cell a pointer; nothing made it one.
 *
 * `references/execution-ledger.md#evidence-cell-contract` illustrates the
 * pointer with a ~95-character example, but the only cell-level checks were
 * "non-empty" and "not a bare verdict". Measured across eight ledgers the
 * pointer had grown larger than the file it points at in all eight, and the
 * strongest obligation in the contract — the oracle proof — had no reserved
 * token at all, so no gate could count its coverage.
 */
const ANCHOR = ".qfai/evidence/implement-spec-0001.md#tdd-0001";
const POINTER = `RED:fail GREEN:pass ORACLE:proved REV:a1b2c3d -> \`${ANCHOR}\``;

/** The SHA-256 the uncommitted-tree procedure in `evidence-revision.md` yields. */
const CONTENT_HASH = "e".repeat(64);

describe("TDDLIST_EVIDENCE_CELL_MALFORMED", () => {
  for (const evidence of [
    // The legacy prose shape: a real command and a real result, in no grammar.
    "RED: `npx vitest run tests/unit/sample.test.ts` -> 1 failed. GREEN: 1 passed",
    // ORACLE is the token the whole grammar exists to make countable.
    `RED:fail GREEN:pass REV:a1b2c3d -> \`${ANCHOR}\``,
    // A token present but off-vocabulary is malformed, not accepted prose.
    `RED:fail GREEN:pass ORACLE:maybe REV:a1b2c3d -> \`${ANCHOR}\``,
    `RED:probably GREEN:pass ORACLE:proved REV:a1b2c3d -> \`${ANCHOR}\``,
    // Out of order is a second shape, and there is only one legal shape.
    `GREEN:pass RED:fail ORACLE:proved REV:a1b2c3d -> \`${ANCHOR}\``,
    // The anchor is what makes the cell a pointer; without it there is none.
    "RED:fail GREEN:pass ORACLE:proved REV:a1b2c3d",
    // Trailing prose after the anchor reopens the cell to the payload.
    `${POINTER} and the reviewer agreed`,
    // A `REV:` outside the two spellings `evidence-revision.md` defines. The
    // review-side gate rejects the same value, so accepting it here would let
    // a ledger name a revision no reviewer response can ever match.
    `RED:fail GREEN:pass ORACLE:proved REV:HEAD -> \`${ANCHOR}\``,
    `RED:fail GREEN:pass ORACLE:proved REV:working-tree+abc1234 -> \`${ANCHOR}\``,
    // The anchor must be a resolvable pointer, not any non-empty token: this
    // is what let a `done` row carry no proof at all and still validate.
    "RED:fail GREEN:pass ORACLE:proved REV:a1b2c3d -> garbage",
    // A file outside the evidence tree, and one inside it under neither
    // producing stage's name, are both unresolvable as this row's proof.
    "RED:fail GREEN:pass ORACLE:proved REV:a1b2c3d -> `notes/scratch.md#tdd-0001`",
    "RED:fail GREEN:pass ORACLE:proved REV:a1b2c3d -> `.qfai/evidence/impl.md#tdd-0001`",
    // The file without a fragment names the spec's evidence, not this item's.
    `RED:fail GREEN:pass ORACLE:proved REV:a1b2c3d -> \`.qfai/evidence/implement-spec-0001.md\``,
    // One backtick is an unbalanced span, not an anchor.
    `RED:fail GREEN:pass ORACLE:proved REV:a1b2c3d -> \`${ANCHOR}`,
  ]) {
    it(`reports "${evidence.slice(0, 48)}"`, async () => {
      await withProject(async (root) => {
        const codes = await runOn(root, ledger([{ status: "done", evidence }]));
        expect(codes).toContain("TDDLIST_EVIDENCE_CELL_MALFORMED");
      });
    });
  }

  for (const [evidence, layer] of [
    [POINTER, "Unit"],
    // `TIER:` is optional: the Tier obligation is owned elsewhere, so the
    // grammar reserves it a slot without demanding it yet.
    [`RED:n-a GREEN:pass ORACLE:equivalent-mutant TIER:T2 REV:9f3c1de -> ${ANCHOR}`, "Unit"],
    [`RED:falsifiability GREEN:pass ORACLE:proved TIER:T3 REV:0ab12cd -> ${ANCHOR}`, "Unit"],
    // An observation taken against an uncommitted tree. `evidence-revision.md`
    // defines this spelling and the reviewer-response gate accepts it, so a
    // grammar that forbade `+` made the one legal form of a legitimate
    // observation permanently malformed.
    [`RED:fail GREEN:pass ORACLE:proved REV:working-tree+${CONTENT_HASH} -> ${ANCHOR}`, "Unit"],
    // The compatibility marker completion item 10 requires on an E2E/API row
    // that finished before the ATDD evidence split. Such a row cannot
    // re-observe a RED, so a grammar ending at the anchor left it no exit but
    // a standing waiver. `E2E`, because that is the only class the marker
    // means anything on.
    [`${POINTER} Pre-split-evidence: implement`, "E2E"],
  ] as const) {
    it(`accepts "${evidence.slice(0, 48)}" on a Layer=${layer} row`, async () => {
      await withProject(async (root) => {
        const codes = await runOn(root, ledger([{ status: "done", evidence, layer }]));
        expect(codes).not.toContain("TDDLIST_EVIDENCE_CELL_MALFORMED");
        expect(codes).not.toContain("TDDLIST_EVIDENCE_RED_PROVENANCE");
        expect(codes).not.toContain("TDDLIST_EVIDENCE_CELL_OVERSIZE");
      });
    });
  }

  // `execution-ledger.md#atdd-owned-rows`: "There is no waiver here". A row
  // whose test `/qfai-atdd` authors owes an observed RED or a falsifiability
  // argument, so `RED:n-a` — which the other layers may use for a row that
  // owes no RED — must not let it reach `done` with no provenance at all.
  it("rejects RED:n-a on an ATDD-owned row", async () => {
    await withProject(async (root) => {
      const codes = await runOn(
        root,
        ledger([
          {
            status: "done",
            layer: "Integration",
            evidence: `RED:n-a GREEN:pass ORACLE:proved REV:a1b2c3d -> \`.qfai/evidence/atdd-spec-0001.md#tdd-0001\``,
          },
        ]),
      );
      expect(codes).toContain("TDDLIST_EVIDENCE_RED_PROVENANCE");
      // One defect, one finding: the cell is still shaped like a pointer, so
      // the status-only rule must not also read its `GREEN:pass` as prose.
      expect(codes).not.toContain("TDDLIST_EVIDENCE_STATUS_ONLY");
    });
  });

  // "There is no waiver here" has one spelling in this package: a waiver may
  // only target `warning` / `info`, so the provenance breach ships as its own
  // `error` code. Reported as a `TDDLIST-007` warning it shared a rule id with
  // every legacy prose cell, and the migration's own waiver silenced it.
  it("reports the provenance breach as an unwaivable error of its own", async () => {
    await withProject(async (root) => {
      await runOn(
        root,
        ledger([
          {
            status: "done",
            layer: "Integration",
            tddId: "TDD-0042",
            evidence: `RED:n-a GREEN:pass ORACLE:proved REV:a1b2c3d -> \`.qfai/evidence/atdd-spec-0001.md#tdd-0042\``,
          },
        ]),
      );
      const issues = await validateTddList(root, defaultConfig);
      const found = issues.find((i) => i.code === "TDDLIST_EVIDENCE_RED_PROVENANCE");
      expect(found?.severity).toBe("error");
      expect(found?.rule).toBe(EVIDENCE_RED_PROVENANCE_RULE_ID);
      expect(found?.rule).not.toBe(EVIDENCE_CELL_MALFORMED_RULE_ID);
      expect(found?.message).toContain("RED:n-a");
      expect(found?.message).toContain("TDD-0042");
      expect(issues.some((i) => i.code === "TDDLIST_EVIDENCE_CELL_MALFORMED")).toBe(false);
    });
  });

  for (const provenance of ["fail", "falsifiability"]) {
    it(`accepts RED:${provenance} on an ATDD-owned row`, async () => {
      await withProject(async (root) => {
        const codes = await runOn(
          root,
          ledger([
            {
              status: "done",
              layer: "Integration",
              evidence: `RED:${provenance} GREEN:pass ORACLE:proved REV:a1b2c3d -> \`.qfai/evidence/atdd-spec-0001.md#tdd-0001\``,
            },
          ]),
        );
        expect(codes).not.toContain("TDDLIST_EVIDENCE_CELL_MALFORMED");
      });
    });
  }

  // The layer rule is a restriction on the ATDD-owned layers only: a row this
  // skill runs itself may genuinely owe no RED.
  it("keeps RED:n-a legal on a row qfai-implement runs itself", async () => {
    await withProject(async (root) => {
      const codes = await runOn(
        root,
        ledger([
          {
            status: "done",
            layer: "Unit",
            evidence: `RED:n-a GREEN:pass ORACLE:proved REV:a1b2c3d -> ${ANCHOR}`,
          },
        ]),
      );
      expect(codes).not.toContain("TDDLIST_EVIDENCE_CELL_MALFORMED");
    });
  });

  // A conforming pointer names a verdict by construction (`GREEN:pass`) and
  // carries no command, so the status-only gate would reject the very shape
  // this grammar mandates unless it yields to it.
  it("does not make the canonical pointer read as status-only evidence", async () => {
    await withProject(async (root) => {
      const codes = await runOn(root, ledger([{ status: "done", evidence: POINTER }]));
      expect(codes).not.toContain("TDDLIST_EVIDENCE_STATUS_ONLY");
    });
  });

  // Rows that have not run a cycle owe no pointer yet.
  for (const status of ["todo", "red", "exception"]) {
    it(`stays silent at Status=${status}`, async () => {
      await withProject(async (root) => {
        const codes = await runOn(root, ledger([{ status, evidence: "some note" }]));
        expect(codes).not.toContain("TDDLIST_EVIDENCE_CELL_MALFORMED");
      });
    });
  }

  // An empty cell is one defect, not two.
  it("does not double-report with TDDLIST_EVIDENCE_EMPTY", async () => {
    await withProject(async (root) => {
      const codes = await runOn(root, ledger([{ status: "done", evidence: "-" }]));
      expect(codes).toContain("TDDLIST_EVIDENCE_EMPTY");
      expect(codes).not.toContain("TDDLIST_EVIDENCE_CELL_MALFORMED");
    });
  });

  it("is a waivable warning, so legacy ledgers migrate instead of breaking", async () => {
    await withProject(async (root) => {
      await runOn(root, ledger([{ status: "done", evidence: "RED -> GREEN", tddId: "TDD-0042" }]));
      const issues = await validateTddList(root, defaultConfig);
      const found = issues.find((i) => i.code === "TDDLIST_EVIDENCE_CELL_MALFORMED");
      expect(found?.severity).toBe("warning");
      expect(found?.rule).toBe(EVIDENCE_CELL_MALFORMED_RULE_ID);
      expect(found?.message).toContain("TDD-0042");
    });
  });
});

describe("TDDLIST_EVIDENCE_CELL_OVERSIZE", () => {
  // The observed failure: a mean cell of 1,196 characters against a contract
  // whose own example is 95.
  const OVERSIZE = `RED:fail GREEN:pass ORACLE:proved REV:a1b2c3d -> ${"x".repeat(240)}`;

  it("reports a cell past the cap", async () => {
    await withProject(async (root) => {
      const codes = await runOn(root, ledger([{ status: "done", evidence: OVERSIZE }]));
      expect(codes).toContain("TDDLIST_EVIDENCE_CELL_OVERSIZE");
    });
  });

  // Two findings on one cell would make the cap look like a second defect.
  it("does not double-report with TDDLIST_EVIDENCE_CELL_MALFORMED", async () => {
    await withProject(async (root) => {
      const codes = await runOn(root, ledger([{ status: "done", evidence: "y".repeat(400) }]));
      expect(codes).toContain("TDDLIST_EVIDENCE_CELL_OVERSIZE");
      expect(codes).not.toContain("TDDLIST_EVIDENCE_CELL_MALFORMED");
    });
  });

  it("stays silent on a pointer inside the cap", async () => {
    await withProject(async (root) => {
      const codes = await runOn(root, ledger([{ status: "done", evidence: POINTER }]));
      expect(codes).not.toContain("TDDLIST_EVIDENCE_CELL_OVERSIZE");
    });
  });

  it("is a waivable warning", async () => {
    await withProject(async (root) => {
      await runOn(root, ledger([{ status: "done", evidence: OVERSIZE }]));
      const issues = await validateTddList(root, defaultConfig);
      const found = issues.find((i) => i.code === "TDDLIST_EVIDENCE_CELL_OVERSIZE");
      expect(found?.severity).toBe("warning");
      expect(found?.rule).toBe(EVIDENCE_CELL_OVERSIZE_RULE_ID);
    });
  });

  // A **binding** breach is not a length breach, and unlike prose it is not
  // waivable under the migration story: `execution-ledger.md#atdd-owned-rows`
  // says of ATDD-owned RED provenance "There is no waiver here". Reporting
  // only the cap let a long anchor carry the violation past `TDDLIST-008`.
  it("still reports RED:n-a on an ATDD-owned row when the cell is oversize", async () => {
    await withProject(async (root) => {
      const codes = await runOn(
        root,
        ledger([
          {
            status: "done",
            layer: "Integration",
            evidence: `RED:n-a GREEN:pass ORACLE:proved REV:a1b2c3d -> .qfai/evidence/atdd-spec-0001.md#tdd-0001-${"x".repeat(200)}`,
          },
        ]),
      );
      expect(codes).toContain("TDDLIST_EVIDENCE_CELL_OVERSIZE");
      expect(codes).toContain("TDDLIST_EVIDENCE_RED_PROVENANCE");
    });
  });

  it("still reports an anchor the row does not own when the cell is oversize", async () => {
    await withProject(async (root) => {
      const codes = await runOn(
        root,
        ledger([
          {
            status: "done",
            layer: "Integration",
            evidence: `RED:fail GREEN:pass ORACLE:proved REV:a1b2c3d -> .qfai/evidence/implement-spec-9999.md#tdd-0001-${"x".repeat(200)}`,
          },
        ]),
      );
      expect(codes).toContain("TDDLIST_EVIDENCE_CELL_OVERSIZE");
      expect(codes).toContain("TDDLIST_EVIDENCE_CELL_MALFORMED");
    });
  });
});

/**
 * The anchor names a file, and `qfai-implement/SKILL.md` completion item 10
 * says **which** file: the one this row's `Layer` owns, for **this** spec.
 * A grammar that read only the anchor's outline accepted any spec's evidence
 * from either producing stage, so a `done` row could point at proof that was
 * never taken for it and still validate.
 */
describe("Evidence anchor binding", () => {
  const bound = (
    evidence: string,
    layer: string,
  ): Array<{ status: string; evidence: string; layer: string }> => [
    { status: "done", evidence, layer },
  ];

  for (const [label, layer, anchor] of [
    // Another spec's evidence file is not this row's proof.
    ["another spec", "Unit", ".qfai/evidence/implement-spec-9999.md#tdd-0001"],
    // The reviewer's case: an ATDD-owned row naming the implement file, with
    // no compatibility marker to license it, for a spec that is not its own.
    [
      "another spec from the wrong stage",
      "Integration",
      ".qfai/evidence/implement-spec-9999.md#other",
    ],
    // Right spec, wrong stage: item 10 assigns an `Integration` row to
    // `/qfai-atdd`, and an unmarked implement anchor is exactly the row that
    // never produced its ATDD handoff.
    ["the wrong stage", "Integration", ".qfai/evidence/implement-spec-0001.md#tdd-0001"],
    ["the wrong stage", "E2E", ".qfai/evidence/implement-spec-0001.md#tdd-0001"],
    // And the reverse: a row this skill runs itself writes the implement file.
    [
      "the ATDD stage on an implement-owned row",
      "Unit",
      ".qfai/evidence/atdd-spec-0001.md#tdd-0001",
    ],
  ] as const) {
    it(`reports ${label} on a Layer=${layer} row`, async () => {
      await withProject(async (root) => {
        const codes = await runOn(
          root,
          ledger(bound(`RED:fail GREEN:pass ORACLE:proved REV:a1b2c3d -> \`${anchor}\``, layer)),
        );
        expect(codes).toContain("TDDLIST_EVIDENCE_CELL_MALFORMED");
        // The cell is still shaped like a pointer, so the status-only rule
        // must not read its `GREEN:pass` as a bare prose verdict as well.
        expect(codes).not.toContain("TDDLIST_EVIDENCE_STATUS_ONLY");
      });
    });
  }

  it("names the file the row owes", async () => {
    await withProject(async (root) => {
      await runOn(
        root,
        ledger(
          bound(
            "RED:fail GREEN:pass ORACLE:proved REV:a1b2c3d -> `.qfai/evidence/implement-spec-9999.md#other`",
            "Integration",
          ),
        ),
      );
      const issues = await validateTddList(root, defaultConfig);
      const found = issues.find((i) => i.code === "TDDLIST_EVIDENCE_CELL_MALFORMED");
      expect(found?.rule).toBe(EVIDENCE_CELL_MALFORMED_RULE_ID);
      // The row's own section, not a `<heading>` placeholder: the anchor is
      // bound to the id as well as to the file.
      expect(found?.message).toContain(".qfai/evidence/atdd-spec-0001.md#tdd-0001");
    });
  });

  for (const [layer, anchor] of [
    ["Unit", ".qfai/evidence/implement-spec-0001.md#tdd-0001"],
    ["Component", ".qfai/evidence/implement-spec-0001.md#tdd-0001"],
    ["Integration", ".qfai/evidence/atdd-spec-0001.md#tdd-0001"],
    ["API", ".qfai/evidence/atdd-spec-0001.md#tdd-0001"],
    ["E2E", ".qfai/evidence/atdd-spec-0001.md#tdd-0001"],
  ] as const) {
    it(`accepts the file a Layer=${layer} row owns`, async () => {
      await withProject(async (root) => {
        const codes = await runOn(
          root,
          ledger(bound(`RED:fail GREEN:pass ORACLE:proved REV:a1b2c3d -> \`${anchor}\``, layer)),
        );
        expect(codes).not.toContain("TDDLIST_EVIDENCE_CELL_MALFORMED");
      });
    });
  }

  // Completion item 10's compatibility case: the marker is what licenses the
  // implement anchor on a pre-split `E2E` / `API` row, and it licenses nothing
  // without it. Such a row cannot re-observe a RED, so rejecting it would
  // leave it no exit but a standing waiver.
  for (const layer of ["E2E", "API"] as const) {
    it(`accepts the pre-split implement anchor on a marked Layer=${layer} row`, async () => {
      await withProject(async (root) => {
        const codes = await runOn(
          root,
          ledger(
            bound(
              "RED:fail GREEN:pass ORACLE:proved REV:a1b2c3d -> `.qfai/evidence/implement-spec-0001.md#tdd-0001` Pre-split-evidence: implement",
              layer,
            ),
          ),
        );
        expect(codes).not.toContain("TDDLIST_EVIDENCE_CELL_MALFORMED");
      });
    });
  }

  // Item 10 scopes the marker pass to `E2E` / `API` rows, so an `Integration`
  // row has no legacy form for the marker to grandfather.
  it("does not let the marker license an implement anchor on an Integration row", async () => {
    await withProject(async (root) => {
      const codes = await runOn(
        root,
        ledger(
          bound(
            "RED:fail GREEN:pass ORACLE:proved REV:a1b2c3d -> `.qfai/evidence/implement-spec-0001.md#tdd-0001` Pre-split-evidence: implement",
            "Integration",
          ),
        ),
      );
      expect(codes).toContain("TDDLIST_EVIDENCE_CELL_MALFORMED");
    });
  });
});

/**
 * The fragment is the row's own `### TDD-NNNN` section.
 *
 * Both skills write "one `### TDD-NNNN` section per row" and say the ledger
 * cell anchors there. Left free, a `TDD-0002` row could anchor at `#tdd-0001` —
 * its neighbour's proof — or at `#garbage`, and reach `done` on evidence that
 * was never taken for it.
 */
describe("Evidence fragment binding", () => {
  const row = (tddId: string, fragment: string) => [
    {
      status: "done",
      tddId,
      evidence: `RED:fail GREEN:pass ORACLE:proved REV:a1b2c3d -> \`.qfai/evidence/implement-spec-0001.md#${fragment}\``,
    },
  ];

  it("accepts the row's own section", async () => {
    await withProject(async (root) => {
      const codes = await runOn(root, ledger(row("TDD-0007", "tdd-0007")));
      expect(codes).not.toContain("TDDLIST_EVIDENCE_CELL_MALFORMED");
    });
  });

  for (const [label, fragment] of [
    ["another row's section", "tdd-0001"],
    ["a fragment that names no section", "garbage"],
  ] as const) {
    it(`reports ${label}`, async () => {
      await withProject(async (root) => {
        const codes = await runOn(root, ledger(row("TDD-0007", fragment)));
        expect(codes).toContain("TDDLIST_EVIDENCE_CELL_MALFORMED");
        // Still shaped like a pointer, so the status-only rule stays quiet.
        expect(codes).not.toContain("TDDLIST_EVIDENCE_STATUS_ONLY");
      });
    });
  }

  it("names the fragment the row owes", async () => {
    await withProject(async (root) => {
      await runOn(root, ledger(row("TDD-0007", "tdd-0001")));
      const issues = await validateTddList(root, defaultConfig);
      const found = issues.find((i) => i.code === "TDDLIST_EVIDENCE_CELL_MALFORMED");
      expect(found?.rule).toBe(EVIDENCE_CELL_MALFORMED_RULE_ID);
      expect(found?.message).toContain("### TDD-0007");
      expect(found?.message).toContain("#tdd-0007");
    });
  });

  // `TDDLIST_MISSING` / `TDDLIST_INVALID_ID` already name a row with no usable
  // id. Deriving an anchor from an id the ledger does not have would report a
  // second defect the author cannot act on.
  it("leaves the fragment free when the row has no well-formed id", async () => {
    await withProject(async (root) => {
      const codes = await runOn(root, ledger(row("TDD-42", "anything")));
      expect(codes).not.toContain("TDDLIST_EVIDENCE_CELL_MALFORMED");
    });
  });
});

/**
 * The compatibility marker means one thing: this pre-split `E2E` / `API` row
 * may keep its `implement-` anchor. Anywhere else it is decoration — and
 * completion item 10 reads it to tell a legacy row from a current one, so a row
 * that can carry it for no reason is a row that can claim to be legacy.
 */
describe("Evidence compatibility marker scope", () => {
  const withMarker = (layer: string, stage: string) => [
    {
      status: "done",
      layer,
      evidence: `RED:fail GREEN:pass ORACLE:proved REV:a1b2c3d -> \`.qfai/evidence/${stage}-spec-0001.md#tdd-0001\` Pre-split-evidence: implement`,
    },
  ];

  for (const [layer, stage] of [
    // An implement-owned row's anchor needs no licensing.
    ["Unit", "implement"],
    ["Component", "implement"],
    // A pre-split row already pointing at the file it owns needs none either.
    ["E2E", "atdd"],
    ["API", "atdd"],
  ] as const) {
    it(`reports the marker on a Layer=${layer} row anchored at ${stage}-`, async () => {
      await withProject(async (root) => {
        const codes = await runOn(root, ledger(withMarker(layer, stage)));
        expect(codes).toContain("TDDLIST_EVIDENCE_CELL_MALFORMED");
      });
    });
  }

  it("names the marker as the cause", async () => {
    await withProject(async (root) => {
      await runOn(root, ledger(withMarker("Unit", "implement")));
      const issues = await validateTddList(root, defaultConfig);
      const found = issues.find((i) => i.code === "TDDLIST_EVIDENCE_CELL_MALFORMED");
      expect(found?.message).toContain("Pre-split-evidence: implement");
      expect(found?.message).toContain("cannot be pre-split");
    });
  });

  for (const layer of ["E2E", "API"] as const) {
    it(`accepts the marker licensing an implement anchor on a Layer=${layer} row`, async () => {
      await withProject(async (root) => {
        const codes = await runOn(root, ledger(withMarker(layer, "implement")));
        expect(codes).not.toContain("TDDLIST_EVIDENCE_CELL_MALFORMED");
      });
    });
  }
});

/**
 * A row may not carry cells the header does not declare.
 *
 * Every rule reads cells by header index, so content parked past the last
 * column is read by nothing — including the Evidence grammar and its cap.
 */
describe("TDDLIST_ROW_EXTRA_CELLS", () => {
  const conforming =
    "RED:fail GREEN:pass ORACLE:proved REV:a1b2c3d -> `.qfai/evidence/implement-spec-0001.md#tdd-0001`";

  it("reports a surplus cell holding the payload the cap forbids", async () => {
    await withProject(async (root) => {
      const codes = await runOn(
        root,
        `${ledger([{ status: "done", evidence: conforming }]).trimEnd()} ${"x".repeat(1000)} |\n`,
      );
      expect(codes).toContain("TDDLIST_ROW_EXTRA_CELLS");
      // The declared Evidence cell is conforming: without this rule the row
      // drew no finding at all.
      expect(codes).not.toContain("TDDLIST_EVIDENCE_CELL_MALFORMED");
      expect(codes).not.toContain("TDDLIST_EVIDENCE_CELL_OVERSIZE");
    });
  });

  it("stays quiet on a row whose cells match the header", async () => {
    await withProject(async (root) => {
      const codes = await runOn(root, ledger([{ status: "done", evidence: conforming }]));
      expect(codes).not.toContain("TDDLIST_ROW_EXTRA_CELLS");
    });
  });

  it("names the counts and its waiver rule id", async () => {
    await withProject(async (root) => {
      await runOn(
        root,
        `${ledger([{ status: "done", evidence: conforming }]).trimEnd()} surplus |\n`,
      );
      const issues = await validateTddList(root, defaultConfig);
      const found = issues.find((i) => i.code === "TDDLIST_ROW_EXTRA_CELLS");
      expect(found?.rule).toBe(ROW_EXTRA_CELLS_RULE_ID);
      expect(found?.message).toContain("9 cells");
      expect(found?.message).toContain("8 columns");
    });
  });
});
