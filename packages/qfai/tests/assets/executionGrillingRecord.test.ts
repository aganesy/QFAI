import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const RECORD = "assistant/step/common-grilling-record/STEP.md";
const read = (tree: string, relative: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, relative), "utf-8");
const flatten = (markdown: string): string => markdown.replace(/\s+/g, " ");

describe.each(trees)("%s — the grilling record", (tree) => {
  it("is rows of the run's deliberation record", async () => {
    const body = flatten(await read(tree, RECORD));
    expect(body).toContain("## Rows the session writes");
    expect(body).toContain(
      "| Put a question to the user | One Interview row, under the stage's subheading, written when the answer arrives |",
    );
    expect(body).toContain(
      "| Took a decision in a delegated session | One Agent decisions row with at least three options, the griller's recommendation chosen |",
    );
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
    expect(body).toContain(
      "The ending is reported in the stage report, and a `stopped` session writes nothing more.",
    );
  });
});
