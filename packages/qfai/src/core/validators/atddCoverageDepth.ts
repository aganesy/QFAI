import { execFileSync } from "node:child_process";
import path from "node:path";

import type { AtddCodeTraceabilityResult } from "../atddTraceability.js";
import type { GitignoreLayer } from "../gitignore.js";
import { isPathIgnoredByLayers } from "../gitignore.js";
import { collectLedgerTables, isLedgerRow } from "../tddHelpers.js";
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
 * - the file exists for every spec that has ATDD-owned tests — E2E, Integration
 *   and API alike, the last resolved through the spec's ledger because an API
 *   test names a contract and never a spec;
 * - it is not swallowed by `.gitignore` — every file in the chain from the git
 *   worktree root down, the legacy `.qfai/evidence/.gitignore` included, and
 *   not already tracked in the index, so the claim that the matrix and its
 *   justifications are committed is falsified the way git would falsify it;
 * - the stage evidence links it and states the totals instead of inlining the
 *   table, which is the exact shape that puts the justifications inside an
 *   ignored file.
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

/** The ledger column an `API` row records its obligation in. */
const CON_API_REFS_COLUMN = "CON-API-Refs";

const CON_API_ID_RE = /CON-API-[A-Za-z0-9][A-Za-z0-9._-]*/g;

/**
 * Spec numbers whose ledger claims an API test that a scan actually found.
 *
 * `Layer = API` is ATDD-owned
 * (`qfai-implement/references/execution-ledger.md#ATDD-owned-rows`), but an API
 * test carries only `QFAI:CON-API-*` — `catalog/test-layers.md` forbids a
 * spec-scoped `TC-*` there — so `result.refs.api` is keyed by contract id and
 * names no spec at all. Reading US/TC refs alone therefore left an API-only
 * spec outside the gate: its matrix could be missing or ignored and neither
 * `QFAI-ATDD-131` nor `-132` had anything to fire on.
 *
 * The ledger is what joins the two. A row's `CON-API-Refs` cell is the spec's
 * own declaration that it owns that contract's test, and the row counts only
 * when the scan found a file for the id — the same "a test exists" bar the
 * US/TC side applies, rather than "an obligation was written down".
 */
async function specNumbersWithApiTests(
  result: AtddCodeTraceabilityResult,
): Promise<ReadonlySet<string>> {
  const owners = new Set<string>();
  const testedApiIds = new Set(
    Array.from(result.refs.api.entries())
      .filter(([, files]) => files.size > 0)
      .map(([id]) => id.toUpperCase()),
  );
  if (testedApiIds.size === 0) {
    return owners;
  }
  for (const [number, specDir] of result.declaredSpecDirs) {
    const ledger = await readSafe(path.join(specDir, "tdd", "test-list.md"));
    if (ledger.length === 0) {
      continue;
    }
    for (const scan of collectLedgerTables(ledger)) {
      const column = scan.headers.indexOf(CON_API_REFS_COLUMN);
      if (column === -1) {
        continue;
      }
      for (const row of scan.table.rows) {
        if (!isLedgerRow(scan, row)) {
          continue;
        }
        const cell = (row[column] ?? "").toUpperCase();
        for (const match of cell.matchAll(CON_API_ID_RE)) {
          if (testedApiIds.has(match[0])) {
            owners.add(number);
          }
        }
      }
    }
  }
  return owners;
}

/** Spec directory name (`spec-0004`) of every spec with an ATDD-owned test. */
async function specsWithAtddTests(
  result: AtddCodeTraceabilityResult,
): Promise<Array<[string, string]>> {
  const numbers = new Set<string>();
  for (const refs of [result.refs.us, result.refs.tc]) {
    for (const [number, byId] of refs) {
      if (byId.size > 0) {
        numbers.add(number);
      }
    }
  }
  for (const number of await specNumbersWithApiTests(result)) {
    numbers.add(number);
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
 * The `.gitignore` chain governing the matrix, plus the path to judge with it.
 *
 * `layers` are relative to the git worktree root — not the QFAI project root —
 * so `toIgnorePath` re-expresses a project-relative path in the same frame
 * before it reaches {@link isPathIgnoredByLayers}.
 */
type IgnoreScope = {
  layers: GitignoreLayer[];
  toIgnorePath: (rel: string) => string;
};

/**
 * The directory git reads the topmost `.gitignore` from, walking up from `root`.
 *
 * `.git` is a directory in a normal clone and a file in a linked worktree or a
 * submodule; either marks the top of the tree. A project with no `.git` above
 * it at all — a temp directory, an unpacked tarball — answers with `root`,
 * which is the pre-existing behaviour and the only defensible one when there is
 * no repository to be a subdirectory of.
 */
async function gitWorktreeRoot(root: string): Promise<string> {
  const start = path.resolve(root);
  let current = start;
  for (;;) {
    if (await exists(path.join(current, ".git"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return start;
    }
    current = parent;
  }
}

/**
 * Every `.gitignore` governing `EVIDENCE_DIR_REL`, root-first, read once per run.
 *
 * Not just the project root's file, in two directions:
 *
 * - **downwards.** `qfai init` still maintains a legacy
 *   `.qfai/evidence/.gitignore` whose first line is `*`
 *   (`cli/commands/init.ts#ensureLegacyEvidenceIgnoreNegations`), and git gives
 *   the deepest matching file the last word — so a root-only read disagrees
 *   with `git check-ignore` in both directions on exactly the projects that
 *   still carry one: the nested `!coverage-depth-*.md` re-includes a matrix the
 *   root block ignores (a false `QFAI-ATDD-132`), and a nested re-ignore hides
 *   one the root block re-included (a missed one).
 * - **upwards.** A QFAI project root is not always the worktree root: in a
 *   monorepo it is `packages/app-a`, and git applies every `.gitignore` from
 *   the worktree root down to the file. A parent rule such as
 *   `packages/<name>/.qfai/evidence/coverage-depth-*.md` really does delete the
 *   matrix from history while a project-root-only enumeration reported nothing.
 *   Walking up also means an ignored ancestor directory — a project root inside
 *   an ignored `vendor/` — is seen, which is how git decides it too.
 *
 * A missing file at any level is not an empty ignore set by accident — it
 * genuinely ignores nothing, which is the right answer for `QFAI-ATDD-132`.
 */
async function readIgnoreScope(root: string): Promise<IgnoreScope> {
  const worktreeRoot = await gitWorktreeRoot(root);
  const above = path
    .relative(worktreeRoot, path.resolve(root))
    .split(path.sep)
    .filter((segment) => segment.length > 0 && segment !== ".");
  const segments = [
    ...above,
    ...EVIDENCE_DIR_REL.split("/").filter((segment) => segment.length > 0),
  ];
  const dirs = ["", ...segments.map((_, index) => segments.slice(0, index + 1).join("/"))];
  const layers = await Promise.all(
    dirs.map(async (dir) => ({
      dir,
      lines: (
        await readSafe(path.join(worktreeRoot, ...dir.split("/").filter(Boolean), ".gitignore"))
      )
        .replace(/\r\n/g, "\n")
        .split("\n"),
    })),
  );
  const prefix = above.length === 0 ? "" : `${above.join("/")}/`;
  return { layers, toIgnorePath: (rel) => `${prefix}${rel}` };
}

/**
 * True when git already tracks `rel`, asked of the index rather than the tree.
 *
 * `.gitignore` does not untrack anything. A matrix committed before a matching
 * ignore line arrived stays in history, and its later edits still stage the
 * normal way — so the audit record `QFAI-ATDD-132` exists to protect is intact,
 * and failing `--fail-on error` on it would block a project for a state git
 * itself considers fine. Asked only about a matrix the layers already called
 * ignored, so at most one probe per spec and none at all on the healthy path.
 *
 * A repository git cannot answer for — no `git` on `PATH`, no repository at
 * `root` — reads as untracked, which keeps the finding for exactly the projects
 * where nothing proves the file reached a commit.
 */
function isTrackedByGit(root: string, rel: string): boolean {
  try {
    execFileSync("git", ["ls-files", "--error-unmatch", "--", rel], {
      cwd: root,
      encoding: "utf-8",
      stdio: ["ignore", "ignore", "ignore"],
    });
    return true;
  } catch {
    return false;
  }
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

/**
 * The three cell verdicts, each with the count the totals line puts after it.
 *
 * The variation selector is optional: `⚠️` is two code points and an author who
 * typed the bare `⚠` meant the same thing.
 *
 * The digit is the point. A presence test for the three signs passed a legend —
 * ``See `…`; Legend: ✅ covered / ⚠ partial / ❌ missing`` — which names the
 * scale and counts nothing, so a section could carry every sign the template
 * asks for and still report no result at all.
 */
const TOTALS_PATTERNS: readonly RegExp[] = ["✅", "⚠", "❌"].map(
  (mark) => new RegExp(`${mark}\\uFE0F?\\s*\\d+`),
);

/**
 * Whether the section carries the totals, not only the link.
 *
 * The template is a reference **and** a tally
 * (`qfai-atdd/SKILL.md`: ``See `…` (committed). Totals: ✅ N / ⚠️ N / ❌ N.``),
 * and the tally is the half a reviewer reads without opening the matrix. A
 * link-only test passed `See coverage-depth-spec-0001.md` — a section that
 * says where the matrix is and nothing about what it found.
 */
function hasTotals(body: readonly string[]): boolean {
  return TOTALS_PATTERNS.every((pattern) => body.some((line) => pattern.test(line)));
}

/**
 * Paths written as paths: a markdown link destination or a code span.
 *
 * Prose is deliberately not a source. A substring test for the file name also
 * accepted `coverage-depth-spec-0001.md.bak` and the sentence
 * 「coverage-depth-spec-0001.md は使用しない」 — a section that mentions the
 * matrix while pointing the reader at something else, or at nothing.
 */
function pathCandidates(body: readonly string[]): string[] {
  const found: string[] = [];
  for (const line of body) {
    for (const match of line.matchAll(/\]\(\s*<?([^)>\s]+)>?/g)) {
      found.push(match[1] ?? "");
    }
    for (const match of line.matchAll(/`([^`]+)`/g)) {
      found.push(match[1] ?? "");
    }
  }
  return found;
}

/**
 * One reference in repo-relative POSIX form, or `""` when it resolves nowhere.
 *
 * Both spellings the evidence file legitimately uses resolve to the same
 * string: the template's repo-relative ``.qfai/evidence/coverage-depth-…`` and
 * a link written relative to the evidence directory the file itself sits in.
 */
function resolveReference(candidate: string): string {
  const cleaned = candidate
    .trim()
    .replace(/\\/g, "/")
    .replace(/[#?].*$/, "");
  const anchored = cleaned.replace(/^\//, "");
  const base = anchored.startsWith(`${EVIDENCE_DIR_REL}/`)
    ? anchored
    : `${EVIDENCE_DIR_REL}/${anchored}`;
  const resolved: string[] = [];
  for (const segment of base.split("/")) {
    if (segment.length === 0 || segment === ".") {
      continue;
    }
    if (segment === "..") {
      resolved.pop();
      continue;
    }
    resolved.push(segment);
  }
  return resolved.join("/");
}

/** Whether the section points at the matrix file itself. */
function referencesMatrix(body: readonly string[], matrixRel: string): boolean {
  return pathCandidates(body).some((candidate) => resolveReference(candidate) === matrixRel);
}

export async function validateAtddCoverageDepth(
  root: string,
  result: AtddCodeTraceabilityResult,
): Promise<Issue[]> {
  const issues: Issue[] = [];
  const ignoreScope = await readIgnoreScope(root);

  for (const [specId, specDir] of await specsWithAtddTests(result)) {
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
    if (
      isPathIgnoredByLayers(ignoreScope.layers, ignoreScope.toIgnorePath(matrixRel)) &&
      !isTrackedByGit(root, matrixRel)
    ) {
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
          "`qfai init` で managed `.gitignore` ブロックを更新するか、`!.qfai/evidence/coverage-depth-*.md` より後ろにある ignore 行を外してください（git は最後に一致した行を採用し、深い階層の `.gitignore` — 例えば `.qfai/evidence/.gitignore` — が上位を上書きします）。",
          { relatedFiles: [specDir] },
        ),
      );
    }
  }

  issues.push(...(await stageEvidenceIssues(root, result)));
  return issues;
}

/**
 * What is wrong with the `## Coverage Depth Matrix` section, or `null`.
 *
 * Four shapes, in the order a reader hits them: no such section at all, the
 * table inlined here instead of in the committed matrix, no reference to the
 * matrix, and a reference with no totals beside it. The section owes both
 * halves — the pointer and the tally — so a link on its own is still a section
 * a reviewer cannot read a coverage summary out of.
 *
 * The absent heading is the same failure as the empty one, not an exemption.
 * `qfai-atdd/SKILL.md` lists it among the evidence file's required sections and
 * gives it a contract the heading cannot carry, so skipping a file that never
 * wrote it let the oldest and most incomplete evidence — the shape with no link
 * to the matrix anywhere — be the one thing `QFAI-ATDD-133` never saw.
 */
function sectionProblem(
  body: readonly string[] | null,
  evidenceRel: string,
  matrixRel: string,
): string | null {
  if (body === null) {
    return `${evidenceRel} に \`## Coverage Depth Matrix\` セクションがありません`;
  }
  if (hasTableRow(body)) {
    return `${evidenceRel} の \`## Coverage Depth Matrix\` に表が直接書かれています`;
  }
  if (!referencesMatrix(body, matrixRel)) {
    return `${evidenceRel} の \`## Coverage Depth Matrix\` が ${matrixRel} を参照していません`;
  }
  if (!hasTotals(body)) {
    return `${evidenceRel} の \`## Coverage Depth Matrix\` に ✅ / ⚠️ / ❌ の集計がありません`;
  }
  return null;
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
    const matrixRel = coverageDepthRelPath(specId);
    const problem = sectionProblem(body, evidenceRel, matrixRel);
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
