export type IdPrefix = "SPEC" | "BR" | "SC" | "UI" | "API" | "DB";
export type IdFormatPrefix = IdPrefix | "ADR";

const ID_PREFIXES: IdPrefix[] = ["SPEC", "BR", "SC", "UI", "API", "DB"];

const STRICT_ID_PATTERNS: Record<IdFormatPrefix, RegExp> = {
  SPEC: /\bSPEC-\d{4}\b/g,
  BR: /\bBR-\d{4}\b/g,
  SC: /\bSC-\d{4}\b/g,
  UI: /\bUI-\d{4}\b/g,
  API: /\bAPI-\d{4}\b/g,
  DB: /\bDB-\d{4}\b/g,
  ADR: /\bADR-\d{4}\b/g,
};

const LOOSE_ID_PATTERNS: Record<IdFormatPrefix, RegExp> = {
  SPEC: /\bSPEC-[A-Za-z0-9_-]+\b/gi,
  BR: /\bBR-[A-Za-z0-9_-]+\b/gi,
  SC: /\bSC-[A-Za-z0-9_-]+\b/gi,
  UI: /\bUI-[A-Za-z0-9_-]+\b/gi,
  API: /\bAPI-[A-Za-z0-9_-]+\b/gi,
  DB: /\bDB-[A-Za-z0-9_-]+\b/gi,
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

export function extractInvalidIds(
  text: string,
  prefixes: IdFormatPrefix[],
): string[] {
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

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function isValidId(value: string, prefix: IdFormatPrefix): boolean {
  const pattern = STRICT_ID_PATTERNS[prefix];
  const strict = new RegExp(pattern.source);
  return strict.test(value);
}
