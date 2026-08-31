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
import { randomBytes } from "node:crypto";
import {
  constants as fsConstants,
  copyFile,
  link,
  lstat,
  mkdir,
  readFile,
  readlink,
  rename,
  rmdir,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import type { Stats } from "node:fs";

import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

import { hasErrnoCode, isEnoent } from "../../core/fs/errno.js";
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
   * scratch output). With it, the prior file is copied to
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
 * True iff a directory entry exists at `p`. `lstat` (not `stat`) is
 * deliberate: a canonical handoff that is a symlink whose target is
 * temporarily missing is still an entry the operator placed on purpose
 * — `stat` would follow it, report ENOENT, and let a non-`--force` run
 * replace the link and sever the connection to the external handoff.
 *
 * A non-ENOENT failure (EACCES / EPERM / EBUSY) leaves existence
 * undecidable, so we fail CLOSED and report "exists": the caller then
 * refuses the destructive write instead of renaming over a file it
 * could not inspect.
 */
async function destinationExists(p: string): Promise<boolean> {
  try {
    await lstat(p);
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
 * Quote a path for the copy-pasteable command hints. Plain paths are
 * emitted bare; anything carrying shell-significant characters (spaces
 * above all) is double-quoted with the inner specials escaped.
 *
 * A backslash is deliberately NOT in the bare-safe set. A POSIX shell
 * consumes an unquoted `\` as an escape character, so a root or legacy
 * filename containing one would be silently rewritten by the paste —
 * selecting a different legacy file or a different project root and
 * force-overwriting a canonical handoff the operator never named.
 * Windows paths therefore render quoted with doubled separators, which
 * every consumer of this hint resolves identically.
 */
function quoteArg(value: string): string {
  return /^[A-Za-z0-9._:@/-]+$/.test(value) ? value : `"${value.replace(/(["\\$`])/g, "\\$1")}"`;
}

/**
 * The re-run hint printed by the refusal and by `--dry-run`. The
 * RESOLVED root is always included: the command may have been invoked
 * from another directory (`--root /path/to/project`, or a config root
 * discovered above the cwd), and a hint that omitted it would resolve
 * the legacy source and the destination against whatever the reader's
 * cwd happens to be — up to and including a different project's
 * canonical handoff.
 *
 * `path.resolve` is what makes that guarantee hold. An EXPLICIT
 * `--root` is handed through verbatim by the CLI (`main.ts`'s
 * `resolveRoot` returns it unchanged when it was given on the command
 * line), so a relative `--root ../project` would otherwise survive into
 * the hint — and re-running that pasted command from a different
 * working directory would resolve `../project` onto someone else's
 * tree and `--force` a canonical handoff the operator never named. The
 * legacy path stays as typed: it is resolved against the root, so an
 * absolute root already pins it.
 */
function forceHint(root: string, legacyFile: string): string {
  return `qfai handoff upgrade ${quoteArg(legacyFile)} --root ${quoteArg(path.resolve(root))} --force`;
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
        `Re-invoke with \`${forceHint(args.root, args.legacyFile)}\` to overwrite ` +
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

/** True iff `err` is a Node fs error reporting an already-existing target. */
function isEexist(err: unknown): boolean {
  return hasErrnoCode(err) && err.code === "EEXIST";
}

/**
 * What the current canonical entry IS, and therefore what a faithful
 * backup of it has to reproduce. A symlink is preserved as a symlink, a
 * regular file by copying its bytes — and nothing else can be preserved
 * at all.
 */
type BackupableSource = { kind: "file" } | { kind: "symlink"; target: string };

/** A classified entry, including the kinds this command refuses to touch. */
type BackupSource = BackupableSource | { kind: "unsupported"; what: string };

/**
 * Operator-facing name for a directory entry that is neither a regular
 * file nor a symlink. Used only to explain the refusal.
 */
function describeEntryKind(stats: Stats): string {
  if (stats.isDirectory()) return "a directory";
  if (stats.isFIFO()) return "a FIFO (named pipe)";
  if (stats.isSocket()) return "a socket";
  if (stats.isCharacterDevice()) return "a character device";
  if (stats.isBlockDevice()) return "a block device";
  return "not a regular file";
}

/**
 * Classify the canonical entry with `lstat` (never `stat`) — `null`
 * when nothing is there.
 *
 * The existence probe already treats a symlink as a directory entry the
 * operator placed on purpose; the backup has to honour the same reading.
 * `copyFile` follows the link, so copying would preserve the TARGET's
 * bytes as a regular file and lose the connection to the external
 * handoff, and a dangling link would fail with `ENOENT` and be dropped
 * with no backup at all. Reading the link here lets the backup recreate
 * the entry itself, dangling or not.
 *
 * Everything that is neither is reported as `unsupported` rather than
 * assumed to be a regular file. `copyFile` opens its source, and on a
 * FIFO that `open` BLOCKS until some other process opens the write end
 * — with no writer, a `--force` run simply never returns. A directory,
 * a socket and a device node cannot be reproduced by a byte copy
 * either. The caller refuses these outright, which also keeps the
 * `rename` that would have replaced such an entry from ever running.
 */
async function classifyDestination(destAbs: string): Promise<BackupSource | null> {
  try {
    const stats = await lstat(destAbs);
    if (stats.isSymbolicLink()) return { kind: "symlink", target: await readlink(destAbs) };
    if (stats.isFile()) return { kind: "file" };
    return { kind: "unsupported", what: describeEntryKind(stats) };
  } catch (err: unknown) {
    if (isEnoent(err)) return null;
    throw err;
  }
}

/**
 * Reproduce `source` at `candidate`, which must not already exist.
 * Both primitives are exclusive: `COPYFILE_EXCL` opens with `O_EXCL`
 * and `symlink` fails with `EEXIST` rather than replacing an entry.
 */
async function reproduceAt(
  destAbs: string,
  candidate: string,
  source: BackupableSource,
): Promise<void> {
  if (source.kind === "symlink") {
    await symlink(source.target, candidate, "file");
    return;
  }
  await copyFile(destAbs, candidate, fsConstants.COPYFILE_EXCL);
}

/**
 * Copy the current canonical handoff to an EXCLUSIVELY reserved backup
 * name and return that name — or `null` when there was nothing to copy.
 *
 * The destination is *copied*, never moved: the canonical path keeps a
 * readable file for the whole operation, so a concurrent reader (e.g.
 * `qfai validate`) never observes ENOENT and a crash mid-upgrade cannot
 * leave the canonical path missing. The final `rename` then replaces it
 * atomically.
 *
 * `COPYFILE_EXCL` makes the name reservation itself exclusive (the
 * underlying `open` carries `O_EXCL`), and a taken name is retried with
 * a `-N` discriminator: two `--force` runs landing in the same
 * millisecond pick the same ISO stamp, and a plain copy would let the
 * second silently destroy the first run's backup — the oldest canonical
 * handoff, unrecoverable.
 *
 * A symlink destination is preserved AS a symlink to the same target,
 * so the `rename` that follows — which replaces the link with a regular
 * file — stays undoable: restoring the backup restores the connection
 * to the external handoff. A dangling link is preserved the same way,
 * where a byte copy could only have failed.
 *
 * A vanished entry (`ENOENT`) means there is nothing left to preserve,
 * so the caller proceeds with no backup rather than failing an
 * explicitly forced run.
 *
 * An entry that is neither a regular file nor a symlink throws instead:
 * it cannot be reproduced, so replacing it would be an unbacked
 * destruction — and reading one can be worse than useless (a `copyFile`
 * whose source is a FIFO blocks in `open` until a writer appears, so a
 * `--force` run against one would hang rather than fail).
 */
async function backupExclusively(destAbs: string): Promise<string | null> {
  const source = await classifyDestination(destAbs);
  if (source === null) return null;
  if (source.kind === "unsupported") {
    throw new Error(
      `${destAbs} is ${source.what}; only a regular file or a symlink can be backed up and replaced`,
    );
  }
  const base = `${destAbs}.backup-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt}`;
    try {
      await reproduceAt(destAbs, candidate, source);
      return candidate;
    } catch (err: unknown) {
      if (isEnoent(err) && source.kind === "file") return null;
      if (!isEexist(err)) throw err;
    }
  }
  throw new Error(`could not reserve an unused backup name near ${base}`);
}

/**
 * Fingerprint of the canonical entry, used to tell "the version we hold"
 * from "a version somebody else wrote since". `null` means no entry.
 * `lstat` again, so replacing a symlink with a regular file of the same
 * size counts as a change.
 */
type DestStamp = { ino: number; size: number; mtimeMs: number; symlink: boolean };

async function stampDestination(destAbs: string): Promise<DestStamp | null> {
  try {
    const stats = await lstat(destAbs);
    return {
      ino: stats.ino,
      size: stats.size,
      mtimeMs: stats.mtimeMs,
      symlink: stats.isSymbolicLink(),
    };
  } catch (err: unknown) {
    if (isEnoent(err)) return null;
    throw err;
  }
}

function sameStamp(a: DestStamp | null, b: DestStamp | null): boolean {
  if (a === null || b === null) return a === b;
  return a.ino === b.ino && a.size === b.size && a.mtimeMs === b.mtimeMs && a.symlink === b.symlink;
}

/**
 * True iff the entry at `destAbs` is still the one `stamp` describes.
 * Used on paths that are about to destroy an entry, so an undecidable
 * answer (a stat that fails for any reason other than "absent") counts
 * as "not ours" — the caller then leaves the entry alone.
 */
async function stillHolds(destAbs: string, stamp: DestStamp | null): Promise<boolean> {
  try {
    return sameStamp(stamp, await stampDestination(destAbs));
  } catch {
    return false;
  }
}

/**
 * Fallback placement for filesystems that reject hard links (FAT, some
 * network mounts). The name is RESERVED with an empty `wx` (`O_EXCL`)
 * create, which is still EXCLUSIVE — an entry that appeared after the
 * probe yields `EEXIST` and is reported, never overwritten — and the
 * already-complete staged file is then published over that reservation
 * with one `rename`.
 *
 * Reservation and publication are deliberately separate steps. Writing
 * the canonical payload straight into the destination would put a
 * partially written `.qfai/handoff.yaml` on disk the moment the write
 * ran out of space or hit an I/O error mid-stream, and would expose the
 * half-written bytes to a concurrent reader. Both guarantees this
 * command makes — never publish anything but a finished file, never
 * leave a partial canonical output behind on failure — survive here
 * because the reservation carries no content and is removed again if
 * the publish fails.
 *
 * The publishing `rename` replaces its target unconditionally, and no
 * filesystem offers a compare-and-swap rename, so the reservation is
 * held for the whole sequence by the caller's canonical-path lock
 * (`withCanonicalLock`): another run of this command cannot reach its
 * own backup-and-replace between the check below and the `rename`,
 * which is the only way a FINISHED canonical handoff could have been
 * destroyed here with nothing but an empty placeholder in its backup.
 *
 * The fingerprint re-check that follows covers what a lock cannot: a
 * writer that never takes it. A run that no longer holds its own
 * reservation reports `exists` and leaves that file alone. The same
 * check gates the failure cleanup, so a rename that dies never deletes
 * someone else's file.
 *
 * What no filesystem without hard links can offer is an atomic
 * no-replace placement of a FINISHED file, so between the reservation
 * and the publish there is a window in which a reader sees an empty
 * `.qfai/handoff.yaml` where a moment earlier there was none. That
 * window is inherent to this fallback (a direct payload write has the
 * same window and adds a torn one), and it exists only on the
 * fresh-placement path — no prior canonical handoff is at risk.
 */
async function createExclusively(
  destAbs: string,
  stagedPath: string,
): Promise<"placed" | "exists"> {
  try {
    await writeFile(destAbs, "", { encoding: "utf-8", flag: "wx" });
  } catch (err: unknown) {
    if (isEexist(err)) return "exists";
    throw err;
  }
  let reserved: DestStamp | null;
  try {
    reserved = await stampDestination(destAbs);
  } catch (err: unknown) {
    await removeQuietly(destAbs);
    throw err;
  }
  // Someone finished a canonical handoff over our placeholder: treat it
  // exactly like an entry that beat us to the name.
  if (!(await stillHolds(destAbs, reserved))) return "exists";
  try {
    await rename(stagedPath, destAbs);
  } catch (err: unknown) {
    // Only ever remove our own empty reservation — that leaves the
    // destination exactly as the probe found it, absent.
    if (await stillHolds(destAbs, reserved)) await removeQuietly(destAbs);
    throw err;
  }
  return "placed";
}

/**
 * Place the staged file at `destAbs` without ever replacing an entry
 * that appeared after the existence probe.
 *
 * `link` is the exclusive primitive here: it fails with `EEXIST` rather
 * than clobbering, so the probe-then-place window cannot silently
 * destroy a canonical handoff another process created in the meantime.
 * A `link` failure that is NOT `EEXIST` means hard links are
 * unavailable, not that the destination is taken — so it degrades to
 * `createExclusively`, never to `rename`. `rename` replaces its target
 * unconditionally: on a link-hostile filesystem it would hand back the
 * exact clobber-without-backup this function exists to prevent.
 */
async function placeExclusively(stagedPath: string, destAbs: string): Promise<"placed" | "exists"> {
  try {
    await link(stagedPath, destAbs);
  } catch (err: unknown) {
    if (isEexist(err)) return "exists";
    return createExclusively(destAbs, stagedPath);
  }
  await removeQuietly(stagedPath);
  return "placed";
}

/**
 * Placement when the probe found NO destination. The existence check
 * and the placement are one exclusive operation, so a canonical handoff
 * created by another process in between is refused here rather than
 * overwritten without a backup.
 */
async function commitFresh(
  root: string,
  destAbs: string,
  stagedPath: string,
): Promise<CommitResult> {
  try {
    if ((await placeExclusively(stagedPath, destAbs)) === "exists") {
      await removeQuietly(stagedPath);
      return {
        ok: false,
        message:
          `${toRelPosix(root, destAbs)} was created while this upgrade was running; ` +
          `nothing was overwritten. Re-run with --force to replace it.`,
      };
    }
  } catch (err: unknown) {
    await removeQuietly(stagedPath);
    return { ok: false, message: describeError(err) };
  }
  return { ok: true, backupRel: null };
}

/**
 * Placement under `--force`: reserve a backup name and COPY the prior
 * file into it, then replace the destination with one atomic `rename`.
 *
 * The destination is fingerprinted before the copy and re-checked
 * immediately before the `rename`. `rename` replaces its target
 * unconditionally, so without that re-check a canonical handoff written
 * by another process while this run was copying would be destroyed with
 * only the PRE-copy version in the backup — the very version the
 * operator lost would exist nowhere. A changed fingerprint therefore
 * aborts the replacement and removes the now-misleading backup. (Another
 * run of this command cannot land there at all — the caller holds the
 * canonical-path lock across the whole sequence. The re-check covers
 * writers that do not take that lock, and for those it narrows the
 * window rather than closing it: one landing between the re-check and
 * the `rename`, or rewriting the file inside a single mtime tick
 * without changing its size or inode, is still indistinguishable from
 * no writer at all.)
 */
async function commitOverExisting(
  root: string,
  destAbs: string,
  stagedPath: string,
): Promise<CommitResult> {
  let backupAbs: string | null;
  let before: DestStamp | null;
  try {
    before = await stampDestination(destAbs);
    backupAbs = await backupExclusively(destAbs);
  } catch (err: unknown) {
    await removeQuietly(stagedPath);
    return {
      ok: false,
      message: `could not back up the existing canonical handoff (${describeError(err)}); nothing was overwritten`,
    };
  }
  try {
    if (!sameStamp(before, await stampDestination(destAbs))) {
      await removeQuietly(stagedPath);
      if (backupAbs !== null) await removeQuietly(backupAbs);
      return {
        ok: false,
        message:
          `${toRelPosix(root, destAbs)} was updated by another process while this upgrade was ` +
          `backing it up; nothing was overwritten. Re-run once that write has settled.`,
      };
    }
    await rename(stagedPath, destAbs);
  } catch (err: unknown) {
    await removeQuietly(stagedPath);
    // The destination was copied, not moved, so it still holds the
    // operator's bytes — the backup copy is redundant noise.
    if (backupAbs !== null) await removeQuietly(backupAbs);
    return { ok: false, message: describeError(err) };
  }
  return { ok: true, backupRel: backupAbs === null ? null : toRelPosix(root, backupAbs) };
}

/**
 * Write the staged bytes to a sibling name reserved EXCLUSIVELY for
 * this run, and return that name.
 *
 * The name carries per-run entropy and is opened with `wx` (`O_EXCL`),
 * so a staging file left behind by an interrupted run is never reopened.
 * With a fixed `<dest>.tmp` it would be: after a successful fresh
 * placement the staging entry is a HARD LINK to the canonical handoff
 * itself, and a run that crashed before its cleanup leaves that link on
 * disk. The next `--force` run would then truncate the canonical file
 * through the staging name *before* `backupExclusively` copies it — so
 * the backup would capture the new content and the operator's bytes
 * would be gone from both paths.
 */
async function stageExclusively(destAbs: string, body: string): Promise<string> {
  const base = `${destAbs}.tmp-`;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidate = `${base}${randomBytes(6).toString("hex")}`;
    try {
      await writeFile(candidate, body, { encoding: "utf-8", flag: "wx" });
      return candidate;
    } catch (err: unknown) {
      // `wx` CREATES before it writes, so a write that dies partway
      // (ENOSPC, an I/O error) leaves a truncated staging sibling whose
      // name never escapes this function — nothing downstream could
      // ever clean it, and every retry would add another. Remove the
      // candidate we made before letting the failure out.
      if (!isEexist(err)) {
        await removeQuietly(candidate);
        throw err;
      }
    }
  }
  throw new Error(`could not reserve an unused staging name near ${base}`);
}

/**
 * Retry budget for the canonical-path lock — roughly a second, sampled
 * every 25ms. A real commit holds the lock for a handful of
 * milliseconds (one small staged write, one copy, one rename), so a
 * wait this long means the holder is wedged or gone, not merely slow.
 */
const LOCK_ATTEMPTS = 40;
const LOCK_RETRY_MS = 25;

/**
 * Take the canonical-path lock. `false` means another run held it for
 * the whole retry budget.
 *
 * `mkdir` is the exclusive-create primitive that survives every
 * filesystem this command has to run on: hard links are refused by FAT
 * and by some network mounts, but creating a directory is an atomic
 * create-or-`EEXIST` everywhere. It is called WITHOUT `recursive` on
 * purpose — `recursive: true` succeeds on an existing directory and
 * would hand every caller the same "lock".
 */
async function acquireCanonicalLock(lockAbs: string): Promise<boolean> {
  for (let attempt = 0; attempt < LOCK_ATTEMPTS; attempt += 1) {
    if (attempt > 0) await delay(LOCK_RETRY_MS);
    try {
      await mkdir(lockAbs);
      return true;
    } catch (err: unknown) {
      if (!isEexist(err)) throw err;
    }
  }
  return false;
}

/** Best-effort lock release; a failure here is never fatal. */
async function releaseQuietly(lockAbs: string): Promise<void> {
  try {
    await rmdir(lockAbs);
  } catch {
    // ignore release failure
  }
}

/**
 * Run `body` while holding the canonical-path lock, which serializes
 * every mutation this command makes to `destAbs` against other runs of
 * it.
 *
 * The lock is what turns the individual exclusive steps into one
 * exclusive operation. Reserving a name and publishing over it are
 * necessarily separate syscalls — `link` is unavailable on the
 * filesystems that need the fallback, and no filesystem offers a
 * rename that refuses to replace — so between them a second run could
 * otherwise back up a bare reservation, complete a real canonical
 * handoff over it, and have that finished handoff destroyed by the
 * first run's `rename`, its backup holding nothing. Holding the lock
 * across stage → back up → publish closes that window for participants.
 *
 * It is advisory and bounded, not a guarantee against every writer: a
 * process that writes `.qfai/handoff.yaml` without taking it is still
 * only covered by the fingerprint re-checks on the commit paths, and a
 * run killed inside the critical section leaves the lock directory
 * behind for an operator to remove. Failing to acquire therefore fails
 * CLOSED — nothing is written, and the message names the directory.
 */
async function withCanonicalLock(
  root: string,
  destAbs: string,
  body: () => Promise<CommitResult>,
): Promise<CommitResult> {
  const lockAbs = `${destAbs}.lock`;
  let held: boolean;
  try {
    held = await acquireCanonicalLock(lockAbs);
  } catch (err: unknown) {
    return { ok: false, message: describeError(err) };
  }
  if (!held) {
    return {
      ok: false,
      message:
        `another \`qfai handoff upgrade\` is writing ${toRelPosix(root, destAbs)}; ` +
        `nothing was written. Re-run once it finishes, or remove ` +
        `${toRelPosix(root, lockAbs)} if no upgrade is in progress.`,
    };
  }
  try {
    return await body();
  } finally {
    await releaseQuietly(lockAbs);
  }
}

/**
 * Stage → back up → place, under the canonical-path lock. An operator's
 * hand-curated handoff is always recoverable from disk rather than only
 * from git, and every failure path fails closed: the staged file is
 * removed and the destination is left exactly as it was found.
 */
async function commitCanonicalWrite(args: {
  root: string;
  destAbs: string;
  destExists: boolean;
  yaml: string;
}): Promise<CommitResult> {
  try {
    await mkdir(path.dirname(args.destAbs), { recursive: true });
  } catch (err: unknown) {
    return { ok: false, message: describeError(err) };
  }
  return withCanonicalLock(args.root, args.destAbs, () => stageAndPlace(args));
}

/** The commit proper. Runs with the canonical-path lock held. */
async function stageAndPlace(args: {
  root: string;
  destAbs: string;
  destExists: boolean;
  yaml: string;
}): Promise<CommitResult> {
  let stagedPath: string;
  try {
    stagedPath = await stageExclusively(args.destAbs, `${args.yaml}\n`);
  } catch (err: unknown) {
    return { ok: false, message: describeError(err) };
  }
  return args.destExists
    ? commitOverExisting(args.root, args.destAbs, stagedPath)
    : commitFresh(args.root, args.destAbs, stagedPath);
}

/**
 * Run the upgrade. Two-stage write: stage to a `.tmp-<random>` sibling
 * created with `O_EXCL` (never a fixed name — a leftover staging entry
 * from an interrupted run is a hard link to the canonical file itself),
 * then publish it over the canonical destination — `link` when the
 * destination was absent (exclusive: an entry that appeared in the
 * meantime is refused, not clobbered; where hard links are unsupported,
 * an `O_EXCL` create keeps that refusal), `rename` when `force` is
 * replacing a known file. Both are atomic at the directory-entry level,
 * so readers either see the old file or the new file (never a partial
 * write), and the `force` backup is a COPY so the canonical path never
 * goes missing. Note this does NOT include an explicit `fsync` —
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
 * file is preserved as `<dest>.backup-<ISO>` — which is possible only
 * for a regular file or a symlink, so any other entry (a directory, a
 * FIFO, a socket, a device) is refused rather than replaced unbacked.
 * The whole stage → back up → publish sequence runs under a
 * `<dest>.lock` directory so two concurrent runs cannot interleave
 * their reservations and replacements. `dryRun` reports the resolved
 * destination and field mapping and mutates nothing.
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
        `current canonical handoff. Re-invoke with \`${forceHint(options.root, options.legacyFile)}\` ` +
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
