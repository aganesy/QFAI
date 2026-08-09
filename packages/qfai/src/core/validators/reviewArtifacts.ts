import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

import { isEnoent } from "../fs/errno.js";
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

export async function validateReviewArtifacts(root: string): Promise<Issue[]> {
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

  const reviewPackDirs = await listReviewPackDirs(reviewRoot);
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

  for (const packDir of reviewPackDirs) {
    issues.push(...(await validateReviewPack(packDir)));
  }

  return issues;
}

async function validateReviewPack(reviewPackDir: string): Promise<Issue[]> {
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
  if (reviewerFiles.length === 0) {
    issues.push(
      issue(
        "QFAI-REVIEW-005",
        "review pack に `Rxx_*.md` が1件もありません。",
        "error",
        reviewPackDir,
        "reviewArtifacts.reviewerFiles",
      ),
    );
  }

  if (await isFile(summaryPath)) {
    issues.push(...(await validateSummarySchema(summaryPath)));
  }

  return issues;
}

async function validateSummarySchema(summaryPath: string): Promise<Issue[]> {
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

  const target = asRecord(parsed.target);
  const targetKind = readString(target?.kind);
  const targetPath = readString(target?.path);
  if (!targetKind || !ALLOWED_TARGET_KINDS.has(targetKind)) {
    violations.push("`target.kind` は spec|discussion のいずれかが必須です");
  }
  if (!targetPath) {
    violations.push("`target.path` は非空文字列が必須です");
  }

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
  } else if (typeof revision === "string" && !REVISION_FORM.test(revision.trim())) {
    // Absence is a warning because existing packs predate the field; a value
    // that is present is checked, because the form it takes is what makes the
    // gate mechanical. `working-tree+<porcelain digest>` was the old spelling
    // and reads as a legitimate value while being exactly the digest that does
    // not move when the file under review is edited — a stale verdict passing
    // the freshness check the field exists for.
    violations.push(
      "`revision` の形式が不正です。git rev (7-64 hex) か `working-tree+<64 hex>` " +
        "（content hash）を指定してください。`working-tree+<porcelain digest>` は" +
        "内容が変わっても動かないため受理しません",
    );
  }

  const missingRevision =
    revision === undefined
      ? [
          issue(
            "QFAI-REVIEW-009",
            "summary.json に `revision` がありません。判定がどの状態に対するものか特定できず、後続コミットによる無効化もできません。",
            "warning",
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
    return missingRevision;
  }

  return [
    ...missingRevision,
    issue(
      "QFAI-REVIEW-007",
      `summary.json の最小スキーマを満たしていません: ${violations.join(" / ")}`,
      "error",
      summaryPath,
      "reviewArtifacts.summarySchema",
    ),
  ];
}

async function listReviewPackDirs(reviewRoot: string): Promise<string[]> {
  let entries: string[] = [];
  try {
    const dirEntries = await readdir(reviewRoot, { withFileTypes: true });
    entries = dirEntries
      .filter((entry) => entry.isDirectory() && REVIEW_PACK_DIR_RE.test(entry.name))
      .map((entry) => entry.name)
      .sort((left, right) => right.localeCompare(left));
  } catch {
    return [];
  }
  return entries.map((name) => path.join(reviewRoot, name));
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

  const reviewers = Array.isArray(parsed.reviewers) ? parsed.reviewers : null;
  if (!reviewers || reviewers.length === 0) {
    violations.push("`reviewers` は1件以上の配列が必須です");
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
