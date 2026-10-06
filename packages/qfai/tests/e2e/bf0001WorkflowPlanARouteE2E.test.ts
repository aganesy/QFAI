// QFAI:BF-0001
/**
 * E2E: a request's extraction is planned on a fresh `qfai init` project.
 *
 * The plan names every step's installed `STEP.md`, a route named by a branch point is planned
 * the same way, and nothing is written into the project.
 */
import { spawnSync } from "node:child_process";
import { access, mkdtemp, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, expect, it } from "vitest";

import { extraction } from "../helpers/workflowExtraction.js";
import { assertBuiltCliFresh } from "../helpers/builtCli.js";
import { removeTempTree } from "../helpers/tempTree.js";

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CLI = path.join(PACKAGE_ROOT, "dist", "cli", "index.mjs");
assertBuiltCliFresh(CLI);

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
});

function qfai(root: string, args: string[], input?: string) {
  const result = spawnSync(process.execPath, [CLI, ...args], {
    cwd: root,
    encoding: "utf8",
    ...(input === undefined ? {} : { input }),
  });
  return { status: result.status, stdout: result.stdout };
}

async function tree(root: string): Promise<string> {
  return JSON.stringify((await readdir(root, { recursive: true })).sort());
}

interface PlannedDocument {
  route?: string;
  stages?: { steps: { name: string; path: string }[] }[];
  branchPoints?: { step: string; outcomes: { outcome: string; routes: string[] | string }[] }[];
}

it("An intermittent defect is planned, its regression branch is planned by name, and nothing is written", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-plan-e2e-"));
  roots.push(root);
  expect(qfai(root, ["init", "--yes"]).status).toBe(0);
  const before = await tree(root);

  const planned = qfai(
    root,
    ["workflow", "plan", "--in", "-"],
    JSON.stringify(extraction({ intent: "defect", entryFlags: ["intermittent"] })),
  );
  const plan: PlannedDocument = JSON.parse(planned.stdout);
  const paths = (plan.stages ?? []).flatMap((stage) => stage.steps.map((step) => step.path));
  const missing = [];
  for (const file of paths) {
    const found = await access(path.join(root, file)).then(
      () => true,
      () => false,
    );
    if (!found) missing.push(file);
  }
  const regression = plan.branchPoints
    ?.find((point) => point.step === "implement-diagnose")
    ?.outcomes.find((outcome) => outcome.outcome === "regression")?.routes;
  const destination = Array.isArray(regression) ? (regression[0] ?? "") : "";
  const rerouted = qfai(root, ["workflow", "plan", "--route", destination]);
  const reroutedPlan: PlannedDocument = JSON.parse(rerouted.stdout);

  expect({
    status: [planned.status, rerouted.status],
    routes: [plan.route, reroutedPlan.route],
    steps: paths.length > 0,
    missing,
    unchanged: (await tree(root)) === before,
  }).toEqual({
    status: [0, 0],
    routes: ["fix-intermittent", "fix-red-main"],
    steps: true,
    missing: [],
    unchanged: true,
  });
});
