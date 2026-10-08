/**
 * The copy decision a screen contract records reaches the people and agents that
 * author, build and review the screen: the shipped template, guide and
 * instructions all name the same two keys, and the template passes the checks
 * the keys are held to.
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parse as parseYaml } from "yaml";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { normalizeCopy } from "../../src/core/contracts/screenCopy.js";
import { defaultConfig } from "../../src/core/config.js";
import { validateUiScreenCopy } from "../../src/core/validators/uiScreenCopy.js";

// tests/integration/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const SDD = "assistant/skill/qfai-sdd";
const TEMPLATE = `${SDD}/templates/contracts/ui-contract.sample.yaml`;
const GUIDE = `${SDD}/references/ui-contract-guide.md`;
const ANTI_PATTERNS = `${SDD}/references/design-anti-patterns.md`;
const REVIEWER_PROMPT = "assistant/skill/qfai-prototyping/references/reviewer-prompt.md";

/** Each file that authors, builds or reviews a screen, and so has to name both keys. */
const READERS = [
  "assistant/step/sdd-contract/STEP.md",
  "assistant/rule/ui-definition-protocol.md",
  "assistant/skill/qfai-implement/references/ui-affecting.md",
  "assistant/agent/requirements-analyst.md",
  "assistant/agent/frontend-engineer.md",
  "assistant/agent/product-surface-reviewer.md",
  REVIEWER_PROMPT,
  GUIDE,
];

const read = (tree: string, relative: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, relative), "utf-8");

const flat = (text: string): string => text.replace(/\s+/g, " ");

let root = "";

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-screen-copy-assets-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

type Mapping = Record<string, unknown>;

function isMapping(value: unknown): value is Mapping {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function listOf(value: unknown): Mapping[] {
  return Array.isArray(value) ? value.filter(isMapping) : [];
}

// QFAI:AC-0001-0230-05
describe.each(TREES)("%s: the shipped UI contract template", (tree) => {
  // QFAI:EX-0001-0230-09
  it("passes the copy checks when it is copied under the UI contract directory", async () => {
    const template = await read(tree, TEMPLATE);
    const uiDir = path.join(root, ".qfai", "spec", "03_contract", "ui");
    await mkdir(uiDir, { recursive: true });
    await writeFile(path.join(uiDir, "ui-0001-orders.yaml"), template, "utf-8");

    expect(await validateUiScreenCopy(root, defaultConfig)).toEqual([]);
  });

  // QFAI:EX-0001-0230-10
  it("declares where the draft is kept and the recovery after a failed save, and restates no label", async () => {
    const parsed: unknown = parseYaml(await read(tree, TEMPLATE));
    const screens = listOf(isMapping(parsed) ? parsed.screens : undefined);
    expect(screens.length).toBeGreaterThan(0);

    const [screen] = screens;
    const supplements = listOf(screen?.supplements);
    const near = (id: string, when: string): Mapping | undefined =>
      supplements.find((entry) => entry.near === id && entry.when === when);

    expect(near("save_draft", "success")?.text).toBe("Saved to Drafts");
    expect(String(near("save_draft", "error")?.text)).toContain("Your entries are still here");

    const labels = [...listOf(screen?.elements), ...listOf(screen?.actions)].map((entry) =>
      normalizeCopy(String(entry.label)),
    );
    for (const supplement of supplements) {
      expect(labels).not.toContain(normalizeCopy(String(supplement.text)));
      expect(String(supplement.why).length).toBeGreaterThan(0);
    }
    // The sample shows a screen with a group that shows a heading and one that shows none.
    const groups = listOf(screen?.structure);
    expect(groups.some((group) => group.heading === undefined)).toBe(true);
    expect(groups.some((group) => typeof group.heading === "string")).toBe(true);
  });

  it("keeps every screen's primary tasks, which the copy keys are added beside", async () => {
    const parsed: unknown = parseYaml(await read(tree, TEMPLATE));
    for (const screen of listOf(isMapping(parsed) ? parsed.screens : undefined)) {
      expect(listOf(screen.primary_tasks).length).toBeGreaterThan(0);
    }
  });
});

// QFAI:AC-0001-0230-06
describe.each(TREES)("%s: the guidance that reads the copy keys", (tree) => {
  // QFAI:EX-0001-0230-11
  it("names supplements and structure in every file that authors, builds or reviews a screen", async () => {
    for (const relative of READERS) {
      const text = await read(tree, relative);
      expect(text, relative).toContain("supplements");
      expect(text, relative).toContain("structure");
    }
  });

  it("makes the keys required input of implementation and review in the protocol", async () => {
    const protocol = flat(await read(tree, "assistant/rule/ui-definition-protocol.md"));
    expect(protocol).toContain("The supplements and structure are required input");
    expect(protocol).toContain("A screen that lacks them is returned to `/qfai-sdd`");
  });

  it("states the shapes, the protected information and the findings in the guide", async () => {
    const guide = flat(await read(tree, GUIDE));
    expect(guide).toContain("## Purposeful copy: `supplements` and `structure`");
    expect(guide).toContain("`supplements: []` says the screen shows none");
    expect(guide).toContain("It never removes");
    expect(guide).toContain("Moving such text into a tooltip or a placeholder does not keep it");
    expect(guide).toContain("A word or character count never approves or rejects a screen");
    for (const code of ["QFAI-CONTRACT-043", "QFAI-CONTRACT-044", "QFAI-CONTRACT-045"]) {
      expect(guide, code).toContain(code);
    }
  });

  // QFAI:EX-0001-0230-12
  it("holds the meaning patterns apart from the brand patterns, and the prototype reviewer applies them", async () => {
    const antiPatterns = await read(tree, ANTI_PATTERNS);
    const antiPatternsFlat = flat(antiPatterns);
    const start = antiPatterns.indexOf("\n## Copy that adds no meaning\n");
    expect(start).toBeGreaterThan(0);
    const section = antiPatterns.slice(start + 1, antiPatterns.indexOf("\n## ", start + 1));
    expect(section.match(/^- /gm)).toHaveLength(3);
    expect(flat(section)).toContain("A chosen visual direction does not exempt them");
    expect(flat(section)).toContain(
      "judge where it sits and what it lets the user do, not the word",
    );
    expect(antiPatternsFlat).toContain("A second heading or a sentence repeats the main heading");
    expect(antiPatternsFlat).toContain("A condition the user already knows is explained again");
    expect(antiPatternsFlat).toContain("development instruction, implementation commentary");

    const reviewer = flat(await read(tree, REVIEWER_PROMPT));
    expect(reviewer).toContain(
      "the section on copy that adds no meaning, which the loop step names",
    );
    expect(reviewer).not.toContain("design-anti-patterns.md");
    const loop = await read(tree, "assistant/step/prototyping-loop/STEP.md");
    expect(loop).toContain("design-anti-patterns.md#copy-that-adds-no-meaning");
    expect(reviewer).toContain("Moving that into a tooltip or a placeholder is not a repair");
    expect(reviewer).toContain("Nothing here passes or fails on its own");
  });

  it("asks the reviewer for the screen, the task or state, the meaning and the repair", async () => {
    const agent = flat(await read(tree, "assistant/agent/product-surface-reviewer.md"));
    expect(agent).toContain(
      "Name the screen, the task or state, the duplicated meaning or unmet need, and the text to remove or the control or structure to repair",
    );
    expect(agent).toContain("Word counts are observations, never a verdict");
  });

  it("keeps the discussion sidecar an input, not a second source", async () => {
    const normalization = flat(
      await read(tree, `${SDD}/references/ui-design-contract-normalization.md`),
    );
    expect(normalization).toContain("`supplements` and `structure`");
    const step = flat(await read(tree, "assistant/step/sdd-contract/STEP.md"));
    expect(step).toContain("The discussion sidecar stays an input");
  });
});

describe("a project with no UI contract", () => {
  it("acquires no copy obligation", async () => {
    const apiDir = path.join(root, ".qfai", "spec", "03_contract", "api");
    await mkdir(apiDir, { recursive: true });
    await writeFile(
      path.join(apiDir, "api-0001-orders.yaml"),
      "# QFAI-CONTRACT-ID: API-0001\nopenapi: 3.0.0\n",
      "utf-8",
    );
    expect(await validateUiScreenCopy(root, defaultConfig)).toEqual([]);
  });
});
