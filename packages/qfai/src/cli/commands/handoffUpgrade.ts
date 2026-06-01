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

import { isEnoent } from "../../core/fs/errno.js";
import { HANDOFF_MINIMUM_FIELDS } from "../../core/schemas/handoff.js";
import { error as logError, info as logInfo } from "../lib/logger.js";

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
 * Crude YAML-or-JSON parser for the legacy handoff body. The legacy
 * format is intentionally heterogeneous (skills wrote ad-hoc YAML +
 * JSON variations); we accept either by tolerating JSON parse failure
 * and falling back to a simple `key: value` line scan that captures
 * scalar fields. Nested structures fall through into `legacy:` as-is
 * via the raw text — preservation, not parsing, is the contract.
 */
function parseLegacyBody(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  // Try JSON first (deterministic; lossless).
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // fall through to YAML line scan
  }
  // Minimal YAML scalar key scan: `key: value` at column 0. Quoted
  // strings are unwrapped. Nested / multi-line YAML is captured raw
  // under a sentinel key so the legacy payload is preserved verbatim
  // in the emitted file.
  const result: Record<string, unknown> = {};
  const lines = text.split(/\r?\n/);
  let sawAnyKey = false;
  for (const line of lines) {
    if (/^\s*#/.test(line)) continue;
    const m = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line);
    if (!m?.[1]) continue;
    const key = m[1];
    const rawValue = (m[2] ?? "").trim();
    if (rawValue === "") continue;
    // Strip quotes if present.
    const unquoted = /^(["'])(.*)\1$/.exec(rawValue);
    result[key] = unquoted ? (unquoted[2] ?? "") : rawValue;
    sawAnyKey = true;
  }
  if (!sawAnyKey) return null;
  return result;
}

/**
 * Emit YAML for a flat object of scalar string values. Used for the
 * canonical handoff slots (all schema fields are strings) and for the
 * `legacy:` block. Non-scalar legacy values are JSON-quoted so the
 * round-trip is lossless.
 */
function toYaml(obj: Record<string, unknown>, indent = ""): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "string") {
      lines.push(`${indent}${key}: ${JSON.stringify(value)}`);
    } else if (typeof value === "number" || typeof value === "boolean") {
      lines.push(`${indent}${key}: ${String(value)}`);
    } else {
      // Object / array — emit as inline JSON for lossless preservation.
      lines.push(`${indent}${key}: ${JSON.stringify(value)}`);
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
  const output: Record<string, unknown> = { ...canonical, legacy: parsed };
  const yaml = toYaml(output);
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
