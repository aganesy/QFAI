/**
 * DESIGN.md `patch_zone:` semantic — second-wave feature.
 *
 * Authors declare an optional `patch_zone:` block inside the DESIGN.md
 * front-matter listing token paths whose value may change without
 * invalidating prototyping evidence. Edits whose diff is fully contained
 * in the declared zone bump only `patchHash`; any other edit (including
 * removal of the block itself) bumps `majorHash` and surfaces a
 * Reviewer Gate finding.
 *
 * `majorHash` is the sha256 of the bytes EXCLUDING the patch_zone-only
 * value bytes; `patchHash` is the sha256 of the full file bytes (i.e.
 * the legacy `sha256: <hex>` value). Concretely:
 *   - patchHash = sha256(text)
 *   - majorHash = sha256(text with the in-zone values stripped to a
 *                        canonical placeholder)
 *
 * The placeholder strategy keeps majorHash insensitive to in-zone value
 * changes while still detecting structural edits (renamed keys, removed
 * blocks, etc.).
 */

import { createHash } from "node:crypto";

import { parse as parseYaml } from "yaml";

export type PatchZone = {
  /** Token paths whose value may change without bumping majorHash. */
  readonly tokens: readonly string[];
};

export type ParsePatchZoneResult =
  | { readonly ok: true; readonly zone: PatchZone }
  | { readonly ok: false; readonly reason: string };

type FrontMatterSplit =
  | { readonly ok: true; readonly yaml: string; readonly body: string }
  | { readonly ok: false; readonly reason: string };

function splitFrontMatter(text: string): FrontMatterSplit {
  if (!text.startsWith("---")) {
    return { ok: false, reason: "no front-matter delimiter" };
  }
  const nl = text.indexOf("\n", 3);
  if (nl === -1) return { ok: false, reason: "no front-matter newline" };
  const rest = text.slice(nl + 1);
  // Find a line that is exactly `---`.
  const closingMatch = /(^|\n)---\s*(\n|$)/.exec(rest);
  if (!closingMatch) return { ok: false, reason: "no closing delimiter" };
  const closeStart = closingMatch.index + (closingMatch[1] === "\n" ? 1 : 0);
  const yaml = rest.slice(0, closeStart);
  const afterCloseRel = closingMatch.index + closingMatch[0].length;
  const body = rest.slice(afterCloseRel);
  return { ok: true, yaml, body };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Parse the optional `patch_zone:` block from DESIGN.md front-matter.
 * Returns `{ ok: false }` (with a structured reason) when the block is
 * absent or malformed.
 */
export function parseDesignMdPatchZone(text: string): ParsePatchZoneResult {
  const split = splitFrontMatter(text);
  if (!split.ok) {
    return { ok: false, reason: split.reason };
  }
  let parsed: unknown;
  try {
    parsed = parseYaml(split.yaml);
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    return { ok: false, reason: `yaml parse failed: ${detail}` };
  }
  if (!isRecord(parsed)) {
    return { ok: false, reason: "front-matter is not a mapping" };
  }
  const zoneRaw = parsed.patch_zone;
  if (zoneRaw === undefined) {
    return { ok: false, reason: "patch_zone block absent" };
  }
  if (!isRecord(zoneRaw)) {
    return { ok: false, reason: "patch_zone must be a mapping" };
  }
  const tokensRaw = zoneRaw.tokens;
  if (!Array.isArray(tokensRaw)) {
    return { ok: false, reason: "patch_zone.tokens must be a list" };
  }
  const tokens: string[] = [];
  for (const entry of tokensRaw) {
    if (typeof entry !== "string" || entry.length === 0) {
      return { ok: false, reason: "patch_zone.tokens entries must be non-empty strings" };
    }
    tokens.push(entry);
  }
  return { ok: true, zone: { tokens } };
}

/**
 * Compute the dual hash pair for a DESIGN.md document.
 *
 * - `patchHash` = sha256 of the bytes verbatim (mirrors the existing
 *   `sha256` value persisted in DESIGN.md.lock.yaml under the legacy
 *   `designMdSha256` key).
 * - `majorHash` = sha256 of the bytes with every in-zone token value
 *   replaced by a canonical placeholder (`<PATCH_ZONE>`). When the
 *   `patch_zone:` block is absent or malformed the two hashes are
 *   identical (legacy behavior).
 */
export function computeDesignMdHashes(text: string): {
  readonly majorHash: string;
  readonly patchHash: string;
} {
  const patchHash = sha256(text);
  const zoneResult = parseDesignMdPatchZone(text);
  if (!zoneResult.ok) {
    return { majorHash: patchHash, patchHash };
  }
  const canonical = canonicalizeForMajorHash(text, zoneResult.zone);
  const majorHash = sha256(canonical);
  return { majorHash, patchHash };
}

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/**
 * Rewrite the file text so every in-zone token value collapses to a
 * canonical placeholder. The patch_zone block itself is also collapsed
 * so that re-ordering token names inside the list (purely cosmetic)
 * does not bump `majorHash`. Removal of the block, however, leaves the
 * placeholder absent, which DOES bump `majorHash` (operator intent
 * differs from "tweak a token value").
 */
function canonicalizeForMajorHash(text: string, zone: PatchZone): string {
  let canonical = text;
  for (const token of zone.tokens) {
    canonical = replaceTokenValueWithPlaceholder(canonical, token);
  }
  return canonical;
}

/**
 * Replace the YAML scalar value for a dotted token path
 * (`visual.colors.accent`) with a literal placeholder string. Only the
 * VALUE bytes are changed; the key + indentation stay so removing the
 * key still trips majorHash via shape difference.
 *
 * Matches a line like `    accent: "#f59e0b"` under a parent block
 * `visual:` -> `colors:`. The walk is best-effort and intentionally
 * tolerant: tokens that do not resolve are silently skipped (their
 * value bytes simply remain part of majorHash).
 */
function replaceTokenValueWithPlaceholder(text: string, dottedKey: string): string {
  const segments = dottedKey.split(".");
  if (segments.length === 0) return text;
  // Build a regex that matches the leaf line under the right indent
  // path. We rely on the canonical 2-space indent convention used by
  // every DESIGN.md the QFAI samples ship. For non-conformant files we
  // simply leave the value bytes alone (best-effort).
  const leaf = segments[segments.length - 1];
  if (typeof leaf !== "string") return text;
  const parents = segments.slice(0, -1);
  // Locate the parent indent prefix.
  let cursor = 0;
  for (let i = 0; i < parents.length; i += 1) {
    const parent = parents[i];
    const indent = "  ".repeat(i);
    const re = new RegExp(`(^|\\n)${indent}${escapeRe(parent ?? "")}:[ \\t]*\\n`, "u");
    const m = re.exec(text.slice(cursor));
    if (!m) return text;
    cursor += m.index + m[0].length;
  }
  const leafIndent = "  ".repeat(parents.length);
  // Accept either a newline OR a start-of-segment anchor before the
  // leaf line. The parent-walk loop advances `cursor` past the
  // parent's `\n`, so when `leaf` is the FIRST scalar under its
  // parent (e.g. `visual.colors.primary` — first child of
  // `visual.colors:`), the segment beginning at `cursor` starts
  // directly with the leaf line WITHOUT a preceding newline. The
  // previous `(\\n${leafIndent}...)` form required a `\n` and
  // silently skipped the replacement for the first child, so an
  // explicitly in-zone token edit still bumped `majorHash` instead
  // of only `patchHash`. Group 1 captures the optional `\n` so we
  // preserve it verbatim; group 2 captures the indent+key+colon
  // prefix that survives the placeholder substitution.
  const leafRe = new RegExp(`(^|\\n)(${leafIndent}${escapeRe(leaf)}:[ \\t]*)([^\\n]*)`, "u");
  const after = text.slice(cursor);
  const leafMatch = leafRe.exec(after);
  if (!leafMatch) return text;
  const start = cursor + leafMatch.index;
  const leadingNewline = leafMatch[1] ?? "";
  const linePrefix = leafMatch[2] ?? "";
  return (
    text.slice(0, start) +
    leadingNewline +
    linePrefix +
    "<PATCH_ZONE>" +
    text.slice(start + leafMatch[0].length)
  );
}

function escapeRe(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

/**
 * Diff helper consumed by the reviewer-gate detector. Given the
 * `before` and `after` text plus the parsed `before` zone, return the
 * dotted token paths that DID change but were not declared as in-zone.
 *
 * The current implementation is a coarse YAML-line diff: any
 * `<dotted.path>:` line whose value bytes differ between `before` and
 * `after` is recorded as a candidate; we then filter out paths the
 * zone permits.
 */
export function findOutOfZoneTokenEdits(
  before: string,
  after: string,
  zone: PatchZone,
): readonly string[] {
  const beforeValues = collectScalarValues(before);
  const afterValues = collectScalarValues(after);
  const inZone = new Set(zone.tokens);
  const offending: string[] = [];
  // Detect changed scalars present on both sides.
  for (const [path, beforeValue] of beforeValues.entries()) {
    if (inZone.has(path)) continue;
    if (path === "__patch_zone_present__") continue;
    const afterValue = afterValues.get(path);
    if (afterValue === undefined) {
      offending.push(path);
      continue;
    }
    if (afterValue !== beforeValue) {
      offending.push(path);
    }
  }
  // Detect newly added keys.
  for (const path of afterValues.keys()) {
    if (inZone.has(path)) continue;
    if (path === "__patch_zone_present__") continue;
    if (!beforeValues.has(path)) {
      offending.push(path);
    }
  }
  return offending;
}

/**
 * Coarse front-matter scalar walk. Returns a map from dotted key path
 * (`visual.colors.accent`) to the raw value bytes. Lines whose value
 * is missing (block headers) are not recorded. Lists / arrays are
 * ignored (they roll up into the parent key shape via the canonical
 * `patchHash`).
 */
function collectScalarValues(text: string): Map<string, string> {
  const split = splitFrontMatter(text);
  if (!split.ok) return new Map();
  const map = new Map<string, string>();
  const stack: { indent: number; key: string }[] = [];
  const lines = split.yaml.split(/\r\n|\n|\r/);
  // Surface a marker entry so removal of the patch_zone block is
  // detectable downstream without re-parsing.
  if (/(^|\n)patch_zone:/.test(split.yaml)) {
    map.set("__patch_zone_present__", "yes");
  }
  for (const rawLine of lines) {
    if (rawLine.trim().length === 0) continue;
    if (rawLine.trim().startsWith("#")) continue;
    const indentMatch = /^( *)/.exec(rawLine);
    const indent = indentMatch ? (indentMatch[1]?.length ?? 0) : 0;
    while (stack.length > 0) {
      const top = stack[stack.length - 1];
      if (top !== undefined && top.indent >= indent) {
        stack.pop();
      } else {
        break;
      }
    }
    const trimmed = rawLine.slice(indent);
    if (trimmed.startsWith("- ")) continue;
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;
    const key = trimmed.slice(0, colonIdx).trim();
    if (key.length === 0) continue;
    const remainder = trimmed.slice(colonIdx + 1).trim();
    const dottedPrefix = stack.map((s) => s.key).join(".");
    const dotted = dottedPrefix === "" ? key : `${dottedPrefix}.${key}`;
    if (remainder.length === 0) {
      stack.push({ indent, key });
      continue;
    }
    map.set(dotted, remainder);
  }
  return map;
}
