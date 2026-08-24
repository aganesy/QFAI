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
import { lstat, mkdir, open, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { readBoundedRegularFile } from "./boundedRead.js";

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

  // Reading through a linked `.qfai` is the same escape in the other direction: the ownership
  // and `declined` markers would come from a file outside this tree, and a workflow the adopter
  // never removed would read as one they did. The empty record is the conservative answer.
  if (!(await ancestorsAreRealDirectories(rootDir))) {
    return emptyRecord();
  }
  const raw = await readBoundedRecord(recordPath);
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
 *
 * - entry + absent on disk: `declined` (deliberately removed — never
 *   recreated, never reported as stale, never pruned)
 *
 * **That last row is not a drift verdict, and `CR-20260818-0003` exists because
 * a second implementation used to give one.** This function answers "is this
 * still the file QFAI installed", where "cannot be compared" is conservatively
 * "no". `doctor`'s drift reader asks the narrower question "should the adopter
 * be told they edited this", and for a name a later release stopped shipping
 * the answer is no — so it excludes that input before asking for a state at
 * all (`core/doctor/workflowsIntegrity.ts`, the packaged-absent `continue`).
 * Two questions, one answer each. This function is now the only definition of
 * the state vocabulary; `hasDrifted` was expressed in terms of it rather than
 * comparing digests on its own, which is what made the two answers possible.
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
 * Whether every directory between `rootDir` and the record is a real directory rather than a link.
 *
 * The leaf protections — `O_NOFOLLOW` on the read, write-then-`rename` on the write — are about the
 * FINAL component and say nothing about the path that reaches it. Review finding [09]/[31]: if the
 * adopter's `.qfai` is itself a symlink to a writable directory outside the repository, `mkdir`,
 * the temp file and the `rename` all land over there. `qfai init` would create and replace an
 * `install-provenance.json` in a tree it was never pointed at, and the reader would take ownership
 * and declined markers from a file no one in this repository wrote.
 *
 * Node has no portable `openat`, so the components are checked by name — `lstat` on each, refusing
 * any symlink. That is a check and not a capability: a component swapped between the check and the
 * write is not caught by it. It is still worth doing, because the case this closes is a persistent
 * misconfiguration or a planted tree rather than a race, and refusing is the conservative answer to
 * both. A missing component is fine — `mkdir` is about to create it.
 */
async function ancestorsAreRealDirectories(rootDir: string): Promise<boolean> {
  let current = rootDir;
  for (const segment of PROVENANCE_SEGMENTS.slice(0, -1)) {
    current = path.join(current, segment);
    const inspected = await lstat(current).catch(() => undefined);
    if (inspected === undefined) {
      continue; // not there yet; `mkdir` creates it, and a created directory is not a link
    }
    if (inspected.isSymbolicLink() || !inspected.isDirectory()) {
      return false;
    }
  }
  return true;
}

/** The error a refused ancestor raises, phrased so the operator knows which component to look at. */
function symlinkedAncestorError(rootDir: string): Error {
  return new Error(
    `refusing to write the install-provenance record: a directory on the way to ${path.join(rootDir, ...PROVENANCE_SEGMENTS)} is a symlink or not a directory, so the write would land outside this tree`,
  );
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
  // Checked BEFORE the `mkdir`, so a linked component is never even traversed, and again after
  // it, because `mkdir` is the step that would have followed one.
  if (!(await ancestorsAreRealDirectories(rootDir))) {
    throw symlinkedAncestorError(rootDir);
  }
  await mkdir(recordDir, { recursive: true });
  if (!(await ancestorsAreRealDirectories(rootDir))) {
    throw symlinkedAncestorError(rootDir);
  }

  const serialized = `${JSON.stringify(serializeRecord(record), null, 2)}\n`;
  // Checked BEFORE the rename, because the reader's ceiling is on the file and the writer's
  // indentation is what can cross it. Review finding [13]: a valid record whose compact form is
  // well under the limit can pretty-print past it — an unknown namespace holding a large array is
  // enough — and the write then succeeds while the very next `readInstallProvenance` treats the
  // file as oversized and returns an EMPTY record. Every ownership and declined marker would be
  // lost, and a workflow the adopter deliberately removed would be recreated by the next `init`.
  //
  // Failing here is the conservative direction: no record is written, the caller sees the error,
  // and the previous record — which is still readable — stays in place.
  const serializedBytes = Buffer.byteLength(serialized, "utf-8");
  if (serializedBytes > MAX_RECORD_BYTES) {
    throw new Error(
      `install-provenance record would serialize to ${String(serializedBytes)} bytes, past the ${String(MAX_RECORD_BYTES)}-byte ceiling its reader enforces; refusing to write a record that would read back as empty`,
    );
  }
  // Same directory as the target, or the rename would cross a filesystem
  // boundary and stop being atomic. `wx` refuses to reuse an existing name.
  const tempPath = path.join(recordDir, `.install-provenance.${randomUUID()}.tmp`);
  try {
    await writeFile(tempPath, serialized, { encoding: "utf-8", flag: "wx" });
    await renameWithRetry(tempPath, recordPath);
  } catch (error) {
    await unlink(tempPath).catch(() => undefined);
    throw error;
  }
}

/** How many times a denied rename is retried, and how long between attempts. */
const RENAME_ATTEMPTS = 40;
const RENAME_RETRY_MS = 25;

/**
 * `rename`, retried while the platform denies it for a reason that passes.
 *
 * On Windows a rename onto an existing name fails with `EPERM` / `EACCES` / `EBUSY` whenever anything
 * holds a handle to the destination — another writer mid-rename, a virus scanner, the search indexer.
 * It is not a permission problem and it is not permanent, and treating it as fatal made
 * `writeInstallProvenance` throw under concurrency: measured, a six-writer stress on one tree failed
 * here while the whole rest of the suite passed. The atomicity the rename provides is unaffected —
 * either it happened or it did not — so the correct response to a transient denial is to try again.
 *
 * The last failure is rethrown rather than swallowed. A destination that is genuinely unwritable must
 * still reach the caller, because the caller's next move is to roll back what it wrote.
 */
async function renameWithRetry(from: string, to: string): Promise<void> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await rename(from, to);
      return;
    } catch (error) {
      const code: unknown =
        typeof error === "object" && error !== null ? Reflect.get(error, "code") : undefined;
      const transient = code === "EPERM" || code === "EACCES" || code === "EBUSY";
      if (!transient || attempt >= RENAME_ATTEMPTS) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, RENAME_RETRY_MS));
    }
  }
}

/**
 * How long a lock may be held before the next writer treats it as abandoned, and how patiently a
 * writer waits for one that is still live.
 *
 * A crashed `qfai init` cannot be allowed to wedge the command permanently, so the lock is
 * TAKEABLE rather than absolute — the cost of taking one too early is the lost update this whole
 * primitive exists to narrow, and the cost of never taking one is a repository where `qfai init`
 * no longer runs at all. Ten seconds is far past any real record write and far under a human's
 * patience.
 */
const LOCK_STALE_MS = 10_000;
const LOCK_POLL_MS = 25;
const LOCK_ATTEMPTS = 200;

/**
 * The reclaim lock's own staleness ceiling.
 *
 * Far shorter than the record lock's, because it covers an `unlink` and an `open` rather than a whole
 * read-modify-write. The two ceilings are different numbers because they bound different amounts of
 * work, not because one was tuned.
 */
const RECLAIM_STALE_MS = 500;

/**
 * Applies `mutate` to the record CURRENTLY on disk and writes the result, under an exclusive lock.
 *
 * Read-modify-write against a snapshot taken earlier in the run is a lost update, and this record
 * is exactly where that is unrecoverable. Two `qfai init` runs in one tree — a monorepo bootstrap
 * script, a CI matrix sharing a checkout, a developer in two terminals — each read the record
 * before writing, and the second write is built on the first's stale copy: entries the first run
 * recorded vanish. The file they describe stays on disk with no entry, which the next run reads
 * as `adopter-owned`, so nothing ever records it again and doctor's drift check is lost for that
 * name permanently. Review finding [03].
 *
 * Two mechanisms, because neither alone is enough:
 *
 * - The lock (`wx`, which fails rather than truncates when the name exists) serializes writers,
 *   so the read and the write are one step from any other writer's point of view.
 * - The read happens INSIDE the lock. A caller's snapshot is never the write's base, so even a
 *   writer that predates this primitive — an older QFAI in the same tree, which holds no lock at
 *   all — loses at most its own entries rather than the current run's.
 *
 * `mutate` receives the fresh record and returns the one to write, or `undefined` to write
 * nothing. It must not perform I/O on the record: it runs while the lock is held.
 */
export async function updateInstallProvenance(
  rootDir: string,
  mutate: (current: InstallProvenanceRecord) => InstallProvenanceRecord | undefined,
): Promise<void> {
  const recordPath = path.join(rootDir, ...PROVENANCE_SEGMENTS);
  const recordDir = path.dirname(recordPath);
  // The lock file lands in the same directory as the record, so it escapes the same way.
  if (!(await ancestorsAreRealDirectories(rootDir))) {
    throw symlinkedAncestorError(rootDir);
  }
  await mkdir(recordDir, { recursive: true });
  const lockPath = path.join(recordDir, ".install-provenance.lock");

  // Applied, written, and then CHECKED — up to a bounded number of times.
  //
  // The lock makes the uncontended case one pass. It is not, on its own, enough to rely on: the
  // whole-suite stress that six concurrent writers put on this measured two of them inside the
  // section at once, and every argument for why that could not happen was about how narrow the
  // window is rather than about it being closed. A window a test hits on the first attempt is not
  // narrow.
  //
  // So the write verifies itself. After writing, the record is re-read and compared with what was
  // written; a difference means somebody else wrote in between, and the mutation is re-applied to
  // THEIR content and written again. That converges whatever the lock does: each pass re-applies
  // onto the newest content, so the writer that finishes last leaves a record holding every
  // writer's entries, and every earlier writer notices its own pass was overtaken and repeats.
  // Review finding [03] asked for the lost update to stop; this is the part that does not depend
  // on the lock being perfect.
  for (let attempt = 1; attempt <= UPDATE_ATTEMPTS; attempt += 1) {
    const release = await acquireRecordLock(lockPath);
    let written: string | undefined;
    try {
      const next = mutate(await readInstallProvenance(rootDir));
      if (next === undefined) {
        return;
      }
      await writeInstallProvenance(rootDir, next);
      written = serializeForComparison(next);
    } finally {
      await release();
    }

    // Read OUTSIDE the lock on purpose: the question is what any other writer can now see, and
    // holding the lock while asking it would only hide a writer that is waiting for it.
    if (serializeForComparison(await readInstallProvenance(rootDir)) === written) {
      return;
    }
  }
  throw new Error(
    `install-provenance record at ${recordPath} was overwritten by another writer on ${String(UPDATE_ATTEMPTS)} consecutive attempts; refusing to loop further`,
  );
}

/** How many times a write that was overtaken is re-applied before the attempt is abandoned. */
const UPDATE_ATTEMPTS = 20;

/**
 * The record as the comparable text `writeInstallProvenance` would produce for it.
 *
 * The same serializer, so "what I wrote" and "what is there now" are compared in one representation
 * rather than by walking two object graphs — and a key-order difference cannot read as a concurrent
 * write, because both sides go through it.
 */
function serializeForComparison(record: InstallProvenanceRecord): string {
  return JSON.stringify(serializeRecord(record));
}

/**
 * Takes the lock, waiting for a live holder and reclaiming an abandoned one.
 *
 * The first version reclaimed by `unlink`, and review finding [23] showed why that is not a
 * reclaim: two writers that observe the SAME stale lock both decide to remove it, the first
 * removes it and creates its own, and the second — acting on an observation that is now several
 * milliseconds out of date — removes the FIRST WRITER'S FRESH LOCK. Both then enter the
 * read-modify-write section, which is the lost update this primitive exists to prevent, now
 * reintroduced by the thing meant to prevent it.
 *
 * So nothing here ever unlinks a lock it has not proved is its own:
 *
 * - Every lock file carries a token unique to the writer that created it.
 * - The uncontended path is `open(..., "wx")`, which is atomic and needs no proof beyond succeeding.
 * - Release reads the token first and unlinks only its own.
 * - **A stale lock is reclaimed under a second `wx` lock**, so exactly one writer can reclaim it.
 *
 * That last point replaced a reclaim-by-atomic-replacement, and the reason is measured rather than
 * argued. Replacement plus a read-back looked sufficient: two reclaimers both rename, one token
 * survives, the loser retries. It is not — the loser can rename AFTER the winner's read-back, taking
 * the lock out from under a writer already inside the section. That was written down here as a
 * residual "within one scheduler tick", and then the whole-suite run put six concurrent writers on
 * one tree and hit it on the first attempt. A window a test finds immediately is not a residual.
 *
 * The reclaim lock is the only shape Node offers that exactly one process can win: `wx` fails rather
 * than overwrites. Its own holder can die, so it is aged too — but it is held for two syscalls rather
 * than for a whole read-modify-write, so its abandonment window is smaller by orders of magnitude
 * instead of by argument. And `updateInstallProvenance` no longer depends on any of this being
 * perfect: it verifies its write survived and re-applies if it did not.
 */
async function acquireRecordLock(lockPath: string): Promise<() => Promise<void>> {
  const token = randomUUID();
  const release = async (): Promise<void> => {
    const held = await readFile(lockPath, "utf-8").catch(() => undefined);
    if (held === token) {
      await unlink(lockPath).catch(() => undefined);
    }
  };

  for (let attempt = 0; attempt < LOCK_ATTEMPTS; attempt += 1) {
    try {
      const handle = await open(lockPath, "wx");
      try {
        await handle.writeFile(token, "utf-8");
      } finally {
        await handle.close();
      }
      return release;
    } catch {
      // Held, or unopenable. Age decides which.
    }

    const heldSince = await stat(lockPath).then(
      (stats) => stats.mtimeMs,
      () => undefined,
    );
    if (heldSince === undefined) {
      continue; // gone between the open and the stat: try to create it again immediately
    }
    if (Date.now() - heldSince <= LOCK_STALE_MS) {
      await new Promise((resolve) => setTimeout(resolve, LOCK_POLL_MS));
      continue;
    }

    // Abandoned. Exactly one writer may reclaim it, so the reclaim happens under its own `wx` lock.
    const reclaimPath = `${lockPath}.reclaim`;
    let reclaiming;
    try {
      reclaiming = await open(reclaimPath, "wx");
    } catch {
      // Someone else is reclaiming, or a previous reclaimer died holding this. Age decides, and the
      // ceiling is short: this lock covers two syscalls, not a read-modify-write.
      const since = await stat(reclaimPath).then(
        (stats) => stats.mtimeMs,
        () => undefined,
      );
      if (since !== undefined && Date.now() - since > RECLAIM_STALE_MS) {
        await unlink(reclaimPath).catch(() => undefined);
      }
      await new Promise((resolve) => setTimeout(resolve, LOCK_POLL_MS));
      continue;
    }
    try {
      // Re-checked while holding the reclaim lock: the winner of a previous reclaim may already have
      // installed a fresh lock, and taking that one away is the defect this whole shape exists to
      // stop. Only a lock that is STILL abandoned is removed.
      const stillStale = await stat(lockPath).then(
        (stats) => Date.now() - stats.mtimeMs > LOCK_STALE_MS,
        () => true, // gone: the create below is the reclaim
      );
      if (!stillStale) {
        await new Promise((resolve) => setTimeout(resolve, LOCK_POLL_MS));
        continue;
      }
      await unlink(lockPath).catch(() => undefined);
      const handle = await open(lockPath, "wx");
      try {
        await handle.writeFile(token, "utf-8");
      } finally {
        await handle.close();
      }
      return release;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, LOCK_POLL_MS));
    } finally {
      await reclaiming.close();
      await unlink(reclaimPath).catch(() => undefined);
    }
  }
  throw new Error(
    `could not take the install-provenance lock at ${lockPath} after ${String(LOCK_ATTEMPTS)} attempts; another process is writing the record`,
  );
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
 * The record's bytes, or `undefined` for anything that is not a regular file within the ceiling.
 *
 * The posture and the reasons live in `shared/boundedRead.ts`, which two other call sites needed
 * identically — PR #794's review found the same defect in each of them separately.
 */
async function readBoundedRecord(filePath: string): Promise<string | undefined> {
  const bytes = await readBoundedRegularFile(filePath, MAX_RECORD_BYTES);
  return bytes === undefined ? undefined : bytes.toString("utf-8");
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
  // A NULL-prototype map, and `defineProperty` rather than assignment. Review finding [09]:
  // a newer package version that adds a `__proto__` namespace to the record would, on an older
  // version, reach `other[key] = value` — which calls the prototype setter and creates no own
  // property at all. `seen` still went true, so the namespace vanished from the spread and from
  // the serialization while the code reported having preserved it. That is the exact opposite of
  // the compatibility guarantee this function exists for: unknown namespaces are kept VERBATIM,
  // and a key the JSON carries is data, never an instruction about an object's prototype.
  const other = Object.create(null) as Record<string, unknown>;
  let seen = false;
  for (const [key, value] of Object.entries(parsed)) {
    if (key === "workflows") {
      continue;
    }
    Object.defineProperty(other, key, {
      value,
      writable: true,
      enumerable: true,
      configurable: true,
    });
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
  if (!ISO_TIMESTAMP_PATTERN.test(value)) {
    return false;
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return false;
  }
  // `Date.parse` NORMALIZES rather than rejecting: review finding [16] measured
  // `Date.parse("2020-02-31T00:00:00Z")` on Node 24 returning March 2 instead of NaN, so a date
  // that does not exist on the calendar passed as a valid timestamp. An entry carrying one keeps
  // its name in the record, and `resolveWorkflowCopySet` then reads that name as `declined` — a
  // workflow the adopter never removed is never created, permanently.
  //
  // Round-tripping is what separates a parsed date from an accepted one: the calendar fields are
  // read back out of the resulting instant and compared with the ones written down.
  //
  // In the offset the timestamp DECLARES, though, not in UTC. Review finding [28]: the pattern
  // above admits `+05:00`, and `2020-01-01T00:00:00+05:00` is 2019-12-31 once converted — so a
  // UTC comparison rejected a perfectly ordinary ISO 8601 instant, dropped its entry, and left the
  // workflow it named reading as `adopter-owned`, which is the same permanent loss of drift
  // detection the [16] repair existed to prevent. Shifting the instant by the stated offset puts
  // the fields back in the frame they were written in; a date that is not on the calendar is still
  // normalized away by `Date.parse` and still caught.
  const fields = /^(\d{4})-(\d{2})-(\d{2})T[\d:.]+(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (fields === null) {
    return false;
  }
  const [, year, month, day, zone] = fields;
  if (year === undefined || month === undefined || day === undefined || zone === undefined) {
    return false;
  }
  const offsetMinutes =
    zone === "Z"
      ? 0
      : (zone.startsWith("-") ? -1 : 1) *
        (Number(zone.slice(1, 3)) * 60 + Number(zone.slice(4, 6)));
  const local = new Date(parsed + offsetMinutes * 60_000);
  return (
    local.getUTCFullYear() === Number(year) &&
    local.getUTCMonth() + 1 === Number(month) &&
    local.getUTCDate() === Number(day)
  );
}
