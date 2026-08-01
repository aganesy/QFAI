export type IdPrefix =
  | "CAP"
  | "SPEC"
  | "US"
  | "BR"
  | "SC"
  | "AC"
  | "CASE"
  | "UI"
  | "API"
  | "DB"
  | "THEMA";
/**
 * Prefixes with a declared format but no membership in {@link ID_PREFIXES}.
 *
 * `DR` joins `ADR` here rather than in `ID_PREFIXES` because a Decision Record
 * is not a spec-pack item: `extractAllIds` walks the layers a spec decomposes
 * into, and sweeping `DR-*` into that walk would make every citation of a
 * decision look like an undeclared spec item to the traceability rules.
 *
 * What was missing is the *format*. `qfai-implement` makes a non-empty `DR-ID`
 * the hard precondition for the `exception` status and `tddList.ts` enforces it
 * at `error`, but no ID class existed — so any non-empty string satisfied the
 * gate, including a token the operator invented on the spot.
 */
export type IdFormatPrefix = IdPrefix | "ADR" | "DR";

export const ID_PREFIXES: IdPrefix[] = [
  "CAP",
  "SPEC",
  "US",
  "BR",
  "SC",
  "AC",
  "CASE",
  "UI",
  "API",
  "DB",
  "THEMA",
];

const DIGIT_AHEAD = "(?=[A-Za-z0-9_-]*\\d)";

/**
 * A wildcard segment written after an ID base, e.g. the `-*` of `AC-0017-*`.
 *
 * The loose patterns end on `\b`, and `-` is not a word character, so
 * `US-0006-*` backtracks to `US-0006` — a truncation artifact that is also the
 * prefix of every valid `US-0006-NNNN` ID in the same spec, and therefore
 * useless as a search key. {@link isWildcardBase} decides whether to suppress
 * it. A trailing sentence mark (`Is it US-6?`) or a stray separator left by a
 * typo (`US-6-`, `US-0006-0001-`) is a genuinely malformed ID and is still
 * reported.
 */
const WILDCARD_SEGMENT_RE = /^-[*?]/;

/** The segment a wildcard stands in for, used to test the base's shape. */
const WILDCARD_STAND_IN = "0000";

const STRICT_ID_PATTERNS: Record<IdFormatPrefix, RegExp> = {
  CAP: /\bCAP-\d{4}\b/g,
  SPEC: /\bSPEC-\d{4}\b/g,
  US: /\bUS-\d{4}-\d{4}\b/g,
  BR: /\bBR-\d{4}-\d{4}\b/g,
  SC: /\bSC-\d{4}-\d{4}\b/g,
  AC: /\bAC-\d{4}-\d{4}\b/g,
  CASE: /\bCASE-\d{4}-\d{4}\b/g,
  UI: /\bUI-\d{4}\b/g,
  API: /\bAPI-\d{4}\b/g,
  DB: /\bDB-\d{4}\b/g,
  THEMA: /\bTHEMA-\d{3}\b/g,
  ADR: /\bADR-\d{4}\b/g,
  // Two legal shapes, layered the same way the rest of the ID space is: a
  // policy-level record declared in `_policies/08_Decisions.md`, and a
  // spec-scoped one declared in that spec's `07_Decisions.md`. Both forms are
  // already in use in real ledgers, so the format follows the practice rather
  // than replacing it.
  DR: /\bDR-\d{4}(?:-\d{4})?\b/g,
};

const LOOSE_ID_PATTERNS: Record<IdFormatPrefix, RegExp> = {
  CAP: new RegExp(`\\bCAP-${DIGIT_AHEAD}[A-Za-z0-9_-]+\\b`, "gi"),
  SPEC: new RegExp(`\\bSPEC-${DIGIT_AHEAD}[A-Za-z0-9_-]+\\b`, "gi"),
  US: new RegExp(`\\bUS-${DIGIT_AHEAD}[A-Za-z0-9_-]+\\b`, "gi"),
  BR: new RegExp(`\\bBR-${DIGIT_AHEAD}[A-Za-z0-9_-]+\\b`, "gi"),
  SC: new RegExp(`\\bSC-${DIGIT_AHEAD}[A-Za-z0-9_-]+\\b`, "gi"),
  AC: new RegExp(`\\bAC-${DIGIT_AHEAD}[A-Za-z0-9_-]+\\b`, "gi"),
  CASE: new RegExp(`\\bCASE-${DIGIT_AHEAD}[A-Za-z0-9_-]+\\b`, "gi"),
  UI: new RegExp(`\\bUI-${DIGIT_AHEAD}[A-Za-z0-9_-]+\\b`, "gi"),
  API: new RegExp(`\\bAPI-${DIGIT_AHEAD}[A-Za-z0-9_-]+\\b`, "gi"),
  DB: new RegExp(`\\bDB-${DIGIT_AHEAD}[A-Za-z0-9_-]+\\b`, "gi"),
  THEMA: new RegExp(`\\bTHEMA-${DIGIT_AHEAD}[A-Za-z0-9_-]+\\b`, "gi"),
  ADR: new RegExp(`\\bADR-${DIGIT_AHEAD}[A-Za-z0-9_-]+\\b`, "gi"),
  DR: new RegExp(`\\bDR-${DIGIT_AHEAD}[A-Za-z0-9_-]+\\b`, "gi"),
};

export function extractIds(text: string, prefix: IdPrefix): string[] {
  const pattern = STRICT_ID_PATTERNS[prefix];
  const matches = text.match(pattern);
  return unique(matches ?? []);
}

export function extractAllIds(text: string): string[] {
  const all: string[] = [];
  ID_PREFIXES.forEach((prefix) => {
    all.push(...extractIds(text, prefix));
  });
  return unique(all);
}

/**
 * Fence info strings whose body may be primary spec content rather than an
 * illustration.
 *
 * The language alone is not enough to decide: a ```` ```gherkin ```` block in a
 * Purpose paragraph, or in any layered file other than the acceptance criteria,
 * is an illustration. It is scanned only when it also sits inside the section
 * named by {@link FenceMaskOptions.scannedSection}.
 */
const SCANNED_FENCE_LANGUAGES = new Set(["gherkin", "feature", "cucumber"]);

/**
 * The one section whose fenced bodies are primary spec content: the v1421
 * `03_Acceptance-Criteria.md` `## AC Gherkin (required)` block. Masking it
 * would let a mistyped required definition (`# AC-0001-1`) reach
 * `validateLayeredIdFormat` as if it did not exist.
 */
export const AC_GHERKIN_SECTION = "ac gherkin (required)";

/** An ATX heading; only H1/H2 close the section a fence belongs to. */
const HEADING_RE = /^ {0,3}(#{1,6})[ \t]+(.*?)[ \t]*#*[ \t]*$/;

export type FenceMaskOptions = {
  /**
   * Normalized H2 heading (see {@link AC_GHERKIN_SECTION}) whose fenced bodies
   * stay in the ID scan when their info string is a Gherkin dialect. Omitted:
   * every fence body is masked.
   */
  scannedSection?: string;
};

const normalizeSectionTitle = (title: string): string =>
  title.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Opening fence: marker run, then an optional info string.
 *
 * At most 3 leading spaces, per CommonMark. Four or more makes the line an
 * indented code block, not a fence opener — accepting it would swallow the rest
 * of the document (or up to the next fence-looking line) and hide real IDs.
 */
const FENCE_OPEN_RE = /^ {0,3}(`{3,}|~{3,})[ \t]*([^\s`]*)/;

/** Closing fence: marker run and nothing else (CommonMark forbids an info string). */
const FENCE_CLOSE_RE = /^ {0,3}(`{3,}|~{3,})[ \t]*$/;

/**
 * Blanks the body of illustrative fenced code blocks while preserving the line
 * count, so an ID-shaped token inside a sample or a diagram is not read as a
 * spec ID and reported line numbers still point at the source file.
 *
 * Two properties matter:
 *
 * - A fence closes only on the **same marker character** at **at least the
 *   opening length**. A ```` ```` ```` block that quotes a ```` ``` ```` sample
 *   inside itself is legal markdown; toggling on any fence line would end the
 *   outer block early and re-expose the very sample it was hiding.
 * - A fence keeps its body only when it is tagged with a
 *   `SCANNED_FENCE_LANGUAGES` info string **and** sits inside
 *   `options.scannedSection`. Keying on the language alone exempted every
 *   ```` ```gherkin ```` block in every layered file — including an
 *   illustration in a Purpose paragraph — which is the case the mask exists
 *   for. Only the required AC Gherkin section is the spec's own definition.
 */
export function maskFencedCodeBlocks(text: string, options: FenceMaskOptions = {}): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const masked: string[] = [];
  let open: { marker: string; length: number; scanned: boolean } | null = null;
  let inScannedSection = false;

  for (const line of lines) {
    if (open === null) {
      // H1/H2 close the section a fence belongs to; H3+ are subsections of it.
      const heading = HEADING_RE.exec(line);
      if (heading && (heading[1] ?? "").length <= 2) {
        inScannedSection =
          options.scannedSection !== undefined &&
          normalizeSectionTitle(heading[2] ?? "") === options.scannedSection;
      }
      const opening = FENCE_OPEN_RE.exec(line);
      if (opening) {
        const fence = opening[1] ?? "";
        const language = (opening[2] ?? "").toLowerCase();
        open = {
          marker: fence.charAt(0),
          length: fence.length,
          scanned: inScannedSection && SCANNED_FENCE_LANGUAGES.has(language),
        };
        masked.push("");
        continue;
      }
      masked.push(line);
      continue;
    }

    const closing = FENCE_CLOSE_RE.exec(line);
    const fence = closing?.[1] ?? "";
    if (fence.charAt(0) === open.marker && fence.length >= open.length) {
      open = null;
      masked.push("");
      continue;
    }
    masked.push(open.scanned ? line : "");
  }

  return masked.join("\n");
}

export type InvalidIdOccurrence = {
  id: string;
  /** 1-based line number in the original text. */
  line: number;
};

/**
 * Finds ID-shaped tokens that do not match their prefix's canonical format,
 * with the line each was first seen on. Fenced code blocks are excluded.
 */
export function extractInvalidIdOccurrences(
  text: string,
  prefixes: IdFormatPrefix[],
  options: FenceMaskOptions = {},
): InvalidIdOccurrence[] {
  const lines = maskFencedCodeBlocks(text, options).split("\n");
  const firstSeen = new Map<string, number>();

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    for (const prefix of prefixes) {
      for (const match of line.matchAll(LOOSE_ID_PATTERNS[prefix])) {
        const candidate = match[0];
        if (isValidId(candidate, prefix) || firstSeen.has(candidate)) {
          continue;
        }
        const rest = line.slice(match.index + candidate.length);
        if (isWildcardBase(candidate, prefix, rest)) {
          continue;
        }
        firstSeen.set(candidate, index + 1);
      }
    }
  }

  return Array.from(firstSeen, ([id, line]) => ({ id, line }));
}

/**
 * True when `candidate` is the base of a prose wildcard such as `AC-0017-*`,
 * i.e. the wildcard stands in for one more numeric segment and the result is a
 * canonical ID.
 *
 * The check has to run here rather than as a lookahead in the loose pattern: a
 * blanket `(?!-[*?])` also swallowed a malformed base. `US-6-*` looks like a
 * wildcard but `US-6` is not a valid spec namespace, so suppressing it let a
 * wrong digit count bypass `E_ID_INVALID_FORMAT` entirely — the exact failure
 * the format check exists to catch.
 */
function isWildcardBase(candidate: string, prefix: IdFormatPrefix, rest: string): boolean {
  return WILDCARD_SEGMENT_RE.test(rest) && isValidId(`${candidate}-${WILDCARD_STAND_IN}`, prefix);
}

export function extractInvalidIds(
  text: string,
  prefixes: IdFormatPrefix[],
  options: FenceMaskOptions = {},
): string[] {
  return extractInvalidIdOccurrences(text, prefixes, options).map((occurrence) => occurrence.id);
}

export function extractSpecNumber(specId: string): string | null {
  const match = specId.match(/^SPEC-(\d{4})$/);
  return match?.[1] ?? null;
}

export function extractCapSpecNumber(capId: string): string | null {
  const match = capId.match(/^CAP-(\d{4})$/);
  return match?.[1] ?? null;
}

export function extractUsSpecNumber(usId: string): string | null {
  const match = usId.match(/^US-(\d{4})-\d{4}$/);
  return match?.[1] ?? null;
}

export function extractBrSpecNumber(brId: string): string | null {
  const match = brId.match(/^BR-(\d{4})-\d{4}$/);
  return match?.[1] ?? null;
}

export function extractAcSpecNumber(acId: string): string | null {
  const match = acId.match(/^AC-(\d{4})-\d{4}$/);
  return match?.[1] ?? null;
}

export function extractCaseSpecNumber(caseId: string): string | null {
  const match = caseId.match(/^CASE-(\d{4})-\d{4}$/);
  return match?.[1] ?? null;
}

export function extractScSpecNumber(scId: string): string | null {
  const match = scId.match(/^SC-(\d{4})-\d{4}$/);
  return match?.[1] ?? null;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function isValidId(value: string, prefix: IdFormatPrefix): boolean {
  const pattern = STRICT_ID_PATTERNS[prefix];
  const strict = new RegExp(pattern.source);
  return strict.test(value);
}
