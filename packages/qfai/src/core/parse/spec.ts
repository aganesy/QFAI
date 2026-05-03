import { parseContractRefs, type ParsedContractRefs } from "./contractRefs.js";
import { extractH2Sections, parseHeadings } from "./markdown.js";

export type BrPriority = "P0" | "P1" | "P2" | "P3";

export type ParsedBr = {
  id: string;
  priority: BrPriority;
  text: string;
  line: number;
};

export type ParsedBrWithoutPriority = {
  id: string;
  text: string;
  line: number;
};

export type ParsedBrWithInvalidPriority = {
  id: string;
  priority: string;
  text: string;
  line: number;
};

/**
 * Spec lifecycle status values.
 *
 * Semantics (per `_policies/11_Slice-Policy.md` triage operations):
 *
 * - `active` — spec is current and authoritative.
 * - `superseded` — spec's responsibilities moved to another spec via
 *   the SUPERSEDE op; the directory still exists with `Superseded-by:`
 *   pointing at the new spec for traceability.
 * - `deprecated` — spec is on its way out, `Deprecated-at` records the
 *   transition date; downstream callers should migrate.
 * - `removed` — the spec record has been retired but the directory
 *   has not been (or cannot be) deleted yet. The `DELETE` triage op
 *   removes the directory entirely; `Status: removed` is the
 *   intermediate / archival state for cases where the directory must
 *   stay around for traceability while no longer applying. Validators
 *   require `Deprecated-at` so callers can audit when the spec
 *   stopped applying.
 *
 * TODO(QFAI-PR206-followup): the `removed` vs DELETE distinction
 * (PR #206 review #7) is currently subtle — DELETE removes the
 * directory while `Status: removed` keeps it. A follow-up may either
 * (a) drop `removed` and require DELETE for any retirement, or
 * (b) introduce `Removal-reason` + a dedicated QFAI-STATUS-007
 * validator that pairs with `Deprecated-at` to make the archival
 * intent explicit. Captured as an open question, not blocking 1.8.8.
 */
export const SPEC_STATUS_VALUES = ["active", "superseded", "deprecated", "removed"] as const;
export type SpecStatus = (typeof SPEC_STATUS_VALUES)[number];

/** Type guard equivalent of `SPEC_STATUS_VALUES.includes` that narrows to `SpecStatus`. */
function isSpecStatus(value: string): value is SpecStatus {
  return (SPEC_STATUS_VALUES as readonly string[]).includes(value);
}

export type ParsedSpec = {
  file: string;
  specId?: string;
  sections: Set<string>;
  brs: ParsedBr[];
  brsWithoutPriority: ParsedBrWithoutPriority[];
  brsWithInvalidPriority: ParsedBrWithInvalidPriority[];
  contractRefs: ParsedContractRefs;
  status?: SpecStatus;
  statusRaw?: string;
  supersededBy?: string;
  deprecatedAt?: string;
};

/**
 * Extract a bullet field value from a markdown spec header block of the form
 * `- Name: value`. Returns undefined when the bullet is absent or marked as
 * placeholder ("-").
 */
export function extractBulletField(md: string, name: string): string | undefined {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^\\s*-\\s*${escaped}\\s*:\\s*(.+?)\\s*$`, "im");
  const match = re.exec(md);
  if (!match?.[1]) {
    return undefined;
  }
  const value = match[1].trim();
  if (value === "-" || value.length === 0) {
    return undefined;
  }
  return value;
}

const SPEC_ID_RE = /\bSPEC-\d{4}\b/;
const BR_LINE_RE = /^\s*(?:[-*]\s*)?\[(BR-\d{4}-\d{4})\]\[(P[0-3])\]\s*(.+)$/;
const BR_LINE_ANY_PRIORITY_RE = /^\s*(?:[-*]\s*)?\[(BR-\d{4}-\d{4})\]\[(P[^\]]+)\]\s*(.+)$/;
const BR_LINE_NO_PRIORITY_RE = /^\s*(?:[-*]\s*)?\[(BR-\d{4}-\d{4})\](?!\s*\[P)\s*(.*\S.*)$/;
const VALID_PRIORITIES = new Set<BrPriority>(["P0", "P1", "P2", "P3"]);

export function parseSpec(md: string, file: string): ParsedSpec {
  const headings = parseHeadings(md);
  const h1 = headings.find((heading) => heading.level === 1);
  const specId = h1?.title.match(SPEC_ID_RE)?.[0];

  const sections = extractH2Sections(md);
  const sectionNames = new Set(Array.from(sections.keys()));
  const lines = md.split(/\r?\n/);

  const brs: ParsedBr[] = [];
  const brsWithoutPriority: ParsedBrWithoutPriority[] = [];
  const brsWithInvalidPriority: ParsedBrWithInvalidPriority[] = [];

  for (let i = 0; i < lines.length; i++) {
    const lineText = lines[i] ?? "";
    const lineNumber = i + 1;

    const validMatch = lineText.match(BR_LINE_RE);
    if (validMatch) {
      const id = validMatch[1];
      const priority = validMatch[2];
      const text = validMatch[3];
      if (!id || !priority || !text) continue;
      brs.push({
        id,
        priority: priority as BrPriority,
        text: text.trim(),
        line: lineNumber,
      });
      continue;
    }

    const anyPriorityMatch = lineText.match(BR_LINE_ANY_PRIORITY_RE);
    if (anyPriorityMatch) {
      const id = anyPriorityMatch[1];
      const priority = anyPriorityMatch[2];
      const text = anyPriorityMatch[3];
      if (!id || !priority || !text) continue;
      if (!VALID_PRIORITIES.has(priority as BrPriority)) {
        brsWithInvalidPriority.push({
          id,
          priority,
          text: text.trim(),
          line: lineNumber,
        });
      }
      continue;
    }

    const noPriorityMatch = lineText.match(BR_LINE_NO_PRIORITY_RE);
    if (noPriorityMatch) {
      const id = noPriorityMatch[1];
      const text = noPriorityMatch[2];
      if (!id || !text) continue;
      brsWithoutPriority.push({
        id,
        text: text.trim(),
        line: lineNumber,
      });
    }
  }

  const parsed: ParsedSpec = {
    file,
    sections: sectionNames,
    brs,
    brsWithoutPriority,
    brsWithInvalidPriority,
    contractRefs: parseContractRefs(md),
  };
  if (specId) {
    parsed.specId = specId;
  }

  const statusRaw = extractBulletField(md, "Status");
  if (statusRaw !== undefined) {
    parsed.statusRaw = statusRaw;
    if (isSpecStatus(statusRaw)) {
      parsed.status = statusRaw;
    }
  }
  // TODO(QFAI-PR206-followup): `extractBulletField` returns the first
  // matching bullet only. If a spec has multiple `- Status:` lines (e.g.
  // a merge conflict residue), the validator currently sees only the
  // first one and may pass a self-contradicting spec. Detecting
  // duplicates requires either a new helper (`extractBulletFields`)
  // and a new validator code (QFAI-STATUS-007 "duplicate Status
  // bullets") — design beyond PR #206 scope (review #44).
  const supersededBy = extractBulletField(md, "Superseded-by");
  if (supersededBy !== undefined) {
    parsed.supersededBy = supersededBy;
  }
  const deprecatedAt = extractBulletField(md, "Deprecated-at");
  if (deprecatedAt !== undefined) {
    parsed.deprecatedAt = deprecatedAt;
  }

  return parsed;
}
