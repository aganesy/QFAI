import { readdir } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { isTableSeparator, looksLikeTableRow, splitMarkdownRow } from "../specPackParsers.js";
import { collectSpecEntries, type SpecEntry } from "../specLayout.js";
import { TRIAGE_TABLE_HEADER } from "../sddTriage.js";
import type { Issue } from "../types.js";
import {
  collectMarkdownItems,
  collectScenarioItems,
  issue,
  readSafe,
  uniqueMatches,
} from "./utils.js";

const POLICIES_FILES = [
  "01_Objective.md",
  "02_Initiative.md",
  "03_Capabilities.md",
  "04_Business-flow.md",
  "05_Contracts.md",
  "06_Glossary.md",
  "07_Constraints.md",
  "08_Decisions.md",
  "09_Open-questions.md",
  "10_delta.md",
] as const;

// Composite (`BR-0001-0002`) as well as short IDs, so a finding reports the
// whole ID instead of a truncated `BR-0001` the operator cannot search for.
const POLICIES_DOWNSTREAM_RE = /\b(?:spec-\d{4}|(?:US|AC|BR|EX|TC)-\d{4}(?:-\d{4})?)\b/gi;
const US_DOWNSTREAM_RE = /\b(?:AC|BR|EX|TC)-\d{4}\b/g;
const AC_DOWNSTREAM_RE = /\b(?:BR|EX|TC)-\d{4}\b/g;
const BR_DOWNSTREAM_RE = /\b(?:EX|TC)-\d{4}\b/g;
const CAP_ID_RE = /^CAP-\d{4}$/;
const US_ID_RE = /^US-\d{4}$/;
const AC_ID_RE = /^AC-\d{4}$/;
const BR_OR_AC_ID_RE = /^(?:BR|AC)-\d{4}$/;
const EX_ID_RE = /^EX-\d{4}$/;
const LAYER_ID_RE = /\b(?:OBJ|INIT|CAP|FLOW|US|AC|BR|EX|TC)-\d{4}\b/gi;
const POLICIES_DOWNSTREAM_V1421_RE = /\b(?:US|AC|BR|EX|TC)-\d{4}(?:-\d{4})?\b/gi;

const LAYER_ORDER = {
  OBJ: 0,
  INIT: 1,
  CAP: 2,
  FLOW: 3,
  US: 4,
  AC: 5,
  BR: 6,
  EX: 7,
  TC: 8,
} as const;

type LayerIdPrefix = keyof typeof LAYER_ORDER;

export async function validateLayeredTraceability(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const specsRoot = resolvePath(root, config, "specsDir");
  const entries = await collectSpecEntries(specsRoot);
  const layeredV1417Entries = entries.filter(
    (entry): entry is SpecEntry => entry.layout === "layered" && entry.layeredStyle === "v1417",
  );
  const layeredV1421Entries = entries.filter(
    (entry): entry is SpecEntry => entry.layout === "layered" && entry.layeredStyle === "v1421",
  );
  if (layeredV1417Entries.length === 0 && layeredV1421Entries.length === 0) {
    return [];
  }

  const issues: Issue[] = [];
  if (layeredV1417Entries.length > 0) {
    const policiesDir = layeredV1417Entries[0]?.sharedDir ?? path.join(specsRoot, "_policies");
    issues.push(...(await validatePoliciesDownstreamReferences(policiesDir)));

    for (const entry of layeredV1417Entries) {
      issues.push(...(await validateSpecRootParent(entry)));
      issues.push(
        ...(await validateMarkdownParentFormat(entry.userStoriesPath, "US", CAP_ID_RE, "CAP")),
      );
      issues.push(
        ...(await validateMarkdownParentFormat(entry.acceptanceCriteriaPath, "AC", US_ID_RE, "US")),
      );
      issues.push(
        ...(await validateMarkdownParentFormat(entry.businessRulesPath, "BR", AC_ID_RE, "AC")),
      );
      issues.push(...(await validateExamplesParentFormat(entry.examplesPath)));
      issues.push(
        ...(await validateMarkdownParentFormat(entry.testCasesPath, "TC", EX_ID_RE, "EX")),
      );
      issues.push(
        ...(await validateForbiddenRefs(
          entry.userStoriesPath,
          US_DOWNSTREAM_RE,
          "User-stories で下位ID参照は禁止です",
        )),
      );
      issues.push(
        ...(await validateForbiddenRefs(
          entry.acceptanceCriteriaPath,
          AC_DOWNSTREAM_RE,
          "Acceptance-criteria で下位ID参照は禁止です",
        )),
      );
      issues.push(
        ...(await validateForbiddenRefs(
          entry.businessRulesPath,
          BR_DOWNSTREAM_RE,
          "Business-rules で下位ID参照は禁止です",
        )),
      );
    }
  }

  if (layeredV1421Entries.length > 0) {
    const policiesDir = layeredV1421Entries[0]?.sharedDir ?? path.join(specsRoot, "_policies");
    issues.push(...(await validatePoliciesScopeForV1421(policiesDir)));

    for (const entry of layeredV1421Entries) {
      issues.push(
        ...(await validateMarkdownParentFormat(entry.userStoriesPath, "US", CAP_ID_RE, "CAP")),
      );
      issues.push(
        ...(await validateMarkdownParentFormat(entry.acceptanceCriteriaPath, "AC", US_ID_RE, "US")),
      );
      issues.push(
        ...(await validateMarkdownParentFormat(entry.businessRulesPath, "BR", AC_ID_RE, "AC")),
      );
      issues.push(
        ...(await validateMarkdownParentFormat(entry.testCasesPath, "TC", EX_ID_RE, "EX")),
      );
      issues.push(...(await validateDownstreamRefsForV1421(entry)));
    }
  }

  return issues;
}

/** The one file `sdd-triage.md` mandates for cross-spec / policy-only rows. */
const POLICIES_TRIAGE_FILE = "10_delta.md";

/**
 * The canonical `## Triage` heading — exactly what `validateTriageSection`
 * recognizes (an H2 whose normalized text is `triage`). `# Triage`,
 * `### Triage` and `## Triage notes` are deliberately excluded.
 */
const CANONICAL_TRIAGE_HEADING_RE = /^##[ \t]+triage[ \t]*$/i;

/**
 * The Triage columns whose cells the carve-out exempts, normalized the way
 * `validateTriageSection` normalizes a header (`trim().toLowerCase()`).
 *
 * Any column outside this set is an author's own addition that no Triage
 * validator inspects, so its cells stay visible to the scan: a `Parent` or
 * `Refs` column is an ownership edge, which is exactly what the ban is for.
 */
const EXEMPT_TRIAGE_COLUMNS = new Set<string>(
  TRIAGE_TABLE_HEADER.map((column) => column.trim().toLowerCase()),
);

/** An H1 or H2 heading, which closes the `## Triage` section. */
const SECTION_BOUNDARY_RE = /^#{1,2}[ \t]+\S/;

/**
 * Blanks the **table rows** of the canonical `## Triage` section in
 * `_policies/10_delta.md`, preserving line count.
 *
 * `sdd-triage.md` requires cross-spec and policy-only Triage rows to be
 * persisted in `_policies/10_delta.md`, and `QFAI-TRIAGE-002` makes
 * `Existing Spec` (a `spec-NNNN` value) a required column — so the Triage
 * table necessarily cites the very tokens this scan bans. The intent of the
 * ban is that `_policies` must not *define or own* lower-layer items; citing
 * one in a delta record is not the same thing, and the two rules were
 * otherwise jointly unsatisfiable for any populated cross-spec Triage table.
 *
 * Three deliberate narrowings keep the carve-out from becoming a hole:
 *
 * - **File** — only `10_delta.md`. A `## Triage` heading in
 *   `11_Slice-Policy.md` or `01_Objective.md` is not the mandated table, so it
 *   earns no exemption.
 * - **Heading** — only the canonical H2 that `validateTriageSection` itself
 *   accepts, and only its first occurrence, because `extractMarkdownSection`
 *   reads the first one. Exempting a heading no Triage validator inspects
 *   would leave the content covered by nothing at all.
 * - **Line shape** — only table rows. The carve-out exists for *citations* in
 *   the `Existing Spec` / `Approved By` / `Rationale` cells. A
 *   `### AC-0001-0001` heading or a `- Parent: US-0001-0001` bullet inside the
 *   same section is a definition or a traceability edge — precisely what the
 *   ban is for — so it stays visible to the scan.
 * - **Column** — only cells under a canonical Triage column. Extra columns are
 *   allowed by `validateTriageSection` (it checks only for *missing* required
 *   columns), so blanking the whole row would let a `Parent` column carry an
 *   ownership edge past every check. Those cells stay visible.
 */
function maskTriageSection(fileName: string, text: string): string {
  if (fileName !== POLICIES_TRIAGE_FILE) {
    return text;
  }
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const start = lines.findIndex((line) => CANONICAL_TRIAGE_HEADING_RE.test(line));
  if (start === -1) {
    return text;
  }
  const masked = [...lines];
  let index = start + 1;
  while (index < lines.length) {
    if (SECTION_BOUNDARY_RE.test(lines[index] ?? "")) {
      break;
    }
    // Only a real table is exempt: a header row followed by a separator row,
    // then its contiguous body. A lone pipe-prefixed line — `| - Parent:
    // US-0001-0001 |` dropped under the table after a blank line — is not
    // parsed as a table by `parseAllMarkdownTables`, so no Triage validator
    // ever inspects it. Blanking it here would hide an ownership edge from the
    // only checks that cover it.
    const consumed = maskTableAt(lines, index, masked);
    index = consumed > index ? consumed : index + 1;
  }
  return masked.join("\n");
}

/**
 * If a markdown table starts at `index`, blank the exempt cells of its rows in
 * `masked` and return the index just past it. Returns `index` when there is no
 * table here.
 *
 * Uses `parseAllMarkdownTables`' own `looksLikeTableRow` / `isTableSeparator`
 * rather than a private regex, so the carve-out and the parser agree on what a
 * table is. A stricter local copy (one that required a trailing `|` on the
 * separator, say) left a table the Triage validators DO parse unmasked, and its
 * required `Existing Spec` cell then raised `QFAI-LAYER-100`.
 *
 * Only cells under a canonical Triage column are blanked; cells of any extra
 * column survive into the scanned text.
 */
function maskTableAt(lines: readonly string[], index: number, masked: string[]): number {
  const header = lines[index] ?? "";
  const separator = lines[index + 1] ?? "";
  if (!looksLikeTableRow(header) || !isTableSeparator(separator)) {
    return index;
  }
  const exemptColumns = splitMarkdownRow(header).map((column) =>
    EXEMPT_TRIAGE_COLUMNS.has(column.trim().toLowerCase()),
  );
  masked[index] = "";
  masked[index + 1] = "";
  let cursor = index + 2;
  for (; cursor < lines.length && looksLikeTableRow(lines[cursor] ?? ""); cursor += 1) {
    masked[cursor] = retainedCells(lines[cursor] ?? "", exemptColumns);
  }
  return cursor;
}

/**
 * The row's cells that are NOT exempt, joined so the scan still sees them on
 * one line (the mask preserves line count). A cell past the header's last
 * column has no declared owner, so it is retained.
 */
function retainedCells(line: string, exemptColumns: readonly boolean[]): string {
  return splitMarkdownRow(line)
    .filter((_cell, column) => exemptColumns[column] !== true)
    .join(" ")
    .trim();
}

async function validatePoliciesDownstreamReferences(policiesDir: string): Promise<Issue[]> {
  const issues: Issue[] = [];
  for (const fileName of POLICIES_FILES) {
    const filePath = path.join(policiesDir, fileName);
    const text = await readSafe(filePath);
    if (text.trim().length === 0) {
      continue;
    }
    const refs = uniqueMatches(maskTriageSection(fileName, text), POLICIES_DOWNSTREAM_RE);
    if (refs.length === 0) {
      continue;
    }
    issues.push(
      issue(
        "QFAI-LAYER-100",
        `${fileName} で下位参照は禁止です: ${refs.join(", ")}`,
        "error",
        filePath,
        "layeredTraceability.sharedDownRef",
        refs,
      ),
    );
  }
  return issues;
}

async function validatePoliciesScopeForV1421(policiesDir: string): Promise<Issue[]> {
  const files = await collectMarkdownFiles(policiesDir);
  if (files.length === 0) {
    return [];
  }

  const issues: Issue[] = [];
  for (const filePath of files) {
    const text = await readSafe(filePath);
    if (text.trim().length === 0) {
      continue;
    }
    // The mandated Triage table is `_policies/10_delta.md` itself, not a
    // same-named file in some nested directory, so compare the path relative
    // to `_policies/` rather than the basename.
    const relative = path.relative(policiesDir, filePath).replace(/\\/g, "/");
    const refs = uniqueMatches(maskTriageSection(relative, text), POLICIES_DOWNSTREAM_V1421_RE);
    if (refs.length === 0) {
      continue;
    }
    issues.push(
      issue(
        "TRACE_SHARED_SCOPE_VIOLATION",
        `_policies で US/AC/BR/EX/TC の定義・参照は禁止です: ${refs.join(", ")}`,
        "error",
        filePath,
        "layeredTraceability.sharedScope",
        refs,
      ),
    );
  }

  return issues;
}

async function validateDownstreamRefsForV1421(entry: SpecEntry): Promise<Issue[]> {
  const checks: Array<{ filePath: string; layer: LayerIdPrefix }> = [
    { filePath: entry.userStoriesPath, layer: "US" },
    { filePath: entry.acceptanceCriteriaPath, layer: "AC" },
    { filePath: entry.businessRulesPath, layer: "BR" },
    { filePath: entry.examplesPath, layer: "EX" },
    { filePath: entry.testCasesPath, layer: "TC" },
  ];

  const issues: Issue[] = [];
  for (const check of checks) {
    const text = await readSafe(check.filePath);
    if (text.trim().length === 0) {
      continue;
    }

    const refs = uniqueMatches(text, LAYER_ID_RE).filter((id) =>
      isDownstreamReference(check.layer, id),
    );
    if (refs.length === 0) {
      continue;
    }

    issues.push(
      issue(
        "TRACE_DOWNSTREAM_REF",
        `${path.basename(check.filePath)} で下位レイヤー参照は禁止です: ${refs.join(", ")}`,
        "error",
        check.filePath,
        "layeredTraceability.downstream",
        refs,
      ),
    );
  }

  return issues;
}

function isDownstreamReference(sourceLayer: LayerIdPrefix, id: string): boolean {
  const targetLayer = resolveLayerFromId(id);
  if (!targetLayer) {
    return false;
  }
  return LAYER_ORDER[targetLayer] > LAYER_ORDER[sourceLayer];
}

function resolveLayerFromId(id: string): LayerIdPrefix | null {
  const prefix = id.split("-", 1)[0]?.toUpperCase();
  if (!prefix) {
    return null;
  }
  if (prefix in LAYER_ORDER) {
    return prefix as LayerIdPrefix;
  }
  return null;
}

async function collectMarkdownFiles(policiesDir: string): Promise<string[]> {
  try {
    const entries = await readdir(policiesDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === ".md")
      .map((entry) => path.join(policiesDir, entry.name))
      .sort((left, right) => left.localeCompare(right));
  } catch {
    return [];
  }
}

async function validateSpecRootParent(entry: SpecEntry): Promise<Issue[]> {
  const specPath = path.join(entry.dir, "01_Spec.md");
  const text = await readSafe(specPath);
  if (text.trim().length > 0 && /\bCAP-\d{4}\b/.test(text)) {
    return [];
  }
  return [
    issue(
      "QFAI-LAYER-101",
      "01_Spec.md は `CAP-YYYY` の親参照を含む必要があります。",
      "error",
      specPath,
      "layeredTraceability.specParent",
    ),
  ];
}

async function validateMarkdownParentFormat(
  filePath: string,
  prefix: "US" | "AC" | "BR" | "TC",
  parentFormat: RegExp,
  parentPrefix: "CAP" | "US" | "AC" | "EX",
): Promise<Issue[]> {
  const text = await readSafe(filePath);
  const items = collectMarkdownItems(text, prefix);
  const issues: Issue[] = [];

  for (const item of items) {
    if (!item.parent) {
      issues.push(
        issue(
          "QFAI-LAYER-102",
          `${item.id} に Parent がありません。`,
          "error",
          filePath,
          "layeredTraceability.parentRequired",
          [item.id],
        ),
      );
      continue;
    }
    if (!parentFormat.test(item.parent)) {
      issues.push(
        issue(
          "QFAI-LAYER-103",
          `${item.id} の Parent は ${parentPrefix}-XXXX 形式で指定してください: ${item.parent}`,
          "error",
          filePath,
          "layeredTraceability.parentType",
          [item.id, item.parent],
        ),
      );
    }
  }

  return issues;
}

async function validateExamplesParentFormat(filePath: string): Promise<Issue[]> {
  const text = await readSafe(filePath);
  const scenarios = collectScenarioItems(text);
  const issues: Issue[] = [];

  for (const scenario of scenarios) {
    if (!scenario.parent) {
      issues.push(
        issue(
          "QFAI-LAYER-104",
          `${scenario.exId} に Parent コメントがありません。`,
          "error",
          filePath,
          "layeredTraceability.parentRequired",
          [scenario.exId],
        ),
      );
      continue;
    }
    if (!BR_OR_AC_ID_RE.test(scenario.parent)) {
      issues.push(
        issue(
          "QFAI-LAYER-105",
          `${scenario.exId} の Parent は BR-XXXX または AC-XXXX で指定してください: ${scenario.parent}`,
          "error",
          filePath,
          "layeredTraceability.parentType",
          [scenario.exId, scenario.parent],
        ),
      );
    }
  }

  return issues;
}

async function validateForbiddenRefs(
  filePath: string,
  pattern: RegExp,
  messagePrefix: string,
): Promise<Issue[]> {
  const text = await readSafe(filePath);
  const refs = uniqueMatches(text, pattern);
  if (refs.length === 0) {
    return [];
  }
  return [
    issue(
      "QFAI-LAYER-106",
      `${messagePrefix}: ${refs.join(", ")}`,
      "error",
      filePath,
      "layeredTraceability.downRefForbidden",
      refs,
    ),
  ];
}
