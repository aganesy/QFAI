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
 */

import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import {
  EVIDENCE_CELL_MALFORMED_RULE_ID,
  EVIDENCE_CELL_OVERSIZE_RULE_ID,
  validateTddList,
} from "../../src/core/validators/tddList.js";

const TEST_FILE = "tests/unit/sample.test.ts";

const TC_TABLE = `# 06 Test Cases

| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected | Notes |
| ----- | ----- | ------- | ------ | ----- | -------- | ----- |
| TC-0001 | unit | AC-0001 | EX-0001 | step | expected | |
`;

const HEADER = `# TDD Execution Ledger

| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence |
| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- |`;

function ledger(
  rows: Array<{ status: string; evidence: string; tddId?: string; layer?: string }>,
): string {
  const body = rows
    .map(
      (r, i) =>
        `| ${r.tddId ?? `TDD-000${i + 1}`} | TC-0001 | ${r.layer ?? "Unit"} | ${TEST_FILE} | sample | ${r.status} | - | ${r.evidence} |`,
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
    it(`errors on a dash placeholder at Status=${status}`, async () => {
      await withProject(async (root) => {
        const codes = await runOn(root, ledger([{ status, evidence: "-" }]));
        expect(codes).toContain("TDDLIST_EVIDENCE_EMPTY");
      });
    });
  }

  it("errors on an empty cell", async () => {
    await withProject(async (root) => {
      const codes = await runOn(root, ledger([{ status: "done", evidence: "" }]));
      expect(codes).toContain("TDDLIST_EVIDENCE_EMPTY");
    });
  });

  it("errors on en/em dash placeholders, not only the ASCII hyphen", async () => {
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
      expect(found?.severity).toBe("error");
    });
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

  for (const evidence of [
    POINTER,
    // `TIER:` is optional: the Tier obligation is owned elsewhere, so the
    // grammar reserves it a slot without demanding it yet.
    `RED:n-a GREEN:pass ORACLE:equivalent-mutant TIER:T2 REV:9f3c1de -> ${ANCHOR}`,
    `RED:falsifiability GREEN:pass ORACLE:proved TIER:T3 REV:0ab12cd -> ${ANCHOR}`,
    // An observation taken against an uncommitted tree. `evidence-revision.md`
    // defines this spelling and the reviewer-response gate accepts it, so a
    // grammar that forbade `+` made the one legal form of a legitimate
    // observation permanently malformed.
    `RED:fail GREEN:pass ORACLE:proved REV:working-tree+${CONTENT_HASH} -> ${ANCHOR}`,
    // The compatibility marker completion item 10 requires on an E2E/API row
    // that finished before the ATDD evidence split. Such a row cannot
    // re-observe a RED, so a grammar ending at the anchor left it no exit but
    // a standing waiver.
    `${POINTER} Pre-split-evidence: implement`,
  ]) {
    it(`accepts "${evidence.slice(0, 48)}"`, async () => {
      await withProject(async (root) => {
        const codes = await runOn(root, ledger([{ status: "done", evidence }]));
        expect(codes).not.toContain("TDDLIST_EVIDENCE_CELL_MALFORMED");
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
      expect(codes).toContain("TDDLIST_EVIDENCE_CELL_MALFORMED");
      // One defect, one finding: the cell is still shaped like a pointer, so
      // the status-only rule must not also read its `GREEN:pass` as prose.
      expect(codes).not.toContain("TDDLIST_EVIDENCE_STATUS_ONLY");
    });
  });

  it("names the provenance as the cause on an ATDD-owned row", async () => {
    await withProject(async (root) => {
      await runOn(
        root,
        ledger([
          {
            status: "done",
            layer: "Integration",
            tddId: "TDD-0042",
            evidence: `RED:n-a GREEN:pass ORACLE:proved REV:a1b2c3d -> \`.qfai/evidence/atdd-spec-0001.md#tdd-0001\``,
          },
        ]),
      );
      const issues = await validateTddList(root, defaultConfig);
      const found = issues.find((i) => i.code === "TDDLIST_EVIDENCE_CELL_MALFORMED");
      expect(found?.message).toContain("RED:n-a");
      expect(found?.message).toContain("TDD-0042");
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
});
