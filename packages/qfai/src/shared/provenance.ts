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
import {
  lstat,
  mkdir,
  open,
  readdir,
  rename,
  rm,
  rmdir,
  unlink,
  utimes,
  writeFile,
} from "node:fs/promises";
import type { Stats } from "node:fs";
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

/**
 * Refuses a lock path that is anything other than an absent name or a real directory.
 *
 * `lstat`, so the LINK is inspected rather than its target — the whole point is that following
 * it is what must not happen.
 */
async function refuseLinkedLockPath(lockDir: string): Promise<void> {
  const inspected = await lstat(lockDir).catch(() => undefined);
  if (inspected === undefined) {
    return;
  }
  if (inspected.isSymbolicLink() || !inspected.isDirectory()) {
    throw new Error(
      `install-provenance lock path ${lockDir} is not a directory this run created; refusing to ` +
        `read or remove anything through it. Remove it by hand if it is stale.`,
    );
  }
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
  // The directory's IDENTITY, pinned across the write.
  //
  // Review finding [73]: `ancestorsAreRealDirectories` runs before the `mkdir` and again
  // after it, and then this writes — three pathname operations with the same gap between
  // them the reviewer-artifact writers already close. A concurrent process that moves
  // `.qfai` aside and leaves a link in its place has the staging file created on the far
  // side and the rename replace an external `install-provenance.json`.
  //
  // Node has no `openat` or `renameat`, so the identity is compared: device and inode read
  // before the write, again after the staging file exists, and once more before the rename.
  // A swap becomes a refusal rather than a write into somebody else's tree, and the residual
  // is one syscall wide — the same limit the artifact writers document.
  const observed = await lstat(recordDir);
  const sameDirectory = (a: Stats, b: Stats): boolean => a.dev === b.dev && a.ino === b.ino;
  try {
    await writeFile(tempPath, serialized, { encoding: "utf-8", flag: "wx" });
    if (!sameDirectory(await lstat(recordDir), observed)) {
      throw symlinkedAncestorError(rootDir);
    }
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
/**
 * How far ahead of this process a marker's clock may be before the marker is disbelieved.
 *
 * A filesystem marginally ahead is ordinary; a marker minutes into the future is not one a
 * live holder wrote, and reading it as the freshest possible holder wedges the lock until the
 * wall clock catches up.
 */
const LOCK_CLOCK_SKEW_MS = 5_000;

/** How often a holder renews its marker. Well under the ceiling, so one renewal may be lost. */
const LOCK_HEARTBEAT_MS = 2_000;
/**
 * How long a waiter sleeps between attempts.
 *
 * Raised from 25ms, keeping the 15s total patience while doing a THIRD of the work to spend it.
 * Measured: at a 25ms poll, twenty concurrent writers turned the contended path into tens of
 * thousands of failed renames and marker `lstat`s, and the suite's own concurrency row went from
 * about a second to sixteen minutes. Patience is cheaper bought in longer sleeps.
 */
const LOCK_POLL_MS = 75;
/**
 * How long a waiter keeps trying before it gives up. It must exceed `LOCK_STALE_MS`, or the
 * reclaim path is unreachable from inside a single run.
 *
 * It did not: patience used to be an ITERATION COUNT, 200 polls, and at the 25ms poll of the day
 * that was five seconds against a ten-second ceiling — so a lock left by a run killed less than
 * five seconds earlier could never be judged abandoned before the waiter gave up. `qfai init`
 * then threw `another process is writing the record` and its rollback DELETED the workflows it
 * had just copied, over a holder that no longer existed. The constant's own promise, that a
 * crashed run cannot wedge the command permanently, was true only across runs and not within one.
 *
 * A DURATION rather than that iteration count, and the difference is the invariant above. As
 * `attempts * poll` the ceiling comparison held only at the nominal sleep, so it was restated
 * every time either half moved and was wrong twice; and the repair for a poll that had grown too
 * expensive was to cut the count, which silently cut the patience with it. As one number the
 * comparison with `LOCK_STALE_MS` is direct, and `LOCK_POLL_MS` becomes what it reads as — how
 * often to look, not how long to wait.
 */
const LOCK_PATIENCE_MS = 15_000;
/**
 * How long a holder re-reads a lock it has just published before concluding somebody replaced it.
 *
 * A reclaimer decides a lock is abandoned and then MOVES it, and those are separate syscalls: it
 * can judge the previous holder's marker stale and have its `rename` land on the lock this holder
 * published in between. `clearAbandonedLock` finds a fresh marker on the object it moved and puts
 * it back, so the lock returns — under the same name, and as the same inode, because a `rename`
 * carries the object. What the holder must not do is read the name once, during that window, and
 * conclude it was dispossessed.
 *
 * Well under `LOCK_STALE_MS`: this is the width of another process's move-and-restore, not a
 * second helping of patience. Only an object whose `dev`/`ino` match what was staged is ever
 * accepted, so re-reading admits nothing a single read would not.
 */
const LOCK_CONFIRM_MS = 1_000;

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
    const release = await acquireRecordLock(recordDir);
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
 * The lock's visible name. A DIRECTORY, whose entries name its holders.
 *
 * `.d` rather than the plain `.install-provenance.lock` a file used to occupy, so the two shapes
 * can never meet at one path: a leftover regular file under the old name would block every
 * `mkdir` and every `rename` here forever. The cost is that two QFAI versions writing the SAME
 * tree at the SAME moment would not interlock with each other. A lock file is transient state
 * rather than part of the record format, and that overlap is one upgrade wide.
 */
const LOCK_DIR_NAME = ".install-provenance.lock.d";

/**
 * Takes the lock, waiting for a live holder and reclaiming an abandoned one.
 *
 * The whole difficulty is removing a lock whose owner is gone without removing one that is
 * alive, and every earlier attempt failed the same way: it identified the lock by its PATH.
 *
 * - Review finding [23]: reclaiming by `unlink` let two writers that observed the same stale
 *   lock both remove it — the second removing the first's FRESH lock.
 * - Then a second `wx` lock guarding the reclaim, which had the same defect one level down.
 * - Then a two-`stat` identity check on the lock file, which narrowed the window to one syscall
 *   and said so in a paragraph headed "what remains".
 * - Review finding [39] pointed at the RELEASE, which still had the original shape: read the
 *   token, then `unlink` the path. A holder stalled past the staleness ceiling reads its own
 *   token, another writer reclaims and publishes a fresh lock at the same name, and the stalled
 *   holder's `unlink` deletes THAT — putting two writers in the section at once, which is the
 *   lost update this primitive exists to prevent.
 *
 * So the lock stops being a path whose contents identify its holder, and becomes a DIRECTORY
 * whose ENTRY NAMES do. Every removal here then names one specific holder, or refuses:
 *
 * - a holder publishes by building `<uuid>` inside a private staging directory and `rename`ing
 *   that directory onto the lock name. `rename` onto a non-empty directory fails, so the rename
 *   is the arbitration — and because the marker is inside before the rename, the lock is never
 *   visible without a holder named in it;
 * - release unlinks `lockDir/<its own uuid>` and then `rmdir`s. Both are exact: the unlink names
 *   a marker only this holder created, and `rmdir` fails on a directory holding anybody else's.
 *   A stalled holder releasing into somebody else's lock gets `ENOENT` and `ENOTEMPTY` and does
 *   no damage;
 * - the reclaim is the same two steps against the marker it OBSERVED, so a reclaimer overtaken
 *   between its `readdir` and its removal gets `ENOENT` and `ENOTEMPTY` too.
 *
 * There is no path-identity comparison left anywhere in it, and so no window between deciding
 * and acting: the kernel decides, on a name, at the moment of the call.
 *
 * `updateInstallProvenance` still verifies its write survived and re-applies if it did not. That
 * belt stays: it is what makes a lost update recoverable rather than permanent, and a provenance
 * entry lost to a race is not self-healing — the file stays on disk with no entry, reads as
 * `adopter-owned`, and is never recorded again.
 */
async function acquireRecordLock(recordDir: string): Promise<() => Promise<void>> {
  const lockDir = path.join(recordDir, LOCK_DIR_NAME);
  const marker = randomUUID();
  const staging = path.join(recordDir, `${LOCK_DIR_NAME}.${randomUUID()}.staging`);
  /** The identity of the lock directory this holder published, once it has one. */
  let held: { dev: number; ino: number } | undefined;

  // The marker's mtime is the holder's sign of life, and something has to keep moving it.
  //
  // Review finding [46]: it was stamped once, at acquisition, and a writer whose
  // read-modify-write ran longer than `LOCK_STALE_MS` — a slow disk, a suspended process, a
  // loaded machine — was then reclaimed while it was still inside the section. Two writers in
  // there at once is the lost update this primitive exists to prevent, and it is not
  // self-healing: the file stays on disk with no entry, reads as `adopter-owned`, and is never
  // recorded again.
  //
  // Well under the ceiling, so a holder that is alive at all is renewed several times before it
  // could be judged abandoned; `unref` so a stray interval can never hold the process open, and
  // failures are swallowed because a heartbeat that throws would abort a write that is going
  // fine. What it does NOT do is make a crashed holder look alive: the process is gone, so the
  // timer is gone, and the reclaim is exactly as before.
  const heartbeat = setInterval(() => {
    const now = new Date();
    void utimes(path.join(lockDir, marker), now, now).catch(() => undefined);
  }, LOCK_HEARTBEAT_MS);
  heartbeat.unref();

  /**
   * Give the lock up, removing an object this holder can still identify as its own.
   *
   * Review finding [122]: this was `unlink(lockDir/marker)` then `rmdir(lockDir)`, both
   * resolved through the lock NAME at the moment of the call. Anything that can write `.qfai/`
   * can move the acquired directory aside and leave a symlink to somewhere else in its place —
   * and the marker's name is readable out of the acquired directory, so an external file can be
   * waiting under exactly that name. The unlink then followed the link and deleted it.
   * `refuseLinkedLockPath` cannot help: it runs once, before acquisition.
   *
   * So release does what `clearAbandonedLock` does. `rename` the lock name onto a private one:
   * whatever the name refers to now, the object moves and the NAME is free for the next holder,
   * which is the release. Then ask, of the private object, whether it is the one this holder
   * published — and only then remove it. A `rename` that moved somebody else's lock puts it
   * back.
   *
   * A symlink under the lock name is moved and then left alone, not unlinked. Removing a link
   * somebody else put there is the same class of act this is guarding against, and the next run
   * stops on it with a message naming the path.
   */
  const release = async (): Promise<void> => {
    clearInterval(heartbeat);
    if (held === undefined) return; // never published, so nothing under that name is ours

    // The canonical name is never MOVED, and that is review finding [137].
    //
    // The previous version checked the identity and then renamed the lock aside. Those are two
    // syscalls: a holder that verified its own lock, stalled, was reclaimed as stale and
    // replaced, and then resumed would move its SUCCESSOR's directory — and if a third writer
    // took the freed name, the restore declined and two writers were inside the section at
    // once. Narrowing the window does not close it, because the operation itself acted on a
    // NAME rather than on this holder's object.
    //
    // So it acts on the object. `rmdir` removes a directory only when it is empty, and the
    // only way it becomes empty is this holder unlinking the one marker it created. A
    // successor's lock holds a different marker, so `rmdir` fails on it and nothing moves. The
    // canonical name is freed by the removal succeeding, never ahead of it.
    const standing = await lstat(lockDir).catch(() => undefined);
    if (standing === undefined) return; // already gone
    if (standing.isSymbolicLink() || !standing.isDirectory()) {
      // Swapped for something that is not a lock. Not followed and not removed: taking away a
      // link somebody else put there is the act this whole primitive refuses, and the next run
      // stops on it with the path named. Review finding [122].
      return;
    }
    if (standing.dev !== held.dev || standing.ino !== held.ino) {
      // Somebody else's lock stands at the name — this holder was reclaimed while it worked,
      // and its own directory is already gone. Nothing here is ours.
      return;
    }

    // Both exact, and both scoped to this holder's marker. A stalled holder releasing into a
    // lock that is no longer its own gets `ENOENT` from the unlink and `ENOTEMPTY` from the
    // rmdir, and does no damage — which is the property the very first version of this
    // primitive had, and the one the identity check above restores rather than replaces.
    await unlink(path.join(lockDir, marker)).catch(() => undefined);
    await rmdir(lockDir).catch(() => undefined);
  };

  // The lock path itself, before anything is created or removed under it.
  //
  // Review finding [47]: `ancestorsAreRealDirectories` checks the components ABOVE the record,
  // and this is a leaf beside it. An adopter — or anything that can write `.qfai/` — could
  // leave `.install-provenance.lock.d` as a symlink to a directory outside the tree, and the
  // reclaim below would then enumerate THAT directory and unlink every entry in it older than
  // ten seconds. `qfai init` would delete an arbitrary set of the invoking user's files.
  //
  // Refused rather than repaired: removing a link somebody else put there is the same class of
  // act this is guarding against. The run stops with a message naming the path.
  await refuseLinkedLockPath(lockDir);

  await mkdir(staging, { recursive: true });
  // Read here, under a name nothing else knows, so it is the identity of an object this
  // process made rather than of whatever a path resolves to later. Review finding [134].
  const staged = await lstat(staging).catch(() => undefined);

  // Every failure below leaves the heartbeat renewing a marker this process does not hold, and
  // one of those paths used to escape uncleared: a `staging` that could not be opened threw
  // straight past the `clearInterval` at the foot of the function, leaving an `unref`ed timer
  // stamping a path forever. Cleared in ONE place, so a new failure cannot reintroduce that.
  try {
    if (staged === undefined) {
      // Refused BEFORE the wait, and that ordering is the point. Without an identity there is
      // nothing to recognise a published lock by, so this holder could take the lock and then
      // be unable to claim or release it — an orphan nobody removes until it ages out. Failing
      // here costs a run that has published nothing.
      throw new Error(
        `qfai: could not read back the provenance lock staged at ${staging}. Nothing was ` +
          "written. Re-run once no other `qfai` process is working in this tree.",
      );
    }

    let published = false;
    try {
      const handle = await open(path.join(staging, marker), "wx");
      await handle.close();
      published = await publishLock(staging, lockDir);
    } finally {
      // A successful `rename` consumed `staging`, so this only ever removes an unpublished one.
      await rm(staging, { recursive: true, force: true }).catch(() => undefined);
    }

    if (!published) {
      throw new Error(
        `could not take the install-provenance lock at ${lockDir} within ${String(LOCK_PATIENCE_MS)}ms; another process is writing the record`,
      );
    }

    // Everything from here runs ONCE, and that is the repair rather than a tidying.
    //
    // The stamp and the identity read used to sit inside the wait loop, so a failure in either
    // was caught by the arm that means "the destination was not publishable" and the loop tried
    // again. But the `rename` had already SUCCEEDED, which consumes `staging` — so every
    // remaining attempt renamed a source that no longer existed, and a writer spent the rest of
    // its patience on a guaranteed `ENOENT` before reporting `another process is writing the
    // record`, which by then was false and named the wrong problem. Worse, the lock it had
    // published stayed published with its heartbeat already stopped, so every other writer in
    // the tree stalled a full `LOCK_STALE_MS` on a holder that had given up.
    //
    // Measured under load, with no fault injected: one `lock was replaced` throw, one reclaimer
    // restoring the lock it had moved, then 178 `ENOENT` renames and a lost entry. The loop may
    // only retry a rename that did NOT happen.
    if (!(await confirmPublishedLock(lockDir, marker, staged))) {
      // Given back before the failure is raised, and `release` is what gives it back rather than
      // a second removal written here: it removes the standing lock only when that lock is this
      // holder's object, refuses a name that has become a link, and unlinks one marker by name.
      // Every one of those guards was bought by a review finding, and an acquisition that is
      // about to fail has no better claim to improvise than a release does.
      //
      // Without it a lock published and then not claimed is held by nobody and renewed by
      // nothing, so every other writer in the tree waits out the whole `LOCK_STALE_MS` ceiling
      // before it can reclaim — which is the second half of what this defect cost.
      held = { dev: staged.dev, ino: staged.ino };
      await release();
      throw new Error(
        "qfai: the provenance lock was replaced between publishing it and reading it back. " +
          "Nothing was written. Re-run once no other `qfai` process is working in this tree.",
      );
    }
    held = { dev: staged.dev, ino: staged.ino };
    return release;
  } catch (error) {
    clearInterval(heartbeat);
    throw error;
  }
}

/**
 * Renames the staged directory onto the lock name until it lands, or until patience runs out.
 *
 * The `rename` IS the arbitration: it fails onto a non-empty directory, so exactly one writer
 * publishes and the rest are told the destination is occupied. Age decides what to do about that
 * — `clearAbandonedLock` removes a holder that is gone and leaves one that is working.
 *
 * It answers whether the lock was published rather than throwing, because the two outcomes are
 * not the same kind of event and the caller treats them differently: an unpublished attempt is a
 * contended tree, while a published one hands the caller an object it must now claim or clean up.
 * Retrying is only ever correct for the first, and the loop holds no state that survives the
 * second — the successful `rename` consumes `staging`, so there is nothing left to rename again.
 */
async function publishLock(staging: string, lockDir: string): Promise<boolean> {
  const deadline = Date.now() + LOCK_PATIENCE_MS;
  for (;;) {
    const published = await rename(staging, lockDir).then(
      () => true,
      () => false,
    );
    if (published || Date.now() >= deadline) {
      return published;
    }
    await clearAbandonedLock(lockDir);
    await new Promise((resolve) => setTimeout(resolve, LOCK_POLL_MS));
  }
}

/**
 * Stamps a freshly published lock and confirms it is still the object this holder staged.
 *
 * ## The stamp
 *
 * Applied HERE, at the moment the lock becomes visible. The marker is created once, in the
 * staging directory, before the wait — and renaming a directory does not touch the mtime of a
 * file inside it, so without this the lock enters the world carrying the age of the WAIT rather
 * than of the HOLD. A writer that waited past `LOCK_STALE_MS` published a lock that was already
 * reclaimable, and the heartbeat could not have helped: until the rename there is no
 * `lockDir/<marker>` for it to touch, so every tick during the wait was a swallowed `ENOENT`.
 * The next writer polls every `LOCK_POLL_MS` and the first renewal is up to `LOCK_HEARTBEAT_MS`
 * away, so it wins that race by two orders of magnitude and evicts a holder that is inside the
 * section.
 *
 * ## The identity
 *
 * Compared against the STAGING directory's identity, read before the rename rather than from the
 * lock name after it. Review finding [128] introduced this identity: release used to free the
 * canonical NAME before it could tell whose lock was under it, so a stalled holder that resumed
 * after being reclaimed moved its successor's lock aside. Review finding [134] then found the
 * identity itself taken the wrong way — `lstat(lockDir)` after the rename asks what is at that
 * name NOW, which is not necessarily what was just put there. A `rename` is atomic, so the
 * object that arrived is the object that was staged, and `staged` was read under a private name
 * nothing else could reach.
 *
 * ## Why it is read more than once
 *
 * Because a disagreement is not proof of dispossession. A reclaimer judges a lock stale and then
 * MOVES it, and those are separate syscalls: it can read the PREVIOUS holder's marker as
 * abandoned and have its `rename` land on the lock this holder published a moment later.
 * `clearAbandonedLock` then finds a fresh marker on the object it moved and restores it — same
 * name, same inode, because a `rename` carries the object. A single read taken inside that
 * window sees `ENOENT` and reports a replacement that never happened.
 *
 * So the name is re-read until it answers with the staged object, bounded by `LOCK_CONFIRM_MS`.
 * Nothing is loosened: only an object whose `dev` and `ino` equal the staged one is accepted, so
 * a lock genuinely taken over by somebody else still ends the acquisition — a few polls later
 * instead of on the first read.
 */
async function confirmPublishedLock(
  lockDir: string,
  marker: string,
  staged: { dev: number; ino: number },
): Promise<boolean> {
  const deadline = Date.now() + LOCK_CONFIRM_MS;
  for (;;) {
    const published = new Date();
    await utimes(path.join(lockDir, marker), published, published).catch(() => undefined);
    const arrived = await lstat(lockDir).catch(() => undefined);
    if (arrived !== undefined && arrived.dev === staged.dev && arrived.ino === staged.ino) {
      return true;
    }
    if (Date.now() >= deadline) {
      return false;
    }
    await new Promise((resolve) => setTimeout(resolve, LOCK_POLL_MS));
  }
}

/**
 * Removes an abandoned lock, and only an abandoned one.
 *
 * Everything destructive here acts on an object this call MOVED, never through the lock's name.
 *
 * Review finding [62] is the fourth on this function and the first that could not be answered by
 * checking harder: `lstat` the directory, compare its `dev`/`ino`, `lstat` each marker — and the
 * `unlink` still resolved `lockDir/<marker>` through a parent component a concurrent process could
 * replace one syscall earlier, at which point the removal lands on an external file of the same
 * name. Every version of that repair was an identity check followed by a pathname operation.
 *
 * So the lock is RENAMED to a name nothing else holds, and then examined. `rename` does not follow
 * the final component, so a lock name that has become a symlink arrives as the link itself: it is
 * `lstat`ed, found not to be a directory, and unlinked as a link — its target is never opened,
 * enumerated or removed. A real directory arrives as itself, unreachable by the lock name from
 * that moment on, and every marker path below resolves through a parent no one else can swap.
 *
 * Staleness is judged BEFORE the move and again AFTER it, from the MARKERS — written once at
 * acquisition, refreshed by the holder's heartbeat, so their mtime is the age of the hold. A lock
 * whose holder renewed during the move is put back with `link` + `unlink`, which fails rather than
 * replacing if another writer has published in the meantime.
 *
 * What remains, stated rather than implied: if the restore cannot take the name back, a holder
 * that is still running has lost its lock. That costs a lost update, which
 * `updateInstallProvenance` re-applies around; it does not cost a file outside the tree, which is
 * what every earlier version of this function risked. The two are not the same order of failure,
 * and this is the trade the move makes deliberately.
 *
 * An EMPTY lock directory is removed outright. It holds nobody, and it can only be the residue of
 * a holder that died between its `unlink` and its `rmdir` — left in place it would block every
 * later `rename` permanently, which on Windows is every later acquisition.
 */
async function clearAbandonedLock(lockDir: string): Promise<void> {
  const inspected = await lstat(lockDir).catch(() => undefined);
  if (inspected === undefined) {
    return; // not there: the next `rename` creates it
  }

  // A live holder is judged before anything is moved, so the ordinary contended case never
  // disturbs the lock at all.
  if (inspected.isDirectory() && !inspected.isSymbolicLink()) {
    const before = await markerAges(lockDir);
    if (before === undefined || before.some((age) => age <= LOCK_STALE_MS)) {
      return;
    }
  }

  const quarantine = path.join(
    path.dirname(lockDir),
    `${path.basename(lockDir)}.reclaimed-${randomUUID()}`,
  );
  try {
    await rename(lockDir, quarantine);
  } catch {
    return; // somebody else took it, or it went away; the next attempt reads it afresh
  }

  // From here on the lock name is somebody else's business and this object is ours alone.
  const moved = await lstat(quarantine).catch(() => undefined);
  if (moved === undefined) {
    return;
  }
  if (moved.isSymbolicLink() || !moved.isDirectory()) {
    // The LINK, not its target: `unlink` on a symlink removes the link.
    await unlink(quarantine).catch(() => undefined);
    return;
  }

  const ages = await markerAges(quarantine);
  if (ages === undefined) {
    await rmdir(quarantine).catch(() => undefined);
    return;
  }
  if (ages.length === 0) {
    await rmdir(quarantine).catch(() => undefined);
    return;
  }
  if (ages.some((age) => age <= LOCK_STALE_MS)) {
    // Alive after all — it renewed while we were moving it. Put it back without overwriting a
    // lock somebody has since published.
    await restoreLockDirectory(quarantine, lockDir);
    return;
  }

  await rm(quarantine, { recursive: true, force: true }).catch(() => undefined);
}

/**
 * The age in milliseconds of every marker in a lock directory, or `undefined` when it cannot be
 * read as one.
 *
 * `lstat`, not `stat`: a marker that is itself a link would otherwise be aged by its target's
 * mtime. Anything that is not a regular file is not a marker this primitive wrote, and answering
 * `undefined` for it keeps the caller from treating the directory as abandoned.
 */
async function markerAges(dir: string): Promise<number[] | undefined> {
  const markers = await readdir(dir).catch(() => undefined);
  if (markers === undefined) {
    return undefined;
  }
  const ages: number[] = [];
  for (const held of markers) {
    const observed = await lstat(path.join(dir, held)).catch(() => undefined);
    if (observed === undefined || !observed.isFile()) {
      return undefined;
    }
    // A NEGATIVE age is a marker dated in the future, and it was read as the freshest
    // possible holder. Review finding [67]: a clock rolled back, restored filesystem
    // metadata, or a hostile tree makes `age <= LOCK_STALE_MS` true until the wall clock
    // catches up — so a lock with no process behind it is never reclaimed, and every
    // `qfai init` waits out its whole patience and fails with `another process is writing`.
    //
    // A small tolerance, because a marker written moments ago on a filesystem whose clock is
    // marginally ahead of this process's is ordinary. Past that, the marker says something
    // no live holder could have written, and a marker that cannot be believed is treated as
    // the abandoned one it probably is: reported as older than the ceiling.
    const age = Date.now() - observed.mtimeMs;
    ages.push(age < -LOCK_CLOCK_SKEW_MS ? LOCK_STALE_MS + 1 : age);
  }
  return ages;
}

/**
 * Puts a quarantined lock directory back under its own name, or leaves it where it is.
 *
 * `link` cannot be used on a directory, so this is a `rename` guarded by an existence check — and
 * the check is why the guard is honest about its limit rather than silent: if another writer has
 * published a lock in the interval, the name is theirs and the holder we moved has lost its lock.
 * That is a lost update, which the caller's verify-and-re-apply loop recovers from.
 */
async function restoreLockDirectory(quarantine: string, lockDir: string): Promise<void> {
  if (
    await lstat(lockDir).then(
      () => true,
      () => false,
    )
  ) {
    return;
  }
  await rename(quarantine, lockDir).catch(() => undefined);
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
  // A NULL-prototype map, filled with `defineProperty` — the same shape
  // `extractOtherNamespaces` below already uses, and for the same reason one step further
  // in. Review finding [66]: `workflows["__proto__"] = entry` creates no own property. It
  // REPLACES the prototype of the map, so a record carrying a `__proto__` object with a
  // valid digest, version and timestamp plus a key of its own makes
  // `record.workflows["qfai-tests.yml"]` answer an INHERITED entry — and a first `init` with
  // no file on disk then reads that name as `declined` and never creates it, permanently.
  // `Object.keys` and the serializer never show it, so doctor cannot see the cause either.
  const workflows: Record<string, WorkflowProvenanceEntry> = Object.create(null) as Record<
    string,
    WorkflowProvenanceEntry
  >;
  for (const [name, value] of Object.entries(workflowsValue)) {
    const entry = toWorkflowEntry(value);
    if (entry !== undefined) {
      Object.defineProperty(workflows, name, {
        value: entry,
        writable: true,
        enumerable: true,
        configurable: true,
      });
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
  //
  // TRIMMED, not raw. Review finding [31]: `length === 0` is a check about a string, and
  // the question here is whether the entry names a version. `"   "` answers no and passed,
  // so a record carrying it was kept, and a name whose file is absent then reads as
  // `declined` — the one state `qfai init` never repairs. Whitespace is not a version.
  if (
    !SHA256_HEX_PATTERN.test(sha256) ||
    installedByVersion.trim().length === 0 ||
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
