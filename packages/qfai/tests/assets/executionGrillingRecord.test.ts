import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const RECORD = "assistant/step/common-grilling-record/STEP.md";
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
      const record = await read(tree, RECORD);
      const row = record.split("\n").find((line) => line.includes(`\`${skill}\``)) ?? "";
      expect(row).toContain(`.qfai/evidence/${evidence}`);
      expect(row).toContain("## Grilling Session");
      expect(row).toContain("Run blocks");
    },
  );

  it("binds each session to its invocation and source revision", async () => {
    const body = flatten(await read(tree, RECORD));
    expect(body).toContain("Preflight: session opened");
    expect(body).toContain("Work Orders Summary");
    expect(body).toMatch(/run start/i);
    expect(body).toMatch(/millisecond/);
    expect(body).toContain("git revision of the clean tree");
    expect(body).toContain("Ended at");
    expect(body).toContain("Work resumed");
  });

  it("rejects stale, duplicate and unreconciled records at its reviewer gate", async () => {
    const body = flatten(await read(tree, RECORD));
    expect(body).toContain("One block per invocation and per stage");
    expect(body).toContain("an older block cannot pass as the current run");
    expect(body).toContain("a duplicate session key");
    expect(body).toContain("at or after the run start");
    expect(body).toContain("later than `Ended at`");
    expect(body).toMatch(/`Open`, `Escalated` or `Decisions` not equal to the lines/);
    expect(body).toContain("An unanswered escalation is an open node");
    expect(body).toMatch(/critical decision/);
    expect(body).toMatch(/REVISE/);
  });

  it("keeps the five endings in the rule master", async () => {
    const master = await readFile(path.join(repoRoot, ".agents/rules/grilling.md"), "utf-8");
    const section = master.split("### The five endings")[1] ?? "";
    for (const ending of ["confirmed", "user-closed", "adopted", "no-question", "stopped"]) {
      expect(section).toContain(`\`${ending}\``);
    }
    expect(section).toContain("stopped");
  });

  it("records a stopped session without resuming work or writing the stopped artifact", async () => {
    const body = flatten(await read(tree, RECORD));
    expect(body).toContain("A stopped session is reported, not written");
    expect(body).toMatch(/resumes no work/);
  });
});
