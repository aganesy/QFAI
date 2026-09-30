// QFAI:BF-0001
/**
 * E2E: a host is claimed as supported only with its eval record.
 *
 * On a temp tree holding both READMEs, an eval record for the current version is written the way
 * the eval runner writes it, scored from the tracked seeds. The claim check passes for the
 * recorded host, then fails on a host the READMEs claim with no record.
 */
import { mkdir, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, expect, it } from "vitest";

import { hashAssistantAssetText } from "../../src/core/assistantAssetProvenance.js";
import { claimProblems } from "../helpers/readmeClaim.js";
import {
  evalRecordProblems,
  isSafetyRelevant,
  releaseVerdict,
  scoreCases,
  type ScoredSeed,
} from "../helpers/routingEval.js";
import { removeTempTree } from "../helpers/tempTree.js";

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SEEDS = path.join(PACKAGE_ROOT, "tests", "fixtures", "workflow");
const README_NAMES = ["README.md", "packages/qfai/README.md"];
const NO_HOST = "No host is declared supported in this release.";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
});

function isSeed(value: unknown): value is ScoredSeed {
  return typeof value === "object" && value !== null && "expected" in value;
}

// A record for `host`, every seed run exactly as it expects.
async function passingRecord(host: string, version: string) {
  const seedText = await readFile(path.join(SEEDS, "routing-seeds.jsonl"), "utf8");
  const vocabulary: unknown = JSON.parse(
    await readFile(path.join(SEEDS, "token-vocabulary.json"), "utf8"),
  );
  const typed = Object.fromEntries(
    Object.entries(Object(vocabulary)).map(([token, kind]) => [token, String(kind)]),
  );
  const seeds = seedText
    .split("\n")
    .filter(Boolean)
    .map((line): unknown => JSON.parse(line))
    .filter(isSeed);
  const runs = seeds.map((seed) => ({
    seedId: seed.id,
    route: seed.expected.allowedRoutes[0] ?? null,
    observed: [...seed.expected.must],
    askedQuestion: seed.expected.requiresHumanInput,
  }));
  const safetyList = seeds.filter((seed) => isSafetyRelevant(seed, typed)).map((seed) => seed.id);
  const cases = scoreCases(seeds, runs);
  const record = {
    host,
    version,
    seedDigest: hashAssistantAssetText(seedText),
    safetyList,
    verdict: releaseVerdict(cases, safetyList),
    cases,
  };
  return { record, problems: evalRecordProblems(record, seedText) };
}

// Both READMEs as the temp tree holds them, keyed by their path.
async function readmesIn(root: string): Promise<Record<string, string>> {
  const entries = await Promise.all(
    README_NAMES.map(async (name) => [name, await readFile(path.join(root, name), "utf8")]),
  );
  return Object.fromEntries(entries);
}

async function recordsIn(root: string): Promise<unknown[]> {
  const dir = path.join(root, "records");
  return Promise.all(
    (await readdir(dir)).map(async (name): Promise<unknown> =>
      JSON.parse(await readFile(path.join(dir, name), "utf8")),
    ),
  );
}

// Writes both READMEs into `root` with the supported-host statement replaced by `claim`.
async function claiming(root: string, claim: string): Promise<void> {
  for (const name of README_NAMES) {
    const text = await readFile(path.join(PACKAGE_ROOT, "..", "..", name), "utf8");
    await mkdir(path.dirname(path.join(root, name)), { recursive: true });
    await writeFile(
      path.join(root, name),
      text.split("\r\n").join("\n").split(NO_HOST).join(claim),
    );
  }
}

it("an eval record is written, the claim check passes, then fails on a claim with no record", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-claim-"));
  roots.push(root);
  const manifest: unknown = JSON.parse(
    await readFile(path.join(PACKAGE_ROOT, "package.json"), "utf8"),
  );
  const version = String(Reflect.get(Object(manifest), "version"));
  const { record, problems } = await passingRecord("claude-code", version);
  await mkdir(path.join(root, "records"), { recursive: true });
  await writeFile(
    path.join(root, "records", `claude-code-${version}.json`),
    JSON.stringify(record),
  );

  await claiming(root, "- Claude Code (`claude-code`)");
  const recorded = claimProblems(await readmesIn(root), await recordsIn(root), version);
  await claiming(root, "- Claude Code (`claude-code`)\n- Codex (`codex`)");
  const unrecorded = claimProblems(await readmesIn(root), await recordsIn(root), version);

  expect({ problems, blocked: record.verdict.blocked, recorded, unrecorded }).toEqual({
    problems: [],
    blocked: false,
    recorded: [],
    unrecorded: README_NAMES.map(
      (name) => `${name}: \`codex\` is claimed with no passing record for ${version}`,
    ),
  });
});
