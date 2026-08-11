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
import { validateTddList } from "../../src/core/validators/tddList.js";

const TEST_FILE = "tests/unit/sample.test.ts";

const TC_TABLE = `# 06 Test Cases

| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected | Notes |
| ----- | ----- | ------- | ------ | ----- | -------- | ----- |
| TC-0001 | unit | AC-0001 | EX-0001 | step | expected | |
`;

const HEADER = `# TDD Execution Ledger

| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence | US-Refs | CON-API-Refs |
| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- | ------- | ------------ |`;

function ledger(
  rows: Array<{
    status: string;
    evidence: string;
    tddId?: string;
    layer?: string;
    testFile?: string;
    selector?: string;
    tcRefs?: string;
    usRefs?: string;
    conApiRefs?: string;
  }>,
): string {
  const body = rows
    .map((r, i) => {
      const layer = r.layer ?? "Unit";
      return `| ${r.tddId ?? `TDD-000${i + 1}`} | ${r.tcRefs ?? (layer === "E2E" || layer === "API" ? "-" : "TC-0001")} | ${layer} | ${r.testFile ?? TEST_FILE} | ${r.selector ?? "sample"} | ${r.status} | - | ${r.evidence} | ${r.usRefs ?? (layer === "E2E" ? "US-0001" : "-")} | ${r.conApiRefs ?? (layer === "API" ? "CON-API-0001" : "-")} |`;
    })
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

async function runOn(
  root: string,
  testList: string,
  evidenceFiles: Readonly<Record<string, string>> = {},
): Promise<string[]> {
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
  for (const [relativePath, content] of Object.entries(evidenceFiles)) {
    const evidencePath = path.join(root, relativePath);
    await mkdir(path.dirname(evidencePath), { recursive: true });
    await writeFile(evidencePath, content, "utf-8");
  }
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

describe("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED", () => {
  const IMPLEMENT_POINTER =
    "RED fail / GREEN pass — evidence at `.qfai/evidence/implement-spec-0001.md#tdd-0001`";

  function completeEntry(layer: "Unit" | "Integration" | "API" | "E2E"): string {
    const obligation =
      layer === "E2E"
        ? "US-ref: US-0001"
        : layer === "API"
          ? "CON-API-ref: CON-API-0001"
          : "TC-ref: TC-0001";
    return `# Evidence

### TDD-0001

- TDD-ID: TDD-0001
- Layer: ${layer}
- Test file: tests/unit/sample.test.ts
- Selector: sample
- ${obligation}
- Round 1: Revision: abc123
- Round 1: RED revision: def456
- Round 1: RED test hash: sha256:red
- RED failure mode: assertion
- Round 1: RED command: npm test
- Round 1: RED result: 1 failed
- Round 1: GREEN command: npm test
- Round 1: GREEN result: 1 passed
- Refactor verify command: npm test
- Refactor verify result: 1 passed
- Oracle proof: equivalent-mutant
- qa-gatekeeper: PASS
- Spec review: PASS
- Code quality review: PASS
`;
  }

  it("errors when the evidence file does not exist", async () => {
    await withProject(async (root) => {
      const codes = await runOn(root, ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]));
      expect(codes).toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
    });
  });

  it("errors when the evidence file has no matching heading", async () => {
    await withProject(async (root) => {
      const codes = await runOn(root, ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]), {
        ".qfai/evidence/implement-spec-0001.md": "# Evidence\n\n### TDD-0002\n",
      });
      expect(codes).toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
    });
  });

  for (const [label, hiddenHeading] of [
    ["fenced sample", "```md\n### TDD-0001\n```"],
    ["HTML comment", "<!--\n### TDD-0001\n-->"],
  ] as const) {
    it(`does not resolve a heading that exists only in a ${label}`, async () => {
      await withProject(async (root) => {
        const codes = await runOn(root, ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]), {
          ".qfai/evidence/implement-spec-0001.md": `# Evidence\n\n${hiddenHeading}\n`,
        });
        expect(codes).toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
      });
    });
  }

  it("accepts an anchor that resolves to the row's evidence heading", async () => {
    await withProject(async (root) => {
      const codes = await runOn(root, ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]), {
        ".qfai/evidence/implement-spec-0001.md": completeEntry("Unit"),
      });
      expect(codes).not.toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
    });
  });

  for (const [label, from, to] of [
    ["TDD-ID", "TDD-ID: TDD-0001", "TDD-ID: TDD-9999"],
    ["Layer", "Layer: Unit", "Layer: Component"],
    ["Test file", `Test file: ${TEST_FILE}`, "Test file: tests/unit/other.test.ts"],
    ["Selector", "Selector: sample", "Selector: another sample"],
    ["obligation", "TC-ref: TC-0001", "TC-ref: TC-9999"],
  ] as const) {
    it(`rejects a completed evidence ${label} that disagrees with the ledger row`, async () => {
      await withProject(async (root) => {
        const evidence = completeEntry("Unit").replace(from, to);
        const codes = await runOn(root, ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]), {
          ".qfai/evidence/implement-spec-0001.md": evidence,
        });
        expect(codes).toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
      });
    });
  }

  for (const field of ["Spec review", "Code quality review"] as const) {
    it(`rejects a completed evidence ${field} verdict other than PASS`, async () => {
      await withProject(async (root) => {
        const evidence = completeEntry("Unit").replace(`${field}: PASS`, `${field}: REVISE`);
        const codes = await runOn(root, ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]), {
          ".qfai/evidence/implement-spec-0001.md": evidence,
        });
        expect(codes).toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
      });
    });
  }

  for (const verdict of ["", "REVISE"] as const) {
    it(`rejects completed evidence with qa-gatekeeper verdict ${verdict || "missing"}`, async () => {
      await withProject(async (root) => {
        const evidence = completeEntry("Unit").replace(
          `- qa-gatekeeper: PASS\n`,
          verdict ? `- qa-gatekeeper: ${verdict}\n` : "",
        );
        const codes = await runOn(root, ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]), {
          ".qfai/evidence/implement-spec-0001.md": evidence,
        });
        expect(codes).toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
      });
    });
  }

  it("accepts command and result payloads in canonical fenced blocks", async () => {
    await withProject(async (root) => {
      const evidence = completeEntry("Unit")
        .replace(
          "- Round 1: RED command: npm test",
          "- Round 1: RED command:\n```sh\nnpm test\n```",
        )
        .replace(
          "- Round 1: RED result: 1 failed",
          "- Round 1: RED result:\n```text\n1 failed\n```",
        )
        .replace(
          "- Round 1: GREEN command: npm test",
          "- Round 1: GREEN command:\n```sh\nnpm test\n```",
        )
        .replace(
          "- Round 1: GREEN result: 1 passed",
          "- Round 1: GREEN result:\n```text\n1 passed\n```",
        );
      const codes = await runOn(root, ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]), {
        ".qfai/evidence/implement-spec-0001.md": evidence,
      });
      expect(codes).not.toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
    });
  });

  it("does not treat an empty field followed by another field as fenced evidence", async () => {
    await withProject(async (root) => {
      const evidence = completeEntry("Unit").replace(
        "- Round 1: GREEN result: 1 passed",
        "- Round 1: GREEN result:",
      );
      const codes = await runOn(root, ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]), {
        ".qfai/evidence/implement-spec-0001.md": evidence,
      });
      expect(codes).toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
    });
  });

  it("does not count a field label embedded inside fenced output", async () => {
    await withProject(async (root) => {
      const evidence = completeEntry("Unit")
        .replace("- qa-gatekeeper: PASS\n", "")
        .replace(
          "- Round 1: RED result: 1 failed",
          "- Round 1: RED result:\n```text\n1 failed\n- qa-gatekeeper: PASS\n```",
        );
      const codes = await runOn(root, ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]), {
        ".qfai/evidence/implement-spec-0001.md": evidence,
      });
      expect(codes).toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
    });
  });

  for (const [branch, extraField] of [
    ["observed RED", "- Satisfied-by: existing-test\n"],
    ["falsifiability", "- Round 1: RED command: npm test\n"],
  ] as const) {
    it(`rejects a partial ${branch === "observed RED" ? "falsifiability" : "observed RED"} form beside complete ${branch}`, async () => {
      await withProject(async (root) => {
        let evidence = completeEntry("Unit");
        if (branch === "falsifiability") {
          evidence = evidence
            .replace(/- Round 1: RED (?:command|result|revision):.*\n/g, "")
            .replace("- RED failure mode: assertion", "- RED failure mode: falsifiability")
            .replace("- Oracle proof: equivalent-mutant\n", "")
            .concat(`- Satisfied-by: existing-test
- Falsifiability command: npm test -- sample
- Falsifiability result: mutation failed
- Falsifiability revision: fedcba
`);
        }
        evidence += extraField;
        const codes = await runOn(root, ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]), {
          ".qfai/evidence/implement-spec-0001.md": evidence,
        });
        expect(codes).toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
      });
    });
  }

  for (const failureMode of ["import-error", "falsifiability"] as const) {
    it(`rejects observed RED failure mode ${failureMode}`, async () => {
      await withProject(async (root) => {
        const evidence = completeEntry("Unit").replace(
          "RED failure mode: assertion",
          `RED failure mode: ${failureMode}`,
        );
        const codes = await runOn(root, ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]), {
          ".qfai/evidence/implement-spec-0001.md": evidence,
        });
        expect(codes).toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
      });
    });
  }

  it("accepts expected-error as an observed RED failure mode", async () => {
    await withProject(async (root) => {
      const evidence = completeEntry("Unit").replace(
        "RED failure mode: assertion",
        "RED failure mode: expected-error",
      );
      const codes = await runOn(root, ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]), {
        ".qfai/evidence/implement-spec-0001.md": evidence,
      });
      expect(codes).not.toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
    });
  });

  it("rejects assertion failure mode on a falsifiability entry", async () => {
    await withProject(async (root) => {
      const evidence = completeEntry("Unit")
        .replace(/- Round 1: RED (?:command|result|revision):.*\n/g, "")
        .replace("- Oracle proof: equivalent-mutant\n", "").concat(`- Satisfied-by: existing-test
- Falsifiability command: npm test -- sample
- Falsifiability result: mutation failed
- Falsifiability revision: fedcba
`);
      const codes = await runOn(root, ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]), {
        ".qfai/evidence/implement-spec-0001.md": evidence,
      });
      expect(codes).toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
    });
  });

  it("accepts a selector containing an unescaped pipe in bullet evidence", async () => {
    await withProject(async (root) => {
      const evidence = completeEntry("Unit").replace("Selector: sample", "Selector: foo|bar");
      const codes = await runOn(
        root,
        ledger([{ status: "done", evidence: IMPLEMENT_POINTER, selector: "foo\\|bar" }]),
        { ".qfai/evidence/implement-spec-0001.md": evidence },
      );
      expect(codes).not.toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
    });
  });

  it("accepts a selector containing an escaped pipe in table evidence", async () => {
    await withProject(async (root) => {
      const evidence = completeEntry("Unit").replace(
        "- Selector: sample",
        "| Selector | foo\\|bar |",
      );
      const codes = await runOn(
        root,
        ledger([{ status: "done", evidence: IMPLEMENT_POINTER, selector: "foo\\|bar" }]),
        { ".qfai/evidence/implement-spec-0001.md": evidence },
      );
      expect(codes).not.toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
    });
  });

  for (const [layer, field, from, to] of [
    ["E2E", "US-ref", "US-ref: US-0001", "US-ref: US-9999"],
    ["API", "CON-API-ref", "CON-API-ref: CON-API-0001", "CON-API-ref: CON-API-9999"],
  ] as const) {
    it(`rejects a completed ${layer} evidence ${field} that disagrees with its ledger column`, async () => {
      await withProject(async (root) => {
        const pointer =
          "RED fail / GREEN pass — evidence at `.qfai/evidence/atdd-spec-0001.md#tdd-0001`";
        const evidence = completeEntry(layer).replace(from, to);
        const codes = await runOn(root, ledger([{ status: "done", evidence: pointer, layer }]), {
          ".qfai/evidence/atdd-spec-0001.md": evidence,
        });
        expect(codes).toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
      });
    });
  }

  it("rejects completed evidence that records both observed RED and falsifiability proof", async () => {
    await withProject(async (root) => {
      const evidence = `${completeEntry("Unit")}
- Satisfied-by: existing-test
- Falsifiability command: npm test -- sample
- Falsifiability result: mutation failed
- Falsifiability revision: fedcba
`;
      const codes = await runOn(root, ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]), {
        ".qfai/evidence/implement-spec-0001.md": evidence,
      });
      expect(codes).toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
    });
  });

  it("accepts completed evidence with falsifiability proof and no observed RED", async () => {
    await withProject(async (root) => {
      const evidence = completeEntry("Unit")
        .replace(/- Round 1: RED (?:command|result|revision):.*\n/g, "")
        .replace("- RED failure mode: assertion", "- RED failure mode: falsifiability")
        .replace("- Oracle proof: equivalent-mutant\n", "").concat(`- Satisfied-by: existing-test
- Falsifiability command: npm test -- sample
- Falsifiability result: mutation failed
- Falsifiability revision: fedcba
`);
      const codes = await runOn(root, ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]), {
        ".qfai/evidence/implement-spec-0001.md": evidence,
      });
      expect(codes).not.toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
    });
  });

  it("rejects a matching heading whose completed evidence section is empty", async () => {
    await withProject(async (root) => {
      const codes = await runOn(root, ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]), {
        ".qfai/evidence/implement-spec-0001.md": "# Evidence\n\n### TDD-0001\n",
      });
      expect(codes).toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
    });
  });

  it("resolves integration rows against their ATDD evidence file", async () => {
    await withProject(async (root) => {
      const pointer =
        "RED fail / GREEN pass — evidence at `.qfai/evidence/atdd-spec-0001.md#tdd-0001`";
      const codes = await runOn(
        root,
        ledger([{ status: "done", evidence: pointer, layer: "Integration" }]),
        { ".qfai/evidence/atdd-spec-0001.md": completeEntry("Integration") },
      );
      expect(codes).not.toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
    });
  });

  it("rejects an existing evidence entry owned by the wrong layer", async () => {
    await withProject(async (root) => {
      const pointer =
        "RED fail / GREEN pass — evidence at `.qfai/evidence/atdd-spec-0001.md#tdd-0001`";
      const codes = await runOn(root, ledger([{ status: "done", evidence: pointer }]), {
        ".qfai/evidence/atdd-spec-0001.md": "# ATDD Evidence\n\n### TDD-0001\n",
      });
      expect(codes).toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
    });
  });

  it("rejects an anchor that resolves to a different TDD item", async () => {
    await withProject(async (root) => {
      const pointer =
        "RED fail / GREEN pass — evidence at `.qfai/evidence/implement-spec-0001.md#tdd-0002`";
      const codes = await runOn(root, ledger([{ status: "done", evidence: pointer }]), {
        ".qfai/evidence/implement-spec-0001.md": "# Evidence\n\n### TDD-0002\n",
      });
      expect(codes).toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
    });
  });

  it("rejects an evidence-at claim without a fragment", async () => {
    await withProject(async (root) => {
      const pointer = "RED fail / GREEN pass — evidence at `.qfai/evidence/implement-spec-0001.md`";
      const codes = await runOn(root, ledger([{ status: "done", evidence: pointer }]), {
        ".qfai/evidence/implement-spec-0001.md": "# Evidence\n\n### TDD-0001\n",
      });
      expect(codes).toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
    });
  });

  it("rejects a marked integration row in implementation evidence", async () => {
    await withProject(async (root) => {
      const pointer =
        "RED fail / GREEN pass — Pre-split-evidence: implement; evidence at `.qfai/evidence/implement-spec-0001.md#tdd-0001`";
      const codes = await runOn(
        root,
        ledger([{ status: "done", evidence: pointer, layer: "Integration" }]),
        { ".qfai/evidence/implement-spec-0001.md": "# Evidence\n\n### TDD-0001\n" },
      );
      expect(codes).toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
    });
  });

  it("keeps the pre-split compatibility marker for E2E rows", async () => {
    await withProject(async (root) => {
      const pointer =
        "RED fail / GREEN pass — Pre-split-evidence: implement; evidence at `.qfai/evidence/implement-spec-0001.md#tdd-0001`";
      const codes = await runOn(
        root,
        ledger([{ status: "done", evidence: pointer, layer: "E2E" }]),
        { ".qfai/evidence/implement-spec-0001.md": completeEntry("E2E") },
      );
      expect(codes).not.toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
    });
  });
});
