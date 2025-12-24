export type IdPrefix = "SPEC" | "BR" | "SC" | "UI" | "API" | "DATA";

const ID_PATTERNS: Record<IdPrefix, RegExp> = {
  SPEC: /\bSPEC-[A-Z0-9-]+\b/g,
  BR: /\bBR-[A-Z0-9-]+\b/g,
  SC: /\bSC-[A-Z0-9-]+\b/g,
  UI: /\bUI-[A-Z0-9-]+\b/g,
  API: /\bAPI-[A-Z0-9-]+\b/g,
  DATA: /\bDATA-[A-Z0-9-]+\b/g,
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

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}
