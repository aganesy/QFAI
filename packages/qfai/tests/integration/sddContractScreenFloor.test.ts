/**
 * The sdd-contract step adds the standard parts of a business screen to each
 * UI contract after deriving elements from the examples.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const initRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "assets",
  "init",
);
const read = (relative: string): Promise<string> =>
  readFile(path.join(initRoot, ...relative.split("/")), "utf-8");
const flat = (text: string): string => text.replace(/\s+/g, " ");
const LIST = "## What a business screen always has";

// QFAI:AC-0001-0305-01
describe("the contract step checks each screen against the business-screen list", () => {
  it("names a heading the shipped interface-clarity rule declares", async () => {
    const step = flat(await read(".qfai/assistant/step/sdd-contract/STEP.md"));
    const rule = await read("root/.agents/rules/interface-clarity.md");
    expect(rule.split(/\r?\n/)).toContain(LIST);
    expect(step).toContain(`check the screen against \`${LIST}\``);
  });
});

// QFAI:AC-0001-0305-02
describe("the contract step writes the app frame once, where the rule and the reviewer read it", () => {
  it("puts a left-out once-per-application part's reason in the contract the rule and the reviewer name", async () => {
    const step = flat(await read(".qfai/assistant/step/sdd-contract/STEP.md"));
    const rule = flat(await read("root/.agents/rules/interface-clarity.md"));
    const reviewer = flat(await read(".qfai/assistant/agent/product-surface-reviewer.md"));
    expect(step).toContain("one UI contract, the app frame, holds them");
    expect(step).toContain(
      "A once-per-application part the project leaves out, the shell included, gets its entry in the frame's `omitted` list.",
    );
    expect(rule).toContain("its entry goes in the app frame");
    expect(reviewer).toContain("(for a once-per-application part, in the app frame)");
  });
});

// QFAI:AC-0001-0305-04
describe("the contract step names each application screen's type by its ID", () => {
  it("writes `pattern: <id>` with an ID the business UI pattern reference gives", async () => {
    const step = flat(await read(".qfai/assistant/step/sdd-contract/STEP.md"));
    const reference = await read(
      ".qfai/assistant/skill/qfai-sdd/references/business-ui-patterns.md",
    );
    expect(step).toContain("`pattern: <id>`");
    expect(step).toContain("`pattern: list`");
    expect(reference.split(/\r?\n/)).toContain("ID: `list`.");
  });
});

// QFAI:AC-0001-0305-06
describe("the implementation and the screen review read a screen's type from its pattern", () => {
  it("takes the type from the contract's `pattern` and falls back to the screen only without one", async () => {
    const reference = ".qfai/assistant/skill/qfai-sdd/references/business-ui-patterns.md";
    const declared = "the `pattern` its UI contract declares";
    const fallback = "only when the contract writes no `pattern`";
    for (const reader of [
      ".qfai/assistant/step/implement-tdd/STEP.md",
      ".qfai/assistant/agent/product-surface-reviewer.md",
    ]) {
      const text = flat(await read(reader));
      expect(text).toContain(reference);
      expect(text).toContain(declared);
      expect(text).toContain(fallback);
      expect(text).toContain("`surface: marketing`");
      expect(text.indexOf(declared)).toBeLessThan(text.indexOf(fallback));
    }
  });
});
