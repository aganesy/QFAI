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
  CAP: /\bCAP-[A-Za-z0-9_-]+\b/gi,
  SPEC: /\bSPEC-[A-Za-z0-9_-]+\b/gi,
  US: /\bUS-[A-Za-z0-9_-]+\b/gi,
  BR: /\bBR-[A-Za-z0-9_-]+\b/gi,
  SC: /\bSC-[A-Za-z0-9_-]+\b/gi,
  AC: /\bAC-[A-Za-z0-9_-]+\b/gi,
  CASE: /\bCASE-[A-Za-z0-9_-]+\b/gi,
  UI: /\bUI-[A-Za-z0-9_-]+\b/gi,
  API: /\bAPI-[A-Za-z0-9_-]+\b/gi,
  DB: /\bDB-[A-Za-z0-9_-]+\b/gi,
  THEMA: /\bTHEMA-[A-Za-z0-9_-]+\b/gi,
  ADR: /\bADR-[A-Za-z0-9_-]+\b/gi,
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

export function extractInvalidIds(text: string, prefixes: IdFormatPrefix[]): string[] {
  const invalid: string[] = [];
  for (const prefix of prefixes) {
    const candidates = text.match(LOOSE_ID_PATTERNS[prefix]) ?? [];
    for (const candidate of candidates) {
      if (!isValidId(candidate, prefix)) {
        invalid.push(candidate);
      }
    }
  }
  return unique(invalid);
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
