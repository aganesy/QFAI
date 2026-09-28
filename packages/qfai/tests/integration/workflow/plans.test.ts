// QFAI:AC-0001-0192-05
// QFAI:AC-0001-0195-05
// QFAI:AC-0001-0198-01
// QFAI:AC-0001-0199-03
// QFAI:AC-0001-0217-05
// QFAI:AC-0001-0225-05
// QFAI:EX-0001-0192-13
// QFAI:EX-0001-0192-14
// QFAI:EX-0001-0195-08
// QFAI:EX-0001-0198-01
// QFAI:EX-0001-0199-08
// QFAI:EX-0001-0199-09
// QFAI:EX-0001-0217-08

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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

// A minimal project: one `STEP.md` per step the package's plans run, and an optional
// `qfai.config.yaml`. The plans and the routing stay in the package.
async function project(config?: string): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-plans-"));
  roots.push(root);
  const plans = Object.values(await loadBuiltInPlans());
  const names = plans.flatMap((plan) => plan.stages.flatMap((stage) => stage.steps));
  for (const name of new Set(names.map((step) => step.name))) {
    const dir = path.join(root, ".qfai", "assistant", "step", name);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "STEP.md"), `# ${name}\n`);
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
    subjects: check.refusals.map((refusal) => refusal.subject),
  };
}

const started = {
  run: { id: "run-20260925000000010", state: "routing", sequence: 2 },
  code: undefined,
  cause: undefined,
  events: 2,
  reasons: [],
  subjects: [],
};

// Each stage as its kind and its steps, a pass-through step marked with `°`.
function shape(plan: WorkflowPlanFile | undefined) {
  return (plan?.stages ?? []).map((stage) => [
    stage.kind,
    stage.steps.map((step) => (step.passThrough ? `${step.name}°` : step.name)),
  ]);
}

const VERIFY = ["verify-context", "verify-qfai-gate", "verify-repo-gate"];

// Whether every stage has a path to a verify stage, and the stages nothing follows.
function verifyReach(plan: WorkflowPlanFile | undefined) {
  const stages = plan?.stages ?? [];
  const followers = (id: string) => stages.filter((stage) => stage.after.includes(id));
  const reaches = (id: string): boolean => {
    const stage = stages.find((candidate) => candidate.id === id);
    if (stage?.kind === "verify") return true;
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
    [
      "sdd",
      [
        "sdd-triage",
        "sdd-flow",
        "sdd-story",
        "sdd-contract",
        "common-design-md°",
        "sdd-cycle",
        "sdd-gate",
      ],
    ],
    [
      "prototype",
      ["prototyping-grill", "prototyping-preflight", "prototyping-loop", "prototyping-handoff"],
    ],
    ["acceptance", ["atdd-scaffold", "atdd-credentials°", "atdd-author°"]],
    ["implement", ["implement-tdd", "implement-checkpoint"]],
    ["verify", VERIFY],
  ]);
});

const changeRoutes: WorkflowRoute[] = ["direct", "bugfix", "bounded-change", "feature"];

for (const route of changeRoutes) {
  it(route, async () => {
    const plan = (await loadBuiltInPlans())[route];
    const verify = plan.stages.filter((stage) => stage.kind === "verify");

    expect({
      ...verifyReach(plan),
      verifySteps: verify.map((stage) => stage.steps.map((step) => step.name)),
    }).toEqual({ everyStageReachesVerify: true, ends: ["verify"], verifySteps: [VERIFY] });
  });
}

it("Load the five shipped plans", async () => {
  const plans = await loadBuiltInPlans();
  const stages = Object.values(plans).flatMap((plan) =>
    plan.stages.map((stage) => ({ route: plan.route, ...stage })),
  );

  expect({
    routes: Object.keys(plans).sort(),
    grill: stages.filter((stage) => stage.steps.some((step) => step.name.startsWith("grill"))),
    discussion: stages.filter((stage) => stage.kind === "discussion").map((stage) => stage.route),
  }).toEqual({
    routes: ["bounded-change", "bugfix", "direct", "discovery", "feature"],
    grill: [],
    discussion: ["discovery"],
  });
});

it("Load the shipped direct", async () => {
  const plans = await loadBuiltInPlans();

  expect(shape(plans.direct)).toEqual([
    ["maintenance", ["maintain-edit"]],
    ["verify", VERIFY],
  ]);
});

it("A routing override that keeps every required agent", async () => {
  const override = [
    "routing:",
    "  - step: maintain-edit",
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

const DIRECT_STAGE = "  - id: edit\n    kind: maintenance\n    steps: [maintain-edit]\n";
const EDIT_STEPS = "steps: [maintain-edit]";

async function packagedDirect(): Promise<string> {
  return readFile(path.join(packagePlansDir(), "direct.yml"), "utf8");
}

const loadRefusals: [string, (text: string) => string][] = [
  ["not-mapping", () => "- route\n- stages\n"],
  ["unknown-key", (text) => `${text}owner: platform-team\n`],
  ["route-name", (text) => text.replace("route: direct", "route: bugfix")],
  ["out-of-vocabulary", (text) => text.replace("kind: verify", "kind: verification")],
  ["kind-mismatch", (text) => text.replace(EDIT_STEPS, "steps: [sdd-story]")],
  ["after-missing", (text) => text.replace("after: [edit]", "after: [review]")],
  ["cycle", (text) => text.replace(DIRECT_STAGE, `${DIRECT_STAGE}    after: [verify]\n`)],
  ["unreachable", (text) => text.replace(DIRECT_STAGE, `${DIRECT_STAGE}    after: [edit]\n`)],
  [
    "no-verify-path",
    (text) =>
      `${text}  - id: tidy\n    kind: maintenance\n    steps: [maintain-edit]\n    after: [edit]\n`,
  ],
];

for (const [reason, change] of loadRefusals) {
  // QFAI:EX-0001-0199-10
  it(reason, async () => {
    const loaded = parsePlan(change(await packagedDirect()), "direct");

    expect(loaded.ok ? [] : loaded.refusals.map((refusal) => refusal.reason)).toContain(reason);
  });
}

const stepRefusals: [string, string, string][] = [
  ["a step outside the vocabulary", "steps: [maintain-rewrite]", "out-of-vocabulary"],
  ["a step another kind runs", "steps: [maintain-edit, sdd-gate]", "kind-mismatch"],
  ["the seam step in a plan", "steps: [implement-seam]", "kind-mismatch"],
  ["a step listed twice", "steps: [maintain-edit, maintain-edit]", "shape"],
  ["no step", "steps: []", "shape"],
  ["an operation beside the steps", `${EDIT_STEPS}\n    operation: edit`, "unknown-key"],
];

for (const [title, steps, reason] of stepRefusals) {
  // QFAI:EX-0001-0199-10
  it(title, async () => {
    const loaded = parsePlan((await packagedDirect()).replace(EDIT_STEPS, steps), "direct");

    expect(loaded.ok ? [] : loaded.refusals.map((refusal) => refusal.reason)).toContain(reason);
  });
}

const retiredNames: [string, string, string][] = [
  ["repair-prepare", "kind: maintenance", "kind: repair_prepare"],
  ["sdd-reconcile", "kind: maintenance", "kind: sdd_reconcile"],
  ["defect-reopen", "kind: maintenance", "kind: defect_reopen"],
  ["configure", "kind: maintenance", "kind: configure"],
  ["research", "kind: maintenance", "kind: research"],
];

for (const [title, from, to] of retiredNames) {
  // QFAI:EX-0001-0199-10
  it(title, async () => {
    const loaded = parsePlan((await packagedDirect()).replace(from, to), "direct");

    expect(loaded.ok ? [] : loaded.refusals.map((refusal) => refusal.reason)).toContain(
      "out-of-vocabulary",
    );
  });
}

// QFAI:EX-0001-0199-10
it("a pass-through mark on a step off the pass-through list", async () => {
  const verify = "steps: [verify-context, verify-qfai-gate, verify-repo-gate]";
  const marked =
    "steps: [{ step: verify-context, passThrough: true }, verify-qfai-gate, verify-repo-gate]";
  const loaded = parsePlan((await packagedDirect()).replace(verify, marked), "direct");

  expect(loaded.ok ? [] : loaded.refusals).toEqual([
    { route: "direct", reason: "pass-through", subject: "verify-context" },
  ]);
});

// QFAI:EX-0001-0225-06
it("A stage carrying when: always, and a step entry carrying when: proposed", async () => {
  const direct = await packagedDirect();
  const stageWhen = parsePlan(
    direct.replace(EDIT_STEPS, `${EDIT_STEPS}\n    when: always`),
    "direct",
  );
  const stepWhen = parsePlan(
    direct.replace(EDIT_STEPS, "steps: [{ step: maintain-edit, when: proposed }]"),
    "direct",
  );

  expect([stageWhen, stepWhen].map((loaded) => (loaded.ok ? [] : loaded.refusals))).toEqual([
    [{ route: "direct", reason: "unknown-key", subject: "when" }],
    [{ route: "direct", reason: "unknown-key", subject: "when" }],
  ]);
});

it("crlf-equal", async () => {
  const loaded = parsePlan((await packagedDirect()).replace(/\r?\n/g, "\r\n"), "direct");

  expect(loaded.ok).toBe(true);
});

// QFAI:EX-0001-0199-11
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
        [
          "discussion-research",
          "discussion-interview",
          "discussion-pack",
          "discussion-oq",
          "discussion-uiux°",
        ],
      ],
    ],
    refusals: [],
  });
});

it("A project whose sdd-gate step is not installed", async () => {
  const root = await project();
  await rm(path.join(root, ".qfai", "assistant", "step", "sdd-gate"), { recursive: true });

  expect(await startOn(root)).toEqual({
    run: null,
    code: "fail-closed",
    cause: "contract-undeclared",
    events: 0,
    reasons: ["step-missing"],
    subjects: ["sdd-gate"],
  });
});
