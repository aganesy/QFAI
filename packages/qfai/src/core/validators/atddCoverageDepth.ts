import path from "node:path";

import type { AtddCodeTraceabilityResult } from "../atddTraceability.js";
import { isPathIgnored } from "../gitignore.js";
import type { Issue } from "../types.js";
import { exists, issue, readSafe } from "./utils.js";

/**
 * The Coverage Depth Matrix gate.
 *
 * The matrix is a Mandatory Output of the ATDD stage and the reviewer reads it
 * by pathname, but nothing mechanical ever opened that path: an absent matrix
 * was omitted from the audit record list rather than recorded as missing, so it
 * produced a well-formed seal and a clean run. A spec with no matrix and a spec
 * whose matrix has no unjustified cell were indistinguishable to every gate.
 *
 * Three file-level checks, none of which parses the matrix:
 *
 * - the file exists for every spec that has ATDD-owned tests;
 * - it is not swallowed by `.gitignore` — the claim that the matrix and its
 *   justifications are committed, made falsifiable;
 * - the stage evidence links it instead of inlining the table, which is the
 *   exact shape that puts the justifications inside an ignored file.
 */

/** Where both artifacts live. Not configurable; the skills name it literally. */
const EVIDENCE_DIR_REL = ".qfai/evidence";

const MATRIX_HEADING_RE = /^##\s+Coverage Depth Matrix\s*$/;

/** `.qfai/evidence/coverage-depth-spec-0004.md`, repo-relative and POSIX. */
export function coverageDepthRelPath(specId: string): string {
  return `${EVIDENCE_DIR_REL}/coverage-depth-${specId}.md`;
}

/** `.qfai/evidence/atdd-spec-0004.md`, repo-relative and POSIX. */
export function atddEvidenceRelPath(specId: string): string {
  return `${EVIDENCE_DIR_REL}/atdd-${specId}.md`;
}

/** Spec directory name (`spec-0004`) of every spec with an ATDD-owned test. */
function specsWithAtddTests(result: AtddCodeTraceabilityResult): Array<[string, string]> {
  const numbers = new Set<string>();
  for (const refs of [result.refs.us, result.refs.tc]) {
    for (const [number, byId] of refs) {
      if (byId.size > 0) {
        numbers.add(number);
      }
    }
  }
  return Array.from(numbers)
    .sort((left, right) => left.localeCompare(right))
    .flatMap((number) => {
      // The enumerated directory, never `spec-${number}` rebuilt from the
      // number: a `SPEC-0004/` spelling survives `listSpecDirs` verbatim and a
      // synthesised lower-case id would name a matrix file nobody is asked to
      // write. A ref whose spec has no directory is a broken annotation that
      // `QFAI-ATDD-101` / `-102` already own.
      const dir = result.declaredSpecDirs.get(number);
      return dir === undefined ? [] : [[path.basename(dir), dir] as [string, string]];
    });
}

/**
 * Splits `.gitignore` into lines once per run.
 *
 * A missing file is not an empty ignore set by accident — it genuinely ignores
 * nothing, which is the right answer for `QFAI-ATDD-132`.
 */
async function readGitignoreLines(root: string): Promise<string[]> {
  const content = await readSafe(path.join(root, ".gitignore"));
  return content.replace(/\r\n/g, "\n").split("\n");
}

/** The body of the `## Coverage Depth Matrix` section, or `null` when absent. */
function matrixSection(content: string): string[] | null {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const start = lines.findIndex((line) => MATRIX_HEADING_RE.test(line));
  if (start === -1) {
    return null;
  }
  const body: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (/^#{1,6}\s/.test(line)) {
      break;
    }
    body.push(line);
  }
  return body;
}

/** A markdown table row — the shape the section must not carry. */
function hasTableRow(body: readonly string[]): boolean {
  return body.some((line) => line.trim().startsWith("|"));
}

export async function validateAtddCoverageDepth(
  root: string,
  result: AtddCodeTraceabilityResult,
): Promise<Issue[]> {
  const issues: Issue[] = [];
  const ignoreLines = await readGitignoreLines(root);

  for (const [specId, specDir] of specsWithAtddTests(result)) {
    const matrixRel = coverageDepthRelPath(specId);
    if (!(await exists(path.join(root, matrixRel)))) {
      issues.push(
        issue(
          "QFAI-ATDD-131",
          `${specId}: ATDD 対象テストがあるのに Coverage Depth Matrix (${matrixRel}) がありません。`,
          // Warning, not error: the obligation is per ATDD stage run, and a
          // spec whose tests were annotated before the matrix became a
          // Mandatory Output would otherwise fail a gate retroactively. The
          // point of the rule is that absence stops being indistinguishable
          // from a full matrix — a finding does that; `--fail-on warning`
          // turns it into a block for projects that want one.
          "warning",
          specDir,
          "atddCoverageDepth.matrixMissing",
          [specId],
          "change",
          `${matrixRel} に Coverage Depth Matrix を作成し、❌ セルには根拠を併記してください（\`.qfai/assistant/skills/qfai-atdd/references/test-case-depth-checklist.md\`）。`,
          { relatedFiles: [matrixRel] },
        ),
      );
      continue;
    }
    if (isPathIgnored(ignoreLines, matrixRel)) {
      issues.push(
        issue(
          "QFAI-ATDD-132",
          `${specId}: Coverage Depth Matrix (${matrixRel}) が .gitignore で除外されています。`,
          // Error: the file exists, so the stage ran and produced the
          // judgement — and the ignore rule is what deletes that judgement
          // from history. Nothing about it is retroactive or ambiguous.
          "error",
          matrixRel,
          "atddCoverageDepth.matrixIgnored",
          [specId],
          "change",
          "`qfai init` で managed `.gitignore` ブロックを更新するか、`!.qfai/evidence/coverage-depth-*.md` より後ろにある ignore 行を外してください（git は最後に一致した行を採用します）。",
          { relatedFiles: [specDir] },
        ),
      );
    }
  }

  issues.push(...(await stageEvidenceIssues(root, result)));
  return issues;
}

/** `QFAI-ATDD-133` over every spec whose ATDD stage evidence file exists. */
async function stageEvidenceIssues(
  root: string,
  result: AtddCodeTraceabilityResult,
): Promise<Issue[]> {
  const issues: Issue[] = [];
  const specDirs = Array.from(result.declaredSpecDirs.values()).sort((left, right) =>
    left.localeCompare(right),
  );
  for (const specDir of specDirs) {
    const specId = path.basename(specDir);
    const evidenceRel = atddEvidenceRelPath(specId);
    if (!(await exists(path.join(root, evidenceRel)))) {
      continue;
    }
    const body = matrixSection(await readSafe(path.join(root, evidenceRel)));
    if (body === null) {
      continue;
    }
    const matrixRel = coverageDepthRelPath(specId);
    const problem = hasTableRow(body)
      ? `${evidenceRel} の \`## Coverage Depth Matrix\` に表が直接書かれています`
      : body.some((line) => line.includes(`coverage-depth-${specId}.md`))
        ? null
        : `${evidenceRel} の \`## Coverage Depth Matrix\` が ${matrixRel} を参照していません`;
    if (problem === null) {
      continue;
    }
    issues.push(
      issue(
        "QFAI-ATDD-133",
        `${specId}: ${problem}。このセクションは ${matrixRel} へのリンクと集計だけにしてください。`,
        // Warning for the same reason as `-131`: the section shape is a
        // template that post-dates existing evidence files.
        "warning",
        evidenceRel,
        "atddCoverageDepth.inlineMatrix",
        [specId],
        "change",
        `\`See \\\`${matrixRel}\\\` (committed). Totals: ✅ N / ⚠️ N / ❌ N.\` の形に置き換え、表本体は ${matrixRel} に移してください。\`.qfai/evidence/**\` の残りは gitignore されるため、ここに書いた根拠は commit に残りません。`,
        { relatedFiles: [specDir] },
      ),
    );
  }
  return issues;
}
