import { createHash, randomBytes } from "node:crypto";
import { mkdir, open, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { CANONICAL_TIMESTAMP_DIGITS } from "../packLocator.js";
import { isRecord } from "./parse.js";
import type { WorkflowDecision, WorkflowEvent, WorkflowSnapshot } from "./types.js";

export type WriteFile = (filePath: string, content: string | Buffer) => Promise<void>;

export interface IoRefusal {
  code: "io-error";
  message: string;
  cause: string;
}

const BUSY_OR_REFUSED = ["EBUSY", "EPERM", "EACCES"];

function systemCode(error: unknown): string | undefined {
  if (!(error instanceof Error) || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}

// Writes through a temporary name and a rename, so a reader never sees half a file.
export const writeAtomically: WriteFile = async (filePath, content) => {
  const temporary = `${filePath}.${randomBytes(6).toString("hex")}.tmp`;
  await writeFile(temporary, content, "utf8");
  await rename(temporary, filePath);
};

// A busy or refused file is reported once and never retried here: every write operation is
// idempotent, so the harness invoking it again is the retry.
export async function writeRecord(
  filePath: string,
  content: string | Buffer,
  write: WriteFile = writeAtomically,
): Promise<IoRefusal | undefined> {
  try {
    await write(filePath, content);
    return undefined;
  } catch (error) {
    const cause = systemCode(error);
    if (!cause || !BUSY_OR_REFUSED.includes(cause)) throw error;
    const message = "A run file could not be written. Close whatever holds it and try again.";
    return { code: "io-error", message, cause };
  }
}

export const RUNS_DIR = path.join(".qfai", "run");

// `run-` and the canonical timestamp discussion packs use; nothing else under the run directory
// is a run.
const RUN_ID = new RegExp(`^run-\\d{${String(CANONICAL_TIMESTAMP_DIGITS)}}$`);

export function isRunId(name: string): boolean {
  return RUN_ID.test(name);
}

function stamp(at: Date): string {
  const iso = at.toISOString();
  return `${iso.slice(0, 4)}${iso.slice(5, 7)}${iso.slice(8, 10)}${iso.slice(11, 13)}${iso.slice(14, 16)}${iso.slice(17, 19)}${iso.slice(20, 23)}`;
}

export async function listRuns(runsDir: string): Promise<string[]> {
  const entries = await readdir(runsDir, { withFileTypes: true }).catch((error: unknown) => {
    if (systemCode(error) === "ENOENT") return [];
    throw error;
  });
  return entries
    .filter((entry) => entry.isDirectory() && isRunId(entry.name))
    .map((entry) => entry.name)
    .sort();
}

// The ID a new run takes: the time now, moved on a millisecond past any run already there. The
// lock is held while the ID is chosen and the directory made, so the name stays free.
export async function freeRunId(runsDir: string, now: Date): Promise<string> {
  const taken = new Set(await listRuns(runsDir));
  let at = now.getTime();
  while (taken.has(`run-${stamp(new Date(at))}`)) at += 1;
  return `run-${stamp(new Date(at))}`;
}

// Made without `recursive` below the run directory, so an existing run is never reused.
export async function createRunDir(runsDir: string, runId: string): Promise<string> {
  const runDir = path.join(runsDir, runId);
  await mkdir(runDir);
  await mkdir(path.join(runDir, "journal"));
  return runDir;
}

export interface LockOwner {
  pid: number;
  hostname: string;
  worktree: string;
  runId: string | null;
  operation: string;
  startedAt: string;
  token: string;
}

export type LockResult = { ok: true; token: string } | { ok: false; holder: LockOwner | null };

function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return systemCode(error) === "EPERM";
  }
}

async function readLockOwner(lockPath: string): Promise<LockOwner | null> {
  const text = await readFile(lockPath, "utf8").catch(() => "");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;
  const { pid, hostname, worktree, runId, operation, startedAt, token } = parsed;
  if (typeof pid !== "number" || typeof hostname !== "string") return null;
  const field = (value: unknown): string => (typeof value === "string" ? value : "");
  return {
    pid,
    hostname,
    worktree: field(worktree),
    runId: typeof runId === "string" ? runId : null,
    operation: field(operation),
    startedAt: field(startedAt),
    token: field(token),
  };
}

async function discardPendingEvents(runsDir: string, runId: string | null): Promise<void> {
  if (!runId || !isRunId(runId)) return;
  const journal = path.join(runsDir, runId, "journal");
  const names = await readdir(journal).catch(() => []);
  const pending = names.filter((name) => /^\.\d{6}\.tmp$/.test(name));
  await Promise.all(pending.map((name) => rm(path.join(journal, name), { force: true })));
}

// Created exclusively. A lock is taken over only when its owner ran on this host and is no
// longer alive, never on its age; its unpublished event is discarded first.
export async function acquireLock(
  runsDir: string,
  owner: Omit<LockOwner, "pid" | "hostname" | "token" | "startedAt">,
): Promise<LockResult> {
  await mkdir(runsDir, { recursive: true });
  const lockPath = path.join(runsDir, ".lock");
  const stamped: LockOwner = {
    ...owner,
    pid: process.pid,
    hostname: os.hostname(),
    startedAt: new Date().toISOString(),
    token: randomBytes(16).toString("hex"),
  };
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const handle = await open(lockPath, "wx");
      await handle.writeFile(JSON.stringify(stamped), "utf8");
      await handle.close();
      return { ok: true, token: stamped.token };
    } catch (error) {
      if (systemCode(error) !== "EEXIST") throw error;
      const holder = await readLockOwner(lockPath);
      if (!holder || holder.hostname !== os.hostname() || pidAlive(holder.pid)) {
        return { ok: false, holder };
      }
      await discardPendingEvents(runsDir, holder.runId);
      await rm(lockPath, { force: true });
    }
  }
  return { ok: false, holder: await readLockOwner(lockPath) };
}

export async function releaseLock(runsDir: string, token: string): Promise<void> {
  const lockPath = path.join(runsDir, ".lock");
  const holder = await readLockOwner(lockPath);
  if (holder?.token === token) await rm(lockPath, { force: true });
}

// One journal event file: the event and the references it makes, chained by hash.
export type JournalRecord = Omit<WorkflowEvent, "type"> & {
  sequence: number;
  prevHash: string | null;
  event: string;
  operation: string;
  recordedAt: string;
  from?: string;
  to?: string;
  // On `run-created`: what the run is judged against at `finish`, and the worktree and branch
  // it was started in.
  start?: Pick<WorkflowSnapshot, "completionTarget" | "baseline" | "identity">;
  // On an accepted stage result: the stage kind and the reviews the result carried.
  stageKind?: string;
  reviewResults?: NonNullable<WorkflowSnapshot["acceptedStages"]>[number]["reviewResults"];
  // On an accepted stage result: each shared report it named, as copied under the stage.
  reports?: NonNullable<WorkflowSnapshot["acceptedStages"]>[number]["reports"];
  // On an accepted stage result: what its receipt depends on.
  dependencies?: NonNullable<WorkflowSnapshot["acceptedStages"]>[number]["dependencies"];
  testObservation?: string;
  // On an operation's last event: what a replay of that operation returns.
  replay?: WorkflowReplay;
};

// A result ID, a question ID, or the run's stop, with the verdict it was given.
export interface WorkflowReplay {
  key: string;
  payloadDigest?: string;
  answer?: NonNullable<WorkflowSnapshot["answeredQuestions"]>[string]["answer"];
  verdict: WorkflowDecision["verdict"];
}

export type IntegrityFault = "torn-event" | "sequence-gap" | "hash-mismatch";

// A run directory whose journal is not in this format: no journal directory, or a first event
// that parses but is not a record. It is reported as legacy, never as a run.
export type JournalFault = IntegrityFault | "legacy";

export type JournalRead =
  | { ok: true; records: JournalRecord[]; lastHash: string | null }
  | { ok: false; fault: JournalFault };

const EVENT_FILE = /^\d{6}\.json$/;

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function eventName(sequence: number): string {
  return `${String(sequence).padStart(6, "0")}.json`;
}

function isJournalRecord(value: unknown): value is JournalRecord {
  return isRecord(value) && typeof value.sequence === "number" && typeof value.event === "string";
}

// The record an event file holds; `null` for text that is JSON but not a record.
function parseRecord(bytes: Buffer): JournalRecord | null | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(bytes.toString("utf8"));
  } catch {
    return undefined;
  }
  return isJournalRecord(parsed) ? parsed : null;
}

// Every published event from `000001`, with no gap, each chained to the bytes before it.
export async function readJournal(runDir: string): Promise<JournalRead> {
  const journal = path.join(runDir, "journal");
  const listed = await readdir(journal).catch(() => undefined);
  if (!listed) return { ok: false, fault: "legacy" };
  const names = listed.filter((name) => EVENT_FILE.test(name)).sort();
  const records: JournalRecord[] = [];
  let lastHash: string | null = null;
  for (const [index, name] of names.entries()) {
    if (name !== eventName(index + 1)) return { ok: false, fault: "sequence-gap" };
    const bytes = await readFile(path.join(journal, name));
    const record = parseRecord(bytes);
    if (record === null && index === 0) return { ok: false, fault: "legacy" };
    if (!record || record.sequence !== index + 1) return { ok: false, fault: "torn-event" };
    if (record.prevHash !== lastHash) return { ok: false, fault: "hash-mismatch" };
    records.push(record);
    lastHash = sha256(bytes);
  }
  return { ok: true, records, lastHash };
}

// Each event goes to `.NNNNNN.tmp` and is renamed to its published name, which the lock and
// the sequence check make new.
export async function appendRecords(
  runDir: string,
  lastHash: string | null,
  records: Omit<JournalRecord, "prevHash">[],
): Promise<void> {
  const journal = path.join(runDir, "journal");
  let prevHash = lastHash;
  for (const record of records) {
    const bytes = Buffer.from(`${JSON.stringify({ ...record, prevHash }, null, 2)}\n`, "utf8");
    const name = eventName(record.sequence);
    const temporary = path.join(journal, `.${name.replace(".json", "")}.tmp`);
    await writeFile(temporary, bytes);
    await rename(temporary, path.join(journal, name));
    prevHash = sha256(bytes);
  }
}
