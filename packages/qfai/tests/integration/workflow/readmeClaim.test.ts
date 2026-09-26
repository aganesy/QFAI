// QFAI:AC-0001-0201-03
// QFAI:AC-0001-0201-04
// QFAI:EX-0001-0201-09
// QFAI:EX-0001-0201-11
// QFAI:EX-0001-0201-12

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

it("The READMEs claim exactly the hosts with a passing eval record for this version: none", async () => {
  const current = await version();
  const all = await readmes();

  expect({
    claimed: Object.values(all).map((readme) => claimedHosts(readme)),
    recorded: recordedHosts(await records(), current),
    problems: claimProblems(all, await records(), current),
  }).toEqual({ claimed: [[], []], recorded: [], problems: [] });
});

it("A copy of the READMEs claiming a host that has no record fails the check", async () => {
  const current = await version();

  expect(claimProblems(await claimingCopies(), [], current)).toEqual([
    `README.md: \`claude-code\` is claimed with no passing record for ${current}`,
    `packages/qfai/README.md: \`claude-code\` is claimed with no passing record for ${current}`,
  ]);
});

it("A record for an older package version supports no claim, and one for this version does", async () => {
  const current = await version();
  const older = { host: "claude-code", version: "0.0.1", verdict: { blocked: false } };
  const recorded = { ...older, version: current };
  const blocked = { ...recorded, verdict: { blocked: true } };
  const unsupported = [
    `README.md: \`claude-code\` is claimed with no passing record for ${current}`,
    `packages/qfai/README.md: \`claude-code\` is claimed with no passing record for ${current}`,
  ];

  expect({
    older: claimProblems(await claimingCopies(), [older], current),
    blocked: claimProblems(await claimingCopies(), [blocked], current),
    current: claimProblems(await claimingCopies(), [recorded], current),
  }).toEqual({ older: unsupported, blocked: unsupported, current: [] });
});

it("Both READMEs put the free-text entry first and name the words the operator types", async () => {
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

it("Neither the operating-model sequence diagram nor the tutorial has the operator typing a stage", async () => {
  expect(Object.values(await readmes()).map((readme) => typedStageSteps(readme))).toEqual([[], []]);
});

it("A copy with a tutorial step telling the operator to type /qfai-sdd is caught", async () => {
  const step = "2. Run `/qfai-sdd` to write the story tree.";
  const copies = Object.values(await readmes()).map((readme) =>
    readme.split("## Minimal tutorial\n\n").join(`## Minimal tutorial\n\n${step}\n`),
  );

  expect(copies.map((copy) => typedStageSteps(copy))).toEqual([[step], [step]]);
});
