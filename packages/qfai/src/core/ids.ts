export type IdPrefix = "SPEC" | "BR" | "SC" | "UI" | "API" | "DATA";

const ID_PATTERNS: Record<IdPrefix, RegExp> = {
  SPEC: /\bSPEC-[A-Z0-9-]+\b/g,
  BR: /\bBR-[A-Z0-9-]+\b/g,
  SC: /\bSC-[A-Z0-9-]+\b/g,
  UI: /\bUI-[A-Z0-9-]+\b/g,
  API: /\bAPI-[A-Z0-9-]+\b/g,
  DATA: /\bDATA-[A-Z0-9-]+\b/g,
};

const LOOSE_ID_PATTERNS: Record<IdPrefix, RegExp> = {
  SPEC: /\bSPEC-[A-Za-z0-9_-]+\b/gi,
  BR: /\bBR-[A-Za-z0-9_-]+\b/gi,
  SC: /\bSC-[A-Za-z0-9_-]+\b/gi,
  UI: /\bUI-[A-Za-z0-9_-]+\b/gi,
  API: /\bAPI-[A-Za-z0-9_-]+\b/gi,
  DATA: /\bDATA-[A-Za-z0-9_-]+\b/gi,
};

export function extractIds(text: string, prefix: IdPrefix): string[] {
  const pattern = ID_PATTERNS[prefix];
  const matches = text.match(pattern);
  return unique(matches ?? []);
}

export function extractAllIds(text: string): string[] {
  const all: string[] = [];
  (Object.keys(ID_PATTERNS) as IdPrefix[]).forEach((prefix) => {
    all.push(...extractIds(text, prefix));
  });
  return unique(all);
}

export function extractInvalidIds(
  text: string,
  prefixes: IdPrefix[],
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

function isValidId(value: string, prefix: IdPrefix): boolean {
  const pattern = ID_PATTERNS[prefix];
  const strict = new RegExp(pattern.source);
  return strict.test(value);
}
