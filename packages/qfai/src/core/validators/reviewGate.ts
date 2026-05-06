import { createHash } from "node:crypto";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { parse as parseYaml } from "yaml";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { collectSpecEntries, type SpecEntry } from "../specLayout.js";
import { isEnoent } from "../fs/errno.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

type ScopeType = "shared" | "spec" | "discussion";
type Status = "in_review" | "changes_requested" | "fixed";
type Verdict = "pass" | "needs_changes";

type Layout = {
  scopeDir: string;
  layerDir: string;
  attemptDir: string;
  attemptNo: number;
  attemptDirPath: string;
};

type Reviewer = {
  id: string;
  verdict: Verdict;
  feedbackCount: number;
  file: string;
};

type SummaryRecord = {
  filePath: string;
  scopeType: ScopeType;
  scopeId: string;
  layer: string;
  attemptNo: number;
  status: Status;
  allPassed: boolean;
  totalFeedback: number;
  reviewers: Reviewer[];
  fingerprintAlgo: string;
  fingerprintValue: string;
  fingerprintInputs: string[];
};

type SummaryValidation = {
  issues: Issue[];
  presenceKey: string | undefined;
  record: SummaryRecord | undefined;
};

type Rules = {
  requiredLayers: Record<ScopeType, string[]>;
  optionalLayers: Record<ScopeType, string[]>;
  requiredReviewers: Set<string>;
  minReviewers: number | null;
};

type ExpectedGate = {
  key: string;
  scopeId: string;
  layer: string;
  sourceFile: string;
};

const ATTEMPT_RE = /^attempt-(\d+)$/i;
const SHA256_RE = /^[a-f0-9]{64}$/i;
const STATUSES = new Set<Status>(["in_review", "changes_requested", "fixed"]);
const VERDICTS = new Set<Verdict>(["pass", "needs_changes"]);

export async function validateReviewGateArtifacts(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const rulesPath = resolveRulesPath(root, config);
  const loaded = await loadRules(rulesPath);
  const issues: Issue[] = [...loaded.issues];
  if (!loaded.rules) {
    return issues;
  }

  const reviewRoot = path.join(root, ".qfai", "review");
  issues.push(...(await validateAttemptSequence(reviewRoot)));

  const summaryFiles = await collectSummaryFiles(reviewRoot);
  const presence = new Set<string>();
  const records: SummaryRecord[] = [];

  for (const summaryFile of summaryFiles) {
    const result = await validateSummary(root, reviewRoot, summaryFile, loaded.rules);
    issues.push(...result.issues);
    if (result.presenceKey) {
      presence.add(result.presenceKey);
    }
    if (result.record) {
      records.push(result.record);
    }
  }

  const expected = await collectExpectedGates(root, config, loaded.rules);
  for (const gate of expected.required) {
    if (!presence.has(gate.key)) {
      issues.push(
        issue(
          "QFAI-RGATE-040",
          `required review gate が不足しています: scope=${gate.scopeId}, layer=${gate.layer}`,
          "error",
          gate.sourceFile,
          "reviewGate.requiredGate",
        ),
      );
    }
  }
  for (const gate of expected.optional) {
    if (!presence.has(gate.key)) {
      issues.push(
        issue(
          "QFAI-RGATE-041",
          `optional review gate が不足しています: scope=${gate.scopeId}, layer=${gate.layer}`,
          "warning",
          gate.sourceFile,
          "reviewGate.optionalGate",
        ),
      );
    }
  }

  const latest = new Map<string, SummaryRecord>();
  for (const record of records) {
    const key = gateKey(record.scopeType, record.scopeId, record.layer);
    const prev = latest.get(key);
    if (!prev || record.attemptNo > prev.attemptNo) {
      latest.set(key, record);
    }
  }

  for (const record of latest.values()) {
    issues.push(...validateFixedInvariants(record, loaded.rules));
    issues.push(...(await validateFingerprint(root, record)));
  }

  return issues;
}

async function collectSummaryFiles(reviewRoot: string): Promise<string[]> {
  if (!(await exists(reviewRoot))) {
    return [];
  }
  const files: string[] = [];
  const stack = [reviewRoot];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name === "summary.json") {
        files.push(fullPath);
      }
    }
  }
  return files.sort((a, b) => a.localeCompare(b));
}

async function validateAttemptSequence(reviewRoot: string): Promise<Issue[]> {
  const issues: Issue[] = [];
  if (!(await exists(reviewRoot))) {
    return issues;
  }

  const scopeDirs = await listDirectories(reviewRoot);
  for (const scopeDir of scopeDirs) {
    const scopePath = path.join(reviewRoot, scopeDir);
    const layerDirs = await listDirectories(scopePath);
    for (const layerDir of layerDirs) {
      const layerPath = path.join(scopePath, layerDir);
      const attemptDirs = (await listDirectories(layerPath)).filter((name) =>
        ATTEMPT_RE.test(name),
      );
      const numbers = attemptDirs
        .map((name) => Number.parseInt(ATTEMPT_RE.exec(name)?.[1] ?? "", 10))
        .filter((value) => Number.isInteger(value) && value > 0)
        .sort((a, b) => a - b);

      if (numbers.length === 0) {
        continue;
      }

      const max = numbers[numbers.length - 1] ?? 0;
      const set = new Set(numbers);
      const missing: string[] = [];
      for (let value = 1; value <= max; value += 1) {
        if (!set.has(value)) {
          missing.push(`attempt-${String(value).padStart(2, "0")}`);
        }
      }
      if (missing.length > 0) {
        issues.push(
          issue(
            "QFAI-RGATE-010",
            `attempt 連番に欠番があります: ${missing.join(", ")}`,
            "error",
            layerPath,
            "reviewGate.attemptSequence",
          ),
        );
      }

      for (const attemptDir of attemptDirs) {
        const summaryPath = path.join(layerPath, attemptDir, "summary.json");
        if (!(await exists(summaryPath))) {
          issues.push(
            issue(
              "QFAI-RGATE-010",
              `attempt ディレクトリに summary.json がありません: ${attemptDir}`,
              "error",
              path.join(layerPath, attemptDir),
              "reviewGate.attemptSummary",
            ),
          );
        }
      }
    }
  }

  return issues;
}

function parseLayout(reviewRoot: string, summaryFile: string): Layout | null {
  const relative = path.relative(reviewRoot, summaryFile);
  if (relative.startsWith("..")) {
    return null;
  }
  const parts = relative.split(path.sep);
  if (parts.length !== 4 || parts[3] !== "summary.json") {
    return null;
  }
  const scopeDir = parts[0];
  const layerDir = parts[1];
  const attemptDir = parts[2];
  if (!scopeDir || !layerDir || !attemptDir) {
    return null;
  }
  const match = ATTEMPT_RE.exec(attemptDir);
  if (!match?.[1]) {
    return null;
  }
  const attemptNo = Number.parseInt(match[1], 10);
  if (!Number.isInteger(attemptNo) || attemptNo <= 0) {
    return null;
  }
  return {
    scopeDir,
    layerDir,
    attemptDir,
    attemptNo,
    attemptDirPath: path.join(reviewRoot, scopeDir, layerDir, attemptDir),
  };
}

function inferScope(scopeDir: string): { type: ScopeType | null; id: string } {
  const normalized = normalizeScopeId(scopeDir);
  if (normalized === "shared") {
    return { type: "shared", id: "shared" };
  }
  if (/^spec-\d{4}$/i.test(normalized)) {
    return { type: "spec", id: normalized };
  }
  if (/^discussion-[a-z0-9_-]+$/i.test(normalized)) {
    return { type: "discussion", id: normalized };
  }
  return { type: null, id: normalized };
}

async function validateSummary(
  root: string,
  reviewRoot: string,
  summaryFile: string,
  rules: Rules,
): Promise<SummaryValidation> {
  const issues: Issue[] = [];
  const layout = parseLayout(reviewRoot, summaryFile);
  if (!layout) {
    return {
      issues: [
        issue(
          "QFAI-RGATE-011",
          "summary.json の配置が不正です。期待形式: .qfai/review/<scope>/<layer>/attempt-<NN>/summary.json",
          "error",
          summaryFile,
          "reviewGate.summaryPath",
        ),
      ],
      presenceKey: undefined,
      record: undefined,
    };
  }

  const inferred = inferScope(layout.scopeDir);
  const inferredLayer = normalizeLayer(layout.layerDir);
  const inferredKey = inferred.type
    ? gateKey(inferred.type, inferred.id, inferredLayer)
    : undefined;

  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(summaryFile, "utf-8"));
  } catch (error) {
    issues.push(
      issue(
        "QFAI-RGATE-012",
        `summary.json の parse に失敗しました: ${formatError(error)}`,
        "error",
        summaryFile,
        "reviewGate.summaryJson",
      ),
    );
    return { issues, presenceKey: inferredKey, record: undefined };
  }

  const node = asRecord(parsed);
  if (!node) {
    issues.push(
      issue(
        "QFAI-RGATE-013",
        "summary.json のトップレベルは object である必要があります。",
        "error",
        summaryFile,
        "reviewGate.summarySchema",
      ),
    );
    return { issues, presenceKey: inferredKey, record: undefined };
  }

  if (readString(node.schema_version) !== "1.0") {
    issues.push(
      issue(
        "QFAI-RGATE-013",
        'summary.json.schema_version は "1.0" である必要があります。',
        "error",
        summaryFile,
        "reviewGate.summarySchema",
      ),
    );
  }

  const scopeNode = asRecord(node.scope);
  const scopeTypeRaw = normalizeScopeType(readString(scopeNode?.type));
  const scopeIdRaw = readString(scopeNode?.id);

  const layerNode = asRecord(node.layer);
  const layerNameRaw = normalizeLayer(readString(layerNode?.name));
  const layerLabelRaw = readString(layerNode?.label);

  const attemptNode = asRecord(node.attempt);
  const attemptNoRaw = readPositiveInt(attemptNode?.no);
  const attemptDirRaw = readString(attemptNode?.dir);
  const startedAt = readString(attemptNode?.started_at);
  const finishedAt = readString(attemptNode?.finished_at);

  const fpNode = asRecord(node.fingerprint);
  const fingerprintAlgo = readString(fpNode?.algo);
  const fingerprintValue = readString(fpNode?.value);
  const fingerprintInputs = readStringArray(fpNode?.inputs);

  const aggregateNode = asRecord(node.aggregate);
  const totalFeedback = readPositiveInt(aggregateNode?.total_feedback);
  const allPassed = readBoolean(aggregateNode?.all_passed);
  const statusRaw = readString(aggregateNode?.status);
  const status = statusRaw && STATUSES.has(statusRaw as Status) ? (statusRaw as Status) : null;

  const reviewersNode = Array.isArray(node.reviewers) ? node.reviewers : null;
  const reviewers: Reviewer[] = [];
  if (!reviewersNode) {
    issues.push(
      issue(
        "QFAI-RGATE-013",
        "summary.json.reviewers は配列である必要があります。",
        "error",
        summaryFile,
        "reviewGate.summarySchema",
      ),
    );
  } else {
    for (const [index, item] of reviewersNode.entries()) {
      const reviewerNode = asRecord(item);
      if (!reviewerNode) {
        issues.push(
          issue(
            "QFAI-RGATE-013",
            `summary.json.reviewers[${index}] は object である必要があります。`,
            "error",
            summaryFile,
            "reviewGate.summarySchema",
          ),
        );
        continue;
      }
      const reviewerId = readString(reviewerNode.id);
      const verdictRaw = readString(reviewerNode.verdict);
      const verdict =
        verdictRaw && VERDICTS.has(verdictRaw as Verdict) ? (verdictRaw as Verdict) : null;
      const feedbackCount = readPositiveInt(reviewerNode.feedback_count);
      const reviewerFile = readString(reviewerNode.file);
      if (!reviewerId || !verdict || feedbackCount === null || !reviewerFile) {
        issues.push(
          issue(
            "QFAI-RGATE-013",
            `summary.json.reviewers[${index}] に必須項目が不足しています。`,
            "error",
            summaryFile,
            "reviewGate.summarySchema",
          ),
        );
        continue;
      }
      reviewers.push({
        id: reviewerId,
        verdict,
        feedbackCount,
        file: reviewerFile,
      });
    }
  }

  if (!scopeTypeRaw || !scopeIdRaw) {
    issues.push(
      issue(
        "QFAI-RGATE-013",
        "summary.json.scope.type / scope.id は必須です。",
        "error",
        summaryFile,
        "reviewGate.summarySchema",
      ),
    );
  }
  if (!layerNameRaw || !layerLabelRaw) {
    issues.push(
      issue(
        "QFAI-RGATE-013",
        "summary.json.layer.name / layer.label は必須です。",
        "error",
        summaryFile,
        "reviewGate.summarySchema",
      ),
    );
  }
  if (!attemptNoRaw || !attemptDirRaw || !startedAt || !finishedAt) {
    issues.push(
      issue(
        "QFAI-RGATE-013",
        "summary.json.attempt.no / dir / started_at / finished_at は必須です。",
        "error",
        summaryFile,
        "reviewGate.summarySchema",
      ),
    );
  }
  if (!fingerprintAlgo || !fingerprintValue || !fingerprintInputs?.length) {
    issues.push(
      issue(
        "QFAI-RGATE-013",
        "summary.json.fingerprint.algo / value / inputs は必須です。",
        "error",
        summaryFile,
        "reviewGate.summarySchema",
      ),
    );
  }
  if (totalFeedback === null || allPassed === null || !status) {
    issues.push(
      issue(
        "QFAI-RGATE-013",
        "summary.json.aggregate.total_feedback / all_passed / status は必須です。",
        "error",
        summaryFile,
        "reviewGate.summarySchema",
      ),
    );
  }

  const scopeType = scopeTypeRaw ?? inferred.type;
  const scopeId = scopeIdRaw ?? inferred.id;
  const layerName = layerNameRaw || inferredLayer;
  const presenceKey = scopeType ? gateKey(scopeType, scopeId, layerName) : inferredKey;

  if (scopeTypeRaw && inferred.type && scopeTypeRaw !== inferred.type) {
    issues.push(
      issue(
        "QFAI-RGATE-014",
        `summary.json.scope.type が配置パスと一致しません（path=${inferred.type}, summary=${scopeTypeRaw}）。`,
        "error",
        summaryFile,
        "reviewGate.scopeConsistency",
      ),
    );
  }
  if (scopeIdRaw && normalizeScopeId(scopeIdRaw) !== inferred.id) {
    issues.push(
      issue(
        "QFAI-RGATE-014",
        `summary.json.scope.id が配置パスと一致しません（path=${inferred.id}, summary=${scopeIdRaw}）。`,
        "error",
        summaryFile,
        "reviewGate.scopeConsistency",
      ),
    );
  }
  if (layerNameRaw && layerNameRaw !== inferredLayer) {
    issues.push(
      issue(
        "QFAI-RGATE-014",
        `summary.json.layer.name が配置パスと一致しません（path=${inferredLayer}, summary=${layerNameRaw}）。`,
        "error",
        summaryFile,
        "reviewGate.layerConsistency",
      ),
    );
  }
  if (attemptNoRaw && attemptNoRaw !== layout.attemptNo) {
    issues.push(
      issue(
        "QFAI-RGATE-014",
        `summary.json.attempt.no が配置パスと一致しません（path=${layout.attemptNo}, summary=${attemptNoRaw}）。`,
        "error",
        summaryFile,
        "reviewGate.attemptConsistency",
      ),
    );
  }
  if (
    attemptDirRaw &&
    normalizeAttemptDir(attemptDirRaw) !== normalizeAttemptDir(layout.attemptDir)
  ) {
    issues.push(
      issue(
        "QFAI-RGATE-014",
        `summary.json.attempt.dir が配置パスと一致しません（path=${layout.attemptDir}, summary=${attemptDirRaw}）。`,
        "error",
        summaryFile,
        "reviewGate.attemptConsistency",
      ),
    );
  }

  if (!(await exists(path.join(layout.attemptDirPath, "review_request.md")))) {
    issues.push(
      issue(
        "QFAI-RGATE-024",
        "attempt ディレクトリに review_request.md がありません。",
        "error",
        summaryFile,
        "reviewGate.reviewRequest",
      ),
    );
  }
  for (const reviewer of reviewers) {
    if (!(await exists(path.join(layout.attemptDirPath, reviewer.file)))) {
      issues.push(
        issue(
          "QFAI-RGATE-024",
          `reviewer file が見つかりません: ${reviewer.file}`,
          "error",
          summaryFile,
          "reviewGate.reviewerFile",
          [reviewer.id],
        ),
      );
    }
  }

  if (
    !scopeType ||
    !scopeId ||
    !layerName ||
    !attemptNoRaw ||
    !status ||
    allPassed === null ||
    totalFeedback === null ||
    !fingerprintAlgo ||
    !fingerprintValue ||
    !fingerprintInputs
  ) {
    return { issues, presenceKey, record: undefined };
  }

  if (rules.minReviewers !== null && reviewers.length < rules.minReviewers) {
    issues.push(
      issue(
        "QFAI-RGATE-023",
        `reviewer 数が推奨最小値を下回っています（actual=${reviewers.length}, minimum=${rules.minReviewers}）。`,
        "warning",
        summaryFile,
        "reviewGate.reviewerCount",
      ),
    );
  }

  return {
    issues,
    presenceKey,
    record: {
      filePath: summaryFile,
      scopeType,
      scopeId,
      layer: layerName,
      attemptNo: attemptNoRaw,
      status,
      allPassed,
      totalFeedback,
      reviewers,
      fingerprintAlgo,
      fingerprintValue,
      fingerprintInputs,
    },
  };
}

function validateFixedInvariants(record: SummaryRecord, rules: Rules): Issue[] {
  const issues: Issue[] = [];
  const feedbackSum = record.reviewers.reduce((acc, item) => acc + item.feedbackCount, 0);
  const allReviewerPassed = record.reviewers.every((item) => item.verdict === "pass");

  if (record.totalFeedback !== feedbackSum) {
    issues.push(
      issue(
        "QFAI-RGATE-020",
        `aggregate.total_feedback と reviewer.feedback_count 合計が一致しません（aggregate=${record.totalFeedback}, reviewers=${feedbackSum}）。`,
        "error",
        record.filePath,
        "reviewGate.aggregateConsistency",
      ),
    );
  }
  if (record.allPassed !== allReviewerPassed) {
    issues.push(
      issue(
        "QFAI-RGATE-020",
        `aggregate.all_passed が reviewer verdict と一致しません（aggregate=${record.allPassed}, reviewers=${allReviewerPassed}）。`,
        "error",
        record.filePath,
        "reviewGate.aggregateConsistency",
      ),
    );
  }

  if (record.status !== "fixed") {
    return issues;
  }

  if (!record.allPassed || record.totalFeedback > 0 || !allReviewerPassed) {
    issues.push(
      issue(
        "QFAI-RGATE-020",
        "aggregate.status が fixed ですが、all_passed=true かつ total_feedback=0 の条件を満たしていません。",
        "error",
        record.filePath,
        "reviewGate.fixedInvariant",
      ),
    );
  }

  const reviewerMap = new Map<string, Reviewer>();
  for (const reviewer of record.reviewers) {
    reviewerMap.set(normalizeReviewerId(reviewer.id), reviewer);
  }

  const missingRequired: string[] = [];
  for (const reviewerId of rules.requiredReviewers) {
    const reviewer = reviewerMap.get(reviewerId);
    if (!reviewer || reviewer.verdict !== "pass") {
      missingRequired.push(reviewerId);
    }
  }
  if (missingRequired.length > 0) {
    issues.push(
      issue(
        "QFAI-RGATE-021",
        `required reviewers が未完了のまま fixed になっています: ${missingRequired.join(", ")}`,
        "error",
        record.filePath,
        "reviewGate.requiredReviewers",
        missingRequired,
      ),
    );
  }

  return issues;
}

async function validateFingerprint(root: string, record: SummaryRecord): Promise<Issue[]> {
  const issues: Issue[] = [];
  if (record.fingerprintAlgo.toLowerCase() !== "sha256") {
    return [
      issue(
        "QFAI-RGATE-030",
        `fingerprint.algo は sha256 のみ許可されます（actual=${record.fingerprintAlgo}）。`,
        "error",
        record.filePath,
        "reviewGate.fingerprintAlgo",
      ),
    ];
  }
  if (!SHA256_RE.test(record.fingerprintValue)) {
    return [
      issue(
        "QFAI-RGATE-030",
        "fingerprint.value は 64 文字の sha256 hex である必要があります。",
        "error",
        record.filePath,
        "reviewGate.fingerprintValue",
      ),
    ];
  }

  const hash = createHash("sha256");
  const missing: string[] = [];
  for (const input of record.fingerprintInputs) {
    const absolutePath = path.isAbsolute(input) ? input : path.resolve(root, input);
    try {
      const content = await readFile(absolutePath, "utf-8");
      hash.update(input.replaceAll("\\", "/"));
      hash.update("\n");
      hash.update(content);
      hash.update("\n---\n");
    } catch {
      missing.push(input);
    }
  }

  if (missing.length > 0) {
    issues.push(
      issue(
        "QFAI-RGATE-030",
        `fingerprint.inputs の読み込みに失敗しました: ${missing.join(", ")}`,
        "error",
        record.filePath,
        "reviewGate.fingerprintInputs",
        missing,
      ),
    );
    return issues;
  }

  const current = hash.digest("hex");
  if (current !== record.fingerprintValue.toLowerCase()) {
    issues.push(
      issue(
        "QFAI-RGATE-031",
        "成果物 fingerprint が summary.json と一致しません。同一 attempt 上書きは禁止です。",
        "error",
        record.filePath,
        "reviewGate.fingerprintDrift",
        record.fingerprintInputs,
        "canonical",
        "修正後は attempt を増やして再レビューを最初から実施してください。",
      ),
    );
  }

  return issues;
}

async function collectExpectedGates(
  root: string,
  config: QfaiConfig,
  rules: Rules,
): Promise<{ required: ExpectedGate[]; optional: ExpectedGate[] }> {
  const required: ExpectedGate[] = [];
  const optional: ExpectedGate[] = [];

  const specsRoot = resolvePath(root, config, "specsDir");
  const entries = await collectSpecEntries(specsRoot);
  const hasSpecEntries = entries.length > 0;
  const policiesDir = path.join(specsRoot, "_policies");

  if (hasSpecEntries) {
    for (const layer of rules.requiredLayers.shared) {
      const filePath = await resolveExistingPoliciesLayerPath(policiesDir, layer);
      if (filePath) {
        required.push({
          key: gateKey("shared", "shared", layer),
          scopeId: "shared",
          layer,
          sourceFile: filePath,
        });
      }
    }
    for (const layer of rules.optionalLayers.shared) {
      const filePath = await resolveExistingPoliciesLayerPath(policiesDir, layer);
      if (filePath) {
        optional.push({
          key: gateKey("shared", "shared", layer),
          scopeId: "shared",
          layer,
          sourceFile: filePath,
        });
      }
    }
  }

  for (const entry of entries) {
    const scopeId = path.basename(entry.dir);
    for (const layer of rules.requiredLayers.spec) {
      const filePath = resolveSpecLayerPath(entry, layer);
      if (filePath && (await exists(filePath))) {
        required.push({
          key: gateKey("spec", scopeId, layer),
          scopeId,
          layer,
          sourceFile: filePath,
        });
      }
    }
    for (const layer of rules.optionalLayers.spec) {
      const filePath = resolveSpecLayerPath(entry, layer);
      if (filePath && (await exists(filePath))) {
        optional.push({
          key: gateKey("spec", scopeId, layer),
          scopeId,
          layer,
          sourceFile: filePath,
        });
      }
    }
  }

  return { required, optional };
}

function resolvePoliciesLayerPath(policiesDir: string, layer: string): string | undefined {
  const fileName = {
    objective: "01_Objective.md",
    initiative: "02_Initiative.md",
    capabilities: "03_Capabilities.md",
    "business-flow": "04_Business-Flow.md",
    contracts: "05_Contracts.md",
    glossary: "06_Glossary.md",
    constraints: "07_Constraints.md",
    decisions: "08_Decisions.md",
    "open-questions": "09_Open-questions.md",
    delta: "10_delta.md",
  }[layer];
  return fileName ? path.join(policiesDir, fileName) : undefined;
}

async function resolveExistingPoliciesLayerPath(
  policiesDir: string,
  layer: string,
): Promise<string | undefined> {
  if (layer !== "business-flow") {
    const filePath = resolvePoliciesLayerPath(policiesDir, layer);
    if (filePath && (await exists(filePath))) {
      return filePath;
    }
    return undefined;
  }

  const candidates = [
    path.join(policiesDir, "04_Business-Flow.md"),
    path.join(policiesDir, "04_Business-flow.md"),
  ];
  for (const candidate of candidates) {
    if (await exists(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

function resolveSpecLayerPath(entry: SpecEntry, layer: string): string | undefined {
  const mapping: Record<string, string> = {
    spec: entry.specPath,
    "user-stories": entry.userStoriesPath,
    "acceptance-criteria": entry.acceptanceCriteriaPath,
    "business-rules": entry.businessRulesPath,
    examples: entry.examplesPath,
    "test-cases": entry.testCasesPath,
    decisions: entry.decisionsPath,
    "open-questions": entry.openQuestionsPath,
    delta: entry.deltaPath,
    plan: entry.planPath,
  };
  return mapping[layer];
}

async function loadRules(rulesPath: string): Promise<{ rules: Rules | null; issues: Issue[] }> {
  const issues: Issue[] = [];
  let raw: string;
  try {
    raw = await readFile(rulesPath, "utf-8");
  } catch (error) {
    issues.push(
      issue(
        "QFAI-RGATE-001",
        isEnoent(error)
          ? "review gate rules が見つかりません。"
          : `review gate rules の読み込みに失敗しました: ${formatError(error)}`,
        "error",
        rulesPath,
        "reviewGate.rules",
      ),
    );
    return { rules: null, issues };
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(raw);
  } catch (error) {
    issues.push(
      issue(
        "QFAI-RGATE-002",
        `review gate rules の parse に失敗しました: ${formatError(error)}`,
        "error",
        rulesPath,
        "reviewGate.rules",
      ),
    );
    return { rules: null, issues };
  }

  const record = asRecord(parsed);
  if (!record) {
    issues.push(
      issue(
        "QFAI-RGATE-002",
        "review gate rules は object 形式である必要があります。",
        "error",
        rulesPath,
        "reviewGate.rules",
      ),
    );
    return { rules: null, issues };
  }

  const requiredLayers = readLayerMap(record.required);
  const optionalLayers = readLayerMap(record.optional);
  const reviewerConfig = readReviewerConfig(record.reviewers);

  if (!requiredLayers || !optionalLayers || !reviewerConfig) {
    issues.push(
      issue(
        "QFAI-RGATE-002",
        "review gate rules の required/optional/reviewers 形式が不正です。",
        "error",
        rulesPath,
        "reviewGate.rules",
      ),
    );
    return { rules: null, issues };
  }

  return {
    rules: {
      requiredLayers,
      optionalLayers,
      requiredReviewers: reviewerConfig.required,
      minReviewers: reviewerConfig.minimum,
    },
    issues,
  };
}

function readLayerMap(value: unknown): Record<ScopeType, string[]> | null {
  const base: Record<ScopeType, string[]> = {
    shared: [],
    spec: [],
    discussion: [],
  };
  if (!value) {
    return base;
  }
  const record = asRecord(value);
  if (!record) {
    return null;
  }
  for (const scopeType of Object.keys(base) as ScopeType[]) {
    const entries = record[scopeType];
    if (entries === undefined) {
      continue;
    }
    if (!Array.isArray(entries)) {
      return null;
    }
    const normalized = entries
      .map((entry) => (typeof entry === "string" ? normalizeLayer(entry) : ""))
      .filter((entry) => entry.length > 0);
    base[scopeType] = Array.from(new Set(normalized));
  }
  return base;
}

function readReviewerConfig(
  value: unknown,
): { required: Set<string>; minimum: number | null } | null {
  if (!value) {
    return { required: new Set<string>(), minimum: null };
  }
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const minimumRaw = record.minimum;
  let minimum: number | null = null;
  if (minimumRaw !== undefined) {
    if (typeof minimumRaw !== "number" || !Number.isInteger(minimumRaw) || minimumRaw < 0) {
      return null;
    }
    minimum = minimumRaw;
  }

  const requiredRaw = record.required;
  if (requiredRaw === undefined) {
    return { required: new Set<string>(), minimum };
  }
  if (!Array.isArray(requiredRaw)) {
    return null;
  }

  const required = new Set<string>();
  for (const item of requiredRaw) {
    if (typeof item === "string") {
      const normalized = normalizeReviewerId(item);
      if (normalized.length > 0) {
        required.add(normalized);
      }
      continue;
    }
    const obj = asRecord(item);
    const id = normalizeReviewerId(readString(obj?.id) ?? "");
    if (id.length === 0) {
      return null;
    }
    required.add(id);
  }

  return { required, minimum };
}

function resolveRulesPath(root: string, config: QfaiConfig): string {
  const skillsDir = resolvePath(root, config, "skillsDir");
  const assistantRoot = path.dirname(skillsDir);
  return path.join(assistantRoot, "steering", "review-gate.rules.yml");
}

async function listDirectories(target: string): Promise<string[]> {
  try {
    const entries = await readdir(target, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

function gateKey(scopeType: ScopeType, scopeId: string, layer: string): string {
  return [scopeType, normalizeScopeId(scopeId), normalizeLayer(layer)].join("::");
}

function normalizeScopeType(value: string | null | undefined): ScopeType | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "shared" || normalized === "spec" || normalized === "discussion") {
    return normalized;
  }
  return null;
}

function normalizeScopeId(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeLayer(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[\s_]+/g, "-");
}

function normalizeReviewerId(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeAttemptDir(value: string): string {
  return value.trim().toLowerCase();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const items = value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return items;
}

function readPositiveInt(value: unknown): number | null {
  if (
    typeof value === "number" &&
    Number.isInteger(value) &&
    Number.isFinite(value) &&
    value >= 0
  ) {
    return value;
  }
  return null;
}

function readBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
