export type SpecPackIdKind =
  | "OBJ"
  | "INIT"
  | "CAP"
  | "FLOW"
  | "US"
  | "AC"
  | "BR"
  | "EX"
  | "TC"
  | "CON"
  | "TERM"
  | "ADR"
  | "NFR"
  | "OQ"
  | "TRACE";

const STRICT_ID_PATTERNS: Record<SpecPackIdKind, RegExp> = {
  OBJ: /\bOBJ-\d+\b/g,
  INIT: /\bINIT-\d+\b/g,
  CAP: /\bCAP-\d+\b/g,
  FLOW: /\bFLOW-\d+\b/g,
  US: /\bUS-\d+\b/g,
  AC: /\bAC-\d+\b/g,
  BR: /\bBR-\d+\b/g,
  EX: /\bEX-\d+\b/g,
  TC: /\bTC-\d+\b/g,
  CON: /\bCON-(?:API|DB|UI)-\d+\b/g,
  TERM: /\bTERM-\d+\b/g,
  ADR: /\bADR-\d+\b/g,
  NFR: /\bNFR-\d+\b/g,
  OQ: /\bOQ-\d+\b/g,
  TRACE: /\bTR-\d+\b/g,
};

const LOOSE_ID_PATTERNS: Record<SpecPackIdKind, RegExp> = {
  OBJ: /\bOBJ-[A-Za-z0-9_-]+\b/gi,
  INIT: /\bINIT-[A-Za-z0-9_-]+\b/gi,
  CAP: /\bCAP-[A-Za-z0-9_-]+\b/gi,
  FLOW: /\bFLOW-[A-Za-z0-9_-]+\b/gi,
  US: /\bUS-[A-Za-z0-9_-]+\b/gi,
  AC: /\bAC-[A-Za-z0-9_-]+\b/gi,
  BR: /\bBR-[A-Za-z0-9_-]+\b/gi,
  EX: /\bEX-[A-Za-z0-9_-]+\b/gi,
  TC: /\bTC-[A-Za-z0-9_-]+\b/gi,
  CON: /\bCON-[A-Za-z0-9_-]+\b/gi,
  TERM: /\bTERM-[A-Za-z0-9_-]+\b/gi,
  ADR: /\bADR-[A-Za-z0-9_-]+\b/gi,
  NFR: /\bNFR-[A-Za-z0-9_-]+\b/gi,
  OQ: /\bOQ-[A-Za-z0-9_-]+\b/gi,
  TRACE: /\bTR-[A-Za-z0-9_-]+\b/gi,
};

const EXACT_ID_PATTERNS: Record<SpecPackIdKind, RegExp> = {
  OBJ: /^OBJ-\d+$/,
  INIT: /^INIT-\d+$/,
  CAP: /^CAP-\d+$/,
  FLOW: /^FLOW-\d+$/,
  US: /^US-\d+$/,
  AC: /^AC-\d+$/,
  BR: /^BR-\d+$/,
  EX: /^EX-\d+$/,
  TC: /^TC-\d+$/,
  CON: /^CON-(?:API|DB|UI)-\d+$/,
  TERM: /^TERM-\d+$/,
  ADR: /^ADR-\d+$/,
  NFR: /^NFR-\d+$/,
  OQ: /^OQ-\d+$/,
  TRACE: /^TR-\d+$/,
};

/**
 * ID kinds whose unit is an item **inside** one spec directory, as opposed to
 * the spec-level kinds (`CAP`, `OBJ`, ...). Shared so callers cannot drift from
 * this list.
 */
export const SPEC_ITEM_ID_KINDS = [
  "US",
  "AC",
  "BR",
  "EX",
  "TC",
] as const satisfies readonly SpecPackIdKind[];

/**
 * A fresh matcher for item IDs in free text, including the composite
 * `BR-0001-0002` form that `extractIdsByKind` would report as bare `BR-0001`.
 *
 * The digit run is `\d+`, matching `STRICT_ID_PATTERNS` above: canonical IDs
 * are 4-digit, but `BR-1` and `TC-12345` are accepted as valid IDs elsewhere,
 * so a `\d{4}` matcher here would silently miss them.
 *
 * Built per call rather than shared as a module-level `/g` instance, which
 * would carry `lastIndex` between calls and alternate between firing and not.
 */
export function buildItemIdPattern(): RegExp {
  return new RegExp(`\\b(?:${SPEC_ITEM_ID_KINDS.join("|")})-\\d+(?:-\\d+)?\\b`, "g");
}

export function extractIdsByKind(text: string, kind: SpecPackIdKind): string[] {
  return unique(text.match(STRICT_ID_PATTERNS[kind]) ?? []);
}

export function extractInvalidIds(text: string, kinds: SpecPackIdKind[]): string[] {
  const invalid: string[] = [];
  for (const kind of kinds) {
    const candidates = text.match(LOOSE_ID_PATTERNS[kind]) ?? [];
    for (const candidate of candidates) {
      if (!isValidId(candidate, kind)) {
        invalid.push(candidate);
      }
    }
  }
  return unique(invalid);
}

export function isValidId(value: string, kind: SpecPackIdKind): boolean {
  return EXACT_ID_PATTERNS[kind].test(value);
}

export function parseSemicolonIdList(value: string): string[] {
  return value
    .split(";")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function buildLoosePrefixPattern(prefixes: SpecPackIdKind[]): RegExp {
  const sources = prefixes.map((prefix) => LOOSE_ID_PATTERNS[prefix].source);
  return new RegExp(sources.join("|"), "gi");
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}
