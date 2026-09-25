// QFAI:SPEC-0018:TC-0018-0019
// QFAI:SPEC-0018:TC-0018-0020
// QFAI:SPEC-0018:TC-0018-0094
// QFAI:SPEC-0018:TC-0018-0164
// QFAI:SPEC-0018:TC-0018-0183
// QFAI:SPEC-0018:TC-0018-0184
// QFAI:SPEC-0018:TC-0018-0185
// QFAI:SPEC-0018:TC-0018-0186

import { existsSync } from "node:fs";
import { cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, expect, it } from "vitest";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

import { readWorkflowMode } from "../../../src/core/config.js";
import { decide } from "../../../src/core/workflow/decide.js";
import {
  checkInstalledPlans,
  loadBuiltInPlans,
  type WorkflowPlanFile,
} from "../../../src/core/workflow/plans.js";
import { getInitAssetsDir } from "../../../src/shared/assets.js";
import { removeTempTree } from "../../helpers/tempTree.js";

type Facts = Parameters<typeof decide>[2];

const WORKFLOWS = path.join(".qfai", "assistant", "process", "workflows");
const ROUTING = path.join(".qfai", "assistant", "manifest", "agent-routing.yml");

const startFacts: Facts = {
  start: {
    runId: "run-20260925000000010",
    qfaiVersion: "2.0.0",
    digestKey: "d".repeat(64),
    policyDigests: {},
    manifestDigests: {},
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

// A minimal project: the installed plans, each skill's Operations table and the routing manifest,
// as `qfai init` would leave them, and no other part of an initialized tree.
async function project(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-plans-"));
  roots.push(root);
  const assets = path.join(getInitAssetsDir(), ".qfai", "assistant");
  await cp(path.join(assets, "process", "workflows"), path.join(root, WORKFLOWS), {
    recursive: true,
  });
  await mkdir(path.dirname(path.join(root, ROUTING)), { recursive: true });
  await cp(path.join(assets, "manifest", "agent-routing.yml"), path.join(root, ROUTING));
  for (const skill of await readdir(path.join(assets, "skills"))) {
    const table = path.join("skills", skill, "references", "orchestrated-mode.md");
    if (!existsSync(path.join(assets, table))) continue;
    await mkdir(path.dirname(path.join(root, ".qfai", "assistant", table)), { recursive: true });
    await cp(path.join(assets, table), path.join(root, ".qfai", "assistant", table));
  }
  return root;
}

async function edit(root: string, route: string, change: (text: string) => string) {
  const file = path.join(root, WORKFLOWS, `${route}.yml`);
  await writeFile(file, change(await readFile(file, "utf8")));
}

// `start` on the project, with the cause the plan check found in its facts.
async function startOn(root: string) {
  const check = await checkInstalledPlans(root);
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

function refusedWith(reason: string) {
  return {
    run: null,
    code: "fail-closed",
    cause: "contract-undeclared",
    events: 0,
    reasons: expect.arrayContaining([reason]),
  };
}

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

it("TC-0018-0019 (TDD-0263): Load the shipped feature", async () => {
  const plans = await loadBuiltInPlans();

  expect(shape(plans.feature)).toEqual([
    ["sdd", ["qfai-sdd"], "new-capability", "always"],
    ["prototype", ["qfai-prototyping"], "existing-runtime-contract", "prototype_decision_needed"],
    ["acceptance", ["qfai-atdd"], "author-acceptance-tests", "acceptance_obligations_unmet"],
    ["implement", ["qfai-implement"], "implement", "always"],
    ["verify", ["qfai-verify"], "verify-full", "always"],
  ]);
});

const changeRoutes: [string, "direct" | "bugfix" | "bounded-change" | "feature"][] = [
  ["TC-0018-0020 (TDD-0264): direct", "direct"],
  ["TC-0018-0020 (TDD-0265): bugfix", "bugfix"],
  ["TC-0018-0020 (TDD-0266): bounded-change", "bounded-change"],
  ["TC-0018-0020 (TDD-0267): feature", "feature"],
];

for (const [title, route] of changeRoutes) {
  it(title, async () => {
    const plans = await loadBuiltInPlans();

    expect(verifyReach(plans[route])).toEqual({ everyStageReachesVerify: true, ends: ["verify"] });
  });
}

it("TC-0018-0094 (TDD-0315): Load the five shipped plans", async () => {
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

it("TC-0018-0164 (TDD-0365): Load the shipped direct", async () => {
  const plans = await loadBuiltInPlans();

  expect(shape(plans.direct)).toEqual([
    ["maintenance", ["qfai-maintain"], "non-normative-edit", "always"],
    ["verify", ["qfai-verify"], "verify-full", "always"],
  ]);
});

it("TC-0018-0183 (TDD-0389): A project agent-routing", async () => {
  const root = await project();
  const routingPath = path.join(root, ROUTING);
  const routing = parseYaml(await readFile(routingPath, "utf8"));
  routing.routing.reverse();
  routing.routing[0].phases[0].conditional_agents.push("project-helper");
  await writeFile(routingPath, stringifyYaml(routing));
  await writeFile(path.join(root, "qfai.config.yaml"), "workflow:\n  mode: active\n");
  const config = parseYaml(await readFile(path.join(root, "qfai.config.yaml"), "utf8"));

  expect({ mode: readWorkflowMode(config), ...(await startOn(root)) }).toEqual({
    mode: "active",
    run: { id: "run-20260925000000010", state: "routing", sequence: 2 },
    code: undefined,
    cause: undefined,
    events: 2,
    reasons: [],
  });
});

const DIRECT_STAGE = "  - id: edit\n    kind: maintenance\n    skill: qfai-maintain\n";

const loadRefusals: [string, string, (root: string) => Promise<void>][] = [
  [
    "TC-0018-0184 (TDD-0390): file-missing",
    "file-missing",
    (root) => rm(path.join(root, WORKFLOWS, "direct.yml")),
  ],
  [
    "TC-0018-0184 (TDD-0391): not-mapping",
    "not-mapping",
    (root) => edit(root, "direct", () => "- route\n- stages\n"),
  ],
  [
    "TC-0018-0184 (TDD-0392): unknown-key",
    "unknown-key",
    (root) => edit(root, "direct", (text) => `${text}owner: platform-team\n`),
  ],
  [
    "TC-0018-0184 (TDD-0393): route-name",
    "route-name",
    (root) => edit(root, "direct", (text) => text.replace("route: direct", "route: bugfix")),
  ],
  [
    "TC-0018-0184 (TDD-0394): out-of-vocabulary",
    "out-of-vocabulary",
    (root) => edit(root, "direct", (text) => text.replace("when: always", "when: sometimes")),
  ],
  [
    "TC-0018-0184 (TDD-0395): kind-mismatch",
    "kind-mismatch",
    (root) =>
      edit(root, "direct", (text) => text.replace("skill: qfai-maintain", "skill: qfai-sdd")),
  ],
  [
    "TC-0018-0184 (TDD-0396): after-missing",
    "after-missing",
    (root) => edit(root, "direct", (text) => text.replace("after: [edit]", "after: [review]")),
  ],
  [
    "TC-0018-0184 (TDD-0397): cycle",
    "cycle",
    (root) =>
      edit(root, "direct", (text) =>
        text.replace(DIRECT_STAGE, `${DIRECT_STAGE}    after: [verify]\n`),
      ),
  ],
  [
    "TC-0018-0184 (TDD-0398): unreachable",
    "unreachable",
    (root) =>
      edit(root, "direct", (text) =>
        text.replace(DIRECT_STAGE, `${DIRECT_STAGE}    after: [edit]\n`),
      ),
  ],
  [
    "TC-0018-0184 (TDD-0399): no-verify-path",
    "no-verify-path",
    (root) =>
      edit(
        root,
        "direct",
        (text) =>
          `${text}  - id: tidy\n    kind: maintenance\n    skill: qfai-maintain\n` +
          "    operation: non-normative-edit\n    when: always\n    after: [edit]\n",
      ),
  ],
];

for (const [title, reason, plant] of loadRefusals) {
  it(title, async () => {
    const root = await project();
    await plant(root);

    expect(await startOn(root)).toEqual(refusedWith(reason));
  });
}

const retiredNames: [string, string, string][] = [
  ["TC-0018-0185 (TDD-0400): repair-prepare", "kind: maintenance", "kind: repair_prepare"],
  ["TC-0018-0185 (TDD-0401): sdd-reconcile", "kind: maintenance", "kind: sdd_reconcile"],
  ["TC-0018-0185 (TDD-0402): defect-reopen", "kind: maintenance", "kind: defect_reopen"],
  ["TC-0018-0185 (TDD-0403): configure", "kind: maintenance", "kind: configure"],
  ["TC-0018-0185 (TDD-0404): research", "kind: maintenance", "kind: research"],
  [
    "TC-0018-0185 (TDD-0405): ledger-reconcile-needed",
    "when: always",
    "when: ledger_reconcile_needed",
  ],
];

for (const [title, from, to] of retiredNames) {
  it(title, async () => {
    const root = await project();
    await edit(root, "direct", (text) => text.replace(from, to));

    expect(await startOn(root)).toEqual(refusedWith("out-of-vocabulary"));
  });
}

it("TC-0018-0186 (TDD-0406): crlf-equal", async () => {
  const root = await project();
  for (const route of ["direct", "bugfix", "bounded-change", "feature", "discovery"]) {
    await edit(root, route, (text) => text.replace(/\r?\n/g, "\r\n"));
  }

  expect(await startOn(root)).toEqual({
    run: { id: "run-20260925000000010", state: "routing", sequence: 2 },
    code: undefined,
    cause: undefined,
    events: 2,
    reasons: [],
  });
});

it("TC-0018-0186 (TDD-0407): discovery-ends-routing", async () => {
  const root = await project();
  const plans = await loadBuiltInPlans();

  expect({
    discovery: shape(plans.discovery),
    refusals: (await checkInstalledPlans(root)).refusals,
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
