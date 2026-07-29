import { access, readFile } from "node:fs/promises";
import path from "node:path";

import { parse as parseYaml } from "yaml";

import { toRelativePath } from "./paths.js";
import { escapeRegExp } from "./regex.js";
import type {
  Issue,
  IssueSeverity,
  ValidationWaiverDowngradeTo,
  ValidationWaiverEntry,
  ValidationWaiverMatch,
  ValidationWaiverScope,
  ValidationWaiverSeverity,
  ValidationWaivers,
} from "./types.js";
import { issue } from "./validators/utils.js";

const WAIVER_FILE = path.join(".qfai", "waivers.yml");
const UNSUPPORTED_WAIVER_FILE = path.join(".qfai", "waivers.yaml");
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const RULE_ID_RE = /^[A-Z]+-\d{3}$/;

type ParsedWaiver = ValidationWaiverEntry & {
  pathMatchers: RegExp[];
};

export async function applyWaivers(
  root: string,
  findings: Issue[],
): Promise<{ issues: Issue[]; waivers: ValidationWaivers }> {
  const resolvedRoot = path.resolve(root);
  const ruleSeverityIndex = buildRuleSeverityIndex(findings);
  const loaded = await loadWaivers(resolvedRoot, ruleSeverityIndex);
  const applied = applyWaiversToFindings(resolvedRoot, findings, loaded.applicableWaivers);

  return {
    issues: [...applied.issues, ...loaded.validationIssues],
    waivers: {
      active: loaded.activeWaivers,
      suppressed: applied.suppressed,
    },
  };
}

type LoadWaiversResult = {
  activeWaivers: ValidationWaiverEntry[];
  applicableWaivers: ParsedWaiver[];
  validationIssues: Issue[];
};

async function loadWaivers(
  root: string,
  ruleSeverityIndex: Map<string, IssueSeverity>,
): Promise<LoadWaiversResult> {
  const waiverPath = path.join(root, WAIVER_FILE);
  const unsupportedPath = path.join(root, UNSUPPORTED_WAIVER_FILE);
  const validationIssues: Issue[] = [];

  if (await exists(unsupportedPath)) {
    validationIssues.push(
      issue(
        "QFAI-WAIVER-001",
        ".qfai/waivers.yaml は非対応です。拡張子を .yml に統一してください。",
        "error",
        unsupportedPath,
        "WAIVER-001",
        undefined,
        "change",
      ),
    );
  }

  if (!(await exists(waiverPath))) {
    return {
      activeWaivers: [],
      applicableWaivers: [],
      validationIssues,
    };
  }

  let rawText: string;
  try {
    rawText = await readFile(waiverPath, "utf-8");
  } catch (error) {
    validationIssues.push(
      issue(
        "QFAI-WAIVER-001",
        `waivers.yml の読み込みに失敗しました: ${toErrorMessage(error)}`,
        "error",
        waiverPath,
        "WAIVER-001",
        undefined,
        "change",
      ),
    );
    return {
      activeWaivers: [],
      applicableWaivers: [],
      validationIssues,
    };
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(rawText);
  } catch (error) {
    validationIssues.push(
      issue(
        "QFAI-WAIVER-001",
        `waivers.yml のYAML解析に失敗しました: ${toErrorMessage(error)}`,
        "error",
        waiverPath,
        "WAIVER-001",
        undefined,
        "change",
      ),
    );
    return {
      activeWaivers: [],
      applicableWaivers: [],
      validationIssues,
    };
  }

  if (!isRecord(parsed)) {
    validationIssues.push(
      issue(
        "QFAI-WAIVER-001",
        "waivers.yml はオブジェクト形式で記述してください。",
        "error",
        waiverPath,
        "WAIVER-001",
        undefined,
        "change",
      ),
    );
    return {
      activeWaivers: [],
      applicableWaivers: [],
      validationIssues,
    };
  }

  const version = normalizeVersion(parsed.version);
  if (version !== 1) {
    validationIssues.push(
      issue(
        "QFAI-WAIVER-001",
        "waivers.yml の version は 1 を指定してください。",
        "error",
        waiverPath,
        "WAIVER-001",
        undefined,
        "change",
      ),
    );
    return {
      activeWaivers: [],
      applicableWaivers: [],
      validationIssues,
    };
  }

  const rawWaivers = parsed.waivers;
  if (!Array.isArray(rawWaivers)) {
    validationIssues.push(
      issue(
        "QFAI-WAIVER-001",
        "waivers.yml の waivers は配列で記述してください。",
        "error",
        waiverPath,
        "WAIVER-001",
        undefined,
        "change",
      ),
    );
    return {
      activeWaivers: [],
      applicableWaivers: [],
      validationIssues,
    };
  }

  const todayJst = todayDateJst();
  const seenIds = new Set<string>();
  const activeWaivers: ValidationWaiverEntry[] = [];
  const applicableWaivers: ParsedWaiver[] = [];

  rawWaivers.forEach((rawWaiver, index) => {
    const label = `waivers[${index}]`;
    if (!isRecord(rawWaiver)) {
      validationIssues.push(
        issue(
          "QFAI-WAIVER-001",
          `${label}: オブジェクト形式で記述してください。`,
          "error",
          waiverPath,
          "WAIVER-001",
          undefined,
          "change",
        ),
      );
      return;
    }

    const id = asTrimmedString(rawWaiver.id);
    const ruleId = normalizeRuleId(rawWaiver.rule ?? rawWaiver.rule_id);
    const actionParsed = normalizeAction(rawWaiver.action);
    if (actionParsed.invalid) {
      validationIssues.push(
        issue(
          "QFAI-WAIVER-001",
          `${label}: action は suppress または downgrade を指定してください。`,
          "error",
          waiverPath,
          "WAIVER-001",
          undefined,
          "change",
        ),
      );
      return;
    }
    const action = actionParsed.value ?? "suppress";
    const reason = asTrimmedString(rawWaiver.reason);
    const expiresOn = asTrimmedString(rawWaiver.expires ?? rawWaiver.expires_on);
    const evidence = asTrimmedString(rawWaiver.evidence);
    const owner = asTrimmedString(rawWaiver.owner);
    const matchParsed = parseMatch(rawWaiver.match);
    const scopeParsed = parseScope(rawWaiver.scope, matchParsed.match?.paths);
    const severity = normalizeWaiverSeverity(rawWaiver.severity);

    if (!id || !ruleId || !reason || !expiresOn || !evidence) {
      validationIssues.push(
        issue(
          "QFAI-WAIVER-001",
          `${label}: id/rule/reason/expires/evidence は必須です。`,
          "error",
          waiverPath,
          "WAIVER-001",
          undefined,
          "change",
        ),
      );
      return;
    }

    if (!RULE_ID_RE.test(ruleId)) {
      validationIssues.push(
        issue(
          "QFAI-WAIVER-001",
          `${label}: rule は 'COMPAT-003' のような形式（^[A-Z]+-\\d{3}$）で指定してください。`,
          "error",
          waiverPath,
          "WAIVER-001",
          undefined,
          "change",
        ),
      );
      return;
    }

    if (seenIds.has(id)) {
      validationIssues.push(
        issue(
          "QFAI-WAIVER-001",
          `${label}: waiver id '${id}' が重複しています。`,
          "error",
          waiverPath,
          "WAIVER-001",
          undefined,
          "change",
        ),
      );
      return;
    }
    seenIds.add(id);

    if (matchParsed.error) {
      validationIssues.push(
        issue(
          "QFAI-WAIVER-001",
          `${label}: ${matchParsed.error}`,
          "error",
          waiverPath,
          "WAIVER-001",
          undefined,
          "change",
        ),
      );
      return;
    }

    if (scopeParsed.error) {
      validationIssues.push(
        issue(
          "QFAI-WAIVER-001",
          `${label}: ${scopeParsed.error}`,
          "error",
          waiverPath,
          "WAIVER-001",
          undefined,
          "change",
        ),
      );
      return;
    }
    const scope = scopeParsed.scope;
    if (!scope) {
      validationIssues.push(
        issue(
          "QFAI-WAIVER-001",
          `${label}: scope.paths は1件以上の文字列配列で指定してください。`,
          "error",
          waiverPath,
          "WAIVER-001",
          undefined,
          "change",
        ),
      );
      return;
    }

    let downgradeTo: ValidationWaiverDowngradeTo | undefined;
    if (action === "downgrade") {
      downgradeTo = normalizeDowngradeTo(rawWaiver.downgrade_to) ?? undefined;
      if (!downgradeTo) {
        validationIssues.push(
          issue(
            "QFAI-WAIVER-001",
            `${label}: action=downgrade の場合は downgrade_to に Info を指定してください。`,
            "error",
            waiverPath,
            "WAIVER-001",
            undefined,
            "change",
          ),
        );
        return;
      }
    }

    if (rawWaiver.severity !== undefined && !severity) {
      validationIssues.push(
        issue(
          "QFAI-WAIVER-001",
          `${label}: severity は warning|warn|info のいずれかで指定してください。`,
          "error",
          waiverPath,
          "WAIVER-001",
          undefined,
          "change",
        ),
      );
      return;
    }

    if (!isValidIsoDate(expiresOn)) {
      validationIssues.push(
        issue(
          "QFAI-WAIVER-001",
          `${label}: expires は YYYY-MM-DD 形式の有効な日付で指定してください。`,
          "error",
          waiverPath,
          "WAIVER-001",
          undefined,
          "change",
        ),
      );
      return;
    }

    const match = mergeMatchScope(matchParsed.match, scope);
    const activeWaiver: ValidationWaiverEntry = {
      id,
      rule: ruleId,
      scope,
      action,
      reason,
      expires: expiresOn,
      evidence,
      match,
      ...(downgradeTo ? { downgrade_to: downgradeTo } : {}),
      ...(severity ? { severity } : {}),
      ...(owner ? { owner } : {}),
      // aliases emitted for downstream readers
      rule_id: ruleId,
      expires_on: expiresOn,
    };

    let blocked = false;
    const ruleSeverity = ruleSeverityIndex.get(ruleId);
    if (!ruleSeverity) {
      blocked = true;
      validationIssues.push(
        issue(
          "QFAI-WAIVER-004",
          `${label}: 未知の rule '${ruleId}' が指定されています。この実行では適用されません。`,
          "warning",
          waiverPath,
          "WAIVER-004",
          [ruleId],
          "change",
        ),
      );
    }

    if (ruleSeverity === "error") {
      blocked = true;
      validationIssues.push(
        issue(
          "QFAI-WAIVER-002",
          `${label}: Error finding を対象にする waiver は禁止です（rule=${ruleId}）。`,
          "error",
          waiverPath,
          "WAIVER-002",
          [id, ruleId],
          "change",
        ),
      );
    }

    const isExpired = expiresOn < todayJst;
    if (isExpired) {
      blocked = true;
      validationIssues.push(
        issue(
          "QFAI-WAIVER-003",
          `${label}: waiver '${id}' は期限切れです（expires=${expiresOn}, today=${todayJst} JST）。`,
          "warning",
          waiverPath,
          "WAIVER-003",
          [id, ruleId],
          "change",
          "期限を更新する前に根本原因を解消し、waiver の削除を検討してください。",
        ),
      );
    }

    if (blocked) {
      return;
    }

    activeWaivers.push(activeWaiver);
    applicableWaivers.push({
      ...activeWaiver,
      pathMatchers: activeWaiver.scope.paths.map(globToRegExp),
    });
  });

  return {
    activeWaivers,
    applicableWaivers,
    validationIssues,
  };
}

type AppliedWaiverResult = {
  issues: Issue[];
  suppressed: ValidationWaivers["suppressed"];
};

function applyWaiversToFindings(
  root: string,
  findings: Issue[],
  waivers: ParsedWaiver[],
): AppliedWaiverResult {
  const suppressedByWaiver: Record<string, number> = {};
  const suppressedByRule: Record<string, number> = {};
  const out: Issue[] = [];

  for (const finding of findings) {
    const ruleId = resolveRuleId(finding);
    if (!ruleId) {
      out.push(finding);
      continue;
    }

    const waiver = waivers.find(
      (candidate) =>
        candidate.rule === ruleId &&
        matchesWaiver(root, finding, candidate.match, candidate.pathMatchers, candidate.severity),
    );
    if (!waiver) {
      out.push(finding);
      continue;
    }

    if (waiver.action === "suppress") {
      suppressedByWaiver[waiver.id] = (suppressedByWaiver[waiver.id] ?? 0) + 1;
      suppressedByRule[ruleId] = (suppressedByRule[ruleId] ?? 0) + 1;
      out.push({ ...finding, suppressed: true });
      continue;
    }

    if (waiver.downgrade_to === "Info" && finding.severity === "warning") {
      out.push({ ...finding, severity: "info" });
      continue;
    }

    out.push(finding);
  }

  const totalSuppressed = Object.values(suppressedByWaiver).reduce((acc, value) => acc + value, 0);

  return {
    issues: out,
    suppressed: {
      total: totalSuppressed,
      byWaiver: sortNumericRecord(suppressedByWaiver),
      byRule: sortNumericRecord(suppressedByRule),
    },
  };
}

function matchesWaiver(
  root: string,
  finding: Issue,
  match: ValidationWaiverMatch | undefined,
  pathMatchers: RegExp[],
  severity: ValidationWaiverSeverity | undefined,
): boolean {
  if (severity && finding.severity !== severity) {
    return false;
  }

  if (!match || !hasMatchScope(match)) {
    return true;
  }

  const hasDlIds = Array.isArray(match.dl_ids) && match.dl_ids.length > 0;
  const hasPaths = pathMatchers.length > 0;

  const dlMatched =
    hasDlIds && match.dl_ids ? match.dl_ids.includes(finding.dl_id ?? "") : !hasDlIds;
  const pathMatched = hasPaths ? matchFindingPath(root, finding.file, pathMatchers) : true;

  return dlMatched && pathMatched;
}

function matchFindingPath(
  root: string,
  findingFile: string | undefined,
  pathMatchers: RegExp[],
): boolean {
  if (!findingFile) {
    return false;
  }
  const relative = normalizePath(toRelativePath(root, findingFile));
  return pathMatchers.some((matcher) => matcher.test(relative));
}

function hasMatchScope(match: ValidationWaiverMatch | undefined): boolean {
  if (!match) {
    return false;
  }
  return (match.dl_ids?.length ?? 0) > 0 || (match.paths?.length ?? 0) > 0;
}

function parseMatch(value: unknown): {
  match?: ValidationWaiverMatch;
  error?: string;
} {
  if (value === undefined || value === null) {
    return {};
  }
  if (!isRecord(value)) {
    return { error: "match はオブジェクトで記述してください。" };
  }

  const dlIdsResult = toStringArray(value.dl_ids);
  if (dlIdsResult.error) {
    return { error: `match.dl_ids: ${dlIdsResult.error}` };
  }
  const pathsResult = toStringArray(value.paths);
  if (pathsResult.error) {
    return { error: `match.paths: ${pathsResult.error}` };
  }

  const match: ValidationWaiverMatch = {};
  if (dlIdsResult.value.length > 0) {
    match.dl_ids = uniqueSorted(dlIdsResult.value.map((item) => item.trim()));
  }
  if (pathsResult.value.length > 0) {
    match.paths = uniqueSorted(pathsResult.value.map((item) => item.trim()));
  }

  return Object.keys(match).length === 0 ? {} : { match };
}

function parseScope(
  scopeValue: unknown,
  fallbackPaths: string[] | undefined,
): {
  scope?: ValidationWaiverScope;
  error?: string;
} {
  const normalizedFallback =
    fallbackPaths && fallbackPaths.length > 0
      ? uniqueSorted(fallbackPaths.map((item) => item.trim()))
      : [];

  if (scopeValue === undefined || scopeValue === null) {
    if (normalizedFallback.length === 0) {
      return { error: "scope.paths は1件以上の文字列配列で指定してください。" };
    }
    return { scope: { paths: normalizedFallback } };
  }

  if (!isRecord(scopeValue)) {
    return { error: "scope はオブジェクトで記述してください。" };
  }

  const pathsResult = toStringArray(scopeValue.paths);
  if (pathsResult.error) {
    return { error: `scope.paths: ${pathsResult.error}` };
  }

  const paths = uniqueSorted(pathsResult.value.map((item) => item.trim()));
  if (paths.length === 0) {
    return { error: "scope.paths は1件以上の文字列配列で指定してください。" };
  }

  return { scope: { paths } };
}

function mergeMatchScope(
  match: ValidationWaiverMatch | undefined,
  scope: ValidationWaiverScope,
): ValidationWaiverMatch {
  const merged: ValidationWaiverMatch = {
    paths: scope.paths,
  };
  if (match?.dl_ids && match.dl_ids.length > 0) {
    merged.dl_ids = uniqueSorted(match.dl_ids.map((item) => item.trim()));
  }
  return merged;
}

function toStringArray(value: unknown): { value: string[]; error?: string } {
  if (value === undefined || value === null) {
    return { value: [] };
  }
  if (!Array.isArray(value)) {
    return { value: [], error: "配列で記述してください。" };
  }
  const out: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") {
      return { value: [], error: "文字列配列で記述してください。" };
    }
    const trimmed = entry.trim();
    if (trimmed.length === 0) {
      continue;
    }
    out.push(trimmed);
  }
  return { value: out };
}

function normalizeVersion(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function normalizeAction(value: unknown): {
  value: ValidationWaiverEntry["action"] | null;
  invalid: boolean;
} {
  if (value === undefined || value === null) {
    return { value: null, invalid: false };
  }
  if (typeof value !== "string") {
    return { value: null, invalid: true };
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "suppress") {
    return { value: "suppress", invalid: false };
  }
  if (normalized === "downgrade") {
    return { value: "downgrade", invalid: false };
  }
  return { value: null, invalid: true };
}

function normalizeWaiverSeverity(value: unknown): ValidationWaiverSeverity | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "warning" || normalized === "warn") {
    return "warning";
  }
  if (normalized === "info") {
    return "info";
  }
  return null;
}

function normalizeDowngradeTo(value: unknown): ValidationWaiverDowngradeTo | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "info") {
    return "Info";
  }
  return null;
}

function normalizeRuleId(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().toUpperCase();
}

function resolveRuleId(finding: Issue): string | null {
  const fromRule = normalizeRuleId(finding.rule);
  if (fromRule && RULE_ID_RE.test(fromRule)) {
    return fromRule;
  }
  const match = finding.code.match(/^QFAI-([A-Z]+-\d{3})$/);
  return match?.[1] ?? null;
}

function buildRuleSeverityIndex(findings: Issue[]): Map<string, IssueSeverity> {
  const map = new Map<string, IssueSeverity>();
  for (const [ruleId, severity] of Object.entries(STATIC_RULE_SEVERITY)) {
    map.set(ruleId, severity);
  }

  for (const finding of findings) {
    const ruleId = resolveRuleId(finding);
    if (!ruleId) {
      continue;
    }
    const current = map.get(ruleId);
    if (!current || severityRank(finding.severity) > severityRank(current)) {
      map.set(ruleId, finding.severity);
    }
  }

  return map;
}

function severityRank(value: IssueSeverity): number {
  if (value === "error") return 3;
  if (value === "warning") return 2;
  return 1;
}

function todayDateJst(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) {
    return false;
  }
  const [yearText, monthText, dayText] = value.split("-");
  const year = Number.parseInt(yearText ?? "", 10);
  const month = Number.parseInt(monthText ?? "", 10);
  const day = Number.parseInt(dayText ?? "", 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return false;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\.\//, "").toLowerCase();
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function sortNumericRecord(input: Record<string, number>): Record<string, number> {
  const sortedEntries = Object.entries(input).sort(([a], [b]) => a.localeCompare(b));
  return Object.fromEntries(sortedEntries);
}

function globToRegExp(pattern: string): RegExp {
  const source = normalizePath(pattern);
  let out = "^";
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index] ?? "";
    const next = source[index + 1] ?? "";
    if (char === "*" && next === "*") {
      const after = source[index + 2];
      if (after === "/") {
        out += "(?:.*\\/)?";
        index += 2;
        continue;
      }
      out += ".*";
      index += 1;
      continue;
    }
    if (char === "*") {
      out += "[^/]*";
      continue;
    }
    if (char === "?") {
      out += "[^/]";
      continue;
    }
    out += escapeRegExp(char);
  }
  out += "$";
  return new RegExp(out, "i");
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

async function exists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

const STATIC_RULE_SEVERITY: Record<string, IssueSeverity> = {
  "COMPAT-001": "error",
  "COMPAT-002": "error",
  "COMPAT-003": "warning",
  "COMPAT-004": "warning",
  "COMPAT-005": "warning",
  "CTYPE-001": "error",
  "CTYPE-002": "warning",
  "CTYPE-003": "error",
  "DELTA-001": "error",
  "DELTA-002": "error",
  "DELTA-003": "error",
  "SCOPE-001": "warning",
  "SCOPE-002": "info",
  // TDDLIST_EXCEPTION_PARKED. Registered statically so a project can pre-record
  // an accepted-risk waiver without QFAI-WAIVER-003 calling the rule unknown on
  // the runs where no item is currently parked.
  "TDDLIST-001": "warning",
  "WAIVER-001": "error",
  "WAIVER-002": "error",
  "WAIVER-003": "warning",
  "WAIVER-004": "warning",
  "VFY-001": "error",
  "VFY-002": "error",
  "VFY-003": "error",
  "VFY-004": "error",
  "VFY-005": "error",
  "VFY-006": "warning",
  "VFY-007": "warning",
};
