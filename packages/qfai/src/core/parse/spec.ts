import { maskNonSpecRegions } from "../specPackParsers.js";
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

/** Horizontal whitespace — everything `\s` covers except a line break. */
const H_SPACE = "[^\\S\\r\\n]";

/**
 * Extract a bullet field value from a markdown spec header block of the form
 * `- Name: value`. Returns undefined when the bullet is absent, empty, or
 * marked as placeholder ("-").
 *
 * The value is read from the bullet's own line and nowhere else: every
 * separator here is horizontal-only, so a `- Status:` with nothing after the
 * colon cannot reach across the line break and adopt whatever the next line
 * happens to say. That matters because the same extraction decides whether a
 * whole ledger stops gating — `- Status:` followed by a bare `deprecated`
 * line is not the `- Name: value` bullet `QFAI-STATUS-001` asks for, and
 * accepting it would retire the spec on a declaration no validator could
 * report. An empty or wrapped bullet therefore fails closed, leaving the spec
 * current and its missing value to `QFAI-STATUS-001`.
 *
 * The bullet must also start at **column 0**. These are the document's own
 * metadata, and an indented `- Status:` is a child of the bullet above it —
 * `- Notes:` with a quoted retirement under it says nothing about this spec's
 * lifecycle, but read as metadata it retires the spec, and `maskNonSpecRegions`
 * keeps list continuations on purpose so nothing else removes it. Requiring
 * column 0 fails closed: an indented declaration is not seen, the spec stays
 * current, and `QFAI-STATUS-001` reports the missing bullet.
 *
 * The `-` must be followed by at least one horizontal space, as CommonMark
 * requires of a list marker. Without that, `-Status: deprecated` — an ordinary
 * paragraph line, rendered as literal text and reported by no status rule —
 * read as a complete lifecycle declaration and retired the spec, dropping its
 * whole ledger out of the gate on prose.
 */
export function extractBulletField(md: string, name: string): string | undefined {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^-${H_SPACE}+${escaped}${H_SPACE}*:([^\\r\\n]*)$`, "im");
  const match = re.exec(md);
  if (match === null) {
    return undefined;
  }
  const value = (match[1] ?? "").trim();
  if (value === "-" || value.length === 0) {
    return undefined;
  }
  return value;
}

/** `Superseded-by` names a spec directory in four-digit form. */
export const SUPERSEDED_BY_RE = /^spec-\d{4}$/;
/** The shape of `Deprecated-at`. Shape only — see {@link isValidDeprecatedAt}. */
export const DEPRECATED_AT_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Whether `Deprecated-at` names a date that exists.
 *
 * The shape regex alone accepts `2026-02-30` and `9999-99-99`, and a retirement
 * date is not decoration: it is the only field standing between a
 * `deprecated` / `removed` bullet and a whole ledger dropping out of the gate.
 * Round-tripping through UTC catches the rollover (`2026-02-30` becomes
 * `2026-03-02`), the same way `waivers.ts` and `worklogSurface.ts` check the
 * dates they act on.
 */
export function isValidDeprecatedAt(value: string): boolean {
  const match = DEPRECATED_AT_RE.exec(value);
  if (match === null) {
    return false;
  }
  const [yearText, monthText, dayText] = value.split("-");
  const year = Number.parseInt(yearText ?? "", 10);
  const month = Number.parseInt(monthText ?? "", 10);
  const day = Number.parseInt(dayText ?? "", 10);
  // `setUTCFullYear` rather than `Date.UTC`, which maps a 0..99 year into the
  // 1900s. The four-digit regex already excludes that, so this is only
  // insurance against the shape ever loosening.
  const probe = new Date(0);
  probe.setUTCFullYear(year, month - 1, day);
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

/** The lifecycle declaration of a spec: its `Status:` bullet and companions. */
export type SpecLifecycle = {
  status: SpecStatus;
  supersededBy?: string;
  deprecatedAt?: string;
};

/**
 * Start of the first `##`+ section — the end of the leading bullet block.
 *
 * Up to three leading spaces, as CommonMark allows on an ATX heading and as
 * `parseHeadings` already accepts elsewhere in this repository. Anchored at
 * column 0 the boundary missed `  ## Notes`, and every bullet quoted under such
 * a heading stayed inside the header block — enough to retire a spec that never
 * declared a lifecycle of its own.
 */
const HEADER_BLOCK_END_RE = /^ {0,3}#{2,6}\s/m;

/**
 * The leading metadata block of `01_Spec.md`: everything before its first `##`
 * heading, with the regions that are not the spec blanked out.
 *
 * `extractBulletField` matches the first bullet anywhere in the text it is
 * given, so an illustrative `- Status: deprecated` quoted in a prose section
 * would otherwise read as the spec's own lifecycle. `QFAI-STATUS-001` places
 * the bullet in "01_Spec.md の冒頭 bullet ブロック", so a lifecycle branch
 * honours exactly that block.
 *
 * The block is masked first, because the header block is where a rewrite parks
 * what it replaced: an old declaration retired into an HTML comment, or a
 * fenced sample of the bullets SUPERSEDE writes, both sit above the first
 * heading and both would otherwise outrank the live `- Status: active` below
 * them. Masking preserves line count, so the slice still ends at the same line
 * of the document — and a `##` that only appears inside a comment or a fence
 * no longer ends the header block early.
 */
function specHeaderBlock(md: string): string {
  const visible = maskNonSpecRegions(md);
  const firstSection = HEADER_BLOCK_END_RE.exec(visible);
  return firstSection === null ? visible : visible.slice(0, firstSection.index);
}

/**
 * The lifecycle a spec declares in its header block.
 *
 * Returns `undefined` when the header block has no `Status:` bullet or holds a
 * value outside {@link SPEC_STATUS_VALUES}: `QFAI-STATUS-001` /
 * `QFAI-STATUS-002` report those two cases on their own, and a caller that
 * branches on the lifecycle (retiring a ledger, skipping a classification) must
 * not act on a spelling no validator accepted.
 *
 * This is the cheap path for callers that need only the lifecycle: `parseSpec`
 * also exposes it, but reads the whole document to do so.
 */
export function parseSpecLifecycle(md: string): SpecLifecycle | undefined {
  const header = specHeaderBlock(md);
  const raw = extractBulletField(header, "Status");
  if (raw === undefined || !isSpecStatus(raw)) {
    return undefined;
  }
  const lifecycle: SpecLifecycle = { status: raw };
  const supersededBy = extractBulletField(header, "Superseded-by");
  if (supersededBy !== undefined) {
    lifecycle.supersededBy = supersededBy;
  }
  const deprecatedAt = extractBulletField(header, "Deprecated-at");
  if (deprecatedAt !== undefined) {
    lifecycle.deprecatedAt = deprecatedAt;
  }
  return lifecycle;
}

/**
 * Whether a retirement carries the companion field its status requires, in the
 * shape `QFAI-STATUS-003` / `-005` / `-006` demand.
 *
 * A caller that acts on the retirement — dropping a ledger out of the gate —
 * must not do so on half a declaration: `--profile tdd` never runs
 * `validateSpecPacks`, so `- Status: superseded` with no `Superseded-by` would
 * otherwise retire a ledger with nothing anywhere reporting the omission.
 *
 * Shape only: whether the named successor exists is a question about the spec
 * set, which this function does not see. `collectSpecEntries` answers it
 * before setting `SpecEntry.status`, on the same evidence `QFAI-STATUS-004`
 * uses — a `Superseded-by` naming no spec means the work has nowhere to go,
 * and the ledger has to keep gating until it does.
 */
export function isLifecycleDeclarationComplete(lifecycle: SpecLifecycle): boolean {
  switch (lifecycle.status) {
    case "active":
      return true;
    case "superseded":
      return lifecycle.supersededBy !== undefined && SUPERSEDED_BY_RE.test(lifecycle.supersededBy);
    case "deprecated":
    case "removed":
      return lifecycle.deprecatedAt !== undefined && isValidDeprecatedAt(lifecycle.deprecatedAt);
  }
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

  // Read the lifecycle bullets from the masked header block — the same text
  // `parseSpecLifecycle` reads, so `validateSpecStatus` and every caller that
  // branches on `SpecEntry.status` answer for one declaration.
  //
  // `QFAI-STATUS-001` places the bullet in the header block, so a `- Status:`
  // quoted in a prose section is an example: taken as the spec's own, it
  // silenced that rule for a spec that never declared a status, and let a
  // header `Status: superseded` borrow its `Superseded-by` from an
  // illustration further down. Only these three fields are scoped this way —
  // the BR scan above walks the raw lines because it reports line numbers.
  const lifecycleSource = specHeaderBlock(md);
  const statusRaw = extractBulletField(lifecycleSource, "Status");
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
  const supersededBy = extractBulletField(lifecycleSource, "Superseded-by");
  if (supersededBy !== undefined) {
    parsed.supersededBy = supersededBy;
  }
  const deprecatedAt = extractBulletField(lifecycleSource, "Deprecated-at");
  if (deprecatedAt !== undefined) {
    parsed.deprecatedAt = deprecatedAt;
  }

  return parsed;
}
