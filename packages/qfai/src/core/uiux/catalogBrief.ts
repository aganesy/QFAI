/**
 * The brief of the committed catalogue: one line per component, made for an agent's prompt, so a
 * brief that hands out screen work carries the catalogue's rules instead of restating them.
 */

import { parse } from "yaml";

/** The keys a component's line leads with, before the rest in the catalogue's own order. */
const LEADING_KEYS = ["pattern", "states", "props", "a11y"] as const;

/**
 * The brief's component lines for a catalogue text `readCatalog` has read. Every key of an entry
 * other than `name` and `file` is shown, so a key the catalogue gains later appears unchanged: a
 * list as its items joined by commas, a mapping as `key: a | b` pairs.
 */
export function componentBriefLines(catalogText: string, catalogPath: string): string[] {
  const parsed: unknown = parse(catalogText);
  const list = isRecord(parsed) && Array.isArray(parsed.components) ? parsed.components : [];
  if (list.length === 0) return [`Components in ${catalogPath}: none.`];
  return [`Components in ${catalogPath}:`, ...list.filter(isRecord).map(componentLine)];
}

function componentLine(entry: Record<string, unknown>): string {
  const head = `- ${String(entry.name)} (${String(entry.file)})`;
  const keys = Object.keys(entry).filter((key) => key !== "name" && key !== "file");
  const leading = LEADING_KEYS.filter((key) => keys.includes(key));
  const rest = keys.filter((key) => !LEADING_KEYS.some((lead) => lead === key));
  const fields = [...leading, ...rest].map((key) => `${key}: ${valueText(entry[key], ", ")}`);
  return fields.length === 0 ? head : `${head}: ${fields.join("; ")}`;
}

function valueText(value: unknown, separator: string): string {
  if (Array.isArray(value)) return value.map((item) => valueText(item, separator)).join(separator);
  if (isRecord(value)) {
    return Object.entries(value)
      .map(([key, inner]) => `${key}: ${valueText(inner, " | ")}`)
      .join(", ");
  }
  return typeof value === "string" ? value : JSON.stringify(value);
}

/**
 * The number of tokens a design token file holds, each a group with a `$value`, or null when the
 * text is not JSON.
 */
export function tokenFileCount(text: string): number | null {
  let tree: unknown;
  try {
    tree = JSON.parse(text);
  } catch {
    return null;
  }
  const count = (node: unknown): number => {
    if (!isRecord(node)) return 0;
    if ("$value" in node) return 1;
    return Object.values(node).reduce<number>((total, inner) => total + count(inner), 0);
  };
  return count(tree);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
