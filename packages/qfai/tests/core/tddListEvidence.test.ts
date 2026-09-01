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

import { createHash } from "node:crypto";
import { chmod, lstat, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
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

/**
 * The subject minus `Round N: reviewer verdict` — the one field the completion
 * reviewers write inside a round block, after they have read it, so what they
 * hashed never contained it. A fenced verdict owns its fence lines too.
 */
function withoutReviewerVerdicts(text: string): string {
  const lines = text.split("\n");
  const kept: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const verdict = /^\s*(?:- )?(?:Round[ \t]+\d+:[ \t]*)?reviewer verdict[ \t]*:[ \t]*(.*)$/i.exec(
      lines[index] ?? "",
    );
    if (verdict === null) {
      kept.push(lines[index] ?? "");
      continue;
    }
    if ((verdict[1] ?? "").trim().length > 0) continue;
    let cursor = index + 1;
    while (cursor < lines.length && (lines[cursor] ?? "").trim().length === 0) cursor += 1;
    if (!/^\s*```/.test(lines[cursor] ?? "")) continue;
    for (cursor += 1; cursor < lines.length; cursor += 1) {
      if (/^\s*```\s*$/.test(lines[cursor] ?? "")) break;
    }
    index = Math.min(cursor, lines.length - 1);
  }
  return kept.join("\n");
}

const COVERAGE_DEPTH_PATH = ".qfai/evidence/coverage-depth-spec-0001.md";

/**
 * The Coverage Depth Matrix record the completion subject carries beside the
 * evidence section: the matrix rows whose obligation cell equals the row's
 * obligation, and the justification paragraphs whose first line names it.
 */
function coverageDepthRecord(matrix: string | undefined, obligation = "TC-0001"): string | null {
  if (matrix === undefined) return null;
  const lines = matrix.replace(/\r\n/g, "\n").split("\n");
  const kept: string[] = [];
  // The ledger's own tokenizer and casing: comma, semicolon or whitespace, then
  // a canonical upper case. Splitting on commas alone and comparing exactly is
  // what dropped `TC-0001; TC-0002` and `tc-0001` out of the audited slice.
  for (const id of obligation
    .trim()
    .split(/[,;\s]+/)
    .filter((token) => token.length > 0)
    .map((token) => token.toUpperCase())) {
    const names = new RegExp(`(?<![0-9A-Za-z-])${id}(?![0-9A-Za-z-])`, "i");
    let index = 0;
    while (index < lines.length) {
      const line = lines[index] ?? "";
      if (line.trim().length === 0) {
        index += 1;
        continue;
      }
      if (line.trimStart().startsWith("|")) {
        if (
          line
            .replace(/^\s*\|/, "")
            .split("|")[0]
            ?.trim()
            .toUpperCase() === id
        )
          kept.push(line);
        index += 1;
        continue;
      }
      let end = index;
      while (
        end < lines.length &&
        (lines[end] ?? "").trim().length > 0 &&
        !(lines[end] ?? "").trimStart().startsWith("|")
      ) {
        end += 1;
      }
      if (names.test(line)) kept.push(...lines.slice(index, end));
      index = end;
    }
  }
  const slice = kept.join("\n");
  return slice.trim().length === 0
    ? null
    : `${COVERAGE_DEPTH_PATH}\0${digest(normalizeArtifact(slice))}`;
}

function phaseAuditHash(
  evidenceFile: string,
  content: string,
  tddId = "TDD-0001",
  matrixRecord: string | null = null,
): string {
  const after = content.split(new RegExp(`^### ${tddId}\\s*$`, "m"))[1] ?? "";
  // Stop at the next entry heading, so a file that carries an editing item
  // beside the consumer hashes each entry over its own lines.
  const section = after.split(/^#{1,3} /m)[0] ?? "";
  const authored =
    section.split(
      /^\s*(?:\|\s*)?(?:- )?(?:Spec review|Spec audited|Code quality review|Code quality audited|Prototype parity|Checkpoint verification)/m,
    )[0] ?? "";
  const artifact = normalizeArtifact(withoutReviewerVerdicts(`### ${tddId}\n${authored}`));
  const records = [`${evidenceFile}\0${digest(artifact)}`];
  if (matrixRecord !== null) records.push(matrixRecord);
  records.sort();
  return digest(records.join("\n"));
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
  /**
   * The Coverage Depth Matrix the reviewers audited, when the entry's hashes
   * are meant to cover it. Omit it to hash the evidence section alone — which
   * is what a matrix added or edited after the PASS looks like.
   */
  coverageDepthMatrix?: string;
  /**
   * The obligation the row and its evidence carry, when it is not the default
   * `TC-0001`. The ledger accepts semicolon- and whitespace-separated tokens
   * and any case, so the audited slice has to read the cell the same way.
   */
  obligationValue?: string;
  /**
   * The stage review pack a zero-row `coverage-depth-spec-NNNN.md` seals.
   * `"absent"` records a seal over a pack that is then removed: the fresh-clone
   * shape, where nothing in the repository can contradict the recorded digest.
   */
  stagePack?: "present" | "absent";
  /**
   * How the stage pack fails to be this stage's own P8 verdict. Each shape
   * still seals: the recorded digest recomputes over the directory exactly as
   * written, which is why the seal alone never settled the question.
   */
  stagePackDefect?:
    | "summary-only"
    | "other-spec"
    | "row-pack"
    | "revise"
    | "no-audited-hash"
    | "reviewer-revise"
    | "second-response-revise";
  /**
   * Write a SECOND response for this role into each item review pack
   * (`R02_<role>.md`), answering `REVISE`. The layout numbers responses per
   * reviewer, so this is a legal pack — and one whose round is not resolved.
   */
  secondResponseRole?: string;
  /** Where the spec pack lives, when the project moved `paths.specsDir`. */
  specsDir?: string;
}

const STAGE_PACK_PATH = ".qfai/review/review-20260811000000005";

/**
 * The P8 pack a zero-row stage's `## Final status` names.
 *
 * The stage reviewer is `completion-reviewer` judging a stage rather than a
 * row, so the pack is the ordinary layout — request, one response per reviewer,
 * `summary.json` — scoped to the stage's own spec and naming no `TDD-ID`.
 * `stagePackDefect` writes the shapes that seal perfectly well and are still
 * not this stage's verdict.
 */
async function writeStagePack(root: string, options: EvidenceOptions): Promise<void> {
  const packDir = path.join(root, STAGE_PACK_PATH);
  await mkdir(packDir, { recursive: true });
  const revision = options.revision ?? DEFAULT_REVISION;
  if (options.stagePackDefect === "summary-only") {
    await writeFile(
      path.join(packDir, "summary.json"),
      `${JSON.stringify({ overall_status: "PASS" }, null, 2)}\n`,
      "utf-8",
    );
    return;
  }
  await writeFile(
    path.join(packDir, "review_request.md"),
    options.stagePackDefect === "row-pack"
      ? "# Stage review request\n\nTDD-ID: TDD-0001\n"
      : "# Stage review request\n\nScope: spec-0001 completion\n",
    "utf-8",
  );
  const auditedHash =
    options.stagePackDefect === "no-audited-hash"
      ? ""
      : `Audited evidence hash: ${"c".repeat(64)}\n`;
  await writeFile(
    path.join(packDir, `R01_completion-reviewer.md`),
    `Result: ${options.stagePackDefect === "revise" ? "REVISE" : "PASS"}\nReviewed revision: ${revision}\n${auditedHash}`,
    "utf-8",
  );
  if (options.stagePackDefect === "second-response-revise") {
    await writeFile(
      path.join(packDir, `R02_completion-reviewer.md`),
      `Result: REVISE\nReviewed revision: ${revision}\n${auditedHash}`,
      "utf-8",
    );
  }
  await writeFile(
    path.join(packDir, "summary.json"),
    `${JSON.stringify(
      {
        overall_status: "PASS",
        revision,
        target: {
          kind: "spec",
          path:
            options.stagePackDefect === "other-spec"
              ? ".qfai/specs/spec-0002"
              : ".qfai/specs/spec-0001",
        },
        reviewers: [
          {
            reviewer: "completion-reviewer",
            status: options.stagePackDefect === "reviewer-revise" ? "FAIL" : "PASS",
          },
        ],
      },
      null,
      2,
    )}\n`,
    "utf-8",
  );
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
  // Git's mode, mirroring `artifactRecord`: the raw permission bits made the
  // record depend on the writing machine's umask.
  const redHash = digest(
    `${TEST_FILE}\0file\0${(metadata.mode & 0o111) === 0 ? "100644" : "100755"}\0${testBlob}`,
  );
  let content = rawContent.replaceAll("{{RED_TEST_HASH}}", redHash);
  const matrixRecord = coverageDepthRecord(options.coverageDepthMatrix, options.obligationValue);
  const auditHash = phaseAuditHash(evidenceFile, content, "TDD-0001", matrixRecord);
  content = content.replaceAll(
    "{{EDITING_AUDIT_HASH}}",
    phaseAuditHash(evidenceFile, content, "TDD-0002", matrixRecord),
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
    if (options.secondResponseRole === role) {
      await writeFile(
        path.join(packDir, `R02_${role}.md`),
        `Result: REVISE\nReviewed revision: ${revision}\nAudited evidence hash: ${auditHash}\n`,
        "utf8",
      );
    }
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
  if (options.stagePack !== undefined) {
    content = content.replaceAll("{{STAGE_PACK_SEAL}}", await packSeal(root, STAGE_PACK_PATH));
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

type Row = {
  status: string;
  evidence: string;
  tddId?: string;
  /** Defaults to `Unit`; the ATDD-owned layers pick a different evidence file. */
  layer?: string;
  testFile?: string;
  selector?: string;
  tcRefs?: string;
  usRefs?: string;
  conApiRefs?: string;
};

function ledger(rows: Row[]): string {
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

/**
 * Seeds a project whose ledger is `testList`.
 *
 * `extraTestFiles` exists for a row whose `Test file` is not `TEST_FILE`;
 * `evidenceFiles` and `options` seed the durable evidence records, the stage
 * pack and the review packs the anchor checks resolve against.
 */
async function seedProject(
  root: string,
  testList: string,
  extraTestFiles: string[] = [],
  evidenceFiles: Readonly<Record<string, string>> = {},
  options: EvidenceOptions = {},
): Promise<void> {
  const specsDir = options.specsDir ?? ".qfai/specs";
  const specDir = path.join(root, ...specsDir.split("/"), "spec-0001");
  await mkdir(path.join(specDir, "tdd"), { recursive: true });
  await mkdir(path.join(root, ...specsDir.split("/"), "_policies"), { recursive: true });
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
  if (options.stagePack !== undefined) await writeStagePack(root, options);
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
  if (options.stagePack === "absent") {
    await rm(path.join(root, STAGE_PACK_PATH), { recursive: true, force: true });
  }
}

async function runOn(
  root: string,
  testList: string,
  evidenceFiles: Readonly<Record<string, string>> = {},
  options: EvidenceOptions = {},
): Promise<string[]> {
  return (await runIssuesOn(root, testList, evidenceFiles, options)).map((issue) => issue.code);
}

async function runIssuesOn(
  root: string,
  testList: string,
  evidenceFiles: Readonly<Record<string, string>> = {},
  options: EvidenceOptions = {},
): Promise<Array<{ code: string; message: string }>> {
  await seedProject(root, testList, [], evidenceFiles, options);
  const issues = await validateTddList(root, defaultConfig);
  return issues.map((i) => ({ code: i.code, message: i.message }));
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

// The two anchor rules read a ledger cell nothing read before them, so on the
// release that introduces them every ledger written under the old shape meets
// them at once — this repository's own `qfai validate` went to 29 errors, all
// on rows already at `done`. That is the latched-gate shape P7 exists to stop,
// so both ship behind a window, and these are the tests that keep them there.
describe.each([
  {
    code: "QFAI-TDDLIST-007" as const,
    promotion: RULE_PROMOTIONS.tddListEvidenceAnchorMissing.promoteAt,
    // A completed row whose Evidence states an outcome in prose: no pointer.
    evidence: "RED: `npx vitest run tests/unit/sample.test.ts` -> 1 failed. GREEN: 1 passed",
  },
  {
    code: "QFAI-TDDLIST-008" as const,
    promotion: RULE_PROMOTIONS.tddListEvidenceAnchorUnresolved.promoteAt,
    // A pointer that is not the canonical evidence anchor shape.
    evidence: "evidence at ./notes/run.md",
  },
])("$code promotion window", ({ code, promotion, evidence }) => {
  async function severityAt(version: string): Promise<{ severity: string; message: string }> {
    toolVersion.override = version;
    let found: { severity: string; message: string } = { severity: "", message: "" };
    await withProject(async (root) => {
      await runOn(root, ledger([{ status: "done", evidence }]));
      const issues = await validateTddList(root, defaultConfig);
      const issue = issues.find((i) => i.code === code);
      if (issue) found = { severity: issue.severity, message: issue.message };
    });
    return found;
  }

  it("reports a warning before the promotion release, naming the release", async () => {
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

describe("QFAI-TDDLIST-008", () => {
  const IMPLEMENT_POINTER =
    "RED fail / GREEN pass — evidence at `.qfai/evidence/implement-spec-0001.md#tdd-0001`";

  function completeEntry(
    layer: "Unit" | "Integration" | "API" | "E2E",
    obligationValue?: string,
  ): string {
    const obligation =
      layer === "E2E"
        ? "US-ref: US-0001"
        : layer === "API"
          ? "CON-API-ref: CON-API-0001"
          : `TC-ref: ${obligationValue ?? "TC-0001"}`;
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
- Oracle proof: equivalent-mutant — TC-0001 permits any non-empty result
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
      expect(codes).toContain("QFAI-TDDLIST-008");
    });
  });

  it("errors when the evidence file has no matching heading", async () => {
    await withProject(async (root) => {
      const codes = await runOn(root, ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]), {
        ".qfai/evidence/implement-spec-0001.md": "# Evidence\n\n### TDD-0002\n",
      });
      expect(codes).toContain("QFAI-TDDLIST-008");
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
        expect(codes).toContain("QFAI-TDDLIST-008");
      });
    });
  }

  it("accepts an anchor that resolves to the row's evidence heading", async () => {
    await withProject(async (root) => {
      const codes = await runOn(root, ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]), {
        ".qfai/evidence/implement-spec-0001.md": completeEntry("Unit"),
      });
      expect(codes).not.toContain("QFAI-TDDLIST-008");
    });
  });

  // A command record and a result record each say two things at once — what ran
  // and what happened, what happened and what it ran over — and reading either
  // half as the other is the whole of this group.
  describe("a command or result is read for its outcome, not its words", () => {
    // The negation used to have to lead. `npm test` matched the runner, the
    // sentence said the run never happened, and the row closed on it.
    for (const negated of [
      "npm test was not run",
      "we did not run npm test",
      "npm test — never run",
      "npm test wasn't run",
    ]) {
      it(`rejects a GREEN command that says it was not run: "${negated}"`, async () => {
        await withProject(async (root) => {
          const codes = await runOn(
            root,
            ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]),
            {
              ".qfai/evidence/implement-spec-0001.md": completeEntry("Unit").replace(
                "Round 1: GREEN command: npm test",
                `Round 1: GREEN command: ${negated}`,
              ),
            },
          );
          expect(codes).toContain("QFAI-TDDLIST-008");
        });
      });
    }

    // `exit 0` and `passed` are both true of a run that matched no test at all,
    // so a mistyped selector cleared the GREEN half of the gate having executed
    // nothing.
    for (const empty of [
      "0 tests passed",
      "exit 0 (0 tests)",
      "PASS — no tests ran",
      "exit 0, no test files found",
    ]) {
      it(`rejects a GREEN result that ran nothing: "${empty}"`, async () => {
        await withProject(async (root) => {
          const codes = await runOn(
            root,
            ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]),
            {
              ".qfai/evidence/implement-spec-0001.md": completeEntry("Unit").replace(
                "Round 1: GREEN result: 1 passed",
                `Round 1: GREEN result: ${empty}`,
              ),
            },
          );
          expect(codes).toContain("QFAI-TDDLIST-008");
        });
      });
    }

    // Over-rejection pins for the zero-run check: a summary that reports zero
    // *failures* still ran, and a two-digit count must not read as a leading 0.
    for (const real of ["PASS 0 failed, 12 passed", "PASS 10 tests passed", "PASS 100 passed"]) {
      it(`accepts a GREEN result that did run: "${real}"`, async () => {
        await withProject(async (root) => {
          const codes = await runOn(
            root,
            ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]),
            {
              ".qfai/evidence/implement-spec-0001.md": completeEntry("Unit").replace(
                "Round 1: GREEN result: 1 passed",
                `Round 1: GREEN result: ${real}`,
              ),
            },
          );
          expect(codes).not.toContain("QFAI-TDDLIST-008");
        });
      });
    }

    // Round numbers are deduped through a `Set` and every field reader takes the
    // last occurrence for its round, so a second partial `Round 1` composed one
    // synthetic round from two blocks — the restated GREEN from the new block,
    // the omitted RED and revision from the old — and opened no round at all.
    it("rejects a second block bearing a round number already used", async () => {
      await withProject(async (root) => {
        const issues = await runIssuesOn(
          root,
          ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]),
          {
            ".qfai/evidence/implement-spec-0001.md": completeEntry("Unit").replace(
              "- Round 1: GREEN result: 1 passed",
              [
                "- Round 1: GREEN result: 1 failed",
                "- Round 1: GREEN command: npm test",
                "- Round 1: GREEN result: 1 passed",
              ].join("\n"),
            ),
          },
        );
        expect(
          issues.some(
            ({ code, message }) =>
              code === "QFAI-TDDLIST-008" && message.includes("exactly one GREEN result"),
          ),
        ).toBe(true);
      });
    });

    // The other direction: a real command whose path merely contains a word the
    // negation list uses must still count as executed.
    it("accepts a GREEN command whose test path is named after a skip", async () => {
      await withProject(async (root) => {
        const codes = await runOn(root, ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]), {
          ".qfai/evidence/implement-spec-0001.md": completeEntry("Unit").replace(
            "Round 1: GREEN command: npm test",
            "Round 1: GREEN command: npx vitest run tests/skipped-cases.test.ts",
          ),
        });
        expect(codes).not.toContain("QFAI-TDDLIST-008");
      });
    });

    // RED has to have been observed failing. A passing run over a file whose
    // NAME contains `error` matched the failure scan and was accepted as one.
    it("rejects a RED result that passed over a file named after errors", async () => {
      await withProject(async (root) => {
        const codes = await runOn(root, ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]), {
          ".qfai/evidence/implement-spec-0001.md": completeEntry("Unit").replace(
            "Round 1: RED result: 1 failed",
            "Round 1: RED result: PASS tests/error-handler.test.ts (1 passed)",
          ),
        });
        expect(codes).toContain("QFAI-TDDLIST-008");
      });
    });

    // And the same word, the same file, on the side that really did pass.
    it("accepts a GREEN result that passed over a file named after errors", async () => {
      await withProject(async (root) => {
        const codes = await runOn(root, ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]), {
          ".qfai/evidence/implement-spec-0001.md": completeEntry("Unit").replace(
            "Round 1: GREEN result: 1 passed",
            "Round 1: GREEN result: PASS tests/error-handler.test.ts (1 passed)",
          ),
        });
        expect(codes).not.toContain("QFAI-TDDLIST-008");
      });
    });

    // The over-removal this must not become: a slash inside a count is not a
    // path, and the failure it reports has to survive.
    it("still reads a failure reported beside a slash-separated count", async () => {
      await withProject(async (root) => {
        const codes = await runOn(root, ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]), {
          ".qfai/evidence/implement-spec-0001.md": completeEntry("Unit").replace(
            "Round 1: GREEN result: 1 passed",
            "Round 1: GREEN result: 1 failed/2 passed",
          ),
        });
        expect(codes).toContain("QFAI-TDDLIST-008");
      });
    });
  });

  // One reviewer, one verdict. `R02_<role>.md` is a legal file name in the pack
  // layout, so a second answer from the same reviewer is a verdict the round
  // has not settled — and `summary.json` records one PASS line per reviewer
  // whatever the responses say.
  it("rejects an item pack whose second response from one reviewer is REVISE", async () => {
    await withProject(async (root) => {
      const codes = await runOn(
        root,
        ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]),
        { ".qfai/evidence/implement-spec-0001.md": completeEntry("Unit") },
        { secondResponseRole: "completion-reviewer" },
      );
      expect(codes).toContain("QFAI-TDDLIST-008");
    });
  });

  // The pack target is the spec directory the ledger was actually found in.
  // Spelling `.qfai/specs` here contradicted the walk that produced the row, so
  // a project that moved `paths.specsDir` could not resolve any completed row.
  it("resolves a pack whose target names the configured specs directory", async () => {
    await withProject(async (root) => {
      const options = {
        specsDir: "workspace/specs",
        summaryTargetPath: "workspace/specs/spec-0001",
      } as const;
      await seedProject(
        root,
        ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]),
        [],
        { ".qfai/evidence/implement-spec-0001.md": completeEntry("Unit") },
        options,
      );
      const issues = await validateTddList(root, {
        ...defaultConfig,
        paths: { ...defaultConfig.paths, specsDir: options.specsDir },
      });
      expect(issues.map((i) => i.code)).not.toContain("QFAI-TDDLIST-008");
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
        expect(codes).toContain("QFAI-TDDLIST-008");
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
        expect(codes).toContain("QFAI-TDDLIST-008");
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
        expect(codes).toContain("QFAI-TDDLIST-008");
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
      expect(codes).not.toContain("QFAI-TDDLIST-008");
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
      expect(codes).toContain("QFAI-TDDLIST-008");
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
      expect(codes).toContain("QFAI-TDDLIST-008");
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
      expect(codes).toContain("QFAI-TDDLIST-008");
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
        expect(codes).toContain("QFAI-TDDLIST-008");
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
        expect(codes).toContain("QFAI-TDDLIST-008");
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
      expect(codes).toContain("QFAI-TDDLIST-008");
    });
  });

  it("accepts a second round opened by the first round's REVISE verdict", async () => {
    // The verdict that opens round 2 is required (a round may only be opened by
    // a `REVISE`) and is written by the completion reviewers after they read the
    // block, so it is outside the subject they hash. Recomputing over the raw
    // prefix put their own line back in, and every row that legitimately went
    // review-fix -> Round 2 reported as unresolved however correct it was.
    await withProject(async (root) => {
      const secondRoundRevision = "bcd1230000000000000000000000000000000000";
      const evidence = completeEntry("Unit")
        .replace(
          "- Refactor verify command: npm test",
          `- Round 1: reviewer verdict: REVISE — needs new production behaviour
- Round 2: Revision: ${secondRoundRevision}
- Round 2: RED revision: def7890000000000000000000000000000000000
- Round 2: RED command: npm test
- Round 2: RED result: 1 failed
- Round 2: GREEN command: npm test
- Round 2: GREEN result: 1 passed
- Refactor verify command: npm test`,
        )
        .replaceAll(
          "reviewed revision: abc1230000000000000000000000000000000000",
          `reviewed revision: ${secondRoundRevision}`,
        );
      const codes = await runOn(
        root,
        ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]),
        { ".qfai/evidence/implement-spec-0001.md": evidence },
        { revision: secondRoundRevision },
      );
      expect(codes).not.toContain("QFAI-TDDLIST-008");
    });
  });

  it("keeps a fenced reviewer verdict out of the audited subject", async () => {
    await withProject(async (root) => {
      const secondRoundRevision = "bcd1230000000000000000000000000000000000";
      const evidence = completeEntry("Unit")
        .replace(
          "- Refactor verify command: npm test",
          `- Round 1: reviewer verdict:
\`\`\`text
REVISE — needs new production behaviour
\`\`\`
- Round 2: Revision: ${secondRoundRevision}
- Round 2: RED revision: def7890000000000000000000000000000000000
- Round 2: RED command: npm test
- Round 2: RED result: 1 failed
- Round 2: GREEN command: npm test
- Round 2: GREEN result: 1 passed
- Refactor verify command: npm test`,
        )
        .replaceAll(
          "reviewed revision: abc1230000000000000000000000000000000000",
          `reviewed revision: ${secondRoundRevision}`,
        );
      const codes = await runOn(
        root,
        ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]),
        { ".qfai/evidence/implement-spec-0001.md": evidence },
        { revision: secondRoundRevision },
      );
      expect(codes).not.toContain("QFAI-TDDLIST-008");
    });
  });

  for (const [parity, expected] of [
    ["PASS", false],
    ["REVISE", true],
  ] as const) {
    it(`${expected ? "rejects" : "accepts"} a completed entry with Prototype parity ${parity}`, async () => {
      // Gate item 9 makes a UI-affecting row's completion conditional on the
      // product-surface-reviewer's PASS. Reading only the other three verdicts
      // let a row whose parity said `REVISE` reach `done` on a full field set.
      await withProject(async (root) => {
        const evidence = completeEntry("Unit").replace(
          "- Checkpoint verification command: npm test",
          `- Prototype parity: ${parity}\n- Checkpoint verification command: npm test`,
        );
        const codes = await runOn(root, ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]), {
          ".qfai/evidence/implement-spec-0001.md": evidence,
        });
        expect(codes.includes("QFAI-TDDLIST-008")).toBe(expected);
      });
    });
  }

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
        expect(codes).toContain("QFAI-TDDLIST-008");
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
      expect(codes).toContain("QFAI-TDDLIST-008");
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
      expect(codes).not.toContain("QFAI-TDDLIST-008");
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
      expect(codes).toContain("QFAI-TDDLIST-008");
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
        expect(codes).toContain("QFAI-TDDLIST-008");
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
      expect(codes).toContain("QFAI-TDDLIST-008");
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
      expect(codes).toContain("QFAI-TDDLIST-008");
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
      expect(codes).not.toContain("QFAI-TDDLIST-008");
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

  const EDITING_POINTER =
    "RED fail / GREEN pass — evidence at `.qfai/evidence/atdd-spec-0001.md#tdd-0002`";

  /**
   * The consumer row and the editing row, both real ledger rows.
   *
   * The editing entry is only evidence because a reviewer closed *it*, so the
   * gate resolves it back to a `done` ledger row that points at that entry.
   * A second row is what makes that resolvable at all.
   */
  function reverifyLedger(): string {
    return ledger([
      { status: "done", evidence: ATDD_POINTER, layer: "Integration" },
      {
        status: "done",
        evidence: EDITING_POINTER,
        layer: "Integration",
        tddId: "TDD-0002",
        selector: "shared-fixture",
      },
    ]);
  }

  /**
   * The entry of the row that edited the shared artifact.
   *
   * The re-verify record sits in its **phase-authored** region — before the
   * gate fields — so the audit hash its reviewers recorded addresses those
   * bytes. That is what makes the record evidence rather than an assertion
   * anyone can append. The entry is otherwise a *complete* one: recomputing the
   * two hashes proves the record is inside what the reviewers read, not that
   * they accepted it, so the gate requires the whole completed-evidence
   * contract of the item it is trusting. Its review packs are deliberately
   * paths that do not exist — local-only packs are absent on a fresh clone, and
   * the committed provenance is what carries the entry there.
   */
  function editingEntry(
    options: { proofResult?: string; auditHash?: string; specVerdict?: string } = {},
  ): string {
    const record = `#### Shared-artifact re-verify

##### spec-0001/TDD-0001

${REVERIFY_FIELDS.replace("{{PROOF_RESULT}}", options.proofResult ?? "1 failed")}

- Spec review: ${options.specVerdict ?? "PASS"}`;
    return completeEntry("Integration")
      .replace("# Evidence\n\n", "\n")
      .replaceAll("TDD-0001", "TDD-0002")
      .replace("- Selector: sample", "- Selector: shared-fixture")
      .replace(
        "- Spec review pack: .qfai/review/review-20260811000000001",
        "- Spec review pack: .qfai/review/review-20260811000000003",
      )
      .replace(
        "- Code quality review pack: .qfai/review/review-20260811000000002",
        "- Code quality review pack: .qfai/review/review-20260811000000004",
      )
      .replace("{{SPEC_PACK_SEAL}}", "a".repeat(64))
      .replace("{{CODE_PACK_SEAL}}", "b".repeat(64))
      .replaceAll("{{AUDIT_HASH}}", options.auditHash ?? "{{EDITING_AUDIT_HASH}}")
      .replace("- Spec review: PASS", record);
  }

  function staleConsumerEntry(): string {
    return completeEntry("Integration").replace("{{RED_TEST_HASH}}", "f".repeat(64));
  }

  it("accepts a shared-artifact re-verify recorded in the editing item's audited entry", async () => {
    await withProject(async (root) => {
      const codes = await runOn(root, reverifyLedger(), {
        ".qfai/evidence/atdd-spec-0001.md": staleConsumerEntry().concat(editingEntry()),
      });
      expect(codes).not.toContain("QFAI-TDDLIST-008");
    });
  });

  // Recomputing the editing item's two audit hashes proves the record is
  // inside what its reviewers read — not that they accepted it. An entry
  // stopped at `REVISE` records the blocking reviewer's own hash over the same
  // subject, so the hashes agreed and an unfinished item cleared another row's
  // stale manifest.
  it("rejects a shared-artifact re-verify from an editing item stopped at REVISE", async () => {
    await withProject(async (root) => {
      const issues = await runIssuesOn(root, reverifyLedger(), {
        ".qfai/evidence/atdd-spec-0001.md": staleConsumerEntry().concat(
          editingEntry({ specVerdict: "REVISE — tighten the assertion" }),
        ),
      });
      expect(
        issues.some(
          ({ code, message }) =>
            code === "QFAI-TDDLIST-008" &&
            message.includes("TDD-0001") &&
            message.includes("RED test hash matching its manifest"),
        ),
      ).toBe(true);
    });
  });

  // The same entry, complete, but no ledger row owns it: a `### TDD-0002`
  // section nobody scheduled is an item no gate ever reads.
  it("rejects a shared-artifact re-verify from an entry no ledger row owns", async () => {
    await withProject(async (root) => {
      const issues = await runIssuesOn(
        root,
        ledger([{ status: "done", evidence: ATDD_POINTER, layer: "Integration" }]),
        { ".qfai/evidence/atdd-spec-0001.md": staleConsumerEntry().concat(editingEntry()) },
      );
      expect(
        issues.some(
          ({ code, message }) =>
            code === "QFAI-TDDLIST-008" &&
            message.includes("TDD-0001") &&
            message.includes("RED test hash matching its manifest"),
        ),
      ).toBe(true);
    });
  });

  // The record carried all nine permission bits, so the same tracked content
  // hashed differently under a different umask — `664` where the recording
  // machine had `644`, `666` on Windows — and every handed-over row went
  // unresolved for a difference Git does not store.
  const redHashInvalid = (issues: Array<{ code: string; message: string }>): boolean =>
    issues.some(
      ({ code, message }) =>
        code === "QFAI-TDDLIST-008" && message.includes("RED test hash matching its manifest"),
    );

  for (const [label, mode] of [
    ["a group-writable umask", 0o664],
    ["a read-only checkout", 0o444],
    ["the Windows-shaped mode", 0o666],
  ] as const) {
    it(`recomputes the RED test hash under ${label}`, async () => {
      await withProject(async (root) => {
        await seedProject(root, reverifyLedger(), [], {
          ".qfai/evidence/atdd-spec-0001.md": staleConsumerEntry().concat(editingEntry()),
        });
        // Only the permission bits move: same bytes, same executable bit.
        await chmod(path.join(root, TEST_FILE), mode);
        const issues = (await validateTddList(root, defaultConfig)).map((i) => ({
          code: i.code,
          message: i.message,
        }));
        expect(redHashInvalid(issues)).toBe(false);
      });
    });
  }

  // …and the one bit Git does track still moves the hash, so making the record
  // portable did not make it blind.
  it("stales the RED test hash when the executable bit changes", async () => {
    await withProject(async (root) => {
      await seedProject(root, reverifyLedger(), [], {
        ".qfai/evidence/atdd-spec-0001.md": staleConsumerEntry().concat(editingEntry()),
      });
      await chmod(path.join(root, TEST_FILE), 0o755);
      const issues = (await validateTddList(root, defaultConfig)).map((i) => ({
        code: i.code,
        message: i.message,
      }));
      expect(redHashInvalid(issues)).toBe(true);
    });
  });

  it("rejects a shared-artifact re-verify whose proof does not fail", async () => {
    await withProject(async (root) => {
      const codes = await runOn(root, reverifyLedger(), {
        ".qfai/evidence/atdd-spec-0001.md": staleConsumerEntry().concat(
          editingEntry({ proofResult: "PASS" }),
        ),
      });
      expect(codes).toContain("QFAI-TDDLIST-008");
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
      expect(codes).toContain("QFAI-TDDLIST-008");
    });
  });

  it("rejects a shared-artifact re-verify the editing item's audit hash no longer matches", async () => {
    await withProject(async (root) => {
      const codes = await runOn(root, reverifyLedger(), {
        ".qfai/evidence/atdd-spec-0001.md": staleConsumerEntry().concat(
          editingEntry({ auditHash: "e".repeat(64) }),
        ),
      });
      expect(codes).toContain("QFAI-TDDLIST-008");
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
      expect(codes).toContain("QFAI-TDDLIST-008");
    });
  });

  /**
   * A zero-row ATDD stage owns no item entry, so its `## Final status` seal is
   * what stands in for one. `qfai-atdd/references/shared-test-artifacts.md`
   * reads the block only while that seal "still recomputes" from the pack.
   */
  function stageEvidence(): string {
    return `# Coverage depth

## Shared-artifact re-verify

### spec-0001/TDD-0001

${REVERIFY_FIELDS.replace("{{PROOF_RESULT}}", "1 failed")}

## Final status

- Review pack: ${STAGE_PACK_PATH}
- Review pack seal: {{STAGE_PACK_SEAL}}
`;
  }

  it("accepts a shared-artifact re-verify a sealed stage status carries", async () => {
    await withProject(async (root) => {
      const codes = await runOn(
        root,
        ledger([{ status: "done", evidence: ATDD_POINTER, layer: "Integration" }]),
        {
          [COVERAGE_DEPTH_PATH]: stageEvidence(),
          ".qfai/evidence/atdd-spec-0001.md": staleConsumerEntry(),
        },
        { stagePack: "present" },
      );
      expect(codes).not.toContain("QFAI-TDDLIST-008");
    });
  });

  // A stage records only a path and a digest — no committed hash over committed
  // evidence, the way an item entry does. With the pack gone, nothing in the
  // repository can contradict either, so a canonical-looking path, any 64 hex
  // digits and a hand-written block cleared a stale RED hash on every clone but
  // the author's.
  it("rejects a stage re-verify whose recorded review pack is absent", async () => {
    await withProject(async (root) => {
      const codes = await runOn(
        root,
        ledger([{ status: "done", evidence: ATDD_POINTER, layer: "Integration" }]),
        {
          [COVERAGE_DEPTH_PATH]: stageEvidence(),
          ".qfai/evidence/atdd-spec-0001.md": staleConsumerEntry(),
        },
        { stagePack: "absent" },
      );
      expect(codes).toContain("QFAI-TDDLIST-008");
    });
  });

  // A seal says the named directory has not been edited since it was recorded.
  // It says nothing about what the directory is about — so any unmodified
  // canonical pack in the repository was interchangeable with this stage's own
  // P8 verdict, and a hand-written re-verify block plus somebody else's digest
  // cleared a stale RED manifest. `qfai-atdd/SKILL.md` asks the gate to check
  // that `## Final status` says what that pack says.
  for (const [label, defect] of [
    ["a bare overall_status with no request or response", "summary-only"],
    ["a target naming another spec", "other-spec"],
    ["a row pack, whose request names a TDD-ID", "row-pack"],
    ["a stage reviewer who answered REVISE", "revise"],
    ["a response carrying no Audited evidence hash", "no-audited-hash"],
    ["a summary recording the stage reviewer as FAIL", "reviewer-revise"],
    // `R02_completion-reviewer.md` is a legal name in this layout, so a second
    // answer from the same reviewer is a verdict the round has not settled.
    // Reading the first response alone closed the stage on a pack that says
    // REVISE, and the seal recomputes over both files either way.
    ["a second response from the same reviewer answering REVISE", "second-response-revise"],
  ] as const) {
    it(`rejects a stage re-verify sealed against ${label}`, async () => {
      await withProject(async (root) => {
        const codes = await runOn(
          root,
          ledger([{ status: "done", evidence: ATDD_POINTER, layer: "Integration" }]),
          {
            [COVERAGE_DEPTH_PATH]: stageEvidence(),
            ".qfai/evidence/atdd-spec-0001.md": staleConsumerEntry(),
          },
          { stagePack: "present", stagePackDefect: defect },
        );
        expect(codes).toContain("QFAI-TDDLIST-008");
      });
    });
  }

  // The section is the stage's own verdict. Reading only the pack path and the
  // seal out of it let the stage say `REVISE` in the same breath as it named a
  // PASS pack from an earlier round: the half that recomputes agreed, and the
  // half a human wrote was compared with nothing.
  for (const [field, verdict] of [
    ["Final status", "REVISE"],
    ["Final status", "FAIL"],
    ["Outcome", "REVISE"],
    ["Status", "FAIL"],
  ] as const) {
    it(`rejects a stage whose Final status says ${field}: ${verdict}`, async () => {
      await withProject(async (root) => {
        const codes = await runOn(
          root,
          ledger([{ status: "done", evidence: ATDD_POINTER, layer: "Integration" }]),
          {
            [COVERAGE_DEPTH_PATH]: stageEvidence().replace(
              "## Final status\n",
              `## Final status\n\n- ${field}: ${verdict}\n`,
            ),
            ".qfai/evidence/atdd-spec-0001.md": staleConsumerEntry(),
          },
          { stagePack: "present" },
        );
        expect(codes).toContain("QFAI-TDDLIST-008");
      });
    });
  }

  // The over-correction pin: a section that states its PASS is still a PASS,
  // and one that states no outcome at all is left as it was — the shipped
  // stage-evidence shape does not require the field.
  it("accepts a stage whose Final status states the PASS its pack carries", async () => {
    await withProject(async (root) => {
      const codes = await runOn(
        root,
        ledger([{ status: "done", evidence: ATDD_POINTER, layer: "Integration" }]),
        {
          [COVERAGE_DEPTH_PATH]: stageEvidence().replace(
            "## Final status\n",
            "## Final status\n\n- Final status: PASS\n",
          ),
          ".qfai/evidence/atdd-spec-0001.md": staleConsumerEntry(),
        },
        { stagePack: "present" },
      );
      expect(codes).not.toContain("QFAI-TDDLIST-008");
    });
  });

  const MATRIX = `# Coverage Depth Matrix

| US/TC ID | Normal path | Oracle strength | Status |
| -------- | ----------- | --------------- | ------ |
| TC-0001 | ✅ | ⚠️ | — |

TC-0001 partial oracle strength: the upstream contract permits any non-empty
result, so the assertion cannot be tightened without drift.
`;

  it("accepts a completed row whose audit hash covers its Coverage Depth Matrix rows", async () => {
    await withProject(async (root) => {
      const codes = await runOn(
        root,
        ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]),
        {
          [COVERAGE_DEPTH_PATH]: MATRIX,
          ".qfai/evidence/implement-spec-0001.md": completeEntry("Unit"),
        },
        { coverageDepthMatrix: MATRIX },
      );
      expect(codes).not.toContain("QFAI-TDDLIST-008");
    });
  });

  // The hole: with only the evidence section hashed, a `⚠️` could be flipped to
  // `✅` and its justification rewritten after the PASS and both recorded
  // hashes still recomputed.
  it("rejects a completed row whose Coverage Depth Matrix moved after the PASS", async () => {
    await withProject(async (root) => {
      const codes = await runOn(
        root,
        ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]),
        {
          [COVERAGE_DEPTH_PATH]: MATRIX,
          ".qfai/evidence/implement-spec-0001.md": completeEntry("Unit"),
        },
        { coverageDepthMatrix: MATRIX.replace("| ⚠️ |", "| ✅ |") },
      );
      expect(codes).toContain("QFAI-TDDLIST-008");
    });
  });

  // The audited slice has to read the obligation cell the way the ledger's own
  // checks read it: `splitTcRefs` splits on commas, semicolons AND whitespace,
  // and compares upper-cased. Splitting on commas alone made `TC-0001; TC-0002`
  // one token that names nothing, and an exact comparison did the same to
  // `tc-0001` — either way the matrix fell out of the hash entirely and could be
  // rewritten after the PASS with nothing going stale.
  for (const [label, obligation] of [
    ["separated by a semicolon", "TC-0001; TC-0002"],
    ["separated by whitespace", "TC-0001 TC-0002"],
    ["written in lower case", "tc-0001"],
  ] as const) {
    it(`still stales the audit hash when the matrix moves, with an obligation ${label}`, async () => {
      await withProject(async (root) => {
        const codes = await runOn(
          root,
          ledger([{ status: "done", evidence: IMPLEMENT_POINTER, tcRefs: obligation }]),
          {
            [COVERAGE_DEPTH_PATH]: MATRIX,
            ".qfai/evidence/implement-spec-0001.md": completeEntry("Unit", obligation),
          },
          { coverageDepthMatrix: MATRIX.replace("| ⚠️ |", "| ✅ |"), obligationValue: obligation },
        );
        expect(codes).toContain("QFAI-TDDLIST-008");
      });
    });

    it(`accepts an unmoved matrix, with an obligation ${label}`, async () => {
      await withProject(async (root) => {
        const codes = await runOn(
          root,
          ledger([{ status: "done", evidence: IMPLEMENT_POINTER, tcRefs: obligation }]),
          {
            [COVERAGE_DEPTH_PATH]: MATRIX,
            ".qfai/evidence/implement-spec-0001.md": completeEntry("Unit", obligation),
          },
          { coverageDepthMatrix: MATRIX, obligationValue: obligation },
        );
        expect(codes).not.toContain("QFAI-TDDLIST-008");
      });
    });
  }

  // Exactly matched: the matrix is one document per spec that a later
  // `/qfai-atdd` run recomputes, so an unrelated obligation's cell moving must
  // not stale a verdict no re-review can clear.
  it("leaves the audit hash alone when the matrix names no cell for the obligation", async () => {
    await withProject(async (root) => {
      const codes = await runOn(root, ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]), {
        [COVERAGE_DEPTH_PATH]: MATRIX.replaceAll("TC-0001", "TC-00011"),
        ".qfai/evidence/implement-spec-0001.md": completeEntry("Unit"),
      });
      expect(codes).not.toContain("QFAI-TDDLIST-008");
    });
  });

  for (const [label, proof] of [
    ["a bare verdict", "PASS"],
    ["a skip", "skipped"],
    ["a plan with no run", "will break the parser and re-run the selector"],
    ["equivalent-mutant with no clause named", "equivalent-mutant"],
  ] as const) {
    it(`rejects an Oracle proof that is ${label}`, async () => {
      await withProject(async (root) => {
        const evidence = completeEntry("Unit").replace(
          /- Oracle proof: .*/,
          `- Oracle proof: ${proof}`,
        );
        const codes = await runOn(root, ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]), {
          ".qfai/evidence/implement-spec-0001.md": evidence,
        });
        expect(codes).toContain("QFAI-TDDLIST-008");
      });
    });
  }

  it("accepts an Oracle proof recording the mutation run and its failing output", async () => {
    await withProject(async (root) => {
      const evidence = completeEntry("Unit").replace(
        /- Oracle proof: .*/,
        "- Oracle proof: returned null from parseSample; npm test -- sample → 1 failed; reverted",
      );
      const codes = await runOn(root, ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]), {
        ".qfai/evidence/implement-spec-0001.md": evidence,
      });
      expect(codes).not.toContain("QFAI-TDDLIST-008");
    });
  });

  // A known runner plus a failure word is a shape, not a proof: the run it
  // describes may be of another selector, under another command, or a load
  // failure — the three rejections `oracle-strength.md` lists that have a
  // machine form. Each of these values cleared the field while proving nothing
  // about this row's test.
  for (const [label, proof] of [
    [
      "a run of a different selector",
      "returned null from parseSample; npm test -- unrelated → 1 failed; reverted",
    ],
    [
      "a run under a command that is not the row's GREEN command",
      "returned null from parseSample; pytest -k sample → 1 failed; reverted",
    ],
    ["a deleted export, which is a load failure", "deleted export; npm test -- sample → 1 failed"],
    [
      "a syntax error, which is a load failure",
      "introduced a syntax error in parseSample; npm test -- sample → 1 failed",
    ],
    [
      "a thrown not-implemented, which is a load failure",
      "made parseSample throw not implemented; npm test -- sample → 1 failed",
    ],
  ] as const) {
    it(`rejects an Oracle proof that is ${label}`, async () => {
      await withProject(async (root) => {
        const evidence = completeEntry("Unit").replace(
          /- Oracle proof: .*/,
          `- Oracle proof: ${proof}`,
        );
        const codes = await runOn(root, ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]), {
          ".qfai/evidence/implement-spec-0001.md": evidence,
        });
        expect(codes).toContain("QFAI-TDDLIST-008");
      });
    });
  }

  // The over-correction pin: a proof whose command wraps across a fenced block
  // still names the row's selector and contains its GREEN command, and the
  // mutation it describes is a behaviour change, not a missing seam.
  it("accepts an Oracle proof whose fenced run names the row's selector and GREEN command", async () => {
    await withProject(async (root) => {
      const evidence = completeEntry("Unit").replace(
        "- Oracle proof: equivalent-mutant — TC-0001 permits any non-empty result\n",
        `- Oracle proof:

  \`\`\`
  mutation: parseSample returns the input unchanged
  npm
    test -- sample
  1 failed — expected "ok", received "raw"
  reverted
  \`\`\`

`,
      );
      const codes = await runOn(root, ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]), {
        ".qfai/evidence/implement-spec-0001.md": evidence,
      });
      expect(codes).not.toContain("QFAI-TDDLIST-008");
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
        expect(codes).toContain("QFAI-TDDLIST-008");
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
      expect(codes).toContain("QFAI-TDDLIST-008");
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
      expect(codes).toContain("QFAI-TDDLIST-008");
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
            .replace(
              "- Oracle proof: equivalent-mutant — TC-0001 permits any non-empty result\n",
              "",
            )
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
        expect(codes).toContain("QFAI-TDDLIST-008");
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
        expect(codes).toContain("QFAI-TDDLIST-008");
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
      expect(codes).not.toContain("QFAI-TDDLIST-008");
    });
  });

  it("rejects assertion failure mode on a falsifiability entry", async () => {
    await withProject(async (root) => {
      const evidence = completeEntry("Unit")
        .replace(/- Round 1: RED (?:command|result|revision):.*\n/g, "")
        .replace("- Oracle proof: equivalent-mutant — TC-0001 permits any non-empty result\n", "")
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
      expect(codes).toContain("QFAI-TDDLIST-008");
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
      expect(codes).not.toContain("QFAI-TDDLIST-008");
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
      expect(codes).not.toContain("QFAI-TDDLIST-008");
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
        expect(codes).toContain("QFAI-TDDLIST-008");
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
      expect(codes).toContain("QFAI-TDDLIST-008");
    });
  });

  it("accepts completed evidence with falsifiability proof and no observed RED", async () => {
    await withProject(async (root) => {
      const evidence = completeEntry("Unit")
        .replace(/- Round 1: RED (?:command|result|revision):.*\n/g, "")
        .replace("- RED failure mode: assertion", "- RED failure mode: falsifiability")
        .replace("- Oracle proof: equivalent-mutant — TC-0001 permits any non-empty result\n", "")
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
      expect(codes).not.toContain("QFAI-TDDLIST-008");
    });
  });

  it("rejects a matching heading whose completed evidence section is empty", async () => {
    await withProject(async (root) => {
      const codes = await runOn(root, ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]), {
        ".qfai/evidence/implement-spec-0001.md": "# Evidence\n\n### TDD-0001\n",
      });
      expect(codes).toContain("QFAI-TDDLIST-008");
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
      expect(codes).not.toContain("QFAI-TDDLIST-008");
    });
  });

  it("rejects an existing evidence entry owned by the wrong layer", async () => {
    await withProject(async (root) => {
      const pointer =
        "RED fail / GREEN pass — evidence at `.qfai/evidence/atdd-spec-0001.md#tdd-0001`";
      const codes = await runOn(root, ledger([{ status: "done", evidence: pointer }]), {
        ".qfai/evidence/atdd-spec-0001.md": "# ATDD Evidence\n\n### TDD-0001\n",
      });
      expect(codes).toContain("QFAI-TDDLIST-008");
    });
  });

  it("rejects an anchor that resolves to a different TDD item", async () => {
    await withProject(async (root) => {
      const pointer =
        "RED fail / GREEN pass — evidence at `.qfai/evidence/implement-spec-0001.md#tdd-0002`";
      const codes = await runOn(root, ledger([{ status: "done", evidence: pointer }]), {
        ".qfai/evidence/implement-spec-0001.md": "# Evidence\n\n### TDD-0002\n",
      });
      expect(codes).toContain("QFAI-TDDLIST-008");
    });
  });

  it("rejects an evidence-at claim without a fragment", async () => {
    await withProject(async (root) => {
      const pointer = "RED fail / GREEN pass — evidence at `.qfai/evidence/implement-spec-0001.md`";
      const codes = await runOn(root, ledger([{ status: "done", evidence: pointer }]), {
        ".qfai/evidence/implement-spec-0001.md": "# Evidence\n\n### TDD-0001\n",
      });
      expect(codes).toContain("QFAI-TDDLIST-008");
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
      expect(codes).toContain("QFAI-TDDLIST-008");
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
      expect(codes).not.toContain("QFAI-TDDLIST-008");
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
      expect(codes).not.toContain("QFAI-TDDLIST-008");
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
      const found = issues.find((i) => i.code === "QFAI-TDDLIST-008");
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
        const found = issues.find((i) => i.code === "QFAI-TDDLIST-008");
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
        expect(codes).toContain("QFAI-TDDLIST-008");
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
      expect(codes).toContain("QFAI-TDDLIST-008");
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
      const found = issues.find((i) => i.code === "QFAI-TDDLIST-008");
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
      expect(codes).not.toContain("QFAI-TDDLIST-008");
    });
  });

  // `git rev-parse HEAD` prints 64 hex digits in a repository initialised with
  // `git init --object-format=sha256`, and an abbreviation of one is longer
  // than a full SHA-1 too. Capping the form at 40 made every revision such a
  // project records by contract — `Revision`, `RED revision` and both
  // `reviewed revision` fields — fail the shape check, so a correct row could
  // not be closed at all.
  for (const [label, revision] of [
    ["a full SHA-256 object id", `${"a".repeat(63)}9`],
    ["a SHA-256 abbreviation longer than a full SHA-1", `${"b".repeat(47)}1`],
  ] as const) {
    it(`accepts ${label} as a git rev`, async () => {
      await withProject(async (root) => {
        const evidence = completeEntry("Unit").replaceAll(DEFAULT_REVISION, revision);
        const issues = await runIssuesOn(
          root,
          ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]),
          { ".qfai/evidence/implement-spec-0001.md": evidence },
          { revision },
        );
        expect(issues.filter(({ message }) => message.includes("naming a git rev"))).toHaveLength(
          0,
        );
      });
    });
  }

  it("does not also report a missing anchor when the pointer resolves", async () => {
    await withProject(async (root) => {
      const codes = await runOn(root, ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]), {
        ".qfai/evidence/implement-spec-0001.md": completeEntry("Unit"),
      });
      expect(codes).not.toContain("QFAI-TDDLIST-007");
    });
  });
});

describe("QFAI-TDDLIST-007", () => {
  const OUTCOME_ONLY =
    "RED: `npx vitest run tests/unit/sample.test.ts` -> 1 failed. GREEN: 1 passed";

  it("warns on a done row whose Evidence carries no anchor", async () => {
    await withProject(async (root) => {
      const codes = await runOn(root, ledger([{ status: "done", evidence: OUTCOME_ONLY }]));
      expect(codes).toContain("QFAI-TDDLIST-007");
      const issues = await validateTddList(root, defaultConfig);
      const found = issues.find((i) => i.code === "QFAI-TDDLIST-007");
      expect(found?.severity).toBe("warning");
      // The canonical code is the waiver key; `rule` carries the dotted rule
      // path, as it does for this check's sibling.
      expect(found?.rule).toBe("tddList.evidenceAnchorPresent");
    });
  });

  // A row mid-cycle has not claimed completion yet, and the pointer is written
  // together with the evidence entry the completion gate reads.
  for (const status of ["green", "refactor", "review-fix"]) {
    it(`stays silent at Status=${status}`, async () => {
      await withProject(async (root) => {
        const codes = await runOn(root, ledger([{ status, evidence: OUTCOME_ONLY }]));
        expect(codes).not.toContain("QFAI-TDDLIST-007");
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
      expect(codes).toContain("QFAI-TDDLIST-008");
      expect(codes).not.toContain("QFAI-TDDLIST-007");
    });
  });
});
