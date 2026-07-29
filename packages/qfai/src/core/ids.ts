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
export type IdFormatPrefix = IdPrefix | "ADR";

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
 * Rejects a candidate that stops mid-ID.
 *
 * The loose patterns end on `\b`, and `-` is not a word character, so
 * `US-0006-*` used to backtrack to `US-0006` and be reported as an invalid ID
 * — a truncation artifact that is also the prefix of every valid
 * `US-0006-NNNN` ID in the same spec, and therefore useless as a search key.
 * Refusing to end immediately before `-`, `*` or `?` means a prose wildcard is
 * either matched verbatim or not matched at all.
 */
const NO_TRUNCATION = "(?![-*?])";

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
};

const LOOSE_ID_PATTERNS: Record<IdFormatPrefix, RegExp> = {
  CAP: new RegExp(`\\bCAP-${DIGIT_AHEAD}[A-Za-z0-9_-]+\\b${NO_TRUNCATION}`, "gi"),
  SPEC: new RegExp(`\\bSPEC-${DIGIT_AHEAD}[A-Za-z0-9_-]+\\b${NO_TRUNCATION}`, "gi"),
  US: new RegExp(`\\bUS-${DIGIT_AHEAD}[A-Za-z0-9_-]+\\b${NO_TRUNCATION}`, "gi"),
  BR: new RegExp(`\\bBR-${DIGIT_AHEAD}[A-Za-z0-9_-]+\\b${NO_TRUNCATION}`, "gi"),
  SC: new RegExp(`\\bSC-${DIGIT_AHEAD}[A-Za-z0-9_-]+\\b${NO_TRUNCATION}`, "gi"),
  AC: new RegExp(`\\bAC-${DIGIT_AHEAD}[A-Za-z0-9_-]+\\b${NO_TRUNCATION}`, "gi"),
  CASE: new RegExp(`\\bCASE-${DIGIT_AHEAD}[A-Za-z0-9_-]+\\b${NO_TRUNCATION}`, "gi"),
  UI: new RegExp(`\\bUI-${DIGIT_AHEAD}[A-Za-z0-9_-]+\\b${NO_TRUNCATION}`, "gi"),
  API: new RegExp(`\\bAPI-${DIGIT_AHEAD}[A-Za-z0-9_-]+\\b${NO_TRUNCATION}`, "gi"),
  DB: new RegExp(`\\bDB-${DIGIT_AHEAD}[A-Za-z0-9_-]+\\b${NO_TRUNCATION}`, "gi"),
  THEMA: new RegExp(`\\bTHEMA-${DIGIT_AHEAD}[A-Za-z0-9_-]+\\b${NO_TRUNCATION}`, "gi"),
  ADR: new RegExp(`\\bADR-${DIGIT_AHEAD}[A-Za-z0-9_-]+\\b${NO_TRUNCATION}`, "gi"),
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
 * Fence info strings whose body is primary spec content rather than an
 * illustration, so it stays in the ID scan.
 *
 * The v1421 `03_Acceptance-Criteria.md` template puts the **required** AC
 * Gherkin inside a ```` ```gherkin ```` fence, so masking every fence would let
 * a mistyped required definition (`# AC-0001-1`) reach `validateLayeredIdFormat`
 * as if it did not exist.
 */
const SCANNED_FENCE_LANGUAGES = new Set(["gherkin", "feature", "cucumber"]);

/** Opening fence: marker run, then an optional info string. */
const FENCE_OPEN_RE = /^[ \t]*(`{3,}|~{3,})[ \t]*([^\s`]*)/;

/** Closing fence: marker run and nothing else (CommonMark forbids an info string). */
const FENCE_CLOSE_RE = /^[ \t]*(`{3,}|~{3,})[ \t]*$/;

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
 * - A fence tagged with a `SCANNED_FENCE_LANGUAGES` info string keeps its body,
 *   because that body is the spec's own definition.
 */
export function maskFencedCodeBlocks(text: string): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const masked: string[] = [];
  let open: { marker: string; length: number; scanned: boolean } | null = null;

  for (const line of lines) {
    if (open === null) {
      const opening = FENCE_OPEN_RE.exec(line);
      if (opening) {
        const fence = opening[1] ?? "";
        const language = (opening[2] ?? "").toLowerCase();
        open = {
          marker: fence.charAt(0),
          length: fence.length,
          scanned: SCANNED_FENCE_LANGUAGES.has(language),
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
): InvalidIdOccurrence[] {
  const lines = maskFencedCodeBlocks(text).split("\n");
  const firstSeen = new Map<string, number>();

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    for (const prefix of prefixes) {
      const candidates = line.match(LOOSE_ID_PATTERNS[prefix]) ?? [];
      for (const candidate of candidates) {
        if (isValidId(candidate, prefix) || firstSeen.has(candidate)) {
          continue;
        }
        firstSeen.set(candidate, index + 1);
      }
    }
  }

  return Array.from(firstSeen, ([id, line]) => ({ id, line }));
}

export function extractInvalidIds(text: string, prefixes: IdFormatPrefix[]): string[] {
  return extractInvalidIdOccurrences(text, prefixes).map((occurrence) => occurrence.id);
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
