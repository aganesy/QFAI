import { createHash } from "node:crypto";
import { mkdir, readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";

import { loadConfig, readWorkflowMode } from "../../core/config.js";
import { decide, workOrderDocument } from "../../core/workflow/decide.js";
import type {
  WorkflowDecision,
  WorkflowEvent,
  WorkflowFacts,
  WorkflowInput,
  WorkflowSnapshot,
} from "../../core/workflow/decide.js";
import {
  baselineOf,
  completionFacts,
  ledgerFactsOf,
  routingFacts,
  startFacts,
} from "../../core/workflow/observe.js";
import {
  decisionInputRefusals,
  isRecord,
  stageResultRefusals,
  startInputRefusals,
} from "../../core/workflow/parse.js";
import {
  acquireLock,
  appendRecords,
  createRunDir,
  freeRunId,
  isRunId,
  listRuns,
  readJournal,
  recordsOf,
  releaseLock,
  RUNS_DIR,
  snapshotOf,
  TRACKED_DIR,
  writeRecord,
  writeSnapshot,
  writeTracked,
} from "../../core/workflow/persistence.js";
import type { JournalRecord } from "../../core/workflow/persistence.js";
import type { WorkflowOperation } from "../lib/args.js";
import { resolveToolVersion } from "../../core/version.js";
import { EXIT_CODES } from "../lib/exitCodes.js";

type Verdict = WorkflowDecision["verdict"];
type Run = Verdict["run"];

// One refusal of the adapter's own, in the shape of the output document's `error`.
interface Refusal {
  code: string;
  message: string;
  reasons?: { reason: string; subject: string }[];
  cause?: string;
}

const EXIT_ONE = ["io-error", "torn-event", "sequence-gap", "hash-mismatch"];

// The exit code of one operation: a refusal by its code, and a processed `finish` by whether
// its target was met.
export function workflowExitCode(error: { code: string } | undefined, unmetFinish = false): number {
  if (error) return EXIT_ONE.includes(error.code) ? EXIT_CODES.findings : EXIT_CODES.inputError;
  return unmetFinish ? EXIT_CODES.findings : EXIT_CODES.ok;
}

// Every operation prints exactly one JSON document on stdout.
function emit(document: object): void {
  process.stdout.write(`${JSON.stringify(document, null, 2)}\n`);
}

export function refuse(run: Run, error: Refusal): number {
  emit({ ok: false, run, error });
  return workflowExitCode(error);
}

// The seven operations, one line each: the one output that is not a JSON document.
export const WORKFLOW_HELP = [
  "start     Create a run from the start input named by --in",
  "next      Return the run's next work order, or what the run waits on",
  "accept    Submit a routing or stage result named by --in",
  "decision  Record the operator's answer or stop named by --in",
  "status    Report where the run stands and the mode in force",
  "resume    Revalidate the run and return its work order",
  "finish    Judge completion and report every unmet condition",
].join("\n");

export interface WorkflowOptions {
  root: string;
  operation: WorkflowOperation;
  runId?: string;
  inPath?: string;
}

const TERMINAL = ["completed", "cancelled", "failed"];

interface LoadedRun {
  runId: string;
  runDir: string;
  records: JournalRecord[];
  lastHash: string | null;
  snapshot: WorkflowSnapshot;
}

type Loaded = { ok: true; run: LoadedRun } | { ok: false; run: Run; error: Refusal };

async function digestKeyOf(runDir: string): Promise<string | undefined> {
  const text = await readFile(path.join(runDir, "request.private.json"), "utf8").catch(() => "");
  const parsed: unknown = text ? JSON.parse(text) : undefined;
  return isRecord(parsed) && typeof parsed.digestKey === "string" ? parsed.digestKey : undefined;
}

// The run as its journal holds it. A journal that fails its integrity check derives `failed`.
async function loadRun(runsDir: string, runId: string): Promise<Loaded> {
  const runDir = path.join(runsDir, runId);
  if (!isRunId(runId) || !(await stat(runDir).catch(() => undefined))?.isDirectory()) {
    return { ok: false, run: null, error: { code: "unknown-run", message: UNKNOWN_RUN } };
  }
  const journal = await readJournal(runDir);
  if (!journal.ok) {
    const run = { id: runId, state: "failed", sequence: 0 };
    return { ok: false, run, error: { code: journal.fault, message: INTEGRITY } };
  }
  const folded = snapshotOf(journal.records);
  if (!folded) {
    return { ok: false, run: null, error: { code: "unknown-run", message: UNKNOWN_RUN } };
  }
  if (isNewer(folded.executionContext?.qfaiVersion, await resolveToolVersion())) {
    return { ok: false, run: folded.run, error: { code: "newer-record", message: NEWER_RECORD } };
  }
  const digestKey = await digestKeyOf(runDir);
  const snapshot = digestKey ? { ...folded, digestKey } : folded;
  return { ok: true, run: { runId, runDir, ...journal, snapshot } };
}

const UNKNOWN_RUN = "No run has that ID. Read the status to find the run in progress.";
const NEWER_RECORD = "A newer version of qfai wrote this run. Upgrade qfai to continue it.";

// Whether a recorded package version is later than the running one, by MAJOR.MINOR.PATCH.
function isNewer(recorded: string | undefined, running: string): boolean {
  const parts = (version: string) => version.split(/[.+-]/).slice(0, 3).map(Number);
  const [left, right] = [parts(recorded ?? ""), parts(running)];
  if (left.some(Number.isNaN) || right.some(Number.isNaN)) return false;
  const index = left.findIndex((part, at) => part !== right[at]);
  return index >= 0 && (left[index] ?? 0) > (right[index] ?? 0);
}
const INTEGRITY = "The run's record is damaged, so the run has failed. Start a new run.";

// The worktree's one run that has not ended, or none. A run a newer package wrote is refused.
async function activeRun(runsDir: string): Promise<LoadedRun | Refusal | undefined> {
  for (const runId of (await listRuns(runsDir)).reverse()) {
    const loaded = await loadRun(runsDir, runId);
    if (!loaded.ok && loaded.error.code === "newer-record") return loaded.error;
    if (loaded.ok && !TERMINAL.includes(loaded.run.snapshot.run.state)) return loaded.run;
  }
  return undefined;
}

// The mode in force, or `null` for a value that is none of the three.
async function modeOf(root: string) {
  const { document } = await loadConfig(root);
  return readWorkflowMode(document);
}

async function status(root: string, runsDir: string, runId: string | undefined): Promise<number> {
  const mode = await modeOf(root);
  if (runId === undefined) {
    const active = await activeRun(runsDir);
    if (active && "code" in active) return refuse(null, active);
    if (!active) {
      emit({ ok: true, run: null, mode });
      return EXIT_CODES.ok;
    }
    return reportStatus(active.snapshot, mode);
  }
  const loaded = await loadRun(runsDir, runId);
  if (loaded.ok) return reportStatus(loaded.run.snapshot, mode);
  if (loaded.run && EXIT_ONE.includes(loaded.error.code)) {
    emit({ ok: true, run: loaded.run, mode, cause: loaded.error.code });
    return EXIT_CODES.ok;
  }
  emit({ ok: false, run: loaded.run, mode, error: loaded.error });
  return workflowExitCode(loaded.error);
}

function reportStatus(snapshot: WorkflowSnapshot, mode: string | null): number {
  const { run, outstandingWorkOrder, openQuestions, halt } = snapshot;
  emit({
    ok: true,
    run,
    mode,
    stage: outstandingWorkOrder?.stageInstanceId ?? null,
    workOrder: outstandingWorkOrder
      ? workOrderDocument(run.id, run.sequence, outstandingWorkOrder)
      : null,
    questions: openQuestions ?? [],
    ...(halt ? { halt } : {}),
    debts: (snapshot.acceptedStages ?? []).flatMap((stage) => stage.debts ?? []),
  });
  return EXIT_CODES.ok;
}

type Payload = { ok: true; value: Record<string, unknown>; digest: string } | Refusal;

// An `--in` file: a regular file whose real path lies under the inbox it belongs to.
async function readPayload(root: string, inPath: string | undefined, inbox: string) {
  const refusal: Refusal = {
    code: "invalid-input",
    message: "The input file must sit in the run's inbox under .qfai/runs. Write it there.",
    reasons: [{ reason: "in-path", subject: "--in" }],
  };
  if (!inPath) return refusal;
  const real = await realpath(path.resolve(root, inPath)).catch(() => "");
  const realInbox = await realpath(path.join(root, inbox)).catch(() => "");
  const inside = realInbox !== "" && real.startsWith(`${realInbox}${path.sep}`);
  if (!inside || !(await stat(real)).isFile()) return refusal;
  const text = await readFile(real, "utf8");
  return parsePayload(text);
}

function parsePayload(text: string): Payload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = undefined;
  }
  if (!isRecord(parsed)) {
    const message = "The input file is not a JSON object. Write the payload again.";
    return { code: "invalid-input", message, reasons: [{ reason: "schema", subject: "--in" }] };
  }
  const digest = createHash("sha256").update(JSON.stringify(parsed)).digest("hex");
  return { ok: true, value: parsed, digest };
}

function isRefusal(value: object): value is Refusal {
  return "code" in value && "message" in value;
}

// The document a processed operation prints: the verdict, with a work order in full.
function documentOf(verdict: Verdict): object {
  const { workOrder, run } = verdict;
  if (!workOrder || !run) return verdict;
  return { ...verdict, workOrder: workOrderDocument(run.id, run.sequence, workOrder) };
}

function exitOf(operation: WorkflowOperation, verdict: Verdict): number {
  const unmet = operation === "finish" && verdict.run?.state !== "completed";
  return workflowExitCode(verdict.error, unmet);
}

// The files an event references, written before the event is published.
async function writeReferenced(runDir: string, record: JournalRecord, verdict: Verdict) {
  const workOrder = record.workOrder;
  if (record.event !== "work-order-issued" || !workOrder || !verdict.run) return undefined;
  const dir = path.join(runDir, "work-orders");
  await mkdir(dir, { recursive: true });
  const document = workOrderDocument(verdict.run.id, verdict.run.sequence, workOrder);
  return writeRecord(
    path.join(dir, `${workOrder.workOrderId}.json`),
    `${JSON.stringify(document, null, 2)}\n`,
  );
}

// A shared report a result names is copied under the stage instance that accepted it.
// SIMPLIFIED: `verify.json` is the one shared report copied.
// Lift when: a later stage reads another shared report from its stage copy.
const SHARED_REPORTS = ["verify.json"];

interface ReportCopy {
  path: string;
  digest: string;
  bytes: Buffer;
}

function artifactPaths(result: WorkflowInput["result"]): unknown[] {
  const refs: unknown = result && Reflect.get(result, "artifactRefs");
  if (refs === undefined) return [];
  return Array.isArray(refs) ? refs.map((ref) => (isRecord(ref) ? ref.path : undefined)) : [refs];
}

// Each artifact must be a regular file whose real path stays under the project's real root,
// checked before it is read.
async function reportCopiesOf(root: string, result: WorkflowInput["result"], stage: string) {
  const realRoot = await realpath(root);
  const copies: ReportCopy[] = [];
  for (const [index, ref] of artifactPaths(result).entries()) {
    const real =
      typeof ref === "string" ? await realpath(path.resolve(root, ref)).catch(() => "") : "";
    const inside = real.startsWith(`${realRoot}${path.sep}`);
    if (!inside || !(await stat(real)).isFile()) {
      return schemaRefusal([{ reason: "schema", subject: `artifactRefs[${String(index)}]` }]);
    }
    const name = path.basename(real);
    if (!SHARED_REPORTS.includes(name)) continue;
    const bytes = await readFile(real);
    const digest = createHash("sha256").update(bytes).digest("hex");
    copies.push({ path: `reports/${stage}/${name}`, digest, bytes });
  }
  return copies;
}

async function writeReportCopies(runDir: string, copies: ReportCopy[]) {
  for (const copy of copies) {
    const file = path.join(runDir, ...copy.path.split("/"));
    await mkdir(path.dirname(file), { recursive: true });
    const refused = await writeRecord(file, copy.bytes);
    if (refused) return refused;
  }
  return undefined;
}

// Step 7: once tracked evidence has begun, the tracked files follow the journal. `finish` and a
// run that had already ended leave them as they are.
async function syncTracked(options: WorkflowOptions, loaded: LoadedRun) {
  if (options.operation === "finish" || TERMINAL.includes(loaded.snapshot.run.state)) return;
  const journal = await readJournal(loaded.runDir);
  const snapshot = journal.ok ? snapshotOf(journal.records) : null;
  if (!journal.ok || !snapshot) return undefined;
  const trackedDir = path.join(options.root, TRACKED_DIR, loaded.runId);
  return writeTracked(trackedDir, journal.records, snapshot);
}

// Appends the decision's events and rewrites the snapshot from the whole journal.
async function publish(
  loaded: LoadedRun,
  records: Omit<JournalRecord, "prevHash">[],
  verdict: Verdict,
): Promise<Refusal | undefined> {
  for (const record of records) {
    const refused = await writeReferenced(loaded.runDir, { ...record, prevHash: null }, verdict);
    if (refused) return refused;
  }
  await appendRecords(loaded.runDir, loaded.lastHash, records);
  const journal = await readJournal(loaded.runDir);
  if (!journal.ok) return { code: journal.fault, message: INTEGRITY };
  const snapshot = snapshotOf(journal.records);
  return snapshot ? writeSnapshot(loaded.runDir, snapshot) : undefined;
}

type StageResult = NonNullable<WorkflowInput["result"]>;

function isStageResult(
  value: Record<string, unknown>,
): value is Record<string, unknown> & StageResult {
  return stageResultRefusals(value).length === 0;
}

type DecisionInput = Omit<WorkflowInput, "operation">;

function isDecisionInput(
  value: Record<string, unknown>,
): value is Record<string, unknown> & DecisionInput {
  return decisionInputRefusals(value).length === 0;
}

function isStartInput(
  value: Record<string, unknown>,
): value is Record<string, unknown> & DecisionInput {
  return startInputRefusals(value).length === 0;
}

function schemaRefusal(reasons: { reason: string; subject: string }[]): Refusal {
  const message =
    "The input file does not have the fields this operation takes. Fix it and try again.";
  return { code: "invalid-input", message, reasons };
}

const MISSING_RUN: Refusal = {
  code: "invalid-input",
  message: "Name the run with --run.",
  reasons: [{ reason: "argument", subject: "--run" }],
};

// The operation's input, read from its `--in` file where it takes one.
async function inputOf(
  options: WorkflowOptions,
  loaded: LoadedRun,
): Promise<{ input: WorkflowInput; digest?: string } | Refusal> {
  const { operation } = options;
  if (operation !== "accept" && operation !== "decision") return { input: { operation } };
  const inbox = path.join(RUNS_DIR, loaded.runId, "inbox");
  const payload = await readPayload(options.root, options.inPath, inbox);
  if (isRefusal(payload)) return payload;
  const { value, digest } = payload;
  if (operation === "accept") {
    if (!isStageResult(value)) return schemaRefusal(stageResultRefusals(value));
    return { input: { operation, result: value, payloadDigest: digest }, digest };
  }
  if (!isDecisionInput(value)) return schemaRefusal(decisionInputRefusals(value));
  return { input: { ...value, operation } };
}

async function factsOf(root: string, loaded: LoadedRun, input: WorkflowInput) {
  const { snapshot } = loaded;
  if (input.operation === "finish") return completionFacts(root, loaded.runDir, snapshot);
  if (input.operation === "accept" && snapshot.run.state === "routing") {
    return routingFacts(root, input.result?.proposal);
  }
  if (input.operation === "decision") return { now: new Date().toISOString() };
  return ledgerFacts(root, snapshot, input);
}

// The bound spec's ledger, read when a work order is issued against it and when its result is
// accepted, so the row set can be compared.
async function ledgerFacts(root: string, snapshot: WorkflowSnapshot, input: WorkflowInput) {
  const { state } = snapshot.run;
  const reads =
    (input.operation === "next" && state === "ready") ||
    (input.operation === "accept" && state === "running");
  const specId = snapshot.specBinding?.specId;
  const ledger = reads && specId ? await ledgerFactsOf(root, specId) : undefined;
  return ledger ? { ledger } : {};
}

// What a replay of this operation returns, recorded on its last event.
function replayKey(input: WorkflowInput, decision: WorkflowDecision, digest?: string) {
  if (input.operation === "accept" && input.result) {
    return { key: `result:${input.result.resultId}`, ...(digest ? { payloadDigest: digest } : {}) };
  }
  if (input.operation !== "decision") return undefined;
  if (input.stop === true) return { key: "stop" };
  const answer = decision.events.find((event) => event.authorization)?.authorization?.answer;
  return input.questionId && answer ? { key: `question:${input.questionId}`, answer } : undefined;
}

const ACCEPTED_EVENTS = ["accept-nonfinal-result", "scope-or-obligation-revision"];

// The report copies of a stage result the decision accepts; none for any other operation.
async function acceptedReportCopies(
  root: string,
  snapshot: WorkflowSnapshot,
  input: WorkflowInput,
  decision: WorkflowDecision,
): Promise<ReportCopy[] | Refusal> {
  const stage = snapshot.outstandingWorkOrder?.stageInstanceId;
  const accepted = decision.events.some((event) => ACCEPTED_EVENTS.includes(event.type));
  return accepted && stage ? reportCopiesOf(root, input.result, stage) : [];
}

// What the journal keeps beside an event that the decision does not carry itself.
function extrasOf(
  snapshot: WorkflowSnapshot,
  input: WorkflowInput,
  decision: WorkflowDecision,
  copies: ReportCopy[],
) {
  return (event: WorkflowEvent): Partial<JournalRecord> => {
    if (event.type === "unsettled-material-input" && decision.verdict.plan) {
      return { plan: decision.verdict.plan };
    }
    if (!ACCEPTED_EVENTS.includes(event.type)) return {};
    const stageKind = snapshot.outstandingWorkOrder?.stageKind;
    const reviews = input.result?.reviewResults;
    const reports = copies.map(({ path: file, digest }) => ({ path: file, digest }));
    const testObservation = input.result?.testObservation;
    return {
      ...(stageKind ? { stageKind } : {}),
      ...(testObservation ? { testObservation } : {}),
      ...(reviews ? { reviewResults: reviews } : {}),
      ...(reports.length > 0 ? { reports } : {}),
    };
  };
}

async function decideAndPublish(options: WorkflowOptions, loaded: LoadedRun): Promise<number> {
  const { snapshot } = loaded;
  const read = await inputOf(options, loaded);
  if (isRefusal(read)) return refuse(snapshot.run, read);
  const facts = await factsOf(options.root, loaded, read.input);
  const decision = decide(snapshot, read.input, facts);
  if (decision.events.length > 0) {
    const copies = await acceptedReportCopies(options.root, snapshot, read.input, decision);
    if (!Array.isArray(copies)) return refuse(snapshot.run, copies);
    const records = recordsOf(
      decision,
      { operation: options.operation, before: snapshot.run },
      extrasOf(snapshot, read.input, decision, copies),
      replayKey(read.input, decision, read.digest),
    );
    const unwritten = await writeReportCopies(loaded.runDir, copies);
    if (unwritten) return refuse(snapshot.run, unwritten);
    const refused = await publish(loaded, records, decision.verdict);
    if (refused) return refuse(snapshot.run, refused);
  }
  const untracked = await syncTracked(options, loaded);
  if (untracked) return refuse(snapshot.run, untracked);
  emit(documentOf(decision.verdict));
  return exitOf(options.operation, decision.verdict);
}

function lockHeld(holder: { runId: string | null; operation: string; startedAt: string } | null) {
  const owner = holder
    ? ` by ${holder.operation} on ${holder.runId ?? "a new run"} since ${holder.startedAt}`
    : "";
  const message = `Another write operation holds the lock${owner}. Wait for it to end and try again.`;
  return { code: "lock-held", message };
}

// A write operation holds the lock from before it reads the journal until after it writes.
async function underLock(
  options: WorkflowOptions,
  runId: string | null,
  body: () => Promise<number>,
): Promise<number> {
  const runsDir = path.join(options.root, RUNS_DIR);
  const worktree = await realpath(options.root);
  const lock = await acquireLock(runsDir, { worktree, runId, operation: options.operation });
  if (!lock.ok) return refuse(null, lockHeld(lock.holder));
  try {
    return await body();
  } finally {
    await releaseLock(runsDir, lock.token);
  }
}

async function writeOperation(options: WorkflowOptions): Promise<number> {
  const runId = options.runId;
  if (!runId) return refuse(null, MISSING_RUN);
  return underLock(options, runId, async () => {
    const loaded = await loadRun(path.join(options.root, RUNS_DIR), runId);
    if (!loaded.ok) return refuse(loaded.run, loaded.error);
    return decideAndPublish(options, loaded.run);
  });
}

const COMPLETION_TARGETS = ["qfai_done", "working_tree"] as const;

type CompletionTarget = (typeof COMPLETION_TARGETS)[number];

const INVALID_MODE: Refusal = {
  code: "fail-closed",
  message:
    "workflow.mode in qfai.config.yaml is not active, shadow or off. Correct it and start again.",
  cause: "invalid-mode",
};

function runActive(run: WorkflowSnapshot["run"]): Refusal {
  const message = `Run ${run.id} has not ended; it is ${run.state}. Resume it or stop it first.`;
  return { code: "run-active", message };
}

function completionTargetOf(value: Record<string, unknown>): CompletionTarget | undefined {
  const target = value.completionTarget ?? "qfai_done";
  return COMPLETION_TARGETS.find((known) => known === target);
}

// Step 7 of `start`: the run directory, the private request copy and the first two events.
async function createRun(
  root: string,
  decision: WorkflowDecision,
  input: Record<string, unknown>,
  facts: WorkflowFacts,
): Promise<number> {
  const runsDir = path.join(root, RUNS_DIR);
  const runId = facts.start?.runId ?? "";
  const completionTarget = completionTargetOf(input) ?? "qfai_done";
  const start = { completionTarget, baseline: await baselineOf(root) };
  const runDir = await createRunDir(runsDir, runId);
  const request = { request: input.request, digestKey: facts.start?.digestKey, answers: [] };
  const refused = await writeRecord(
    path.join(runDir, "request.private.json"),
    `${JSON.stringify(request, null, 2)}\n`,
  );
  if (refused) return refuse(null, refused);
  const records = recordsOf(decision, { operation: "start", before: null }, (event) =>
    event.type === "run-created" ? { start } : {},
  );
  await appendRecords(runDir, null, records);
  const snapshot = snapshotOf((await readJournalRecords(runDir)) ?? []);
  const unwritten = snapshot ? await writeSnapshot(runDir, snapshot) : undefined;
  if (unwritten) return refuse(decision.verdict.run, unwritten);
  emit(documentOf(decision.verdict));
  return EXIT_CODES.ok;
}

async function readJournalRecords(runDir: string) {
  const journal = await readJournal(runDir);
  return journal.ok ? journal.records : undefined;
}

async function startUnderLock(options: WorkflowOptions): Promise<number> {
  const runsDir = path.join(options.root, RUNS_DIR);
  const active = await activeRun(runsDir);
  if (active && "code" in active) return refuse(null, active);
  if (active) return refuse(null, runActive(active.snapshot.run));
  const payload = await readPayload(options.root, options.inPath, path.join(RUNS_DIR, "inbox"));
  if (isRefusal(payload)) return refuse(null, payload);
  const { value } = payload;
  const reasons = startInputRefusals(value);
  if (!completionTargetOf(value)) reasons.push({ reason: "schema", subject: "completionTarget" });
  if (!isStartInput(value) || reasons.length > 0) return refuse(null, schemaRefusal(reasons));
  const facts = await startFacts(options.root, await freeRunId(runsDir, new Date()));
  const decision = decide(null, { ...value, operation: "start" }, facts);
  if (!decision.verdict.ok) {
    emit(decision.verdict);
    return exitOf("start", decision.verdict);
  }
  return createRun(options.root, decision, value, facts);
}

// `start` reads the mode first: under `shadow` or `off` it writes nothing and reads no payload.
async function start(options: WorkflowOptions): Promise<number> {
  const mode = await modeOf(options.root);
  if (mode === null) return refuse(null, INVALID_MODE);
  if (mode !== "active") {
    emit({ ok: true, run: null, mode });
    return EXIT_CODES.ok;
  }
  return underLock(options, null, () => startUnderLock(options));
}

// One operation of `qfai workflow`, printing one JSON document and returning its exit code.
export async function runWorkflow(options: WorkflowOptions): Promise<number> {
  if (options.operation === "status") {
    return status(options.root, path.join(options.root, RUNS_DIR), options.runId);
  }
  if (options.operation === "start") return start(options);
  return writeOperation(options);
}
