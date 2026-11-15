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

// QFAI:EX-0001-0305-02
describe("sdd-contract writes the app frame once", () => {
  it("holds the shell, role navigation and home in one UI contract that other screens name", async () => {
    const step = flat(await read(".qfai/assistant/step/sdd-contract/STEP.md"));
    const section = step.slice(
      step.indexOf("## UI contracts"),
      step.indexOf("## A named contract"),
    );
    expect(section).toContain(
      "The app shell, the navigation for each role and the home belong to no single flow, so one UI contract, the app frame, holds them.",
    );
    expect(section).toContain(
      "When no UI contract holds the shell or records why the application has none, write the frame with the flow at hand",
    );
    expect(section).toContain(
      "Every other application screen that renders inside the shell names the frame's shell screen in `navigation.shell`; a screen with no frame, such as a sign-in page, says so.",
    );
    expect(section).toContain(
      "A once-per-application part the project leaves out, the shell included, gets its reason in the frame.",
    );
    expect(section).toContain(
      "Settings, member management and notifications become frame screens only when a story needs them; this step adds none on its own.",
    );
    const guide = flat(
      await read(".qfai/assistant/skill/qfai-sdd/references/ui-contract-guide.md"),
    );
    expect(guide).toContain("`shell` names the frame's shell screen.");
  });
});
