/**
 * Install-provenance record handling for files QFAI writes into an
 * adopter's tree (shipped-workflows contract).
 *
 * The record lives at `.qfai/install-provenance.json` in the adopter tree
 * and is tracked — deliberately NOT part of the managed gitignore block —
 * because a deliberately deleted (declined) file is only recognizable as
 * declined while the record survives a fresh clone.
 *
 * ## Hostile-tree posture
 *
 * The record path is adopter-controlled and QFAI opens it in a repository
 * it did not create. Both ends therefore refuse to FOLLOW that path:
 *
 * - the reader opens the path ONCE and decides everything on that one
 *   descriptor — `fstat` for "regular file, below the size ceiling" and a
 *   bounded read from the same handle — so a symlink to `/dev/zero`, a FIFO,
 *   or a multi-gigabyte file resolves to the empty record instead of hanging
 *   the process, and swapping the path between the check and the read reaches
 *   nothing: the descriptor is already bound to whatever was there at open
 *   time;
 * - the writer never opens the record path for writing at all. It writes a
 *   fresh temp file beside it and `rename`s over the name, which REPLACES a
 *   symlink sitting there rather than truncating whatever it points at, and
 *   which leaves the previous record intact when the write fails partway.
 */
import { createHash, randomUUID } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { mkdir, open, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export type WorkflowProvenanceEntry = {
  /** Hex digest of the bytes QFAI wrote (not of the current file). */
  sha256: string;
  /** The package version that wrote the file. */
  installedByVersion: string;
  /** ISO 8601 timestamp of the write. */
  installedAt: string;
};

export type InstallProvenanceRecord = {
  workflows: Record<string, WorkflowProvenanceEntry>;
  /**
   * Top-level keys other than `workflows`, carried through read → write
   * verbatim.
   *
   * The contract namespaces the top level by artifact kind so a later kind
   * is additive. Projecting the parsed file onto `{ workflows }` alone and
   * writing that back would make an OLDER package silently delete a NEWER
   * one's ownership data on the first `qfai init` that records anything.
   * Unknown keys are never inspected, only preserved.
   */
  otherNamespaces?: Record<string, unknown>;
};

/**
 * Closed file-state enum from the shipped-workflows contract: decided by
 * two independent observations — whether the name has a provenance entry,
 * and what is on disk.
 */
export type WorkflowFileState = "absent" | "adopter-owned" | "installed" | "modified" | "declined";

const PROVENANCE_SEGMENTS = [".qfai", "install-provenance.json"] as const;

/**
 * Read ceiling for the record. The record holds a handful of filenames and
 * three short strings each; anything past this is not a record QFAI wrote,
 * and reading it is the denial-of-service the `lstat` guard exists to stop.
 */
const MAX_RECORD_BYTES = 1_048_576;

/** A 64-character lowercase hex sha256 digest, and nothing else. */
const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/;

/**
 * ISO 8601 instant with a timezone designator — the shape `toISOString`
 * produces, which is what the writer stamps.
 */
const ISO_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

/**
 * Reads the install-provenance record from the adopter tree rooted at
 * `rootDir`.
 *
 * Fail-safe by contract: a missing or unreadable file, a path that is not a
 * regular file, an oversized file, malformed JSON, or a missing/invalid
 * `workflows` key all resolve to an EMPTY record — never a throw. An empty
 * record means every file on disk is treated as adopter-owned, which is the
 * direction in which QFAI touches nothing. Entries that do not carry the
 * full string shape — a 64-hex digest, a non-empty version and a parseable
 * ISO 8601 instant — are dropped rather than surfaced partially.
 */
export async function readInstallProvenance(rootDir: string): Promise<InstallProvenanceRecord> {
  const recordPath = path.join(rootDir, ...PROVENANCE_SEGMENTS);

  const raw = await readBoundedRegularFile(recordPath);
  if (raw === undefined) {
    // Absent, not a regular file, oversized, or unreadable: empty record (fail-safe).
    return emptyRecord();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Malformed JSON: empty record (fail-safe).
    return emptyRecord();
  }

  const otherNamespaces = extractOtherNamespaces(parsed);
  return otherNamespaces === undefined
    ? { workflows: extractWorkflows(parsed) }
    : { workflows: extractWorkflows(parsed), otherNamespaces };
}

/**
 * Resolves the file state for one shipped workflow name from the two
 * contract observations: the name's provenance entry (if any), the digest
 * of the file currently on disk (`undefined` when absent), and the digest
 * of the packaged template bytes.
 *
 * - no entry + absent on disk: `absent` (never installed)
 * - no entry + present on disk: `adopter-owned` (name collision — the
 *   adopter authored it, QFAI leaves it alone)
 * - entry + present on disk, bytes equal the packaged template: `installed`
 * - entry + present on disk, bytes differ: `modified`
 * - entry + present on disk, no packaged digest available (the current
 *   package no longer ships the name): `modified` — the conservative
 *   direction, since equality with the packaged template cannot be shown
 * - entry + absent on disk: `declined` (deliberately removed — never
 *   recreated, never reported as stale, never pruned)
 */
export function resolveWorkflowFileState(
  provenanceEntry: WorkflowProvenanceEntry | undefined,
  diskSha256: string | undefined,
  packagedSha256: string | undefined,
): WorkflowFileState {
  if (provenanceEntry === undefined) {
    return diskSha256 === undefined ? "absent" : "adopter-owned";
  }
  if (diskSha256 === undefined) {
    return "declined";
  }
  return packagedSha256 !== undefined && diskSha256 === packagedSha256 ? "installed" : "modified";
}

/**
 * Writes the install-provenance record into the adopter tree rooted at
 * `rootDir`, creating the parent directory when needed. This is the single
 * writer for the record file; the serialized form is the pretty-printed
 * JSON shape `readInstallProvenance` round-trips, with a trailing newline.
 *
 * Write-then-rename, for two reasons that are one mechanism:
 *
 * - **Atomicity.** A truncating write that dies partway leaves invalid JSON,
 *   which the reader turns into the EMPTY record — losing every ownership
 *   and declined marker at once, so the next `init` recreates files the
 *   adopter removed. The temp file absorbs the partial write instead.
 * - **No link following.** `rename` replaces the NAME. If the record path is
 *   a symlink pointing anywhere the user can write, this replaces the link;
 *   opening the path for writing would have truncated its target.
 */
export async function writeInstallProvenance(
  rootDir: string,
  record: InstallProvenanceRecord,
): Promise<void> {
  const recordPath = path.join(rootDir, ...PROVENANCE_SEGMENTS);
  const recordDir = path.dirname(recordPath);
  await mkdir(recordDir, { recursive: true });

  const serialized = `${JSON.stringify(serializeRecord(record), null, 2)}\n`;
  // Same directory as the target, or the rename would cross a filesystem
  // boundary and stop being atomic. `wx` refuses to reuse an existing name.
  const tempPath = path.join(recordDir, `.install-provenance.${randomUUID()}.tmp`);
  try {
    await writeFile(tempPath, serialized, { encoding: "utf-8", flag: "wx" });
    await rename(tempPath, recordPath);
  } catch (error) {
    await unlink(tempPath).catch(() => undefined);
    throw error;
  }
}

/**
 * Builds the record entry for one freshly written workflow file. The
 * sha256 is the hex digest of exactly the bytes that were written — never
 * of whatever the file holds later — which is what keeps a future byte
 * difference on disk attributable (adopter edit vs newer packaged
 * template). Stamped once at install time.
 */
export function createWorkflowProvenanceEntry(
  writtenBytes: Uint8Array,
  installedByVersion: string,
  installedAt: string,
): WorkflowProvenanceEntry {
  return {
    sha256: createHash("sha256").update(writtenBytes).digest("hex"),
    installedByVersion,
    installedAt,
  };
}

/**
 * Open flags for the record read: read-only, never following a symlink, never
 * blocking on the open itself.
 *
 * `O_NOFOLLOW` and `O_NONBLOCK` are POSIX and are absent on Windows, where the
 * runtime leaves them undefined; the descriptor-bound `fstat` below is the
 * portable half of the guard and rejects a device or a FIFO on every platform.
 * `O_NONBLOCK` matters because opening a FIFO for reading BLOCKS until a writer
 * appears — a hang before any check could run.
 */
function readOnlyNoFollowFlags(): number {
  let flags = fsConstants.O_RDONLY;
  if (typeof fsConstants.O_NOFOLLOW === "number") {
    flags |= fsConstants.O_NOFOLLOW;
  }
  if (typeof fsConstants.O_NONBLOCK === "number") {
    flags |= fsConstants.O_NONBLOCK;
  }
  return flags;
}

/**
 * Reads a regular file of at most {@link MAX_RECORD_BYTES} bytes, or
 * `undefined` for anything else — absent, a symlink, a device, a FIFO, an
 * oversized file, or an unreadable one.
 *
 * One `open`, then everything on that descriptor. A `lstat(path)` followed by
 * `readFile(path)` resolves the name twice, and the record path is
 * adopter-controlled: a process that swaps the name for a symlink to
 * `/dev/zero` between the two calls gets the size ceiling and the regular-file
 * test applied to the file it replaced, and the unbounded read applied to the
 * device. Binding both to one handle removes the window rather than narrowing
 * it.
 */
async function readBoundedRegularFile(filePath: string): Promise<string | undefined> {
  let handle;
  try {
    handle = await open(filePath, readOnlyNoFollowFlags());
  } catch {
    return undefined;
  }
  try {
    const stats = await handle.stat();
    if (!stats.isFile() || stats.size > MAX_RECORD_BYTES) {
      return undefined;
    }
    // One byte of headroom: a file that GREW past the size `fstat` reported
    // stops being the file that was measured, and reading it is the unbounded
    // read the ceiling exists to refuse.
    const ceiling = Math.min(stats.size, MAX_RECORD_BYTES);
    const buffer = Buffer.alloc(ceiling + 1);
    let filled = 0;
    while (filled < buffer.length) {
      const { bytesRead } = await handle.read(buffer, filled, buffer.length - filled, null);
      if (bytesRead === 0) {
        break;
      }
      filled += bytesRead;
    }
    return filled > ceiling ? undefined : buffer.subarray(0, filled).toString("utf-8");
  } catch {
    return undefined;
  } finally {
    await handle.close().catch(() => undefined);
  }
}

function emptyRecord(): InstallProvenanceRecord {
  return { workflows: {} };
}

/**
 * The JSON body: `workflows` first, then every unknown top-level namespace
 * the reader carried through. Unknown keys can never shadow `workflows`,
 * because the reader excludes that name from them.
 */
function serializeRecord(record: InstallProvenanceRecord): Record<string, unknown> {
  return { workflows: record.workflows, ...(record.otherNamespaces ?? {}) };
}

function isRecordObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractWorkflows(parsed: unknown): Record<string, WorkflowProvenanceEntry> {
  if (!isRecordObject(parsed)) {
    return {};
  }
  const workflowsValue = parsed["workflows"];
  if (!isRecordObject(workflowsValue)) {
    return {};
  }
  const workflows: Record<string, WorkflowProvenanceEntry> = {};
  for (const [name, value] of Object.entries(workflowsValue)) {
    const entry = toWorkflowEntry(value);
    if (entry !== undefined) {
      workflows[name] = entry;
    }
  }
  return workflows;
}

/** Every top-level key except `workflows`, verbatim, or `undefined` when there is none. */
function extractOtherNamespaces(parsed: unknown): Record<string, unknown> | undefined {
  if (!isRecordObject(parsed)) {
    return undefined;
  }
  const other: Record<string, unknown> = {};
  let seen = false;
  for (const [key, value] of Object.entries(parsed)) {
    if (key === "workflows") {
      continue;
    }
    other[key] = value;
    seen = true;
  }
  return seen ? other : undefined;
}

function toWorkflowEntry(value: unknown): WorkflowProvenanceEntry | undefined {
  if (!isRecordObject(value)) {
    return undefined;
  }
  const sha256 = value["sha256"];
  const installedByVersion = value["installedByVersion"];
  const installedAt = value["installedAt"];
  if (
    typeof sha256 !== "string" ||
    typeof installedByVersion !== "string" ||
    typeof installedAt !== "string"
  ) {
    return undefined;
  }
  // The field TYPES are not the shape. An entry of three empty strings is a
  // well-typed record that claims ownership, and `resolveWorkflowFileState`
  // reads a claimed name with no file as `declined` — which stops `qfai init`
  // from ever writing the workflow again. A corrupt entry must be DROPPED so
  // the name falls back to `absent`, the state that installs.
  if (
    !SHA256_HEX_PATTERN.test(sha256) ||
    installedByVersion.length === 0 ||
    !isIsoTimestamp(installedAt)
  ) {
    return undefined;
  }
  return { sha256, installedByVersion, installedAt };
}

function isIsoTimestamp(value: string): boolean {
  return ISO_TIMESTAMP_PATTERN.test(value) && !Number.isNaN(Date.parse(value));
}
