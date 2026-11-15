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
      "A once-per-application part the project leaves out, the shell included, gets its reason in the frame.",
    );
    expect(rule).toContain("its reason goes in the app frame");
    expect(reviewer).toContain("(for a once-per-application part, in the app frame)");
  });
});
