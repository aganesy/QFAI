/**
 * The routing eval, run by a maintainer against one host at release and never by CI:
 *
 *   QFAI_EVAL_HOST=claude-code QFAI_EVAL_COMMAND='["claude", "-p", "{prompt}"]' \
 *     node node_modules/vitest/vitest.mjs run --config tests/eval/vitest.config.ts
 *
 * `QFAI_EVAL_COMMAND` is the host's argv as a JSON array, `{prompt}` standing for the seed's
 * prompt. It is spawned without a shell. Each seed's fixture is built from one `qfai init` base
 * with the local launcher installed; the runner reads what the run recorded, scores every case
 * and writes the eval record to `tests/eval/records/<host>-<version>.json`.
 */
import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { it } from "vitest";

import { hashAssistantAssetText } from "../../src/core/assistantAssetProvenance.js";
import {
  buildSeedFixture,
  evalRecordProblems,
  isSafetyRelevant,
  releaseVerdict,
  scoreCases,
  UnknownFactKeyError,
  type RunRecord,
  type ScoredSeed,
} from "../helpers/routingEval.js";
import { buildBase, FACT_OVERLAYS } from "../helpers/routingEvalOverlays.js";
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

// SIMPLIFIED: observes the route, the stage kinds the run issued work orders for, and whether
// routing asked the operator anything. A story-authoring stage asks for every change it makes,
// so only a question opened before the first stage is dispatched counts as routing asking.
// Lift when: a host transcript format is settled, so the other behaviour a token names can be read.
async function observe(root: string, seedId: string) {
  const runs = (await readdir(path.join(root, ".qfai", "run")).catch(() => [])).filter((name) =>
    /^run-\d{17}$/.test(name),
  );
  const [runId] = runs;
  if (runId === undefined) {
    return { run: { seedId, route: null, observed: [], askedQuestion: false }, measurements: [] };
  }
  const runDir = path.join(root, ".qfai", "run", runId);
  const events = (await jsonFiles(path.join(runDir, "journal"))).map((each) => read(each, "event"));
  const dispatched = events.indexOf("dispatch-work-order");
  const routingEvents = dispatched < 0 ? events : events.slice(0, dispatched);
  const orders = await jsonFiles(path.join(runDir, "work-orders"));
  const summary = (await jsonFiles(path.join(root, ".qfai", "evidence", "workflow", runId)))[0];
  const route = read(summary, "route");
  const run: RunRecord = {
    seedId,
    route: typeof route === "string" ? route : null,
    observed: orders.map((order) => String(read(order, "stageKind"))),
    askedQuestion: routingEvents.includes("question-opened"),
  };
  const results = await jsonFiles(path.join(runDir, "results"));
  return { run, measurements: results.map((result) => read(result, "measurement") ?? null) };
}

async function runSeed(baseRoot: string, seed: Seed, argv: string[]) {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-eval-seed-"));
  try {
    return await runIn(root, baseRoot, seed, argv);
  } finally {
    await removeTempTree(root);
  }
}

async function runIn(root: string, baseRoot: string, seed: Seed, argv: string[]) {
  await cp(baseRoot, root, { recursive: true });
  try {
    await buildSeedFixture(root, seed, FACT_OVERLAYS);
  } catch (error) {
    if (error instanceof UnknownFactKeyError) return { refused: [...error.keys] };
    throw error;
  }
  commit(root);
  const [command = "", ...args] = argv.map((each) =>
    each === "{prompt}" ? seed.userPrompt : each,
  );
  const started = Date.now();
  spawnSync(command, args, { cwd: root, encoding: "utf8", shell: false });
  return { wallClockMs: Date.now() - started, ...(await observe(root, seed.id)) };
}

async function runEval(): Promise<void> {
  const { host, argv } = hostArgv();
  const seedText = await readFile(path.join(FIXTURES, "routing-seeds.jsonl"), "utf8");
  const vocabularyText = await readFile(path.join(FIXTURES, "token-vocabulary.json"), "utf8");
  const vocabulary: Record<string, string> = JSON.parse(vocabularyText);
  const seeds = seedText
    .split("\n")
    .filter(Boolean)
    .map((line): unknown => JSON.parse(line))
    .filter(isSeed);
  const safetyList = seeds
    .filter((seed) => isSafetyRelevant(seed, vocabulary))
    .map((seed) => seed.id);
  const baseRoot = await base();
  const runs: Record<string, Awaited<ReturnType<typeof runSeed>>> = {};
  for (const seed of seeds) runs[seed.id] = await runSeed(baseRoot, seed, argv);
  await removeTempTree(baseRoot);
  const observed = Object.values(runs).flatMap((each) => ("run" in each ? [each.run] : []));
  const cases = scoreCases(seeds, observed).map((score) => ({ ...score, run: runs[score.seedId] }));
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
    verdict: releaseVerdict(cases, safetyList),
    cases,
  };
  const problems = evalRecordProblems(record, seedText);
  if (problems.length > 0) throw new Error(`The eval record is incomplete: ${problems.join(", ")}`);
  await mkdir(RECORDS, { recursive: true });
  await writeFile(
    path.join(RECORDS, `${host}-${version}.json`),
    `${JSON.stringify(record, null, 2)}\n`,
  );
}

it("runs the routing eval against one host", runEval);
