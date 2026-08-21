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
import { mkdir, readFile, stat, writeFile, rename, unlink } from "node:fs/promises";
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
  /**
   * Allow overwriting an EXISTING canonical destination. Without it the
   * run is refused (the canonical handoff is a consumed SSOT, not
   * scratch output). With it, the prior file is renamed to
   * `<dest>.backup-<ISO>` before the new content lands.
   */
  force?: boolean;
  /**
   * Preview only: resolve the destination, report the field mapping and
   * whether `--force` would be required, and write nothing.
   */
  dryRun?: boolean;
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
 * True iff `p` exists. A non-ENOENT `stat` failure (EACCES / EPERM /
 * EBUSY) leaves existence undecidable, so we fail CLOSED and report
 * "exists": the caller then refuses the destructive write instead of
 * renaming over a file it could not inspect.
 */
async function destinationExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch (err: unknown) {
    return !isEnoent(err);
  }
}

/**
 * Repo-relative, posix-slashed rendering used by every operator-facing
 * message in this module.
 */
function toRelPosix(root: string, abs: string): string {
  return path.relative(root, abs).replace(/\\/g, "/");
}

/**
 * `--dry-run` preview. Reports the resolved destination, whether the
 * real run would be refused for want of `--force`, the canonical slots
 * that would be filled, and the legacy field count — then writes
 * nothing at all.
 */
function reportDryRun(args: {
  root: string;
  legacyAbs: string;
  destAbs: string;
  destExists: boolean;
  force: boolean;
  legacyFile: string;
  canonical: Record<string, string>;
  legacyFieldCount: number;
  write: (message: string) => void;
}): void {
  const destRel = toRelPosix(args.root, args.destAbs);
  const slots = Object.keys(args.canonical);
  args.write(`qfai handoff upgrade --dry-run: no changes written.`);
  args.write(`  legacy source: ${toRelPosix(args.root, args.legacyAbs)}`);
  args.write(`  destination:   ${destRel} (${args.destExists ? "exists" : "new"})`);
  args.write(`  canonical field(s): ${slots.length > 0 ? slots.join(", ") : "(none)"}`);
  args.write(`  legacy field(s) preserved under legacy:: ${args.legacyFieldCount}`);
  if (args.destExists && !args.force) {
    args.write(
      `  a real run would be REFUSED: ${destRel} already exists. ` +
        `Re-invoke with \`qfai handoff upgrade ${args.legacyFile} --force\` to overwrite ` +
        `(the existing file is backed up to ${destRel}.backup-<ISO> first).`,
    );
  } else if (args.destExists) {
    args.write(`  --force given: ${destRel} would be backed up to ${destRel}.backup-<ISO> first.`);
  }
}

/** Map recognized legacy fields onto the canonical schema slots. */
function buildCanonicalSlots(parsed: Record<string, unknown>): Record<string, string> {
  const canonical: Record<string, string> = {};
  for (const field of HANDOFF_MINIMUM_FIELDS) {
    const v = parsed[field];
    if (typeof v === "string" && v !== "") {
      canonical[field] = v;
    }
  }
  return canonical;
}

/**
 * Success-message suffix naming the raw-bytes preservation key. The
 * `__legacy_raw__` sentinel is an internal name, but the emitted YAML
 * carries it as a literal key under `legacy:` — so an operator who
 * opens `handoff.yaml` and finds a key they did not author can
 * correlate it back to the upgrade output instead of treating it as
 * junk to be hand-deleted. Empty when no fallback parse happened.
 */
function rawSentinelNote(parsed: Record<string, unknown>): string {
  return Object.prototype.hasOwnProperty.call(parsed, LEGACY_RAW_SENTINEL)
    ? ` (raw legacy text preserved verbatim under legacy.${LEGACY_RAW_SENTINEL}; do not hand-edit)`
    : "";
}

function describeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Best-effort staging cleanup; a failure here is never fatal. */
async function removeQuietly(p: string): Promise<void> {
  try {
    await unlink(p);
  } catch {
    // ignore cleanup failure
  }
}

/** Outcome of the staged write. `backupRel` names the file we preserved. */
type CommitResult = { ok: true; backupRel: string | null } | { ok: false; message: string };

/**
 * Stage → back up → rename. The prior canonical file (when one exists
 * and `--force` was given) is renamed to `<dest>.backup-<ISO>` BEFORE
 * the staged content lands, so an operator's hand-curated handoff is
 * always recoverable from disk rather than only from git. Every failure
 * path fails closed: the staged file is removed and, if the backup
 * rename already happened, it is restored over the destination.
 */
async function commitCanonicalWrite(args: {
  root: string;
  destAbs: string;
  destExists: boolean;
  yaml: string;
}): Promise<CommitResult> {
  const stagedPath = `${args.destAbs}.tmp`;
  try {
    await mkdir(path.dirname(args.destAbs), { recursive: true });
    await writeFile(stagedPath, `${args.yaml}\n`, "utf-8");
  } catch (err: unknown) {
    await removeQuietly(stagedPath);
    return { ok: false, message: describeError(err) };
  }
  let backupAbs: string | null = null;
  if (args.destExists) {
    const candidate = `${args.destAbs}.backup-${new Date().toISOString().replace(/[:.]/g, "-")}`;
    try {
      await rename(args.destAbs, candidate);
      backupAbs = candidate;
    } catch (err: unknown) {
      await removeQuietly(stagedPath);
      return {
        ok: false,
        message: `could not back up the existing canonical handoff (${describeError(err)}); nothing was overwritten`,
      };
    }
  }
  try {
    await rename(stagedPath, args.destAbs);
  } catch (err: unknown) {
    await removeQuietly(stagedPath);
    if (backupAbs !== null) {
      // Put the operator's file back where it was.
      await rename(backupAbs, args.destAbs).catch(() => undefined);
    }
    return { ok: false, message: describeError(err) };
  }
  return { ok: true, backupRel: backupAbs === null ? null : toRelPosix(args.root, backupAbs) };
}

/**
 * Run the upgrade. Two-stage write: stage to a `.tmp` sibling via
 * `writeFile`, then `rename` over the canonical destination — POSIX
 * rename within the same directory is atomic at the directory-entry
 * level, so readers either see the old file or the new file (never a
 * partial write). Note this does NOT include an explicit `fsync` —
 * `writeFile` closes its file descriptor but does not flush the page
 * cache, so a power-loss between the `writeFile` return and the
 * `rename` could lose the staged content. The current contract is
 * "no torn writes visible to readers", not "durable across power
 * loss"; upgrade callers retry from the legacy source if the
 * canonical write is lost. If parsing fails (or the legacy file is
 * unreadable), no write to the canonical file is performed.
 *
 * Atomicity is not overwrite protection: an EXISTING canonical
 * destination is refused unless `force` is set (exit 1, naming the path
 * and the `--force` recovery hint), and even under `force` the prior
 * file is preserved as `<dest>.backup-<ISO>`. `dryRun` reports the
 * resolved destination and field mapping and mutates nothing.
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
  const canonical = buildCanonicalSlots(parsed);
  // Count only OPERATOR-visible legacy keys: the sentinel is excluded
  // so a fallback-only payload reads "preserved 0 legacy field(s)".
  const visibleKeys = Object.keys(parsed).filter((k) => k !== LEGACY_RAW_SENTINEL);
  const rawNote = rawSentinelNote(parsed);
  const destRel = toRelPosix(options.root, destAbs);
  const force = options.force === true;
  const destExists = await destinationExists(destAbs);
  // `--dry-run` reports and returns BEFORE any filesystem mutation —
  // the destructive path must never run under a preview flag.
  if (options.dryRun === true) {
    reportDryRun({
      root: options.root,
      legacyAbs,
      destAbs,
      destExists,
      force,
      legacyFile: options.legacyFile,
      canonical,
      legacyFieldCount: visibleKeys.length,
      write,
    });
    return 0;
  }
  // Overwrite guard. `.qfai/handoff.yaml` is a consumed SSOT, so a
  // second `upgrade` (or one pointed at a stale legacy file) must not
  // silently replace a hand-curated canonical file. Refuse, naming the
  // existing path and the recovery hint.
  if (destExists && !force) {
    writeErr(
      `qfai handoff upgrade: ${destRel} already exists. Overwriting it would discard the ` +
        `current canonical handoff. Re-invoke with \`qfai handoff upgrade ${options.legacyFile} --force\` ` +
        `to back it up to ${destRel}.backup-<ISO> and overwrite, or delete the file manually ` +
        `if it is no longer needed.`,
    );
    return 1;
  }
  const commit = await commitCanonicalWrite({
    root: options.root,
    destAbs,
    destExists,
    yaml: toYaml(canonical, parsed),
  });
  if (!commit.ok) {
    writeErr(`qfai handoff upgrade: failed to write canonical handoff: ${commit.message}`);
    return 1;
  }
  const backupNote =
    commit.backupRel === null ? "" : ` Previous file backed up to ${commit.backupRel}.`;
  write(
    `qfai handoff upgrade: wrote ${destRel} ` +
      `(preserved ${visibleKeys.length} legacy field(s) under legacy:${rawNote}).${backupNote}`,
  );
  return 0;
}
