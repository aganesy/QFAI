// QFAI:AC-0001-0188-05
// QFAI:AC-0001-0191-01
// QFAI:AC-0001-0210-05
// QFAI:AC-0001-0218-01
// QFAI:AC-0001-0218-02
// QFAI:AC-0001-0218-03
// QFAI:AC-0001-0218-04
// QFAI:AC-0001-0218-05
// QFAI:EX-0001-0188-08
// QFAI:EX-0001-0191-01
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

// A minimal project: one `STEP.md` per step the package's plans run. The plans and the routing
// stay in the package.
async function project(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-plans-"));
  roots.push(root);
  const plans = await loadBuiltInPlans();
  const names = plans.flatMap((plan) => plan.stages.flatMap((stage) => stage.steps));
  for (const name of new Set(names.map((step) => step.name))) {
    const dir = path.join(root, ".qfai", "assistant", "step", name);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "STEP.md"), `# ${name}\n`);
  }
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

const VERIFY = ["verify-qfai-gate", "verify-repo-gate"];

// QFAI:EX-0001-0220-15
// QFAI:EX-0001-0220-16
it("The shipped add-feature and prototype-feature plans", async () => {
  const kinds = async (route: string) =>
    ((await planOf(route))?.stages ?? []).map((stage) => stage.kind);

  expect({
    addFeature: await kinds("add-feature"),
    prototypeFeature: await kinds("prototype-feature"),
    verify: shape(await planOf("add-feature")).at(-1),
  }).toEqual({
    addFeature: ["sdd", "implement", "maintenance", "verify", "verify"],
    prototypeFeature: ["sdd", "prototype", "implement", "maintenance", "verify", "verify"],
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

// QFAI:EX-0001-0218-03
it("The plan of every change route the package ships", async () => {
  const plans = await loadBuiltInPlans();
  const changeRoutes = plans.filter((plan) =>
    plan.stages.some((stage) => stage.steps.some((step) => step.name === "verify-repo-gate")),
  );

  expect({
    count: changeRoutes.length,
    reach: [...new Set(changeRoutes.map((plan) => JSON.stringify(verifyReach(plan))))],
  }).toEqual({
    count: 23,
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
    discussion: ["decide-design", "decompose-epic"],
  });
});

it("The shipped edit-text plan", async () => {
  expect(shape(await planOf("edit-text"))).toEqual([
    ["maintenance", ["maintain-edit"]],
    ["verify", ["verify-change-note°"]],
    ["verify", VERIFY],
  ]);
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
  ["shape", (text) => text.replace("- id: edit", '- id: ""')],
  ["after-missing", (text) => text.replace("after: [edit]", "after: [review]")],
  [
    "after-order",
    (text) => text.replace(EDIT_STAGE, "").replace("decisionPoints", `${EDIT_STAGE}decisionPoints`),
  ],
  ["cycle", (text) => text.replace(EDIT_STAGE, `${EDIT_STAGE}    after: [verify]\n`)],
  ["unreachable", (text) => text.replace(EDIT_STAGE, `${EDIT_STAGE}    after: [edit]\n`)],
  [
    "no-verify-path",
    (text) =>
      text.replace(
        "decisionPoints",
        "  - id: tidy\n    kind: maintenance\n    steps: [maintain-edit]\n    after: [edit]\ndecisionPoints",
      ),
  ],
];

for (const [reason, change] of loadRefusals) {
  // BR-0020-0016
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
  // BR-0020-0016
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
  // BR-0020-0016
  it(title, async () => {
    const refusals = await refusalsOf("edit-text", (text) => text.replace("kind: maintenance", to));

    expect(refusals.map((refusal) => refusal.reason)).toContain("out-of-vocabulary");
  });
}

// QFAI:EX-0001-0218-01
it("A plan naming implement-guess, a test fix under an implement kind, and a mixed stage", async () => {
  expect({
    guess: await refusalsOf("fix-defect", (text) =>
      text.replace("steps: [implement-scaffold, implement-tdd]", "steps: [implement-guess]"),
    ),
    fixAsImplement: await refusalsOf("repair-test", (text) =>
      text.replace("kind: test_fix", "kind: implement"),
    ),
    mixed: await refusalsOf("fix-defect", (text) =>
      text.replace(
        "steps: [implement-scaffold, implement-tdd]",
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
it("A plan marking implement-regression-fix pass-through, and one marking implement-credentials", async () => {
  const marked = "steps: [{ step: implement-regression-fix, passThrough: true }]";

  expect({
    regression: await refusalsOf("fix-red-main", (text) =>
      text.replace("steps: [implement-regression-fix]", marked),
    ),
    credentials: await refusalsOf("write-acceptance-tests", (text) => text),
  }).toEqual({
    regression: [{ reason: "pass-through", subject: "implement-regression-fix" }],
    credentials: [],
  });
});

// QFAI:EX-0001-0218-02
it("a pass-through mark on a step off the pass-through list", async () => {
  expect(
    await refusalsOf("edit-text", (text) =>
      text.replace(
        "steps: [verify-qfai-gate, verify-repo-gate]",
        "steps: [{ step: verify-qfai-gate, passThrough: true }, verify-repo-gate]",
      ),
    ),
  ).toEqual([{ reason: "pass-through", subject: "verify-qfai-gate" }]);
});

const VERIFY_STAGE =
  "  - id: verify\n    kind: verify\n    steps: [verify-qfai-gate, verify-repo-gate]\n    after: [note]\n";

const SPLIT_VERIFY = [
  "  - id: verify",
  "    kind: verify",
  "    steps: [verify-qfai-gate]",
  "    after: [note]",
  "  - id: gate",
  "    kind: verify",
  "    steps: [verify-repo-gate]",
  "    after: [verify]",
  "",
].join("\n");

// QFAI:EX-0001-0218-04
it("A split verify block, and an answer-question whose last stage answers", async () => {
  const splitVerify = (text: string) => text.replace(VERIFY_STAGE, SPLIT_VERIFY);

  expect({
    split: await refusalsOf("fix-defect", splitVerify),
    answer: await refusalsOf("answer-question", (text) =>
      text.replace("      - triage-close\n", ""),
    ),
  }).toEqual({
    split: [{ reason: "terminal", subject: "gate" }],
    answer: [{ reason: "terminal", subject: "answer" }],
  });
});

// QFAI:AC-0001-0218-06
// QFAI:EX-0001-0218-08
it("A code review after the edit stage, a review of another value, and two on a triage stage", async () => {
  const onTriage = (value: string) => (text: string) =>
    text.replace("      - triage-close\n", `      - triage-close\n    review: ${value}\n`);
  expect({
    kept: await refusalsOf("edit-text", (text) =>
      text.replace("    review: code\n", "").replace(EDIT_STEPS, `${EDIT_STEPS}\n    review: code`),
    ),
    other: await refusalsOf("edit-text", (text) => text.replace("review: code", "review: all")),
    spec: await refusalsOf("answer-question", onTriage("spec")),
    none: await refusalsOf("answer-question", onTriage("none")),
  }).toEqual({
    kept: [],
    other: [{ reason: "shape", subject: "note" }],
    spec: [{ reason: "shape", subject: "answer" }],
    none: [{ reason: "shape", subject: "answer" }],
  });
});

// QFAI:AC-0001-0218-07
// QFAI:EX-0001-0218-09
it("A fix-defect whose implement stage is listed before the spec stage it follows", async () => {
  const IMPLEMENT =
    "  - id: implement\n    kind: implement\n    steps: [implement-scaffold, implement-tdd]\n    after: [spec]\n";
  const SPEC = / {2}- id: spec\n[\s\S]*?review: spec\n/;
  const swapped = (text: string) => {
    const spec = SPEC.exec(text)?.[0] ?? "";
    return text.replace(IMPLEMENT, "").replace(spec, `${IMPLEMENT}${spec}`);
  };

  expect(await refusalsOf("fix-defect", swapped)).toEqual([
    { reason: "after-order", subject: "implement:spec" },
  ]);
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
it("A mode on the wrong step, and a plan holding default modifiers", async () => {
  expect({
    readOnlyTriage: await refusalsOf("apply-settled", (text) =>
      text.replace("mode: settled", "mode: read-only"),
    ),
    settledDiagnose: await refusalsOf("retriage-bundle", (text) =>
      text.replace("mode: read-only", "mode: settled"),
    ),
    modifiers: await refusalsOf("edit-text", (text) => `${text}defaultModifiers: []\n`),
  }).toEqual({
    readOnlyTriage: [{ reason: "mode", subject: "sdd-triage" }],
    settledDiagnose: [{ reason: "mode", subject: "implement-diagnose" }],
    modifiers: [{ reason: "unknown-key", subject: "defaultModifiers" }],
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
