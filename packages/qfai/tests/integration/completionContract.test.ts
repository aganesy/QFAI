import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { readImplementFlowSteps } from "../helpers/implementSteps.js";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const templateRoot = path.join(repoRoot, "packages", "qfai", "assets", "init");
const uiuxTemplateDir = path.join(
  templateRoot,
  ".qfai",
  "assistant",
  "skill",
  "qfai-discussion",
  "templates",
  "uiux",
);
const implementAssistantDir = path.join(templateRoot, ".qfai", "assistant");

let content: string | undefined;

async function loadContent(): Promise<string> {
  content ??= await readImplementFlowSteps(implementAssistantDir);
  return content;
}

describe("BF completion gate", () => {
  it("requires observed RED, GREEN, and Refactor results for every implemented EX", async () => {
    const c = await loadContent();
    expect(c).toMatch(/Observe the assertion fail for the intended behavior before changing/);
    expect(c).toMatch(
      /load error, missing dependency, or broken fixture is\s+not an admissible RED/,
    );
    expect(c).toMatch(/Run the same selector and record\s+command and outcome/);
    expect(c).toMatch(/A failing or unrun gate cannot be reported as PASS/);
    expect(c).toMatch(/It is done for the flow when every example the\s+selection listed is done/);
  });
});
// ---------------------------------------------------------------------------
// spec-0010: Canonical template generation / deprecation
// ---------------------------------------------------------------------------

describe("canonical templates ship with the UI-bearing family", () => {
  it("verifies UI-bearing UIX templates exist after init", async () => {
    const files = await readdir(uiuxTemplateDir);
    // Brand-level inputs moved to root DESIGN.md; only screen-level
    // sidecars remain.
    const canonicalTemplates = files.filter((f) =>
      ["40_screen_contracts.md", "50_review_input_bundle.md"].includes(f),
    );
    expect(canonicalTemplates.length).toBeGreaterThanOrEqual(2);
    for (const tpl of canonicalTemplates) {
      await expect(access(path.join(uiuxTemplateDir, tpl))).resolves.toBeUndefined();
    }
  });
});

describe("00_index.md references canonical family", () => {
  it("canonical family referenced in 00_index.md", async () => {
    const indexPath = path.join(uiuxTemplateDir, "00_index.md");
    const content = await readFile(indexPath, "utf-8");
    expect(content).toMatch(/exploration brief|reference pool|exploration rubric/i);
  });
});

// ---------------------------------------------------------------------------
// spec-0002: Canonical entrypoint wiring / old aggregator deprecation
// ---------------------------------------------------------------------------

describe("canonical entrypoint wiring", () => {
  it("validateProject source calls runCanonicalUixValidators", async () => {
    const validateSrc = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "core", "validate.ts"),
      "utf-8",
    );
    expect(validateSrc).toContain("runCanonicalUixValidators");
  });
});
