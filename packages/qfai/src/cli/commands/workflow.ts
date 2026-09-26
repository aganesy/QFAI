import { createHash } from "node:crypto";
import { mkdir, readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";

import { loadConfig, readWorkflowMode } from "../../core/config.js";
import { boundaryStartOf } from "../../core/workflow/boundary.js";
import { decide, workOrderDocument } from "../../core/workflow/decide.js";
import {
  journalExtrasOf,
  recordsOf,
  snapshotOf,
  TRACKED_DIR,
  writeSnapshot,
  writeTracked,
} from "../../core/workflow/fold.js";
import {
  baselineOf,
  identityOf,
  receiptDependenciesOf,
  routingDependenciesOf,
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
  releaseLock,
  RUNS_DIR,
  writeRecord,
} from "../../core/workflow/persistence.js";
import type { JournalRecord } from "../../core/workflow/persistence.js";
import { obligationFilesOf } from "../../core/workflow/storyFacts.js";
import type {
  WorkflowDecision,
  WorkflowDependency,
  WorkflowFacts,
  WorkflowInput,
  WorkflowResult,
  WorkflowSnapshot,
} from "../../core/workflow/types.js";
import { resolveToolVersion } from "../../core/version.js";
import type { WorkflowOperation } from "../lib/args.js";
import { EXIT_CODES } from "../lib/exitCodes.js";
import { factsOf, isRefusal, parsePayload, readPayload, type Refusal } from "./workflowFacts.js";

type Verdict = WorkflowDecision["verdict"];
type Run = Verdict["run"];

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

const UNKNOWN_RUN = "No run has that ID. Read the status to find the run in progress.";
const INTEGRITY = "The run's record is damaged, so the run has failed. Start a new run.";
const LEGACY = "This run was recorded in a format this version cannot read. Start a new run.";
const NEWER_RECORD = "A newer version of qfai wrote this run. Upgrade qfai to continue it.";

async function digestKeyOf(runDir: string): Promise<string | undefined> {
  const text = await readFile(path.join(runDir, "request.private.json"), "utf8").catch(() => "");
  const parsed = parsePayload(text);
  if (isRefusal(parsed)) return undefined;
  const key = parsed.value.digestKey;
  return typeof key === "string" ? key : undefined;
}

// Whether a recorded package version is later than the running one, by MAJOR.MINOR.PATCH.
function isNewer(recorded: string | undefined, running: string): boolean {
  const parts = (version: string) => version.split(/[.+-]/).slice(0, 3).map(Number);
  const [left, right] = [parts(recorded ?? ""), parts(running)];
  if (left.some(Number.isNaN) || right.some(Number.isNaN)) return false;
  const index = left.findIndex((part, at) => part !== right[at]);
  return index >= 0 && (left[index] ?? 0) > (right[index] ?? 0);
}

// The run as its journal holds it. A journal that fails its integrity check derives `failed`.
async function loadRun(runsDir: string, runId: string): Promise<Loaded> {
  const runDir = path.join(runsDir, runId);
  if (!isRunId(runId) || !(await stat(runDir).catch(() => undefined))?.isDirectory()) {
    return { ok: false, run: null, error: { code: "unknown-run", message: UNKNOWN_RUN } };
  }
  const journal = await readJournal(runDir);
  if (!journal.ok && journal.fault === "legacy") {
    const run = { id: runId, state: "legacy", sequence: 0 };
    return { ok: false, run, error: { code: "unknown-run", message: LEGACY } };
  }
  if (!journal.ok) {
    const run = { id: runId, state: "failed", sequence: 0 };
    return { ok: false, run, error: { code: journal.fault, message: INTEGRITY } };
  }
  const folded = snapshotOf(journal.records);
  if (!folded)
    return { ok: false, run: null, error: { code: "unknown-run", message: UNKNOWN_RUN } };
  if (isNewer(folded.executionContext?.qfaiVersion, await resolveToolVersion())) {
    return { ok: false, run: folded.run, error: { code: "newer-record", message: NEWER_RECORD } };
  }
  const digestKey = await digestKeyOf(runDir);
  const snapshot = digestKey ? { ...folded, digestKey } : folded;
  return { ok: true, run: { runId, runDir, ...journal, snapshot } };
}

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

async function statusOfRun(runsDir: string, runId: string, mode: string | null) {
  const loaded = await loadRun(runsDir, runId);
  if (loaded.ok) return reportStatus(loaded.run.snapshot, mode);
  if (loaded.run?.state === "legacy") {
    emit({ ok: true, run: loaded.run, mode });
    return EXIT_CODES.ok;
  }
  if (loaded.run && EXIT_ONE.includes(loaded.error.code)) {
    emit({ ok: true, run: loaded.run, mode, cause: loaded.error.code });
    return EXIT_CODES.ok;
  }
  emit({ ok: false, run: loaded.run, mode, error: loaded.error });
  return workflowExitCode(loaded.error);
}

// `status` reads the published journal and writes nothing.
async function status(root: string, runsDir: string, runId: string | undefined): Promise<number> {
  const mode = await modeOf(root);
  if (runId !== undefined) return statusOfRun(runsDir, runId, mode);
  const active = await activeRun(runsDir);
  if (active && "code" in active) return refuse(null, active);
  if (!active) {
    emit({ ok: true, run: null, mode });
    return EXIT_CODES.ok;
  }
  return reportStatus(active.snapshot, mode);
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
  const file = path.join(dir, `${workOrder.workOrderId}.json`);
  return writeRecord(file, `${JSON.stringify(document, null, 2)}\n`);
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

function artifactPaths(result: WorkflowResult | undefined): unknown[] {
  const refs: unknown = result && Reflect.get(result, "artifactRefs");
  if (refs === undefined) return [];
  return Array.isArray(refs) ? refs.map((ref) => (isRecord(ref) ? ref.path : undefined)) : [refs];
}

function schemaRefusal(reasons: { reason: string; subject: string }[]): Refusal {
  const message =
    "The input file does not have the fields this operation takes. Fix it and try again.";
  return { code: "invalid-input", message, reasons };
}

// Each artifact must be a regular file whose real path stays under the project's real root,
// checked before it is read.
async function reportCopiesOf(root: string, result: WorkflowResult | undefined, stage: string) {
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

// A snapshot behind the journal, left by a crash after an event was published, is rebuilt from
// the journal before the operation reads it.
async function rebuildStaleSnapshot(loaded: LoadedRun) {
  const text = await readFile(path.join(loaded.runDir, "snapshot.json"), "utf8").catch(() => "");
  const parsed = parsePayload(text);
  if (!isRefusal(parsed) && parsed.value.reflects === loaded.snapshot.run.sequence) {
    return undefined;
  }
  return writeSnapshot(loaded.runDir, loaded.snapshot);
}

// Once tracked evidence has begun, the tracked files follow the journal. `finish` and a run that
// had already ended leave them as they are.
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

const MISSING_RUN: Refusal = {
  code: "invalid-input",
  message: "Name the run with --run.",
  reasons: [{ reason: "schema", subject: "--run" }],
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
    const reasons = stageResultRefusals(value);
    if (reasons.length > 0 || !isStageResult(value)) return schemaRefusal(reasons);
    return { input: { operation, result: value, payloadDigest: digest }, digest };
  }
  const reasons = decisionInputRefusals(value);
  if (reasons.length > 0) return schemaRefusal(reasons);
  return { input: { ...decisionInputOf(value), operation } };
}

// A stage result whose identity fields `stageResultRefusals` has checked.
function isStageResult(
  value: Record<string, unknown>,
): value is Record<string, unknown> & WorkflowResult {
  return stageResultRefusals(value).length === 0;
}

// The fields of a decision input `decisionInputRefusals` has checked.
function decisionInputOf(value: Record<string, unknown>): Omit<WorkflowInput, "operation"> {
  const answer = isRecord(value.answer) ? value.answer : undefined;
  const optionIds = Array.isArray(answer?.optionIds)
    ? answer.optionIds.filter((id): id is string => typeof id === "string")
    : undefined;
  return {
    ...(typeof value.questionId === "string" ? { questionId: value.questionId } : {}),
    ...(answer
      ? {
          answer: {
            ...(optionIds ? { optionIds } : {}),
            ...(typeof answer.value === "string" ? { value: answer.value } : {}),
          },
        }
      : {}),
    ...(typeof value.answeredBy === "string" ? { answeredBy: value.answeredBy } : {}),
    ...(typeof value.expectedSequence === "number"
      ? { expectedSequence: value.expectedSequence }
      : {}),
    ...(value.stop === true ? { stop: true } : {}),
    ...(value.authorization !== undefined ? { authorization: value.authorization } : {}),
  };
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

function routingSettled(decision: WorkflowDecision): boolean {
  return decision.events.some(
    (event) => event.type === "plan-accepted" || event.type === "unsettled-material-input",
  );
}

function acceptsResult(decision: WorkflowDecision): boolean {
  return decision.events.some((event) => ACCEPTED_EVENTS.includes(event.type));
}

// The report copies of a stage result the decision accepts; none for any other operation.
async function acceptedReportCopies(
  root: string,
  snapshot: WorkflowSnapshot,
  input: WorkflowInput,
  decision: WorkflowDecision,
): Promise<ReportCopy[] | Refusal> {
  const stage = snapshot.outstandingWorkOrder?.stageInstanceId;
  return acceptsResult(decision) && stage ? reportCopiesOf(root, input.result, stage) : [];
}

// What the receipt of a stage result the decision accepts depends on; none for anything else.
async function acceptedDependencies(
  root: string,
  snapshot: WorkflowSnapshot,
  input: WorkflowInput,
  decision: WorkflowDecision,
): Promise<WorkflowDependency[]> {
  const workOrder = snapshot.outstandingWorkOrder;
  if (routingSettled(decision)) return routingDependenciesOf(root, input.result?.proposal);
  if (!acceptsResult(decision) || !workOrder || !input.result) return [];
  const target = workOrder.target;
  const flowId = target?.kind === "flow" ? target.flowId : snapshot.flowBinding?.flowId;
  const { config } = await loadConfig(root);
  const obligation = flowId ? await obligationFilesOf(root, config, flowId) : [];
  return receiptDependenciesOf(root, workOrder, input.result, obligation);
}

// The decision's events, the files they reference, and the journal records that publish them.
async function persistDecision(
  options: WorkflowOptions,
  loaded: LoadedRun,
  read: { input: WorkflowInput; digest?: string },
  decision: WorkflowDecision,
): Promise<Refusal | undefined> {
  const { snapshot } = loaded;
  const copies = await acceptedReportCopies(options.root, snapshot, read.input, decision);
  if (!Array.isArray(copies)) return copies;
  const dependencies = await acceptedDependencies(options.root, snapshot, read.input, decision);
  const records = recordsOf(
    decision,
    { operation: options.operation, before: snapshot.run },
    journalExtrasOf(snapshot, read.input, decision, {
      reports: copies.map(({ path: file, digest }) => ({ path: file, digest })),
      dependencies,
    }),
    replayKey(read.input, decision, read.digest),
  );
  const unwritten = await writeReportCopies(loaded.runDir, copies);
  if (unwritten) return unwritten;
  return publish(loaded, records, decision.verdict);
}

async function decideAndPublish(options: WorkflowOptions, loaded: LoadedRun): Promise<number> {
  const { snapshot } = loaded;
  const read = await inputOf(options, loaded);
  if (isRefusal(read)) return refuse(snapshot.run, read);
  const facts = await factsOf(options.root, loaded.runDir, snapshot, read.input);
  const decision = decide(snapshot, read.input, facts);
  if (decision.events.length > 0) {
    const refused = await persistDecision(options, loaded, read, decision);
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
    const stale = await rebuildStaleSnapshot(loaded.run);
    if (stale) return refuse(loaded.run.snapshot.run, stale);
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

async function readJournalRecords(runDir: string) {
  const journal = await readJournal(runDir);
  return journal.ok ? journal.records : undefined;
}

// Step 7 of `start`: the run directory, the private request copy and the first two events.
async function createRun(
  root: string,
  decision: WorkflowDecision,
  input: Record<string, unknown>,
  facts: WorkflowFacts,
): Promise<number> {
  const runId = facts.start?.runId ?? "";
  const start = {
    completionTarget: completionTargetOf(input) ?? "qfai_done",
    baseline: await baselineOf(root),
    identity: await identityOf(root),
    boundary: await boundaryStartOf(root),
  };
  const runDir = await createRunDir(path.join(root, RUNS_DIR), runId);
  const request = { request: input.request, digestKey: facts.start?.digestKey, answers: [] };
  const privateFile = path.join(runDir, "request.private.json");
  const refused = await writeRecord(privateFile, `${JSON.stringify(request, null, 2)}\n`);
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

function startInputOf(value: Record<string, unknown>): WorkflowInput {
  const request =
    isRecord(value.request) && typeof value.request.text === "string"
      ? { text: value.request.text }
      : undefined;
  const harness = isRecord(value.harness) ? value.harness : undefined;
  const capabilities = isRecord(harness?.capabilities) ? harness.capabilities : {};
  const extras = Object.fromEntries(
    Object.entries(value).filter(
      ([key]) => !["request", "completionTarget", "harness"].includes(key),
    ),
  );
  return {
    ...extras,
    operation: "start",
    ...(request ? { request } : {}),
    ...(typeof value.completionTarget === "string"
      ? { completionTarget: value.completionTarget }
      : {}),
    ...(harness
      ? {
          harness: {
            host: typeof harness.host === "string" ? harness.host : "",
            capabilities: Object.fromEntries(
              Object.entries(capabilities).map(([name, reported]) => [name, reported === true]),
            ),
          },
        }
      : {}),
  };
}

async function startUnderLock(options: WorkflowOptions): Promise<number> {
  const runsDir = path.join(options.root, RUNS_DIR);
  const active = await activeRun(runsDir);
  if (active && "code" in active) return refuse(null, active);
  if (active) return refuse(active.snapshot.run, runActive(active.snapshot.run));
  const payload = await readPayload(options.root, options.inPath, path.join(RUNS_DIR, "inbox"));
  if (isRefusal(payload)) return refuse(null, payload);
  const { value } = payload;
  const reasons = startInputRefusals(value);
  if (!completionTargetOf(value)) reasons.push({ reason: "schema", subject: "completionTarget" });
  if (reasons.length > 0) return refuse(null, schemaRefusal(reasons));
  const { config } = await loadConfig(options.root);
  const facts = await startFacts(options.root, config, await freeRunId(runsDir, new Date()));
  const decision = decide(null, { ...startInputOf(value), operation: "start" }, facts);
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
  try {
    if (options.operation === "status") {
      return await status(options.root, path.join(options.root, RUNS_DIR), options.runId);
    }
    if (options.operation === "start") return await start(options);
    return await writeOperation(options);
  } catch (thrown: unknown) {
    // A file system failure still answers with one JSON document; any other failure is a defect
    // and keeps its stack.
    const cause = isRecord(thrown) && typeof thrown.code === "string" ? thrown.code : undefined;
    if (!cause) throw thrown;
    const message = "A project file could not be read or written. Check the path and try again.";
    return refuse(null, { code: "io-error", message, cause });
  }
}
