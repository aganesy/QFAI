// QFAI:SPEC-0018:TC-0018-0220
// QFAI:SPEC-0018:TC-0018-0221
// QFAI:SPEC-0018:TC-0018-0222
// QFAI:SPEC-0018:TC-0018-0226
// QFAI:SPEC-0018:TC-0018-0227
// QFAI:SPEC-0018:TC-0018-0228

import { spawnSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, it } from "vitest";

import {
  claimedHosts,
  claimProblems,
  recordedHosts,
  stageFirstRegions,
  typedStageSteps,
} from "../../helpers/readmeClaim.js";

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const REPOSITORY_ROOT = path.resolve(PACKAGE_ROOT, "..", "..");
const RECORDS = path.join(PACKAGE_ROOT, "tests", "eval", "records");

async function text(file: string): Promise<string> {
  return (await readFile(file, "utf8")).split("\r\n").join("\n");
}

// Both READMEs, keyed by their path from the repository root.
async function readmes(): Promise<Record<string, string>> {
  return {
    "README.md": await text(path.join(REPOSITORY_ROOT, "README.md")),
    "packages/qfai/README.md": await text(path.join(PACKAGE_ROOT, "README.md")),
  };
}

async function records(): Promise<unknown[]> {
  const names = await readdir(RECORDS).catch(() => []);
  return Promise.all(
    names
      .filter((name) => name.endsWith(".json"))
      .map(async (name): Promise<unknown> => JSON.parse(await text(path.join(RECORDS, name)))),
  );
}

async function version(): Promise<string> {
  const manifest: unknown = JSON.parse(await text(path.join(PACKAGE_ROOT, "package.json")));
  return String(Reflect.get(Object(manifest), "version"));
}

// A copy of both READMEs in which the supported-host statement claims Claude Code.
const NO_HOST = "No host is declared supported in this release.";
const CLAIM = "- Claude Code (`claude-code`)";

async function claimingCopies(): Promise<Record<string, string>> {
  const copies = Object.entries(await readmes()).map(([name, readme]) => [
    name,
    readme.split(NO_HOST).join(CLAIM),
  ]);
  return Object.fromEntries(copies);
}

it("TC-0018-0220 (TDD-0440): Read both READMEs' ## Agent integrations and the eval records for packages/qfai/package", async () => {
  const current = await version();
  const all = await readmes();
  const recorded = recordedHosts(await records(), current);

  // Each README claims exactly the hosts with a passing record: none until one is committed.
  expect({
    claimed: Object.values(all).map((readme) => claimedHosts(readme)?.sort()),
    problems: claimProblems(all, await records(), current),
  }).toEqual({ claimed: [recorded, recorded], problems: [] });
});

it("TC-0018-0221 (TDD-0441): A temp copy of the READMEs claiming a host that has no record", async () => {
  const current = await version();

  expect(claimProblems(await claimingCopies(), [], current)).toEqual([
    `README.md: \`claude-code\` is claimed with no passing record for ${current}`,
    `packages/qfai/README.md: \`claude-code\` is claimed with no passing record for ${current}`,
  ]);
});

it("TC-0018-0222 (TDD-0442): A record for an older package version", async () => {
  const current = await version();
  const older = { host: "claude-code", version: "0.0.1", verdict: { blocked: false } };
  const recorded = { ...older, version: current };

  expect({
    older: claimProblems(await claimingCopies(), [older], current),
    current: claimProblems(await claimingCopies(), [recorded], current),
  }).toEqual({
    older: [
      `README.md: \`claude-code\` is claimed with no passing record for ${current}`,
      `packages/qfai/README.md: \`claude-code\` is claimed with no passing record for ${current}`,
    ],
    current: [],
  });
});

it("TC-0018-0226 (TDD-0443): Read both READMEs", async () => {
  const all = await readmes();
  const alignment = spawnSync(process.execPath, ["scripts/check-readme-alignment.mjs"], {
    cwd: REPOSITORY_ROOT,
    encoding: "utf8",
  });
  const words = ["continue", "stop", "off", "shadow", "active"];

  expect({
    alignment: alignment.status,
    stageFirst: Object.values(all).map((readme) => stageFirstRegions(readme)),
    missing: Object.values(all).map((readme) =>
      words.filter((word) => !readme.includes(`\`${word}\``)),
    ),
  }).toEqual({ alignment: 0, stageFirst: [[], []], missing: [[], []] });
});

it("TC-0018-0227 (TDD-0444): Read the operating-model sequence diagram and the tutorial of both READMEs", async () => {
  expect(Object.values(await readmes()).map((readme) => typedStageSteps(readme))).toEqual([[], []]);
});

it("TC-0018-0228 (TDD-0445): A temp copy with a tutorial step telling the operator to type /qfai-sdd", async () => {
  const step = "2. Run `/qfai-sdd` to write the specification.";
  const copies = Object.values(await readmes()).map((readme) =>
    readme.split("## Minimal tutorial\n\n").join(`## Minimal tutorial\n\n${step}\n`),
  );

  expect(copies.map((copy) => typedStageSteps(copy))).toEqual([[step], [step]]);
});
