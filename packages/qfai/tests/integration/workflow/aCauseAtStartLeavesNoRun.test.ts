// QFAI:AC-0001-0192-03
// Fault seeds: FAULT-023

import { readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, expect, it } from "vitest";
import { stringify as stringifyYaml } from "yaml";

import { defaultRoutingEntries } from "../../helpers/shippedAssistant.js";
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

const VERIFY_STEP = path.join(".qfai", "assistant", "step", "verify-repo-gate", "STEP.md");

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

// A `qfai.config.yaml` routing override for `step`: the package default with the first blocking
// agent of its first phase dropped from every list of that phase.
async function dropBlockingAgent(root: string, step: string): Promise<void> {
  const entry: unknown = (await defaultRoutingEntries()).find((each) => each.step === step);
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

// QFAI:EX-0001-0192-06
it("A qfai.config.yaml routing override that drops a required reviewer", async () => {
  const root = await minimalProject();
  await dropBlockingAgent(root, "implement-tdd");

  expect(await startIn(root)).toEqual({
    code: "fail-closed",
    cause: "reviewer-missing",
    runs: [],
  });
});

it("step-missing", async () => {
  const root = await minimalProject();
  await rm(path.join(root, VERIFY_STEP), { force: true });

  expect(await startIn(root)).toEqual({
    code: "fail-closed",
    cause: "contract-undeclared",
    runs: [],
  });
});

it("A fresh qfai init tree, and the same tree with an override dropping a required reviewer", async () => {
  const root = await initProject();
  const fresh = await startIn(root);
  await rm(path.join(root, ".qfai", "run"), { recursive: true, force: true });
  await dropBlockingAgent(root, "implement-tdd");

  expect({ fresh, dropped: await startIn(root) }).toEqual({
    fresh: { code: undefined, cause: undefined, runs: [expect.stringMatching(/^run-\d{17}$/)] },
    dropped: { code: "fail-closed", cause: "reviewer-missing", runs: [] },
  });
}, 180_000);
