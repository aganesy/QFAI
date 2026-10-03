// QFAI:AC-0001-0185-05
// QFAI:AC-0001-0188-05
// QFAI:AC-0001-0191-01
// QFAI:AC-0001-0192-03
// QFAI:AC-0001-0210-05
// QFAI:AC-0001-0218-01
// QFAI:AC-0001-0218-02
// QFAI:AC-0001-0218-03
// QFAI:AC-0001-0218-04
// QFAI:AC-0001-0218-05
// QFAI:EX-0001-0185-13
// QFAI:EX-0001-0185-14
// QFAI:EX-0001-0188-08
// QFAI:EX-0001-0191-01
// QFAI:EX-0001-0192-08
// QFAI:EX-0001-0192-09
// QFAI:EX-0001-0210-08

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import { loadConfig } from "../../../src/core/config.js";
import { planOf as planned } from "../../../src/core/workflow/plan.js";
import {
  allPlanRefusals,
  loadBuiltInPlans,
  packagePlansDir,
  parsePlan,
  type WorkflowPlanFile,
} from "../../../src/core/workflow/plans.js";
import { removeTempTree } from "../../helpers/tempTree.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
});

// A minimal project: one `STEP.md` per step the package's plans run, and an optional
// `qfai.config.yaml`. The plans and the routing stay in the package.
async function project(config?: string): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-plans-"));
  roots.push(root);
  const plans = await loadBuiltInPlans();
  const names = plans.flatMap((plan) => plan.stages.flatMap((stage) => stage.steps));
  for (const name of new Set(names.map((step) => step.name))) {
    const dir = path.join(root, ".qfai", "assistant", "step", name);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "STEP.md"), `# ${name}\n`);
  }
  if (config !== undefined) await writeFile(path.join(root, "qfai.config.yaml"), config);
  return root;
}

// Every refusal over the package's plans for the project.
async function refusalsFor(root: string) {
  const { config } = await loadConfig(root);
  return allPlanRefusals(root, config);
}

// Each stage as its kind and its steps, a pass-through step marked with `°`.
function shape(plan: WorkflowPlanFile | undefined) {
  return (plan?.stages ?? []).map((stage) => [
    stage.kind,
    stage.steps.map((step) => (step.passThrough ? `${step.name}°` : step.name)),
  ]);
}

async function planOf(route: string): Promise<WorkflowPlanFile | undefined> {
  return (await loadBuiltInPlans()).find((plan) => plan.route === route);
}

const VERIFY = ["verify-change-note°", "verify-context", "verify-qfai-gate", "verify-repo-gate"];

it("The shipped add-feature and prototype-feature plans", async () => {
  const kinds = async (route: string) =>
    ((await planOf(route))?.stages ?? []).map((stage) => stage.kind);

  expect({
    addFeature: await kinds("add-feature"),
    prototypeFeature: await kinds("prototype-feature"),
    verify: shape(await planOf("add-feature")).at(-1),
  }).toEqual({
    addFeature: ["sdd", "acceptance", "implement", "maintenance", "verify"],
    prototypeFeature: ["sdd", "prototype", "acceptance", "implement", "maintenance", "verify"],
    verify: ["verify", VERIFY],
  });
});

// Whether every stage but a trailing `verify-external` one reaches the verify block, and the
// stages nothing follows.
function verifyReach(plan: WorkflowPlanFile) {
  const { stages } = plan;
  const followers = (id: string) => stages.filter((stage) => stage.after.includes(id));
  const isBlock = (id: string) =>
    stages.some((stage) => stage.id === id && stage.steps.at(-1)?.name === "verify-repo-gate");
  const reaches = (id: string): boolean =>
    isBlock(id) || followers(id).some((next) => reaches(next.id));
  const external = (id: string) =>
    stages.some((stage) => stage.id === id && stage.steps[0]?.name === "verify-external");
  return {
    reached: stages.every((stage) => external(stage.id) || reaches(stage.id)),
    blocks: stages
      .filter((stage) => isBlock(stage.id))
      .map((stage) => shape({ ...plan, stages: [stage] })[0]),
  };
}

it("The plan of every change route the package ships", async () => {
  const plans = await loadBuiltInPlans();
  const changeRoutes = plans.filter((plan) =>
    plan.stages.some((stage) => stage.steps.some((step) => step.name === "verify-repo-gate")),
  );

  expect({
    count: changeRoutes.length,
    reach: [...new Set(changeRoutes.map((plan) => JSON.stringify(verifyReach(plan))))],
  }).toEqual({
    count: 26,
    reach: [JSON.stringify({ reached: true, blocks: [["verify", VERIFY]] })],
  });
});

it("The plans the package ships name no grill stage", async () => {
  const plans = await loadBuiltInPlans();
  const stages = plans.flatMap((plan) =>
    plan.stages.map((stage) => ({ route: plan.route, ...stage })),
  );

  expect({
    grill: stages.filter((stage) => stage.steps.some((step) => step.name.startsWith("grill"))),
    discussion: [
      ...new Set(stages.filter((stage) => stage.kind === "discussion").map((each) => each.route)),
    ],
  }).toEqual({
    grill: [],
    discussion: ["decide-acceptance", "decide-design", "decompose-epic"],
  });
});

it("The shipped edit-text plan", async () => {
  expect(shape(await planOf("edit-text"))).toEqual([
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

  expect(await refusalsFor(await project(override))).toEqual([]);
});

const EDIT_STAGE = "  - id: edit\n    kind: maintenance\n    steps: [maintain-edit]\n";
const EDIT_STEPS = "steps: [maintain-edit]";

async function packaged(route: string): Promise<string> {
  return readFile(path.join(packagePlansDir(), `${route}.yml`), "utf8");
}

// The refusals a changed copy of a packaged plan meets on load.
async function refusalsOf(route: string, change: (text: string) => string) {
  const loaded = parsePlan(change(await packaged(route)), route);
  return loaded.ok ? [] : loaded.refusals.map(({ reason, subject }) => ({ reason, subject }));
}

const loadRefusals: [string, (text: string) => string][] = [
  ["not-mapping", () => "- route\n- stages\n"],
  ["unknown-key", (text) => `${text}owner: platform-team\n`],
  ["route-name", (text) => text.replace("route: edit-text", "route: fix-defect")],
  ["family", (text) => text.replace("family: change", "family: chores")],
  ["out-of-vocabulary", (text) => text.replace("kind: verify", "kind: verification")],
  ["kind-mismatch", (text) => text.replace(EDIT_STEPS, "steps: [sdd-story]")],
  ["after-missing", (text) => text.replace("after: [edit]", "after: [review]")],
  ["cycle", (text) => text.replace(EDIT_STAGE, `${EDIT_STAGE}    after: [verify]\n`)],
  ["unreachable", (text) => text.replace(EDIT_STAGE, `${EDIT_STAGE}    after: [edit]\n`)],
  [
    "no-verify-path",
    (text) =>
      text.replace(
        "defaultModifiers",
        "  - id: tidy\n    kind: maintenance\n    steps: [maintain-edit]\n    after: [edit]\ndefaultModifiers",
      ),
  ],
];

for (const [reason, change] of loadRefusals) {
  // QFAI:EX-0001-0192-10
  it(reason, async () => {
    const reasons = (await refusalsOf("edit-text", change)).map((refusal) => refusal.reason);

    expect(reasons).toContain(reason);
  });
}

const stepRefusals: [string, string, string][] = [
  ["a step outside the vocabulary", "steps: [maintain-rewrite]", "out-of-vocabulary"],
  ["a step another kind runs", "steps: [maintain-edit, sdd-gate]", "kind-mismatch"],
  ["the seam step in a plan", "steps: [implement-seam]", "seam"],
  ["a step listed twice", "steps: [maintain-edit, maintain-edit]", "shape"],
  ["no step", "steps: []", "shape"],
  ["an operation beside the steps", `${EDIT_STEPS}\n    operation: edit`, "unknown-key"],
];

for (const [title, steps, reason] of stepRefusals) {
  // QFAI:EX-0001-0192-10
  it(title, async () => {
    const reasons = (await refusalsOf("edit-text", (text) => text.replace(EDIT_STEPS, steps))).map(
      (refusal) => refusal.reason,
    );

    expect(reasons).toContain(reason);
  });
}

const retiredNames: [string, string][] = [
  ["repair-prepare", "kind: repair_prepare"],
  ["sdd-reconcile", "kind: sdd_reconcile"],
  ["defect-reopen", "kind: defect_reopen"],
  ["configure", "kind: configure"],
  ["research", "kind: research"],
  ["sdd-delta", "kind: sdd_delta"],
];

for (const [title, to] of retiredNames) {
  // QFAI:EX-0001-0192-10
  it(title, async () => {
    const refusals = await refusalsOf("edit-text", (text) => text.replace("kind: maintenance", to));

    expect(refusals.map((refusal) => refusal.reason)).toContain("out-of-vocabulary");
  });
}

// QFAI:EX-0001-0218-01
it("A plan naming implement-guess, a test fix under an implement kind, and a mixed stage", async () => {
  expect({
    guess: await refusalsOf("fix-defect", (text) =>
      text.replace("steps: [implement-tdd, implement-checkpoint]", "steps: [implement-guess]"),
    ),
    fixAsImplement: await refusalsOf("repair-test", (text) =>
      text.replace("kind: test_fix", "kind: implement"),
    ),
    mixed: await refusalsOf("fix-defect", (text) =>
      text.replace(
        "steps: [implement-tdd, implement-checkpoint]",
        "steps: [implement-tdd, sdd-story]",
      ),
    ),
  }).toEqual({
    guess: [{ reason: "out-of-vocabulary", subject: "implement-guess" }],
    fixAsImplement: [{ reason: "kind-mismatch", subject: "fix" }],
    mixed: [{ reason: "kind-mismatch", subject: "implement" }],
  });
});

// QFAI:EX-0001-0218-02
it("A plan marking implement-tdd pass-through, and one marking atdd-author", async () => {
  const marked = "steps: [{ step: implement-tdd, passThrough: true }, implement-checkpoint]";

  expect({
    tdd: await refusalsOf("fix-defect", (text) =>
      text.replace("steps: [implement-tdd, implement-checkpoint]", marked),
    ),
    author: await refusalsOf("fix-defect", (text) => text),
  }).toEqual({ tdd: [{ reason: "pass-through", subject: "implement-tdd" }], author: [] });
});

// QFAI:EX-0001-0192-10
it("a pass-through mark on a step off the pass-through list", async () => {
  expect(
    await refusalsOf("edit-text", (text) =>
      text.replace(
        "      - verify-context\n",
        "      - { step: verify-context, passThrough: true }\n",
      ),
    ),
  ).toEqual([{ reason: "pass-through", subject: "verify-context" }]);
});

const SPLIT_VERIFY = [
  "  - id: verify",
  "    kind: verify",
  "    steps:",
  "      - { step: verify-change-note, passThrough: true }",
  "      - verify-context",
  "    after: [implement]",
  "  - id: gate",
  "    kind: verify",
  "    steps: [verify-qfai-gate, verify-repo-gate]",
  "    after: [verify]",
  "",
].join("\n");

// QFAI:EX-0001-0218-04
it("A split verify block, and an answer-question whose last stage answers", async () => {
  const splitVerify = (text: string) =>
    text.replace(/ {2}- id: verify\n[\s\S]*?after: \[implement\]\n/, SPLIT_VERIFY);

  expect({
    split: await refusalsOf("fix-defect", splitVerify),
    answer: await refusalsOf("answer-question", (text) =>
      text.replace("steps: [triage-answer, triage-close]", "steps: [triage-answer]"),
    ),
  }).toEqual({
    split: [{ reason: "terminal", subject: "gate" }],
    answer: [{ reason: "terminal", subject: "answer" }],
  });
});

// QFAI:AC-0001-0218-06
// QFAI:EX-0001-0218-08
it("A review marker kept, one with another value, and one on a stage that is not a triage stage", async () => {
  expect({
    kept: await refusalsOf("answer-question", (text) => text),
    other: await refusalsOf("answer-question", (text) =>
      text.replace("review: none", "review: all"),
    ),
    elsewhere: await refusalsOf("edit-text", (text) =>
      text.replace(EDIT_STEPS, `${EDIT_STEPS}\n    review: none`),
    ),
  }).toEqual({
    kept: [],
    other: [{ reason: "shape", subject: "answer" }],
    elsewhere: [{ reason: "shape", subject: "edit" }],
  });
});

// QFAI:EX-0001-0218-05
it("A point naming a step the plan lacks, an unknown destination, and a step run twice", async () => {
  expect({
    missing: await refusalsOf("edit-text", (text) =>
      text.replace("decisionPoints: []", "decisionPoints: [sdd-flow]"),
    ),
    destination: await refusalsOf("fix-defect", (text) =>
      text.replace("routes: [answer-question]", "routes: [fix-everything]"),
    ),
    twice: await refusalsOf("improve-performance", (text) =>
      text.replace("decisionPoints: [implement-diagnose]", "decisionPoints: [implement-benchmark]"),
    ),
  }).toEqual({
    missing: [{ reason: "point", subject: "sdd-flow" }],
    destination: [{ reason: "destination", subject: "fix-everything" }],
    twice: [{ reason: "point", subject: "implement-benchmark" }],
  });
});

// QFAI:EX-0001-0218-06
it("A stage carrying when: always, and a step entry carrying when: proposed", async () => {
  expect({
    stage: await refusalsOf("edit-text", (text) =>
      text.replace(EDIT_STEPS, `${EDIT_STEPS}\n    when: always`),
    ),
    step: await refusalsOf("edit-text", (text) =>
      text.replace(EDIT_STEPS, "steps: [{ step: maintain-edit, when: proposed }]"),
    ),
  }).toEqual({
    stage: [{ reason: "unknown-key", subject: "when" }],
    step: [{ reason: "unknown-key", subject: "when" }],
  });
});

// QFAI:EX-0001-0218-07
it("A mode on the wrong step, and a modifier outside the three", async () => {
  expect({
    readOnlyTriage: await refusalsOf("apply-settled-spec", (text) =>
      text.replace("mode: settled", "mode: read-only"),
    ),
    settledDiagnose: await refusalsOf("retriage-bundle", (text) =>
      text.replace("mode: read-only", "mode: settled"),
    ),
    legal: await refusalsOf("edit-text", (text) =>
      text.replace("defaultModifiers: []", "defaultModifiers: [gate:legal]"),
    ),
  }).toEqual({
    readOnlyTriage: [{ reason: "mode", subject: "sdd-triage" }],
    settledDiagnose: [{ reason: "mode", subject: "implement-diagnose" }],
    legal: [{ reason: "out-of-vocabulary", subject: "gate:legal" }],
  });
});

it("crlf-equal", async () => {
  expect(await refusalsOf("edit-text", (text) => text.replace(/\r?\n/g, "\r\n"))).toEqual([]);
});

it("A plan copy under the project's assistant tree is never read", async () => {
  const root = await project();
  const copy = path.join(root, ".qfai", "assistant", "process", "workflows", "edit-text.yml");
  await mkdir(path.dirname(copy), { recursive: true });
  await writeFile(copy, "route: edit-text\nstages: []\n");

  expect((await planned(root, { route: "edit-text" })).ok).toBe(true);
});

it("Every shipped plan loads and every step it names is installed", async () => {
  const root = await project();

  expect(await refusalsFor(root)).toEqual([]);
});

it("A project whose sdd-gate step is not installed", async () => {
  const root = await project();
  await rm(path.join(root, ".qfai", "assistant", "step", "sdd-gate"), { recursive: true });

  expect(await planned(root, { route: "add-feature" })).toEqual({
    ok: false,
    message: expect.any(String),
    reasons: [
      {
        reason: "plan-invalid",
        subject: "sdd-gate",
        file: "add-feature.yml",
        cause: "step-missing",
      },
    ],
  });
});
