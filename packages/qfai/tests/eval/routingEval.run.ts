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
import { cp, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { it } from "vitest";

import { hashAssistantAssetText } from "../../src/shared/text.js";
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

// Where the launcher records each document `npx qfai workflow plan` printed in a seed's run.
const PLAN_LOG = path.join("tmp", "qfai-plans.jsonl");

// Runs this package's build and, for `workflow plan`, appends its one JSON document to the log.
const RECORDER = `import { spawnSync } from "node:child_process";
import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
const args = process.argv.slice(2);
const run = spawnSync(process.execPath, [${JSON.stringify(CLI)}, ...args], {
  stdio: ["inherit", "pipe", "inherit"],
  encoding: "utf8",
});
process.stdout.write(run.stdout ?? "");
if (args[0] === "workflow" && args[1] === "plan") {
  const log = path.join(process.cwd(), ${JSON.stringify(PLAN_LOG)});
  mkdirSync(path.dirname(log), { recursive: true });
  appendFileSync(log, JSON.stringify(JSON.parse(run.stdout)) + "\\n");
}
process.exit(run.status ?? 1);
`;

// The local launcher `npx qfai` resolves in the fixture: this package's build, recording plans.
async function installLauncher(root: string): Promise<void> {
  const bin = path.join(root, "node_modules", ".bin");
  await mkdir(bin, { recursive: true });
  const recorder = path.join(bin, "qfai-recorder.mjs");
  await writeFile(recorder, RECORDER);
  await writeFile(path.join(bin, "qfai"), `#!/bin/sh\nexec node "${recorder}" "$@"\n`, {
    mode: 0o755,
  });
  await writeFile(path.join(bin, "qfai.cmd"), `@node "${recorder}" %*\r\n`);
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

const read = (value: unknown, key: string): unknown =>
  typeof value === "object" && value !== null ? Reflect.get(value, key) : undefined;

// Every document `workflow plan` printed in the seed's run, in order.
async function planDocuments(root: string): Promise<unknown[]> {
  const text = await readFile(path.join(root, PLAN_LOG), "utf8").catch(() => "");
  return text
    .split("\n")
    .filter(Boolean)
    .map((line): unknown => JSON.parse(line));
}

const routesOf = (documents: unknown[]): string[] =>
  documents.map((each) => read(each, "route")).filter((route) => typeof route === "string");

// SIMPLIFIED: observes the route the last plan names and the stage kinds of that plan; whether
// the session asked the user anything is not observed.
// Lift when: a host transcript format is settled, so a question put to the user can be read.
async function observe(root: string, seedId: string) {
  const documents = await planDocuments(root);
  const last = documents.filter((each) => typeof read(each, "route") === "string").at(-1);
  const stages = read(last, "stages");
  const run: RunRecord = {
    seedId,
    route: routesOf(documents).at(-1) ?? null,
    observed: (Array.isArray(stages) ? stages : []).map((stage) => String(read(stage, "kind"))),
    askedQuestion: false,
  };
  return { run, measurements: [] };
}

// What a route evaluation seed is scored on: every route the session planned, in order, and
// `low` where `plan` returned candidates. Plans carry no modifiers.
async function observeRoutes(root: string, seedId: string): Promise<RouteRun> {
  const documents = await planDocuments(root);
  const asked = documents.some((each) => Array.isArray(read(each, "candidates")));
  return { seedId, routes: routesOf(documents), modifiers: [], confidence: asked ? "low" : null };
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
