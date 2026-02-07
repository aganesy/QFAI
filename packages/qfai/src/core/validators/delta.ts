import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import {
  hasLegacyMigrationNotes,
  hasMigrationBullets,
  normalizeCompat,
  normalizePrimary,
  VERIFICATION_LEVEL_VALUES,
  VERIFICATION_OWNER_VALUES,
  REQUIRED_DELTA_META_KEYS,
  normalizeTag,
  parseDeltaV1,
  toDeltaMeta,
  type DeltaDecisionEntry,
  type VerificationPlanItem,
  type DeltaCompat,
  type ChangeTypePrimary,
} from "../deltaV1.js";
import { collectSpecEntries } from "../specLayout.js";
import type { Issue } from "../types.js";
import { isMissingFileError, issue } from "./utils.js";

const execFileAsync = promisify(execFile);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DO_NOT_RE = /do[\s_-]*not\s*:/i;
const TEMPTATION_RE = /temptation\s*:/i;
const DELTA_FILE_RE = /(^|\/)delta\.md$/i;
const VERIFICATION_ID_RE = /^VFY-\d{3}$/i;
const VERIFICATION_LEVEL_SET = new Set(VERIFICATION_LEVEL_VALUES);
const VERIFICATION_OWNER_SET = new Set(VERIFICATION_OWNER_VALUES);
const VERIFICATION_REQUIRED_FIELDS = [
  "id",
  "level",
  "target",
  "method",
  "owner",
  "expected",
] as const;

export async function validateDeltas(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const resolvedRoot = path.resolve(root);
  const specsRoot = resolvePath(resolvedRoot, config, "specsDir");
  const changePaths = resolveChangeDetectionPaths(resolvedRoot, config);
  const entries = await collectSpecEntries(specsRoot);
  const changedFiles = await collectChangedFiles(resolvedRoot);
  const specsRootRelative = normalizeRelative(resolvedRoot, specsRoot);
  const issues: Issue[] = [];
  const latestMetaByFile = new Map<string, ParsedMetaForChecks>();

  for (const entry of entries) {
    const deltaPath = entry.deltaPath;
    let text: string;
    try {
      text = await readFile(deltaPath, "utf-8");
    } catch (error) {
      if (isMissingFileError(error)) {
        issues.push(
          issue(
            "QFAI-DELTA-001",
            "delta.md が見つかりません。",
            "error",
            deltaPath,
            "DELTA-001",
            undefined,
            "change",
            "spec pack 配下に delta.md を作成し、v1 テンプレートを適用してください。",
          ),
        );
        continue;
      }
      throw error;
    }
    const parsed = parseDeltaV1(text);
    const relativeDeltaPath =
      normalizeRelative(resolvedRoot, deltaPath) ?? path.basename(deltaPath);

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

      const missingKeys = REQUIRED_DELTA_META_KEYS.filter(
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
      const normalizedCompat = normalizeCompat(meta.compat);
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
      if (normalizedCompat === null) {
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

      const normalizedTags = meta.tags.flatMap((tag) => {
        const normalizedTag = normalizeTag(tag);
        return normalizedTag ? [normalizedTag] : [];
      });
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

      issues.push(
        ...collectVerificationIssues({
          entryLabel,
          entry,
          deltaPath,
          dlId: meta.id,
          compat: normalizedCompat,
          primary: normalizedPrimary,
          tags: normalizedTags,
        }),
      );

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
        dlId: meta.id,
        entryHeading: entry.heading,
        entryLine: entry.headingLine,
        primary: normalizedPrimary,
        compat: normalizedCompat,
        tags: normalizedTags,
        scope: meta.scope.map((item) => item.trim()).filter((item) => item),
        hasMigrationHeading: entry.migrationHeadingLine !== null,
        hasMigrationBullets: hasMigrationBullets(entry.migrationBody),
        hasLegacyMigrationNotes: hasLegacyMigrationNotes(entry.notesBody),
      });
    }
  }

  const staticCheckTargets = Array.from(latestMetaByFile.values());
  const diffCheckTargets = selectConsistencyTargets(
    latestMetaByFile,
    changedFiles,
    specsRootRelative,
  );

  for (const meta of staticCheckTargets) {
    const entryLabel = formatEntryLabel(meta);
    if (
      meta.compat === "Change" &&
      (meta.primary === "Structural" || meta.primary === "Ops")
    ) {
      issues.push(
        issue(
          "QFAI-COMPAT-001",
          `${entryLabel}: primary=${meta.primary} と compat=Change は同時に指定できません。`,
          "error",
          meta.deltaPath,
          "COMPAT-001",
          undefined,
          "change",
          "compat を Change 以外にするか、primary を Behavior/Initial へ見直してください。",
          { dl_id: meta.dlId },
        ),
      );
    }

    if (
      meta.compat === "Change" &&
      (!meta.hasMigrationHeading || !meta.hasMigrationBullets)
    ) {
      const reason = !meta.hasMigrationHeading
        ? "#### Migration / Follow-ups が見つかりません。"
        : "#### Migration / Follow-ups はありますが箇条書きが空です。";
      issues.push(
        issue(
          "QFAI-COMPAT-002",
          `${entryLabel}: compat=Change では ${reason}`,
          "error",
          meta.deltaPath,
          "COMPAT-002",
          undefined,
          "change",
          "#### Migration / Follow-ups を追加し、`- ...` の箇条書きを1件以上記述してください。",
          { dl_id: meta.dlId },
        ),
      );
    }

    if (meta.hasLegacyMigrationNotes) {
      issues.push(
        issue(
          "QFAI-COMPAT-005",
          `${entryLabel}: Notes 配下の旧式 Migration / Follow-ups 記法を検出しました。`,
          "warning",
          meta.deltaPath,
          "COMPAT-005",
          undefined,
          "change",
          "Notes 内の Migration 記述を削除し、#### Migration / Follow-ups セクションへ移してください。",
          { dl_id: meta.dlId },
        ),
      );
    }
  }

  if (changedFiles.length > 0) {
    const importantChanges = changedFiles.filter((file) =>
      isImportantChange(file, changePaths),
    );
    const deltaChanges = changedFiles.filter(
      (file) =>
        DELTA_FILE_RE.test(file) &&
        isRuntimeDeltaRelative(file) &&
        isUnderSpecsRoot(file, specsRootRelative),
    );
    if (importantChanges.length > 0 && deltaChanges.length === 0) {
      issues.push(
        issue(
          "QFAI-CTYPE-003",
          "重要変更（src/contracts/scenarios/tests）があるのに delta.md 更新が見つかりません。",
          "error",
          path.join(resolvedRoot, importantChanges[0] ?? ""),
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
      const relatedChanges = selectRelatedChanges(
        changedFiles,
        meta,
        changePaths,
      );
      const warnings = collectChangeTypeMismatches(
        meta.primary,
        meta.tags,
        relatedChanges,
        changePaths,
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
            { dl_id: meta.dlId },
          ),
        );
      }
    }

    for (const meta of diffCheckTargets) {
      const relatedChanges = selectRelatedChanges(
        changedFiles,
        meta,
        changePaths,
      );
      const signals = collectCompatSignals(relatedChanges, changePaths);
      const entryLabel = formatEntryLabel(meta);

      if (
        meta.compat === "Change" &&
        !signals.hasAcceptance &&
        !signals.hasScenarios &&
        !signals.hasContracts
      ) {
        issues.push(
          issue(
            "QFAI-COMPAT-003",
            `${entryLabel}: compat=Change ですが、contracts/scenario/tests/acceptance の変更が検出されません。`,
            "warning",
            meta.deltaPath,
            "COMPAT-003",
            relatedChanges.slice(0, 10),
            "change",
            "Change と判断した根拠となる差分（contracts/scenario/tests/acceptance）を追加するか、compat を再評価してください。",
            { dl_id: meta.dlId },
          ),
        );
      }

      if (
        meta.compat &&
        meta.compat !== "Change" &&
        (signals.hasAcceptance || signals.hasScenarios)
      ) {
        issues.push(
          issue(
            "QFAI-COMPAT-004",
            `${entryLabel}: compat=${meta.compat} ですが、受入/シナリオ変更が検出されました。`,
            "warning",
            meta.deltaPath,
            "COMPAT-004",
            relatedChanges.slice(0, 10),
            "change",
            "期待値変更がある場合は compat=Change を検討し、Migration / Follow-ups を更新してください。",
            { dl_id: meta.dlId },
          ),
        );
      }

      const scopeIssues = collectScopeIssues(meta, relatedChanges, changePaths);
      issues.push(...scopeIssues);
    }
  }

  return issues;
}

type VerificationIssueContext = {
  entryLabel: string;
  entry: DeltaDecisionEntry;
  deltaPath: string;
  dlId: string;
  compat: DeltaCompat | null;
  primary: ChangeTypePrimary | null;
  tags: string[];
};

function collectVerificationIssues({
  entryLabel,
  entry,
  deltaPath,
  dlId,
  compat,
  primary,
  tags,
}: VerificationIssueContext): Issue[] {
  const issues: Issue[] = [];
  const hasVerificationSection = entry.verificationHeadingLine !== null;
  const hasPlan =
    hasVerificationSection && entry.verificationPlanHeadingLine !== null;

  if (!hasPlan) {
    if (compat === "Change") {
      issues.push(
        issue(
          "QFAI-VFY-005",
          `${entryLabel}: compat=Change では Verification.Plan が必須です。`,
          "error",
          deltaPath,
          "VFY-005",
          undefined,
          "change",
          "compat=Change の DL エントリには Verification.Plan を追加してください。",
          { dl_id: dlId },
        ),
      );
      return issues;
    }
    if (hasVerificationSection) {
      issues.push(
        issue(
          "QFAI-VFY-001",
          `${entryLabel}: Verification.Plan が見つかりません。`,
          "error",
          deltaPath,
          "VFY-001",
          undefined,
          "change",
          "#### Verification を追加した場合は、### Plan 配下に検証 Item を1件以上記述してください。",
          { dl_id: dlId },
        ),
      );
    }
    return issues;
  }

  if (entry.verificationPlanError) {
    issues.push(
      issue(
        "QFAI-VFY-003",
        `${entryLabel}: ${entry.verificationPlanError}`,
        "error",
        deltaPath,
        "VFY-003",
        undefined,
        "change",
        "Verification.Plan の YAML 構文を修正し、Item 配列（- id: ...）として記述してください。",
        { dl_id: dlId },
      ),
    );
    return issues;
  }

  const planItems = entry.verificationPlanItems;
  if (planItems.length === 0) {
    issues.push(
      issue(
        "QFAI-VFY-002",
        `${entryLabel}: Verification.Plan.Item が0件です。`,
        "error",
        deltaPath,
        "VFY-002",
        undefined,
        "change",
        "Verification.Plan に id/level/target/method/owner/expected を持つ Item を1件以上追加してください。",
        { dl_id: dlId },
      ),
    );
    return issues;
  }

  const seenIds = new Set<string>();
  for (const [index, item] of planItems.entries()) {
    const refs = item.id ? [item.id] : [`item-${index + 1}`];
    const itemLabel = item.id.length > 0 ? item.id : `item#${index + 1}`;
    const missingFields = VERIFICATION_REQUIRED_FIELDS.filter((field) => {
      const value = item[field];
      return typeof value !== "string" || value.trim().length === 0;
    });
    const invalidFields: string[] = [];
    if (item.id.length > 0 && !VERIFICATION_ID_RE.test(item.id)) {
      invalidFields.push("id は VFY-xxx 形式で指定してください。");
    }
    const normalizedOwner = item.owner.trim().toLowerCase();
    if (
      item.owner.length > 0 &&
      !VERIFICATION_OWNER_SET.has(
        normalizedOwner as (typeof VERIFICATION_OWNER_VALUES)[number],
      )
    ) {
      invalidFields.push(
        `owner は ${VERIFICATION_OWNER_VALUES.join(" | ")} を指定してください。`,
      );
    }
    if (item.id.length > 0) {
      const normalizedId = item.id.trim().toLowerCase();
      if (seenIds.has(normalizedId)) {
        invalidFields.push("id が重複しています。");
      } else {
        seenIds.add(normalizedId);
      }
    }

    if (missingFields.length > 0 || invalidFields.length > 0) {
      const detail: string[] = [];
      if (missingFields.length > 0) {
        detail.push(`必須キー不足: ${missingFields.join(", ")}`);
      }
      detail.push(...invalidFields);
      issues.push(
        issue(
          "QFAI-VFY-003",
          `${entryLabel}: Verification.Plan ${itemLabel} の定義が不正です（${detail.join(" / ")}）。`,
          "error",
          deltaPath,
          "VFY-003",
          refs,
          "change",
          "各 Item に id/level/target/method/owner/expected を定義し、id と owner の語彙を修正してください。",
          { dl_id: dlId },
        ),
      );
    }

    const normalizedLevel = item.level.trim().toLowerCase();
    if (
      item.level.length > 0 &&
      !VERIFICATION_LEVEL_SET.has(
        normalizedLevel as (typeof VERIFICATION_LEVEL_VALUES)[number],
      )
    ) {
      issues.push(
        issue(
          "QFAI-VFY-004",
          `${entryLabel}: Verification.Plan ${itemLabel} の level が語彙外です（${item.level}）。`,
          "error",
          deltaPath,
          "VFY-004",
          refs,
          "change",
          `level は ${VERIFICATION_LEVEL_VALUES.join(" | ")} を指定してください。`,
          { dl_id: dlId },
        ),
      );
    }
  }

  const normalizedLevels = collectNormalizedVerificationLevels(planItems);
  if (
    primary === "Behavior" &&
    !normalizedLevels.has("acceptance") &&
    !normalizedLevels.has("manual")
  ) {
    issues.push(
      issue(
        "QFAI-VFY-006",
        `${entryLabel}: Primary=Behavior ですが、Verification.Plan に acceptance/manual がありません。`,
        "warning",
        deltaPath,
        "VFY-006",
        undefined,
        "change",
        "Behavior 変更では acceptance または manual レベルの検証 Item を追加してください。",
        { dl_id: dlId },
      ),
    );
  }

  if (
    tags.includes("@db") &&
    !normalizedLevels.has("migration") &&
    !normalizedLevels.has("rollback")
  ) {
    issues.push(
      issue(
        "QFAI-VFY-007",
        `${entryLabel}: @db タグがありますが、Verification.Plan に migration/rollback 観点がありません。`,
        "warning",
        deltaPath,
        "VFY-007",
        undefined,
        "change",
        "DB 変更では migration または rollback レベルの検証 Item を追加してください。",
        { dl_id: dlId },
      ),
    );
  }

  return issues;
}

function collectNormalizedVerificationLevels(
  planItems: VerificationPlanItem[],
): Set<string> {
  const levels = new Set<string>();
  for (const item of planItems) {
    const normalized = item.level.trim().toLowerCase();
    if (normalized.length > 0) {
      levels.add(normalized);
    }
  }
  return levels;
}

type ParsedMetaForChecks = {
  deltaPath: string;
  relativeDeltaPath: string;
  dlId: string;
  entryHeading: string;
  entryLine: number;
  primary: ChangeTypePrimary | null;
  compat: DeltaCompat | null;
  tags: string[];
  scope: string[];
  hasMigrationHeading: boolean;
  hasMigrationBullets: boolean;
  hasLegacyMigrationNotes: boolean;
};

type ChangeTypeMismatch = {
  message: string;
  suggestedAction: string;
};

type CompatSignals = {
  hasAcceptance: boolean;
  hasScenarios: boolean;
  hasContracts: boolean;
};

function selectConsistencyTargets(
  latestMetaByFile: Map<string, ParsedMetaForChecks>,
  changedFiles: string[],
  specsRootRelative: string | null,
): ParsedMetaForChecks[] {
  const all = Array.from(latestMetaByFile.values());
  if (all.length === 0) {
    return [];
  }

  const changedDeltaFiles = changedFiles.filter(
    (file) =>
      DELTA_FILE_RE.test(file) &&
      isRuntimeDeltaRelative(file) &&
      isUnderSpecsRoot(file, specsRootRelative),
  );
  if (changedDeltaFiles.length === 0) {
    return [];
  }

  const changedSet = new Set(
    changedDeltaFiles.map((file) => normalizeMatchPath(file)),
  );
  const preferred = all.filter((meta) =>
    changedSet.has(normalizeMatchPath(meta.relativeDeltaPath)),
  );
  return preferred;
}

function formatEntryLabel(meta: ParsedMetaForChecks): string {
  return `${meta.entryHeading} (line ${meta.entryLine})`;
}

function collectCompatSignals(
  changedFiles: string[],
  changePaths: ChangeDetectionPaths,
): CompatSignals {
  return {
    hasAcceptance: changedFiles.some((file) =>
      isAcceptanceChange(file, changePaths),
    ),
    hasScenarios: changedFiles.some((file) =>
      isScenarioChange(file, changePaths),
    ),
    hasContracts: changedFiles.some((file) =>
      isUnderConfiguredDir(
        file,
        changePaths.contractsDir,
        /(^|\/)contracts(\/|$)/i,
      ),
    ),
  };
}

function collectScopeIssues(
  meta: ParsedMetaForChecks,
  changedFiles: string[],
  changePaths: ChangeDetectionPaths,
): Issue[] {
  if (changedFiles.length === 0) {
    return [];
  }

  const issues: Issue[] = [];
  const expectedScopeToFiles = new Map<string, string[]>();
  for (const file of changedFiles) {
    const expectedScope = expectedScopeForFile(file, changePaths);
    if (!expectedScope) {
      continue;
    }
    const current = expectedScopeToFiles.get(expectedScope) ?? [];
    current.push(file);
    expectedScopeToFiles.set(expectedScope, current);
  }

  const entryLabel = formatEntryLabel(meta);
  const declaredScopes = new Set(
    meta.scope
      .map((scopeValue) => normalizeScopeValue(scopeValue))
      .filter((scopeValue) => scopeValue.length > 0),
  );
  const detectedScopes = new Set(expectedScopeToFiles.keys());

  for (const [expectedScope, files] of expectedScopeToFiles.entries()) {
    if (declaredScopes.has(expectedScope)) {
      continue;
    }
    const primaryFile = files[0] ?? "(unknown)";
    issues.push(
      issue(
        "QFAI-SCOPE-001",
        `${entryLabel}: changed file '${primaryFile}' は scope='${expectedScope}' を示唆しますが、Meta scope に未宣言です。`,
        "warning",
        meta.deltaPath,
        "SCOPE-001",
        files.slice(0, 10),
        "change",
        `scope に '${expectedScope}' を追加するか、${primaryFile} の変更意図を notes に明記してください。`,
        { dl_id: meta.dlId },
      ),
    );
  }

  for (const declaredScope of declaredScopes) {
    if (detectedScopes.has(declaredScope)) {
      continue;
    }
    issues.push(
      issue(
        "QFAI-SCOPE-002",
        `${entryLabel}: scope='${declaredScope}' が宣言されていますが、対応する差分が検出されません。`,
        "info",
        meta.deltaPath,
        "SCOPE-002",
        changedFiles.slice(0, 10),
        "change",
        `scope '${declaredScope}' が対象外なら Meta scope から外し、継続対象なら notes に理由を補足してください。`,
        { dl_id: meta.dlId },
      ),
    );
  }

  return issues;
}

function expectedScopeForFile(
  file: string,
  changePaths: ChangeDetectionPaths,
): string | null {
  if (
    isUnderConfiguredSubDir(
      file,
      changePaths.contractsDir,
      "api",
      /(^|\/)contracts\/api(\/|$)/i,
    )
  ) {
    return "contracts/api";
  }
  if (
    isUnderConfiguredSubDir(
      file,
      changePaths.contractsDir,
      "ui",
      /(^|\/)contracts\/ui(\/|$)/i,
    )
  ) {
    return "contracts/ui";
  }
  if (
    isUnderConfiguredSubDir(
      file,
      changePaths.contractsDir,
      "data",
      /(^|\/)contracts\/data(\/|$)/i,
    ) ||
    isUnderConfiguredSubDir(
      file,
      changePaths.contractsDir,
      "db",
      /(^|\/)contracts\/db(\/|$)/i,
    )
  ) {
    return "contracts/data";
  }
  if (isScenarioChange(file, changePaths)) {
    return "scenarios";
  }
  if (isUnderConfiguredDir(file, changePaths.testsDir, /(^|\/)tests(\/|$)/i)) {
    return "tests";
  }
  if (isUnderConfiguredDir(file, changePaths.srcDir, /(^|\/)src(\/|$)/i)) {
    return "src";
  }
  if (isUnderConfiguredDir(file, changePaths.specsDir, /(^|\/)specs(\/|$)/i)) {
    return "specs";
  }
  return null;
}

function normalizeScopeValue(value: string): string {
  const normalized = value.trim().replace(/\\/g, "/").toLowerCase();
  if (normalized.startsWith("contracts/api")) return "contracts/api";
  if (normalized.startsWith("contracts/ui")) return "contracts/ui";
  if (
    normalized.startsWith("contracts/data") ||
    normalized.startsWith("contracts/db")
  ) {
    return "contracts/data";
  }
  if (normalized.startsWith("scenarios")) return "scenarios";
  if (normalized.startsWith("tests")) return "tests";
  if (normalized.startsWith("src")) return "src";
  if (normalized.startsWith("specs")) return "specs";
  return normalized;
}

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
  changePaths: ChangeDetectionPaths,
): string[] {
  const deltaDir = path.dirname(meta.relativeDeltaPath).replace(/\\/g, "/");
  const prefix = deltaDir === "." ? "" : `${deltaDir}/`;
  const samePack = changedFiles.filter((file) => file.startsWith(prefix));
  const samePackWithoutDelta = samePack.filter(
    (file) => !DELTA_FILE_RE.test(file),
  );
  if (samePackWithoutDelta.length > 0) {
    return samePackWithoutDelta;
  }
  if (samePack.length > 0) {
    if (deltaDir === ".") {
      const allWithoutDelta = changedFiles.filter(
        (file) => !DELTA_FILE_RE.test(file),
      );
      if (allWithoutDelta.length > 0) {
        return allWithoutDelta;
      }
    }
    const nonSpecChanges = changedFiles.filter(
      (file) =>
        !DELTA_FILE_RE.test(file) &&
        !isUnderConfiguredDir(file, changePaths.specsDir, /(^|\/)specs(\/|$)/i),
    );
    if (nonSpecChanges.length > 0) {
      return nonSpecChanges;
    }
    return samePack;
  }
  return changedFiles;
}

function collectChangeTypeMismatches(
  primary: ChangeTypePrimary,
  tags: string[],
  changedFiles: string[],
  changePaths: ChangeDetectionPaths,
): ChangeTypeMismatch[] {
  if (changedFiles.length === 0) {
    return [];
  }
  const hasScenarioOrAcceptanceChange = changedFiles.some((file) =>
    isScenarioOrAcceptanceChange(file, changePaths),
  );
  const hasSrcChange = changedFiles.some((file) =>
    isUnderConfiguredDir(file, changePaths.srcDir, /(^|\/)src(\/|$)/i),
  );
  const hasContractsChange = changedFiles.some((file) =>
    isUnderConfiguredDir(
      file,
      changePaths.contractsDir,
      /(^|\/)contracts(\/|$)/i,
    ),
  );
  const hasContractsApiChange = changedFiles.some((file) =>
    isUnderConfiguredSubDir(
      file,
      changePaths.contractsDir,
      "api",
      /(^|\/)contracts\/api(\/|$)/i,
    ),
  );
  const hasContractsDataChange = changedFiles.some(
    (file) =>
      isUnderConfiguredSubDir(
        file,
        changePaths.contractsDir,
        "data",
        /(^|\/)contracts\/data(\/|$)/i,
      ) ||
      isUnderConfiguredSubDir(
        file,
        changePaths.contractsDir,
        "db",
        /(^|\/)contracts\/db(\/|$)/i,
      ),
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

type ChangeDetectionPaths = {
  srcDir: string | null;
  testsDir: string | null;
  contractsDir: string | null;
  specsDir: string | null;
};

function resolveChangeDetectionPaths(
  root: string,
  config: QfaiConfig,
): ChangeDetectionPaths {
  return {
    srcDir: normalizeRelative(root, resolvePath(root, config, "srcDir")),
    testsDir: normalizeRelative(root, resolvePath(root, config, "testsDir")),
    contractsDir: normalizeRelative(
      root,
      resolvePath(root, config, "contractsDir"),
    ),
    specsDir: normalizeRelative(root, resolvePath(root, config, "specsDir")),
  };
}

function isImportantChange(
  file: string,
  changePaths: ChangeDetectionPaths,
): boolean {
  return (
    isUnderConfiguredDir(file, changePaths.srcDir, /(^|\/)src(\/|$)/i) ||
    isUnderConfiguredDir(file, changePaths.testsDir, /(^|\/)tests(\/|$)/i) ||
    isUnderConfiguredDir(
      file,
      changePaths.contractsDir,
      /(^|\/)contracts(\/|$)/i,
    ) ||
    isScenarioOrAcceptanceChange(file, changePaths)
  );
}

function isScenarioOrAcceptanceChange(
  file: string,
  changePaths: ChangeDetectionPaths,
): boolean {
  return (
    isScenarioChange(file, changePaths) || isAcceptanceChange(file, changePaths)
  );
}

function isScenarioChange(
  file: string,
  changePaths: ChangeDetectionPaths,
): boolean {
  const normalized = normalizeMatchPath(file);
  if (/(^|\/)scenarios(\/|$)/i.test(normalized)) {
    return true;
  }
  const isScenarioFile = normalized.endsWith("/scenario.feature");
  if (!isScenarioFile) {
    return false;
  }
  if (changePaths.specsDir && isUnderDir(file, changePaths.specsDir)) {
    return true;
  }
  if (
    changePaths.specsDir === null &&
    /(^|\/)\.qfai\/specs(\/|$)/i.test(normalized)
  ) {
    return true;
  }
  return false;
}

function isAcceptanceChange(
  file: string,
  changePaths: ChangeDetectionPaths,
): boolean {
  const normalized = normalizeMatchPath(file);
  if (
    isUnderDir(file, changePaths.testsDir) &&
    /(^|\/)acceptance(\/|$)/i.test(normalized)
  ) {
    return true;
  }
  if (changePaths.testsDir === null) {
    return /(^|\/)tests\/acceptance(\/|$)/i.test(normalized);
  }
  return false;
}

function isUnderConfiguredDir(
  file: string,
  configuredDir: string | null,
  fallback: RegExp,
): boolean {
  if (isUnderDir(file, configuredDir)) {
    return true;
  }
  return configuredDir === null ? fallback.test(file) : false;
}

function isUnderConfiguredSubDir(
  file: string,
  configuredDir: string | null,
  subDir: string,
  fallback: RegExp,
): boolean {
  if (configuredDir) {
    const subPath = `${configuredDir.replace(/\\/g, "/").replace(/\/+$/, "")}/${subDir}`;
    return isUnderDir(file, subPath);
  }
  return fallback.test(file);
}

function isUnderDir(file: string, dir: string | null): boolean {
  if (!dir) {
    return false;
  }
  const normalizedFile = normalizeMatchPath(file);
  const normalizedDir = normalizeMatchPath(dir).replace(/\/+$/, "");
  return (
    normalizedFile === normalizedDir ||
    normalizedFile.startsWith(`${normalizedDir}/`)
  );
}

function normalizeMatchPath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\.\//, "").toLowerCase();
}

function isRuntimeDeltaRelative(file: string): boolean {
  const normalized = normalizeMatchPath(file);
  return !/(^|\/)\.qfai\/templates\//.test(normalized);
}

function isUnderSpecsRoot(
  file: string,
  specsRootRelative: string | null,
): boolean {
  if (!specsRootRelative) {
    return true;
  }
  const normalizedFile = file.replace(/\\/g, "/");
  const normalizedSpecsRoot = specsRootRelative.replace(/\\/g, "/");
  return (
    normalizedFile === normalizedSpecsRoot ||
    normalizedFile.startsWith(`${normalizedSpecsRoot}/`)
  );
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
      "--diff-filter=ACDMRTUXB",
      "--relative",
      `${baseRef}...HEAD`,
    ]);
    for (const file of files) {
      output.add(file);
    }
  }
  for (const command of [
    ["diff", "--name-only", "--diff-filter=ACDMRTUXB", "--relative", "HEAD"],
    [
      "diff",
      "--cached",
      "--name-only",
      "--diff-filter=ACDMRTUXB",
      "--relative",
    ],
    ["diff", "--name-only", "--diff-filter=ACDMRTUXB", "--relative"],
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
