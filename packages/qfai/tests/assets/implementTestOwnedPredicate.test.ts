import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = (tree: string, relative: string): Promise<string> =>
  readFile(path.join(root, tree, relative), "utf-8");

describe.each(trees)("%s — implementation RED evidence", (tree) => {
  it("rejects collection failures and an assertion unrelated to the example", async () => {
    const [skill, admissibility] = await Promise.all([
      read(tree, "assistant/skill/qfai-implement/SKILL.md"),
      read(tree, "assistant/skill/qfai-implement/references/red-admissibility.md"),
    ]);
    expect(skill).toContain("A load error, missing dependency, or broken fixture is");
    expect(skill).toContain("not an admissible RED.");
    expect(admissibility).toContain("fail on the behavior that the example states");
    expect(admissibility).toContain("Temporarily neutralize only the example assertion");
    expect(admissibility).toContain("restore the assertion before asking the gatekeeper");
  });

  it("records a passing existing behavior as a falsifiability probe and restores it", async () => {
    const [skill, probe] = await Promise.all([
      read(tree, "assistant/skill/qfai-implement/SKILL.md"),
      read(tree, "assistant/skill/qfai-implement/references/red-not-observable.md"),
    ]);
    expect(skill).toContain("references/red-not-observable.md");
    expect(probe).toContain("rerun the same test, and capture the assertion failure");
    expect(probe).toContain("Restore the predicate and rerun the test");
    expect(probe).toContain("The mutation is a probe and is removed before any review or commit.");
    expect(probe).toContain("Record both revisions and outputs as falsifiability evidence");
  });

  it("rejects a mutation of the test's own checker or fixture as behavior proof", async () => {
    const probe = await read(
      tree,
      "assistant/skill/qfai-implement/references/red-not-observable.md",
    );
    expect(probe).toContain("The test's own checker or fixture is not the behavior");
    expect(probe).toContain("Do not mutate it to manufacture a failure.");
    expect(probe).toContain("Record the test file hash");
    expect(probe).toContain("confirm the test is unchanged after restoration");
    expect(probe).toContain("improve the oracle or raise a contract gap");
  });
});
