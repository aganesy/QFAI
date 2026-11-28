/**
 * The brief of the committed catalogue: one line per component, made for an agent's prompt, so a
 * brief that hands out screen work carries the catalogue's rules instead of restating them.
 */

import { parse, stringify } from "yaml";

/** The keys a component's line leads with, before the rest in the catalogue's own order. */
const LEADING_KEYS = ["pattern", "states", "props", "a11y"] as const;

/**
 * The brief's component lines for a catalogue text `readCatalog` has read. Every key of an entry
 * other than `name` and `file` is shown, so a key the catalogue gains later appears unchanged: a
 * list as its items joined by commas, a mapping as `key: a | b` pairs.
 */
export function componentBriefLines(catalogText: string, catalogPath: string): string[] | null {
  let parsed: unknown;
  try {
    parsed = parse(catalogText);
  } catch {
    return null;
  }
  const list = isRecord(parsed) && Array.isArray(parsed.components) ? parsed.components : [];
  if (list.length === 0) return [`Components in ${catalogPath}: none.`];
  const lines = [`Components in ${catalogPath}:`];
  for (const entry of list) {
    if (!isRecord(entry)) return null;
    const line = componentLine(entry);
    if (line === null) return null;
    lines.push(line);
  }
  return lines;
}

/**
 * One component's line: its fields joined by `; `.
 * Ceiling: a free-text value that itself holds `; `, such as an `a11y` note, reads as two fields;
 * accepted while the brief is read by an agent beside the catalogue; quoting values lifts it.
 */
function componentLine(entry: Record<string, unknown>): string | null {
  const head = `- ${String(entry.name)} (${String(entry.file)})`;
  const keys = Object.keys(entry).filter((key) => key !== "name" && key !== "file");
  const leading = LEADING_KEYS.filter((key) => keys.includes(key));
  const rest = keys.filter((key) => !LEADING_KEYS.some((lead) => lead === key));
  const fields: string[] = [];
  for (const key of [...leading, ...rest]) {
    const value = valueText(entry[key]);
    if (value === null) return null;
    fields.push(`${key}: ${value}`);
  }
  const line = fields.length === 0 ? head : `${head}: ${fields.join("; ")}`;
  return line.replace(/\r\n|[\r\n\u2028\u2029]/g, " ");
}

function valueText(value: unknown): string | null {
  type Frame = string | { value: unknown; separator: string } | { leave: object };
  const output: string[] = [];
  const active = new Set<object>();
  const pending: Frame[] = [{ value, separator: ", " }];

  for (let frame = pending.pop(); frame !== undefined; frame = pending.pop()) {
    if (typeof frame === "string") {
      output.push(frame);
      continue;
    }
    if ("leave" in frame) {
      active.delete(frame.leave);
      continue;
    }

    const part = frame.value;
    const isList = Array.isArray(part);
    if (!isList && !isRecord(part)) {
      if (typeof part === "string") output.push(part);
      else if (part === null || typeof part === "number" || typeof part === "boolean") {
        const nonFiniteNumber = typeof part === "number" && !Number.isFinite(part);
        output.push(nonFiniteNumber ? stringify(part).trimEnd() : JSON.stringify(part));
      } else return null;
      continue;
    }
    if (active.has(part)) return null;
    active.add(part);
    pending.push({ leave: part });

    const entries = Object.entries(part).reverse();
    for (const [key, entry] of entries) {
      pending.push({ value: entry, separator: isList ? frame.separator : " | " });
      if (!isList) pending.push(`${key}: `);
      if (key !== entries.at(-1)?.[0]) pending.push(isList ? frame.separator : ", ");
    }
  }
  return output.join("");
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
  const pending: unknown[] = [tree];
  let count = 0;
  while (pending.length > 0) {
    const node = pending.pop();
    if (!isRecord(node)) continue;
    if ("$value" in node) {
      count++;
      continue;
    }
    for (const child of Object.values(node)) pending.push(child);
  }
  return count;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
