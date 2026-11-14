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

// QFAI:EX-0001-0305-01
describe("sdd-contract writes the business-screen parts into a UI contract", () => {
  it("reads the list and applies it after the examples, with no example owed for a part", async () => {
    const step = flat(await read(".qfai/assistant/step/sdd-contract/STEP.md"));
    const reads = step.slice(step.indexOf("## Reads"), step.indexOf("## Writes"));
    expect(reads).toContain(`${LIST}\` in \`.agents/rules/interface-clarity.md\``);
    const section = step.slice(
      step.indexOf("## UI contracts"),
      step.indexOf("## A named contract"),
    );
    expect(section).toContain(
      "After deriving a screen's elements and actions from the examples, check the screen against",
    );
    expect(section).toContain("Add each part that applies and is missing");
    expect(section).toContain("needs no example of its own unless it carries a business rule");
  });
});
