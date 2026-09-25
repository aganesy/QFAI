// QFAI:AC-0001-0192-05
// QFAI:AC-0001-0195-05
// QFAI:AC-0001-0198-01
// QFAI:AC-0001-0199-03
// QFAI:EX-0001-0192-13
// QFAI:EX-0001-0192-14
// QFAI:EX-0001-0195-08
// QFAI:EX-0001-0198-01
// QFAI:EX-0001-0199-08
// QFAI:EX-0001-0199-09

import { cp, mkdir, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import { loadConfig } from "../../../src/core/config.js";
import { decide } from "../../../src/core/workflow/decide.js";
import {
  checkPlans,
  loadBuiltInPlans,
  packagePlansDir,
  parsePlan,
  type WorkflowPlanFile,
  type WorkflowRoute,
} from "../../../src/core/workflow/plans.js";
import { getInitAssetsDir } from "../../../src/shared/assets.js";
import { removeTempTree } from "../../helpers/tempTree.js";

type Facts = Parameters<typeof decide>[2];

const startFacts: Facts = {
  start: {
    runId: "run-20260925000000010",
    qfaiVersion: "2.0.0",
    digestKey: "d".repeat(64),
    policyDigests: {},
    planDigests: {},
  },
};

const capabilities = Object.fromEntries(
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

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
});

// A minimal project: each shipped skill's Operations table, as `qfai init` leaves it, and an
// optional `qfai.config.yaml`. The plans and the routing stay in the package.
async function project(config?: string): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-plans-"));
  roots.push(root);
  const skills = path.join(getInitAssetsDir(), ".qfai", "assistant", "skill");
  for (const skill of await readdir(skills)) {
    const table = path.join(skill, "references", "orchestrated-mode.md");
    const target = path.join(root, ".qfai", "assistant", "skill", table);
    await mkdir(path.dirname(target), { recursive: true });
    await cp(path.join(skills, table), target).catch(() => undefined);
  }
  if (config !== undefined) await writeFile(path.join(root, "qfai.config.yaml"), config);
  return root;
}

// `start` on the project, with the cause the plan check found in its facts.
async function startOn(root: string) {
  const { config } = await loadConfig(root);
  const check = await checkPlans(root, config);
  const facts = check.cause ? { ...startFacts, cause: check.cause } : startFacts;
  const decision = decide(
    null,
    {
      operation: "start",
      request: { text: "Fix the export." },
      harness: { host: "claude-code", capabilities },
    },
    facts,
  );
  const error = decision.verdict.error;
  return {
    run: decision.verdict.run,
    code: error?.code,
    cause: error && "cause" in error ? error.cause : undefined,
    events: decision.events.length,
    reasons: check.refusals.map((refusal) => refusal.reason),
  };
}

const started = {
  run: { id: "run-20260925000000010", state: "routing", sequence: 2 },
  code: undefined,
  cause: undefined,
  events: 2,
  reasons: [],
};

function shape(plan: WorkflowPlanFile | undefined) {
  return (plan?.stages ?? []).map((stage) => [
    stage.kind,
    stage.skills,
    stage.operation,
    stage.when,
  ]);
}

// Whether every stage has a path to a `verify-full` stage, and the stages nothing follows.
function verifyReach(plan: WorkflowPlanFile | undefined) {
  const stages = plan?.stages ?? [];
  const followers = (id: string) => stages.filter((stage) => stage.after.includes(id));
  const reaches = (id: string): boolean => {
    const stage = stages.find((candidate) => candidate.id === id);
    if (stage?.kind === "verify" && stage.operation === "verify-full") return true;
    return followers(id).some((next) => reaches(next.id));
  };
  return {
    everyStageReachesVerify: stages.length > 0 && stages.every((stage) => reaches(stage.id)),
    ends: stages.filter((stage) => followers(stage.id).length === 0).map((stage) => stage.kind),
  };
}

it("Load the shipped feature", async () => {
  const plans = await loadBuiltInPlans();

  expect(shape(plans.feature)).toEqual([
    ["sdd", ["qfai-sdd"], "new-story", "always"],
    ["prototype", ["qfai-prototyping"], "existing-runtime-contract", "prototype_decision_needed"],
    ["acceptance", ["qfai-atdd"], "author-acceptance-tests", "acceptance_obligations_unmet"],
    ["implement", ["qfai-implement"], "implement", "always"],
    ["verify", ["qfai-verify"], "verify-full", "always"],
  ]);
});

const changeRoutes: WorkflowRoute[] = ["direct", "bugfix", "bounded-change", "feature"];

for (const route of changeRoutes) {
  it(route, async () => {
    const plans = await loadBuiltInPlans();

    expect(verifyReach(plans[route])).toEqual({ everyStageReachesVerify: true, ends: ["verify"] });
  });
}

it("Load the five shipped plans", async () => {
  const plans = await loadBuiltInPlans();
  const stages = Object.values(plans).flatMap((plan) =>
    plan.stages.map((stage) => ({ route: plan.route, ...stage })),
  );

  expect({
    routes: Object.keys(plans).sort(),
    grill: stages.filter((stage) => stage.skills.some((skill) => skill.startsWith("qfai-grill"))),
    discussion: stages
      .filter((stage) => stage.kind === "discussion")
      .map((stage) => [stage.route, stage.when]),
  }).toEqual({
    routes: ["bounded-change", "bugfix", "direct", "discovery", "feature"],
    grill: [],
    discussion: [["discovery", "full_discussion_needed"]],
  });
});

it("Load the shipped direct", async () => {
  const plans = await loadBuiltInPlans();

  expect(shape(plans.direct)).toEqual([
    ["maintenance", ["qfai-maintain"], "non-normative-edit", "always"],
    ["verify", ["qfai-verify"], "verify-full", "always"],
  ]);
});

it("A routing override that keeps every required agent", async () => {
  const override = [
    "routing:",
    "  - skill: qfai-maintain",
    "    phases:",
    "      - id: edit",
    "        mandatory_agents: [doc-steward]",
    "        conditional_agents: [project-helper]",
    "        parallel_groups: []",
    "        blocking_agents: []",
    "      - id: review",
    "        mandatory_agents: [completion-reviewer]",
    "        conditional_agents: []",
    "        parallel_groups: []",
    "        blocking_agents: [completion-reviewer]",
    "    review_profile: default",
    "workflow:",
    "  mode: active",
    "",
  ].join("\n");

  expect(await startOn(await project(override))).toEqual(started);
});

const DIRECT_STAGE = "  - id: edit\n    kind: maintenance\n    skill: qfai-maintain\n";

async function packagedDirect(): Promise<string> {
  return readFile(path.join(packagePlansDir(), "direct.yml"), "utf8");
}

const loadRefusals: [string, (text: string) => string][] = [
  ["not-mapping", () => "- route\n- stages\n"],
  ["unknown-key", (text) => `${text}owner: platform-team\n`],
  ["route-name", (text) => text.replace("route: direct", "route: bugfix")],
  ["out-of-vocabulary", (text) => text.replace("when: always", "when: sometimes")],
  ["kind-mismatch", (text) => text.replace("skill: qfai-maintain", "skill: qfai-sdd")],
  ["after-missing", (text) => text.replace("after: [edit]", "after: [review]")],
  ["cycle", (text) => text.replace(DIRECT_STAGE, `${DIRECT_STAGE}    after: [verify]\n`)],
  ["unreachable", (text) => text.replace(DIRECT_STAGE, `${DIRECT_STAGE}    after: [edit]\n`)],
  [
    "no-verify-path",
    (text) =>
      `${text}  - id: tidy\n    kind: maintenance\n    skill: qfai-maintain\n` +
      "    operation: non-normative-edit\n    when: always\n    after: [edit]\n",
  ],
];

for (const [reason, change] of loadRefusals) {
  it(reason, async () => {
    const loaded = parsePlan(change(await packagedDirect()), "direct");

    expect(loaded.ok ? [] : loaded.refusals.map((refusal) => refusal.reason)).toContain(reason);
  });
}

const retiredNames: [string, string, string][] = [
  ["repair-prepare", "kind: maintenance", "kind: repair_prepare"],
  ["sdd-reconcile", "kind: maintenance", "kind: sdd_reconcile"],
  ["defect-reopen", "kind: maintenance", "kind: defect_reopen"],
  ["configure", "kind: maintenance", "kind: configure"],
  ["research", "kind: maintenance", "kind: research"],
  ["ledger-reconcile-needed", "when: always", "when: ledger_reconcile_needed"],
];

for (const [title, from, to] of retiredNames) {
  it(title, async () => {
    const loaded = parsePlan((await packagedDirect()).replace(from, to), "direct");

    expect(loaded.ok ? [] : loaded.refusals.map((refusal) => refusal.reason)).toContain(
      "out-of-vocabulary",
    );
  });
}

it("crlf-equal", async () => {
  const loaded = parsePlan((await packagedDirect()).replace(/\r?\n/g, "\r\n"), "direct");

  expect(loaded.ok).toBe(true);
});

it("A plan copy under the project's assistant tree is never read", async () => {
  const root = await project();
  const copy = path.join(root, ".qfai", "assistant", "process", "workflows", "direct.yml");
  await mkdir(path.dirname(copy), { recursive: true });
  await writeFile(copy, "route: direct\nstages: []\n");

  expect(await startOn(root)).toEqual(started);
});

it("discovery-ends-routing", async () => {
  const root = await project();
  const plans = await loadBuiltInPlans();
  const { config } = await loadConfig(root);

  expect({
    discovery: shape(plans.discovery),
    refusals: (await checkPlans(root, config)).refusals,
  }).toEqual({
    discovery: [
      [
        "discussion",
        ["qfai-discussion"],
        "resolve-unsettled-product-scope",
        "full_discussion_needed",
      ],
    ],
    refusals: [],
  });
});
