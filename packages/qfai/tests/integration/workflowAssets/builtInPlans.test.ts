/**
 * Integration: the five plans the package ships under `assets/defaults/workflows/`.
 *
 * Reads each plan as YAML and holds it to the plan format and vocabulary of the workflow file
 * contract: one file per route, each stage's kind, skill and operation paired as the vocabulary
 * pairs them, and every change route ending in a full verify. How the core loads a plan is not
 * this module's.
 */
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { PLAN_ROUTES, readDefault } from "../../helpers/shippedAssistant.js";

interface Stage {
  id: string;
  kind: string;
  skill: string | string[];
  operation: string;
  when: string;
  after?: string[];
}

/** The stage kinds, and the skill and operation each carries. */
const VOCABULARY: Record<string, { skill: string | string[]; operation: string }> = {
  maintenance: { skill: "qfai-maintain", operation: "non-normative-edit" },
  diagnose: { skill: "qfai-implement", operation: "diagnose-only" },
  sdd_append: { skill: "qfai-sdd", operation: "defect-example-seeding" },
  test_fix: { skill: ["qfai-atdd", "qfai-implement"], operation: "test-fix" },
  regression_fix: { skill: "qfai-implement", operation: "regression-fix" },
  sdd: { skill: "qfai-sdd", operation: "new-story" },
  sdd_delta: { skill: "qfai-sdd", operation: "update-or-applicability-check" },
  prototype: { skill: "qfai-prototyping", operation: "existing-runtime-contract" },
  acceptance: { skill: "qfai-atdd", operation: "author-acceptance-tests" },
  implement: { skill: "qfai-implement", operation: "implement" },
  verify: { skill: "qfai-verify", operation: "verify-full" },
  discussion: { skill: "qfai-discussion", operation: "resolve-unsettled-product-scope" },
};

const PREDICATES = [
  "always",
  "missing_example_needed",
  "diagnosis_missing_test",
  "test_defect_found",
  "regression_found",
  "acceptance_obligations_unmet",
  "prototype_decision_needed",
  "full_discussion_needed",
];

const STAGE_KEYS = ["id", "kind", "skill", "operation", "when", "after", "effects"];

/** The order the delivery contract fixes for the stage skills a plan names. */
const SKILL_ORDER = ["qfai-discussion", "qfai-sdd", "qfai-prototyping", "qfai-atdd", "qfai-verify"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStage(value: unknown): value is Stage {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.kind === "string" &&
    (typeof value.skill === "string" || Array.isArray(value.skill)) &&
    typeof value.operation === "string" &&
    typeof value.when === "string"
  );
}

async function plan(
  route: string,
): Promise<{ raw: string; keys: string[]; route: unknown; stages: Stage[] }> {
  const raw = await readDefault(`workflows/${route}.yml`);
  const parsed: unknown = parse(raw);
  const doc = isRecord(parsed) ? parsed : {};
  const stages = Array.isArray(doc.stages) ? doc.stages : [];
  expect(stages.every(isStage), `${route}: every stage has its keys`).toBe(true);
  return { raw, keys: Object.keys(doc), route: doc.route, stages: stages.filter(isStage) };
}

/** The stages that reach `target` through `after` edges, `target` included. */
function reaching(stages: Stage[], target: string): Set<string> {
  const found = new Set([target]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const stage of stages) {
      if (found.has(stage.id)) continue;
      if (stages.some((next) => found.has(next.id) && (next.after ?? []).includes(stage.id))) {
        found.add(stage.id);
        grew = true;
      }
    }
  }
  return found;
}

describe("the built-in plans", () => {
  it("ship one plan per route, in the plan format and vocabulary", async () => {
    for (const route of PLAN_ROUTES) {
      const { raw, keys, route: named, stages } = await plan(route);
      expect(named, `${route}.yml names its route`).toBe(route);
      expect(keys.sort(), route).toEqual(["route", "stages"]);
      expect(stages.length, route).toBeGreaterThan(0);
      const ids = stages.map((stage) => stage.id);
      expect(new Set(ids).size, `${route}: stage IDs are unique`).toBe(ids.length);
      for (const stage of stages) {
        const where = `${route}/${stage.id}`;
        expect(
          Object.keys(stage).every((key) => STAGE_KEYS.includes(key)),
          where,
        ).toBe(true);
        const expected = VOCABULARY[stage.kind];
        expect(expected, `${where}: kind ${stage.kind}`).toBeDefined();
        expect(stage.skill, where).toEqual(expected?.skill);
        expect(stage.operation, where).toBe(expected?.operation);
        expect(PREDICATES, where).toContain(stage.when);
        for (const dependency of stage.after ?? []) {
          expect(ids, `${where}: after ${dependency}`).toContain(dependency);
        }
      }
      expect(raw, `${route}: no version marker or schema field`).not.toMatch(
        /schema_version|schemaVersion|\$id|\bv\d+\.\d+/,
      );
    }
  });

  it("makes the direct plan a maintenance stage, then a full verify", async () => {
    const { stages } = await plan("direct");
    expect(stages.map((stage) => [stage.kind, stage.skill, stage.operation])).toEqual([
      ["maintenance", "qfai-maintain", "non-normative-edit"],
      ["verify", "qfai-verify", "verify-full"],
    ]);
  });

  // QFAI:AC-0001-0192-05
  // QFAI:EX-0001-0192-13
  it("orders the feature plan story authoring, prototyping, acceptance, implement, verify", async () => {
    const { stages } = await plan("feature");
    expect(stages.map((stage) => [stage.kind, stage.when])).toEqual([
      ["sdd", "always"],
      ["prototype", "prototype_decision_needed"],
      ["acceptance", "acceptance_obligations_unmet"],
      ["implement", "always"],
      ["verify", "always"],
    ]);
    expect(stages.at(-1)?.operation).toBe("verify-full");
  });

  // QFAI:AC-0001-0193-01
  // QFAI:EX-0001-0193-13
  it("runs the bugfix plan's implement stage on every missing-test diagnosis", async () => {
    const { stages } = await plan("bugfix");
    expect(stages.map((stage) => [stage.kind, stage.when])).toEqual([
      ["diagnose", "always"],
      ["sdd_append", "missing_example_needed"],
      ["acceptance", "acceptance_obligations_unmet"],
      ["implement", "diagnosis_missing_test"],
      ["regression_fix", "regression_found"],
      ["test_fix", "test_defect_found"],
      ["verify", "always"],
    ]);
    expect(stages.at(-1)?.operation).toBe("verify-full");
  });

  // QFAI:EX-0001-0192-14
  it("ends every change route in a full verify that every stage reaches", async () => {
    for (const route of ["direct", "bugfix", "bounded-change", "feature"]) {
      const { stages } = await plan(route);
      const verify = stages.filter((stage) => stage.kind === "verify");
      expect(
        verify.map((stage) => stage.operation),
        route,
      ).toEqual(["verify-full"]);
      const last = verify[0]?.id ?? "";
      expect(
        stages.filter((stage) => (stage.after ?? []).includes(last)),
        `${route}: nothing runs after verify`,
      ).toEqual([]);
      expect([...reaching(stages, last)].sort(), `${route}: every stage reaches verify`).toEqual(
        stages.map((stage) => stage.id).sort(),
      );
    }
  });

  // QFAI:AC-0001-0003-02
  // QFAI:EX-0001-0003-02
  it("runs the stage skills in the delivery order and names no qfai-run", async () => {
    for (const route of PLAN_ROUTES) {
      const { stages } = await plan(route);
      const position = new Map(stages.map((stage, index) => [stage.id, index]));
      const ordered = stages.filter(
        (stage) => typeof stage.skill === "string" && SKILL_ORDER.includes(stage.skill),
      );
      for (let i = 1; i < ordered.length; i++) {
        const before = SKILL_ORDER.indexOf(String(ordered[i - 1]?.skill));
        const after = SKILL_ORDER.indexOf(String(ordered[i]?.skill));
        expect(
          after,
          `${route}: ${ordered[i]?.id} follows ${ordered[i - 1]?.id}`,
        ).toBeGreaterThanOrEqual(before);
      }
      for (const stage of stages) {
        for (const dependency of stage.after ?? []) {
          expect(position.get(dependency) ?? -1, `${route}/${stage.id}`).toBeLessThan(
            position.get(stage.id) ?? -1,
          );
        }
      }
      expect(stages.flatMap((stage) => stage.skill)).not.toContain("qfai-run");
    }
  });

  // QFAI:AC-0001-0195-05
  // QFAI:EX-0001-0195-08
  it("names no qfai-grill, and holds a discussion only under full_discussion_needed", async () => {
    for (const route of PLAN_ROUTES) {
      const { stages } = await plan(route);
      expect(
        stages.flatMap((stage) => stage.skill),
        route,
      ).not.toContain("qfai-grill");
      for (const stage of stages.filter((each) => each.kind === "discussion")) {
        expect(stage.when, `${route}/${stage.id}`).toBe("full_discussion_needed");
      }
    }
  });
});
