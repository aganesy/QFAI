/**
 * The minimal project a built-CLI workflow case runs `start` in, with no `qfai init`: the
 * package's plans, one stub skill per skill a plan names with an Operations table covering the
 * pairs the plans use, and the shipped manifest holding the required reviewers. The tree is a git
 * repository with everything committed.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parse as parseYaml } from "yaml";

import { removeTempTree } from "../../helpers/tempTree.js";

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const ASSISTANT = path.join(PACKAGE_ROOT, "assets", "init", ".qfai", "assistant");
export const CLI = path.join(PACKAGE_ROOT, "dist", "cli", "index.mjs");

export const CAPABILITIES = Object.fromEntries(
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

export const START_INPUT = {
  request: { text: "Record the export format a customer asked for." },
  completionTarget: "qfai_done",
  harness: { host: "claude-code", capabilities: CAPABILITIES },
};

const roots: string[] = [];

export async function removeProjects(): Promise<void> {
  await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
}

function git(root: string, args: string[]): void {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr}`);
}

// Every (skill, operation) pair the package's plans use.
async function planPairs(): Promise<Map<string, Set<string>>> {
  const dir = path.join(ASSISTANT, "process", "workflows");
  const pairs = new Map<string, Set<string>>();
  for (const name of await readdir(dir)) {
    const plan: unknown = parseYaml(await readFile(path.join(dir, name), "utf8"));
    const stages: unknown[] =
      typeof plan === "object" && plan !== null && "stages" in plan && Array.isArray(plan.stages)
        ? plan.stages
        : [];
    for (const stage of stages) {
      if (typeof stage !== "object" || stage === null) continue;
      const skills: unknown = "skill" in stage ? stage.skill : undefined;
      const operation = "operation" in stage ? String(stage.operation) : "";
      for (const skill of Array.isArray(skills) ? skills : [skills]) {
        pairs.set(String(skill), (pairs.get(String(skill)) ?? new Set()).add(operation));
      }
    }
  }
  return pairs;
}

async function writeStubSkills(root: string): Promise<void> {
  for (const [skill, operations] of await planPairs()) {
    const dir = path.join(root, ".qfai", "assistant", "skills", skill, "references");
    await mkdir(dir, { recursive: true });
    const rows = [...operations].map((operation) => `| \`${operation}\` | stub |`);
    const table = ["## Operations", "", "| Operation | What |", "| --- | --- |", ...rows];
    await writeFile(path.join(dir, "orchestrated-mode.md"), `# ${skill}\n\n${table.join("\n")}\n`);
  }
}

/** A temp git repository holding the minimal project, with an optional `qfai.config.yaml`. */
export async function minimalProject(config?: string, prefix = "qfai-workflow-"): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), prefix));
  roots.push(root);
  const assistant = path.join(root, ".qfai", "assistant");
  await cp(
    path.join(ASSISTANT, "process", "workflows"),
    path.join(assistant, "process", "workflows"),
    {
      recursive: true,
    },
  );
  await cp(path.join(ASSISTANT, "manifest"), path.join(assistant, "manifest"), { recursive: true });
  await writeStubSkills(root);
  if (config !== undefined) await writeFile(path.join(root, "qfai.config.yaml"), config);
  await writeFile(path.join(root, ".gitignore"), "/.qfai/runs/\n");
  git(root, ["init", "-q"]);
  git(root, ["add", "-A"]);
  git(root, ["-c", "user.name=qfai", "-c", "user.email=qfai@example.com", "commit", "-qm", "init"]);
  return root;
}

const DISCUSSION_PACK = "discussion-20260923171450572";
const REPOSITORY_ROOT = path.resolve(PACKAGE_ROOT, "..", "..");

/**
 * A temp git repository after `qfai init`, whose validate reports no error: the steering
 * placeholders are filled and this repository's own discussion pack is copied in.
 */
export async function initProject(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-workflow-"));
  roots.push(root);
  git(root, ["init", "-q"]);
  const init = spawnSync(process.execPath, [CLI, "init", "--yes"], { cwd: root, encoding: "utf8" });
  if (init.status !== 0) throw new Error(`qfai init: ${init.stderr}`);
  for (const name of ["manifest", "product", "structure", "tech"]) {
    const file = path.join(root, ".qfai", "assistant", "catalog", `${name}.md`);
    await writeFile(file, (await readFile(file, "utf8")).replace(/<[^<>\n]+>/g, "none"));
  }
  await cp(
    path.join(REPOSITORY_ROOT, ".qfai", "discussion", DISCUSSION_PACK),
    path.join(root, ".qfai", "discussion", DISCUSSION_PACK),
    { recursive: true },
  );
  commitAll(root);
  return root;
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
    "run",
  ]);
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
  const stdout = result.stdout;
  return { status: result.status ?? -1, stdout, stderr: result.stderr, json: oneDocument(stdout) };
}

/** Writes a payload into an inbox under `.qfai/runs/` and returns its project-relative path. */
export async function inbox(root: string, runId: string | null, name: string, payload: unknown) {
  const dir = runId
    ? path.join(".qfai", "runs", runId, "inbox")
    : path.join(".qfai", "runs", "inbox");
  await mkdir(path.join(root, dir), { recursive: true });
  const file = path.join(dir, `${name}.json`);
  await writeFile(path.join(root, file), JSON.stringify(payload));
  return file;
}

/** A digest of every file under `root` except `.git/` and the paths `skip` names. */
export async function treeDigest(root: string, skip: (rel: string) => boolean = () => false) {
  const hash = createHash("sha256");
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) =>
      path.relative(root, path.join(entry.parentPath, entry.name)).split(path.sep).join("/"),
    )
    .filter((rel) => !rel.startsWith(".git/") && !skip(rel))
    .sort();
  for (const rel of files) hash.update(`${rel}\0`).update(await readFile(path.join(root, rel)));
  return hash.digest("hex");
}

/** The field of a JSON document at a dotted path, or undefined. */
export function field(document: unknown, dotted: string): unknown {
  let value: unknown = document;
  for (const key of dotted.split(".")) {
    value = typeof value === "object" && value !== null ? Reflect.get(value, key) : undefined;
  }
  return value;
}

/** Starts a run in `root` and returns its ID. */
export async function startRun(root: string, input: unknown = START_INPUT): Promise<string> {
  const started = workflow(root, ["start", "--in", await inbox(root, null, "start", input)]);
  const id = field(started.json, "run.id");
  if (typeof id !== "string") throw new Error(`start refused: ${started.stdout}`);
  return id;
}

/** A routing proposal for the discovery route, which needs no spec and no approval. */
export const DISCOVERY_PROPOSAL = {
  requestKind: "change",
  candidateRoute: "discovery",
  goal: "Settle what the export should contain.",
  expectedBehaviorRefs: [{ kind: "request", ref: "request" }],
  observedRefs: [],
  affectedSpecIds: [],
  riskSignals: [],
  unresolvedQuestions: [],
  newCapabilities: [],
  proposedWriteScope: ["docs/**"],
  protectedTargets: [],
  requiredStages: ["discussion"],
};

/** A routing proposal for the feature route, naming one new capability. */
export const FEATURE_PROPOSAL = {
  ...DISCOVERY_PROPOSAL,
  candidateRoute: "feature",
  goal: "Export an order as CSV.",
  newCapabilities: [
    {
      goal: "CSV export of an order",
      covers: ["the order lines"],
      excludes: ["invoices"],
      evidence: ["No spec names an export."],
    },
  ],
  proposedWriteScope: [".qfai/specs/**", "src/**"],
  requiredStages: ["sdd", "implement", "verify"],
};

/** A result for the work order a document names, submitted at the sequence it names. */
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
    ...extra,
  };
}

/** Submits a payload through the run's inbox with the operation named. */
let submitted = 0;

export async function submit(root: string, runId: string, operation: string, payload: unknown) {
  submitted += 1;
  const file = await inbox(root, runId, `${operation}-${String(submitted)}`, payload);
  return workflow(root, [operation, "--run", runId, "--in", file]);
}

/** A started run whose routing result for `proposal` has been submitted. */
export async function routedRun(
  root: string,
  proposal: object = DISCOVERY_PROPOSAL,
  input: unknown = START_INPUT,
) {
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

/** A feature run approved and driven, with canned accepted results, until `next` issues a
 * work order of `stageKind`. Returns the run and that `next` output. */
export async function featureRunAt(root: string, stageKind: string, input: unknown = START_INPUT) {
  const { runId, routed } = await routedRun(root, FEATURE_PROPOSAL, input);
  const approved = await submit(root, runId, "decision", {
    questionId: field(routed.json, "questions.0.questionId"),
    answer: { optionIds: ["create"] },
    answeredBy: "operator",
    expectedSequence: field(routed.json, "run.sequence"),
  });
  if (field(approved.json, "run.state") !== "ready") throw new Error(approved.stdout);
  for (let step = 0; step < 8; step += 1) {
    const issued = workflow(root, ["next", "--run", runId]);
    const kind = field(issued.json, "workOrder.stageKind");
    if (kind === stageKind) return { runId, issued };
    const slotId = field(issued.json, "workOrder.target.slotId");
    const bindings =
      typeof slotId === "string" ? [{ slotId, capabilityId: "CAP-0001", specId: "spec-0001" }] : [];
    const accepted = await submit(
      root,
      runId,
      "accept",
      resultFor(issued.json, `stage-${String(step)}`, bindings.length > 0 ? { bindings } : {}),
    );
    if (field(accepted.json, "ok") !== true) throw new Error(accepted.stdout);
  }
  throw new Error(`no ${stageKind} work order`);
}
