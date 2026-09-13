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
 * They also pin `TDDLIST_EVIDENCE_EMPTY`. The rule took a consuming repository
 * from 3 errors to 27 in one `qfai init`, 20 of them on rows already at `done`,
 * so a project meets a backlog of these rather than one cell.
 */

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { chmod, lstat, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import {
  EVIDENCE_CELL_MALFORMED_RULE_ID,
  EVIDENCE_CELL_OVERSIZE_RULE_ID,
  EVIDENCE_RED_PROVENANCE_RULE_ID,
  ROW_EXTRA_CELLS_RULE_ID,
  validateTddList,
} from "../../src/core/validators/tddList.js";

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
 * The subject minus `Round N: reviewer verdict` and the `Round N: Review pack`
 * pair beside each attempt — the fields the completion reviewers write inside a
 * round block, after they have read it, so what they hashed never contained
 * them. A fenced value owns its fence lines too.
 */
function withoutReviewerVerdicts(text: string): string {
  const lines = text.split("\n");
  const kept: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    // A table row `| <label> | <value> |` is the same field as `<label>: <value>`.
    const line = lines[index] ?? "";
    const tableRow = /^\s*\|([^|]*)\|([^|]*)\|\s*$/.exec(line);
    const asField = tableRow
      ? `${(tableRow[1] ?? "").trim()}: ${(tableRow[2] ?? "").trim()}`
      : line;
    const verdict =
      /^\s*(?:- )?(?:\*\*)?(?:(?:Round[ \t]+\d+:[ \t]*)?reviewer verdict|Round[ \t]+\d+:[ \t]*Review pack(?:[ \t]+seal)?)(?:[ \t]*\(attempt[ \t]+\d+\))?(?:\*\*)?[ \t]*:[ \t]*(.*)$/i.exec(
        asField,
      );
    if (verdict === null) {
      kept.push(lines[index] ?? "");
      continue;
    }
    // Bold emphasis closes AFTER the colon in the form this repository writes,
    // so the capture is the markup rather than a value. Stripping it first is
    // what makes an empty value read as empty.
    if ((verdict[1] ?? "").replace(/\*+/g, "").trim().length > 0) continue;
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
  surfaceRecords: readonly string[] = [],
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
  records.push(...surfaceRecords);
  records.sort((left, right) => Buffer.from(left).compare(Buffer.from(right)));
  return digest(records.join("\n"));
}

/**
 * A capture's record in a product-surface-reviewer's subject: a `.md` or
 * `.html` capture normalized like the entry, and every other extension hashed
 * as the bytes on disk.
 */
function surfaceRecord(relativePath: string, body: string | Buffer): string {
  const bytes = typeof body === "string" ? Buffer.from(body, "utf8") : body;
  const hashed = /\.(?:md|html)$/.test(relativePath)
    ? normalizeArtifact(bytes.toString("utf8"))
    : bytes;
  return `${relativePath}\0${digest(hashed)}`;
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
  /**
   * The captures a product-surface-reviewer's verdict was taken on, written
   * before `{{PARITY_AUDIT_HASH}}` is computed over them.
   */
  surfaceArtifacts?: Readonly<Record<string, string | Buffer>>;
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
  const captures = Object.entries(options.surfaceArtifacts ?? {});
  for (const [relativePath, body] of captures) {
    const capturePath = path.join(root, relativePath);
    await mkdir(path.dirname(capturePath), { recursive: true });
    await writeFile(capturePath, body);
  }
  const parityAuditHash = phaseAuditHash(
    evidenceFile,
    content,
    "TDD-0001",
    matrixRecord,
    captures.map(([relativePath, body]) => surfaceRecord(relativePath, body)),
  );
  content = content.replaceAll("{{PARITY_AUDIT_HASH}}", parityAuditHash);

  const packs: Array<readonly [string, string, string, string]> = [
    ["20260811000000001", "completion-reviewer", "{{SPEC_PACK_SEAL}}", auditHash],
    ["20260811000000002", "implementation-reviewer", "{{CODE_PACK_SEAL}}", auditHash],
  ];
  if (content.includes("{{PARITY_PACK_SEAL}}")) {
    packs.push([
      "20260811000000003",
      "product-surface-reviewer",
      "{{PARITY_PACK_SEAL}}",
      parityAuditHash,
    ]);
  }
  for (const [name, role, placeholder, packAuditHash] of packs) {
    const packPath = `.qfai/review/review-${name}`;
    const packDir = path.join(root, packPath);
    await mkdir(packDir, { recursive: true });
    const passRecord = `Result: PASS\nReviewed revision: ${revision}\nAudited evidence hash: ${packAuditHash}\n`;
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
        `Result: REVISE\nReviewed revision: ${revision}\nAudited evidence hash: ${packAuditHash}\n`,
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
      expect(action).toContain("takes the Evidence edit with no Status change");
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
      expect(action).toContain("Record the command you ran and its result in the evidence file");
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
      expect(action).toContain("takes the Evidence edit with no Status change");
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

describe("QFAI-TDDLIST-011", () => {
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
        expect(codes).toContain("QFAI-TDDLIST-011");
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
        expect(codes).not.toContain("QFAI-TDDLIST-011");
        expect(codes).not.toContain("QFAI-TDDLIST-013");
        expect(codes).not.toContain("QFAI-TDDLIST-012");
      });
    });
  }

  it("states the case the content address is checked in", async () => {
    // The form is checked case-sensitively, so a correction printing
    // `working-tree+<sha256>` sends the author back with the same value.
    await withProject(async (root) => {
      const evidence = `RED:fail GREEN:pass ORACLE:proved REV:working-tree+${CONTENT_HASH.toUpperCase()} -> ${ANCHOR}`;
      await runOn(root, ledger([{ status: "done", evidence }]));
      const issues = await validateTddList(root, defaultConfig);
      const found = issues.find((issue) => issue.code === "QFAI-TDDLIST-011");
      expect(found?.suggested_action).toContain("working-tree+<64 lowercase hex>");
      expect(found?.suggested_action).not.toContain("working-tree+<sha256>");
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

  // The cell shape the grammar actually mandates, as opposed to the prose-ish
  // pointer the cases around it use. Every check below the anchor — the file
  // and fragment binding, and the completed-evidence field set — used to be
  // skipped for exactly this shape: the guard that keeps the status-only rule
  // off a conforming pointer sat above them and left the row entirely, so the
  // one cell written the way the grammar asks was the one cell nothing read.
  //
  // Nothing caught it because no row in this repository carries a conforming
  // pointer yet, and every case here reaches the anchor through the older
  // spelling.
  const GRAMMAR_POINTER =
    "RED:fail GREEN:pass ORACLE:proved REV:abc1230 -> `.qfai/evidence/implement-spec-0001.md#tdd-0001`";

  it("checks the completed-evidence fields behind a conforming pointer", async () => {
    await withProject(async (root) => {
      const issues = await runIssuesOn(
        root,
        ledger([{ status: "done", evidence: GRAMMAR_POINTER }]),
        {
          ".qfai/evidence/implement-spec-0001.md": "# Evidence\n\n### TDD-0001\n",
        },
      );

      const unresolved = issues.find((issue) => issue.code === "QFAI-TDDLIST-008");
      expect(unresolved, "a section with no fields is not a completion record").toBeDefined();
      expect(unresolved?.message).toContain("missing completed evidence fields");
    });
  });

  it("reads a conforming pointer's section against the row, not merely for shape", async () => {
    await withProject(async (root) => {
      const issues = await runIssuesOn(
        root,
        ledger([{ status: "done", evidence: GRAMMAR_POINTER }]),
        {
          ".qfai/evidence/implement-spec-0001.md": completeEntry("Unit").replace(
            "- TDD-ID: TDD-0001",
            "- TDD-ID: TDD-9999",
          ),
        },
      );

      const unresolved = issues.find((issue) => issue.code === "QFAI-TDDLIST-008");
      expect(unresolved, "a section naming another row is not this row's proof").toBeDefined();
      expect(unresolved?.message).toContain("TDD-ID");
    });
  });

  it("accepts a conforming pointer whose section is complete, and says nothing else about it", async () => {
    await withProject(async (root) => {
      const codes = await runOn(root, ledger([{ status: "done", evidence: GRAMMAR_POINTER }]), {
        ".qfai/evidence/implement-spec-0001.md": completeEntry("Unit"),
      });

      expect(codes).not.toContain("QFAI-TDDLIST-008");
      // The reason the guard existed: a conforming pointer states `GREEN:pass`
      // and carries no command, which is the status-only rule's shape exactly.
      // It still must not fire here.
      expect(codes).not.toContain("TDDLIST_EVIDENCE_STATUS_ONLY");
    });
  });

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
      expect(codes).toContain("QFAI-TDDLIST-013");
      // One defect, one finding: the cell is still shaped like a pointer, so
      // the status-only rule must not also read its `GREEN:pass` as prose.
      expect(codes).not.toContain("TDDLIST_EVIDENCE_STATUS_ONLY");
    });
  });

  // "There is no waiver here" needs the breach to be its OWN code with its own
  // rule id: reported as a `QFAI-TDDLIST-011` it shared a rule id with every
  // legacy prose cell, and the migration's own waiver silenced it.
  //
  // The code is newer than the rows it reads, and an error cannot be waived,
  // which is what makes the separation from the grammar's code load-bearing
  // rather than cosmetic.
  it("reports the provenance breach under its own code and rule id", async () => {
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
      const found = issues.find((i) => i.code === "QFAI-TDDLIST-013");
      expect(found?.severity).toBe("error");
      expect(found?.rule).toBe(EVIDENCE_RED_PROVENANCE_RULE_ID);
      expect(found?.rule).not.toBe(EVIDENCE_CELL_MALFORMED_RULE_ID);
      expect(found?.message).toContain("RED:n-a");
      expect(found?.message).toContain("TDD-0042");
      expect(issues.some((i) => i.code === "QFAI-TDDLIST-011")).toBe(false);
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
        expect(codes).not.toContain("QFAI-TDDLIST-011");
      });
    });
  }

  /** A repo whose first commit exists before anything is seeded into it. */
  async function repoWithRevision(root: string): Promise<string> {
    const git = (...args: string[]): void => {
      execFileSync("git", args, { cwd: root, stdio: ["ignore", "ignore", "ignore"] });
    };
    git("init", "--initial-branch=main");
    git("config", "user.email", "test@example.com");
    git("config", "user.name", "test");
    git("commit", "--allow-empty", "-m", "observed");
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf-8" }).trim();
  }

  const commitAll = (root: string, message: string): void => {
    execFileSync("git", ["add", "-A"], { cwd: root, stdio: ["ignore", "ignore", "ignore"] });
    execFileSync("git", ["commit", "-m", message], {
      cwd: root,
      stdio: ["ignore", "ignore", "ignore"],
    });
  };

  it("emits QFAI-TDDLIST-009 when the tree moved under the recorded Revision", async () => {
    // The wiring row. `evidenceRevisionStale.test.ts` covers the decision and
    // the git question as seams; nothing there proves `validateSpecTddList`
    // calls them, and a dead call site would leave every one of those rows
    // green.
    //
    // The revision is seeded, not rewritten afterwards: `materializeEvidence`
    // computes an audit hash over the evidence text, so a later edit breaks the
    // completed-evidence check, sets `anchorFailure`, and skips this finding —
    // which only runs on a row whose evidence is otherwise valid.
    await withProject(async (root) => {
      const observed = await repoWithRevision(root);
      await seedProject(
        root,
        ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]),
        [],
        {
          ".qfai/evidence/implement-spec-0001.md": completeEntry("Unit").replaceAll(
            DEFAULT_REVISION,
            observed,
          ),
        },
        // The review packs take their revision from here, and the evidence's
        // `reviewed revision` must match them. Swapping only the evidence left
        // the two disagreeing, the completed-evidence check failed, and this
        // finding was skipped — which the first run of this row measured.
        { revision: observed },
      );
      // The test the observation covered moves after the revision it names.
      commitAll(root, "move the tree");

      const issues = await validateTddList(root, defaultConfig);
      const stale = issues.filter((i) => i.code === "QFAI-TDDLIST-009");
      expect(stale).toHaveLength(1);
      expect(stale[0]?.message).toContain(TEST_FILE);
    });
  });

  it("stays silent when nothing moved under the recorded Revision", async () => {
    // The other direction through the same call site: a check that always fired
    // would pass the row above and be useless. Nothing is committed after the
    // seed, so `HEAD` is still the revision the evidence names.
    await withProject(async (root) => {
      const observed = await repoWithRevision(root);
      await seedProject(
        root,
        ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]),
        [],
        {
          ".qfai/evidence/implement-spec-0001.md": completeEntry("Unit").replaceAll(
            DEFAULT_REVISION,
            observed,
          ),
        },
        { revision: observed },
      );

      const issues = await validateTddList(root, defaultConfig);
      expect(issues.filter((i) => i.code === "QFAI-TDDLIST-009")).toEqual([]);
    });
  });

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

  it("drops a bold-colon verdict and its fence, as the contract says to", async () => {
    await withProject(async (root) => {
      // The form this repository writes: emphasis closing AFTER the colon, and
      // the `(attempt M)` qualifier a round with several review attempts
      // records. Read naively the capture is `**` rather than nothing, so the
      // label is dropped and the fence beneath it is not — leaving the
      // reviewer's own answer in the subject that reviewer hashes.
      const evidence = completeEntry("Unit").replace(
        "- Refactor verify command: npm test",
        [
          "- **Round 1: reviewer verdict (attempt 1):**",
          "```text",
          "REVISE — the assertion names no boundary",
          "```",
          "- **Round 1: reviewer verdict (attempt 2):**",
          "```text",
          "PASS",
          "```",
          "- Refactor verify command: npm test",
        ].join("\n"),
      );
      const codes = await runOn(root, ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]), {
        ".qfai/evidence/implement-spec-0001.md": evidence,
      });

      // The hashes in `completeEntry` are computed over the subject the
      // contract defines, so the row completes only if the validator drops
      // both lines the same way.
      expect(codes).not.toContain("QFAI-TDDLIST-008");
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

  it("reads a qualified REVISE as the verdict that opens the next round", async () => {
    // The `(attempt M)` qualifier is part of the field name a multi-attempt round
    // writes. The round check read only the bare name, so it found no verdict
    // here and reported round 2 as opened by nothing.
    await withProject(async (root) => {
      const secondRoundRevision = "bcd1230000000000000000000000000000000000";
      const evidence = completeEntry("Unit")
        .replace(
          "- Refactor verify command: npm test",
          [
            "- Round 1: reviewer verdict (attempt 1): REVISE — re-reviewed in this round",
            "- Round 1: reviewer verdict (attempt 2): REVISE — needs new production behaviour",
            "- Round 2: Revision: " + secondRoundRevision,
            "- Round 2: RED revision: def7890000000000000000000000000000000000",
            "- Round 2: RED command: npm test",
            "- Round 2: RED result: 1 failed",
            "- Round 2: GREEN command: npm test",
            "- Round 2: GREEN result: 1 passed",
            "- Refactor verify command: npm test",
          ].join("\n"),
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

  it("reads a bold-colon REVISE as the verdict that opens the next round", async () => {
    // The emphasis closes after the colon, so the raw value began with `**` and a
    // check for `REVISE` at its start never matched.
    await withProject(async (root) => {
      const secondRoundRevision = "bcd1230000000000000000000000000000000000";
      const evidence = completeEntry("Unit")
        .replace(
          "- Refactor verify command: npm test",
          [
            "- **Round 1: reviewer verdict:** REVISE — needs new production behaviour",
            "- Round 2: Revision: " + secondRoundRevision,
            "- Round 2: RED revision: def7890000000000000000000000000000000000",
            "- Round 2: RED command: npm test",
            "- Round 2: RED result: 1 failed",
            "- Round 2: GREEN command: npm test",
            "- Round 2: GREEN result: 1 passed",
            "- Refactor verify command: npm test",
          ].join("\n"),
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

  it.each([
    ["an attempt 2 with no attempt 1", ["(attempt 2): REVISE — needs new production behaviour"]],
    ["an attempt 0", ["(attempt 0): REVISE — needs new production behaviour"]],
    [
      "a repeated number",
      [
        "(attempt 1): REVISE — re-reviewed in this round",
        "(attempt 1): REVISE — needs new production behaviour",
      ],
    ],
    [
      "numbers out of review order",
      [
        "(attempt 2): REVISE — re-reviewed in this round",
        "(attempt 1): REVISE — needs new production behaviour",
      ],
    ],
    [
      "an unqualified attempt beside a qualified one",
      [
        ": REVISE — re-reviewed in this round",
        "(attempt 2): REVISE — needs new production behaviour",
      ],
    ],
  ])("rejects a round whose review attempts show %s", async (_shape, attempts) => {
    // Attempts count from 1 in review order. A gap, a repeat or a reordering is
    // an attempt missing from the audit trail, and the line written last is then
    // not known to be the one the round closed on.
    await withProject(async (root) => {
      const secondRoundRevision = "bcd1230000000000000000000000000000000000";
      const evidence = completeEntry("Unit")
        .replace(
          "- Refactor verify command: npm test",
          [
            ...attempts.map((attempt) =>
              attempt.startsWith(":")
                ? `- Round 1: reviewer verdict${attempt}`
                : `- Round 1: reviewer verdict ${attempt}`,
            ),
            "- Round 2: Revision: " + secondRoundRevision,
            "- Round 2: RED revision: def7890000000000000000000000000000000000",
            "- Round 2: RED command: npm test",
            "- Round 2: RED result: 1 failed",
            "- Round 2: GREEN command: npm test",
            "- Round 2: GREEN result: 1 passed",
            "- Refactor verify command: npm test",
          ].join("\n"),
        )
        .replaceAll(
          "reviewed revision: abc1230000000000000000000000000000000000",
          `reviewed revision: ${secondRoundRevision}`,
        );
      const issues = await runIssuesOn(
        root,
        ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]),
        { ".qfai/evidence/implement-spec-0001.md": evidence },
        { revision: secondRoundRevision },
      );
      const finding = issues.find((issue) => issue.code === "QFAI-TDDLIST-008");
      expect(finding?.message).toContain(
        "Round 1: reviewer verdict attempts numbered from 1 in review order",
      );
    });
  });

  it("rejects a done row whose last round ends on a REVISE", async () => {
    // A REVISE closes a round only by opening another or by a later attempt in
    // the same round. Left last, it is a review nobody answered, whatever the
    // row-level verdicts say.
    await withProject(async (root) => {
      const evidence = completeEntry("Unit").replace(
        "- Refactor verify command: npm test",
        [
          "- **Round 1: reviewer verdict (attempt 1):**",
          "```text",
          "REVISE — the assertion names no boundary",
          "```",
          "- Refactor verify command: npm test",
        ].join("\n"),
      );
      const issues = await runIssuesOn(
        root,
        ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]),
        { ".qfai/evidence/implement-spec-0001.md": evidence },
      );
      const finding = issues.find((issue) => issue.code === "QFAI-TDDLIST-008");
      expect(finding?.message).toContain("Round 1: reviewer verdict: PASS");
    });
  });

  it.each([
    [
      "a PASS with more text after it",
      ["- Round 1: reviewer verdict: PASS but verification is still pending"],
    ],
    [
      "a blank last attempt",
      ["- Round 1: reviewer verdict (attempt 1): PASS", "- Round 1: reviewer verdict (attempt 2):"],
    ],
  ])("rejects a last round that closes on %s", async (_shape, verdictLines) => {
    // The closing verdict is `PASS` exactly. A blank attempt is still an
    // attempt, so it cannot leave the one before it standing as the close.
    await withProject(async (root) => {
      const evidence = completeEntry("Unit").replace(
        "- Refactor verify command: npm test",
        [...verdictLines, "- Refactor verify command: npm test"].join("\n"),
      );
      const issues = await runIssuesOn(
        root,
        ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]),
        { ".qfai/evidence/implement-spec-0001.md": evidence },
      );
      const finding = issues.find((issue) => issue.code === "QFAI-TDDLIST-008");
      expect(finding?.message).toContain("Round 1: reviewer verdict: PASS");
    });
  });

  it("drops each attempt's review pack pair from the subject", async () => {
    // Each review creates its own pack, and the pair naming it is written once
    // that review has run. Left in the region, it put bytes the reviewer never
    // read into what the reviewer hashed, and the recorded digest failed.
    await withProject(async (root) => {
      const evidence = completeEntry("Unit").replace(
        "- Refactor verify command: npm test",
        [
          "- Round 1: reviewer verdict (attempt 1): REVISE — the assertion names no boundary",
          "- Round 1: Review pack (attempt 1): .qfai/review/review-20260101000000000",
          `- Round 1: Review pack seal (attempt 1): sha256:${"a".repeat(64)}`,
          "- Round 1: reviewer verdict (attempt 2): PASS",
          "- Round 1: Review pack (attempt 2): .qfai/review/review-20260101010000000",
          `- Round 1: Review pack seal (attempt 2): sha256:${"b".repeat(64)}`,
          "- Refactor verify command: npm test",
        ].join("\n"),
      );
      const codes = await runOn(root, ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]), {
        ".qfai/evidence/implement-spec-0001.md": evidence,
      });

      // `completeEntry`'s hashes are taken over the subject without these lines,
      // so the row completes only if the validator drops them the same way.
      expect(codes).not.toContain("QFAI-TDDLIST-008");
    });
  });

  it("recomputes each attempt's round review pack seal from the pack it names", async () => {
    // The pair is left out of every audited subject, so recomputing the seal is
    // the only thing that sees a pack edited after its attempt closed.
    await withProject(async (root) => {
      const first = ".qfai/review/review-20260101000000000";
      const second = ".qfai/review/review-20260101010000000";
      for (const [pack, verdict] of [
        [first, "REVISE"],
        [second, "PASS"],
      ] as const) {
        await mkdir(path.join(root, pack), { recursive: true });
        await writeFile(path.join(root, pack, "review_request.md"), "TDD-ID: TDD-0001\n");
        await writeFile(
          path.join(root, pack, "R01_completion-reviewer.md"),
          `Result: ${verdict}\nReviewed revision: abc1230000000000000000000000000000000000\n`,
        );
        await writeFile(
          path.join(root, pack, "summary.json"),
          `${JSON.stringify({ revision: "abc1230000000000000000000000000000000000" })}\n`,
        );
      }
      const evidence = completeEntry("Unit").replace(
        "- Refactor verify command: npm test",
        [
          "- Round 1: reviewer verdict (attempt 1): REVISE — the assertion names no boundary",
          `- Round 1: Review pack (attempt 1): ${first}`,
          `- Round 1: Review pack seal (attempt 1): sha256:${await packSeal(root, first)}`,
          "- Round 1: reviewer verdict (attempt 2): PASS",
          `- Round 1: Review pack (attempt 2): ${second}`,
          `- Round 1: Review pack seal (attempt 2): sha256:${"b".repeat(64)}`,
          "- Refactor verify command: npm test",
        ].join("\n"),
      );
      const issues = await runIssuesOn(
        root,
        ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]),
        { ".qfai/evidence/implement-spec-0001.md": evidence },
      );
      const messages = issues.map((issue) => issue.message).join("\n");
      expect(messages).toContain("Round 1: Review pack seal (attempt 2) matching pack contents");
      expect(messages).not.toContain(
        "Round 1: Review pack seal (attempt 1) matching pack contents",
      );
      // The earlier attempt's pack is its own: this row, its verdict, this round.
      expect(messages).not.toContain("Round 1: Review pack (attempt 1) carrying");
      expect(messages).not.toContain("Round 1: Review pack (attempt 1) reviewing");
    });
  });

  it("requires a pack pair for every verdict attempt once a round records one", async () => {
    // The last attempt's pack is the one the round closed on, so a round that
    // recorded the first attempt's pair and not the closing one's is missing
    // the review it rests on.
    await withProject(async (root) => {
      const evidence = completeEntry("Unit").replace(
        "- Refactor verify command: npm test",
        [
          "- Round 1: reviewer verdict (attempt 1): REVISE — the assertion names no boundary",
          "- Round 1: Review pack (attempt 1): .qfai/review/review-20260101000000000",
          `- Round 1: Review pack seal (attempt 1): sha256:${"a".repeat(64)}`,
          "- Round 1: reviewer verdict (attempt 2): PASS",
          "- Refactor verify command: npm test",
        ].join("\n"),
      );
      const issues = await runIssuesOn(
        root,
        ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]),
        { ".qfai/evidence/implement-spec-0001.md": evidence },
      );
      expect(issues.map((issue) => issue.message).join("\n")).toContain(
        "Round 1: Review pack (attempt 2) beside that attempt's reviewer verdict",
      );
    });
  });

  it("refuses a round pack path of the wrong shape even when nothing is there", async () => {
    // Packs are skipped when absent, so a path that could never name one would
    // otherwise pass on every fresh clone.
    await withProject(async (root) => {
      const evidence = completeEntry("Unit").replace(
        "- Refactor verify command: npm test",
        [
          "- Round 1: reviewer verdict: PASS",
          "- Round 1: Review pack: .qfai/review/not-a-pack",
          `- Round 1: Review pack seal: sha256:${"a".repeat(64)}`,
          "- Refactor verify command: npm test",
        ].join("\n"),
      );
      const issues = await runIssuesOn(
        root,
        ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]),
        { ".qfai/evidence/implement-spec-0001.md": evidence },
      );
      expect(issues.map((issue) => issue.message).join("\n")).toContain(
        "Round 1: Review pack: canonical .qfai/review/review-<17-digit timestamp> path",
      );
    });
  });

  it("binds a present round pack to this row and to the verdict it records", async () => {
    // A sealed pack from another review keeps every hash unchanged, because the
    // pair is outside the audited subject, so its contents are what can refuse it.
    await withProject(async (root) => {
      const pack = ".qfai/review/review-20260101000000000";
      await mkdir(path.join(root, pack), { recursive: true });
      await writeFile(path.join(root, pack, "review_request.md"), "TDD-ID: TDD-0001\n");
      await writeFile(path.join(root, pack, "R01_completion-reviewer.md"), "Result: REVISE\n");
      const evidence = completeEntry("Unit").replace(
        "- Refactor verify command: npm test",
        [
          "- Round 1: reviewer verdict: PASS",
          `- Round 1: Review pack: ${pack}`,
          `- Round 1: Review pack seal: sha256:${await packSeal(root, pack)}`,
          "- Refactor verify command: npm test",
        ].join("\n"),
      );
      const issues = await runIssuesOn(
        root,
        ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]),
        { ".qfai/evidence/implement-spec-0001.md": evidence },
      );
      const messages = issues.map((issue) => issue.message).join("\n");
      expect(messages).toContain(
        "Round 1: Review pack carrying this row's request and responses agreeing with its verdict",
      );
      expect(messages).not.toContain("Round 1: Review pack seal matching pack contents");
    });
  });

  it("requires every review attempt before the last to be a REVISE", async () => {
    // A later attempt exists only to answer a REVISE, so a PASS ahead of it had
    // already closed the review.
    await withProject(async (root) => {
      const evidence = completeEntry("Unit").replace(
        "- Refactor verify command: npm test",
        [
          "- Round 1: reviewer verdict (attempt 1): PASS",
          "- Round 1: reviewer verdict (attempt 2): PASS",
          "- Refactor verify command: npm test",
        ].join("\n"),
      );
      const issues = await runIssuesOn(
        root,
        ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]),
        { ".qfai/evidence/implement-spec-0001.md": evidence },
      );
      expect(issues.map((issue) => issue.message).join("\n")).toContain(
        "Round 1: every reviewer verdict attempt before the last: REVISE",
      );
    });
  });

  it("binds a round pack to the revision its round records", async () => {
    // A sealed pack from an earlier review of the same row, with the same
    // outcome, would otherwise stand in for this round's review.
    await withProject(async (root) => {
      const first = ".qfai/review/review-20260101000000000";
      await mkdir(path.join(root, first), { recursive: true });
      await writeFile(path.join(root, first, "review_request.md"), "TDD-ID: TDD-0001\n");
      await writeFile(
        path.join(root, first, "R01_completion-reviewer.md"),
        `Result: REVISE\nReviewed revision: ${"d".repeat(40)}\n`,
      );
      await writeFile(
        path.join(root, first, "summary.json"),
        `${JSON.stringify({ revision: "d".repeat(40) })}\n`,
      );
      const evidence = completeEntry("Unit").replace(
        "- Refactor verify command: npm test",
        [
          "- Round 1: reviewer verdict (attempt 1): REVISE — the assertion names no boundary",
          `- Round 1: Review pack (attempt 1): ${first}`,
          `- Round 1: Review pack seal (attempt 1): sha256:${await packSeal(root, first)}`,
          "- Round 1: reviewer verdict (attempt 2): PASS",
          "- Round 1: Review pack (attempt 2): .qfai/review/review-20260101010000000",
          `- Round 1: Review pack seal (attempt 2): sha256:${"b".repeat(64)}`,
          "- Refactor verify command: npm test",
        ].join("\n"),
      );
      const issues = await runIssuesOn(
        root,
        ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]),
        { ".qfai/evidence/implement-spec-0001.md": evidence },
      );
      expect(issues.map((issue) => issue.message).join("\n")).toContain(
        "Round 1: Review pack (attempt 1) reviewing this round's revision and evidence",
      );
    });
  });

  it("reports a review attempt that records its pack pair twice", async () => {
    // Only one pair per attempt is read, so a second would leave the first
    // outside every check while both are dropped from the audited subject.
    await withProject(async (root) => {
      const evidence = completeEntry("Unit").replace(
        "- Refactor verify command: npm test",
        [
          "- Round 1: reviewer verdict: PASS",
          "- Round 1: Review pack: .qfai/review/review-20260101000000000",
          `- Round 1: Review pack seal: sha256:${"a".repeat(64)}`,
          "- Round 1: Review pack: .qfai/review/review-20260101010000000",
          `- Round 1: Review pack seal: sha256:${"b".repeat(64)}`,
          "- Refactor verify command: npm test",
        ].join("\n"),
      );
      const issues = await runIssuesOn(
        root,
        ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]),
        { ".qfai/evidence/implement-spec-0001.md": evidence },
      );
      expect(issues.map((issue) => issue.message).join("\n")).toContain(
        "Round 1: Review pack and its seal recorded once",
      );
    });
  });

  it("holds the closing attempt's responses to the row's audited hashes", async () => {
    // The attempt the last round closed on is the review the row-level
    // verdicts record, so its reviewer answered over the same subject.
    await withProject(async (root) => {
      const closing = ".qfai/review/review-20260101010000000";
      await mkdir(path.join(root, closing), { recursive: true });
      await writeFile(path.join(root, closing, "review_request.md"), "TDD-ID: TDD-0001\n");
      await writeFile(
        path.join(root, closing, "R01_completion-reviewer.md"),
        `Result: PASS\nReviewed revision: abc1230000000000000000000000000000000000\nAudited evidence hash: sha256:${"c".repeat(64)}\n`,
      );
      await writeFile(
        path.join(root, closing, "summary.json"),
        `${JSON.stringify({ revision: "abc1230000000000000000000000000000000000" })}\n`,
      );
      const evidence = completeEntry("Unit").replace(
        "- Refactor verify command: npm test",
        [
          "- Round 1: reviewer verdict (attempt 1): REVISE — the assertion names no boundary",
          "- Round 1: Review pack (attempt 1): .qfai/review/review-20260101000000000",
          `- Round 1: Review pack seal (attempt 1): sha256:${"a".repeat(64)}`,
          "- Round 1: reviewer verdict (attempt 2): PASS",
          `- Round 1: Review pack (attempt 2): ${closing}`,
          `- Round 1: Review pack seal (attempt 2): sha256:${await packSeal(root, closing)}`,
          "- Refactor verify command: npm test",
        ].join("\n"),
      );
      const issues = await runIssuesOn(
        root,
        ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]),
        { ".qfai/evidence/implement-spec-0001.md": evidence },
      );
      const messages = issues.map((issue) => issue.message).join("\n");
      expect(messages).toContain(
        "Round 1: Review pack (attempt 2) reviewing this round's revision and evidence",
      );
      expect(messages).not.toContain(
        "Round 1: Review pack (attempt 2) carrying this row's request and responses agreeing with its verdict",
      );
    });
  });

  it("reports a round review pack recorded without its seal", async () => {
    // Without the seal nothing says whether the pack still holds what was
    // reviewed, and the pair is outside every audited subject.
    await withProject(async (root) => {
      const evidence = completeEntry("Unit").replace(
        "- Refactor verify command: npm test",
        [
          "- Round 1: reviewer verdict: PASS",
          "- Round 1: Review pack: .qfai/review/review-20260101000000000",
          "- Refactor verify command: npm test",
        ].join("\n"),
      );
      const issues = await runIssuesOn(
        root,
        ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]),
        { ".qfai/evidence/implement-spec-0001.md": evidence },
      );
      expect(issues.map((issue) => issue.message).join("\n")).toContain(
        "Round 1: Review pack seal: sha256",
      );
    });
  });

  it("drops a table verdict with an empty cell and its fence from the subject", async () => {
    // An empty value cell leaves only its closing `|` in the capture. Read as a
    // value, it kept the fence below in the hash the gate computes, while the
    // reviewer following the contract dropped it.
    await withProject(async (root) => {
      const secondRoundRevision = "bcd1230000000000000000000000000000000000";
      const evidence = completeEntry("Unit")
        .replace(
          "- Refactor verify command: npm test",
          [
            "| Round 1: reviewer verdict | |",
            "```text",
            "REVISE — needs new production behaviour",
            "```",
            "- Round 2: Revision: " + secondRoundRevision,
            "- Round 2: RED revision: def7890000000000000000000000000000000000",
            "- Round 2: RED command: npm test",
            "- Round 2: RED result: 1 failed",
            "- Round 2: GREEN command: npm test",
            "- Round 2: GREEN result: 1 passed",
            "- Refactor verify command: npm test",
          ].join("\n"),
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

  it("reads a selector that begins with a globstar as written", async () => {
    // Taking every leading asterisk off a value, as the bold-colon spelling's
    // closing emphasis needed, turned `**/sample` into `/sample`, and the row
    // then disagreed with its own ledger selector.
    await withProject(async (root) => {
      const evidence = completeEntry("Unit").replace("- Selector: sample", "- Selector: **/sample");
      const issues = await runIssuesOn(
        root,
        ledger([{ status: "done", evidence: IMPLEMENT_POINTER, selector: "**/sample" }]),
        { ".qfai/evidence/implement-spec-0001.md": evidence },
      );
      expect(issues.map((issue) => issue.message).join("\n")).not.toContain(
        "Selector matching ledger value",
      );
    });
  });

  it("does not read the attempt qualifier on a field that records one value per round", async () => {
    // `(attempt M)` belongs to the reviewer verdict. Read on every field, a
    // malformed `Round 1: Revision (attempt 2)` satisfied the round's revision.
    await withProject(async (root) => {
      const evidence = completeEntry("Unit").replace(
        "- Round 1: Revision: abc1230000000000000000000000000000000000",
        "- Round 1: Revision (attempt 2): abc1230000000000000000000000000000000000",
      );
      const codes = await runOn(root, ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]), {
        ".qfai/evidence/implement-spec-0001.md": evidence,
      });
      expect(codes).toContain("QFAI-TDDLIST-008");
    });
  });

  for (const sibling of [
    "- Prototype parity reviewed revision: abc1230000000000000000000000000000000000",
    "- Checkpoint verification revision: abc1230000000000000000000000000000000000",
  ]) {
    it(`ends the audited subject at ${sibling.slice(2, sibling.indexOf(":"))} when it comes first`, async () => {
      // The region ends at the first stage-completion field or labelled
      // sibling. A sibling the gate did not recognise stayed in the subject it
      // computed, and the reviewer's digest over the documented region failed.
      await withProject(async (root) => {
        const evidence = completeEntry("Unit").replace(
          "- qa-gatekeeper: PASS",
          `- qa-gatekeeper: PASS\n${sibling}`,
        );
        const codes = await runOn(root, ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]), {
          ".qfai/evidence/implement-spec-0001.md": evidence,
        });
        expect(codes).not.toContain("QFAI-TDDLIST-008");
      });
    });
  }

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

  describe("Prototype parity", () => {
    const SCREENSHOT = ".qfai/evidence/prototyping/screen.png";
    const HTML_CAPTURE = ".qfai/evidence/prototyping/screen.html";
    // Bytes step 2 rewrites where it applies: a CRLF pair and trailing
    // whitespace. A gate that normalized the screenshot, or hashed the HTML as
    // it sits on disk, computes a digest the reviewer did not.
    const CAPTURES = {
      [SCREENSHOT]: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x20, 0x0d, 0x0a, 0x1a, 0x0a]),
      [HTML_CAPTURE]: "<main>\r\n  <h1>Screen</h1>  \r\n</main>\r\n",
    };
    const VERDICT = [
      "- Prototype parity: PASS (clause 1)",
      `- Prototype parity reviewed revision: ${DEFAULT_REVISION}`,
      "- Prototype parity audited evidence hash: {{PARITY_AUDIT_HASH}}",
      "- Prototype parity review pack: .qfai/review/review-20260811000000003",
      "- Prototype parity review pack seal: {{PARITY_PACK_SEAL}}",
    ];
    const FENCE = "`".repeat(3);

    /** The complete entry with these parity lines beside the other verdicts. */
    function withParity(lines: readonly string[]): string {
      return completeEntry("Unit").replace(
        "- Checkpoint verification command: npm test",
        [...lines, "- Checkpoint verification command: npm test"].join("\n"),
      );
    }

    /** A UI-affecting entry: its manifest among the phase-authored fields. */
    function verdictEntry(manifest: readonly string[] = [SCREENSHOT, HTML_CAPTURE]): string {
      const block = ["- Surface artifacts:", "", `${FENCE}text`, ...manifest, FENCE, ""];
      return withParity(VERDICT).replace(
        "- qa-gatekeeper: PASS",
        [...block, "- qa-gatekeeper: PASS"].join("\n"),
      );
    }

    const LEDGER = ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]);

    async function unresolved(
      root: string,
      evidence: string,
      options: EvidenceOptions = {},
    ): Promise<Array<{ code: string; message: string }>> {
      const issues = await runIssuesOn(
        root,
        LEDGER,
        { ".qfai/evidence/implement-spec-0001.md": evidence },
        options,
      );
      return issues.filter((issue) => issue.code === "QFAI-TDDLIST-008");
    }

    it("rejects a verdict that says REVISE", async () => {
      // Gate item 9 makes a UI-affecting row's completion conditional on the
      // product-surface-reviewer's PASS.
      await withProject(async (root) => {
        const [issue] = await unresolved(
          root,
          withParity(["- Prototype parity: REVISE (clause 1)"]),
        );
        expect(issue?.message).toContain("Prototype parity: PASS");
      });
    });

    it("accepts a row no clause selects, with the revision the clauses were evaluated at", async () => {
      // The form the contract writes. Compared whole against `PASS`, it was
      // refused, and so was every row that recorded why it is not UI-affecting.
      await withProject(async (root) => {
        const issues = await unresolved(
          root,
          withParity([
            "- Prototype parity: n/a (not UI-affecting)",
            `- Prototype parity reviewed revision: ${DEFAULT_REVISION}`,
          ]),
        );
        expect(issues).toEqual([]);
      });
    });

    it("asks an n/a row for its revision and nothing a reviewer writes", async () => {
      await withProject(async (root) => {
        const [issue] = await unresolved(
          root,
          withParity(["- Prototype parity: n/a (not UI-affecting)"]),
        );
        expect(issue?.message).toContain("Prototype parity reviewed revision");
        expect(issue?.message).not.toContain("Prototype parity audited evidence hash");
      });
    });

    it("holds an n/a row's revision to the latest Revision", async () => {
      await withProject(async (root) => {
        const [issue] = await unresolved(
          root,
          withParity([
            "- Prototype parity: n/a (not UI-affecting)",
            `- Prototype parity reviewed revision: ${"f".repeat(40)}`,
          ]),
        );
        expect(issue?.message).toContain(
          "Prototype parity reviewed revision matching latest Revision",
        );
      });
    });

    // Read by its first word, `n/a (UI-affecting)` passed as a row with no
    // surface and skipped the review, the captures and the hash; a verdict with
    // no clause names no declaration the routing can be re-run against.
    for (const value of [
      "looks right",
      "PASS",
      "PASS (unknown)",
      "PASS (clause 0)",
      "PASS (clause 999)",
      "n/a (UI-affecting)",
      "N/A",
    ]) {
      it(`names the forms a parity value takes when it holds ${value}`, async () => {
        await withProject(async (root) => {
          const [issue] = await unresolved(root, withParity([`- Prototype parity: ${value}`]));
          expect(issue?.message).toContain("PASS (clause N) or n/a (not UI-affecting)");
          expect(issue?.message).not.toContain("Prototype parity reviewed revision");
        });
      });
    }

    it("reads the recorded forms in either case", async () => {
      await withProject(async (root) => {
        const issues = await unresolved(
          root,
          withParity([
            "- Prototype parity: N/A (Not UI-affecting)",
            `- Prototype parity reviewed revision: ${DEFAULT_REVISION}`,
          ]),
        );
        expect(issues).toEqual([]);
      });
    });

    it("holds the manifest to the phase-authored fields ahead of the verdicts", async () => {
      // Written after the gate fields, the manifest sits outside the entry the
      // reviewers hashed, so what they read did not say which captures counted.
      await withProject(async (root) => {
        const late = withParity([...VERDICT, `- Surface artifacts: ${SCREENSHOT}`]);
        const [issue] = await unresolved(root, late, { surfaceArtifacts: CAPTURES });
        expect(issue?.message).toContain(
          "all phase-authored fields before review and checkpoint fields",
        );
      });
    });

    it("requires a verdict's labelled fields and the manifest of what it was taken on", async () => {
      // A verdict with none of its siblings was accepted, so a UI-affecting row
      // reached `done` with no hash over the surface it was judged on.
      await withProject(async (root) => {
        const [issue] = await unresolved(root, withParity(["- Prototype parity: PASS (clause 1)"]));
        for (const field of [
          "Prototype parity reviewed revision",
          "Prototype parity audited evidence hash",
          "Prototype parity review pack",
          "Prototype parity review pack seal",
          "Surface artifacts",
        ]) {
          expect(issue?.message).toContain(field);
        }
      });
    });

    it("accepts a verdict whose hash recomputes over a raw screenshot and a normalized capture", async () => {
      await withProject(async (root) => {
        const issues = await unresolved(root, verdictEntry(), { surfaceArtifacts: CAPTURES });
        expect(issues).toEqual([]);
      });
    });

    it("rejects a verdict whose screenshot was replaced after it", async () => {
      // `Reviewed revision` excludes the evidence tree, so before the captures
      // were in the subject nothing the gate read moved.
      await withProject(async (root) => {
        await seedProject(
          root,
          LEDGER,
          [],
          { ".qfai/evidence/implement-spec-0001.md": verdictEntry() },
          { surfaceArtifacts: CAPTURES },
        );
        await writeFile(path.join(root, SCREENSHOT), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00]));

        const issue = (await validateTddList(root, defaultConfig)).find(
          (found) => found.code === "QFAI-TDDLIST-008",
        );
        expect(issue?.message).toContain("Prototype parity audited evidence hash matching");
      });
    });

    it("leaves the hash to a checkout that holds the captures", async () => {
      // Captures are stage evidence that the evidence tree's ignore rules keep
      // out of the repository, so a fresh clone has none to hash.
      await withProject(async (root) => {
        await seedProject(
          root,
          LEDGER,
          [],
          { ".qfai/evidence/implement-spec-0001.md": verdictEntry() },
          { surfaceArtifacts: CAPTURES },
        );
        await rm(path.join(root, ".qfai", "evidence", "prototyping"), {
          recursive: true,
          force: true,
        });

        const issues = (await validateTddList(root, defaultConfig)).filter(
          (found) => found.code === "QFAI-TDDLIST-008",
        );
        expect(issues).toEqual([]);
      });
    });

    it("refuses a manifest that names no capture under the evidence tree", async () => {
      // A path outside the tree adds no record, so the verdict would be hashed
      // over fields alone.
      await withProject(async (root) => {
        const [issue] = await unresolved(root, verdictEntry(["docs/screen.png"]));
        expect(issue?.message).toContain(
          "Surface artifacts naming repository-relative paths under .qfai/evidence/, not docs/screen.png",
        );
      });
    });

    it("refuses a capture that is not a regular file", async () => {
      await withProject(async (root) => {
        const shots = ".qfai/evidence/prototyping/shots";
        await mkdir(path.join(root, shots), { recursive: true });
        const [issue] = await unresolved(root, verdictEntry([shots]));
        expect(issue?.message).toContain(`Surface artifacts naming a regular file at ${shots}`);
      });
    });

    it("refuses a second parity verdict", async () => {
      // Only the last verdict is read, so a refusal followed by `n/a` passed on
      // the second while the first stayed on the page.
      await withProject(async (root) => {
        const [issue] = await unresolved(
          root,
          withParity([
            "- Prototype parity: REVISE (clause 1)",
            "- Prototype parity: n/a (not UI-affecting)",
            `- Prototype parity reviewed revision: ${DEFAULT_REVISION}`,
          ]),
        );
        expect(issue?.message).toContain("exactly one Prototype parity");
      });
    });

    it("refuses reviewer provenance on a row no clause selects", async () => {
      // No reviewer ran on an `n/a` row, so a hash or a pack there is provenance
      // for a review that did not happen, and nothing checks it.
      await withProject(async (root) => {
        const [issue] = await unresolved(
          root,
          withParity([
            "- Prototype parity: n/a (not UI-affecting)",
            `- Prototype parity reviewed revision: ${DEFAULT_REVISION}`,
            `- Prototype parity audited evidence hash: ${"a".repeat(64)}`,
            "- Prototype parity review pack: .qfai/review/review-20260811000000003",
          ]),
        );
        expect(issue?.message).toContain("no Prototype parity audited evidence hash on an n/a");
        expect(issue?.message).toContain("no Prototype parity review pack on an n/a");
      });
    });
    it("refuses a second Surface artifacts field", async () => {
      // Only the last manifest is read, so a capture only the first one named
      // could be replaced with nothing the gate recomputes moving.
      await withProject(async (root) => {
        const twice = verdictEntry().replace(
          "- qa-gatekeeper: PASS",
          [`- Surface artifacts: ${HTML_CAPTURE}`, "- qa-gatekeeper: PASS"].join("\n"),
        );
        const [issue] = await unresolved(root, twice, { surfaceArtifacts: CAPTURES });
        expect(issue?.message).toContain("exactly one Surface artifacts");
      });
    });

    it("ends the phase-authored subject at whichever parity field comes first", async () => {
      // Written before the verdict line, the sibling fields fell inside the
      // subject, audited hash included, and no recorded hash could match it.
      await withProject(async (root) => {
        const [verdict, ...siblings] = VERDICT;
        const reordered = verdictEntry()
          .replace([verdict, ...siblings].join("\n") + "\n", "")
          .replace("- Spec review: PASS", [...siblings, verdict, "- Spec review: PASS"].join("\n"));
        expect(reordered.indexOf(siblings[0] ?? "")).toBeLessThan(
          reordered.indexOf("- Spec review: PASS"),
        );
        const issues = await unresolved(root, reordered, { surfaceArtifacts: CAPTURES });
        expect(issues).toEqual([]);
      });
    });
    it("refuses a manifest entry that is not a path under the evidence tree", async () => {
      // Dropped beside a valid capture, the entry left part of the manifest out
      // of the hash, so replacing that file moved nothing.
      for (const entry of ["/tmp/screen.png", "../outside/screen.png", "docs/screen.png"]) {
        await withProject(async (root) => {
          const [issue] = await unresolved(root, verdictEntry([SCREENSHOT, entry]), {
            surfaceArtifacts: { [SCREENSHOT]: CAPTURES[SCREENSHOT] },
          });
          expect(issue?.message, entry).toContain(
            `Surface artifacts naming repository-relative paths under .qfai/evidence/, not ${entry}`,
          );
        });
      }
    });

    it("orders capture records by the bytes of their paths", async () => {
      // A supplementary-plane name and a high BMP name sort one way by UTF-16
      // code unit and the other way by UTF-8 byte. A reviewer ordering by path
      // bytes, as the contract says, computed a hash the gate did not.
      const high = `.qfai/evidence/prototyping/${String.fromCodePoint(0xff21)}.png`;
      const astral = `.qfai/evidence/prototyping/${String.fromCodePoint(0x1f600)}.png`;
      const captures = { [high]: Buffer.from([1]), [astral]: Buffer.from([2]) };
      await withProject(async (root) => {
        const issues = await unresolved(root, verdictEntry([high, astral]), {
          surfaceArtifacts: captures,
        });
        expect(issues).toEqual([]);
      });
    });
    it("reads the parity pack as the product-surface-reviewer's own verdict", async () => {
      await withProject(async (root) => {
        const [issue] = await unresolved(root, verdictEntry(), {
          surfaceArtifacts: CAPTURES,
          requestOnlyPassRole: "product-surface-reviewer",
        });
        expect(issue?.message).toContain("Prototype parity review pack carrying request");
      });
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
      expect(codes).not.toContain("QFAI-TDDLIST-011");
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
        expect(codes).not.toContain("QFAI-TDDLIST-011");
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
  // POSIX only: Windows has no executable bit, and `fs.chmod` there only
  // toggles the read-only attribute — so the hash input never changes and the
  // row could only ever report `expected false to be true`.
  it.skipIf(process.platform === "win32")(
    "stales the RED test hash when the executable bit changes",
    async () => {
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
    },
  );

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

  describe("Checkpoint verification revision", () => {
    const FINAL_TREE = "fed9870000000000000000000000000000000000";
    const sealedOver = (sealRevision: string, checkpointRevision = FINAL_TREE): string =>
      completeEntry("Unit").replace(
        "- Checkpoint verification seal: {{CHECKPOINT_SEAL}}",
        [
          `- Checkpoint verification revision: ${checkpointRevision}`,
          `- Checkpoint verification seal: ${checkpointSeal(sealRevision, "npm test", "PASS")}`,
        ].join("\n"),
      );
    const unresolvedFor = async (root: string, evidence: string) =>
      (
        await runIssuesOn(root, ledger([{ status: "done", evidence: IMPLEMENT_POINTER }]), {
          ".qfai/evidence/implement-spec-0001.md": evidence,
        })
      ).find((issue) => issue.code === "QFAI-TDDLIST-008");

    it("recomputes the seal over the run's own revision, not the round's", async () => {
      // The round names the tree before the refactor and the checkpoint runs on
      // the tree after it. Sealed as the contract says, the row is complete.
      await withProject(async (root) => {
        expect(await unresolvedFor(root, sealedOver(FINAL_TREE))).toBeUndefined();
      });
    });

    it("refuses a seal taken over the round's Revision beside a checkpoint revision", async () => {
      await withProject(async (root) => {
        const found = await unresolvedFor(root, sealedOver(DEFAULT_REVISION));
        expect(found?.message).toContain(
          "Checkpoint verification seal matching command, result, and Checkpoint verification revision",
        );
      });
    });

    it("refuses a checkpoint revision changed after the seal was taken", async () => {
      await withProject(async (root) => {
        const moved = "0123450000000000000000000000000000000000";
        const found = await unresolvedFor(root, sealedOver(FINAL_TREE, moved));
        expect(found?.message).toContain("Checkpoint verification seal matching");
      });
    });

    it("refuses a checkpoint revision that names no revision", async () => {
      await withProject(async (root) => {
        const found = await unresolvedFor(root, sealedOver("latest", "latest"));
        expect(found?.message).toContain("Checkpoint verification revision naming");
      });
    });

    it("takes the seal input the contract spells", async () => {
      // The contract names the checkpoint revision as the seal's `Revision` line.
      // Built from that text, a seal the gate computes some other way fails here.
      const contract = (
        await readFile(
          path.join(
            __dirname,
            "..",
            "..",
            "assets",
            "init",
            ".qfai",
            "assistant",
            "skills",
            "qfai-implement",
            "references",
            "checkpoint-verification.md",
          ),
          "utf-8",
        )
      ).replace(/\s+/g, " ");
      expect(contract).toContain(
        "The `Revision` line carries `Checkpoint verification revision`, never a round's `Revision`",
      );
      const lines = [
        ...contract.matchAll(
          /`((?:Revision|Checkpoint verification (?:command|result))): <value>`/g,
        ),
      ].map((match) => match[1]);
      expect(lines).toEqual([
        "Revision",
        "Checkpoint verification command",
        "Checkpoint verification result",
      ]);
      const values = [FINAL_TREE, "npm test", "PASS"];
      const input = lines.map((label, index) => `${label}: ${values[index]}`).join("\n");
      const evidence = completeEntry("Unit").replace(
        "- Checkpoint verification seal: {{CHECKPOINT_SEAL}}",
        [
          `- Checkpoint verification revision: \`${FINAL_TREE}\``,
          `- Checkpoint verification seal: ${digest(normalizeArtifact(input))}`,
        ].join("\n"),
      );
      await withProject(async (root) => {
        expect(await unresolvedFor(root, evidence)).toBeUndefined();
      });
    });
  });

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
      expect(found?.message).toContain(
        "Revision naming a git rev or working-tree+<64 lowercase hex>",
      );
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

  it("reports a done row whose Evidence carries no anchor", async () => {
    await withProject(async (root) => {
      const codes = await runOn(root, ledger([{ status: "done", evidence: OUTCOME_ONLY }]));
      expect(codes).toContain("QFAI-TDDLIST-007");
      const issues = await validateTddList(root, defaultConfig);
      const found = issues.find((i) => i.code === "QFAI-TDDLIST-007");
      expect(found?.severity).toBe("error");
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

  // An empty cell is one defect, not two.
  it("does not double-report with TDDLIST_EVIDENCE_EMPTY", async () => {
    await withProject(async (root) => {
      const codes = await runOn(root, ledger([{ status: "done", evidence: "-" }]));
      expect(codes).toContain("TDDLIST_EVIDENCE_EMPTY");
      expect(codes).not.toContain("QFAI-TDDLIST-011");
    });
  });

  it("is waivable, so legacy ledgers migrate instead of breaking", async () => {
    await withProject(async (root) => {
      await runOn(root, ledger([{ status: "done", evidence: "RED -> GREEN", tddId: "TDD-0042" }]));
      const issues = await validateTddList(root, defaultConfig);
      const found = issues.find((i) => i.code === "QFAI-TDDLIST-011");
      expect(found?.severity).toBe("error");
      expect(found?.rule).toBe(EVIDENCE_CELL_MALFORMED_RULE_ID);
      expect(found?.message).toContain("TDD-0042");
    });
  });
});

describe("QFAI-TDDLIST-012", () => {
  // The observed failure: a mean cell of 1,196 characters against a contract
  // whose own example is 95.
  const OVERSIZE = `RED:fail GREEN:pass ORACLE:proved REV:a1b2c3d -> ${"x".repeat(240)}`;

  it("reports a cell past the cap", async () => {
    await withProject(async (root) => {
      const codes = await runOn(root, ledger([{ status: "done", evidence: OVERSIZE }]));
      expect(codes).toContain("QFAI-TDDLIST-012");
    });
  });

  // Two findings on one cell would make the cap look like a second defect.
  it("does not double-report with QFAI-TDDLIST-011", async () => {
    await withProject(async (root) => {
      const codes = await runOn(root, ledger([{ status: "done", evidence: "y".repeat(400) }]));
      expect(codes).toContain("QFAI-TDDLIST-012");
      expect(codes).not.toContain("QFAI-TDDLIST-011");
    });
  });

  it("stays silent on a pointer inside the cap", async () => {
    await withProject(async (root) => {
      const codes = await runOn(root, ledger([{ status: "done", evidence: POINTER }]));
      expect(codes).not.toContain("QFAI-TDDLIST-012");
    });
  });

  it("is waivable", async () => {
    await withProject(async (root) => {
      await runOn(root, ledger([{ status: "done", evidence: OVERSIZE }]));
      const issues = await validateTddList(root, defaultConfig);
      const found = issues.find((i) => i.code === "QFAI-TDDLIST-012");
      expect(found?.severity).toBe("error");
      expect(found?.rule).toBe(EVIDENCE_CELL_OVERSIZE_RULE_ID);
    });
  });

  // A **binding** breach is not a length breach, and unlike prose it is not
  // waivable under the migration story: `execution-ledger.md#atdd-owned-rows`
  // says of ATDD-owned RED provenance "There is no waiver here". Reporting
  // only the cap let a long anchor carry the violation past `QFAI-TDDLIST-012`.
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
      expect(codes).toContain("QFAI-TDDLIST-012");
      expect(codes).toContain("QFAI-TDDLIST-013");
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
      expect(codes).toContain("QFAI-TDDLIST-012");
      expect(codes).toContain("QFAI-TDDLIST-011");
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
        expect(codes).toContain("QFAI-TDDLIST-011");
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
      const found = issues.find((i) => i.code === "QFAI-TDDLIST-011");
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
        expect(codes).not.toContain("QFAI-TDDLIST-011");
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
        expect(codes).not.toContain("QFAI-TDDLIST-011");
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
      expect(codes).toContain("QFAI-TDDLIST-011");
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
      expect(codes).not.toContain("QFAI-TDDLIST-011");
    });
  });

  for (const [label, fragment] of [
    ["another row's section", "tdd-0001"],
    ["a fragment that names no section", "garbage"],
  ] as const) {
    it(`reports ${label}`, async () => {
      await withProject(async (root) => {
        const codes = await runOn(root, ledger(row("TDD-0007", fragment)));
        expect(codes).toContain("QFAI-TDDLIST-011");
        // Still shaped like a pointer, so the status-only rule stays quiet.
        expect(codes).not.toContain("TDDLIST_EVIDENCE_STATUS_ONLY");
      });
    });
  }

  it("names the fragment the row owes", async () => {
    await withProject(async (root) => {
      await runOn(root, ledger(row("TDD-0007", "tdd-0001")));
      const issues = await validateTddList(root, defaultConfig);
      const found = issues.find((i) => i.code === "QFAI-TDDLIST-011");
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
      expect(codes).not.toContain("QFAI-TDDLIST-011");
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
        expect(codes).toContain("QFAI-TDDLIST-011");
      });
    });
  }

  it("names the marker as the cause", async () => {
    await withProject(async (root) => {
      await runOn(root, ledger(withMarker("Unit", "implement")));
      const issues = await validateTddList(root, defaultConfig);
      const found = issues.find((i) => i.code === "QFAI-TDDLIST-011");
      expect(found?.message).toContain("Pre-split-evidence: implement");
      expect(found?.message).toContain("cannot be pre-split");
    });
  });

  for (const layer of ["E2E", "API"] as const) {
    it(`accepts the marker licensing an implement anchor on a Layer=${layer} row`, async () => {
      await withProject(async (root) => {
        const codes = await runOn(root, ledger(withMarker(layer, "implement")));
        expect(codes).not.toContain("QFAI-TDDLIST-011");
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
describe("QFAI-TDDLIST-014", () => {
  const conforming =
    "RED:fail GREEN:pass ORACLE:proved REV:a1b2c3d -> `.qfai/evidence/implement-spec-0001.md#tdd-0001`";

  it("reports a surplus cell holding the payload the cap forbids", async () => {
    await withProject(async (root) => {
      const codes = await runOn(
        root,
        `${ledger([{ status: "done", evidence: conforming }]).trimEnd()} ${"x".repeat(1000)} |\n`,
      );
      expect(codes).toContain("QFAI-TDDLIST-014");
      // The declared Evidence cell is conforming: without this rule the row
      // drew no finding at all.
      expect(codes).not.toContain("QFAI-TDDLIST-011");
      expect(codes).not.toContain("QFAI-TDDLIST-012");
    });
  });

  it("stays quiet on a row whose cells match the header", async () => {
    await withProject(async (root) => {
      const codes = await runOn(root, ledger([{ status: "done", evidence: conforming }]));
      expect(codes).not.toContain("QFAI-TDDLIST-014");
    });
  });

  it("names the counts and its waiver rule id", async () => {
    await withProject(async (root) => {
      await runOn(
        root,
        `${ledger([{ status: "done", evidence: conforming }]).trimEnd()} surplus |\n`,
      );
      const issues = await validateTddList(root, defaultConfig);
      const found = issues.find((i) => i.code === "QFAI-TDDLIST-014");
      expect(found?.rule).toBe(ROW_EXTRA_CELLS_RULE_ID);
      // The header this fixture writes declares ten columns, so one surplus
      // cell makes eleven. Counted from the header rather than written as a
      // literal pair, so widening the ledger does not silently make the
      // assertion about a different row shape.
      const columns = HEADER.trim().split("\n").at(-2)?.split("|").slice(1, -1).length ?? 0;
      expect(found?.message).toContain(`${columns + 1} cells`);
      expect(found?.message).toContain(`${columns} columns`);
    });
  });

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

/**
 * The backfill shape `execution-ledger.md` sanctions, and the gate that reads it.
 *
 * The contract says that where a `done` row's original run is genuinely gone,
 * the loss is itself the thing to record: an evidence entry stating what was run
 * and that its output was not retained. `QFAI-TDDLIST-008` then judged that entry
 * against a completed-evidence set that includes three seals and two review packs.
 * A gone run produced no review pack, so there was no seal to record and none that
 * could honestly be written — the sanctioned shape and the gate could not both be
 * satisfied, and the backfill was unreachable.
 *
 * These rows fix the boundary in both directions: what a backfilled entry stops
 * owing, and what it still owes.
 */
describe("a backfilled entry whose run output was not retained", () => {
  const POINTER =
    "RED:fail GREEN:pass ORACLE:proved REV:abc1230 -> `.qfai/evidence/implement-spec-0001.md#tdd-0001`";

  /** Everything a re-run of the test can produce, and nothing a review would. */
  function backfilledEntry(extra = "", retained = "no"): string {
    return `# Evidence

### TDD-0001

- TDD-ID: TDD-0001
- Layer: Unit
- Test file: tests/unit/sample.test.ts
- Selector: sample
- TC-ref: TC-0001
- Round 1: Revision: abc1230000000000000000000000000000000000
- Round 1: RED revision: def4560000000000000000000000000000000000
- RED failure mode: assertion
- Round 1: RED command: npm test
- Round 1: RED result: 1 failed
- Round 1: GREEN command: npm test
- Round 1: GREEN result: 1 passed
- Oracle proof: equivalent-mutant — TC-0001 permits any non-empty result
- Refactor verify command: npm test
- Refactor verify result: 1 passed
- Checkpoint verification command: npm test
- Checkpoint verification result: PASS
- Run output retained: ${retained}
- Backfill note: re-run at this revision; the original cycle's output was not retained
${extra}`;
  }

  const run = async (entry: string): Promise<Array<{ code: string; message: string }>> => {
    let issues: Array<{ code: string; message: string }> = [];
    await withProject(async (root) => {
      issues = await runIssuesOn(root, ledger([{ status: "done", evidence: POINTER }]), {
        ".qfai/evidence/implement-spec-0001.md": entry,
      });
    });
    return issues;
  };

  it("is accepted without the reviewer-pack and seal fields", async () => {
    const issues = await run(backfilledEntry());
    expect(
      issues.filter((issue) => issue.code === "QFAI-TDDLIST-008"),
      "the sanctioned shape must be reachable",
    ).toEqual([]);
  });

  it("would not be accepted without the declaration", async () => {
    // Falsifiability for the row above: the same entry, minus the one line that
    // declares the loss, is the case the gate has always rejected.
    const issues = await run(backfilledEntry("", "yes"));
    const unresolved = issues.find((issue) => issue.code === "QFAI-TDDLIST-008");
    expect(unresolved, "an ordinary entry still owes the full set").toBeDefined();
    expect(unresolved?.message).toContain("Spec review pack seal");
  });

  it("reads only the exact declaration, not anything that mentions retention", async () => {
    // The switch is a value, not a topic. Prose that happens to discuss the run's
    // output must not exempt a row from the verdicts.
    const issues = await run(backfilledEntry("", "partially, see the note"));
    expect(
      issues.some((issue) => issue.code === "QFAI-TDDLIST-008"),
      "only `no` declares the loss",
    ).toBe(true);
  });

  it("still owes everything a re-run produces", async () => {
    // The exemption covers what a gone run cannot yield, and nothing else.
    for (const field of [
      "- RED failure mode: assertion",
      "- Refactor verify result: 1 passed",
      "- Checkpoint verification result: PASS",
      "- Selector: sample",
    ]) {
      const issues = await run(backfilledEntry().replace(`${field}\n`, ""));
      const unresolved = issues.find((issue) => issue.code === "QFAI-TDDLIST-008");
      expect(unresolved, `dropping "${field}" must still fail`).toBeDefined();
    }
  });

  it("owes a note saying what was run and what was lost", async () => {
    const issues = await run(
      backfilledEntry().replace(
        "- Backfill note: re-run at this revision; the original cycle's output was not retained\n",
        "",
      ),
    );
    const unresolved = issues.find((issue) => issue.code === "QFAI-TDDLIST-008");
    expect(unresolved, "a declared loss with no account of it is not a record").toBeDefined();
    expect(unresolved?.message).toContain("Backfill note");
  });

  it("is reported, so the exemption is counted rather than silent", async () => {
    // `done` is read as reviewed. A row exempt from the verdicts must not be
    // indistinguishable, in the output an operator reads, from one that has them.
    const issues = await run(backfilledEntry());
    const reported = issues.find((issue) => issue.code === "QFAI-TDDLIST-019");
    expect(reported, "a silent exemption is one nobody reviews").toBeDefined();
    expect(reported?.message).toContain("cannot be verified from artifacts");
  });

  it("says nothing about an entry that carries its verdicts", async () => {
    // Over-correction pin: the report must key on the declaration, not fire on
    // every completed row.
    const issues = await run(backfilledEntry("", "yes"));
    expect(issues.some((issue) => issue.code === "QFAI-TDDLIST-019")).toBe(false);
  });
});
