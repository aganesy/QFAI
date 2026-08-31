import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { buildContractIndex } from "../contractIndex.js";
import {
  AC_GHERKIN_SECTION,
  extractIds,
  extractInvalidIdOccurrences,
  type FenceMaskOptions,
  type IdFormatPrefix,
} from "../ids.js";
import {
  collectMissingLayeredSharedRequiredFiles,
  collectMissingRequiredFiles,
  collectMissingLayeredRequiredFiles,
  collectSpecEntries,
  type SpecEntry,
  type RequiredSpecPackFile,
} from "../specLayout.js";
import {
  buildItemIdPattern,
  buildLoosePrefixPattern,
  extractInvalidIds as extractInvalidSpecPackIds,
  isValidId,
  parseSemicolonIdList,
  type SpecPackIdKind,
} from "../specPackIds.js";
import {
  maskNonSpecRegions,
  parseAcceptanceCriteriaIds,
  parseAllMarkdownTables,
  parseExamplesFeature,
  parseFirstMarkdownTable,
  parseIdsFromText,
  parseTestCaseIds,
  resolveTestCaseTable,
} from "../specPackParsers.js";
import { parseSpec, SPEC_STATUS_VALUES, type ParsedSpec } from "../parse/spec.js";
import {
  TRIAGE_TABLE_HEADER,
  TRIAGE_TOP_LEVEL_OPS,
  TRIAGE_UPDATE_SUBOPS,
  type TriageTopLevelOp,
  type TriageUpdateSubOp,
} from "../sddTriage.js";
import { loadLayerPolicy } from "../layerPolicy.js";
import { RULE_PROMOTIONS, newRuleSeverity } from "../sunset.js";
import type { Issue } from "../types.js";
import { resolveToolVersion } from "../version.js";
import { issue } from "./utils.js";

/** The release `QFAI-TRIAGE-008` stops being a warning at. */
const TRIAGE_HEADING_PROMOTION = RULE_PROMOTIONS.triageHeadingNonCanonical.promoteAt;

const LEDGER_REQUIRED_COLUMNS = [
  "trace_id",
  "obj_id",
  "init_id",
  "cap_id",
  "flow_id",
  "us_id",
  "ac_id",
  "ex_ids",
  "tc_ids",
] as const;

const MAX_REF_SAMPLES = 8;
const DELTA_REQUIRED_H2_HEADINGS = [
  "Change Summary",
  "Rationale",
  "Candidates Considered",
  "Adopted",
  "Rejected",
  "Impact",
  "Follow-ups",
] as const;

type OpenQuestionStatus = {
  id: string;
  status: "open" | "resolved" | "deferred";
};

type InvalidOpenQuestionStatus = {
  id: string;
  value: string;
};

type LedgerRequiredColumn = (typeof LEDGER_REQUIRED_COLUMNS)[number];

type SpecDefinitions = {
  objIds: Set<string>;
  initIds: Set<string>;
  capIds: Set<string>;
  flowIds: Set<string>;
  usIds: Set<string>;
  acIds: Set<string>;
  exIds: Set<string>;
  tcIds: Set<string>;
};

export async function validateSpecPacks(root: string, config: QfaiConfig): Promise<Issue[]> {
  const specsRoot = resolvePath(root, config, "specsDir");
  const entries = await collectSpecEntries(specsRoot);
  if (entries.length === 0) {
    return [
      issue(
        "QFAI-SPACK-000",
        `Spec Pack が見つかりません。配置場所: ${config.paths.specsDir} / 期待: spec-0001/01_Spec.md ... 18_delta.md または Layered spec (01_Spec.md ... *_delta.md)`,
        "info",
        specsRoot,
        "specPack.files",
      ),
    ];
  }

  const contractIndex = await buildContractIndex(root, config);
  const layerPolicy = await loadLayerPolicy(root, config);
  // Resolved once for the whole run rather than per spec entry: the promotion
  // window `QFAI-TRIAGE-008` sits in is a property of the tool, not of the
  // delta file being read.
  const toolVersion = await resolveToolVersion();
  const issues: Issue[] = [...layerPolicy.issues];

  const knownSpecIds = new Set(entries.map((entry) => `spec-${entry.specNumber}`));

  for (const entry of entries) {
    if (entry.layout === "layered") {
      issues.push(...(await validateLayeredSpecEntry(entry, layerPolicy.tags)));
    } else if (entry.layout === "spec-pack") {
      issues.push(...(await validateSpecPackEntry(entry, layerPolicy.tags)));
      issues.push(...(await validateTraceabilityLedger(entry, contractIndex.ids)));
    } else {
      // Unknown layout — skip layout-specific AND common checks since we
      // cannot reason about the entry's structure. Other validators will
      // surface the layout problem separately.
      continue;
    }
    // Common checks (PR #206 review #42): Status / Triage validation is
    // layout-independent, so factor it out of the per-branch tail to
    // avoid two-place drift when a third layout is introduced.
    issues.push(...(await validateSpecStatusForEntry(entry, knownSpecIds)));
    issues.push(...(await validateTriageSectionForEntry(entry, toolVersion)));
  }

  // Cross-spec / policy-only triage rows live in `_policies/10_delta.md`
  // (per `_policies/11_Slice-Policy.md` Decision procedure). The
  // per-entry loop above does not include `_policies/` so the same
  // Triage validators (QFAI-TRIAGE-001..006) must be invoked separately
  // (PR #206 review LW-F). Without this branch, CREATE rows in the
  // policy delta would silently bypass QFAI-TRIAGE-006 and SPLIT/MERGE
  // rows would skip the approval gate.
  issues.push(...(await validatePoliciesDeltaTriage(specsRoot, toolVersion)));

  return issues;
}

async function validatePoliciesDeltaTriage(
  specsRoot: string,
  toolVersion: string,
): Promise<Issue[]> {
  const deltaPath = path.join(specsRoot, "_policies", "10_delta.md");
  let text: string;
  try {
    text = await readFile(deltaPath, "utf-8");
  } catch {
    // No policy delta — nothing to validate. Other validators surface
    // missing _policies files separately.
    return [];
  }
  const capabilitiesPath = path.join(specsRoot, "_policies", "03_Capabilities.md");
  const issues = validateTriageSection(text, deltaPath, toolVersion);
  issues.push(...(await validateCreateRowCapabilityRefs(text, deltaPath, capabilitiesPath)));
  return issues;
}

const STATUS_ENUM_LIST = SPEC_STATUS_VALUES.join(" | ");
const SUPERSEDED_BY_RE = /^spec-\d{4}$/;
const DEPRECATED_AT_RE = /^\d{4}-\d{2}-\d{2}$/;

async function validateSpecStatusForEntry(
  entry: SpecEntry,
  knownSpecIds: Set<string>,
): Promise<Issue[]> {
  const specMdPath = entry.specPath;
  if (!specMdPath) {
    return [];
  }
  let text: string;
  try {
    text = await readFile(specMdPath, "utf-8");
  } catch {
    return [];
  }
  const parsed = parseSpec(text, specMdPath);
  return validateSpecStatus(parsed, specMdPath, knownSpecIds);
}

export function validateSpecStatus(
  parsed: ParsedSpec,
  specMdPath: string,
  knownSpecIds: Set<string>,
): Issue[] {
  const issues: Issue[] = [];

  if (parsed.statusRaw === undefined) {
    issues.push(
      issue(
        "QFAI-STATUS-001",
        `01_Spec.md に Status bullet が見つかりません。許容値: ${STATUS_ENUM_LIST}`,
        "error",
        specMdPath,
        "specStatus.required",
        undefined,
        "canonical",
        "01_Spec.md の冒頭 bullet ブロックに `- Status: active` を追加してください。",
      ),
    );
    return issues;
  }

  if (parsed.status === undefined) {
    issues.push(
      issue(
        "QFAI-STATUS-002",
        `Status の値が不正です: ${parsed.statusRaw}。許容値: ${STATUS_ENUM_LIST}`,
        "error",
        specMdPath,
        "specStatus.enum",
        [parsed.statusRaw],
        "canonical",
        `01_Spec.md の \`- Status:\` 行を ${STATUS_ENUM_LIST} のいずれかに修正してください。`,
      ),
    );
    return issues;
  }

  if (parsed.status === "superseded") {
    if (!parsed.supersededBy) {
      issues.push(
        issue(
          "QFAI-STATUS-003",
          "Status: superseded には Superseded-by が必須です。",
          "error",
          specMdPath,
          "specStatus.supersededBy.required",
          undefined,
          "canonical",
          "01_Spec.md に `- Superseded-by: spec-NNNN` を設定してください。",
        ),
      );
    } else if (!SUPERSEDED_BY_RE.test(parsed.supersededBy)) {
      issues.push(
        issue(
          "QFAI-STATUS-003",
          `Superseded-by の形式が不正です: ${parsed.supersededBy} (期待: spec-NNNN)`,
          "error",
          specMdPath,
          "specStatus.supersededBy.format",
          [parsed.supersededBy],
          "canonical",
          "Superseded-by を `spec-0001` のような 4 桁形式に修正してください。",
        ),
      );
    } else if (!knownSpecIds.has(parsed.supersededBy)) {
      issues.push(
        issue(
          "QFAI-STATUS-004",
          `Superseded-by が指す spec が存在しません: ${parsed.supersededBy}`,
          "error",
          specMdPath,
          "specStatus.supersededBy.exists",
          [parsed.supersededBy],
          "canonical",
          "置換先 spec を作成するか、Superseded-by を実在する spec ID に修正してください。",
        ),
      );
    }
  }

  if (parsed.status === "deprecated" || parsed.status === "removed") {
    if (!parsed.deprecatedAt) {
      issues.push(
        issue(
          "QFAI-STATUS-005",
          `Status: ${parsed.status} には Deprecated-at が必須です。`,
          "error",
          specMdPath,
          "specStatus.deprecatedAt.required",
          undefined,
          "canonical",
          "01_Spec.md に `- Deprecated-at: YYYY-MM-DD` を設定してください。",
        ),
      );
    } else if (!DEPRECATED_AT_RE.test(parsed.deprecatedAt)) {
      issues.push(
        issue(
          "QFAI-STATUS-006",
          `Deprecated-at の形式が不正です: ${parsed.deprecatedAt} (期待: YYYY-MM-DD)`,
          "error",
          specMdPath,
          "specStatus.deprecatedAt.format",
          [parsed.deprecatedAt],
          "canonical",
          "Deprecated-at を `YYYY-MM-DD` 形式に修正してください。",
        ),
      );
    }
  }

  return issues;
}

const APPROVAL_REQUIRED_OPS = new Set<TriageTopLevelOp>([
  "CREATE",
  "DELETE",
  "SPLIT",
  "MERGE",
  "SUPERSEDE",
]);
const TRIAGE_REQUIRED_COLUMNS = ["source", "subject", "existing spec", "operation"] as const;

/**
 * Operations whose unit is a whole spec directory, never an item inside one.
 * `QFAI-TRIAGE-003` is a membership check on the Operation label, so it cannot
 * catch `SPLIT` applied to a `BR-0001-0002` — the one case where the word means
 * something the toolkit does not implement.
 *
 * `DELETE` belongs here for the same reason: `sdd-triage.md` "Operation scope"
 * defines it as removing the spec directory itself, and deleting one item is
 * `UPDATE:REMOVE`.
 */
const SPEC_SCOPED_OPS = new Set<TriageTopLevelOp>(["SPLIT", "MERGE", "SUPERSEDE", "DELETE"]);

/** Bracket pairs that mark a parenthetical citation in a `Subject` cell. */
const CITATION_BRACKETS: ReadonlyArray<readonly [string, string]> = [
  ["(", ")"],
  ["（", "）"],
  ["[", "]"],
  ["［", "］"],
  ["【", "】"],
];

/**
 * Half-open `[start, end)` spans of the Subject that sit inside a parenthetical
 * citation. Nesting is handled per bracket kind; an unclosed opener runs to the
 * end of the cell, which keeps a malformed Subject on the permissive side of
 * "cited" only for the text after the opener.
 */
function citationSpans(subject: string): Array<[number, number]> {
  const spans: Array<[number, number]> = [];
  for (const [open, close] of CITATION_BRACKETS) {
    let depth = 0;
    let start = -1;
    for (let index = 0; index < subject.length; index++) {
      const char = subject[index];
      if (char === open) {
        if (depth === 0) start = index;
        depth++;
      } else if (char === close && depth > 0) {
        depth--;
        if (depth === 0 && start >= 0) {
          spans.push([start, index + 1]);
          start = -1;
        }
      }
    }
    if (depth > 0 && start >= 0) {
      spans.push([start, subject.length]);
    }
  }
  return spans;
}

/**
 * Item IDs a Triage `Subject` names as the **object** of its operation.
 *
 * Mere co-occurrence decides nothing in either direction. A spec-level row
 * often cites the item that motivated it (`classifyTriage` copies the REQ
 * subject verbatim onto its MERGE and SPLIT rows), and an item-level misuse
 * often names the containing spec — so "an item ID is present" over-fires and
 * "a spec is also present" under-fires.
 *
 * The structural rule is **a motivating item is cited in brackets; anything
 * outside brackets is the object**:
 *
 * - `delete BR-0006-0004 from spec-0006` -> bare item -> item-scoped, finding.
 * - `spec-0006 にある BR-0006-0004 を削除` -> bare item -> finding. Position
 *   cannot decide this: the spec is named first but only as the item's
 *   location, which is why the earlier first-mention-wins rule missed it.
 * - `split spec-0006 (BR-0006-0004 起点)` -> item bracketed -> silent.
 * - `CAP-0003 を分離 (BR-0006-0004)` -> item bracketed -> silent.
 *
 * It is deterministic, needs no grammar, and matches the remediation text: a
 * genuinely spec-level row names only its `spec-NNNN` / `CAP-NNNN` target
 * outside brackets and puts the motivating item inside them.
 */
function findOperationObjectItemIds(subject: string): string[] {
  const spans = citationSpans(subject);
  // First-seen order, deduplicated: an ID written twice unbracketed is one
  // offending ID, and listing it twice repeats it in both the message and
  // `refs` without telling the reader anything new.
  const ids = new Set<string>();
  for (const match of subject.matchAll(buildItemIdPattern())) {
    const index = match.index;
    const cited = spans.some(([start, end]) => index >= start && index < end);
    if (!cited) {
      ids.add(match[0]);
    }
  }
  return Array.from(ids);
}

const TRIAGE_TOP_LEVEL_LABELS = new Set<string>([...TRIAGE_TOP_LEVEL_OPS, "UPDATE"]);
const TRIAGE_SUB_OPS = new Set<string>(TRIAGE_UPDATE_SUBOPS);

/**
 * Type guard for the canonical triage Operation labels (top-level + UPDATE).
 * Replaces a bare `as` assertion at the call site (PR #206 review #34).
 */
function isTriageTopLevelLabel(value: string): value is "UPDATE" | TriageTopLevelOp {
  return TRIAGE_TOP_LEVEL_LABELS.has(value);
}

/**
 * Type guard for the canonical triage UPDATE Sub-op labels. Replaces a
 * bare `as TriageUpdateSubOp` assertion at the call site
 * (PR #206 review #37).
 */
function isTriageUpdateSubOp(value: string): value is TriageUpdateSubOp {
  return TRIAGE_SUB_OPS.has(value);
}

async function validateTriageSectionForEntry(
  entry: SpecEntry,
  toolVersion: string,
): Promise<Issue[]> {
  const deltaPath = entry.deltaPath;
  if (!deltaPath) {
    return [];
  }
  let text: string;
  try {
    text = await readFile(deltaPath, "utf-8");
  } catch {
    return [];
  }
  const issues = validateTriageSection(text, deltaPath, toolVersion);
  issues.push(...(await validateCreateRowCapabilityRefs(text, deltaPath, entry.capabilityPath)));
  return issues;
}

/** canonical な Triage 見出し = 完全一致の H2 (`## Triage`)。 */
const CANONICAL_TRIAGE_HEADING_RE = /^##[ \t]+triage[ \t]*$/i;

/** H1 / H2 は canonical Triage セクションを終端する (H3 以下は本文扱い)。 */
const TRIAGE_SECTION_BOUNDARY_RE = /^#{1,2}[ \t]+\S/;

/**
 * `Triage` で始まるが canonical ではない見出し。`### Triage`,
 * `## Triage — 2026-07-26`, `## Triage Table` を捕捉し、`## Triaged`
 * のような別語は捕捉しない。
 */
const TRIAGE_LIKE_HEADING_RE = /^#{1,6}[ \t]+triage(?![0-9a-z])/i;

type TriageSection = {
  /** 0-based の出現順。診断ラベル (`section 2`) に使う。 */
  index: number;
  body: string;
};

/**
 * canonical な `## Triage` セクションを **すべて** 返す。
 *
 * 以前は最初の 1 つだけを読んでいたため、skill 再実行で 2 つ目以降の
 * セクションに積まれた行が QFAI-TRIAGE-* の検査対象から丸ごと外れて
 * いた。セクション内の複数テーブル対応 (PR #206 review LWri) は
 * セクションをまたげないので、呼び出し側で全セクションを走査する。
 *
 * 走査前に `maskNonSpecRegions` で非仕様領域 (fenced code block / HTML
 * コメント / indented code) を blank する。delta が自分の書式を例示する
 * ために `## Triage` を code fence 内へ置いた場合、生テキストのままだと
 * その例示が 2 つ目のセクションとして収集され、テーブルが無ければ
 * QFAI-TRIAGE-002 が誤発火して正当な文書が `--fail-on error` で落ちる。
 */
function collectTriageSections(text: string): TriageSection[] {
  const lines = maskNonSpecRegions(text).replace(/\r\n/g, "\n").split("\n");
  const sections: TriageSection[] = [];
  let cursor = 0;
  while (cursor < lines.length) {
    if (!CANONICAL_TRIAGE_HEADING_RE.test(lines[cursor] ?? "")) {
      cursor += 1;
      continue;
    }
    const start = cursor;
    cursor += 1;
    while (cursor < lines.length && !TRIAGE_SECTION_BOUNDARY_RE.test(lines[cursor] ?? "")) {
      cursor += 1;
    }
    sections.push({ index: sections.length, body: lines.slice(start, cursor).join("\n") });
  }
  return sections;
}

/**
 * canonical な `## Triage` セクションの **外側** にある Triage 見出しを返す。
 *
 * canonical セクション内部の `### Triage Table` などは本文ごと検査対象な
 * ので除外する。ここに残るものだけが「Triage を名乗るのに何の検査も
 * 受けていない」見出しであり、QFAI-TRIAGE-008 の対象になる。
 *
 * `collectTriageSections` と同じく非仕様領域を先に blank する。書式例と
 * して fenced code block に置かれた `### Triage` は誰も読まない見出しでは
 * なく単なる例示なので、warning を出す理由がない。
 */
function collectUncheckedTriageHeadings(text: string): string[] {
  const lines = maskNonSpecRegions(text).replace(/\r\n/g, "\n").split("\n");
  const headings: string[] = [];
  let cursor = 0;
  while (cursor < lines.length) {
    const line = lines[cursor] ?? "";
    if (CANONICAL_TRIAGE_HEADING_RE.test(line)) {
      cursor += 1;
      while (cursor < lines.length && !TRIAGE_SECTION_BOUNDARY_RE.test(lines[cursor] ?? "")) {
        cursor += 1;
      }
      continue;
    }
    if (TRIAGE_LIKE_HEADING_RE.test(line)) {
      headings.push(line.trim());
    }
    cursor += 1;
  }
  return Array.from(new Set(headings));
}

/**
 * QFAI-TRIAGE-008: canonical でない Triage 見出しは、どの Triage
 * validator にも読まれないまま行を抱え込む。見出し文字列を変えただけで
 * append-first / 承認 gate が静かに外れる状態を可視化する。
 *
 * 既存の delta ファイルは、この規則が無かった時代の見出しをそのまま
 * 抱えている。だから severity は literal ではなく promotion window から
 * 取る (`toolVersion` は validator 実行ごとに 1 回だけ解決して渡される)。
 */
function validateTriageHeadings(text: string, deltaPath: string, toolVersion: string): Issue[] {
  const unchecked = collectUncheckedTriageHeadings(text);
  if (unchecked.length === 0) {
    return [];
  }
  const triageHeadingSeverity = newRuleSeverity(toolVersion, TRIAGE_HEADING_PROMOTION);
  const windowNote =
    triageHeadingSeverity === "warning"
      ? `（${TRIAGE_HEADING_PROMOTION} リリースまでは warning、以降は error として報告されます）`
      : "";
  return [
    issue(
      "QFAI-TRIAGE-008",
      `canonical でない Triage 見出しは QFAI-TRIAGE-* の検査対象外です: ${unchecked.join(", ")}${windowNote}`,
      triageHeadingSeverity,
      deltaPath,
      "triage.headingCanonical",
      unchecked,
      "canonical",
      "見出しを `## Triage` (H2 / 完全一致) に揃えてください。再実行のたびに追記する場合も `## Triage` を複数置けば全セクションが検査されます。日付などの注記は見出しではなく本文に書いてください。",
    ),
  ];
}

/**
 * Enforce QFAI-TRIAGE-006: every CREATE row in the Triage table must cite a
 * `CAP-NNNN` reference in its Rationale column, and that CAP must already
 * be registered in `_policies/03_Capabilities.md`. This is the structural
 * gate that prevents drive-by spec creation when an existing scope could
 * absorb the requirement instead.
 */
export async function validateCreateRowCapabilityRefs(
  text: string,
  deltaPath: string,
  capabilitiesPath: string,
): Promise<Issue[]> {
  // Walk every canonical `## Triage` section, not just the first: a
  // re-run that appends a second section must reach the same structural
  // gate as the first one.
  const sections = collectTriageSections(text);
  if (sections.length === 0) {
    return [];
  }

  const knownCaps = await loadKnownCapabilityIds(capabilitiesPath);

  const issues: Issue[] = [];
  for (const section of sections) {
    // Triage section MAY contain multiple tables (e.g. when authors split
    // a large change into themed sub-tables). Earlier behaviour read only
    // the first table, letting CREATE rows in subsequent tables bypass
    // QFAI-TRIAGE-006 entirely (PR #206 review LWri). Walk every table so
    // the structural CAP-NNNN gate is uniform.
    const tables = parseAllMarkdownTables(section.body);
    for (const [tableIndex, table] of tables.entries()) {
      const scopeLabel = buildTriageScopeLabel(
        sections.length,
        section.index,
        tables.length,
        tableIndex,
      );
      issues.push(...validateCreateRows(table, deltaPath, scopeLabel, knownCaps));
    }
  }

  return issues;
}

/**
 * Resolve the known CAP set. When the capabilities catalog is missing
 * or unreadable, intentionally treat the known set as empty (PR #206
 * review #39). The caller will then surface QFAI-TRIAGE-006 for every
 * CREATE row that references a CAP, which is the desired structural
 * behaviour: append-first regression should fail loud rather than
 * silently skip when the SSOT cannot be loaded. A separate validator
 * surfaces the missing capabilities file itself.
 */
async function loadKnownCapabilityIds(capabilitiesPath: string): Promise<Set<string>> {
  try {
    const capText = await readFile(capabilitiesPath, "utf-8");
    return new Set(parseIdsFromText(capText, "CAP"));
  } catch {
    // No CAP catalog — return an empty set so every cited CAP is
    // reported as unregistered.
    return new Set<string>();
  }
}

/**
 * Diagnostic scope for a Triage table: `section 2 table 1` when the file
 * carries several `## Triage` sections and/or several tables, and an empty
 * string in the single-section / single-table case so existing messages are
 * unchanged.
 */
function buildTriageScopeLabel(
  sectionCount: number,
  sectionIndex: number,
  tableCount: number,
  tableIndex: number,
): string {
  const parts: string[] = [];
  if (sectionCount > 1) {
    parts.push(`section ${sectionIndex + 1}`);
  }
  if (tableCount > 1) {
    parts.push(`table ${tableIndex + 1}`);
  }
  return parts.join(" ");
}

function validateCreateRows(
  table: { headers: string[]; rows: string[][] },
  deltaPath: string,
  scopeLabel: string,
  knownCaps: ReadonlySet<string>,
): Issue[] {
  const headerIndex = (label: string): number => {
    const target = label.trim().toLowerCase();
    return table.headers.findIndex((h) => h.trim().toLowerCase() === target);
  };
  const opIdx = headerIndex("operation");
  const rationaleIdx = headerIndex("rationale");
  const sourceIdx = headerIndex("source");
  if (opIdx < 0) {
    return [];
  }

  const issues: Issue[] = [];
  for (const [rowIndex, row] of table.rows.entries()) {
    const opCell = (row[opIdx] ?? "").trim().toUpperCase();
    if (opCell !== "CREATE") {
      continue;
    }

    const sourceCell = sourceIdx >= 0 ? (row[sourceIdx] ?? "").trim() : "";
    const baseLabel = sourceCell || `row ${rowIndex + 1}`;
    const rowLabel = scopeLabel ? `${scopeLabel} ${baseLabel}` : baseLabel;
    const rationaleCell = rationaleIdx >= 0 ? (row[rationaleIdx] ?? "") : "";
    const referencedCaps = parseIdsFromText(rationaleCell, "CAP");

    if (referencedCaps.length === 0) {
      issues.push(
        issue(
          "QFAI-TRIAGE-006",
          `CREATE 行の Rationale に新 CAP-NNNN の参照が見つかりません (${rowLabel})。`,
          "error",
          deltaPath,
          "triage.createRequiresCap",
          [rowLabel],
          "canonical",
          "新 CAP を `_policies/03_Capabilities.md` に追加し、Rationale 列にその CAP-NNNN を明記してください。",
        ),
      );
      continue;
    }

    const missing = referencedCaps.filter((cap) => !knownCaps.has(cap));
    if (missing.length > 0) {
      issues.push(
        issue(
          "QFAI-TRIAGE-006",
          `CREATE 行が参照する CAP が _policies/03_Capabilities.md に未登録です: ${missing.join(", ")} (${rowLabel})`,
          "error",
          deltaPath,
          "triage.capExists",
          missing,
          "canonical",
          "_policies/03_Capabilities.md に新 CAP を追加してから CREATE を確定してください。",
        ),
      );
    }
  }

  return issues;
}

/**
 * `toolVersion` は必須引数。既定値を持たせると、渡し忘れた呼び出しでは
 * `QFAI-TRIAGE-008` が永久に warning のまま据え置かれ、promotion window が
 * 黙って無効化される。呼び出し側は `resolveToolVersion()` の結果を渡す。
 */
export function validateTriageSection(
  text: string,
  deltaPath: string,
  toolVersion: string,
): Issue[] {
  const issues: Issue[] = [];
  // `collectTriageSections` と同じ masked テキストから読む。生テキストのまま
  // だと、書式例として fenced code block / HTML コメントに `## Change Summary`
  // と `## Triage` を並べただけの文書で hasChangeSummary だけが true になり、
  // 実在しない欠落として QFAI-TRIAGE-001 が誤発火する (`--fail-on warning`
  // では検証自体が落ちる)。
  const headings = extractH2Headings(maskNonSpecRegions(text));
  const hasChangeSummary = headings.has(normalizeHeading("Change Summary"));
  const sections = collectTriageSections(text);
  const hasTriage = sections.length > 0;

  // Fires regardless of the canonical sections' state: a Triage heading
  // nobody validates must never be silent.
  issues.push(...validateTriageHeadings(text, deltaPath, toolVersion));

  if (hasChangeSummary && !hasTriage) {
    // QFAI-TRIAGE-001 is intentionally a warning rather than an error
    // for the 1.8.8 release window:
    //
    // - Existing operational specs in this repository (and in any
    //   downstream that ran an earlier QFAI version) ship a delta.md
    //   without a Triage section. Flipping this to error would block
    //   `validate --fail-on error` on every such repo until each delta
    //   is back-filled.
    // - The structural append-first gate (QFAI-TRIAGE-006) and the
    //   approval gates (QFAI-TRIAGE-005) remain `error`, so
    //   triage-skip is still caught the moment someone tries to use
    //   the Triage table for real work.
    //
    // TODO(QFAI-PR206-followup): once the operational backfill PR
    // ships (PR #206 review #4), promote this to `error` so that
    // missing Triage sections become structurally impossible.
    issues.push(
      issue(
        "QFAI-TRIAGE-001",
        "delta.md に `## Change Summary` があるが `## Triage` セクションがありません。",
        "warning",
        deltaPath,
        "triage.required",
        undefined,
        "canonical",
        "delta.md の `## Change Summary` 直後に `## Triage` セクションを追加し、Source / Subject / Existing Spec / Operation の表で粒度判定を記録してください。",
      ),
    );
    return issues;
  }

  if (!hasTriage) {
    return issues;
  }

  // Validate every canonical `## Triage` section, and every table inside
  // each of them (PR #206 review LWri covered the tables only).
  for (const section of sections) {
    issues.push(...validateTriageSectionBody(section, sections.length, deltaPath));
  }

  return issues;
}

function validateTriageSectionBody(
  section: TriageSection,
  sectionCount: number,
  deltaPath: string,
): Issue[] {
  const issues: Issue[] = [];
  const tables = parseAllMarkdownTables(section.body);
  if (tables.length === 0) {
    const scopeLabel = buildTriageScopeLabel(sectionCount, section.index, 0, 0);
    issues.push(
      issue(
        "QFAI-TRIAGE-002",
        `\`## Triage\` セクションにテーブルが見つかりません。${scopeLabel ? ` (${scopeLabel})` : ""}`.trim(),
        "error",
        deltaPath,
        "triage.table",
        undefined,
        "canonical",
        `Triage セクションに ${TRIAGE_TABLE_HEADER.join(" / ")} 列の markdown table を記述してください。`,
      ),
    );
    return issues;
  }

  for (const [tableIndex, table] of tables.entries()) {
    const scopeLabel = buildTriageScopeLabel(
      sectionCount,
      section.index,
      tables.length,
      tableIndex,
    );
    const tableLabel = scopeLabel ? `${scopeLabel} ` : "";
    const headerMap = new Map<string, number>();
    table.headers.forEach((column, index) => {
      headerMap.set(column.trim().toLowerCase(), index);
    });

    const missingColumns = TRIAGE_REQUIRED_COLUMNS.filter((column) => !headerMap.has(column));
    if (missingColumns.length > 0) {
      issues.push(
        issue(
          "QFAI-TRIAGE-002",
          `${tableLabel}Triage table に必須列が不足しています: ${missingColumns.join(", ")}`.trim(),
          "error",
          deltaPath,
          "triage.columns",
          Array.from(missingColumns),
          "canonical",
          `Triage table のヘッダに ${TRIAGE_TABLE_HEADER.join(" / ")} を含めてください。`,
        ),
      );
      continue;
    }

    issues.push(...validateTriageRows(table, headerMap, deltaPath, tableLabel));
  }

  return issues;
}

function validateTriageRows(
  table: { headers: string[]; rows: string[][] },
  headerMap: Map<string, number>,
  deltaPath: string,
  tableLabel: string,
): Issue[] {
  const issues: Issue[] = [];
  for (const [rowIndex, row] of table.rows.entries()) {
    const opCell = (row[headerMap.get("operation") ?? -1] ?? "").trim();
    const subCell = (row[headerMap.get("sub-op") ?? -1] ?? "").trim();
    const approvedCell = (row[headerMap.get("approved by") ?? -1] ?? "").trim();
    const sourceCell = (row[headerMap.get("source") ?? -1] ?? "").trim();
    const subjectCell = (row[headerMap.get("subject") ?? -1] ?? "").trim();
    const baseLabel = sourceCell || `row ${rowIndex + 1}`;
    const rowLabel = tableLabel ? `${tableLabel.trim()} ${baseLabel}` : baseLabel;

    const opUpperRaw = opCell.toUpperCase();
    if (!isTriageTopLevelLabel(opUpperRaw)) {
      issues.push(
        issue(
          "QFAI-TRIAGE-003",
          `Triage の Operation が不正です (${rowLabel}): ${opCell || "(empty)"}`,
          "error",
          deltaPath,
          "triage.operation",
          [opCell],
          "canonical",
          `Operation を CREATE / UPDATE / DELETE / SPLIT / MERGE / SUPERSEDE のいずれかに修正してください。`,
        ),
      );
      continue;
    }
    // `opUpper` is now narrowed to `"UPDATE" | TriageTopLevelOp` without
    // a bare type assertion (PR #206 review #34).
    const opUpper = opUpperRaw;

    if (opUpper === "UPDATE") {
      const subUpper = subCell.toUpperCase();
      if (subCell.length === 0 || subCell === "-" || !isTriageUpdateSubOp(subUpper)) {
        issues.push(
          issue(
            "QFAI-TRIAGE-004",
            `Triage UPDATE の Sub-op が不正です (${rowLabel}): ${subCell || "(empty)"}`,
            "error",
            deltaPath,
            "triage.subOp",
            [subCell],
            "canonical",
            `Sub-op を APPEND / MODIFY / REMOVE のいずれかに設定してください。`,
          ),
        );
        // Fail-fast: skip the QFAI-TRIAGE-005 (approval) check for this
        // row so an invalid Sub-op does not double-report alongside an
        // approval issue. The next pass with a corrected Sub-op will
        // re-evaluate approval (PR #206 review #37).
        continue;
      }
      // `subUpper` is now narrowed to `TriageUpdateSubOp` without a
      // bare type assertion (PR #206 review #37).
      if (subUpper === "REMOVE" && (approvedCell.length === 0 || approvedCell === "-")) {
        issues.push(
          issue(
            "QFAI-TRIAGE-005",
            `Triage UPDATE:REMOVE は Approved By 必須です (${rowLabel})。`,
            "error",
            deltaPath,
            "triage.approval",
            [rowLabel],
            "canonical",
            "Approved By 列に承認者を記載してください (AskUserQuestion で取得)。",
          ),
        );
      }
      continue;
    }

    const namedItemIds = SPEC_SCOPED_OPS.has(opUpper)
      ? findOperationObjectItemIds(subjectCell)
      : [];
    if (namedItemIds.length > 0) {
      const named = namedItemIds;
      issues.push(
        issue(
          "QFAI-TRIAGE-007",
          `Triage ${opUpper} は spec 単位の操作です。Subject が操作対象として item ID を指しています (${rowLabel}): ${named.join(", ")}`,
          "error",
          deltaPath,
          "triage.specScopedOperation",
          named,
          "canonical",
          "SPLIT / MERGE / SUPERSEDE / DELETE は spec 全体が対象です。spec 内の item 分解は UPDATE:MODIFY + UPDATE:APPEND、item 単体の削除は UPDATE:REMOVE で表現してください。spec 単位の操作である場合は Subject の括弧の外では対象 spec (spec-NNNN) か capability (CAP-NNNN) のみを名指しし、きっかけとなった item ID は括弧内に置いてください (例: `split spec-0006 (BR-0006-0004 起点)`)。",
        ),
      );
      continue;
    }

    if (APPROVAL_REQUIRED_OPS.has(opUpper) && (approvedCell.length === 0 || approvedCell === "-")) {
      issues.push(
        issue(
          "QFAI-TRIAGE-005",
          `Triage ${opUpper} は Approved By 必須です (${rowLabel})。`,
          "error",
          deltaPath,
          "triage.approval",
          [rowLabel],
          "canonical",
          "Approved By 列に承認者を記載してください (AskUserQuestion で取得)。",
        ),
      );
    }
  }

  return issues;
}

async function validateSpecPackEntry(
  entry: SpecEntry,
  allowedLayerTags: Set<string>,
): Promise<Issue[]> {
  const issues: Issue[] = [];

  const missingFiles = await collectMissingRequiredFiles(entry);
  if (missingFiles.length > 0) {
    issues.push(
      issue(
        "E_SPEC_MISSING_FILESET",
        `required file set (01..18) が不足しています。不足: ${missingFiles.join(", ")}`,
        "error",
        entry.dir,
        "specPack.requiredFiles",
        missingFiles,
        "canonical",
        "対象 spec ディレクトリ配下に不足ファイルを追加し、01_Spec.md から 18_delta.md まで揃えてください。",
      ),
    );
  }

  const texts = await loadExistingRequiredTexts(entry, missingFiles);
  issues.push(...validateUpperToLowerReferenceRules(entry, texts));
  const releaseCandidate = isReleaseCandidate(texts["03_Initiative.md"] ?? "");

  const acText = texts["07_Acceptance-criteria.md"] ?? "";
  const tcText = texts["10_Test-cases.md"] ?? "";
  const examplesText = texts["09_Examples.feature"] ?? "";

  const acIds = new Set(parseAcceptanceCriteriaIds(acText));
  const tcIds = new Set(parseTestCaseIds(tcText));
  const examples = parseExamplesFeature(examplesText, entry.examplesPath);

  if (acIds.size === 0) {
    issues.push(
      issue(
        "QFAI-AC-001",
        "07_Acceptance-criteria.md に AC ID が見つかりません。",
        "error",
        entry.acceptanceCriteriaPath,
        "specPack.ac.exists",
      ),
    );
  }

  if (tcIds.size === 0) {
    issues.push(
      issue(
        "QFAI-TC-001",
        "10_Test-cases.md に TC ID が見つかりません。",
        "error",
        entry.testCasesPath,
        "specPack.tc.exists",
      ),
    );
  }

  if (examples.errors.length > 0) {
    for (const message of examples.errors) {
      issues.push(
        issue("QFAI-EX-001", message, "error", entry.examplesPath, "specPack.examples.parse"),
      );
    }
  }

  const exIds = new Set<string>();
  for (const scenario of examples.scenarios) {
    if (scenario.exIds.length !== 1) {
      issues.push(
        issue(
          "QFAI-EX-002",
          `Scenario の EX タグは1件必須です: ${scenario.name}`,
          "error",
          entry.examplesPath,
          "specPack.examples.exTag",
          scenario.exIds,
        ),
      );
    } else {
      const exId = scenario.exIds[0];
      if (exId) {
        exIds.add(exId);
      }
    }

    if (scenario.acIds.length !== 1) {
      issues.push(
        issue(
          "QFAI-EX-003",
          `Scenario の AC タグは1件必須です: ${scenario.name}`,
          "error",
          entry.examplesPath,
          "specPack.examples.acTag",
          scenario.acIds,
        ),
      );
    } else {
      const acId = scenario.acIds[0];
      if (acId && !acIds.has(acId)) {
        issues.push(
          issue(
            "E_REF_NOT_FOUND",
            `Scenario が未定義の AC を参照しています: ${acId} (${scenario.name})`,
            "error",
            entry.examplesPath,
            "specPack.examples.acExists",
            [acId],
            "canonical",
            "07_Acceptance-criteria.md に AC ID を追加するか、09_Examples.feature の AC タグを既存IDへ修正してください。",
          ),
        );
      }
    }

    if (scenario.layerTags.length !== 1) {
      issues.push(
        issue(
          "QFAI-EX-004",
          `Scenario の @layer-* タグは1件必須です: ${scenario.name}`,
          "error",
          entry.examplesPath,
          "specPack.examples.layerTag",
          scenario.layerTags,
        ),
      );
    } else {
      const layerTag = scenario.layerTags[0]?.toLowerCase();
      if (layerTag && !allowedLayerTags.has(layerTag)) {
        issues.push(
          issue(
            "QFAI-EX-005",
            `Scenario の layer タグが policy 外です: ${layerTag} (${scenario.name})`,
            "error",
            entry.examplesPath,
            "specPack.examples.layerPolicy",
            [layerTag],
          ),
        );
      }
    }
  }

  if (exIds.size === 0) {
    issues.push(
      issue(
        "QFAI-EX-007",
        "09_Examples.feature に EX ID が見つかりません。",
        "error",
        entry.examplesPath,
        "specPack.examples.exists",
      ),
    );
  }

  if (acText.length > 0) {
    const invalidAcIds = extractInvalidSpecPackIds(acText, ["AC"]);
    if (invalidAcIds.length > 0) {
      issues.push(
        issue(
          "E_ID_INVALID_FORMAT",
          `AC ID 形式が不正です: ${invalidAcIds.join(", ")}`,
          "error",
          entry.acceptanceCriteriaPath,
          "id.format",
          invalidAcIds,
          "canonical",
          "07_Acceptance-criteria.md の AC ID を `AC-0001-0001` 形式へ修正してください。",
        ),
      );
    }
  }

  if (tcText.length > 0) {
    const invalidTcIds = extractInvalidSpecPackIds(tcText, ["TC"]);
    if (invalidTcIds.length > 0) {
      issues.push(
        issue(
          "E_ID_INVALID_FORMAT",
          `TC ID 形式が不正です: ${invalidTcIds.join(", ")}`,
          "error",
          entry.testCasesPath,
          "id.format",
          invalidTcIds,
          "canonical",
          "10_Test-cases.md の TC ID を `TC-0001-0001` 形式へ修正してください。",
        ),
      );
    }
  }

  issues.push(
    ...validateOpenQuestionsGate(entry, texts["15_Open-questions.md"] ?? "", releaseCandidate),
  );
  const deltaText = texts["18_delta.md"];
  if (deltaText !== undefined) {
    issues.push(...validateDeltaGate(entry, deltaText));
  }

  return issues;
}

async function validateLayeredSpecEntry(
  entry: SpecEntry,
  allowedLayerTags: Set<string>,
): Promise<Issue[]> {
  const issues: Issue[] = [];
  const missingFiles = await collectMissingLayeredRequiredFiles(entry);
  const requiredFilesHint =
    entry.layeredStyle === "v1421"
      ? "対象 spec ディレクトリ配下に 01_Spec.md / 02_User-stories.md / 03_Acceptance-Criteria.md / 04_Business-Rules.md / 05_Examples.md / 06_Test-Cases.md / 07_Decisions.md / 08_Open-questions.md / 09_delta.md を揃えてください。"
      : entry.layeredStyle === "v1417"
        ? "対象 spec ディレクトリ配下に 01_Spec.md / 02_User-stories.md / 03_Acceptance-criteria.md / 04_Business-rules.md / 05_Examples.feature / 06_Test-cases.md / 07_Decisions.md / 08_Open-questions.md / 09_delta.md を揃えてください。"
        : "対象 spec ディレクトリ配下に 01_User-stories.md / 02_Acceptance-criteria.md / 03_Business-rules.md / 04_Examples.feature / 05_Test-cases.md を揃えてください。";
  if (missingFiles.length > 0) {
    issues.push(
      issue(
        "E_SPEC_MISSING_FILESET",
        `required layered files が不足しています。不足: ${missingFiles.join(", ")}`,
        "error",
        entry.dir,
        "specPack.layered.requiredFiles",
        missingFiles,
        "canonical",
        requiredFilesHint,
      ),
    );
  }

  const missingSharedFiles = await collectMissingLayeredSharedRequiredFiles(entry);
  if (missingSharedFiles.length > 0) {
    issues.push(
      issue(
        "E_SPEC_MISSING_FILESET",
        `required layered shared files が不足しています。不足: ${missingSharedFiles.join(", ")}`,
        "error",
        entry.sharedDir,
        "specPack.layered.sharedRequiredFiles",
        missingSharedFiles,
        "canonical",
        `specs/_policies 配下に次の必須ファイルを揃えてください: ${entry.requiredSharedFileNames.join(
          " / ",
        )}`,
      ),
    );
  }

  if (entry.layeredStyle === "v1416") {
    const existingDelta = await collectExistingLayeredDeltaFiles(entry);
    if (existingDelta.length === 0) {
      issues.push(
        issue(
          "E_SPEC_MISSING_FILESET",
          "required layered files が不足しています。不足: *_delta.md",
          "error",
          entry.dir,
          "specPack.layered.deltaFile",
          ["*_delta.md"],
          "canonical",
          "対象 spec ディレクトリ配下に 09_delta.md（または *_delta.md）を追加してください。",
        ),
      );
    }
  }

  const capabilitiesText = await readSafe(entry.capabilityPath);
  issues.push(
    ...validateLayeredIdFormat(
      entry.capabilityPath,
      capabilitiesText,
      ["CAP"],
      "shared ファイルの CAP ID 形式を `CAP-0001` へ修正してください。",
    ),
  );

  if (entry.layeredStyle === "v1417") {
    return issues;
  }

  const [userStoriesText, acceptanceCriteriaText, businessRulesText, examplesText, testCasesText] =
    await Promise.all([
      readSafe(entry.userStoriesPath),
      readSafe(entry.acceptanceCriteriaPath),
      readSafe(entry.businessRulesPath),
      readSafe(entry.examplesPath),
      readSafe(entry.testCasesPath),
    ]);

  // The fix hints must name the files this spec actually has. Hardcoding the
  // superseded v1416 names sent authors to files that do not exist in the
  // v1421 default layout.
  const layeredFileNames = layeredIdFileNames(entry);

  issues.push(
    ...validateLayeredIdFormat(
      entry.userStoriesPath,
      userStoriesText,
      ["US"],
      `${layeredFileNames.userStories} の US ID を \`US-0001-0001\` 形式へ修正してください。`,
    ),
  );
  issues.push(
    ...validateLayeredIdFormat(
      entry.acceptanceCriteriaPath,
      acceptanceCriteriaText,
      ["US", "AC"],
      `${layeredFileNames.acceptanceCriteria} の ID を \`US-0001-0001\` / \`AC-0001-0001\` 形式へ修正してください。`,
      // The required AC Gherkin block is the definition of these IDs, so it is
      // the one fence body that stays scanned. Every other fence — here or in
      // any other layered file — is an illustration.
      { scannedSection: AC_GHERKIN_SECTION },
    ),
  );
  issues.push(
    ...validateLayeredIdFormat(
      entry.businessRulesPath,
      businessRulesText,
      ["AC", "BR"],
      `${layeredFileNames.businessRules} の ID を \`AC-0001-0001\` / \`BR-0001-0001\` 形式へ修正してください。`,
    ),
  );
  issues.push(
    ...validateLayeredIdFormat(
      entry.examplesPath,
      examplesText,
      // v1421 writes `EX-*` against a `BR-Ref`. The Gherkin vocabulary
      // (`SPEC` / `SC`) belongs to the v1416/v1417 `.feature` layouts and never
      // matched anything in this file, so the bottom of the chain had no format
      // gate at all.
      entry.layeredStyle === "v1421" ? ["BR", "EX"] : ["SPEC", "SC", "AC"],
      entry.layeredStyle === "v1421"
        ? `${layeredFileNames.examples} の ID を \`EX-0001-0001\` / \`BR-0001-0001\` 形式へ修正してください。`
        : `${layeredFileNames.examples} の ID を \`@SPEC-0001\` / \`@SC-0001-0001\` / \`AC-0001-0001\` 形式へ修正してください。`,
    ),
  );
  issues.push(
    ...validateLayeredIdFormat(
      entry.testCasesPath,
      testCasesText,
      entry.layeredStyle === "v1421" ? ["AC", "EX", "TC"] : ["CASE", "SC"],
      entry.layeredStyle === "v1421"
        ? `${layeredFileNames.testCases} の ID を \`TC-0001-0001\` / \`EX-0001-0001\` / \`AC-0001-0001\` 形式へ修正してください。`
        : `${layeredFileNames.testCases} の ID を \`CASE-0001-0001\` と \`SC-0001-0001\` 参照形式へ修正してください。`,
    ),
  );

  issues.push(
    ...validateLayeredNamespace(
      entry,
      entry.userStoriesPath,
      extractIds(userStoriesText, "US"),
      "US",
    ),
  );
  issues.push(
    ...validateLayeredNamespace(
      entry,
      entry.acceptanceCriteriaPath,
      extractIds(acceptanceCriteriaText, "AC"),
      "AC",
    ),
  );
  issues.push(
    ...validateLayeredNamespace(
      entry,
      entry.businessRulesPath,
      extractIds(businessRulesText, "BR"),
      "BR",
    ),
  );
  issues.push(
    // v1421 writes `EX-*` / `TC-*`; `SC` / `CASE` are the Gherkin-era kinds and
    // match nothing in a v1421 file, so the namespace rule had no reachable
    // input for the bottom two layers.
    ...(entry.layeredStyle === "v1421"
      ? validateLayeredNamespace(entry, entry.examplesPath, extractIds(examplesText, "EX"), "EX")
      : validateLayeredNamespace(entry, entry.examplesPath, extractIds(examplesText, "SC"), "SC")),
  );
  issues.push(
    ...(entry.layeredStyle === "v1421"
      ? validateLayeredNamespace(entry, entry.testCasesPath, extractIds(testCasesText, "TC"), "TC")
      : validateLayeredNamespace(
          entry,
          entry.testCasesPath,
          extractIds(testCasesText, "CASE"),
          "CASE",
        )),
  );

  issues.push(...validateLayeredLevelPolicy(entry, testCasesText, allowedLayerTags));

  return issues;
}

/**
 * Holds the layered layout's `Level` column to the shipped test-layer policy.
 *
 * This is the consumer `layerPolicy` did not have. `validateSpecPackEntry` fed
 * the policy set to `QFAI-EX-005`, but that runs only on the legacy `spec-pack`
 * layout; the layered branch — the one `qfai init` and `/qfai-sdd` produce —
 * took no tag argument, so on every modern project the policy file was read,
 * reported on, and then ignored.
 *
 * `warning`, not `error`: `TDDLIST_UNKNOWN_LEVEL` already reports an
 * unrecognised `Level` against the coverage vocabulary, and this is the second,
 * narrower claim — the value is outside the *policy* the project ships. Raising
 * it to `error` would fail projects whose policy file is simply older than
 * their specs, which is a migration, not a gate.
 */
function validateLayeredLevelPolicy(
  entry: SpecEntry,
  testCasesText: string,
  allowedLayerTags: Set<string>,
): Issue[] {
  const resolution = resolveTestCaseTable(testCasesText);
  if (!resolution.table) {
    return [];
  }
  const headers = resolution.table.headers.map((header: string) => header.trim());
  const levelIndex = headers.indexOf("Level");
  if (levelIndex < 0) {
    return [];
  }
  // `layer-integration` -> `integration`; the `Level` column writes `L3` or the
  // word, so both spellings are accepted.
  const allowedWords = new Set(Array.from(allowedLayerTags, (tag) => tag.replace(/^layer-/, "")));
  const offenders = new Set<string>();
  for (const row of resolution.table.rows) {
    const raw = (row[levelIndex] ?? "").trim();
    if (raw.length === 0 || raw === "-") continue;
    const normalized = raw.toLowerCase();
    // `L1`..`L5` are positional codes, not layer names; they are checked by
    // `TDDLIST_UNKNOWN_LEVEL` and are out of scope for a *policy* claim.
    if (/^l\d+$/.test(normalized)) continue;
    if (allowedWords.has(normalized)) continue;
    offenders.add(raw);
  }
  if (offenders.size === 0) {
    return [];
  }
  const sorted = Array.from(offenders).sort();
  return [
    issue(
      "QFAI-EX-105",
      `06_Test-Cases.md の Level が test-layer policy 外です: ${sorted.join(", ")}。policy が許可する層: ${Array.from(allowedWords).sort().join(", ")}`,
      "warning",
      entry.testCasesPath,
      "specPack.layeredLevelPolicy",
      sorted,
      "change",
      "`catalog/test-layers.md` が宣言する層のいずれか、または `L1`..`L5` の位置コードに直してください。",
    ),
  ];
}

type LayeredIdFileNames = {
  userStories: string;
  acceptanceCriteria: string;
  businessRules: string;
  examples: string;
  testCases: string;
};

/**
 * Filenames to name in an `E_ID_INVALID_FORMAT` fix hint.
 *
 * Taken from the paths this validator actually read, so the hint always names
 * the file whose contents produced the finding. A second hardcoded table —
 * one branch per layered style — is what produced the original defect (v1421
 * specs were sent to the v1416 filenames), and it would drift again the next
 * time a layout is added or a file renamed, because nothing forces the two
 * lists to agree.
 */
function layeredIdFileNames(entry: SpecEntry): LayeredIdFileNames {
  return {
    userStories: path.basename(entry.userStoriesPath),
    acceptanceCriteria: path.basename(entry.acceptanceCriteriaPath),
    businessRules: path.basename(entry.businessRulesPath),
    examples: path.basename(entry.examplesPath),
    testCases: path.basename(entry.testCasesPath),
  };
}

function validateLayeredIdFormat(
  filePath: string,
  text: string,
  prefixes: IdFormatPrefix[],
  suggestedAction: string,
  fenceOptions: FenceMaskOptions = {},
): Issue[] {
  const occurrences = extractInvalidIdOccurrences(text, prefixes, fenceOptions);
  if (occurrences.length === 0) {
    return [];
  }
  const invalid = occurrences.map((occurrence) => occurrence.id);
  const firstLine = Math.min(...occurrences.map((occurrence) => occurrence.line));
  return [
    issue(
      "E_ID_INVALID_FORMAT",
      `ID 形式が不正です: ${occurrences.map((o) => `${o.id} (line ${o.line})`).join(", ")}`,
      "error",
      filePath,
      "id.format",
      invalid,
      "canonical",
      suggestedAction,
      { loc: { line: firstLine } },
    ),
  ];
}

function validateLayeredNamespace(
  entry: SpecEntry,
  filePath: string,
  ids: string[],
  prefix: "US" | "AC" | "BR" | "EX" | "TC" | "SC" | "CASE",
): Issue[] {
  const expectedPrefix = `${prefix}-${entry.specNumber}-`;
  const mismatched = ids.filter((id) => !id.startsWith(expectedPrefix));
  if (mismatched.length === 0) {
    return [];
  }
  return [
    issue(
      "QFAI-SPACK-101",
      `spec namespace が一致しない ID があります: ${mismatched.join(
        ", ",
      )} (expected: ${expectedPrefix}****)`,
      "error",
      filePath,
      "specPack.layered.namespace",
      mismatched,
      "canonical",
      `${path.basename(filePath)} の ${prefix} ID を spec-${entry.specNumber} に合わせて修正してください。`,
    ),
  ];
}

async function collectExistingLayeredDeltaFiles(entry: SpecEntry): Promise<string[]> {
  const candidates = Array.from(new Set(entry.deltaCandidates));
  const existing: string[] = [];
  for (const candidate of candidates) {
    if (!/(?:^|_)delta\.md$/i.test(path.basename(candidate))) {
      continue;
    }
    if (await fileExists(candidate)) {
      existing.push(candidate);
    }
  }
  return existing;
}

async function fileExists(target: string): Promise<boolean> {
  try {
    await readFile(target, "utf-8");
    return true;
  } catch {
    return false;
  }
}

function validateOpenQuestionsGate(
  entry: SpecEntry,
  text: string,
  releaseCandidate: boolean,
): Issue[] {
  const statuses = parseOpenQuestionStatuses(text);
  const invalidStatuses = parseInvalidOpenQuestionStatuses(text);
  const statusIds = new Set(statuses.map((item) => item.id));
  const openQuestionIds = extractOpenQuestionIds(text);
  const idsWithoutValidStatus = openQuestionIds.filter((id) => !statusIds.has(id));
  const openIds = Array.from(
    new Set(
      statuses
        .filter((item) => item.status === "open")
        .map((item) => item.id)
        .filter((id) => id.length > 0),
    ),
  );
  const severity = releaseCandidate ? "error" : "warning";
  const issues: Issue[] = [];

  if (openIds.length > 0) {
    const message = releaseCandidate
      ? `release_candidate では open の OQ は許可されません: ${openIds.join(", ")}`
      : `open の OQ が残っています（merge gate は warning）: ${openIds.join(", ")}`;
    issues.push(
      issue(
        "E_OQ_OPEN_RELEASE_BLOCK",
        message,
        severity,
        entry.openQuestionsPath,
        "specPack.openQuestions",
        openIds,
        "canonical",
        "15_Open-questions.md の `status: open` を `resolved` または `deferred` に更新し、根拠を追記してください。",
      ),
    );
  }

  if (idsWithoutValidStatus.length > 0 || invalidStatuses.length > 0) {
    const refs = Array.from(
      new Set([...idsWithoutValidStatus, ...invalidStatuses.map((item) => item.id)]),
    );
    const invalidSamples = invalidStatuses.map((item) => `${item.id}=${item.value}`).slice(0, 8);
    const details: string[] = [];
    if (idsWithoutValidStatus.length > 0) {
      details.push(`status 欠落: ${idsWithoutValidStatus.join(", ")}`);
    }
    if (invalidSamples.length > 0) {
      details.push(`status 不正: ${invalidSamples.join(", ")}`);
    }
    const message = releaseCandidate
      ? `release_candidate では OQ status 未解釈は許可されません。${details.join(" / ")}`
      : `OQ status 未解釈の項目があります（merge gate は warning）。${details.join(" / ")}`;
    issues.push(
      issue(
        "E_OQ_STATUS_UNPARSEABLE",
        message,
        severity,
        entry.openQuestionsPath,
        "specPack.openQuestionsStatus",
        refs,
        "canonical",
        "15_Open-questions.md の各 OQ-* に `status: open|resolved|deferred` を正しい綴りで記載してください。",
      ),
    );
  }

  return issues;
}

function extractOpenQuestionIds(text: string): string[] {
  const ids = new Set<string>();
  for (const match of text.matchAll(/\b(OQ-[A-Za-z0-9_-]+)\b/gi)) {
    const id = match[1];
    if (id) {
      ids.add(id);
    }
  }
  return Array.from(ids);
}

function parseInvalidOpenQuestionStatuses(text: string): InvalidOpenQuestionStatus[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const statuses: InvalidOpenQuestionStatus[] = [];
  let currentId = "";

  for (const line of lines) {
    const idMatch = /\b(OQ-[A-Za-z0-9_-]+)\b/i.exec(line);
    if (idMatch?.[1]) {
      currentId = idMatch[1];
    }

    const statusMatch = /(?:^|\s)(?:-\s*)?status\s*:\s*([^\s#]+)\s*$/i.exec(line);
    const rawStatus = statusMatch?.[1];
    if (!rawStatus) {
      continue;
    }

    const normalized = rawStatus.toLowerCase();
    if (normalized === "open" || normalized === "resolved" || normalized === "deferred") {
      continue;
    }

    statuses.push({
      id: currentId || "(unlabeled-oq)",
      value: rawStatus,
    });
  }

  return statuses;
}

function validateDeltaGate(entry: SpecEntry, text: string): Issue[] {
  const headings = extractH2Headings(text);
  const missingHeadings = DELTA_REQUIRED_H2_HEADINGS.filter(
    (heading) => !headings.has(normalizeHeading(heading)),
  );

  const rejectedSection = extractMarkdownSection(text, "Rejected");
  const missingRejectedHints: string[] = [];
  if (!/DO\s+NOT/i.test(rejectedSection)) {
    missingRejectedHints.push("DO NOT");
  }
  if (!/Temptation/i.test(rejectedSection)) {
    missingRejectedHints.push("Temptation");
  }

  if (missingHeadings.length === 0 && missingRejectedHints.length === 0) {
    return [];
  }

  const details: string[] = [];
  if (missingHeadings.length > 0) {
    details.push(`不足見出し: ${missingHeadings.join(", ")}`);
  }
  if (missingRejectedHints.length > 0) {
    details.push(`Rejected 必須要素不足: ${missingRejectedHints.join(", ")}`);
  }

  return [
    issue(
      "E_DELTA_MISSING_REQUIRED",
      `18_delta.md の必須構造が不足しています。${details.join(" / ")}`,
      "error",
      entry.deltaPath,
      "specPack.deltaRequired",
      [...missingHeadings, ...missingRejectedHints],
      "canonical",
      "18_delta.md に `Change Summary / Rationale / Candidates Considered / Adopted / Rejected / Impact / Follow-ups` を揃え、Rejected に `DO NOT` と `Temptation` を記載してください。",
    ),
  ];
}

function parseOpenQuestionStatuses(text: string): OpenQuestionStatus[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const statuses: OpenQuestionStatus[] = [];
  let currentId = "";

  for (const line of lines) {
    const idMatch = /\b(OQ-[A-Za-z0-9_-]+)\b/i.exec(line);
    if (idMatch?.[1]) {
      currentId = idMatch[1];
    }

    const statusMatch = /(?:^|\s)(?:-\s*)?status\s*:\s*(open|resolved|deferred)\s*$/i.exec(line);
    if (!statusMatch?.[1]) {
      continue;
    }

    const status = statusMatch[1].toLowerCase() as OpenQuestionStatus["status"];
    statuses.push({
      id: currentId || "(unlabeled-oq)",
      status,
    });
  }

  return statuses;
}

function isReleaseCandidate(initiativeText: string): boolean {
  return /^\s*(?:[-*]\s*)?release_candidate\s*:\s*true\s*$/im.test(initiativeText);
}

async function validateTraceabilityLedger(
  entry: SpecEntry,
  contractIds: Set<string>,
): Promise<Issue[]> {
  const issues: Issue[] = [];
  let ledgerText: string;
  try {
    ledgerText = await readFile(entry.traceabilityLedgerPath, "utf-8");
  } catch {
    return issues;
  }

  const table = parseFirstMarkdownTable(ledgerText);
  if (!table) {
    return [
      issue(
        "QFAI-LEDGER-001",
        "16_Traceability-ledger.md のテーブルが見つかりません。",
        "error",
        entry.traceabilityLedgerPath,
        "ledger.table",
      ),
    ];
  }

  const columnToIndex = new Map<string, number>();
  table.headers.forEach((column, index) => {
    columnToIndex.set(normalizeHeader(column), index);
  });

  const missingColumns = LEDGER_REQUIRED_COLUMNS.filter((column) => !columnToIndex.has(column));
  if (missingColumns.length > 0) {
    issues.push(
      issue(
        "E_LEDGER_MISSING_COLUMN",
        `Ledger の必須列が不足しています: ${missingColumns.join(", ")}`,
        "error",
        entry.traceabilityLedgerPath,
        "ledger.columns",
        missingColumns,
        "canonical",
        "16_Traceability-ledger.md のヘッダに必須列（trace_id,obj_id,init_id,cap_id,flow_id,us_id,ac_id,ex_ids,tc_ids）を追加してください。",
      ),
    );
    return issues;
  }

  const definitions = await collectDefinitions(entry);
  const canEvaluateCoverage = definitions.acIds.size > 0 && definitions.tcIds.size > 0;
  if (definitions.acIds.size === 0 || definitions.tcIds.size === 0) {
    // AC/TC 定義不足時も、Ledger行自体の構文・参照整合は継続して検証する。
  }

  const seenAcIds = new Set<string>();
  const seenTcIds = new Set<string>();

  for (const [rowIndex, row] of table.rows.entries()) {
    const line = rowIndex + 1;
    const traceId = getLedgerCell(row, columnToIndex, "trace_id");
    const objId = getLedgerCell(row, columnToIndex, "obj_id");
    const initId = getLedgerCell(row, columnToIndex, "init_id");
    const capId = getLedgerCell(row, columnToIndex, "cap_id");
    const flowId = getLedgerCell(row, columnToIndex, "flow_id");
    const usId = getLedgerCell(row, columnToIndex, "us_id");
    const acId = getLedgerCell(row, columnToIndex, "ac_id");
    const exIds = parseSemicolonIdList(getLedgerCell(row, columnToIndex, "ex_ids"));
    const tcIds = parseSemicolonIdList(getLedgerCell(row, columnToIndex, "tc_ids"));
    const conIds = parseSemicolonIdList(getOptionalLedgerCell(row, columnToIndex, "con_ids"));

    const requiredCells: Array<{ name: string; value: string }> = [
      { name: "trace_id", value: traceId },
      { name: "obj_id", value: objId },
      { name: "init_id", value: initId },
      { name: "cap_id", value: capId },
      { name: "flow_id", value: flowId },
      { name: "us_id", value: usId },
      { name: "ac_id", value: acId },
    ];

    const emptyCells = requiredCells
      .filter((cell) => cell.value.length === 0)
      .map((cell) => cell.name);
    if (emptyCells.length > 0) {
      issues.push(
        issue(
          "E_LEDGER_EMPTY_CELL",
          `Ledger 行 ${line} の必須セルが空です: ${emptyCells.join(", ")}`,
          "error",
          entry.traceabilityLedgerPath,
          "ledger.requiredCells",
          emptyCells,
          "canonical",
          "16_Traceability-ledger.md の該当行で空セルを埋め、各列に有効なIDを設定してください。",
        ),
      );
      continue;
    }

    if (exIds.length === 0 || tcIds.length === 0) {
      const emptyMulti: string[] = [];
      if (exIds.length === 0) {
        emptyMulti.push("ex_ids");
      }
      if (tcIds.length === 0) {
        emptyMulti.push("tc_ids");
      }
      issues.push(
        issue(
          "E_LEDGER_EMPTY_CELL",
          `Ledger 行 ${line} の多値列が空です: ${emptyMulti.join(", ")}`,
          "error",
          entry.traceabilityLedgerPath,
          "ledger.cardinality",
          emptyMulti,
          "canonical",
          "16_Traceability-ledger.md の ex_ids/tc_ids に少なくとも1件のIDを設定してください。",
        ),
      );
      continue;
    }

    validateLedgerId(line, "trace_id", traceId, "TRACE", issues, entry);
    validateLedgerId(line, "obj_id", objId, "OBJ", issues, entry);
    validateLedgerId(line, "init_id", initId, "INIT", issues, entry);
    validateLedgerId(line, "cap_id", capId, "CAP", issues, entry);
    validateLedgerId(line, "flow_id", flowId, "FLOW", issues, entry);
    validateLedgerId(line, "us_id", usId, "US", issues, entry);
    validateLedgerId(line, "ac_id", acId, "AC", issues, entry);
    exIds.forEach((id) => validateLedgerId(line, "ex_ids", id, "EX", issues, entry));
    tcIds.forEach((id) => validateLedgerId(line, "tc_ids", id, "TC", issues, entry));
    conIds.forEach((id) => validateLedgerId(line, "con_ids", id, "CON", issues, entry));

    if (!definitions.objIds.has(objId)) {
      issues.push(
        issue(
          "E_REF_NOT_FOUND",
          `Ledger が未定義の OBJ を参照しています: ${objId} (row=${line})`,
          "error",
          entry.traceabilityLedgerPath,
          "ledger.objExists",
          [objId],
          "canonical",
          "02_Objective.md に OBJ ID を追加するか、Ledger の obj_id を既存IDへ修正してください。",
        ),
      );
    }
    if (!definitions.initIds.has(initId)) {
      issues.push(
        issue(
          "E_REF_NOT_FOUND",
          `Ledger が未定義の INIT を参照しています: ${initId} (row=${line})`,
          "error",
          entry.traceabilityLedgerPath,
          "ledger.initExists",
          [initId],
          "canonical",
          "03_Initiative.md に INIT ID を追加するか、Ledger の init_id を既存IDへ修正してください。",
        ),
      );
    }
    if (!definitions.capIds.has(capId)) {
      issues.push(
        issue(
          "E_REF_NOT_FOUND",
          `Ledger が未定義の CAP を参照しています: ${capId} (row=${line})`,
          "error",
          entry.traceabilityLedgerPath,
          "ledger.capExists",
          [capId],
          "canonical",
          "04_Capability.md に CAP ID を追加するか、Ledger の cap_id を既存IDへ修正してください。",
        ),
      );
    }
    if (!definitions.flowIds.has(flowId)) {
      issues.push(
        issue(
          "E_REF_NOT_FOUND",
          `Ledger が未定義の FLOW を参照しています: ${flowId} (row=${line})`,
          "error",
          entry.traceabilityLedgerPath,
          "ledger.flowExists",
          [flowId],
          "canonical",
          "05_Business-flow.feature に FLOW ID を追加するか、Ledger の flow_id を既存IDへ修正してください。",
        ),
      );
    }
    if (!definitions.usIds.has(usId)) {
      issues.push(
        issue(
          "E_REF_NOT_FOUND",
          `Ledger が未定義の US を参照しています: ${usId} (row=${line})`,
          "error",
          entry.traceabilityLedgerPath,
          "ledger.usExists",
          [usId],
          "canonical",
          "06_User-stories.md に US ID を追加するか、Ledger の us_id を既存IDへ修正してください。",
        ),
      );
    }
    if (!definitions.acIds.has(acId)) {
      issues.push(
        issue(
          "E_REF_NOT_FOUND",
          `Ledger が未定義の AC を参照しています: ${acId} (row=${line})`,
          "error",
          entry.traceabilityLedgerPath,
          "ledger.acExists",
          [acId],
          "canonical",
          "07_Acceptance-criteria.md に AC ID を追加するか、Ledger の ac_id を既存IDへ修正してください。",
        ),
      );
    }
    for (const exId of exIds) {
      if (!definitions.exIds.has(exId)) {
        issues.push(
          issue(
            "E_REF_NOT_FOUND",
            `Ledger が未定義の EX を参照しています: ${exId} (row=${line})`,
            "error",
            entry.traceabilityLedgerPath,
            "ledger.exExists",
            [exId],
            "canonical",
            "09_Examples.feature に EX ID を追加するか、Ledger の ex_ids を既存IDへ修正してください。",
          ),
        );
      }
    }
    for (const tcId of tcIds) {
      if (!definitions.tcIds.has(tcId)) {
        issues.push(
          issue(
            "E_REF_NOT_FOUND",
            `Ledger が未定義の TC を参照しています: ${tcId} (row=${line})`,
            "error",
            entry.traceabilityLedgerPath,
            "ledger.tcExists",
            [tcId],
            "canonical",
            "10_Test-cases.md に TC ID を追加するか、Ledger の tc_ids を既存IDへ修正してください。",
          ),
        );
      }
      seenTcIds.add(tcId);
    }
    for (const conId of conIds) {
      if (!contractIds.has(conId)) {
        issues.push(
          issue(
            "E_REF_NOT_FOUND",
            `Ledger が未定義の CON を参照しています: ${conId} (row=${line})`,
            "error",
            entry.traceabilityLedgerPath,
            "ledger.conExists",
            [conId],
            "canonical",
            "11_Contracts.md と `.qfai/contracts/**` の CON ID を一致させるように修正してください。",
          ),
        );
      }
    }
    seenAcIds.add(acId);
  }

  if (canEvaluateCoverage) {
    const uncoveredAcIds = Array.from(definitions.acIds).filter((id) => !seenAcIds.has(id));
    if (uncoveredAcIds.length > 0) {
      issues.push(
        issue(
          "E_AC_NOT_VERIFIED",
          `AC 未検証（EX/TC未接続）が存在します: ${uncoveredAcIds.join(", ")}`,
          "error",
          entry.traceabilityLedgerPath,
          "ledger.acCoverage",
          uncoveredAcIds,
          "canonical",
          "16_Traceability-ledger.md に AC へ紐づく EX/TC 接続行を追加してください。",
        ),
      );
    }

    const orphanTcIds = Array.from(definitions.tcIds).filter((id) => !seenTcIds.has(id));
    if (orphanTcIds.length > 0) {
      issues.push(
        issue(
          "E_TC_ORPHAN",
          `孤児 TC が存在します（OBJ まで遡れない）: ${orphanTcIds.join(", ")}`,
          "error",
          entry.traceabilityLedgerPath,
          "ledger.tcCoverage",
          orphanTcIds,
          "canonical",
          "16_Traceability-ledger.md に該当 TC を参照する行を追加し、OBJ まで遡れるようにしてください。",
        ),
      );
    }
  }

  return issues;
}

async function collectDefinitions(entry: SpecEntry): Promise<SpecDefinitions> {
  const [
    objectiveText,
    initiativeText,
    capabilityText,
    flowText,
    userStoriesText,
    acText,
    examplesText,
    tcText,
  ] = await Promise.all([
    readSafe(entry.objectivePath),
    readSafe(entry.initiativePath),
    readSafe(entry.capabilityPath),
    readSafe(entry.flowPath),
    readSafe(entry.userStoriesPath),
    readSafe(entry.acceptanceCriteriaPath),
    readSafe(entry.examplesPath),
    readSafe(entry.testCasesPath),
  ]);

  const examples = parseExamplesFeature(examplesText, entry.examplesPath);
  const exIds = new Set<string>();
  for (const scenario of examples.scenarios) {
    for (const exId of scenario.exIds) {
      exIds.add(exId);
    }
  }

  return {
    objIds: new Set(parseIdsFromText(objectiveText, "OBJ")),
    initIds: new Set(parseIdsFromText(initiativeText, "INIT")),
    capIds: new Set(parseIdsFromText(capabilityText, "CAP")),
    flowIds: new Set(parseIdsFromText(flowText, "FLOW")),
    usIds: new Set(parseIdsFromText(userStoriesText, "US")),
    acIds: new Set(parseAcceptanceCriteriaIds(acText)),
    exIds,
    tcIds: new Set(parseTestCaseIds(tcText)),
  };
}

function validateUpperToLowerReferenceRules(
  entry: SpecEntry,
  texts: Partial<Record<RequiredSpecPackFile, string>>,
): Issue[] {
  const rules: Array<{
    fileName: RequiredSpecPackFile;
    forbidden: SpecPackIdKind[];
  }> = [
    {
      fileName: "02_Objective.md",
      forbidden: ["INIT", "CAP", "FLOW", "US", "AC", "BR", "EX", "TC"],
    },
    {
      fileName: "03_Initiative.md",
      forbidden: ["CAP", "FLOW", "US", "AC", "BR", "EX", "TC"],
    },
    {
      fileName: "04_Capability.md",
      forbidden: ["FLOW", "US", "AC", "BR", "EX", "TC"],
    },
    {
      fileName: "05_Business-flow.feature",
      forbidden: ["US", "AC", "BR", "EX", "TC"],
    },
    {
      fileName: "06_User-stories.md",
      forbidden: ["AC", "BR", "EX", "TC"],
    },
    {
      fileName: "07_Acceptance-criteria.md",
      forbidden: ["BR", "EX", "TC"],
    },
    {
      fileName: "08_Business-rules.md",
      forbidden: ["EX", "TC"],
    },
  ];

  const issues: Issue[] = [];
  for (const rule of rules) {
    const text = texts[rule.fileName];
    if (!text) {
      continue;
    }
    const pattern = buildLoosePrefixPattern(rule.forbidden);
    const matches = text.match(pattern) ?? [];
    if (matches.length === 0) {
      continue;
    }
    const unique = Array.from(new Set(matches));
    const samples = unique.slice(0, MAX_REF_SAMPLES);
    const hidden = unique.length - samples.length;
    const suffix = hidden > 0 ? ` (+${hidden}件)` : "";
    issues.push(
      issue(
        "E_UPWARD_REF_FORBIDDEN",
        `上位→下位参照禁止違反: ${rule.fileName} に禁止IDが含まれています (${samples.join(
          ", ",
        )}${suffix})`,
        "error",
        entry.requiredFiles[rule.fileName],
        "specPack.noUpstreamToDownstreamRef",
        samples,
        "canonical",
        "下位との接続は 16_Traceability-ledger.md に記述してください。",
      ),
    );
  }

  return issues;
}

async function loadExistingRequiredTexts(
  entry: SpecEntry,
  missingFiles: RequiredSpecPackFile[],
): Promise<Partial<Record<RequiredSpecPackFile, string>>> {
  const missing = new Set(missingFiles);
  const texts: Partial<Record<RequiredSpecPackFile, string>> = {};
  for (const fileName of Object.keys(entry.requiredFiles) as RequiredSpecPackFile[]) {
    if (missing.has(fileName)) {
      continue;
    }
    const fullPath = entry.requiredFiles[fileName];
    if (!fullPath) {
      continue;
    }
    texts[fileName] = await readSafe(fullPath);
  }
  return texts;
}

function validateLedgerId(
  row: number,
  column: string,
  value: string,
  kind: SpecPackIdKind,
  issues: Issue[],
  entry: SpecEntry,
): void {
  if (value.length === 0) {
    return;
  }
  if (!isValidId(value, kind)) {
    issues.push(
      issue(
        "E_ID_INVALID_FORMAT",
        `Ledger 行 ${row} の ${column} の ID 形式が不正です: ${value}`,
        "error",
        entry.traceabilityLedgerPath,
        "ledger.idFormat",
        [value],
        "canonical",
        `16_Traceability-ledger.md の ${column} を ${kind}-0001-0001 形式へ修正してください。`,
      ),
    );
  }
}

function getLedgerCell(
  row: string[],
  columnToIndex: Map<string, number>,
  column: LedgerRequiredColumn,
): string {
  const index = columnToIndex.get(column);
  if (index === undefined) {
    return "";
  }
  return (row[index] ?? "").trim();
}

function getOptionalLedgerCell(
  row: string[],
  columnToIndex: Map<string, number>,
  column: string,
): string {
  const index = columnToIndex.get(column);
  if (index === undefined) {
    return "";
  }
  return (row[index] ?? "").trim();
}

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function extractH2Headings(text: string): Set<string> {
  const headings = new Set<string>();
  const pattern = /^##\s+(.+?)\s*$/gm;
  for (const match of text.matchAll(pattern)) {
    const heading = match[1];
    if (!heading) {
      continue;
    }
    headings.add(normalizeHeading(heading));
  }
  return headings;
}

function normalizeHeading(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function extractMarkdownSection(text: string, heading: string): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const target = heading.trim().toLowerCase();
  let start = -1;
  let level = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const match = /^(#{1,6})\s*(.+?)\s*$/.exec(lines[index] ?? "");
    if (!match) {
      continue;
    }
    const name = (match[2] ?? "").trim().toLowerCase();
    if (name !== target) {
      continue;
    }
    start = index;
    level = (match[1] ?? "").length;
    break;
  }

  if (start < 0) {
    return "";
  }

  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const match = /^(#{1,6})\s*(.+?)\s*$/.exec(lines[index] ?? "");
    if (!match) {
      continue;
    }
    const nextLevel = (match[1] ?? "").length;
    if (nextLevel <= level) {
      end = index;
      break;
    }
  }

  return lines.slice(start, end).join("\n");
}

async function readSafe(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return "";
  }
}
