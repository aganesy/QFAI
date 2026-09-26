/**
 * What the `npx qfai workflow` journeys share. Each drives the built CLI in a `qfai init`
 * project through the operations a harness calls, with the results a stage would submit.
 * Everything crosses the process boundary as JSON, so a journey depends on the command's
 * contract and on none of the modules behind it.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashAssistantAssetText } from "../../src/core/assistantAssetProvenance.js";
import { removeTempTree } from "../helpers/tempTree.js";

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const CLI = path.join(PACKAGE_ROOT, "dist", "cli", "index.mjs");

export const CAPABILITIES: Readonly<Record<string, boolean>> = Object.fromEntries(
  [
    "fetchSkillBody",
    "invokeStage",
    "delegateSubAgent",
    "relayQuestion",
    "runShellAndTests",
    "writeProjectRoot",
    "keepRunRecord",
    "resume",
  ].map((capability) => [capability, true]),
);

export const REQUEST =
  "Let each customer register up to five notification addresses, with no duplicates.";

export const START_INPUT = {
  request: { text: REQUEST },
  completionTarget: "qfai_done",
  harness: { host: "claude-code", capabilities: CAPABILITIES },
};

/** A discovery proposal: its plan binds no flow and runs the discussion stage. */
export const DISCOVERY_PROPOSAL = {
  requestKind: "change",
  candidateRoute: "discovery",
  goal: "Settle what the notification export contains.",
  expectedBehaviorRefs: [{ kind: "request", ref: "request" }],
  observedRefs: [],
  affectedFlowIds: [],
  riskSignals: [],
  unresolvedQuestions: [],
  newStories: [],
  proposedWriteScope: ["docs/**"],
  protectedTargets: [],
  requiredStages: ["discussion"],
  rationale: "What the export contains is not settled.",
};

const roots: string[] = [];

export async function removeProjects(): Promise<void> {
  await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
}

function git(root: string, args: string[]): void {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr}`);
}

/** Commits every change in `root` that git does not ignore. */
export function commitAll(root: string): void {
  git(root, ["add", "-A"]);
  git(root, [
    "-c",
    "user.name=qfai",
    "-c",
    "user.email=qfai@example.com",
    "commit",
    "--allow-empty",
    "-qm",
    "change",
  ]);
}

/**
 * Commits every change and makes the commit the default branch `validate` diffs against: what
 * the project held before any run started.
 */
export function publish(root: string): void {
  commitAll(root);
  git(root, ["update-ref", "refs/remotes/origin/main", "HEAD"]);
}

/**
 * A temp git repository after `qfai init`, published, whose test globs select every `*.test.ts`
 * under `tests/`. The globs are set before any run starts, because `qfai.config.yaml` is policy a
 * run may not change.
 */
export async function initProject(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-journey-"));
  roots.push(root);
  git(root, ["init", "-q"]);
  const init = spawnSync(process.execPath, [CLI, "init", "--yes"], { cwd: root, encoding: "utf8" });
  if (init.status !== 0) throw new Error(`qfai init: ${init.stderr}`);
  const config = path.join(root, "qfai.config.yaml");
  const text = await readFile(config, "utf8");
  await writeFile(
    config,
    text.replace(/^( *)testFileGlobs: \[\]$/m, "$1testFileGlobs:\n$1  - tests/**/*.test.ts"),
  );
  publish(root);
  return root;
}

export interface CliRun {
  status: number;
  stdout: string;
  stderr: string;
  // The one JSON document stdout holds, or undefined when it is not exactly one.
  json: Record<string, unknown> | undefined;
}

function oneDocument(stdout: string): Record<string, unknown> | undefined {
  try {
    const parsed: unknown = JSON.parse(stdout);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? Object.fromEntries(Object.entries(parsed))
      : undefined;
  } catch {
    return undefined;
  }
}

/** Runs the built CLI's `workflow` command in `root`. */
export function workflow(root: string, args: string[]): CliRun {
  const result = spawnSync(process.execPath, [CLI, "workflow", ...args], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });
  return {
    status: result.status ?? -1,
    stdout: result.stdout,
    stderr: result.stderr,
    json: oneDocument(result.stdout),
  };
}

/** The exit code of the built CLI's `validate` over `root`, and the errors it printed. */
export function validateOf(root: string): { exit: number | null; errors: string[] } {
  const run = spawnSync(process.execPath, [CLI, "validate", "--format", "text"], {
    cwd: root,
    encoding: "utf8",
  });
  const errors = `${run.stdout}${run.stderr}`
    .split("\n")
    .filter((line) => line.startsWith("[error]"));
  return { exit: run.status, errors };
}

/** The field of a JSON document at a dotted path, or undefined. */
export function field(document: unknown, dotted: string): unknown {
  let value: unknown = document;
  for (const key of dotted.split(".")) {
    value = typeof value === "object" && value !== null ? Reflect.get(value, key) : undefined;
  }
  return value;
}

/** The array at a dotted path, or an empty array. */
export function list(document: unknown, dotted: string): unknown[] {
  const value = field(document, dotted);
  return Array.isArray(value) ? value : [];
}

/** Writes `text` at the project-relative path `rel`, creating its directory. */
export async function write(root: string, rel: string, text: string): Promise<void> {
  await mkdir(path.dirname(path.join(root, rel)), { recursive: true });
  await writeFile(path.join(root, rel), text);
}

/** A `changedFiles` or `artifactRefs` entry for a file on disk, digested as the core does. */
export async function fileRef(root: string, rel: string) {
  return {
    path: rel,
    digest: hashAssistantAssetText(await readFile(path.join(root, rel), "utf8")),
  };
}

/** Writes a payload into an inbox under `.qfai/run/` and returns its project-relative path. */
export async function inbox(root: string, runId: string | null, name: string, payload: unknown) {
  const dir = runId ? `.qfai/run/${runId}/inbox` : ".qfai/run/inbox";
  const rel = `${dir}/${name}.json`;
  await write(root, rel, JSON.stringify(payload));
  return rel;
}

let submitted = 0;

/** Submits a payload through the run's inbox with the operation named. */
export async function submit(root: string, runId: string, operation: string, payload: unknown) {
  submitted += 1;
  const rel = await inbox(root, runId, `${operation}-${String(submitted)}`, payload);
  return workflow(root, [operation, "--run", runId, "--in", rel]);
}

/** Starts a run in `root` and returns its ID. */
export async function startRun(root: string, input: unknown = START_INPUT): Promise<string> {
  const started = workflow(root, ["start", "--in", await inbox(root, null, "start", input)]);
  const id = field(started.json, "run.id");
  if (typeof id !== "string") throw new Error(`start refused: ${started.stdout}`);
  return id;
}

/** A result for the work order a `next` document names, submitted at the sequence it names. */
export function resultFor(document: unknown, resultId: string, extra: object = {}) {
  const workOrder = field(document, "workOrder");
  return {
    resultId,
    workOrderId: field(workOrder, "workOrderId"),
    stageInstanceId: field(workOrder, "stageInstanceId"),
    attempt: field(workOrder, "attempt"),
    expectedSequence: field(workOrder, "expectedSequence"),
    outcome: "accepted",
    testObservation: "not_applicable",
    actor: { agentInstance: `agent-${resultId}` },
    ...extra,
  };
}

/** Accepts `extra` as the result of the work order `document` names, then issues the next. */
export async function acceptThenNext(
  root: string,
  runId: string,
  document: unknown,
  resultId: string,
  extra: object = {},
) {
  const accepted = await submit(root, runId, "accept", resultFor(document, resultId, extra));
  if (field(accepted.json, "ok") !== true) throw new Error(`${resultId}: ${accepted.stdout}`);
  return { accepted, next: workflow(root, ["next", "--run", runId]) };
}

/** A started run whose routing result for `proposal` has been submitted. */
export async function routedRun(root: string, proposal: object, input: unknown = START_INPUT) {
  const runId = await startRun(root, input);
  const routing = workflow(root, ["next", "--run", runId]);
  const routed = await submit(
    root,
    runId,
    "accept",
    resultFor(routing.json, "route-1", { proposal }),
  );
  return { runId, routing, routed };
}

/** The option of a stored question whose effect is `effect`. */
export function optionWith(question: unknown, effect: string): string {
  const option = list(question, "options").find((each) => field(each, "effect") === effect);
  const optionId = field(option, "optionId");
  if (typeof optionId !== "string") throw new Error(`no ${effect} option`);
  return optionId;
}

/** Answers the question `question` with its option of effect `effect`. */
export async function answer(root: string, runId: string, question: unknown, effect: string) {
  const status = workflow(root, ["status", "--run", runId]);
  return submit(root, runId, "decision", {
    questionId: field(question, "questionId"),
    answer: { optionIds: [optionWith(question, effect)] },
    answeredBy: "operator",
    expectedSequence: field(status.json, "run.sequence"),
  });
}

/** What a work order names: its stage kind, executor, operation and target. */
export function orderOf(document: unknown) {
  return {
    stageKind: field(document, "workOrder.stageKind"),
    skill: field(document, "workOrder.executor.skill"),
    operation: field(document, "workOrder.operation"),
    target: field(document, "workOrder.target"),
  };
}

/** Every file under `root`, project-relative with `/`, except `.git/`. */
export async function filesUnder(root: string): Promise<string[]> {
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) =>
      path.relative(root, path.join(entry.parentPath, entry.name)).split(path.sep).join("/"),
    )
    .filter((rel) => !rel.startsWith(".git/"))
    .sort();
}

/** A digest of every file under `root` except `.git/` and the paths `skip` names. */
export async function treeDigest(root: string, skip: (rel: string) => boolean = () => false) {
  const hash = createHash("sha256");
  for (const rel of (await filesUnder(root)).filter((each) => !skip(each))) {
    hash.update(`${rel}\0`).update(await readFile(path.join(root, rel)));
  }
  return hash.digest("hex");
}

/** The authorization records a run tracked, each parsed. */
export async function authorizationsOf(root: string, runId: string): Promise<unknown[]> {
  const dir = path.join(root, ".qfai", "evidence", "workflow", runId, "authorizations");
  const names = await readdir(dir).catch(() => []);
  return Promise.all(
    names.map(async (name): Promise<unknown> =>
      JSON.parse(await readFile(path.join(dir, name), "utf8")),
    ),
  );
}
