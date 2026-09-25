import { createHash, randomBytes } from "node:crypto";
import { mkdir, open, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { scopeDigestOf } from "./decide.js";
import type { WorkflowDecision, WorkflowEvent, WorkflowSnapshot } from "./decide.js";
import { isRecord } from "./parse.js";

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

export const RUNS_DIR = path.join(".qfai", "runs");

// `run-` and the 17-digit canonical timestamp; nothing else under the runs directory is a run.
const RUN_ID = /^run-\d{17}$/;

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

// Made without `recursive` below the runs directory, so an existing run is never reused.
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
  // On `run-created`: what the run is judged against at `finish`.
  start?: Pick<WorkflowSnapshot, "completionTarget" | "baseline">;
  // On an accepted stage result: the stage kind and the reviews the result carried.
  stageKind?: string;
  reviewResults?: NonNullable<WorkflowSnapshot["acceptedStages"]>[number]["reviewResults"];
  // On an accepted stage result: each shared report it named, as copied under the stage.
  reports?: NonNullable<WorkflowSnapshot["acceptedStages"]>[number]["reports"];
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

export type JournalRead =
  | { ok: true; records: JournalRecord[]; lastHash: string | null }
  | { ok: false; fault: IntegrityFault };

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

function parseRecord(bytes: Buffer): JournalRecord | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(bytes.toString("utf8"));
  } catch {
    return undefined;
  }
  return isJournalRecord(parsed) ? parsed : undefined;
}

// Every published event from `000001`, with no gap, each chained to the bytes before it.
export async function readJournal(runDir: string): Promise<JournalRead> {
  const journal = path.join(runDir, "journal");
  const names = (await readdir(journal)).filter((name) => EVENT_FILE.test(name)).sort();
  const records: JournalRecord[] = [];
  let lastHash: string | null = null;
  for (const [index, name] of names.entries()) {
    if (name !== eventName(index + 1)) return { ok: false, fault: "sequence-gap" };
    const bytes = await readFile(path.join(journal, name));
    const record = parseRecord(bytes);
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

// The snapshot is the journal folded from its first event; it holds nothing the journal lacks.
export function snapshotOf(records: readonly JournalRecord[]): WorkflowSnapshot | null {
  let snapshot: WorkflowSnapshot | null = null;
  for (const record of records) snapshot = foldRecord(snapshot, record);
  return snapshot;
}

export async function writeSnapshot(
  runDir: string,
  snapshot: WorkflowSnapshot,
): Promise<IoRefusal | undefined> {
  const { digestKey: _private, ...stored } = snapshot;
  const content = `${JSON.stringify({ ...stored, reflects: snapshot.run.sequence }, null, 2)}\n`;
  return writeRecord(path.join(runDir, "snapshot.json"), content);
}

type Snapshot = WorkflowSnapshot;

function withoutWorkOrder(snapshot: Snapshot): Snapshot {
  const { outstandingWorkOrder: _done, ...rest } = snapshot;
  return rest;
}

function foldIssued(snapshot: Snapshot, record: JournalRecord): Snapshot {
  const workOrder = record.workOrder;
  if (!workOrder) return snapshot;
  const attempts = { ...snapshot.attempts, [workOrder.stageInstanceId]: workOrder.attempt };
  const issuedRecordAreas = [
    ...new Set([...(snapshot.issuedRecordAreas ?? []), ...(workOrder.recordAreas ?? [])]),
  ];
  const { issuedRowSet: _previous, ...rest } = snapshot;
  return {
    ...rest,
    outstandingWorkOrder: workOrder,
    attempts,
    issuedRecordAreas,
    ...(record.rowSet ? { issuedRowSet: record.rowSet } : {}),
  };
}

function foldRouted(snapshot: Snapshot, record: JournalRecord): Snapshot {
  const plan = record.plan ?? snapshot.plan;
  const writeScope = record.proposal?.proposedWriteScope ?? plan?.writeScope;
  return {
    ...withoutWorkOrder(snapshot),
    ...(plan ? { plan } : {}),
    ...(record.settled ? { settled: record.settled } : {}),
    ...(writeScope ? { scopeDigest: scopeDigestOf(writeScope) } : {}),
  };
}

function foldQuestion(snapshot: Snapshot, record: JournalRecord): Snapshot {
  const question = record.question;
  if (!question) return snapshot;
  const capabilities = question.capability
    ? [...(snapshot.capabilities ?? []), question.capability]
    : snapshot.capabilities;
  return {
    ...snapshot,
    openQuestions: [...(snapshot.openQuestions ?? []), question],
    ...(capabilities ? { capabilities } : {}),
  };
}

function foldAuthorization(snapshot: Snapshot, record: JournalRecord): Snapshot {
  const authorization = record.authorization;
  if (!authorization) return snapshot;
  const openQuestions = (snapshot.openQuestions ?? []).filter(
    (question) => question.questionId !== authorization.questionId,
  );
  const authorizations = [
    ...(snapshot.authorizations ?? []),
    { authorizationId: authorization.authorizationId, kind: authorization.kind },
  ];
  const approval =
    authorization.operation === "CREATE"
      ? {
          authorizationId: authorization.authorizationId,
          scopeDigest: authorization.scopeDigest,
          kind: authorization.kind,
          operation: authorization.operation,
          effect: authorization.effect,
          ...(authorization.target ? { target: authorization.target } : {}),
        }
      : snapshot.approval;
  return {
    ...snapshot,
    openQuestions,
    authorizations,
    ...(approval ? { approval } : {}),
    ...(record.settled ? { settled: record.settled } : {}),
  };
}

function foldAccepted(snapshot: Snapshot, record: JournalRecord): Snapshot {
  const stage = {
    stageInstanceId: record.stageInstanceId ?? "",
    stageKind: record.stageKind ?? snapshot.outstandingWorkOrder?.stageKind ?? "",
    outcome: record.outcome ?? "",
    ...(record.resultRef ? { receiptRef: record.resultRef } : {}),
    ...(record.gateResults ? { gateResults: record.gateResults } : {}),
    ...(record.reviewResults ? { reviewResults: record.reviewResults } : {}),
    ...(record.debts ? { debts: record.debts } : {}),
    ...(record.reports ? { reports: record.reports } : {}),
  };
  const { halt: _cleared, ...rest } = withoutWorkOrder(snapshot);
  return { ...rest, acceptedStages: [...(snapshot.acceptedStages ?? []), stage] };
}

function foldReplay(snapshot: Snapshot, replay: WorkflowReplay): Snapshot {
  const [kind, id = ""] = replay.key.split(":");
  if (kind === "stop") return { ...snapshot, stopVerdict: replay.verdict };
  if (kind === "question" && replay.answer) {
    const answered = { answer: replay.answer, verdict: replay.verdict };
    return { ...snapshot, answeredQuestions: { ...snapshot.answeredQuestions, [id]: answered } };
  }
  const recorded = { payloadDigest: replay.payloadDigest ?? "", verdict: replay.verdict };
  return { ...snapshot, recordedResults: { ...snapshot.recordedResults, [id]: recorded } };
}

const FOLDS: Record<string, (snapshot: Snapshot, record: JournalRecord) => Snapshot> = {
  "work-order-issued": foldIssued,
  "plan-accepted": foldRouted,
  "unsettled-material-input": foldRouted,
  "question-opened": foldQuestion,
  "authorization-recorded": foldAuthorization,
  "accept-nonfinal-result": foldAccepted,
  "scope-or-obligation-revision": foldAccepted,
  "binding-recorded": (snapshot, record) =>
    record.binding ? { ...snapshot, specBinding: { specId: record.binding.specId } } : snapshot,
  "unrun-or-unresolved-dependency": (snapshot, record) =>
    record.halt ? { ...snapshot, halt: record.halt } : snapshot,
  "missing-capability": (snapshot, record) =>
    record.halt ? { ...snapshot, halt: record.halt } : snapshot,
  "retry-scheduled": (snapshot, record) => ({
    ...snapshot,
    ...(record.workOrder ? { outstandingWorkOrder: record.workOrder } : {}),
    delegationRetries: (snapshot.delegationRetries ?? 0) + 1,
  }),
  "blocker-cleared-and-revalidated": (snapshot) => {
    const { halt: _cleared, ...rest } = snapshot;
    return rest;
  },
};

function created(record: JournalRecord): Snapshot {
  const context = record.executionContext;
  return {
    run: { id: context?.runId ?? "", state: record.to ?? "created", sequence: record.sequence },
    ...(context ? { executionContext: context } : {}),
    ...record.start,
  };
}

// One event applied to the snapshot before it. The state is the one the event file records.
export function foldRecord(snapshot: Snapshot | null, record: JournalRecord): Snapshot {
  if (!snapshot) return created(record);
  const run = {
    ...snapshot.run,
    state: record.to ?? snapshot.run.state,
    sequence: record.sequence,
  };
  const fold = FOLDS[record.event];
  const folded = fold ? fold({ ...snapshot, run }, record) : { ...snapshot, run };
  return record.replay ? foldReplay(folded, record.replay) : folded;
}

// The state each transition event enters; an event not listed changes no state.
const STATE_AFTER_EVENT: Record<string, string> = {
  "run-created": "created",
  "capture-request": "routing",
  "plan-accepted": "ready",
  "unsettled-material-input": "awaiting_input",
  "missing-capability": "blocked",
  "dispatch-work-order": "running",
  "material-decision": "awaiting_input",
  "required-plan-revision": "routing",
  "validated-final-result-and-target": "completed",
  "accept-nonfinal-result": "ready",
  "unrun-or-unresolved-dependency": "blocked",
  "observed-session-interruption": "interrupted",
  "scope-or-obligation-revision": "routing",
  "valid-answer-no-replan": "ready",
  "answer-changes-scope": "routing",
  "blocker-cleared-and-revalidated": "ready",
  "reconciled-resume": "ready",
  "reconciled-with-blocker": "blocked",
  "authorized-stop": "cancelled",
};

// The journal records of one decision, numbered from the run's sequence before it. The last
// record enters the state the verdict reports and carries what a replay returns.
export function recordsOf(
  decision: WorkflowDecision,
  context: { operation: string; before: { state: string; sequence: number } | null },
  extras: (event: WorkflowEvent) => Partial<JournalRecord> = () => ({}),
  replay?: Omit<WorkflowReplay, "verdict">,
): Omit<JournalRecord, "prevHash">[] {
  const recordedAt = new Date().toISOString();
  let state = context.before?.state;
  const records = decision.events.map((event, index) => {
    const { type, ...fields } = event;
    const to = STATE_AFTER_EVENT[type];
    const record = {
      ...fields,
      ...extras(event),
      sequence: (context.before?.sequence ?? 0) + index + 1,
      event: type,
      operation: context.operation,
      recordedAt,
      ...(to ? { ...(state ? { from: state } : {}), to } : {}),
    };
    state = to ?? state;
    return record;
  });
  const last = records.at(-1);
  const final = decision.verdict.run?.state;
  if (last && final && final !== state) Object.assign(last, { from: state, to: final });
  if (last && replay) Object.assign(last, { replay: { ...replay, verdict: decision.verdict } });
  return records;
}
