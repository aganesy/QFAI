import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { readImplementFlowSteps } from "../helpers/implementSteps.js";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const templateRoot = path.join(repoRoot, "packages", "qfai", "assets", "init");
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
