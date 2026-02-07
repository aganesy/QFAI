import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import type { QfaiConfig } from "../config.js";
import {
  normalizeCompat,
  normalizePrimary,
  normalizeTag,
  parseDeltaV1,
  toDeltaMeta,
  type ChangeTypePrimary,
} from "../deltaV1.js";
import { collectFiles } from "../fs.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

const execFileAsync = promisify(execFile);
const REQUIRED_META_KEYS = [
  "id",
  "date",
  "primary",
  "tags",
  "compat",
  "scope",
  "notes",
] as const;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DO_NOT_RE = /do[\s_-]*not\s*:/i;
const TEMPTATION_RE = /temptation\s*:/i;
const IMPORTANT_CHANGE_RE =
  /(^|\/)(src|contracts|scenarios|tests)(\/|$)|scenario\.feature$/i;
const DELTA_FILE_RE = /(^|\/)delta\.md$/i;

export async function validateDeltas(
  root: string,
  _config: QfaiConfig,
): Promise<Issue[]> {
  void _config;
  const deltaFiles = await collectDeltaFiles(root);
  const changedFiles = await collectChangedFiles(root);
  const issues: Issue[] = [];
  const latestMetaByFile = new Map<string, ParsedMetaForChecks>();

  for (const deltaPath of deltaFiles) {
    const text = await readFile(deltaPath, "utf-8");
    const parsed = parseDeltaV1(text);
    const relativeDeltaPath =
      normalizeRelative(root, deltaPath) ?? path.basename(deltaPath);

    const missingHeadings: string[] = [];
    if (!parsed.hasDeltaHeading) {
      missingHeadings.push("# Delta");
    }
    if (!parsed.updateHistorySection) {
      missingHeadings.push("## Update History");
    }
    if (!parsed.decisionLogSection) {
      missingHeadings.push("## Decision Log");
    }
    if (missingHeadings.length > 0) {
      issues.push(
        issue(
          "QFAI-DELTA-001",
          `delta.md の必須見出しが不足しています: ${missingHeadings.join(", ")}`,
          "error",
          deltaPath,
          "DELTA-001",
          undefined,
          "change",
          "delta.md v1 テンプレートを適用し、# Delta / ## Update History / ## Decision Log を揃えてください。",
        ),
      );
      continue;
    }

    if (parsed.entries.length === 0) {
      issues.push(
        issue(
          "QFAI-DELTA-002",
          "Decision Log 配下に DL- エントリが見つかりません。",
          "error",
          deltaPath,
          "DELTA-002",
          undefined,
          "change",
          "### DL-... を追加し、#### Meta に YAML ブロックを記述してください。",
        ),
      );
      continue;
    }

    for (const entry of parsed.entries) {
      const entryLabel = `${entry.heading} (line ${entry.headingLine})`;
      if (entry.metaHeadingLine === null) {
        issues.push(
          issue(
            "QFAI-DELTA-002",
            `${entryLabel}: #### Meta が見つかりません。`,
            "error",
            deltaPath,
            "DELTA-002",
            undefined,
            "change",
            "各 DL エントリに #### Meta を追加し、YAML を記述してください。",
          ),
        );
        continue;
      }
      if (!entry.metaYamlBlock) {
        issues.push(
          issue(
            "QFAI-DELTA-002",
            `${entryLabel}: Meta YAML ブロックが見つかりません。`,
            "error",
            deltaPath,
            "DELTA-002",
            undefined,
            "change",
            "#### Meta に ```yaml ... ``` を追加してください。",
          ),
        );
        continue;
      }
      if (entry.metaError || !entry.meta) {
        issues.push(
          issue(
            "QFAI-DELTA-002",
            `${entryLabel}: ${entry.metaError ?? "Meta YAML の解析に失敗しました。"}`,
            "error",
            deltaPath,
            "DELTA-002",
            undefined,
            "change",
            "Meta YAML の構文を修正してください。",
          ),
        );
        continue;
      }

      const missingKeys = REQUIRED_META_KEYS.filter(
        (key) => !Object.prototype.hasOwnProperty.call(entry.meta, key),
      );
      if (missingKeys.length > 0) {
        issues.push(
          issue(
            "QFAI-DELTA-002",
            `${entryLabel}: Meta YAML の必須キーが不足しています: ${missingKeys.join(", ")}`,
            "error",
            deltaPath,
            "DELTA-002",
            undefined,
            "change",
            "id/date/primary/tags/compat/scope/notes をすべて記述してください。",
          ),
        );
        continue;
      }

      const meta = toDeltaMeta(entry.meta);
      if (!DATE_RE.test(meta.date)) {
        issues.push(
          issue(
            "QFAI-DELTA-002",
            `${entryLabel}: date は YYYY-MM-DD 形式で記述してください（現在: ${meta.date || "(empty)"}）。`,
            "error",
            deltaPath,
            "DELTA-002",
            undefined,
            "change",
            "Meta YAML の date を YYYY-MM-DD 形式で記述してください。",
          ),
        );
      }
      if (normalizeCompat(meta.compat) === null) {
        issues.push(
          issue(
            "QFAI-DELTA-002",
            `${entryLabel}: compat が不正です（${meta.compat || "(empty)"}）。`,
            "error",
            deltaPath,
            "DELTA-002",
            undefined,
            "change",
            "compat は Compatibility | Improvement | Change | Bug-for-bug を指定してください。",
          ),
        );
      }
      if (!Array.isArray(entry.meta.scope)) {
        issues.push(
          issue(
            "QFAI-DELTA-002",
            `${entryLabel}: scope は配列で記述してください。`,
            "error",
            deltaPath,
            "DELTA-002",
            undefined,
            "change",
            "scope は YAML 配列（- specs など）で記述してください。",
          ),
        );
      }
      if (meta.notes.length === 0) {
        issues.push(
          issue(
            "QFAI-DELTA-002",
            `${entryLabel}: notes が空です。`,
            "error",
            deltaPath,
            "DELTA-002",
            undefined,
            "change",
            "notes に短い要約を記述してください。",
          ),
        );
      }

      const normalizedPrimary = normalizePrimary(meta.primary);
      if (normalizedPrimary === null) {
        issues.push(
          issue(
            "QFAI-CTYPE-001",
            `${entryLabel}: primary が語彙外です（${meta.primary || "(empty)"}）。`,
            "error",
            deltaPath,
            "CTYPE-001",
            undefined,
            "change",
            "primary は Initial | Behavior | Structural | Ops を指定してください。",
          ),
        );
      }

      const invalidTags = meta.tags.filter((tag) => normalizeTag(tag) === null);
      if (invalidTags.length > 0) {
        issues.push(
          issue(
            "QFAI-CTYPE-001",
            `${entryLabel}: tags に語彙外の値があります（${invalidTags.join(", ")}）。`,
            "error",
            deltaPath,
            "CTYPE-001",
            invalidTags,
            "change",
            "tags は @api @db @nfr @docs @test のみ指定してください。",
          ),
        );
      }

      const rejectedIssue = validateRejected(entry.rejectedBody);
      if (entry.rejectedHeadingLine === null) {
        issues.push(
          issue(
            "QFAI-DELTA-003",
            `${entryLabel}: #### Rejected が見つかりません。`,
            "error",
            deltaPath,
            "DELTA-003",
            undefined,
            "change",
            "各 DL エントリに #### Rejected を追加し、option/reason/do_not/temptation を記述してください。",
          ),
        );
      } else if (rejectedIssue) {
        issues.push(
          issue(
            "QFAI-DELTA-003",
            `${entryLabel}: ${rejectedIssue}`,
            "error",
            deltaPath,
            "DELTA-003",
            undefined,
            "change",
            "Rejected の各項目に do_not / temptation を必ず記述してください。",
          ),
        );
      }

      latestMetaByFile.set(relativeDeltaPath, {
        deltaPath,
        relativeDeltaPath,
        entryLine: entry.headingLine,
        primary: normalizedPrimary,
        tags: meta.tags.flatMap((tag) => {
          const normalizedTag = normalizeTag(tag);
          return normalizedTag ? [normalizedTag] : [];
        }),
      });
    }
  }

  if (changedFiles.length > 0) {
    const importantChanges = changedFiles.filter((file) =>
      IMPORTANT_CHANGE_RE.test(file),
    );
    const deltaChanges = changedFiles.filter((file) =>
      DELTA_FILE_RE.test(file),
    );
    if (importantChanges.length > 0 && deltaChanges.length === 0) {
      issues.push(
        issue(
          "QFAI-CTYPE-003",
          "重要変更（src/contracts/scenarios/tests）があるのに delta.md 更新が見つかりません。",
          "error",
          path.join(root, importantChanges[0] ?? ""),
          "CTYPE-003",
          importantChanges.slice(0, 10),
          "change",
          "変更対象に対応する delta.md を更新し、Decision Log の DL エントリを追加してください。",
        ),
      );
    }

    for (const meta of latestMetaByFile.values()) {
      if (!meta.primary) {
        continue;
      }
      const relatedChanges = selectRelatedChanges(changedFiles, meta);
      const warnings = collectChangeTypeMismatches(
        meta.primary,
        meta.tags,
        relatedChanges,
      );
      for (const warning of warnings) {
        issues.push(
          issue(
            "QFAI-CTYPE-002",
            warning.message,
            "warning",
            meta.deltaPath,
            "CTYPE-002",
            relatedChanges.slice(0, 10),
            "change",
            warning.suggestedAction,
          ),
        );
      }
    }
  }

  return issues;
}

type ParsedMetaForChecks = {
  deltaPath: string;
  relativeDeltaPath: string;
  entryLine: number;
  primary: ChangeTypePrimary | null;
  tags: string[];
};

type ChangeTypeMismatch = {
  message: string;
  suggestedAction: string;
};

function validateRejected(rejectedBody: string | null): string | null {
  if (!rejectedBody) {
    return "Rejected セクションが空です。";
  }

  const optionBlocks = extractRejectedOptionBlocks(rejectedBody);
  if (optionBlocks.length === 0) {
    const hasDoNot = DO_NOT_RE.test(rejectedBody);
    const hasTemptation = TEMPTATION_RE.test(rejectedBody);
    if (!hasDoNot || !hasTemptation) {
      const missing: string[] = [];
      if (!hasDoNot) missing.push("do_not");
      if (!hasTemptation) missing.push("temptation");
      return `Rejected に ${missing.join(" / ")} が見つかりません。`;
    }
    return null;
  }

  const invalidBlocks = optionBlocks.filter(
    (block) => !DO_NOT_RE.test(block) || !TEMPTATION_RE.test(block),
  );
  if (invalidBlocks.length > 0) {
    return "Rejected の各 option に do_not / temptation が必要です。";
  }
  return null;
}

function extractRejectedOptionBlocks(sectionBody: string): string[] {
  const lines = sectionBody.split(/\r?\n/);
  const blocks: string[] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (/^\s*-\s*option\s*:/i.test(line)) {
      if (current.length > 0) {
        blocks.push(current.join("\n"));
      }
      current = [line];
      continue;
    }
    if (current.length > 0) {
      current.push(line);
    }
  }
  if (current.length > 0) {
    blocks.push(current.join("\n"));
  }
  return blocks;
}

function selectRelatedChanges(
  changedFiles: string[],
  meta: ParsedMetaForChecks,
): string[] {
  const deltaDir = path.dirname(meta.relativeDeltaPath).replace(/\\/g, "/");
  const prefix = deltaDir === "." ? "" : `${deltaDir}/`;
  const samePack = changedFiles.filter((file) => file.startsWith(prefix));
  if (samePack.length > 0) {
    return samePack;
  }
  return changedFiles;
}

function collectChangeTypeMismatches(
  primary: ChangeTypePrimary,
  tags: string[],
  changedFiles: string[],
): ChangeTypeMismatch[] {
  if (changedFiles.length === 0) {
    return [];
  }
  const hasScenarioOrAcceptanceChange = changedFiles.some(
    (file) =>
      /(^|\/)(tests\/acceptance|scenarios)(\/|$)/i.test(file) ||
      /scenario\.feature$/i.test(file),
  );
  const hasSrcChange = changedFiles.some((file) => /(^|\/)src\//i.test(file));
  const hasContractsChange = changedFiles.some((file) =>
    /(^|\/)contracts\//i.test(file),
  );
  const hasContractsApiChange = changedFiles.some((file) =>
    /(^|\/)contracts\/api\//i.test(file),
  );
  const hasContractsDataChange = changedFiles.some((file) =>
    /(^|\/)contracts\/(data|db)\//i.test(file),
  );
  const hasApiTag = tags.includes("@api");
  const hasDbTag = tags.includes("@db");

  const mismatches: ChangeTypeMismatch[] = [];
  if (primary === "Structural" && hasScenarioOrAcceptanceChange) {
    mismatches.push({
      message:
        "Structural 宣言ですが、受入/シナリオ変更が含まれています（挙動変更の可能性）。",
      suggestedAction:
        "挙動変更が意図されるなら primary=Behavior を検討し、受入観点と移行影響を delta.md に追記してください。",
    });
  }
  if (
    primary === "Behavior" &&
    !hasScenarioOrAcceptanceChange &&
    !hasContractsChange
  ) {
    mismatches.push({
      message:
        "Behavior 宣言ですが、受入/契約の変更が検出されませんでした（分類と差分を再確認してください）。",
      suggestedAction:
        "Behavior と判断した根拠（変更された期待値）を delta.md の notes に補足してください。",
    });
  }
  if (primary === "Ops" && hasSrcChange) {
    mismatches.push({
      message: "Ops 宣言ですが、src 変更が検出されました。",
      suggestedAction:
        "プロダクト挙動変更がある場合は primary=Behavior または Structural を検討してください。",
    });
  }
  if (hasContractsChange && !hasApiTag && !hasDbTag) {
    mismatches.push({
      message:
        "contracts 変更が検出されましたが、tags に @api/@db がありません。",
      suggestedAction:
        "契約変更に応じて tags に @api または @db（必要なら両方）を追加してください。",
    });
  }
  if (hasContractsApiChange && !hasApiTag) {
    mismatches.push({
      message:
        "contracts/api の変更が検出されましたが、tags に @api がありません。",
      suggestedAction:
        "API 契約変更があるため tags に @api を追加してください。",
    });
  }
  if (hasContractsDataChange && !hasDbTag) {
    mismatches.push({
      message:
        "contracts/data または contracts/db の変更が検出されましたが、tags に @db がありません。",
      suggestedAction: "DB 契約変更があるため tags に @db を追加してください。",
    });
  }

  return mismatches;
}

async function collectDeltaFiles(root: string): Promise<string[]> {
  const markdownFiles = await collectFiles(root, { extensions: [".md"] });
  return markdownFiles
    .filter(
      (file) =>
        path.basename(file).toLowerCase() === "delta.md" &&
        isRuntimeDeltaFile(file),
    )
    .sort((a, b) => a.localeCompare(b));
}

function isRuntimeDeltaFile(file: string): boolean {
  const normalized = file.replace(/\\/g, "/").toLowerCase();
  return !normalized.includes("/.qfai/templates/");
}

async function collectChangedFiles(root: string): Promise<string[]> {
  const fromEnv = readChangedFilesFromEnv(root);
  if (fromEnv.length > 0) {
    return fromEnv;
  }

  const insideGitRepo = await gitCommand(root, [
    "rev-parse",
    "--is-inside-work-tree",
  ]);
  if (insideGitRepo.length === 0 || insideGitRepo[0] !== "true") {
    return [];
  }

  const output = new Set<string>();
  const baseRefs = await resolveDiffBaseRefs(root);
  for (const baseRef of baseRefs) {
    const files = await gitCommand(root, [
      "diff",
      "--name-only",
      "--diff-filter=ACMRTUXB",
      "--relative",
      `${baseRef}...HEAD`,
    ]);
    for (const file of files) {
      output.add(file);
    }
  }
  for (const command of [
    ["diff", "--name-only", "--diff-filter=ACMRTUXB", "--relative", "HEAD"],
    ["diff", "--cached", "--name-only", "--diff-filter=ACMRTUXB", "--relative"],
    ["diff", "--name-only", "--diff-filter=ACMRTUXB", "--relative"],
    ["ls-files", "--others", "--exclude-standard"],
  ]) {
    const files = await gitCommand(root, command);
    for (const file of files) {
      output.add(file);
    }
  }

  return Array.from(output).sort((a, b) => a.localeCompare(b));
}

function readChangedFilesFromEnv(root: string): string[] {
  const raw = process.env.QFAI_CHANGED_FILES?.trim() ?? "";
  if (!raw) {
    return [];
  }
  const candidates: string[] = [];
  if (raw.startsWith("[") && raw.endsWith("]")) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (typeof item === "string") {
            candidates.push(item);
          }
        }
      }
    } catch {
      // fall back to plain text parsing
    }
  }
  if (candidates.length === 0) {
    raw.split(/[\r\n,]+/).forEach((item) => candidates.push(item));
  }

  return Array.from(
    new Set(
      candidates.map((item) => normalizeRelative(root, item)).filter(isString),
    ),
  ).sort((a, b) => a.localeCompare(b));
}

async function resolveDiffBaseRefs(root: string): Promise<string[]> {
  const refs: string[] = [];
  const explicitBase = process.env.QFAI_DIFF_BASE?.trim();
  if (explicitBase) {
    refs.push(explicitBase);
  }
  const githubBase = process.env.GITHUB_BASE_REF?.trim();
  if (githubBase) {
    refs.push(`origin/${githubBase}`);
  }

  const originHead = await gitCommand(root, [
    "symbolic-ref",
    "--short",
    "refs/remotes/origin/HEAD",
  ]);
  const originHeadRef = originHead[0];
  if (originHeadRef) {
    refs.push(originHeadRef);
  }

  return Array.from(new Set(refs)).filter((ref) => ref.length > 0);
}

async function gitCommand(root: string, args: string[]): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync("git", ["-C", root, ...args], {
      encoding: "utf-8",
      windowsHide: true,
    });
    return stdout
      .split(/\r?\n/)
      .map((line) => normalizeRelative(root, line))
      .filter(isString);
  } catch {
    return [];
  }
}

function normalizeRelative(root: string, rawPath: string): string | null {
  const trimmed = rawPath.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const absoluteCandidate = path.isAbsolute(trimmed)
    ? trimmed
    : path.resolve(root, trimmed);
  let relative = path.relative(root, absoluteCandidate).replace(/\\/g, "/");
  if (relative.length === 0) {
    relative = ".";
  }
  if (relative.startsWith("../")) {
    return null;
  }
  if (relative === ".") {
    return null;
  }
  return relative.replace(/^\.\//, "");
}

function isString(value: string | null): value is string {
  return typeof value === "string" && value.length > 0;
}
