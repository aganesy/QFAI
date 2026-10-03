/**
 * The routing eval and the route evaluation, run by a maintainer against one host at release and
 * never by CI:
 *
 *   QFAI_EVAL_HOST=claude-code QFAI_EVAL_COMMAND='["claude", "-p", "{prompt}"]' \
 *     node node_modules/vitest/vitest.mjs run --config tests/eval/vitest.config.ts
 *
 *   QFAI_EVAL_HOST=codex \
 *     QFAI_EVAL_COMMAND='["codex", "exec", "--sandbox", "workspace-write", "{prompt}"]' \
 *     node node_modules/vitest/vitest.mjs run --config tests/eval/vitest.config.ts
 *
 * `codex exec` starts in a read-only sandbox, where `npx qfai` cannot write its run, so the
 * Codex command asks for a writable workspace.
 *
 * `QFAI_EVAL_COMMAND` is the host's argv as a JSON array, `{prompt}` standing for the seed's
 * prompt. It is spawned without a shell, so on Windows it names an executable such as
 * `codex.exe`, not a `.cmd` shim. Each seed's fixture is built from one `qfai init` base with
 * the local launcher installed; a route evaluation seed runs on the base as it is. The runner
 * reads what each run recorded, scores every case and writes the eval record to
 * `tests/eval/records/<host>-<version>.json`. A failing route evaluation blocks the verdict.
 */
import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { it } from "vitest";

import { hashAssistantAssetText } from "../../src/core/assistantAssetProvenance.js";
import { loadBuiltInPlans } from "../../src/core/workflow/plans.js";
import {
  buildSeedFixture,
  evalRecordProblems,
  isSafetyRelevant,
  releaseVerdict,
  runHost,
  scoreCases,
  UnknownFactKeyError,
  type RunRecord,
  type ScoredSeed,
} from "../helpers/routingEval.js";
import { buildBase, FACT_OVERLAYS } from "../helpers/routingEvalOverlays.js";
import {
  routeEvalVerdict,
  scoreRouteSeeds,
  type RouteRun,
  type RouteSeed,
} from "../helpers/routingEvalRoutes.js";
import { removeTempTree } from "../helpers/tempTree.js";

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const FIXTURES = path.join(PACKAGE_ROOT, "tests", "fixtures", "workflow");
const RECORDS = path.join(PACKAGE_ROOT, "tests", "eval", "records");
const CLI = path.join(PACKAGE_ROOT, "dist", "cli", "index.mjs");

interface Seed extends ScoredSeed {
  userPrompt: string;
}

function isSeed(value: unknown): value is Seed {
  return (
    typeof value === "object" && value !== null && "userPrompt" in value && "expected" in value
  );
}

function hostArgv(): { host: string; argv: string[] } {
  const host = process.env.QFAI_EVAL_HOST ?? "";
  const parsed: unknown = JSON.parse(process.env.QFAI_EVAL_COMMAND ?? "null");
  const argv = Array.isArray(parsed) ? parsed.filter((each) => typeof each === "string") : [];
  if (!host || argv.length === 0 || !argv.includes("{prompt}")) {
    throw new Error("Set QFAI_EVAL_HOST and QFAI_EVAL_COMMAND, a JSON argv holding {prompt}.");
  }
  return { host, argv };
}

function git(root: string, args: string[]): void {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr}`);
}

// The local launcher `npx qfai` resolves in the fixture, pointing at this package's build.
async function installLauncher(root: string): Promise<void> {
  const bin = path.join(root, "node_modules", ".bin");
  await mkdir(bin, { recursive: true });
  await writeFile(path.join(bin, "qfai"), `#!/bin/sh\nexec node "${CLI}" "$@"\n`, { mode: 0o755 });
  await writeFile(path.join(bin, "qfai.cmd"), `@node "${CLI}" %*\r\n`);
}

async function base(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-eval-base-"));
  git(root, ["init", "-q"]);
  buildBase(root);
  await installLauncher(root);
  return root;
}

// Commits the fixture, so a run starts on a clean tree.
function commit(root: string): void {
  git(root, ["add", "-A"]);
  git(root, [
    "-c",
    "user.name=qfai",
    "-c",
    "user.email=qfai@example.com",
    "commit",
    "-qm",
    "fixture",
  ]);
}

async function jsonFiles(dir: string): Promise<unknown[]> {
  const names = (await readdir(dir).catch(() => [])).filter((name) => name.endsWith(".json"));
  return Promise.all(
    names
      .sort()
      .map(async (name): Promise<unknown> =>
        JSON.parse(await readFile(path.join(dir, name), "utf8")),
      ),
  );
}

const read = (value: unknown, key: string): unknown =>
  typeof value === "object" && value !== null ? Reflect.get(value, key) : undefined;

// The route the run's journal last decided: the decision rules' choice, or the answer to the
// candidate question. The snapshot's route decision answers when the journal names none. A run
// still waiting on the candidate question has no route yet.
function routeOf(events: unknown[], snapshot: unknown): string | null {
  const decided = events.map((event) =>
    read(event, "event") === "route-decided" ? read(event, "route") : undefined,
  );
  const route =
    decided.reverse().find((each) => typeof each === "string") ??
    read(read(snapshot, "routeDecision"), "route");
  return typeof route === "string" ? route : null;
}

// Whether the run asked the operator anything a seed scores. A story-authoring stage asks for
// every change it makes, so a question opened while an `sdd` work order is the last one issued
// does not count.
function askedQuestion(events: unknown[]): boolean {
  let outstanding: unknown;
  for (const event of events) {
    const name = read(event, "event");
    if (name === "work-order-issued") outstanding = read(read(event, "workOrder"), "stageKind");
    if (name === "question-opened" && outstanding !== "sdd") {
      return true;
    }
  }
  return false;
}

// The directory of the run a seed opened, or `undefined` when it opened none.
async function runDirOf(root: string): Promise<string | undefined> {
  const runs = (await readdir(path.join(root, ".qfai", "run")).catch(() => [])).filter((name) =>
    /^run-\d{17}$/.test(name),
  );
  const [runId] = runs;
  return runId === undefined ? undefined : path.join(root, ".qfai", "run", runId);
}

async function snapshotOf(runDir: string): Promise<unknown> {
  return JSON.parse(await readFile(path.join(runDir, "snapshot.json"), "utf8").catch(() => "null"));
}

// SIMPLIFIED: observes the route, the stage kinds the run issued work orders for, and whether
// the run asked the operator anything a seed scores.
// Lift when: a host transcript format is settled, so the other behaviour a token names can be read.
async function observe(root: string, seedId: string) {
  const runDir = await runDirOf(root);
  if (runDir === undefined) {
    return { run: { seedId, route: null, observed: [], askedQuestion: false }, measurements: [] };
  }
  const events = await jsonFiles(path.join(runDir, "journal"));
  const orders = await jsonFiles(path.join(runDir, "work-orders"));
  const run: RunRecord = {
    seedId,
    route: routeOf(events, await snapshotOf(runDir)),
    observed: orders.map((order) => String(read(order, "stageKind"))),
    askedQuestion: askedQuestion(events),
  };
  const results = await jsonFiles(path.join(runDir, "results"));
  return { run, measurements: results.map((result) => read(result, "measurement") ?? null) };
}

// A modifier as the execution context records it: its name, alone or beside where it came from.
const modifierName = (value: unknown): unknown =>
  typeof value === "string" ? value : read(value, "modifier");

// The confidence of the extraction a routing result carried, on the result or on its proposal.
function confidenceOf(results: unknown[]): string | null {
  for (const result of results) {
    const extraction = read(result, "extraction") ?? read(read(result, "proposal"), "extraction");
    const confidence = read(extraction, "confidence");
    if (typeof confidence === "string") return confidence;
  }
  return null;
}

// What a route evaluation seed is scored on: every route the run accepted a plan for, in order,
// the modifiers the run carries and the confidence it was routed at.
async function observeRoutes(root: string, seedId: string): Promise<RouteRun> {
  const runDir = await runDirOf(root);
  if (runDir === undefined) return { seedId, routes: [], modifiers: [], confidence: null };
  const events = await jsonFiles(path.join(runDir, "journal"));
  const routes = events
    .filter((event) => read(event, "event") === "plan-accepted")
    .map((event) => read(read(event, "plan"), "route"))
    .filter((route) => typeof route === "string");
  const recorded = read(await snapshotOf(runDir), "modifiers");
  const modifiers = (Array.isArray(recorded) ? recorded : [])
    .map(modifierName)
    .filter((name) => typeof name === "string");
  const confidence = confidenceOf(await jsonFiles(path.join(runDir, "results")));
  return { seedId, routes, modifiers, confidence };
}

// Runs the host on `prompt` in `root`, which holds a committed fixture.
function spawnHost(root: string, prompt: string, argv: string[]): number {
  const [command = "", ...args] = argv.map((each) => (each === "{prompt}" ? prompt : each));
  const started = Date.now();
  runHost(command, args, root);
  return Date.now() - started;
}

async function inTempCopy<T>(baseRoot: string, act: (root: string) => Promise<T>): Promise<T> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-eval-seed-"));
  try {
    await cp(baseRoot, root, { recursive: true });
    return await act(root);
  } finally {
    await removeTempTree(root);
  }
}

async function runSeed(baseRoot: string, seed: Seed, argv: string[]) {
  return inTempCopy(baseRoot, async (root) => {
    try {
      await buildSeedFixture(root, seed, FACT_OVERLAYS);
    } catch (error) {
      if (error instanceof UnknownFactKeyError) return { refused: [...error.keys] };
      throw error;
    }
    commit(root);
    const wallClockMs = spawnHost(root, seed.userPrompt, argv);
    return { wallClockMs, ...(await observe(root, seed.id)) };
  });
}

async function runRouteSeed(baseRoot: string, seed: RouteSeed, argv: string[]) {
  return inTempCopy(baseRoot, async (root) => {
    commit(root);
    spawnHost(root, seed.request, argv);
    return observeRoutes(root, seed.id);
  });
}

function jsonLines(text: string): unknown[] {
  return text
    .split("\n")
    .filter(Boolean)
    .map((line): unknown => JSON.parse(line));
}

const isRouteSeed = (value: unknown): value is RouteSeed =>
  typeof read(value, "request") === "string" && typeof read(value, "expected") === "object";

// Scores every route evaluation seed against its run.
async function routeEval(baseRoot: string, argv: string[]) {
  const seedText = await readFile(path.join(FIXTURES, "route-eval-seeds.jsonl"), "utf8");
  const seeds = jsonLines(seedText).filter(isRouteSeed);
  const runs: RouteRun[] = [];
  for (const seed of seeds) runs.push(await runRouteSeed(baseRoot, seed, argv));
  const cases = scoreRouteSeeds(seeds, runs, await loadBuiltInPlans());
  const withRuns = cases.map((score) => ({
    ...score,
    run: runs.find((run) => run.seedId === score.seedId),
  }));
  return {
    seedDigest: hashAssistantAssetText(seedText),
    verdict: routeEvalVerdict(seeds, cases),
    cases: withRuns,
  };
}

async function runEval(): Promise<void> {
  const { host, argv } = hostArgv();
  const seedText = await readFile(path.join(FIXTURES, "routing-seeds.jsonl"), "utf8");
  const vocabularyText = await readFile(path.join(FIXTURES, "token-vocabulary.json"), "utf8");
  const vocabulary: Record<string, string> = JSON.parse(vocabularyText);
  const seeds = jsonLines(seedText).filter(isSeed);
  const safetyList = seeds
    .filter((seed) => isSafetyRelevant(seed, vocabulary))
    .map((seed) => seed.id);
  const baseRoot = await base();
  const runs: Record<string, Awaited<ReturnType<typeof runSeed>>> = {};
  let routes: Awaited<ReturnType<typeof routeEval>>;
  try {
    for (const seed of seeds) runs[seed.id] = await runSeed(baseRoot, seed, argv);
    routes = await routeEval(baseRoot, argv);
  } finally {
    await removeTempTree(baseRoot);
  }
  const observed = Object.values(runs).flatMap((each) => ("run" in each ? [each.run] : []));
  const cases = scoreCases(seeds, observed).map((score) => ({ ...score, run: runs[score.seedId] }));
  const verdict = releaseVerdict(cases, safetyList);
  const { version }: { version: string } = JSON.parse(
    await readFile(path.join(PACKAGE_ROOT, "package.json"), "utf8"),
  );
  const record = {
    host,
    version,
    seedDigest: hashAssistantAssetText(seedText),
    vocabularyDigest: hashAssistantAssetText(vocabularyText),
    safetyList,
    safetyListDigest: hashAssistantAssetText(safetyList.join("\n")),
    verdict: { ...verdict, blocked: verdict.blocked || !routes.verdict.pass },
    cases,
    routes,
  };
  const problems = evalRecordProblems(record, seedText);
  if (problems.length > 0) throw new Error(`The eval record is incomplete: ${problems.join(", ")}`);
  await mkdir(RECORDS, { recursive: true });
  await writeFile(
    path.join(RECORDS, `${host}-${version}.json`),
    `${JSON.stringify(record, null, 2)}\n`,
  );
}

it("runs the routing eval and the route evaluation against one host", runEval);
