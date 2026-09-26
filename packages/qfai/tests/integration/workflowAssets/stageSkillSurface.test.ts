/**
 * Integration: what every skill a built-in plan names carries so a workflow run can reach it.
 *
 * The description opens with its trigger, one `references/orchestrated-mode.md` holds the skill's
 * orchestrated-mode rules and its Operations table, one `SKILL.md` line cites it, and nothing blocks
 * model invocation. The workflow core's own reading of the table is not this module's.
 */
import { describe, expect, it } from "vitest";

import {
  PLAN_SKILLS,
  frontMatterOf,
  operationsOf,
  readShipped,
  shippedExists,
} from "../../helpers/shippedAssistant.js";

const REFERENCE = "references/orchestrated-mode.md";

/** The operations each plan skill serves, as the workflow file contract's vocabulary assigns them. */
const OPERATIONS: Record<(typeof PLAN_SKILLS)[number], string[]> = {
  "qfai-sdd": ["defect-example-seeding", "new-story", "update-or-applicability-check"],
  "qfai-atdd": ["author-acceptance-tests", "test-fix"],
  "qfai-implement": ["diagnose-only", "implement", "regression-fix", "seam-only", "test-fix"],
  "qfai-verify": ["verify-full"],
  "qfai-discussion": ["resolve-unsettled-product-scope"],
  "qfai-prototyping": ["existing-runtime-contract"],
  "qfai-maintain": ["non-normative-edit"],
};

async function operations(skill: string): Promise<{ header: string; ids: string[] }> {
  const { header, ids } = operationsOf(await readShipped(`skill/${skill}/${REFERENCE}`));
  return { header, ids: [...ids].sort() };
}

describe("stage skills reachable from a workflow run", () => {
  // QFAI:AC-0001-0202-04
  // QFAI:EX-0001-0202-07
  it("opens every plan skill's description with its trigger condition", async () => {
    for (const skill of PLAN_SKILLS) {
      const description = frontMatterOf(await readShipped(`skill/${skill}/SKILL.md`)).description;
      expect(typeof description, `${skill} has a description`).toBe("string");
      const text = String(description);
      const first = text.split(/(?<=\.)\s/)[0] ?? "";
      expect(first, `${skill}: nothing precedes the trigger sentence`).toBe(
        "Use when invoked by name or handed a QFAI work order.",
      );
      expect(text.length, `${skill}: at most 1024 characters`).toBeLessThanOrEqual(1024);
      expect(text, `${skill}: no angle bracket`).not.toMatch(/[<>]/);
    }
  });

  // QFAI:AC-0001-0202-05
  // QFAI:EX-0001-0202-08
  it("keeps one orchestrated-mode reference per plan skill, cited by one SKILL.md line", async () => {
    for (const skill of PLAN_SKILLS) {
      expect(shippedExists(`skill/${skill}/${REFERENCE}`), `${skill}/${REFERENCE} exists`).toBe(
        true,
      );
      const body = await readShipped(`skill/${skill}/SKILL.md`);
      const citing = body.split("\n").filter((line) => line.includes("orchestrated-mode"));
      expect(citing, `${skill}/SKILL.md lines naming the orchestrated mode`).toEqual([
        "Inside an `npx qfai workflow` run, follow `references/orchestrated-mode.md`.",
      ]);
    }
  });

  // QFAI:AC-0001-0202-06
  // QFAI:EX-0001-0202-09
  it("leaves every plan skill model-invocable", async () => {
    for (const skill of PLAN_SKILLS) {
      const text = await readShipped(`skill/${skill}/SKILL.md`);
      expect(text, `${skill}/SKILL.md has front matter`).toMatch(/^---\r?\n/);
      expect(Object.keys(frontMatterOf(text)), skill).not.toContain("disable-model-invocation");
    }
  });

  // QFAI:AC-0001-0204-02
  // QFAI:EX-0001-0204-02
  it("lists exactly the acceptance operations in the ATDD Operations table", async () => {
    expect(await operations("qfai-atdd")).toEqual({
      header: "Operation",
      ids: OPERATIONS["qfai-atdd"],
    });
  });

  // QFAI:AC-0001-0207-02
  // QFAI:EX-0001-0207-02
  it("lists exactly the implement operations in the implement Operations table", async () => {
    expect(await operations("qfai-implement")).toEqual({
      header: "Operation",
      ids: OPERATIONS["qfai-implement"],
    });
  });

  // QFAI:AC-0001-0214-04
  // QFAI:EX-0001-0214-04
  it("lists exactly the story-authoring operations in the SDD Operations table", async () => {
    expect(await operations("qfai-sdd")).toEqual({
      header: "Operation",
      ids: OPERATIONS["qfai-sdd"],
    });
  });

  // QFAI:AC-0001-0215-07
  // QFAI:EX-0001-0215-08
  it("lists exactly verify-full in the verify Operations table", async () => {
    expect(await operations("qfai-verify")).toEqual({
      header: "Operation",
      ids: OPERATIONS["qfai-verify"],
    });
  });

  // QFAI:AC-0001-0206-03
  // QFAI:EX-0001-0206-03
  it("lists exactly the discussion operation in the discussion Operations table", async () => {
    expect(await operations("qfai-discussion")).toEqual({
      header: "Operation",
      ids: OPERATIONS["qfai-discussion"],
    });
  });

  // QFAI:AC-0001-0211-02
  // QFAI:EX-0001-0211-02
  it("lists exactly the prototyping operation in the prototyping Operations table", async () => {
    expect(await operations("qfai-prototyping")).toEqual({
      header: "Operation",
      ids: OPERATIONS["qfai-prototyping"],
    });
  });

  it("lists exactly the maintenance operation in the maintain Operations table", async () => {
    expect(await operations("qfai-maintain")).toEqual({
      header: "Operation",
      ids: OPERATIONS["qfai-maintain"],
    });
  });

  it("points every plan skill's reference at the entry check", async () => {
    for (const skill of PLAN_SKILLS) {
      const reference = await readShipped(`skill/${skill}/${REFERENCE}`);
      expect(reference, skill).toContain(
        "`.qfai/assistant/rule/shared-skill-operating-baseline.md#workflow-run-entry-check-mandatory`",
      );
      expect(reference, `${skill}: a work order naming another operation is refused`).toContain(
        "The skill serves exactly these operations. A work order naming any other is refused.",
      );
    }
  });
});
