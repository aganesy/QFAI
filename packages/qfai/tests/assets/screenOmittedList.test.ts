/**
 * The reason a screen leaves a business-screen part out has one place: the
 * `omitted` list of its UI contract, and the home screen's contract for the
 * once-per-application parts. The rule, the guide, the template, the contract
 * step and the reviewer card all point at it.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

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

function isMapping(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// QFAI:EX-0001-0305-03
describe("the rule, guide, template and contract step say where the reason goes", () => {
  it("the rule puts the reason in the screen's omitted list and app-level parts on the home", async () => {
    const rule = flat(await read("root/.agents/rules/interface-clarity.md"));
    expect(rule).toContain(
      "Leaving one of these out needs a reason recorded in the `omitted` list of the UI contract of the screen it is missing from",
    );
    expect(rule).toContain(
      "its entry goes in the home screen's contract until an app-level UI contract exists",
    );
    expect(rule).toContain("a notice in its `omitted` list");
  });

  it("the guide documents the omitted key and its two fields", async () => {
    const guide = flat(
      await read(".qfai/assistant/skill/qfai-sdd/references/ui-contract-guide.md"),
    );
    expect(guide).toContain("- Parts left out: `omitted`");
    expect(guide).toContain("## Parts left out: `omitted`");
    expect(guide).toContain("| `part` |");
    expect(guide).toContain("| `reason` |");
    expect(guide).toContain("on the home screen's contract until an app-level UI contract exists");
    expect(guide).toContain("`QFAI-CONTRACT-052`");
  });

  it("the template shows a screen with an omitted entry of part and reason", async () => {
    const parsed: unknown = parseYaml(
      await read(".qfai/assistant/skill/qfai-sdd/templates/contracts/ui-contract.sample.yaml"),
    );
    expect(isMapping(parsed)).toBe(true);
    const screens = isMapping(parsed) && Array.isArray(parsed.screens) ? parsed.screens : [];
    const first: unknown = screens[0];
    const omitted = isMapping(first) && Array.isArray(first.omitted) ? first.omitted : [];
    expect(omitted.length).toBeGreaterThan(0);
    for (const entry of omitted) {
      expect(isMapping(entry) ? Object.keys(entry).sort() : []).toEqual(["part", "reason"]);
    }
  });

  it("the contract step writes a part it leaves out into the omitted list", async () => {
    const step = flat(await read(".qfai/assistant/step/sdd-contract/STEP.md"));
    expect(step).toContain(
      "A part left out gets a `{ part, reason }` entry in that screen's `omitted` list",
    );
    expect(step).toContain(
      "A required notice it leaves out gets a `{ part, reason }` entry in its `omitted` list",
    );
  });
});

// QFAI:EX-0001-0305-04
describe("the product-surface reviewer reads the omitted list as the recorded reason", () => {
  it("names the omitted list, the states key and the home screen's contract", async () => {
    const card = flat(await read(".qfai/assistant/agent/product-surface-reviewer.md"));
    expect(card).toContain(
      "The recorded reason for leaving a listed part out is an entry naming the part in the `omitted` list of the screen's UI contract",
    );
    expect(card).toContain("its `none` under `states`");
    expect(card).toContain(
      "Read the once-per-application parts' entries from the home screen's contract until an app-level UI contract exists.",
    );
    expect(card).toContain("A reason written anywhere else is not a recorded reason");
  });
});
