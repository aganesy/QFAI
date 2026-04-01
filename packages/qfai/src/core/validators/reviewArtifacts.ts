import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

import type { Issue } from "../types.js";
import { issue } from "./utils.js";

const REVIEW_PACK_DIR_RE = /^review-(\d{17})$/i;
const REVIEWER_FILE_RE = /^R\d+_.+\.md$/i;
const ALLOWED_TARGET_KINDS = new Set(["spec", "discussion"]);
const ALLOWED_ROSTER_STATUS = new Set(["PASS", "FAIL", "NA"]);
const ALLOWED_OVERALL_STATUS = new Set(["PASS", "FAIL"]);

export async function validateReviewArtifacts(root: string): Promise<Issue[]> {
  const reviewRoot = path.join(root, ".qfai", "review");
  const issues: Issue[] = [];

  const gitignorePath = path.join(root, ".gitignore");
  let gitignoreContent = "";
  try {
    gitignoreContent = await readFile(gitignorePath, "utf-8");
  } catch {
    // file does not exist
  }
  if (!gitignoreContent.includes(".qfai/review/*")) {
    issues.push(
      issue(
        "QFAI-REVIEW-001",
        "ルート `.gitignore` に `.qfai/review/*` エントリがありません。",
        "error",
        gitignorePath,
        "reviewArtifacts.gitignore",
        undefined,
        "change",
        "`qfai init` を再実行してルート `.gitignore` に QFAI エントリを追記してください。",
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
  if (readString(parsed.version) !== "1.0") {
    violations.push('`version` は "1.0" が必須です');
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

  const roster = Array.isArray(parsed.roster) ? parsed.roster : null;
  if (!roster || roster.length === 0) {
    violations.push("`roster` は1件以上の配列が必須です");
  } else {
    for (const [index, item] of roster.entries()) {
      const record = asRecord(item);
      if (!record) {
        violations.push(`roster[${index}] は object である必要があります`);
        continue;
      }
      const reviewer = readString(record.reviewer);
      const status = readString(record.status);
      const feedbackCount = readNonNegativeInt(record.feedback_count);

      if (!reviewer) {
        violations.push(`roster[${index}].reviewer は必須です`);
      }
      if (!status || !ALLOWED_ROSTER_STATUS.has(status)) {
        violations.push(`roster[${index}].status は PASS|FAIL|NA が必須です`);
      }
      if (feedbackCount === null) {
        violations.push(`roster[${index}].feedback_count は 0 以上の整数が必須です`);
      }
    }
  }

  if (violations.length === 0) {
    return [];
  }

  return [
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
