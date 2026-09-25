import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const reviewers = [
  "architecture-reviewer",
  "completion-reviewer",
  "implementation-reviewer",
  "product-surface-reviewer",
  "qa-gatekeeper",
  "requirements-reviewer",
];

describe.each(trees)("reviewer excess route in %s", (tree) => {
  it("keeps in-scope blocking findings at the gate and sends new scope to SDD", async () => {
    const baseline = await readFile(
      path.join(root, tree, "assistant/rule/shared-skill-delegation-baseline.md"),
      "utf-8",
    );
    const text = baseline.replace(/\s+/g, " ");
    expect(text).toContain("Any in-scope blocking finding from an invoked reviewer prevents DONE");
    expect(text).toContain("Article VII excess in the reviewing stage's own artifacts is in scope");
    expect(text).toContain(
      "quality of downstream implementation code is deferred at upstream stages",
    );
    expect(text).toContain("Report an unsupported Article VII route as advisory");
  });

  it("gives each reviewer the shared rule", async () => {
    for (const reviewer of reviewers) {
      const card = await readFile(
        path.join(root, tree, "assistant/agent", `${reviewer}.md`),
        "utf-8",
      );
      expect(card, reviewer).toContain("shared-skill-delegation-baseline.md");
    }
  });
});
