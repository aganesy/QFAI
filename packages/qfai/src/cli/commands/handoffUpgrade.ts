/**
 * `qfai handoff upgrade <legacy-file>` — convert a legacy ad-hoc
 * handoff file (e.g. `session-handoff.yaml`) into a conforming
 * canonical `.qfai/handoff.yaml` (CLI-HANDOFF schema).
 *
 * AC-0015-0020: recognized fields map to schema-defined slots; ALL
 * original fields are preserved under a `legacy:` key so no data is
 * lost. Malformed / unreadable input fails with a clear error AND
 * does NOT overwrite or partially emit the canonical destination.
 *
 * The canonical destination lives at `.qfai/handoff.yaml` — consistent
 * with the `.qfai/` SSOT pattern used by sibling artifacts
 * (`.qfai/state.json`, `.qfai/evidence/...`, `.qfai/contracts/...`)
 * AND with the saas-package profile reader at
 * `core/saasPackage/profile.ts#HANDOFF_REL`. The directory is created
 * if absent so a clean project can run `qfai handoff upgrade` without
 * a preparatory `mkdir`.
 */
import { mkdir, readFile, writeFile, rename, unlink } from "node:fs/promises";
import path from "node:path";

import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

import { isEnoent } from "../../core/fs/errno.js";
import { HANDOFF_MINIMUM_FIELDS } from "../../core/schemas/handoff.js";
import { error as logError, info as logInfo } from "../lib/logger.js";

/**
 * Sentinel key under which the raw legacy text is captured when the
 * legacy payload cannot be parsed into a plain object (regex fallback
 * case OR YAML returned a non-object like a list / scalar). Preserves
 * the AC-0015-0020 contract — "ALL original fields preserved under
 * `legacy:` so no data is lost" — by ensuring callers can always
 * recover the original bytes even when structural keys were not
 * extractable.
 */
const LEGACY_RAW_SENTINEL = "__legacy_raw__";

const CANONICAL_HANDOFF_REL = ".qfai/handoff.yaml";

export type HandoffUpgradeOptions = {
  /** Working directory (canonical destination resolved relative to this). */
  root: string;
  /** Path to the legacy file (absolute, or relative to root). */
  legacyFile: string;
  /** Optional override for the canonical destination path. */
  destinationPath?: string;
  /** Output sink. Defaults to console.log. */
  write?: (message: string) => void;
  /** Error sink. Defaults to console.error. */
  writeErr?: (message: string) => void;
};

/**
 * Test whether a parsed value is a plain object suitable for use as the
 * legacy payload structure (i.e. `Record<string, unknown>` — not null,
 * not an array, not a primitive). Used to gate JSON / YAML parse results
 * before treating them as a structured legacy body.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Minimal column-0 `key: value` regex fallback. Used when neither JSON
 * nor YAML parsing yields a plain object. Captures scalar fields only;
 * nested / multi-line YAML is silently dropped by this branch (preserved
 * via the `__legacy_raw__` sentinel by the caller).
 */
function scanLegacyKeyValueLines(text: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (/^\s*#/.test(line)) continue;
    const m = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line);
    if (!m?.[1]) continue;
    const key = m[1];
    const rawValue = (m[2] ?? "").trim();
    if (rawValue === "") continue;
    const unquoted = /^(["'])(.*)\1$/.exec(rawValue);
    result[key] = unquoted ? (unquoted[2] ?? "") : rawValue;
  }
  return result;
}

/**
 * YAML-or-JSON parser for the legacy handoff body. The legacy format is
 * intentionally heterogeneous (skills wrote ad-hoc YAML + JSON
 * variations); we honor AC-0015-0020 ("ALL original fields preserved
 * under `legacy:` so no data is lost") with a three-stage strategy:
 *
 *   1. Try JSON first — deterministic; lossless when input happens to
 *      be a JSON object.
 *   2. Otherwise parse as YAML via the `yaml` package. If parsing
 *      succeeds and produces a plain object, return it as-is — this
 *      preserves nested structures (e.g. `signature: { by, on }`) that
 *      the legacy regex scanner silently dropped.
 *   3. If YAML parsing fails OR produces a non-object (list, scalar,
 *      null), fall back to the column-0 `key: value` regex scan AND
 *      attach the raw text under the `__legacy_raw__` sentinel so the
 *      original bytes are recoverable.
 *
 * Returns `null` only when the legacy file is empty / whitespace-only;
 * any other input produces a non-empty record so the caller can write
 * a canonical handoff.yaml.
 */
function parseLegacyBody(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  // Stage 1: JSON (lossless when applicable).
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (isPlainObject(parsed)) {
      return parsed;
    }
  } catch {
    // fall through to YAML
  }
  // Stage 2: YAML via the `yaml` package. Nested structures
  // (mappings under a key) are preserved verbatim by the parser.
  let yamlParsed: unknown;
  let yamlOk = false;
  try {
    yamlParsed = parseYaml(text);
    yamlOk = true;
  } catch {
    yamlOk = false;
  }
  if (yamlOk && isPlainObject(yamlParsed)) {
    return yamlParsed;
  }
  // Stage 3: regex fallback + raw-text preservation. Either YAML
  // parsing failed entirely, or it yielded a non-object (list /
  // scalar / null) that does not fit the legacy-keyed schema. Run the
  // legacy scalar scan and ALWAYS attach the raw text under the
  // sentinel key so callers can recover the original bytes.
  //
  // AC-0015-0020 demands "ALL original fields preserved under
  // `legacy:` so no data is lost"; when neither JSON nor YAML
  // produces a structured object AND no regex keys are extractable
  // we still emit `{__legacy_raw__: <text>}` so the operator's
  // bytes survive the upgrade rather than being silently rejected.
  // The whitespace-only / empty case is rejected ABOVE (the
  // `trimmed === ""` early return) — there is nothing to preserve.
  const scanned = scanLegacyKeyValueLines(text);
  scanned[LEGACY_RAW_SENTINEL] = text;
  return scanned;
}

/**
 * Emit YAML for the canonical handoff output. Canonical schema slots
 * (all strings) are emitted with explicit JSON-quoted values so the
 * shape stays predictable for downstream readers. The `legacy:` block
 * is serialized via the `yaml` package's `stringify` so nested
 * structures (e.g. `signature: { by, on }`) round-trip as proper
 * indented YAML — guaranteeing AC-0015-0020's "no data is lost"
 * contract even when the legacy body carried nested fields that the
 * pre-fix regex scanner would have silently dropped.
 */
function toYaml(canonical: Record<string, string>, legacy: Record<string, unknown>): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(canonical)) {
    lines.push(`${key}: ${JSON.stringify(value)}`);
  }
  // Render the legacy block via the YAML library so nested mappings,
  // sequences, and scalar types round-trip faithfully. Indent each
  // produced line by two spaces under the `legacy:` key.
  const legacyYaml = stringifyYaml(legacy).trimEnd();
  if (legacyYaml.length === 0) {
    lines.push("legacy: {}");
  } else {
    lines.push("legacy:");
    for (const line of legacyYaml.split(/\r?\n/)) {
      lines.push(line.length > 0 ? `  ${line}` : "");
    }
  }
  return lines.join("\n");
}

/**
 * Run the upgrade. Atomic write: stage to a `.tmp` sibling, fsync /
 * close, then `rename` over the canonical destination. If parsing
 * fails (or the legacy file is unreadable), no write to the canonical
 * file is performed.
 */
export async function runHandoffUpgrade(options: HandoffUpgradeOptions): Promise<number> {
  const write = options.write ?? logInfo;
  const writeErr = options.writeErr ?? logError;
  const legacyAbs = path.isAbsolute(options.legacyFile)
    ? options.legacyFile
    : path.resolve(options.root, options.legacyFile);
  const destAbs = options.destinationPath
    ? path.isAbsolute(options.destinationPath)
      ? options.destinationPath
      : path.resolve(options.root, options.destinationPath)
    : path.resolve(options.root, CANONICAL_HANDOFF_REL);
  // Read legacy.
  let raw: string;
  try {
    raw = await readFile(legacyAbs, "utf-8");
  } catch (err: unknown) {
    if (isEnoent(err)) {
      writeErr(`qfai handoff upgrade: legacy file not found: ${legacyAbs}`);
      return 1;
    }
    const message = err instanceof Error ? err.message : String(err);
    writeErr(`qfai handoff upgrade: unreadable legacy file: ${message}`);
    return 1;
  }
  const parsed = parseLegacyBody(raw);
  if (parsed === null) {
    writeErr(
      `qfai handoff upgrade: malformed legacy input (no recognizable key/value pairs): ${legacyAbs}`,
    );
    return 1;
  }
  // Build canonical slot mapping + preserve originals under `legacy:`.
  const canonical: Record<string, string> = {};
  for (const field of HANDOFF_MINIMUM_FIELDS) {
    const v = parsed[field];
    if (typeof v === "string" && v !== "") {
      canonical[field] = v;
    }
  }
  const yaml = toYaml(canonical, parsed);
  // Atomic write: stage to a sibling temp file, then rename. On any
  // mid-write failure we attempt to remove the temp file so the
  // canonical destination is left untouched. The parent directory
  // (`.qfai/` on default-canonical resolution) is created up-front so
  // a clean project can run upgrade without a preparatory `mkdir`.
  const stagedPath = `${destAbs}.tmp`;
  try {
    await mkdir(path.dirname(destAbs), { recursive: true });
    await writeFile(stagedPath, `${yaml}\n`, "utf-8");
    await rename(stagedPath, destAbs);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    writeErr(`qfai handoff upgrade: failed to write canonical handoff: ${message}`);
    try {
      await unlink(stagedPath);
    } catch {
      // ignore cleanup failure
    }
    return 1;
  }
  write(
    `qfai handoff upgrade: wrote ${path.relative(options.root, destAbs).replace(/\\/g, "/")} ` +
      `(preserved ${Object.keys(parsed).length} legacy field(s) under legacy:).`,
  );
  return 0;
}
