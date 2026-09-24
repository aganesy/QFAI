import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const stages = [
  { skill: "qfai-atdd", evidence: "atdd-BF-NNNN.md" },
  { skill: "qfai-implement", evidence: "implement-BF-NNNN.md" },
  { skill: "qfai-verify", evidence: "verify-<run-id>.md" },
];
const read = (tree: string, relative: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, relative), "utf-8");
const flatten = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

describe.each(trees)("%s — execution stage grilling records", (tree) => {
  it.each(stages)(
    "$skill records sessions in the evidence its reviewer reads",
    async ({ skill, evidence }) => {
      const body = flatten(await read(tree, `assistant/skill/${skill}/SKILL.md`));
      expect(body).toContain("## Grilling (MANDATORY)");
      expect(body).toContain(`.qfai/evidence/${evidence}`);
      expect(body).toContain("## Grilling Session");
      expect(body).toContain("Preflight:");
      expect(body).toContain("Work Orders Summary");
    },
  );

  it.each(stages)(
    "$skill binds each session to its invocation and source revision",
    async ({ skill }) => {
      const body = flatten(await read(tree, `assistant/skill/${skill}/SKILL.md`));
      expect(body).toMatch(/run.start|invocation.s UTC start time/i);
      expect(body).toMatch(/millisecond/);
      expect(body).toMatch(/Revision|source revision/);
      expect(body).toMatch(/Ended at|end time/);
      expect(body).toMatch(/Work resumed|time work resumed/);
    },
  );

  it.each(stages)(
    "$skill reconciles open nodes and decisions at its reviewer gate",
    async ({ skill }) => {
      const body = flatten(await read(tree, `assistant/skill/${skill}/SKILL.md`));
      expect(body).toMatch(/Open|open nodes/);
      expect(body).toMatch(/Decisions|decisions/);
      expect(body).toMatch(/Session|session ID/);
      expect(body).toMatch(/critical decision/);
      expect(body).toMatch(/REVISE/);
    },
  );

  it("keeps the five endings in the rule master", async () => {
    const master = await readFile(path.join(repoRoot, ".agents/rules/grilling.md"), "utf-8");
    const section = master.split("### The five endings")[1] ?? "";
    for (const ending of ["confirmed", "user-closed", "adopted", "no-question", "stopped"]) {
      expect(section).toContain(`\`${ending}\``);
    }
    expect(section).toContain("stopped");
  });

  it("records a stopped session without resuming work or writing the stopped artifact", async () => {
    for (const { skill } of stages) {
      const body = flatten(await read(tree, `assistant/skill/${skill}/SKILL.md`));
      expect(body).toMatch(/stopped.*(reported|report)/i);
      expect(body).toMatch(/stopped.*(work|resume)/i);
    }
  });
});
