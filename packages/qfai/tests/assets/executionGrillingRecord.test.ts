import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const RECORD = "assistant/step/common-grilling-record/STEP.md";
const read = (tree: string, relative: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, relative), "utf-8");
const flatten = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

describe.each(trees)("%s — the grilling record", (tree) => {
  it("is written by the discussion stage alone", async () => {
    const body = flatten(await read(tree, RECORD));
    expect(body).toContain("Only the discussion stage writes this record.");
    expect(body).toContain("## One session");
    expect(body).toContain("`Authoring began` is later than `Ended at`.");
    expect(body).not.toContain("Work Orders Summary");
    expect(body).not.toContain("Run blocks");
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
