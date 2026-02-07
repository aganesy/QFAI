import { access, readFile } from "node:fs/promises";
import path from "node:path";

import { parse as parseYaml } from "yaml";

import { toRelativePath } from "./paths.js";
import type {
  Issue,
  IssueSeverity,
  ValidationWaiverDowngradeTo,
  ValidationWaiverEntry,
  ValidationWaiverMatch,
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
  const applied = applyWaiversToFindings(
    resolvedRoot,
    findings,
    loaded.applicableWaivers,
  );

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
    const ruleId = normalizeRuleId(rawWaiver.rule_id);
    const action = normalizeAction(rawWaiver.action);
    const reason = asTrimmedString(rawWaiver.reason);
    const expiresOn = asTrimmedString(rawWaiver.expires_on);
    const owner = asTrimmedString(rawWaiver.owner);

    if (!id || !ruleId || !action || !reason || !expiresOn) {
      validationIssues.push(
        issue(
          "QFAI-WAIVER-001",
          `${label}: id/rule_id/action/reason/expires_on は必須です。`,
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
          `${label}: rule_id は 'COMPAT-003' のような形式（^[A-Z]+-\\d{3}$）で指定してください。`,
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

    const matchParsed = parseMatch(rawWaiver.match);
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

    if (!isValidIsoDate(expiresOn)) {
      validationIssues.push(
        issue(
          "QFAI-WAIVER-001",
          `${label}: expires_on は YYYY-MM-DD 形式の有効な日付で指定してください。`,
          "error",
          waiverPath,
          "WAIVER-001",
          undefined,
          "change",
        ),
      );
      return;
    }

    const activeWaiver: ValidationWaiverEntry = {
      id,
      rule_id: ruleId,
      action,
      reason,
      expires_on: expiresOn,
      ...(matchParsed.match ? { match: matchParsed.match } : {}),
      ...(downgradeTo ? { downgrade_to: downgradeTo } : {}),
      ...(owner ? { owner } : {}),
    };

    let blocked = false;
    const ruleSeverity = ruleSeverityIndex.get(ruleId);
    if (!ruleSeverity) {
      blocked = true;
      validationIssues.push(
        issue(
          "QFAI-WAIVER-004",
          `${label}: 未知の rule_id '${ruleId}' が指定されています。この実行では適用されません。`,
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
          "QFAI-WAIVER-003",
          `${label}: Error ルール '${ruleId}' への suppress/downgrade は禁止です。`,
          "error",
          waiverPath,
          "WAIVER-003",
          [ruleId],
          "change",
        ),
      );
    }

    const isExpired = expiresOn < todayJst;
    if (isExpired) {
      blocked = true;
      validationIssues.push(
        issue(
          "QFAI-WAIVER-002",
          `${label}: waiver '${id}' は期限切れです（expires_on=${expiresOn}, today=${todayJst} JST）。`,
          "error",
          waiverPath,
          "WAIVER-002",
          [id, ruleId],
          "change",
          "期限を更新する前に、scope/compat/Change Type の根本対応か waiver 削除を検討してください。",
        ),
      );
    }

    if (!hasMatchScope(matchParsed.match)) {
      validationIssues.push(
        issue(
          "QFAI-WAIVER-005",
          `${label}: match が未指定または空のため全体適用になります。`,
          "warning",
          waiverPath,
          "WAIVER-005",
          [id, ruleId],
          "change",
          "match.dl_ids か match.paths を指定し、例外範囲を局所化してください。",
        ),
      );
    }

    if (!matchParsed.match?.dl_ids || matchParsed.match.dl_ids.length === 0) {
      validationIssues.push(
        issue(
          "QFAI-WAIVER-006",
          `${label}: match.dl_ids が無いため Decision Log との紐付けが追跡できません。`,
          "warning",
          waiverPath,
          "WAIVER-006",
          [id, ruleId],
          "change",
          "match.dl_ids に対象 DL ID（例: DL-YYYYMMDD-XX）を指定してください。",
        ),
      );
    }

    if (blocked) {
      return;
    }

    activeWaivers.push(activeWaiver);
    applicableWaivers.push({
      ...activeWaiver,
      pathMatchers: (activeWaiver.match?.paths ?? []).map(globToRegExp),
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
        candidate.rule_id === ruleId &&
        matchesWaiver(root, finding, candidate.match, candidate.pathMatchers),
    );
    if (!waiver) {
      out.push(finding);
      continue;
    }

    if (waiver.action === "suppress") {
      suppressedByWaiver[waiver.id] = (suppressedByWaiver[waiver.id] ?? 0) + 1;
      suppressedByRule[ruleId] = (suppressedByRule[ruleId] ?? 0) + 1;
      continue;
    }

    if (
      waiver.action === "downgrade" &&
      waiver.downgrade_to === "Info" &&
      finding.severity === "warning"
    ) {
      out.push({ ...finding, severity: "info" });
      continue;
    }

    out.push(finding);
  }

  const totalSuppressed = Object.values(suppressedByWaiver).reduce(
    (acc, value) => acc + value,
    0,
  );

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
): boolean {
  if (!match || !hasMatchScope(match)) {
    return true;
  }

  const hasDlIds = Array.isArray(match.dl_ids) && match.dl_ids.length > 0;
  const hasPaths = pathMatchers.length > 0;

  const dlMatched = hasDlIds
    ? !!finding.dl_id && match.dl_ids!.includes(finding.dl_id)
    : true;
  const pathMatched = hasPaths
    ? matchFindingPath(root, finding.file, pathMatchers)
    : true;

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

function normalizeAction(
  value: unknown,
): ValidationWaiverEntry["action"] | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "suppress") {
    return "suppress";
  }
  if (normalized === "downgrade") {
    return "downgrade";
  }
  return null;
}

function normalizeDowngradeTo(
  value: unknown,
): ValidationWaiverDowngradeTo | null {
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
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return false;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
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

function sortNumericRecord(
  input: Record<string, number>,
): Record<string, number> {
  const sortedEntries = Object.entries(input).sort(([a], [b]) =>
    a.localeCompare(b),
  );
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
  "WAIVER-001": "error",
  "WAIVER-002": "error",
  "WAIVER-003": "error",
  "WAIVER-004": "warning",
  "WAIVER-005": "warning",
  "WAIVER-006": "warning",
};
