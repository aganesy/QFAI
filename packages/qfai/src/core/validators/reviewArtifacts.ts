import { execFileSync } from "node:child_process";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

import { isEnoent } from "../fs/errno.js";
import { owningSpecNumber, type SpecScope } from "../specScope.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";
import { QFAI_GITIGNORE_MARKER, QFAI_GITIGNORE_RECOMMENDED_ENTRIES } from "../gitignore.js";

const REVIEW_PACK_DIR_RE = /^review-(\d{17})$/i;
const REVIEWER_FILE_RE = /^R\d+_.+\.md$/i;
const ALLOWED_TARGET_KINDS = new Set(["spec", "discussion"]);
const ALLOWED_VERSIONS = new Set(["1.0", "2.0"]);
const ALLOWED_ROSTER_STATUS = new Set(["PASS", "FAIL", "NA"]);
const ALLOWED_OVERALL_STATUS = new Set(["PASS", "FAIL"]);

/**
 * The two forms `evidence-revision.md` defines, and nothing else.
 *
 * A git rev — abbreviated or full — or `working-tree+` and the SHA-256 the
 * four-step content-address procedure produces. The length is the point: a
 * short suffix is what a `git status --porcelain` digest looks like, and that
 * spelling is forbidden because it does not move when the file under review is
 * edited, which is the one thing the field exists to detect.
 */
const REVISION_FORM = /^(?:[0-9a-f]{7,64}|working-tree\+[0-9a-f]{64})$/i;

/**
 * What a `--spec` run is allowed to judge here.
 *
 * `specScope` is `undefined` for a repo-wide run, which is the whole review
 * tree. `specsRoot` is the configured absolute `specsDir`, needed to read a
 * pack's `target.path` as a spec.
 */
export type ReviewArtifactsScope = {
  specScope: SpecScope | undefined;
  specsRoot: string | undefined;
  /**
   * Absolute `discussionDir`, used to attribute a pack whose `summary.json`
   * cannot be read. Optional: a caller that omits it simply loses that half of
   * the fallback.
   */
  discussionRoot?: string | undefined;
  /**
   * The pack producers the calling profile owns. `undefined` judges every pack,
   * which is what the full-scan profiles want.
   */
  producers?: ReadonlySet<string> | undefined;
};

/**
 * Which stage wrote a pack, declared by the pack itself in `summary.json`.
 *
 * `target.kind` cannot answer this: `qfai-implement` mandates a review pack of
 * its own and its layout reference tells it to write `target.kind: "spec"` with
 * `target.path` on the spec directory — the same two values an SDD pack
 * carries. Selecting the SDD gate's packs by kind therefore also caught every
 * implementation pack, so an implementation worker that had written
 * `review_request.md` and not yet its reviewer files failed
 * `--profile sdd --fail-on error` with `QFAI-REVIEW-004/005` on a downstream
 * pack the SDD cycle has no business gating. The producer is the stable
 * attribute: one value per stage, written once when the pack is created, and
 * unrelated to what the pack points at.
 */
const ALLOWED_PRODUCERS = new Set(["discussion", "sdd", "implement"]);

/** The producers each stage-scoped profile is the gate for. */
export const SDD_PACK_PRODUCERS: ReadonlySet<string> = new Set(["sdd"]);
export const DISCUSSION_PACK_PRODUCERS: ReadonlySet<string> = new Set(["discussion"]);

/**
 * The `target.kind` a producer implies, used to check the two against the tree
 * the pack names — and, in reverse, to place a pack that declares no producer.
 */
function producerKind(producer: string): string | null {
  switch (producer) {
    case "discussion":
      return "discussion";
    case "sdd":
    case "implement":
      return "spec";
    default:
      return null;
  }
}

/**
 * The producer a pack that declares none is treated as, from its `target.kind`.
 *
 * `spec` maps to `sdd` rather than to nothing: a pack written before the
 * producer field existed keeps the gate it had, and an implementation pack that
 * wants out of the SDD gate says so by declaring itself. Guessing the other way
 * would drop every legacy SDD pack out of the gate that mandates it.
 */
function kindProducer(kind: string): string | null {
  switch (kind) {
    case "discussion":
      return "discussion";
    case "spec":
      return "sdd";
    default:
      return null;
  }
}

export async function validateReviewArtifacts(
  root: string,
  scope?: ReviewArtifactsScope,
): Promise<Issue[]> {
  const reviewRoot = path.join(root, ".qfai", "review");
  const issues: Issue[] = [];

  const rootGitignorePath = path.join(root, ".gitignore");
  let hasQfaiGitignore = false;
  let missingRecommendedEntries: string[] = [];
  try {
    const content = await readFile(rootGitignorePath, "utf-8");
    // The marker is the requirement. Which paths a project chooses to ignore
    // is the project's call: `.qfai/evidence/**`, `.qfai/review/**` and
    // `.qfai/discussion/**` hold governance records that a project may
    // legitimately want tracked, and failing validation for tracking your own
    // audit trail is the wrong answer.
    hasQfaiGitignore = content.includes(QFAI_GITIGNORE_MARKER);
    // Searched across the WHOLE file, not just the managed block: an entry the
    // project ignores from its own section satisfies the recommendation just as
    // well, and reporting it as missing would push the author to duplicate a
    // rule they already have. The finding text says ".gitignore" rather than
    // "the managed block" for the same reason.
    missingRecommendedEntries = QFAI_GITIGNORE_RECOMMENDED_ENTRIES.filter(
      (entry) => !content.includes(entry),
    );
  } catch (err: unknown) {
    if (!isEnoent(err)) {
      throw err;
    }
  }

  if (!hasQfaiGitignore) {
    // Fallback: also accept legacy subdirectory .gitignore
    const legacyGitignorePath = path.join(reviewRoot, ".gitignore");
    let hasLegacyGitignore = false;
    try {
      const stats = await stat(legacyGitignorePath);
      hasLegacyGitignore = stats.isFile();
    } catch (err: unknown) {
      if (!isEnoent(err)) {
        throw err;
      }
    }

    if (!hasLegacyGitignore) {
      issues.push(
        issue(
          "QFAI-REVIEW-001",
          "ルート `.gitignore` に QFAI 管理ブロック（`qfai init` が自動生成）用のエントリがありません。",
          "error",
          rootGitignorePath,
          "reviewArtifacts.gitignore",
          undefined,
          "change",
          "`qfai init` を再実行して、ルート `.gitignore` に QFAI 管理ブロック（例: `.qfai/review/*` 等）を追記してください。",
        ),
      );
    }
  }

  if (hasQfaiGitignore && missingRecommendedEntries.length > 0) {
    issues.push(
      issue(
        "QFAI-REVIEW-008",
        `ルート .gitignore に推奨エントリがありません: ${missingRecommendedEntries.join(", ")}`,
        "info",
        rootGitignorePath,
        "reviewArtifacts.gitignoreRecommended",
        [...missingRecommendedEntries],
        "change",
        "意図的に追跡している場合は対応不要です。`qfai init` を再実行しても、削除したエントリは復活しません（管理ブロックの鮮度判定は governance negation の有無と順序だけを見ます）。既定に戻す場合はエントリを手動で追加してください。",
      ),
    );
  }

  const { packs, unrecognized } = await listReviewPackDirs(reviewRoot);
  const specScope = scope?.specScope;
  const specsRoot = scope?.specsRoot;
  const isScopedRun = specScope !== undefined && specsRoot !== undefined;
  const selection: PackSelection = {
    root,
    specsRoot,
    discussionRoot: scope?.discussionRoot,
    specScope: isScopedRun ? specScope : undefined,
    producers: scope?.producers,
  };
  const reviewPackDirs = await selectPacks(packs, selection);

  // Both of the findings below describe `.qfai/review/` as a whole rather than
  // any one pack, so a `--spec` run — one worker's view of one slice — does not
  // raise them: "no pack" would only mean "no pack for this spec", and a
  // mis-named directory is a fact about the tree the unscoped gate owns.
  //
  // Reported before the presence check, so a tree whose only packs are
  // mis-named still says why nothing was inspected. Silence here was the worse
  // half of the same defect: a directory the pattern skips is never opened, so
  // a pack with no `review_request.md` and no `summary.json` produced no
  // finding in ANY profile — indistinguishable from a pack that is complete.
  if (!isScopedRun && unrecognized.length > 0) {
    issues.push(
      issue(
        "QFAI-REVIEW-010",
        `\`.qfai/review/\` に review pack として認識されないディレクトリがあります: ${unrecognized.join(", ")}`,
        "info",
        reviewRoot,
        "reviewArtifacts.packDirName",
        [...unrecognized],
        "canonical",
        "review pack のディレクトリ名は `review-YYYYMMDDhhmmssSSS`（17桁）のみです。一致しないディレクトリは `review_request.md` / `summary.json` / `Rxx_*.md` の検査対象外となり、欠落があっても検出されません。`review-<timestamp>/` にリネームするか、`.qfai/review/` の外へ移動してください。",
      ),
    );
  }
  if (reviewPackDirs.length === 0 && isScopedRun) {
    return issues;
  }
  if (reviewPackDirs.length === 0) {
    issues.push(
      issue(
        "QFAI-REVIEW-002",
        "review 成果物が見つかりません。`review-YYYYMMDDhhmmssSSS/` が未生成のため、このチェックは warning 扱いです。",
        "warning",
        reviewRoot,
        "reviewArtifacts.presence",
        undefined,
        "change",
        "review 実行後に `review_request.md` / `Rxx_*.md` / `summary.json` を含む `review-*` ディレクトリがあることを確認してください。",
      ),
    );
    return issues;
  }

  const legacyPacks = await readLegacyManifest(reviewRoot);
  const revisions = makeRevisionProbe(root);
  for (const packDir of reviewPackDirs) {
    issues.push(...(await validateReviewPack(packDir, legacyPacks, revisions, selection)));
  }

  return issues;
}

/**
 * The packs a migration pass recorded as predating the strict `revision` form.
 *
 * One name per line in `.qfai/review/.legacy-packs`, `#` comments and blanks
 * ignored. Absent means no pack has been migrated, which is the same as an
 * empty list.
 */
async function readLegacyManifest(reviewRoot: string): Promise<ReadonlySet<string>> {
  try {
    const content = await readFile(path.join(reviewRoot, LEGACY_MANIFEST), "utf-8");
    return new Set(
      content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith("#")),
    );
  } catch (err: unknown) {
    if (!isEnoent(err)) throw err;
    return new Set();
  }
}

const LEGACY_MANIFEST = ".legacy-packs";

/** A `revision` that is a git rev rather than the uncommitted-tree form. */
const GIT_REV_FORM = /^[0-9a-f]{7,64}$/i;

/**
 * Whether a `rev` names a commit in the repository at `root`, asked once each.
 *
 * `commitExists` answers `null` when the question cannot be asked — git
 * missing, not a work tree — so the caller says nothing rather than reporting a
 * project that exports its source as a tarball.
 *
 * **A negative answer is a warning, not an error.** A shallow clone, a fetch
 * that never took the branch, or a worktree created after the verdict all
 * produce "not found" for a rev that is perfectly real somewhere else, and
 * failing the gate on that would block work for a condition the operator did
 * not create and often cannot fix locally. What it does catch is the value that
 * names no commit anywhere — a placeholder, a truncated paste, a digit
 * transposed — which is the case the form check alone accepts.
 *
 * One `git` probe per run and per distinct rev, not per pack.
 *
 * `validateReviewArtifacts` walks every `review-*` directory, so a repository
 * that keeps its history spawned two synchronous processes per pack — around
 * 2.2s for a hundred of them, growing with the history, on every full run. The
 * work-tree answer is asked once; each rev is asked once and remembered.
 *
 * Held per call rather than in module state: a validator that cached across
 * runs would answer for the wrong repository in a process that validates two.
 */
type RevisionProbe = { commitExists: (rev: string) => boolean | null };

function makeRevisionProbe(root: string): RevisionProbe {
  let insideWorkTree: boolean | null = null;
  const seen = new Map<string, boolean>();
  const git = (args: string[]): boolean => {
    try {
      execFileSync("git", args, {
        cwd: root,
        encoding: "utf-8",
        stdio: ["ignore", "ignore", "ignore"],
      });
      return true;
    } catch {
      return false;
    }
  };
  return {
    commitExists(rev: string): boolean | null {
      insideWorkTree ??= git(["rev-parse", "--is-inside-work-tree"]);
      if (!insideWorkTree) return null;
      const cached = seen.get(rev);
      if (cached !== undefined) return cached;
      const found = git(["cat-file", "-e", `${rev}^{commit}`]);
      seen.set(rev, found);
      return found;
    },
  };
}

// Which contract wrote this pack, declared by the pack itself and **required**.
//
// Neither rank nor time can answer it. Rank made "held to the contract" mean
// "newest overall", so a malformed pack stopped being an error the moment any
// other spec produced one. A timestamp cutoff is no better: the directory stamp
// carries no timezone, so the same pack classifies differently by region, and
// any instant chosen is either before the contract shipped — letting packs
// written that morning under the old instructions count as current — or after
// it, letting genuinely current packs off.
//
// And an *optional* marker is no better either: a current producer that omits
// it downgrades its own check to a warning, so the strict form becomes opt-in
// and a stale verdict passes `--fail-on error`. So absence is a schema
// violation like any other missing field, and a pack that predates the form
// says `legacy` — written once, from the history, the same shape as the
// `Pre-split-evidence` marker. Until that pass has run the packs are reported
// rather than accepted, which is the safe direction, and running it is what
// clears them: one line per pack, which is the migration the previous "cannot
// be migrated" objection was missing.
const REVISION_FORM_MARKER = "content-hash";
const REVISION_FORM_LEGACY = "legacy";
const ALLOWED_REVISION_FORMS = new Set([REVISION_FORM_MARKER, REVISION_FORM_LEGACY]);

async function validateReviewPack(
  reviewPackDir: string,
  legacyPacks: ReadonlySet<string>,
  revisions: RevisionProbe,
  selection: PackSelection,
): Promise<Issue[]> {
  const issues: Issue[] = [];
  const reviewRequestPath = path.join(reviewPackDir, "review_request.md");
  const summaryPath = path.join(reviewPackDir, "summary.json");

  if (!(await isFile(reviewRequestPath))) {
    issues.push(
      issue(
        "QFAI-REVIEW-003",
        "review pack に `review_request.md` がありません。",
        "error",
        reviewPackDir,
        "reviewArtifacts.reviewRequest",
      ),
    );
  }

  if (!(await isFile(summaryPath))) {
    issues.push(
      issue(
        "QFAI-REVIEW-004",
        "review pack に `summary.json` がありません。",
        "error",
        reviewPackDir,
        "reviewArtifacts.summary",
      ),
    );
  }

  const reviewerFiles = await listReviewerFiles(reviewPackDir);
  // A summary declaring `reviewers: []` says the round produced nothing, deliberately. Both directions
  // are checked, because a one-way rule only moves the hole: a pack that forgot to seal still fails,
  // and a pack whose declaration disagrees with the files beside it fails too.
  //
  // Two questions, and they are NOT the same one. `declaresZeroReviewers` asks whether the pack
  // makes a valid zero-response declaration — v2, empty list, `FAIL` — and it is the right test
  // for excusing a missing report set. It is the WRONG test for the contradiction: review finding
  // [27] showed a v2 pack declaring `reviewers: []` with `overall_status: "PASS"` beside a full
  // set of `Rxx_*.md` answering `false` here, so neither branch fired and the pack was accepted.
  // The contradiction only needs the empty list, whatever else the summary says.
  const summary = await readSummaryRecord(summaryPath);
  const declaredZero = declaresZeroReviewers(summary);
  const declaredEmptyReviewerList = declaresEmptyReviewerList(summary);
  if (reviewerFiles.length === 0 && !declaredZero) {
    issues.push(
      issue(
        "QFAI-REVIEW-005",
        "review pack に `Rxx_*.md` が1件もありません。応答ゼロで終わった回なら " +
          "`summary.json` に `reviewers: []` を宣言してください。",
        "error",
        reviewPackDir,
        "reviewArtifacts.reviewerFiles",
      ),
    );
  }
  if (reviewerFiles.length > 0 && declaredEmptyReviewerList) {
    issues.push(
      issue(
        "QFAI-REVIEW-005",
        "`summary.json` は `reviewers: []`（応答ゼロ）を宣言していますが `Rxx_*.md` が " +
          `${String(reviewerFiles.length)} 件存在します。`,
        "error",
        reviewPackDir,
        "reviewArtifacts.reviewerFiles",
      ),
    );
  }

  if (await isFile(summaryPath)) {
    issues.push(...(await validateSummarySchema(summaryPath, legacyPacks, revisions, selection)));
  }

  return issues;
}

/**
 * `target` and `producer`, each checked on its own **and against each other**.
 *
 * The enum check on `target.kind` and the non-empty check on `target.path` were
 * independent, so a pack could say `kind: "discussion"` while pointing `path` at
 * a spec directory and no profile said a word: the SDD gate skipped it as
 * another stage's business, and a pack holding all three mandated files was
 * otherwise schema-clean. That made the wrong `kind` a way *out* of the gate the
 * pack's own path puts it in. A declaration the tree contradicts is not a
 * target, so it is reported here and refused as an attribution in
 * {@link attributionFromSummary}.
 *
 * Only a path that resolves inside the run's configured `specsDir` or
 * `discussionDir` proves anything. An implementation pack naming a source file,
 * or any run that passed no roots, has nothing to contradict and is left alone.
 */
function targetViolations(parsed: Record<string, unknown>, selection: PackSelection): string[] {
  const violations: string[] = [];
  const target = asRecord(parsed.target);
  // Case-sensitive on purpose, as before: attribution reads `Spec` as `spec` so
  // the pack still faces the right gate, and the schema still says the spelling
  // is wrong rather than quietly accepting two of them.
  const declaredKind = readString(target?.kind);
  const targetPath = readString(target?.path);
  if (declaredKind === null || !ALLOWED_TARGET_KINDS.has(declaredKind)) {
    violations.push("`target.kind` は spec|discussion のいずれかが必須です");
  }
  if (targetPath === null) {
    violations.push("`target.path` は非空文字列が必須です");
  }

  const producer = readString(parsed.producer)?.toLowerCase() ?? null;
  if (producer !== null && !ALLOWED_PRODUCERS.has(producer)) {
    violations.push(
      `\`producer\` は ${[...ALLOWED_PRODUCERS].join("|")} のいずれかが必須です（省略時は \`target.kind\` から推定します）`,
    );
  }

  const proven = targetPath === null ? null : kindFromPath(targetPath, selection);
  if (proven === null) {
    return violations;
  }
  const targetKind = declaredKind?.toLowerCase() ?? null;
  if (targetKind !== null && ALLOWED_TARGET_KINDS.has(targetKind) && targetKind !== proven) {
    violations.push(
      `\`target.kind\` (${targetKind}) が \`target.path\` (${targetPath}) と矛盾しています。このパスは ${proven} を指しています`,
    );
  }
  const declared = producer === null ? null : producerKind(producer);
  if (declared !== null && declared !== proven) {
    violations.push(
      `\`producer\` (${producer}) が \`target.path\` (${targetPath}) と矛盾しています。このパスは ${proven} を指しています`,
    );
  }
  return violations;
}

/**
 * Whether the pack's summary declares, in as many words, that the round produced no responses.
 *
 * Read separately from the schema pass because `QFAI-REVIEW-005` runs whether or not the summary is
 * well-formed, and a malformed summary must not silently excuse a missing report set: anything that is
 * not a present, parseable summary making the whole declaration answers `false`, so the default is the
 * strict one. The schema pass reports the malformedness on its own code.
 *
 * **All three parts are required**, and the first version required only the middle one. Review finding
 * [22] on PR #794 named both holes it left:
 *
 * - a `version: "1.0"` pack, whose reviewer list is `roster`, could carry an unrelated empty
 *   `reviewers` array beside a full roster and skip `QFAI-REVIEW-005` with no report files at all;
 * - a v2 pack could declare zero reviewers and still say `overall_status: "PASS"`, recording a round
 *   nobody answered as a round that succeeded.
 *
 * `references/review-artifact-layout.md` defines the state as `reviewers: []` **and**
 * `overall_status: "FAIL"`, so that is what is read here. A round that returned no verdict returned no
 * passing one.
 */
function declaresZeroReviewers(summary: Record<string, unknown> | undefined): boolean {
  if (summary === undefined) return false;
  if (readString(summary.version) !== "2.0") return false;
  if (!declaresEmptyReviewerList(summary)) return false;
  return readString(summary.overall_status) === "FAIL";
}

/**
 * Whether the summary's `reviewers` field is present and empty — nothing more.
 *
 * This is the contradiction test, and it deliberately ignores `version` and `overall_status`.
 * `references/review-artifact-layout.md` makes `reviewers: []` beside a report file a failure
 * unconditionally, and asking the narrower question here let a pack escape by being invalid in a
 * SECOND way (`PASS` alongside the empty list) — the two defects cancelled and the pack was
 * accepted. A v1 pack lists its reviewers under `roster`, so an empty `reviewers` there is not an
 * unrelated field to be tolerated: it is a v1 pack carrying a v2 key, and the report files beside
 * it are what make that worth reporting rather than guessing about.
 */
function declaresEmptyReviewerList(summary: Record<string, unknown> | undefined): boolean {
  if (summary === undefined) return false;
  return Array.isArray(summary.reviewers) && summary.reviewers.length === 0;
}

/** The summary as a record, or `undefined` when it is absent, unreadable, or not an object. */
async function readSummaryRecord(
  summaryPath: string,
): Promise<Record<string, unknown> | undefined> {
  if (!(await isFile(summaryPath))) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(summaryPath, "utf-8"));
  } catch {
    return undefined;
  }
  return isRecord(parsed) ? parsed : undefined;
}

async function validateSummarySchema(
  summaryPath: string,
  legacyPacks: ReadonlySet<string>,
  revisions: RevisionProbe,
  selection: PackSelection,
): Promise<Issue[]> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(summaryPath, "utf-8"));
  } catch (error) {
    return [
      issue(
        "QFAI-REVIEW-006",
        `summary.json の JSON parse に失敗しました: ${formatError(error)}`,
        "error",
        summaryPath,
        "reviewArtifacts.summaryJson",
      ),
    ];
  }

  if (!isRecord(parsed)) {
    return [
      issue(
        "QFAI-REVIEW-007",
        "summary.json のトップレベルは object である必要があります。",
        "error",
        summaryPath,
        "reviewArtifacts.summarySchema",
      ),
    ];
  }

  const violations: string[] = [];
  const version = readString(parsed.version);
  if (!version || !ALLOWED_VERSIONS.has(version)) {
    violations.push('`version` は "1.0" または "2.0" が必須です');
  }

  const createdAt = readString(parsed.created_at);
  if (!createdAt || !isParsableDate(createdAt)) {
    violations.push("`created_at` は日時文字列が必須です");
  }

  violations.push(...targetViolations(parsed, selection));

  const overallStatus = readString(parsed.overall_status);
  if (!overallStatus || !ALLOWED_OVERALL_STATUS.has(overallStatus)) {
    violations.push("`overall_status` は PASS|FAIL のいずれかが必須です");
  }

  if (version === "2.0") {
    validateV2Reviewers(parsed, violations);
  } else {
    validateV1Roster(parsed, violations);
  }

  // `revision` addresses the state the verdicts describe. A verdict that names
  // no revision cannot be re-checked, cannot be invalidated by a later commit,
  // and cannot be distinguished from a stale one — which is what made
  // "Stale evidence ... MUST NOT be reused" unenforceable. It is optional in
  // the schema (existing packs predate it) but reported when absent, and a
  // present-but-malformed value is an error like any other field.
  const revision = parsed.revision;
  if (revision !== undefined && !readString(revision)) {
    violations.push("`revision` は非空文字列が必須です（省略は可）");
  }
  // Absence is a warning because existing packs predate the field; a value that
  // is present is checked, because the form it takes is what makes the gate
  // mechanical. `working-tree+<porcelain digest>` was the old spelling and
  // reads as a legitimate value while being exactly the digest that does not
  // move when the file under review is edited — a stale verdict passing the
  // freshness check the field exists for.
  //
  // **Unless the pack does not declare the form** (`revision_form`). History
  // written before it cannot be migrated: the tree a past verdict described is
  // not reconstructible, so there is no content hash to write instead, and an
  // error there would leave `--fail-on error` permanently red for a repository
  // that keeps its packs with nothing the operator could do. Those get the
  // finding as a `warning` so the state is still visible.
  const revisionForm = readString(parsed.revision_form);
  if (revisionForm === null || !ALLOWED_REVISION_FORMS.has(revisionForm)) {
    violations.push(
      `\`revision_form\` は "${REVISION_FORM_MARKER}"（現行契約）または "${REVISION_FORM_LEGACY}"（形式導入前の pack、履歴から一度だけ付与）が必須です`,
    );
  }
  // Only an explicit `legacy` excuses a malformed value — **and only when the
  // migration record agrees**. Absence does not excuse it: that is a producer
  // that forgot, and letting it pass would make the strict form opt-in. Nor
  // does the pack's own word: a self-declaration is exactly as writable as the
  // `revision` it excuses, so a current producer with a broken value — or an
  // edited pack — could downgrade its own finding by typing `legacy`. The
  // migration pass records which packs predate the form, once, in a file of its
  // own that a reviewer reads as a whole.
  const packName = path.basename(path.dirname(summaryPath));
  const claimsLegacy = revisionForm === REVISION_FORM_LEGACY;
  const migrated = claimsLegacy && legacyPacks.has(packName);
  if (claimsLegacy && !migrated) {
    violations.push(
      `\`revision_form: "${REVISION_FORM_LEGACY}"\` を宣言していますが、\`.qfai/review/${LEGACY_MANIFEST}\` に ${packName} が記録されていません。移行記録にない pack の自己申告は受理しません`,
    );
  }
  const declaresForm = !migrated;
  // Only when there is a value to judge: an empty string is already reported
  // by the schema check above, and saying it twice reads as two problems.
  const revisionText = readString(revision);
  // The form says the value is shaped like an address; this says it is one. A
  // placeholder, a truncated paste or a transposed digit passes the regex and
  // names no tree at all, so the verdict it carries cannot be reproduced by
  // anyone. Only the git-rev form is checkable here: recomputing the
  // uncommitted-tree hash would mean reimplementing the producer's four-step
  // procedure in the validator, and a mismatch there is indistinguishable from
  // the ordinary post-verdict drift the seals already cover.
  const unresolvableRevision =
    revisionText !== null && GIT_REV_FORM.test(revisionText)
      ? revisions.commitExists(revisionText) === false
        ? [
            issue(
              "QFAI-REVIEW-009",
              `\`revision\` (${revisionText}) はこのリポジトリの commit に解決できません。判定対象の tree を再現できません。`,
              "warning",
              summaryPath,
              "reviewArtifacts.summaryRevisionResolves",
              [revisionText],
              "canonical",
              "shallow clone や未 fetch のブランチでも同じ結果になるため warning です。値そのものが誤っている場合は、判定時の `git rev-parse HEAD` を記録し直してください。",
            ),
          ]
        : []
      : [];
  const malformedRevision =
    revisionText !== null && !REVISION_FORM.test(revisionText)
      ? [
          issue(
            declaresForm ? "QFAI-REVIEW-007" : "QFAI-REVIEW-009",
            "`revision` の形式が不正です。git rev (7-64 hex) か `working-tree+<64 hex>`（content hash）を指定してください。`working-tree+<porcelain digest>` は内容が変わっても動かないため受理しません。" +
              (declaresForm
                ? ""
                : `（この pack は \`revision_form: "${REVISION_FORM_LEGACY}"\` を宣言しているため warning 扱いです。当時の tree は復元できず、移行先の content hash が存在しません。）`),
            declaresForm ? "error" : "warning",
            summaryPath,
            "reviewArtifacts.summaryRevision",
            [revisionText],
            "canonical",
            "`.qfai/assistant/skills/qfai-implement/references/evidence-revision.md` を参照してください。",
          ),
        ]
      : [];

  // Absence is judged by the same declaration as the form. A pack that says it
  // was written under the current contract and then names no revision at all is
  // strictly worse than one whose value is malformed — there is no tree to
  // check, and the form check never runs — so letting it through as a warning
  // made the whole field optional in practice.
  const missingRevision =
    revision === undefined
      ? [
          issue(
            declaresForm ? "QFAI-REVIEW-007" : "QFAI-REVIEW-009",
            "summary.json に `revision` がありません。判定がどの状態に対するものか特定できず、後続コミットによる無効化もできません。" +
              (declaresForm
                ? ""
                : `（この pack は \`revision_form: "${REVISION_FORM_LEGACY}"\` を宣言しているため warning 扱いです。）`),
            declaresForm ? "error" : "warning",
            summaryPath,
            "reviewArtifacts.summaryRevision",
            undefined,
            "canonical",
            // `porcelain digest` was the old form and is now forbidden by the
            // reference below: it names the changed paths and their states, so
            // re-editing the very file under review leaves it identical and a
            // stale verdict passes the freshness check this field exists for.
            "レビュー対象の状態を `revision` に記録してください（git rev、または未コミット時は `working-tree+<content hash>` — HEAD・tracked diff・ソート済み untracked manifest の内容ハッシュ）。" +
              "`.qfai/assistant/skills/qfai-implement/references/evidence-revision.md` を参照。",
          ),
        ]
      : [];

  if (violations.length === 0) {
    return [...missingRevision, ...malformedRevision, ...unresolvableRevision];
  }

  return [
    ...missingRevision,
    ...malformedRevision,
    ...unresolvableRevision,
    issue(
      "QFAI-REVIEW-007",
      `summary.json の最小スキーマを満たしていません: ${violations.join(" / ")}`,
      "error",
      summaryPath,
      "reviewArtifacts.summarySchema",
    ),
  ];
}

/**
 * The pack directories, plus the names that were skipped.
 *
 * `unrecognized` is what `QFAI-REVIEW-010` reports. Dot-prefixed names are not
 * in it: `.legacy-packs` and friends are metadata the review tooling keeps
 * beside the packs, never a mis-named pack.
 */
async function listReviewPackDirs(
  reviewRoot: string,
): Promise<{ packs: string[]; unrecognized: string[] }> {
  let dirEntries;
  try {
    dirEntries = await readdir(reviewRoot, { withFileTypes: true });
  } catch {
    return { packs: [], unrecognized: [] };
  }
  const directories = dirEntries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  const packs = directories
    .filter((name) => REVIEW_PACK_DIR_RE.test(name))
    .sort((left, right) => right.localeCompare(left));
  const unrecognized = directories
    .filter((name) => !REVIEW_PACK_DIR_RE.test(name) && !name.startsWith("."))
    .sort((left, right) => left.localeCompare(right));
  return { packs: packs.map((name) => path.join(reviewRoot, name)), unrecognized };
}

/** What a pack says it is about: its producer, its kind, and the spec that owns it. */
type PackAttribution = {
  producer: string | null;
  kind: string | null;
  specNumber: string | null;
};

const UNATTRIBUTED: PackAttribution = { producer: null, kind: null, specNumber: null };

type PackSelection = {
  root: string;
  specsRoot: string | undefined;
  discussionRoot: string | undefined;
  /** Present only for a `--spec` run. */
  specScope: SpecScope | undefined;
  producers: ReadonlySet<string> | undefined;
};

/**
 * The packs this run is entitled to judge.
 *
 * Two independent narrowings, and both exist so that one stage's gate does not
 * fail on a pack another owner is still writing:
 *
 * - **`--spec`** — "a parallel worker gates on its own spec only and does not
 *   import a sibling agent's in-flight failures" (`qfai-sdd/SKILL.md`). A
 *   review-pack finding is repo-level (its path names no spec), so
 *   `isFindingInSpecScope` keeps it in every scope; the narrowing has to happen
 *   here instead. It applies only to packs a spec could own: a discussion
 *   pack's target belongs to no spec, so scoping it out would drop a repo-level
 *   hard error from a scoped full run — the opposite of the scope contract,
 *   which keeps repo-level findings in every slice.
 * - **`producers`** — `--profile sdd` and `--profile discussion` are each the
 *   hard gate for their own review cycle. A half-written spec pack must not
 *   fail a discussion cycle's gate with `QFAI-REVIEW-004`, nor the reverse, and
 *   an implementation pack — which declares the same `target.kind: "spec"` —
 *   must fail neither.
 *
 * A pack that names no owner at all is judged by **every** profile rather than
 * dropped: it belongs to no other owner who would catch it, and letting it opt
 * out of the producer filter is exactly how a pack with no `summary.json` would
 * hide from the gate that mandates one. The `--spec` narrowing keeps the
 * opposite default — an unattributable pack there is the sibling in-flight
 * case, and the unscoped run still reports it.
 */
async function selectPacks(
  packDirs: readonly string[],
  selection: PackSelection,
): Promise<string[]> {
  if (selection.specScope === undefined && selection.producers === undefined) {
    return [...packDirs];
  }
  const selected: string[] = [];
  for (const packDir of packDirs) {
    const attribution = await attributePack(packDir, selection);
    if (!profileOwnsPack(selection.producers, attribution)) {
      continue;
    }
    if (
      selection.specScope !== undefined &&
      !isRepoLevelPack(attribution) &&
      (attribution.specNumber === null || !selection.specScope.has(attribution.specNumber))
    ) {
      continue;
    }
    selected.push(packDir);
  }
  return selected;
}

/**
 * See {@link selectPacks}: only a pack that names a *different* stage is
 * filtered out.
 *
 * The producer wins when the pack declares one. A pack that declares none is
 * placed by its `target.kind` through {@link kindProducer}, so packs written
 * before the field existed keep the gate they had; one that names neither is
 * judged by every profile.
 */
function profileOwnsPack(
  producers: ReadonlySet<string> | undefined,
  attribution: PackAttribution,
): boolean {
  if (producers === undefined) {
    return true;
  }
  const declared = attribution.producer;
  if (declared !== null && ALLOWED_PRODUCERS.has(declared)) {
    return producers.has(declared);
  }
  const implied = attribution.kind === null ? null : kindProducer(attribution.kind);
  return implied === null ? true : producers.has(implied);
}

/**
 * A pack no spec can own — a discussion cycle's.
 *
 * `SpecScope` promises that findings no single spec owns survive every `--spec`
 * run. Narrowing by `specNumber` alone broke that for the full profile: a
 * scoped full scan dropped every discussion pack, hard errors included, because
 * a discussion target yields no spec number by construction.
 */
function isRepoLevelPack(attribution: PackAttribution): boolean {
  return attribution.producer === "discussion" || attribution.kind === "discussion";
}

/**
 * What a pack is about, read from the pack itself.
 *
 * `summary.json#target` is the canonical answer — the field
 * `review-artifact-layout.md` requires for exactly this reason, since the
 * directory name carries only a timestamp. But it is also one of the files the
 * gate exists to require, so attributing *only* by it made a pack that forgot
 * it, or wrote broken JSON, unattributable — and therefore invisible to the
 * very `--spec` gate that should have raised `QFAI-REVIEW-004` against it.
 * `review_request.md` — mandated by the same RCP footer and written first in
 * the cycle — is consulted for whatever `summary.json` could not supply, so a
 * pack is only unattributable when it names its target nowhere at all.
 */
async function attributePack(packDir: string, selection: PackSelection): Promise<PackAttribution> {
  const fromSummary = await attributionFromSummary(packDir, selection);
  // The producer, not merely *some* owner: a summary that names a `target.kind`
  // and no producer places the pack by kind, which cannot tell an SDD pack from
  // an implementation one. `review_request.md` — written first in the cycle, so
  // it exists throughout the in-flight window a stage gate must not trip over —
  // is asked whenever the summary did not settle it.
  const ownerSettled = selection.producers === undefined || fromSummary.producer !== null;
  const specSettled = selection.specScope === undefined || fromSummary.specNumber !== null;
  if (ownerSettled && specSettled) {
    return fromSummary;
  }
  const fromRequest = await attributionFromRequest(packDir, selection);
  return {
    producer: fromSummary.producer ?? fromRequest.producer,
    kind: fromSummary.kind ?? fromRequest.kind,
    specNumber: fromSummary.specNumber ?? fromRequest.specNumber,
  };
}

async function attributionFromSummary(
  packDir: string,
  selection: PackSelection,
): Promise<PackAttribution> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(path.join(packDir, "summary.json"), "utf-8"));
  } catch {
    // Missing, half-written or malformed: `review_request.md` gets the question.
    return UNATTRIBUTED;
  }
  const record = asRecord(parsed);
  const target = asRecord(record?.target);
  const targetPath = readString(target?.path);
  const specNumber =
    targetPath !== null && selection.specsRoot !== undefined
      ? owningSpecNumber(targetPath, { root: selection.root, specsRoot: selection.specsRoot })
      : null;
  // What the tree the pack names proves about it, which outranks what the pack
  // says about itself. A `kind` or `producer` that contradicts its own
  // `target.path` is discarded rather than honoured: honouring it is how a pack
  // whose path is a spec directory bought its way out of `--profile sdd --spec`
  // by calling itself a discussion. `targetViolations` reports the same
  // contradiction so the pack is not merely re-filed in silence.
  const proven = targetPath === null ? null : kindFromPath(targetPath, selection);
  const declaredKind = readString(target?.kind)?.toLowerCase() ?? null;
  const kind =
    declaredKind !== null && proven !== null && declaredKind !== proven ? null : declaredKind;
  const declaredProducer = readString(record?.producer)?.toLowerCase() ?? null;
  return {
    producer: agreeingProducer(declaredProducer, proven),
    kind: kind ?? proven,
    specNumber,
  };
}

/**
 * The kind a `target.path` proves, or `null` when it names neither configured
 * root — an implementation pack pointing at a source file, say, or any caller
 * that passed no roots at all.
 */
function kindFromPath(targetPath: string, selection: PackSelection): string | null {
  if (
    selection.specsRoot !== undefined &&
    owningSpecNumber(targetPath, { root: selection.root, specsRoot: selection.specsRoot }) !== null
  ) {
    return "spec";
  }
  return isUnderDiscussionRoot(targetPath, selection) ? "discussion" : null;
}

/**
 * The fallback attribution: the `Producer:` line and the paths
 * `review_request.md` names.
 *
 * The rest of the file is prose — every stage writes its own — so the only
 * other stable signal in it is the target paths it quotes, which is what every
 * template puts there. A path under a `spec-NNNN` directory names a spec pack;
 * one under `discussionDir` names a discussion pack. Two different specs, or
 * both kinds at once, is not an attribution: the pack stays unattributed and
 * the unscoped/full run keeps it.
 *
 * The `Producer:` line matters most while the pack is in flight. `summary.json`
 * is written last, so between the first reviewer file and the verdict a pack has
 * only this file to say which stage owns it — and until it did, an
 * implementation pack mid-cycle was indistinguishable from an SDD one and
 * failed `--profile sdd --fail-on error` on `QFAI-REVIEW-004/005`.
 */
async function attributionFromRequest(
  packDir: string,
  selection: PackSelection,
): Promise<PackAttribution> {
  let content: string;
  try {
    content = await readFile(path.join(packDir, "review_request.md"), "utf-8");
  } catch {
    return UNATTRIBUTED;
  }
  const owners = new Set<string>();
  let namesDiscussion = false;
  for (const token of pathTokens(content)) {
    if (selection.specsRoot !== undefined) {
      const owner = owningSpecNumber(token, {
        root: selection.root,
        specsRoot: selection.specsRoot,
      });
      if (owner !== null) {
        owners.add(owner);
        continue;
      }
    }
    if (isUnderDiscussionRoot(token, selection)) {
      namesDiscussion = true;
    }
  }
  const kind =
    owners.size > 0 ? (namesDiscussion ? null : "spec") : namesDiscussion ? "discussion" : null;
  return {
    // Discarded on the same terms as the summary's: a declaration the paths in
    // the very same file contradict is not an attribution.
    producer: agreeingProducer(requestProducer(content), kind),
    kind,
    specNumber: owners.size === 1 ? ([...owners][0] ?? null) : null,
  };
}

/**
 * The stage a `review_request.md` declares, from a `Producer: <stage>` line.
 *
 * Tolerant of the markdown every template wraps it in — a list bullet, bold, a
 * backticked value — because the line is prose in a prose file. An unrecognized
 * value is no declaration: the pack falls back to its kind rather than being
 * filed under a stage that does not exist.
 */
const REQUEST_PRODUCER_RE =
  /^[ \t]*(?:[-*+][ \t]*)?(?:\*\*|__|`)?producer(?:\*\*|__|`)?[ \t]*[:：][ \t]*(?:\*\*|__|`)?([A-Za-z][\w-]*)/im;

function requestProducer(content: string): string | null {
  const declared = REQUEST_PRODUCER_RE.exec(content)?.[1]?.toLowerCase() ?? null;
  return declared !== null && ALLOWED_PRODUCERS.has(declared) ? declared : null;
}

/** A declared producer, unless the kind its own pack proves contradicts it. */
function agreeingProducer(producer: string | null, provenKind: string | null): string | null {
  if (producer === null) {
    return null;
  }
  const declaredKind = producerKind(producer);
  return declaredKind !== null && provenKind !== null && declaredKind !== provenKind
    ? null
    : producer;
}

/** True when `token` resolves inside the run's `discussionDir`. */
function isUnderDiscussionRoot(token: string, selection: PackSelection): boolean {
  const discussionRoot = selection.discussionRoot;
  if (discussionRoot === undefined) {
    return false;
  }
  const absolute = path.isAbsolute(token) ? token : path.resolve(selection.root, token);
  const relative = path.relative(discussionRoot, absolute);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

/**
 * Every path-shaped token in a markdown file: backticked spans, plus bare words
 * that carry a separator. Both templates quote their targets in backticks; the
 * bare form is there for producers that do not.
 */
function pathTokens(markdown: string): string[] {
  const tokens = new Set<string>();
  for (const match of markdown.matchAll(/`([^`\r\n]+)`/g)) {
    const value = match[1]?.trim();
    if (value !== undefined && value.length > 0) {
      tokens.add(value);
    }
  }
  for (const match of markdown.matchAll(/[\w.@~-]*(?:[\\/][\w.@~-]+)+/g)) {
    tokens.add(match[0]);
  }
  return [...tokens];
}

async function listReviewerFiles(reviewPackDir: string): Promise<string[]> {
  try {
    const entries = await readdir(reviewPackDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && REVIEWER_FILE_RE.test(entry.name))
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right));
  } catch {
    return [];
  }
}

async function isFile(target: string): Promise<boolean> {
  try {
    const stats = await stat(target);
    return stats.isFile();
  } catch {
    return false;
  }
}

function validateReviewerEntry(
  violations: string[],
  fieldName: string,
  index: number,
  item: unknown,
): void {
  const record = asRecord(item);
  if (!record) {
    violations.push(`${fieldName}[${index}] は object である必要があります`);
    return;
  }
  const reviewer = readString(record.reviewer);
  const status = readString(record.status);
  const feedbackCount = readNonNegativeInt(record.feedback_count);

  if (!reviewer) {
    violations.push(`${fieldName}[${index}].reviewer は必須です`);
  }
  if (!status || !ALLOWED_ROSTER_STATUS.has(status)) {
    violations.push(`${fieldName}[${index}].status は PASS|FAIL|NA が必須です`);
  }
  if (feedbackCount === null) {
    violations.push(`${fieldName}[${index}].feedback_count は 0 以上の整数が必須です`);
  }
}

function validateV1Roster(parsed: Record<string, unknown>, violations: string[]): void {
  const roster = Array.isArray(parsed.roster) ? parsed.roster : null;
  if (!roster || roster.length === 0) {
    violations.push("`roster` は1件以上の配列が必須です");
    return;
  }
  for (const [index, item] of roster.entries()) {
    validateReviewerEntry(violations, "roster", index, item);
  }
}

function validateV2Reviewers(parsed: Record<string, unknown>, violations: string[]): void {
  const routingProfile = readString(parsed.routing_profile);
  if (!routingProfile) {
    violations.push("`routing_profile` は非空文字列が必須です");
  }

  // An EMPTY array is legal, and it is a statement rather than an omission: "this round was opened and
  // produced no responses". A round whose reviewers die before writing anything is a real state, and
  // before this the accurate record of it was unrepresentable — the pack could only be a pack somebody
  // forgot to seal. The summary still has to be present and schema-valid, which is what separates the
  // declaration from the absence. `QFAI-REVIEW-005` reads the same field and stands down for it.
  const reviewers = Array.isArray(parsed.reviewers) ? parsed.reviewers : null;
  if (!reviewers) {
    violations.push("`reviewers` は配列が必須です（応答ゼロの回は空配列で宣言する）");
    return;
  }
  for (const [index, item] of reviewers.entries()) {
    validateReviewerEntry(violations, "reviewers", index, item);
  }

  if (parsed.conditional_reviewers !== undefined && !Array.isArray(parsed.conditional_reviewers)) {
    violations.push("`conditional_reviewers` は配列が必須です");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function readNonNegativeInt(value: unknown): number | null {
  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value >= 0
  ) {
    return value;
  }
  return null;
}

function isParsableDate(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
