import { access, readFile } from "node:fs/promises";
import path from "node:path";

import { parse as parseYaml } from "yaml";

import { toRelativePath } from "./paths.js";
import { escapeRegExp } from "./regex.js";
import {
  EXCEPTION_PARKED_CODE,
  EXCEPTION_PARKED_RULE_ID,
  UNKNOWN_LEVEL_CODE,
  UNKNOWN_LEVEL_RULE_ID,
} from "./ruleIds.js";
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
/**
 * The shape a waiver's `rule:` may take.
 *
 * This used to be `/^[A-Z]+-\d{3}$/`, which accepts **none** of the identifiers
 * `qfai validate` publishes. An operator copying `QFAI-ATDD-112` out of
 * `validate.json` — the only spelling the CLI, the JSON report and the GitHub
 * annotations ever print — got a hard `QFAI-WAIVER-001`, and the form the engine
 * actually keyed on (`ATDD-112`, the capture group inside `resolveRuleKeys`)
 * appeared in no shipped artifact.
 *
 * It now accepts every code shape the package emits: `QFAI-ATDD-112`,
 * `TDDLIST_INVALID_STATUS`, `E_TC_ORPHAN`, `D-SCAFFOLD-PLACEHOLDER`, and the
 * legacy stripped `ATDD-112`.
 */
const RULE_ID_RE = /^[A-Z][A-Z0-9]*(?:[-_][A-Z0-9]+)*$/;

/**
 * Rules whose findings are *always* per-row, so the waiver is rejected outright
 * without `match.dl_ids`.
 *
 * Every row of one `tdd/test-list.md` produces `TDDLIST_EXCEPTION_PARKED` with
 * the same rule and the same `file`, so a waiver matched on `rule` +
 * `scope.paths` alone would suppress the unapproved rows next to the approved
 * one. Not one finding of these rules is file-wide, so refusing the waiver at
 * load time costs the operator nothing and says why.
 *
 * A rule whose findings are *mixed* — some naming a row, some naming the whole
 * file — must not be listed here: blocking the waiver would also take away the
 * file-wide finding's only way to be accepted. Those are handled per finding
 * instead, by {@link matchesWaiver}: a waiver that names no `dl_ids` reaches
 * only the findings that name no row.
 *
 * Both spellings {@link resolveRuleKeys} accepts are listed. Holding only the
 * rule id would let the code spelling — the one operators are told to write —
 * skip the `match.dl_ids` requirement entirely.
 */
const ROW_SCOPED_RULES = new Set<string>([EXCEPTION_PARKED_CODE, EXCEPTION_PARKED_RULE_ID]);

/**
 * `scope.paths` spellings that scope a waiver to the whole repository.
 *
 * A finding with no `file` is repo-level by construction, so no glob can name
 * it. Only these repo-wide spellings reach it: a narrow scope such as
 * `.qfai/contracts/ui/a.yaml` must not suppress a file-less finding, because
 * validators aggregate several files into one such finding (for example
 * `uiDefinitionConsistency` raises one `QFAI-CONSISTENCY-002` per screen id
 * over every UI Contract), and a one-file waiver would sweep up the screens
 * that came from the other files too.
 */
const REPO_WIDE_PATH_GLOBS = new Set<string>(["**", "**/*", "**/**"]);

type ParsedWaiver = ValidationWaiverEntry & {
  pathMatchers: RegExp[];
  /** True when at least one `scope.paths` entry is a repo-wide glob. */
  repoWideScope: boolean;
};

export async function applyWaivers(
  root: string,
  findings: Issue[],
): Promise<{ issues: Issue[]; waivers: ValidationWaivers }> {
  const { applied, loaded } = await runWaiverPass(root, findings);

  return {
    issues: [...applied.issues, ...loaded.validationIssues],
    waivers: {
      active: loaded.activeWaivers,
      suppressed: applied.suppressed,
    },
  };
}

/**
 * Runs the same waiver pass over findings raised outside `validateProject`.
 *
 * `report` adds findings of its own (the uncounted-delta scan) after
 * `validateProject` has already applied waivers, so without this pass they are
 * structurally unwaivable: no `suppress` and no `downgrade_to` could ever reach
 * them, and a project that deliberately keeps an unfilled delta would be stuck
 * with a warning it has no way to accept.
 *
 * The waiver file's own findings (`QFAI-WAIVER-00x`) are deliberately dropped:
 * `validateProject` already reported them for this same file, and returning
 * them again would double-count every parse error.
 *
 * The waivers this pass found applicable do come back, in `active`. The caller
 * cannot assume its own `ValidationResult` already lists them — a result read
 * back from a stored `validate.json` may carry no `waivers` block at all — and
 * a report that prints `active 0 / suppressed 1` names no waiver for the
 * suppression it just performed.
 */
export async function applyWaiversToExtraFindings(
  root: string,
  findings: Issue[],
): Promise<ExtraFindingsWaiverResult> {
  const { applied, loaded } = await runWaiverPass(root, findings);
  return { ...applied, active: loaded.activeWaivers };
}

async function runWaiverPass(
  root: string,
  findings: Issue[],
): Promise<{ applied: AppliedWaiverResult; loaded: LoadWaiversResult }> {
  const resolvedRoot = path.resolve(root);
  const ruleSeverityIndex = buildRuleSeverityIndex(findings);
  const loaded = await loadWaivers(resolvedRoot, ruleSeverityIndex);
  return {
    applied: applyWaiversToFindings(resolvedRoot, findings, loaded.applicableWaivers),
    loaded,
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
          `${label}: rule には findings が報告する code をそのまま指定してください（例: 'QFAI-ATDD-112'、'TDDLIST_UNKNOWN_LEVEL'）。許容形式: ^[A-Z][A-Z0-9]*([-_][A-Z0-9]+)*$`,
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

    if (ROW_SCOPED_RULES.has(ruleId) && (match.dl_ids?.length ?? 0) === 0) {
      blocked = true;
      validationIssues.push(
        issue(
          "QFAI-WAIVER-005",
          `${label}: rule '${ruleId}' は行単位の findings です。scope.paths だけでは同じファイルの未承認行まで抑制されるため、match.dl_ids に承認済みの行 ID を列挙してください。この実行では適用されません。`,
          "warning",
          waiverPath,
          "WAIVER-005",
          [id, ruleId],
          "change",
          "承認された行の ID（例: TDD-0001）だけを match.dl_ids に列挙してください。",
        ),
      );
    }

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
      repoWideScope: activeWaiver.scope.paths.some(isRepoWidePathGlob),
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

/** What {@link applyWaiversToExtraFindings} hands back to its caller. */
export type ExtraFindingsWaiverResult = AppliedWaiverResult & {
  /**
   * The waivers this pass loaded and could apply, so the caller can fold them
   * into whatever active list it publishes.
   */
  active: ValidationWaiverEntry[];
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
    const ruleKeys = resolveRuleKeys(finding);
    if (ruleKeys.length === 0) {
      out.push(finding);
      continue;
    }

    const waiver = waivers.find(
      (candidate) => ruleKeys.includes(candidate.rule) && matchesWaiver(root, finding, candidate),
    );
    if (!waiver) {
      out.push(finding);
      continue;
    }

    if (waiver.action === "suppress") {
      suppressedByWaiver[waiver.id] = (suppressedByWaiver[waiver.id] ?? 0) + 1;
      // Count under the waiver's own spelling, so the report reads back the
      // key the operator wrote rather than an alias they never chose.
      suppressedByRule[waiver.rule] = (suppressedByRule[waiver.rule] ?? 0) + 1;
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

function matchesWaiver(root: string, finding: Issue, waiver: ParsedWaiver): boolean {
  const { match, pathMatchers, severity, repoWideScope } = waiver;

  if (severity && finding.severity !== severity) {
    return false;
  }

  const dlIds = match?.dl_ids ?? [];

  // `dl_id` is the finding's way of saying "I am one row of this file, not the
  // file". A waiver that names no `dl_ids` is therefore a file-wide waiver, and
  // letting it through here would suppress every row the operator never
  // approved — including rows added to the file long after the waiver was
  // written. A file-wide waiver reaches the file-wide findings only.
  if (dlIds.length === 0) {
    if (finding.dl_id !== undefined) {
      return false;
    }
    if (!match || !hasMatchScope(match)) {
      return true;
    }
    return (
      pathMatchers.length === 0 || matchFindingPath(root, finding.file, pathMatchers, repoWideScope)
    );
  }

  if (!dlIds.includes(finding.dl_id ?? "")) {
    return false;
  }
  return (
    pathMatchers.length === 0 || matchFindingPath(root, finding.file, pathMatchers, repoWideScope)
  );
}

function matchFindingPath(
  root: string,
  findingFile: string | undefined,
  pathMatchers: RegExp[],
  repoWideScope: boolean,
): boolean {
  if (!findingFile) {
    // A finding with no `file` is repo-level: no path names it, so `scope.paths`
    // has nothing to compare it against. Treating it as unmatched made every such
    // finding unwaivable at any glob — `**` included — with no diagnostic saying
    // so; treating it as matched at *any* glob would let a one-file waiver
    // suppress a repo-level finding raised over other files. Only an explicitly
    // repo-wide scope reaches it. The waiver's other predicates (rule, severity,
    // match.dl_ids) still gate it.
    return repoWideScope;
  }
  const relative = normalizePath(toRelativePath(root, findingFile));
  return pathMatchers.some((matcher) => matcher.test(relative));
}

function isRepoWidePathGlob(pattern: string): boolean {
  return REPO_WIDE_PATH_GLOBS.has(normalizePath(pattern.trim()));
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

/**
 * Every key a waiver may use to name this finding, most canonical first.
 *
 * The primary key is `finding.code` verbatim — the only spelling an operator
 * ever sees. The `QFAI-`-stripped form stays as a back-compat alias so waiver
 * files written against the old grammar keep working, and a rule-shaped
 * `finding.rule` remains accepted for the validators that set one.
 *
 * Returning a list rather than one key is what makes both spellings work at
 * once; the previous single-key form had to pick, and it picked the one nothing
 * prints.
 */
function resolveRuleKeys(finding: Issue): string[] {
  const keys: string[] = [];
  const push = (value: string | null | undefined): void => {
    if (value && RULE_ID_RE.test(value) && !keys.includes(value)) {
      keys.push(value);
    }
  };
  push(finding.code);
  push(finding.code.match(/^QFAI-([A-Z]+-\d{3})$/)?.[1]);
  push(normalizeRuleId(finding.rule));
  return keys;
}

/**
 * Severity per waiver key: what this run observed, falling back to what the
 * package declares.
 *
 * Observed beats declared. A static entry only says the rule exists so a waiver
 * for it does not read as unknown on the runs where it stays quiet; letting that
 * declaration outrank a finding actually in hand would judge the waiver against
 * a severity this run never produced.
 */
function buildRuleSeverityIndex(findings: Issue[]): Map<string, IssueSeverity> {
  const map = new Map<string, IssueSeverity>();

  // Register every alias: a waiver written against one spelling must not read
  // as an unknown rule because the index only holds the other.
  for (const finding of findings) {
    for (const ruleId of resolveRuleKeys(finding)) {
      const current = map.get(ruleId);
      if (!current || severityRank(finding.severity) > severityRank(current)) {
        map.set(ruleId, finding.severity);
      }
    }
  }

  for (const entry of STATIC_RULE_SEVERITY) {
    for (const ruleId of entry.keys) {
      if (!map.has(ruleId)) {
        map.set(ruleId, entry.severity);
      }
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

/**
 * Rules a waiver may name before any run has produced one.
 *
 * Each entry lists **every** spelling `resolveRuleKeys` would yield had the rule
 * actually fired, so a waiver does not read as an unknown rule on the quiet runs
 * merely because it was written with the code the CLI prints rather than the
 * stripped rule id. Severities match the emitters — a static entry that
 * understates severity would let `QFAI-WAIVER-002` pass a waiver it must block.
 *
 * Deliberately small: an entry here is a promise the rule exists. `COMPAT-*`,
 * `DELTA-*`, `VFY-*` and most of `CTYPE-*` were listed and are emitted by
 * nothing under `src/`, so they told an operator a rule was real and waivable
 * when it could never fire — while the codes that do fire were rejected
 * outright by the grammar above.
 */
const STATIC_RULE_SEVERITY: ReadonlyArray<{
  readonly keys: readonly string[];
  readonly severity: IssueSeverity;
}> = [
  // Both emitted at `error` by core/validate.ts; registered so a waiver aimed at
  // them is refused as an error-severity target rather than as an unknown rule.
  { keys: ["QFAI-SCOPE-001", "SCOPE-001"], severity: "error" },
  { keys: ["QFAI-SCOPE-002", "SCOPE-002"], severity: "error" },
  // Registered so a project can pre-record an accepted-risk waiver without
  // QFAI-WAIVER-004 calling the rule unknown on the runs where no item is
  // currently parked.
  { keys: [EXCEPTION_PARKED_CODE, EXCEPTION_PARKED_RULE_ID], severity: "warning" },
  // Registered so a project using its own Level vocabulary can pre-record the
  // waiver without QFAI-WAIVER-004 calling the rule unknown on the runs where
  // every Level is recognized.
  { keys: [UNKNOWN_LEVEL_CODE, UNKNOWN_LEVEL_RULE_ID], severity: "warning" },
  // Emitted at `warning` by core/report.ts for a delta file the Change Type
  // counters could not use. `validate` never raises it, so a project that
  // accepts an intentionally unfilled delta would otherwise have its waiver
  // read as an unknown rule on every `qfai validate` run.
  { keys: ["QFAI-CTYPE-004", "CTYPE-004"], severity: "warning" },
  // This module's own findings, emitted on every run that parses a waiver file.
  { keys: ["QFAI-WAIVER-001", "WAIVER-001"], severity: "error" },
  { keys: ["QFAI-WAIVER-002", "WAIVER-002"], severity: "error" },
  { keys: ["QFAI-WAIVER-003", "WAIVER-003"], severity: "warning" },
  { keys: ["QFAI-WAIVER-004", "WAIVER-004"], severity: "warning" },
  { keys: ["QFAI-WAIVER-005", "WAIVER-005"], severity: "warning" },
];
