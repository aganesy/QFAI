/**
 * Integration: the plans the package ships under `assets/defaults/workflows/`, one per route.
 *
 * Reads each plan as YAML and holds it to the plan format and vocabulary of the workflow file
 * contract: one file per route, each stage's steps drawn from the ones its kind may run, and every
 * change route ending in the verify block. How the core loads a plan is not this module's.
 */
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { PLAN_ROUTES, planStageSteps, readDefault } from "../../helpers/shippedAssistant.js";

const VERIFY = ["verify-change-note", "verify-context", "verify-qfai-gate", "verify-repo-gate"];

/** The stage kinds, and the steps a stage of each kind may run. */
const VOCABULARY: Record<string, string[]> = {
  triage: [
    "triage-close",
    "triage-answer",
    "triage-investigate",
    "triage-request-info",
    "triage-dedupe",
    "triage-decompose",
    "triage-cluster",
    "triage-security-intake",
    "triage-handoff",
  ],
  maintenance: ["maintain-edit"],
  diagnose: ["implement-diagnose", "implement-bisect", "implement-minimize", "implement-benchmark"],
  sdd_append: ["sdd-story", "sdd-gate"],
  test_fix: ["atdd-test-fix", "implement-test-fix"],
  regression_fix: ["implement-regression-fix"],
  sdd: [
    "sdd-triage",
    "sdd-flow",
    "sdd-story",
    "sdd-contract",
    "common-design-md",
    "sdd-cycle",
    "sdd-gate",
  ],
  prototype: [
    "prototyping-grill",
    "prototyping-preflight",
    "prototyping-loop",
    "prototyping-handoff",
  ],
  acceptance: ["atdd-scaffold", "atdd-credentials", "atdd-author"],
  implement: [
    "implement-tdd",
    "implement-checkpoint",
    "implement-refactor",
    "implement-retire",
    "implement-sweep",
    "implement-quarantine",
    "implement-dep-bump",
    "implement-tooling",
    "implement-backport",
    "implement-revert",
    "implement-stress-harness",
    "implement-oracle-parity",
  ],
  verify: [
    ...VERIFY,
    "verify-repeat-run",
    "verify-advisory",
    "verify-external",
    "verify-manual",
    "verify-release-notes",
  ],
  discussion: [
    "discussion-research",
    "discussion-interview",
    "discussion-pack",
    "discussion-oq",
    "discussion-uiux",
  ],
};

/** The steps a plan may mark pass-through. */
const PASS_THROUGH = [
  "sdd-flow",
  "sdd-contract",
  "sdd-cycle",
  "sdd-story",
  "common-design-md",
  "atdd-credentials",
  "atdd-author",
  "discussion-uiux",
  "atdd-test-fix",
  "implement-test-fix",
  "maintain-edit",
  "verify-change-note",
];

const PLAN_KEYS = [
  "route",
  "family",
  "stages",
  "defaultModifiers",
  "decisionPoints",
  "releasePoint",
  "branchPoints",
];

const STAGE_KEYS = ["id", "kind", "steps", "after", "effects"];

/**
 * The order the delivery contract fixes for the skills a plan's steps belong to. A triage stage
 * may open a route and closes one, so it holds no place in this order.
 */
const OWNER_ORDER = ["qfai-discussion", "qfai-sdd", "qfai-prototyping", "qfai-atdd", "qfai-verify"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The skill a step belongs to, by its name's prefix. */
function ownerOf(step: string): string {
  const prefix = step.split("-")[0] ?? step;
  return prefix === "common" ? "common" : `qfai-${prefix}`;
}

async function plan(route: string) {
  const raw = await readDefault(`workflows/${route}.yml`);
  const parsed: unknown = parse(raw);
  const doc = isRecord(parsed) ? parsed : {};
  const entries: unknown[] = Array.isArray(doc.stages) ? doc.stages : [];
  const keys = entries.map((entry) => (isRecord(entry) ? Object.keys(entry) : []));
  const stages = (await planStageSteps(route)).map((stage) => ({
    ...stage,
    after: after(entries, stage.id),
  }));
  return { raw, keys: Object.keys(doc), stageKeys: keys, route: doc.route, stages };
}

function after(entries: unknown[], id: string): string[] {
  const entry = entries.find((each) => isRecord(each) && each.id === id);
  const value = isRecord(entry) ? entry.after : undefined;
  return Array.isArray(value) ? value.map(String) : [];
}

type Stage = Awaited<ReturnType<typeof plan>>["stages"][number];

function names(stage: Stage | undefined): string[] {
  return (stage?.steps ?? []).map((step) => step.name);
}

/** The stages that reach `target` through `after` edges, `target` included. */
function reaching(stages: Stage[], target: string): Set<string> {
  const found = new Set([target]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const stage of stages) {
      if (found.has(stage.id)) continue;
      if (stages.some((next) => found.has(next.id) && next.after.includes(stage.id))) {
        found.add(stage.id);
        grew = true;
      }
    }
  }
  return found;
}

function expectStageInVocabulary(route: string, stage: Stage, ids: string[]) {
  const where = `${route}/${stage.id}`;
  const allowed = VOCABULARY[stage.kind];
  expect(allowed, `${where}: kind ${stage.kind}`).toBeDefined();
  expect(stage.steps.length, `${where}: runs a step`).toBeGreaterThan(0);
  for (const step of stage.steps) {
    expect(allowed, `${where}: step ${step.name}`).toContain(step.name);
    if (step.passThrough) expect(PASS_THROUGH, where).toContain(step.name);
  }
  for (const dependency of stage.after) {
    expect(ids, `${where}: after ${dependency}`).toContain(dependency);
  }
}

describe("the built-in plans", () => {
  it("ship one plan per route, in the plan format and vocabulary", async () => {
    for (const route of PLAN_ROUTES) {
      const { raw, keys, stageKeys, route: named, stages } = await plan(route);
      expect(named, `${route}.yml names its route`).toBe(route);
      expect(
        keys.filter((key) => !PLAN_KEYS.includes(key)),
        route,
      ).toEqual([]);
      expect(stages.length, route).toBeGreaterThan(0);
      expect(
        stageKeys.flat().filter((key) => !STAGE_KEYS.includes(key)),
        route,
      ).toEqual([]);
      const ids = stages.map((stage) => stage.id);
      expect(new Set(ids).size, `${route}: stage IDs are unique`).toBe(ids.length);
      for (const stage of stages) expectStageInVocabulary(route, stage, ids);
      expect(raw, `${route}: no version marker, schema field or predicate`).not.toMatch(
        /schema_version|schemaVersion|\$id|\bv\d+\.\d+|\bwhen:/,
      );
    }
  });

  it("makes the edit-text plan a maintenance stage, then verify", async () => {
    const { stages } = await plan("edit-text");
    expect(stages.map((stage) => [stage.kind, names(stage)])).toEqual([
      ["maintenance", ["maintain-edit"]],
      ["verify", VERIFY],
    ]);
  });

  // QFAI:AC-0001-0192-05
  // QFAI:EX-0001-0192-13
  it("orders the add-feature and prototype-feature plans", async () => {
    const kinds = async (route: string) => (await plan(route)).stages.map((stage) => stage.kind);
    expect(await kinds("add-feature")).toEqual([
      "sdd",
      "acceptance",
      "implement",
      "maintenance",
      "verify",
    ]);
    expect(await kinds("prototype-feature")).toEqual([
      "sdd",
      "prototype",
      "acceptance",
      "implement",
      "maintenance",
      "verify",
    ]);
    expect(names((await plan("prototype-feature")).stages.at(-1))).toEqual(VERIFY);
  });

  // QFAI:AC-0001-0193-01
  // QFAI:EX-0001-0193-13
  it("holds the fix-defect plan's append, acceptance and implement stages after the diagnosis", async () => {
    const { raw, stages } = await plan("fix-defect");
    expect(stages.map((stage) => [stage.kind, stage.after])).toEqual([
      ["diagnose", []],
      ["sdd_append", ["diagnose"]],
      ["acceptance", ["spec"]],
      ["implement", ["acceptance"]],
      ["verify", ["implement"]],
    ]);
    expect(stages[1]?.steps).toEqual([
      { name: "sdd-story", passThrough: true },
      { name: "sdd-gate" },
    ]);
    expect(names(stages.at(-1))).toEqual(VERIFY);
    expect(raw).not.toMatch(/\bwhen:/);
  });

  // QFAI:EX-0001-0192-14
  it("ends every change route in the verify block that every stage reaches", async () => {
    let changeRoutes = 0;
    for (const route of PLAN_ROUTES) {
      const { stages } = await plan(route);
      const verify = stages.filter((stage) => names(stage).includes("verify-repo-gate"));
      if (verify.length === 0) continue;
      changeRoutes += 1;
      expect(verify.map(names), route).toEqual([VERIFY]);
      const last = verify[0]?.id ?? "";
      const following = stages.filter((stage) => stage.after.includes(last));
      expect(following.map(names), `${route}: only verify-external follows verify`).toEqual(
        route === "fix-env-bound" ? [["verify-external"]] : [],
      );
      const external = new Set(following.map((stage) => stage.id));
      expect([...reaching(stages, last)].sort(), `${route}: every stage reaches verify`).toEqual(
        stages
          .map((stage) => stage.id)
          .filter((id) => !external.has(id))
          .sort(),
      );
    }
    expect(changeRoutes).toBe(26);
  });

  // QFAI:AC-0001-0003-02
  // QFAI:EX-0001-0003-02
  it("runs the stages in the delivery order of their steps' owners and names no qfai-run", async () => {
    for (const route of PLAN_ROUTES) {
      const { stages } = await plan(route);
      const position = new Map(stages.map((stage, index) => [stage.id, index]));
      const ordered = stages
        .map((stage) => ({ id: stage.id, owner: ownerOf(names(stage)[0] ?? "") }))
        .filter((stage) => OWNER_ORDER.includes(stage.owner));
      for (let i = 1; i < ordered.length; i++) {
        const before = OWNER_ORDER.indexOf(ordered[i - 1]?.owner ?? "");
        const later = OWNER_ORDER.indexOf(ordered[i]?.owner ?? "");
        expect(
          later,
          `${route}: ${ordered[i]?.id} follows ${ordered[i - 1]?.id}`,
        ).toBeGreaterThanOrEqual(before);
      }
      for (const stage of stages) {
        for (const dependency of stage.after) {
          expect(position.get(dependency) ?? -1, `${route}/${stage.id}`).toBeLessThan(
            position.get(stage.id) ?? -1,
          );
        }
      }
      expect(stages.flatMap(names).map(ownerOf)).not.toContain("qfai-run");
    }
  });

  // QFAI:AC-0001-0195-05
  // QFAI:EX-0001-0195-08
  it("names no qfai-grill, and holds a discussion only in the three decide plans", async () => {
    const discussing: string[] = [];
    for (const route of PLAN_ROUTES) {
      const { stages } = await plan(route);
      expect(stages.flatMap(names).map(ownerOf), route).not.toContain("qfai-grill");
      if (stages.some((stage) => stage.kind === "discussion")) discussing.push(route);
    }
    expect(discussing).toEqual(["decide-acceptance", "decide-design", "decompose-epic"]);
  });
});
