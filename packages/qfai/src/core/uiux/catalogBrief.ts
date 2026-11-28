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
export function componentBriefLines(catalogText: string, catalogPath: string): string[] | null {
  let parsed: unknown;
  try {
    // Mappings stay maps, so a numeric key such as a `variants` prop named `1` keeps its place.
    parsed = parse(catalogText, { mapAsMap: true });
  } catch {
    return null;
  }
  const components: unknown = parsed instanceof Map ? parsed.get("components") : undefined;
  const list: unknown[] = Array.isArray(components) ? components : [];
  if (list.length === 0) return [`Components in ${catalogPath}: none.`];
  const lines = [`Components in ${catalogPath}:`];
  for (const entry of list) {
    if (!(entry instanceof Map)) return null;
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
function componentLine(entry: ReadonlyMap<unknown, unknown>): string | null {
  const entries = mapEntries(entry);
  if (entries === null) return null;
  const fieldsOf = new Map(entries);
  const head = `- ${String(fieldsOf.get("name"))} (${String(fieldsOf.get("file"))})`;
  const keys = [...fieldsOf.keys()].filter((key) => key !== "name" && key !== "file");
  const leading = LEADING_KEYS.filter((key) => keys.includes(key));
  const rest = keys.filter((key) => !LEADING_KEYS.some((lead) => lead === key));
  const fields: string[] = [];
  for (const key of [...leading, ...rest]) {
    const value = valueText(fieldsOf.get(key));
    if (value === null) return null;
    fields.push(`${key}: ${value}`);
  }
  const line = fields.length === 0 ? head : `${head}: ${fields.join("; ")}`;
  return printable(line);
}

/**
 * The line as a terminal shows it: each line break, with a CRLF pair as one, and each tab as a
 * space; every other control, format or lone surrogate character as `\u{XXXX}`, upper-case hex.
 */
function printable(line: string): string {
  return line
    .replace(/\r\n|[\r\n\t\v\f\u0085\u2028\u2029]/g, " ")
    .replace(/[\p{Cc}\p{Cf}\p{Cs}]/gu, (char) => {
      const hex = (char.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, "0");
      return `\\u{${hex}}`;
    });
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
    if (!isList && !(part instanceof Map)) {
      if (typeof part === "string") output.push(part);
      else if (part === null || typeof part === "number" || typeof part === "boolean") {
        output.push(JSON.stringify(part));
      } else return null;
      continue;
    }
    if (active.has(part)) return null;
    active.add(part);
    pending.push({ leave: part });

    const entries = isList ? Object.entries(part) : mapEntries(part);
    if (entries === null) return null;
    // Pushed last first, so the stack pops them in written order; every entry after the first
    // is preceded by a separator.
    for (const [index, [key, entry]] of [...entries.entries()].reverse()) {
      pending.push({ value: entry, separator: isList ? frame.separator : " | " });
      if (!isList) pending.push(`${key}: `);
      if (index > 0) pending.push(isList ? frame.separator : ", ");
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

/**
 * A parsed mapping's entries in written order, each key as the text it prints as, or null when a
 * key is not a string, number or boolean, which no catalogue writes.
 */
function mapEntries(map: ReadonlyMap<unknown, unknown>): [string, unknown][] | null {
  const entries: [string, unknown][] = [];
  for (const [key, value] of map) {
    if (typeof key !== "string" && typeof key !== "number" && typeof key !== "boolean") return null;
    entries.push([String(key), value]);
  }
  return entries;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
