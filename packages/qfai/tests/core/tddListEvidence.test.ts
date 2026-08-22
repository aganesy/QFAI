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

import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateTddList } from "../../src/core/validators/tddList.js";

const TEST_FILE = "tests/unit/sample.test.ts";

function digest(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeArtifact(value: string): string {
  const lines = value
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""));
  while (lines[0]?.trim().length === 0) lines.shift();
  while (lines.at(-1)?.trim().length === 0) lines.pop();
  return `${lines.join("\n")}\n`;
}

function phaseAuditHash(evidenceFile: string, content: string, tddId = "TDD-0001"): string {
  const after = content.split(new RegExp(`^### ${tddId}\\s*$`, "m"))[1] ?? "";
  // Stop at the next entry heading, so a file that carries an editing item
  // beside the consumer hashes each entry over its own lines.
  const section = after.split(/^#{1,3} /m)[0] ?? "";
  const authored =
    section.split(
      /^\s*(?:\|\s*)?(?:- )?(?:Spec review|Spec audited|Code quality review|Code quality audited|Checkpoint verification)/m,
    )[0] ?? "";
  const artifact = normalizeArtifact(`### ${tddId}\n${authored}`);
  return digest(`${evidenceFile}\0${digest(artifact)}`);
}

function checkpointSeal(revision: string, command: string, result: string): string {
  return digest(
    normalizeArtifact(
      `Revision: ${revision}\nCheckpoint verification command: ${command}\nCheckpoint verification result: ${result}`,
    ),
  );
}

async function packSeal(root: string, packPath: string): Promise<string> {
  const absolute = path.join(root, packPath);
  const records: string[] = [];
  async function walk(directory: string, relativeDirectory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      const relativePath = `${relativeDirectory}/${entry.name}`;
      if (entry.isDirectory()) await walk(entryPath, relativePath);
      else
        records.push(
          `${relativePath}\0${digest(normalizeArtifact(await readFile(entryPath, "utf8")))}`,
        );
    }
  }
  await walk(absolute, packPath);
  records.sort();
  return digest(records.join("\n"));
}

/** A full-length git rev: the form `evidence-revision.md` asks for. */
const DEFAULT_REVISION = "abc1230000000000000000000000000000000000";

interface EvidenceOptions {
  requestOnlyPassRole?: string;
  reviewRequestTddId?: string;
  summaryTargetPath?: string;
  omitReviewPacks?: boolean;
  revision?: string;
  /** Write this role's blocking `REVISE` where the gate used to miss it. */
  hiddenVerdictRole?: string;
  hiddenVerdictWrapper?: "fence" | "comment" | "duplicate";
}

/**
 * A reviewer response body.
 *
 * `hiddenVerdictRole` is the evasion the visible-field rule exists for: the
 * verdict a reader sees is `REVISE`, while the fields the gate reads sit in a
 * fenced sample or an HTML comment — or the two verdicts stand side by side and
 * the first one wins a `.test()`. `summary.json` still says PASS and the pack
 * seal is computed from these bytes, so nothing else disagrees.
 */
function responseBody(role: string, passRecord: string, options: EvidenceOptions): string {
  if (options.requestOnlyPassRole === role) return "Result: REVISE\n";
  if (options.hiddenVerdictRole !== role) return passRecord;
  if (options.hiddenVerdictWrapper === "duplicate") {
    return passRecord.replace("Result: PASS\n", "Result: PASS\nResult: REVISE\n");
  }
  return options.hiddenVerdictWrapper === "comment"
    ? `Result: REVISE\n\n<!--\n${passRecord}-->\n`
    : `Result: REVISE\n\n\`\`\`\n${passRecord}\`\`\`\n`;
}

async function materializeEvidence(
  root: string,
  evidenceFile: string,
  rawContent: string,
  options: EvidenceOptions = {},
): Promise<string> {
  const revision = options.revision ?? DEFAULT_REVISION;
  const testPath = path.join(root, TEST_FILE);
  const metadata = await lstat(testPath);
  const testBlob = digest(await readFile(testPath));
  const redHash = digest(
    `${TEST_FILE}\0file\0${(metadata.mode & 0o777).toString(8).padStart(3, "0")}\0${testBlob}`,
  );
  let content = rawContent.replaceAll("{{RED_TEST_HASH}}", redHash);
  const auditHash = phaseAuditHash(evidenceFile, content);
  content = content.replaceAll(
    "{{EDITING_AUDIT_HASH}}",
    phaseAuditHash(evidenceFile, content, "TDD-0002"),
  );
  content = content.replaceAll("{{AUDIT_HASH}}", auditHash);

  for (const [name, role, placeholder] of [
    ["20260811000000001", "completion-reviewer", "{{SPEC_PACK_SEAL}}"],
    ["20260811000000002", "implementation-reviewer", "{{CODE_PACK_SEAL}}"],
  ] as const) {
    const packPath = `.qfai/review/review-${name}`;
    const packDir = path.join(root, packPath);
    await mkdir(packDir, { recursive: true });
    const passRecord = `Result: PASS\nReviewed revision: ${revision}\nAudited evidence hash: ${auditHash}\n`;
    await writeFile(
      path.join(packDir, "review_request.md"),
      options.requestOnlyPassRole === role
        ? `TDD-ID: ${options.reviewRequestTddId ?? "TDD-0001"}\n${passRecord}`
        : `TDD-ID: ${options.reviewRequestTddId ?? "TDD-0001"}\n`,
      "utf8",
    );
    await writeFile(
      path.join(packDir, `R01_${role}.md`),
      responseBody(role, passRecord, options),
      "utf8",
    );
    await writeFile(
      path.join(packDir, "summary.json"),
      `${JSON.stringify(
        {
          overall_status: "PASS",
          revision,
          target: {
            kind: "spec",
            path: options.summaryTargetPath ?? ".qfai/specs/spec-0001",
          },
          reviewers: [{ reviewer: role, status: "PASS" }],
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    content = content.replaceAll(placeholder, await packSeal(root, packPath));
  }
  return content.replaceAll("{{CHECKPOINT_SEAL}}", checkpointSeal(revision, "npm test", "PASS"));
}

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
  options: EvidenceOptions = {},
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
  const testPath = path.join(root, TEST_FILE);
  await mkdir(path.dirname(testPath), { recursive: true });
  await writeFile(testPath, "// test\n", "utf-8");
  for (const [relativePath, content] of Object.entries(evidenceFiles)) {
    const evidencePath = path.join(root, relativePath);
    await mkdir(path.dirname(evidencePath), { recursive: true });
    await writeFile(
      evidencePath,
      await materializeEvidence(root, relativePath, content, options),
      "utf-8",
    );
  }
  if (options.omitReviewPacks === true) {
    await rm(path.join(root, ".qfai", "review"), { recursive: true, force: true });
  }

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
- Round 1: Revision: abc1230000000000000000000000000000000000
- Round 1: RED revision: def4560000000000000000000000000000000000
- Round 1: RED test hash: {{RED_TEST_HASH}}
- Round 1: RED test manifest: tests/unit/sample.test.ts
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
- Spec reviewed revision: abc1230000000000000000000000000000000000
- Spec audited evidence hash: {{AUDIT_HASH}}
- Spec review pack: .qfai/review/review-20260811000000001
- Spec review pack seal: {{SPEC_PACK_SEAL}}
- Code quality review: PASS
- Code quality reviewed revision: abc1230000000000000000000000000000000000
- Code quality audited evidence hash: {{AUDIT_HASH}}
- Code quality review pack: .qfai/review/review-20260811000000002
- Code quality review pack seal: {{CODE_PACK_SEAL}}
- Checkpoint verification command: npm test
- Checkpoint verification result: PASS
- Checkpoint verification seal: {{CHECKPOINT_SEAL}}
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

  it("does not count a field label embedded inside a list-indented fenced output", async () => {
    await withProject(async (root) => {
      const evidence = completeEntry("Unit")
        .replace("- qa-gatekeeper: PASS\n", "")
        .replace(
          "- Round 1: RED result: 1 failed",
          "- Round 1: RED result:\n    ```text\n    1 failed\n    - qa-gatekeeper: PASS\n    ```",
        );
      const codes = await runOn(root, ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]), {
        ".qfai/evidence/implement-spec-0001.md": evidence,
      });
      expect(codes).toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
    });
  });

  for (const field of [
    "Spec reviewed revision",
    "Spec audited evidence hash",
    "Spec review pack",
    "Spec review pack seal",
    "Code quality reviewed revision",
    "Code quality audited evidence hash",
    "Code quality review pack",
    "Code quality review pack seal",
  ] as const) {
    it(`rejects a completed entry without ${field}`, async () => {
      await withProject(async (root) => {
        const evidence = completeEntry("Unit").replace(new RegExp(`^- ${field}:.*\\n`, "m"), "");
        const codes = await runOn(root, ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]), {
          ".qfai/evidence/implement-spec-0001.md": evidence,
        });
        expect(codes).toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
      });
    });
  }

  for (const field of [
    "Checkpoint verification command",
    "Checkpoint verification result",
    "Checkpoint verification seal",
  ] as const) {
    it(`rejects a completed entry without ${field}`, async () => {
      await withProject(async (root) => {
        const evidence = completeEntry("Unit").replace(new RegExp(`^- ${field}:.*\\n`, "m"), "");
        const codes = await runOn(root, ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]), {
          ".qfai/evidence/implement-spec-0001.md": evidence,
        });
        expect(codes).toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
      });
    });
  }

  it("rejects a latest round that borrows required fields from an earlier round", async () => {
    await withProject(async (root) => {
      const evidence = completeEntry("Unit").replace(
        "- Refactor verify command: npm test",
        `- Round 1: reviewer verdict: REVISE — update behavior
- Round 2: Revision: abc1230000000000000000000000000000000000
- Round 2: RED revision: def7890000000000000000000000000000000000
- Round 2: RED command: npm test
- Round 2: GREEN command: npm test
- Round 2: GREEN result: 1 passed
- Refactor verify command: npm test`,
      );
      const codes = await runOn(root, ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]), {
        ".qfai/evidence/implement-spec-0001.md": evidence,
      });
      expect(codes).toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
    });
  });

  for (const [field, invalid] of [
    ["Round 1: RED command", "skipped"],
    ["Round 1: RED command", "not run — npm test"],
    ["Round 1: RED command", "did not run — npm test"],
    ["Round 1: RED result", "passed"],
    ["Round 1: RED result", "did not fail"],
    ["Round 1: GREEN command", "not run"],
    ["Round 1: GREEN result", "failed"],
    ["Round 1: GREEN result", "not passed"],
    ["Refactor verify result", "FAIL"],
    ["Checkpoint verification result", "FAIL"],
  ] as const) {
    it(`rejects non-executed or contradictory ${field}`, async () => {
      await withProject(async (root) => {
        const evidence = completeEntry("Unit").replace(
          new RegExp(`(${field.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}: ).*$`, "m"),
          `$1${invalid}`,
        );
        const codes = await runOn(root, ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]), {
          ".qfai/evidence/implement-spec-0001.md": evidence,
        });
        expect(codes).toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
      });
    });
  }

  it("does not accept review PASS fields copied into review_request.md", async () => {
    await withProject(async (root) => {
      const codes = await runOn(
        root,
        ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]),
        { ".qfai/evidence/implement-spec-0001.md": completeEntry("Unit") },
        { requestOnlyPassRole: "completion-reviewer" },
      );
      expect(codes).toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
    });
  });

  it("accepts committed evidence when local-only review packs are absent in a fresh clone", async () => {
    await withProject(async (root) => {
      const codes = await runOn(
        root,
        ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]),
        { ".qfai/evidence/implement-spec-0001.md": completeEntry("Unit") },
        { omitReviewPacks: true },
      );
      expect(codes).not.toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
    });
  });

  it("rejects phase-authored fields placed after review fields", async () => {
    await withProject(async (root) => {
      const evidence = completeEntry("Unit")
        .replace("- Spec review: PASS\n", "")
        .replace(
          "- Round 1: Revision: abc1230000000000000000000000000000000000",
          "- Spec review: PASS\n- Round 1: Revision: abc1230000000000000000000000000000000000",
        );
      const codes = await runOn(root, ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]), {
        ".qfai/evidence/implement-spec-0001.md": evidence,
      });
      expect(codes).toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
    });
  });

  for (const [label, options] of [
    ["review request TDD-ID", { reviewRequestTddId: "TDD-9999" }],
    ["summary target spec", { summaryTargetPath: ".qfai/specs/spec-9999" }],
  ] as const) {
    it(`rejects a review pack whose ${label} targets another item`, async () => {
      await withProject(async (root) => {
        const codes = await runOn(
          root,
          ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]),
          { ".qfai/evidence/implement-spec-0001.md": completeEntry("Unit") },
          options,
        );
        expect(codes).toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
      });
    });
  }

  it("rejects an ATDD-owned RED hash without a manifest", async () => {
    await withProject(async (root) => {
      const pointer =
        "RED fail / GREEN pass — evidence at `.qfai/evidence/atdd-spec-0001.md#tdd-0001`";
      const evidence = completeEntry("Integration").replace(
        /^- Round 1: RED test manifest:.*\n/m,
        "",
      );
      const codes = await runOn(
        root,
        ledger([{ status: "done", evidence: pointer, layer: "Integration" }]),
        {
          ".qfai/evidence/atdd-spec-0001.md": evidence,
        },
      );
      expect(codes).toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
    });
  });

  it("rejects an ATDD-owned RED hash that does not match its manifest", async () => {
    await withProject(async (root) => {
      const pointer =
        "RED fail / GREEN pass — evidence at `.qfai/evidence/atdd-spec-0001.md#tdd-0001`";
      const evidence = completeEntry("Integration").replace("{{RED_TEST_HASH}}", "f".repeat(64));
      const codes = await runOn(
        root,
        ledger([{ status: "done", evidence: pointer, layer: "Integration" }]),
        {
          ".qfai/evidence/atdd-spec-0001.md": evidence,
        },
      );
      expect(codes).toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
    });
  });

  it("validates the current manifest without rehashing an earlier round against later bytes", async () => {
    await withProject(async (root) => {
      const pointer =
        "RED fail / GREEN pass — evidence at `.qfai/evidence/atdd-spec-0001.md#tdd-0001`";
      const evidence = completeEntry("Integration")
        .replace("{{RED_TEST_HASH}}", "f".repeat(64))
        .replace(
          "- Refactor verify command: npm test",
          `- Round 1: reviewer verdict: REVISE — update the shared fixture
- Round 2: Revision: abc1230000000000000000000000000000000000
- Round 2: RED revision: def7890000000000000000000000000000000000
- Round 2: RED test hash: {{RED_TEST_HASH}}
- Round 2: RED test manifest: tests/unit/sample.test.ts
- Round 2: RED command: npm test
- Round 2: RED result: 1 failed
- Round 2: GREEN command: npm test
- Round 2: GREEN result: 1 passed
- Refactor verify command: npm test`,
        );
      const codes = await runOn(
        root,
        ledger([{ status: "done", evidence: pointer, layer: "Integration" }]),
        { ".qfai/evidence/atdd-spec-0001.md": evidence },
      );
      expect(codes).not.toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
    });
  });

  const ATDD_POINTER =
    "RED fail / GREEN pass — evidence at `.qfai/evidence/atdd-spec-0001.md#tdd-0001`";

  const REVERIFY_FIELDS = `- Evidence file: .qfai/evidence/atdd-spec-0001.md
- Revision: abc1230000000000000000000000000000000000
- Selector: sample
- Re-verify command: npm test -- sample
- Re-verify result: PASS
- Proof command: npm test -- sample --mutated
- Proof result: {{PROOF_RESULT}}
- Restored GREEN command: npm test -- sample
- Restored GREEN result: PASS
- RED test manifest: tests/unit/sample.test.ts
- RED test hash: {{RED_TEST_HASH}}`;

  /**
   * The entry of the row that edited the shared artifact.
   *
   * The re-verify record sits in its **phase-authored** region — before the
   * gate fields — so the audit hash its reviewers recorded addresses those
   * bytes. That is what makes the record evidence rather than an assertion
   * anyone can append, and the validator now requires it.
   */
  function editingEntry(options: { proofResult?: string; auditHash?: string } = {}): string {
    return `
### TDD-0002

- TDD-ID: TDD-0002
- Layer: Integration
- Test file: tests/unit/sample.test.ts
- Selector: shared-fixture
- TC-ref: TC-0001
- Round 1: Revision: abc1230000000000000000000000000000000000

#### Shared-artifact re-verify

##### spec-0001/TDD-0001

${REVERIFY_FIELDS.replace("{{PROOF_RESULT}}", options.proofResult ?? "1 failed")}

- Spec audited evidence hash: ${options.auditHash ?? "{{EDITING_AUDIT_HASH}}"}
- Code quality audited evidence hash: ${options.auditHash ?? "{{EDITING_AUDIT_HASH}}"}
`;
  }

  function staleConsumerEntry(): string {
    return completeEntry("Integration").replace("{{RED_TEST_HASH}}", "f".repeat(64));
  }

  it("accepts a shared-artifact re-verify recorded in the editing item's audited entry", async () => {
    await withProject(async (root) => {
      const codes = await runOn(
        root,
        ledger([{ status: "done", evidence: ATDD_POINTER, layer: "Integration" }]),
        { ".qfai/evidence/atdd-spec-0001.md": staleConsumerEntry().concat(editingEntry()) },
      );
      expect(codes).not.toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
    });
  });

  it("rejects a shared-artifact re-verify whose proof does not fail", async () => {
    await withProject(async (root) => {
      const codes = await runOn(
        root,
        ledger([{ status: "done", evidence: ATDD_POINTER, layer: "Integration" }]),
        {
          ".qfai/evidence/atdd-spec-0001.md": staleConsumerEntry().concat(
            editingEntry({ proofResult: "PASS" }),
          ),
        },
      );
      expect(codes).toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
    });
  });

  // The hole this binding closes: the record used to clear a stale RED hash
  // from anywhere under `.qfai/evidence/`, audited by nobody.
  it("rejects a shared-artifact re-verify no item's audit hash covers", async () => {
    await withProject(async (root) => {
      const evidence = staleConsumerEntry().concat(`
## Shared-artifact re-verify

### spec-0001/TDD-0001

${REVERIFY_FIELDS.replace("{{PROOF_RESULT}}", "1 failed")}
`);
      const codes = await runOn(
        root,
        ledger([{ status: "done", evidence: ATDD_POINTER, layer: "Integration" }]),
        { ".qfai/evidence/atdd-spec-0001.md": evidence },
      );
      expect(codes).toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
    });
  });

  it("rejects a shared-artifact re-verify the editing item's audit hash no longer matches", async () => {
    await withProject(async (root) => {
      const codes = await runOn(
        root,
        ledger([{ status: "done", evidence: ATDD_POINTER, layer: "Integration" }]),
        {
          ".qfai/evidence/atdd-spec-0001.md": staleConsumerEntry().concat(
            editingEntry({ auditHash: "e".repeat(64) }),
          ),
        },
      );
      expect(codes).toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
    });
  });

  it("rejects an unaudited block dropped into an unrelated evidence file", async () => {
    await withProject(async (root) => {
      const codes = await runOn(
        root,
        ledger([{ status: "done", evidence: ATDD_POINTER, layer: "Integration" }]),
        {
          // Written first so the shared review packs are (re)materialised from
          // the entry that records their seals, not from this file.
          ".qfai/evidence/notes.md": `# Notes

## Shared-artifact re-verify

### spec-0001/TDD-0001

${REVERIFY_FIELDS.replace("{{PROOF_RESULT}}", "1 failed")}
`,
          ".qfai/evidence/atdd-spec-0001.md": staleConsumerEntry(),
        },
      );
      expect(codes).toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
    });
  });

  for (const [field, placeholder] of [
    ["Spec audited evidence hash", "{{AUDIT_HASH}}"],
    ["Spec review pack seal", "{{SPEC_PACK_SEAL}}"],
    ["Code quality review pack seal", "{{CODE_PACK_SEAL}}"],
    ["Checkpoint verification seal", "{{CHECKPOINT_SEAL}}"],
  ] as const) {
    it(`rejects a ${field} that does not match current evidence`, async () => {
      await withProject(async (root) => {
        const evidence = completeEntry("Unit").replace(placeholder, "f".repeat(64));
        const codes = await runOn(root, ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]), {
          ".qfai/evidence/implement-spec-0001.md": evidence,
        });
        expect(codes).toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
      });
    });
  }

  it("rejects a completed row whose selected obligation is a dash placeholder", async () => {
    await withProject(async (root) => {
      const evidence = completeEntry("Unit").replace("TC-ref: TC-0001", "TC-ref: -");
      const codes = await runOn(
        root,
        ledger([{ status: "done", evidence: IMPLEMENT_POINTER, tcRefs: "-" }]),
        { ".qfai/evidence/implement-spec-0001.md": evidence },
      );
      expect(codes).toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
    });
  });

  it("does not let a nested TDD heading lend fields to its parent item", async () => {
    await withProject(async (root) => {
      const evidence = completeEntry("Unit")
        .replace(/- Round 1: Revision:[\s\S]*$/, "")
        .concat(
          `#### TDD-0002\n\n${completeEntry("Unit").replace("TDD-ID: TDD-0001", "TDD-ID: TDD-0002")}`,
        );
      const codes = await runOn(root, ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]), {
        ".qfai/evidence/implement-spec-0001.md": evidence,
      });
      expect(codes).toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
    });
  });

  for (const [branch, extraField] of [
    ["observed RED", "- Round 1: Satisfied-by: existing-test\n"],
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
            .replace(
              "- Refactor verify command: npm test",
              `- Round 1: Satisfied-by: existing-test
- Round 1: Falsifiability command: npm test -- sample
- Round 1: Falsifiability result: mutation failed
- Round 1: Falsifiability revision: fedcba0000000000000000000000000000000000
- Refactor verify command: npm test`,
            );
        }
        evidence = evidence.replace(
          "- Refactor verify command: npm test",
          `${extraField}- Refactor verify command: npm test`,
        );
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
        .replace("- Oracle proof: equivalent-mutant\n", "")
        .replace(
          "- Refactor verify command: npm test",
          `- Round 1: Satisfied-by: existing-test
- Round 1: Falsifiability command: npm test -- sample
- Round 1: Falsifiability result: mutation failed
- Round 1: Falsifiability revision: fedcba0000000000000000000000000000000000
- Refactor verify command: npm test`,
        );
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
      const evidence = completeEntry("Unit").replace(
        "- Refactor verify command: npm test",
        `- Round 1: Satisfied-by: existing-test
- Round 1: Falsifiability command: npm test -- sample
- Round 1: Falsifiability result: mutation failed
- Round 1: Falsifiability revision: fedcba0000000000000000000000000000000000
- Refactor verify command: npm test`,
      );
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
        .replace("- Oracle proof: equivalent-mutant\n", "")
        .replace(
          "- Refactor verify command: npm test",
          `- Round 1: Satisfied-by: existing-test
- Round 1: Falsifiability command: npm test -- sample
- Round 1: Falsifiability result: mutation failed
- Round 1: Falsifiability revision: fedcba0000000000000000000000000000000000
- Refactor verify command: npm test`,
        );
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

  it("does not require the current ATDD manifest from a pre-split E2E row", async () => {
    await withProject(async (root) => {
      const pointer =
        "RED fail / GREEN pass — Pre-split-evidence: implement; evidence at `.qfai/evidence/implement-spec-0001.md#tdd-0001`";
      const evidence = completeEntry("E2E").replace(
        /^- Round 1: RED test (?:hash|manifest):.*\n/gm,
        "",
      );
      const codes = await runOn(
        root,
        ledger([{ status: "done", evidence: pointer, layer: "E2E" }]),
        { ".qfai/evidence/implement-spec-0001.md": evidence },
      );
      expect(codes).not.toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
    });
  });

  /**
   * A manifest entry that is not a file addresses nothing stable.
   *
   * A directory hashed as an empty byte string never moved, so every fixture,
   * snapshot and helper under it could be rewritten while the recorded RED test
   * hash still recomputed. `legacyRecord` below reproduces exactly what the
   * validator used to compute, so the case fails only because the manifest
   * contract now names files.
   */
  async function manifestArtifacts(root: string): Promise<{
    fileRecord: string;
    mode: (target: string) => Promise<string>;
  }> {
    const mode = async (target: string): Promise<string> =>
      ((await lstat(target)).mode & 0o777).toString(8).padStart(3, "0");
    const testPath = path.join(root, TEST_FILE);
    await mkdir(path.dirname(testPath), { recursive: true });
    await writeFile(testPath, "// test\n", "utf-8");
    const fileRecord = `${TEST_FILE}\0file\0${await mode(testPath)}\0${digest(
      await readFile(testPath),
    )}`;
    return { fileRecord, mode };
  }

  function fencedManifest(paths: readonly string[]): string {
    return `${[
      "- Round 1: RED test manifest:",
      "",
      "  ```",
      ...paths.map((entry) => `  ${entry}`),
      "  ```",
    ].join("\n")}\n`;
  }

  it("rejects a RED test manifest entry that names a directory", async () => {
    await withProject(async (root) => {
      const { fileRecord, mode } = await manifestArtifacts(root);
      const fixtureDir = path.join(root, "tests", "fixtures");
      await mkdir(fixtureDir, { recursive: true });
      await writeFile(path.join(fixtureDir, "data.json"), "{}\n", "utf-8");
      const legacyRecord = `tests/fixtures\0dir\0${await mode(fixtureDir)}\0${digest(
        Buffer.alloc(0),
      )}`;
      const evidence = completeEntry("Integration")
        .replace("{{RED_TEST_HASH}}", digest([legacyRecord, fileRecord].join("\n")))
        .replace(
          `- Round 1: RED test manifest: ${TEST_FILE}\n`,
          fencedManifest(["tests/fixtures", TEST_FILE]),
        );
      await runOn(
        root,
        ledger([{ status: "done", evidence: ATDD_POINTER, layer: "Integration" }]),
        {
          ".qfai/evidence/atdd-spec-0001.md": evidence,
        },
      );
      const issues = await validateTddList(root, defaultConfig);
      const found = issues.find((i) => i.code === "TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
      expect(found?.message).toContain("valid RED test manifest");
    });
  });

  // Windows: the case needs a real symlink, which needs elevation there.
  it.skipIf(process.platform === "win32")(
    "rejects a RED test manifest entry reached through a symlinked parent",
    async () => {
      await withProject(async (root) => {
        const { fileRecord, mode } = await manifestArtifacts(root);
        const outside = path.join(root, "outside");
        await mkdir(outside, { recursive: true });
        await writeFile(path.join(outside, "data.json"), "{}\n", "utf-8");
        await mkdir(path.join(root, "tests"), { recursive: true });
        await symlink(outside, path.join(root, "tests", "fixtures"), "dir");
        const linked = path.join(root, "tests", "fixtures", "data.json");
        const legacyRecord = `tests/fixtures/data.json\0file\0${await mode(linked)}\0${digest(
          await readFile(linked),
        )}`;
        const evidence = completeEntry("Integration")
          .replace("{{RED_TEST_HASH}}", digest([fileRecord, legacyRecord].join("\n")))
          .replace(
            `- Round 1: RED test manifest: ${TEST_FILE}\n`,
            fencedManifest([TEST_FILE, "tests/fixtures/data.json"]),
          );
        await runOn(
          root,
          ledger([{ status: "done", evidence: ATDD_POINTER, layer: "Integration" }]),
          { ".qfai/evidence/atdd-spec-0001.md": evidence },
        );
        const issues = await validateTddList(root, defaultConfig);
        const found = issues.find((i) => i.code === "TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
        expect(found?.message).toContain("valid RED test manifest");
      });
    },
  );

  for (const wrapper of ["fence", "comment"] as const) {
    it(`rejects a reviewer PASS hidden in a ${wrapper}`, async () => {
      await withProject(async (root) => {
        const codes = await runOn(
          root,
          ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]),
          { ".qfai/evidence/implement-spec-0001.md": completeEntry("Unit") },
          { hiddenVerdictRole: "completion-reviewer", hiddenVerdictWrapper: wrapper },
        );
        expect(codes).toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
      });
    });
  }

  it("rejects a second visible Result line beside the PASS", async () => {
    await withProject(async (root) => {
      const codes = await runOn(
        root,
        ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]),
        { ".qfai/evidence/implement-spec-0001.md": completeEntry("Unit") },
        { hiddenVerdictRole: "completion-reviewer", hiddenVerdictWrapper: "duplicate" },
      );
      expect(codes).toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
    });
  });

  // The review pack is local-only, so on a fresh clone nothing else looks at
  // the revision at all: the committed evidence has to carry a form that names
  // a tree, or item 10 verifies against nothing.
  it("rejects a committed revision that names no tree when no pack is present", async () => {
    await withProject(async (root) => {
      const evidence = completeEntry("Unit").replaceAll(DEFAULT_REVISION, "abc123");
      await runOn(
        root,
        ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]),
        { ".qfai/evidence/implement-spec-0001.md": evidence },
        { omitReviewPacks: true, revision: "abc123" },
      );
      const issues = await validateTddList(root, defaultConfig);
      const found = issues.find((i) => i.code === "TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
      expect(found?.message).toContain("Revision naming a git rev or working-tree+<sha256>");
    });
  });

  it("accepts a working-tree content hash as a revision", async () => {
    await withProject(async (root) => {
      const workingTree = `working-tree+${"a".repeat(64)}`;
      const evidence = completeEntry("Unit").replaceAll(DEFAULT_REVISION, workingTree);
      const codes = await runOn(
        root,
        ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]),
        { ".qfai/evidence/implement-spec-0001.md": evidence },
        { revision: workingTree },
      );
      expect(codes).not.toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
    });
  });

  it("does not also report a missing anchor when the pointer resolves", async () => {
    await withProject(async (root) => {
      const codes = await runOn(root, ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]), {
        ".qfai/evidence/implement-spec-0001.md": completeEntry("Unit"),
      });
      expect(codes).not.toContain("TDDLIST_EVIDENCE_ANCHOR_MISSING");
    });
  });
});

describe("TDDLIST_EVIDENCE_ANCHOR_MISSING", () => {
  const OUTCOME_ONLY =
    "RED: `npx vitest run tests/unit/sample.test.ts` -> 1 failed. GREEN: 1 passed";

  it("warns on a done row whose Evidence carries no anchor", async () => {
    await withProject(async (root) => {
      const codes = await runOn(root, ledger([{ status: "done", evidence: OUTCOME_ONLY }]));
      expect(codes).toContain("TDDLIST_EVIDENCE_ANCHOR_MISSING");
      const issues = await validateTddList(root, defaultConfig);
      const found = issues.find((i) => i.code === "TDDLIST_EVIDENCE_ANCHOR_MISSING");
      expect(found?.severity).toBe("warning");
      expect(found?.rule).toBe("TDDLIST-007");
    });
  });

  // A row mid-cycle has not claimed completion yet, and the pointer is written
  // together with the evidence entry the completion gate reads.
  for (const status of ["green", "refactor", "review-fix"]) {
    it(`stays silent at Status=${status}`, async () => {
      await withProject(async (root) => {
        const codes = await runOn(root, ledger([{ status, evidence: OUTCOME_ONLY }]));
        expect(codes).not.toContain("TDDLIST_EVIDENCE_ANCHOR_MISSING");
      });
    });
  }

  // A malformed pointer is already an error; reporting the absence of an anchor
  // on top of it would name the same gap twice.
  it("stays silent when a malformed pointer is already reported", async () => {
    await withProject(async (root) => {
      const codes = await runOn(
        root,
        ledger([{ status: "done", evidence: "evidence at ./notes/run.md" }]),
      );
      expect(codes).toContain("TDDLIST_EVIDENCE_ANCHOR_UNRESOLVED");
      expect(codes).not.toContain("TDDLIST_EVIDENCE_ANCHOR_MISSING");
    });
  });
});
