import { execFileSync } from "node:child_process";
import path from "node:path";

import type { AtddCodeTraceabilityResult } from "../atddTraceability.js";
import type { GitignoreLayer } from "../gitignore.js";
import { isPathIgnoredByLayers } from "../gitignore.js";
import { newRuleSeverity, RULE_PROMOTIONS } from "../sunset.js";
import { collectLedgerTables, isLedgerRow } from "../tddHelpers.js";
import type { Issue } from "../types.js";
import { resolveToolVersion } from "../version.js";
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
 * Every matrix path the index already tracks, read from git in one call.
 *
 * `.gitignore` does not untrack anything. A matrix committed before a matching
 * ignore line arrived stays in history, and its later edits still stage the
 * normal way — so the audit record `QFAI-ATDD-132` exists to protect is intact,
 * and failing `--fail-on error` on it would block a project for a state git
 * itself considers fine.
 *
 * One listing, not one `git ls-files --error-unmatch` per spec: a project whose
 * legacy ignore block swallows every matrix asked the question once per spec
 * from inside the loop, so a hundred specs meant a hundred synchronous process
 * spawns and a `validate` that slowed down in proportion to the spec count. The
 * listing is scoped to `.qfai/evidence`, the only directory a matrix can live
 * in, and `git ls-files` prints its paths relative to the working directory —
 * the same project-relative frame {@link coverageDepthRelPath} produces, in a
 * monorepo subdirectory too.
 *
 * A repository git cannot answer for — no `git` on `PATH`, no repository at
 * `root` — reads as an empty set, which keeps the finding for exactly the
 * projects where nothing proves the file reached a commit.
 */
function trackedEvidencePaths(root: string): ReadonlySet<string> {
  try {
    const listing = execFileSync("git", ["ls-files", "-z", "--", EVIDENCE_DIR_REL], {
      cwd: root,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
      // A truncated listing would throw and read as "nothing is tracked", which
      // turns into spurious errors; the evidence directory never comes close.
      maxBuffer: 32 * 1024 * 1024,
    });
    return new Set(listing.split("\0").filter((entry) => entry.length > 0));
  } catch {
    return new Set();
  }
}

/**
 * Every `## Coverage Depth Matrix` section body, in document order.
 *
 * All of them, not the first: an evidence file may carry the heading twice, and
 * reading only the first one meant a well-formed section could be placed on top
 * of a second that inlines the table — both render, and the gate saw the half
 * that was clean.
 */
function matrixSections(content: string): string[][] {
  const sections: string[][] = [];
  let body: string[] | null = null;
  for (const line of content.replace(/\r\n/g, "\n").split("\n")) {
    if (MATRIX_HEADING_RE.test(line)) {
      body = [];
      sections.push(body);
      continue;
    }
    if (/^#{1,6}\s/.test(line)) {
      body = null;
      continue;
    }
    body?.push(line);
  }
  return sections;
}

/**
 * A GFM delimiter row: `| --- | :-: |`, `--- | ---`, `|---|`.
 *
 * The pipe is required even when the cells are: GFM asks a one-column table for
 * `|---|`, which is what keeps a `---` thematic break — and a setext underline —
 * from reading as a table.
 */
function isDelimiterRow(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes("|")) {
    return false;
  }
  return trimmed
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .every((cell) => /^\s*:?-+:?\s*$/.test(cell));
}

/**
 * A markdown table — the shape the section must not carry.
 *
 * Leading and trailing pipes are optional in GFM, so a test anchored on a line
 * that starts with `|` saw no table in
 *
 * ```md
 * Obligation | Layer
 * --- | ---
 * ```
 *
 * which renders as one, and is exactly where the justifications end up. What no
 * table can omit is the delimiter row directly under its header, so that pair
 * is what this looks for — with the leading-pipe row kept as its own case,
 * since a table split across the section boundary can present a body row alone.
 */
function hasTableRow(body: readonly string[]): boolean {
  return body.some(
    (line, index) =>
      line.trim().startsWith("|") ||
      (isDelimiterRow(line) && (body[index - 1] ?? "").trim().length > 0),
  );
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
 *
 * A leading `/` is neither of those and is not re-based onto the evidence
 * directory. Markdown resolves it against the site or repository root, so
 * `[matrix](/coverage-depth-spec-0001.md)` points at a top-level file that does
 * not exist; prefixing it silently rewrote a broken link into the very path the
 * gate is looking for. Read from the root instead, which is where the link
 * itself points, so only a reference that names the matrix from there passes.
 */
function resolveReference(candidate: string): string {
  const cleaned = candidate
    .trim()
    .replace(/\\/g, "/")
    .replace(/[#?].*$/, "");
  const base =
    cleaned.startsWith("/") || cleaned.startsWith(`${EVIDENCE_DIR_REL}/`)
      ? cleaned.replace(/^\//, "")
      : `${EVIDENCE_DIR_REL}/${cleaned}`;
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

/**
 * The sentence a finding inside its promotion window adds to its own message.
 *
 * Empty once the window has closed: at that point the severity is the finding's
 * settled one, and a note about a release that has already happened would read
 * as a reprieve the operator no longer has.
 */
function windowNote(severity: "warning" | "error", promoteAt: string): string {
  return severity === "warning"
    ? ` ${promoteAt} リリースまでは warning、それ以降は error として報告されます。`
    : "";
}

export async function validateAtddCoverageDepth(
  root: string,
  result: AtddCodeTraceabilityResult,
): Promise<Issue[]> {
  // All three codes are new, so none of them may carry a severity literal:
  // each takes it from its own `RULE_PROMOTIONS` pin, read once per run.
  // `resolveToolVersion` resolves rather than rejects — an unreadable version
  // reads as inside the window, so it can never escalate one of these into a
  // build failure.
  const version = await resolveToolVersion();
  const matrixMissingSeverity = newRuleSeverity(
    version,
    RULE_PROMOTIONS.atddCoverageDepthMatrixMissing.promoteAt,
  );
  const matrixIgnoredSeverity = newRuleSeverity(
    version,
    RULE_PROMOTIONS.atddCoverageDepthMatrixIgnored.promoteAt,
  );
  const inlineMatrixSeverity = newRuleSeverity(
    version,
    RULE_PROMOTIONS.atddCoverageDepthInlineMatrix.promoteAt,
  );

  const issues = await matrixFileIssues(
    root,
    await specsWithAtddTests(result),
    matrixMissingSeverity,
    matrixIgnoredSeverity,
  );
  issues.push(...(await stageEvidenceIssues(root, result, inlineMatrixSeverity)));
  return issues;
}

/** `QFAI-ATDD-131` and `-132` over every spec that owes a matrix. */
async function matrixFileIssues(
  root: string,
  specs: ReadonlyArray<readonly [string, string]>,
  matrixMissingSeverity: "warning" | "error",
  matrixIgnoredSeverity: "warning" | "error",
): Promise<Issue[]> {
  const issues: Issue[] = [];
  const ignoreScope = await readIgnoreScope(root);
  // Asked of git only once a layer has actually called some matrix ignored, so
  // a healthy project never spawns the process at all.
  let tracked: ReadonlySet<string> | undefined;

  for (const [specId, specDir] of specs) {
    const matrixRel = coverageDepthRelPath(specId);
    if (!(await exists(path.join(root, matrixRel)))) {
      issues.push(missingMatrixIssue(specId, specDir, matrixRel, matrixMissingSeverity));
      continue;
    }
    if (!isPathIgnoredByLayers(ignoreScope.layers, ignoreScope.toIgnorePath(matrixRel))) {
      continue;
    }
    tracked ??= trackedEvidencePaths(root);
    if (!tracked.has(matrixRel)) {
      issues.push(ignoredMatrixIssue(specId, specDir, matrixRel, matrixIgnoredSeverity));
    }
  }
  return issues;
}

/**
 * `QFAI-ATDD-131`: the spec has ATDD-owned tests and no matrix file.
 *
 * The severity comes from the pin rather than a literal: the obligation is per
 * ATDD stage run, and a spec whose tests were annotated before the matrix
 * became a Mandatory Output would otherwise fail a gate retroactively. The
 * window is what gives such a repository a release to produce the matrices in;
 * after it the absence is an error, and `--fail-on warning` blocks on it
 * before then for projects that want it sooner.
 */
function missingMatrixIssue(
  specId: string,
  specDir: string,
  matrixRel: string,
  matrixMissingSeverity: "warning" | "error",
): Issue {
  return issue(
    "QFAI-ATDD-131",
    `${specId}: ATDD 対象テストがあるのに Coverage Depth Matrix (${matrixRel}) がありません。` +
      windowNote(matrixMissingSeverity, RULE_PROMOTIONS.atddCoverageDepthMatrixMissing.promoteAt),
    matrixMissingSeverity,
    specDir,
    "atddCoverageDepth.matrixMissing",
    [specId],
    "change",
    `${matrixRel} に Coverage Depth Matrix を作成し、❌ セルには根拠を併記してください（\`.qfai/assistant/skills/qfai-atdd/references/test-case-depth-checklist.md\`）。`,
    { relatedFiles: [matrixRel] },
  );
}

/**
 * `QFAI-ATDD-132`: the matrix exists, is ignored, and git does not track it.
 *
 * The finding itself is unambiguous — the file exists, so the stage ran and
 * produced the judgement, and the ignore rule is what deletes that judgement
 * from history. The severity still comes from the pin: the ignore line it
 * lands on was written before anything asked for the matrix, so shipping it
 * straight at `error` would turn an existing `.gitignore` into a hard gate in
 * one upgrade.
 */
function ignoredMatrixIssue(
  specId: string,
  specDir: string,
  matrixRel: string,
  matrixIgnoredSeverity: "warning" | "error",
): Issue {
  return issue(
    "QFAI-ATDD-132",
    `${specId}: Coverage Depth Matrix (${matrixRel}) が .gitignore で除外されています。` +
      windowNote(matrixIgnoredSeverity, RULE_PROMOTIONS.atddCoverageDepthMatrixIgnored.promoteAt),
    matrixIgnoredSeverity,
    matrixRel,
    "atddCoverageDepth.matrixIgnored",
    [specId],
    "change",
    "`qfai init` で managed `.gitignore` ブロックを更新するか、`!.qfai/evidence/coverage-depth-*.md` より後ろにある ignore 行を外してください（git は最後に一致した行を採用し、深い階層の `.gitignore` — 例えば `.qfai/evidence/.gitignore` — が上位を上書きします）。",
    { relatedFiles: [specDir] },
  );
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

/**
 * The first problem any `## Coverage Depth Matrix` section in the file has.
 *
 * Every section, because the heading can appear more than once and a reader
 * sees them all: a clean link-and-totals section placed first used to hide an
 * inline table in a second one further down, which is the whole shape the gate
 * exists to stop — the table and its justifications left in a file the ignore
 * rules keep out of history. The occurrence is named when there is more than
 * one, since the message otherwise points at a section that is fine.
 */
function fileProblem(
  sections: ReadonlyArray<readonly string[]>,
  evidenceRel: string,
  matrixRel: string,
): string | null {
  if (sections.length === 0) {
    return sectionProblem(null, evidenceRel, matrixRel);
  }
  for (const [index, body] of sections.entries()) {
    const problem = sectionProblem(body, evidenceRel, matrixRel);
    if (problem === null) {
      continue;
    }
    return sections.length === 1 ? problem : `${problem}（${index + 1} 個目の同名セクション）`;
  }
  return null;
}

/**
 * `QFAI-ATDD-133` over every spec whose ATDD stage evidence file exists.
 *
 * The severity comes from the pin for the same reason as `-131`: the section
 * shape is a template that post-dates the evidence files it lands on.
 */
async function stageEvidenceIssues(
  root: string,
  result: AtddCodeTraceabilityResult,
  inlineMatrixSeverity: "warning" | "error",
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
    const sections = matrixSections(await readSafe(path.join(root, evidenceRel)));
    const matrixRel = coverageDepthRelPath(specId);
    const problem = fileProblem(sections, evidenceRel, matrixRel);
    if (problem === null) {
      continue;
    }
    issues.push(
      issue(
        "QFAI-ATDD-133",
        `${specId}: ${problem}。このセクションは ${matrixRel} へのリンクと集計だけにしてください。` +
          windowNote(inlineMatrixSeverity, RULE_PROMOTIONS.atddCoverageDepthInlineMatrix.promoteAt),
        inlineMatrixSeverity,
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
