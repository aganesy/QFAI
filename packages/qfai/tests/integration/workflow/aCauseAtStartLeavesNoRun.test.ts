// QFAI:AC-0001-0199-03
// QFAI:EX-0001-0199-06
// Fault seeds: FAULT-023

import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, expect, it } from "vitest";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

import { getInitAssetsDir } from "../../../src/shared/assets.js";
import {
  field,
  inbox,
  initProject,
  minimalProject,
  removeProjects,
  START_INPUT,
  workflow,
} from "./workflowProject.js";

afterEach(removeProjects);

const DEFAULT_ROUTING = path.resolve(getInitAssetsDir(), "..", "defaults", "agent-routing.yml");
const VERIFY_SKILL = path.join(".qfai", "assistant", "skill", "qfai-verify");
const VERIFY_TABLE = path.join(VERIFY_SKILL, "references", "orchestrated-mode.md");

// `start` in `root`, and the run directories it left behind.
async function startIn(root: string) {
  const started = workflow(root, ["start", "--in", await inbox(root, null, "start", START_INPUT)]);
  const runs = await readdir(path.join(root, ".qfai", "run")).catch(() => []);
  return {
    code: field(started.json, "error.code"),
    cause: field(started.json, "error.cause"),
    runs: runs.filter((name) => name.startsWith("run-")),
  };
}

// A `qfai.config.yaml` routing override for `skill`: the package default with the first blocking
// agent of its first phase dropped from every list of that phase.
async function dropBlockingAgent(root: string, skill: string): Promise<void> {
  const routing: unknown = parseYaml(await readFile(DEFAULT_ROUTING, "utf8"));
  const entries: unknown = field(routing, "routing");
  const entry: unknown = Array.isArray(entries)
    ? entries.find((each) => field(each, "skill") === skill)
    : undefined;
  const phase: unknown = field(entry, "phases.0");
  const blocking = field(phase, "blocking_agents");
  const dropped: unknown = Array.isArray(blocking) ? blocking[0] : undefined;
  for (const list of ["mandatory_agents", "blocking_agents"]) {
    const agents = field(phase, list);
    if (Array.isArray(agents) && typeof phase === "object" && phase !== null) {
      Reflect.set(
        phase,
        list,
        agents.filter((agent) => agent !== dropped),
      );
    }
  }
  await writeFile(path.join(root, "qfai.config.yaml"), stringifyYaml({ routing: [entry] }));
}

it("A qfai.config.yaml routing override that drops a required reviewer", async () => {
  const root = await minimalProject();
  await dropBlockingAgent(root, "qfai-implement");

  expect(await startIn(root)).toEqual({
    code: "fail-closed",
    cause: "reviewer-missing",
    runs: [],
  });
});

const table = (header: string, cells: string[]) =>
  ["# qfai-verify", "", "## Operations", "", `| ${header} | What |`, "| --- | --- |"]
    .concat(cells.map((cell) => `| ${cell} | stub |`))
    .join("\n");

const BOUNDARIES: [string, (root: string) => Promise<void>][] = [
  ["skill-missing", (root) => rm(path.join(root, VERIFY_SKILL), { recursive: true, force: true })],
  [
    "operations-table-missing",
    (root) =>
      writeFile(path.join(root, VERIFY_TABLE), "# qfai-verify\n\nServes the verify stage.\n"),
  ],
  [
    "operations-first-column",
    (root) => writeFile(path.join(root, VERIFY_TABLE), table("Mode", ["`verify-full`"])),
  ],
  [
    "operations-cell-not-id",
    (root) =>
      writeFile(path.join(root, VERIFY_TABLE), table("Operation", ["`verify-full`, `verify`"])),
  ],
  [
    "operations-pair-omitted",
    (root) => writeFile(path.join(root, VERIFY_TABLE), table("Operation", ["`diagnose-only`"])),
  ],
];

for (const [title, breakIt] of BOUNDARIES) {
  it(title, async () => {
    const root = await minimalProject();
    await breakIt(root);

    expect(await startIn(root)).toEqual({
      code: "fail-closed",
      cause: "contract-undeclared",
      runs: [],
    });
  });
}

it("A fresh qfai init tree, and the same tree with an override dropping a required reviewer", async () => {
  const root = await initProject();
  const fresh = await startIn(root);
  await rm(path.join(root, ".qfai", "run"), { recursive: true, force: true });
  await dropBlockingAgent(root, "qfai-implement");

  expect({ fresh, dropped: await startIn(root) }).toEqual({
    fresh: { code: undefined, cause: undefined, runs: [expect.stringMatching(/^run-\d{17}$/)] },
    dropped: { code: "fail-closed", cause: "reviewer-missing", runs: [] },
  });
}, 180_000);
