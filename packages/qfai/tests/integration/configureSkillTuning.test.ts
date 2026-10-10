/**
 * Integration: what /qfai-configure leaves out of, and records in, a project.
 *
 * The skill is prose, so its text is asserted against the shipped asset. What
 * the claims rest on is asserted against real behaviour: the configuration
 * loader resolves a missing `paths.specsDir` and a configured one, and a
 * `tech.md` that carries one Stack row per test layer conforms to its shipped
 * schema.
 */
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import { describe, expect, it } from "vitest";

import { defaultConfig, loadConfig } from "../../src/core/config.js";

const PACKAGE_ROOT = path.resolve(__dirname, "..", "..");
const SKILL_PATH = path.join(
  PACKAGE_ROOT,
  "assets",
  "init",
  ".qfai",
  "assistant",
  "skill",
  "qfai-configure",
  "SKILL.md",
);
const TECH_TEMPLATE_PATH = path.join(
  PACKAGE_ROOT,
  "assets",
  "init",
  ".qfai",
  "assistant",
  "skill",
  "qfai-sdd",
  "templates",
  "spec",
  "03_contract",
  "tech.md",
);
const TECH_SCHEMA_PATH = path.join(
  PACKAGE_ROOT,
  "assets",
  "mdschema",
  "story",
  "03_contract",
  "tech.mdschema.yml",
);

/** The part of the skill between a heading and the next `## ` heading. */
function section(skill: string, heading: string): string {
  const start = skill.indexOf(`\n${heading}\n`);
  expect(start).toBeGreaterThanOrEqual(0);
  const rest = skill.slice(start + heading.length + 2);
  const end = rest.search(/\n## /);
  return end === -1 ? rest : rest.slice(0, end);
}

async function specsDirOf(configBody: string) {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-configure-specs-dir-"));
  try {
    await writeFile(path.join(root, "qfai.config.yaml"), configBody, "utf-8");
    const { config, issues } = await loadConfig(root);
    return { specsDir: config.paths.specsDir, issues };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

/** The checker's own entry point, run through `process.execPath`. */
function resolveMdschemaCli(): string {
  const require = createRequire(import.meta.url);
  const manifestPath = require.resolve("@jackchuka/mdschema/package.json");
  const manifest: unknown = JSON.parse(readFileSync(manifestPath, "utf-8"));
  const bin =
    typeof manifest === "object" && manifest !== null && "bin" in manifest
      ? manifest.bin
      : undefined;
  const entry =
    typeof bin === "string"
      ? bin
      : typeof bin === "object" && bin !== null && "mdschema" in bin
        ? bin.mdschema
        : undefined;
  if (typeof entry !== "string") {
    throw new Error(`@jackchuka/mdschema declares no "mdschema" bin entry in ${manifestPath}`);
  }
  return path.resolve(path.dirname(manifestPath), entry);
}

describe("Config Minimal Diff", () => {
  // QFAI:AC-0001-0076-02
  it("edits the test globs, overrides only on request, and writes nothing else", async () => {
    const skill = await readFile(SKILL_PATH, "utf-8");
    const step4 = section(skill, "## Step 4 - Update `qfai.config.yaml` (minimal diff)");

    expect(step4).toContain("- `validation.traceability.testFileGlobs`");
    expect(step4).toContain("- `validation.traceability.testFileExcludeGlobs` (only if needed)");
    expect(step4).toContain(
      "- `routing` or `reviewProfiles` only when the user asks to change one;",
    );
    expect(step4).toContain("Add no key the package already defaults");

    const constraints = section(skill, "## Constraints");
    expect(constraints).toContain(
      "- Only update `qfai.config.yaml` and project-owned policy and contract files under `.qfai/spec/` unless explicitly asked.",
    );
    expect(constraints).toContain("- Do **not** modify tests or source code.");
  });
});

describe("Story-Tree Specs Directory Follows The Default", () => {
  // QFAI:AC-0001-0076-03
  // QFAI:EX-0001-0076-02
  it("leaves paths.specsDir out and resolves it to the story tree through the loader", async () => {
    const skill = await readFile(SKILL_PATH, "utf-8");
    const step4 = section(skill, "## Step 4 - Update `qfai.config.yaml` (minimal diff)");
    expect(step4).toContain("`paths.specsDir` included");
    expect(skill).not.toContain(".qfai/specs");

    const loaded = await specsDirOf("paths:\n  testsDir: checks\n");
    expect(loaded.issues).toEqual([]);
    expect(loaded.specsDir).toBe(".qfai/spec");
    expect(loaded.specsDir).toBe(defaultConfig.paths.specsDir);
  });
});

describe("Existing specs directory remains configured", () => {
  // QFAI:AC-0001-0076-05
  // QFAI:EX-0001-0076-08
  it("keeps a configured paths.specsDir and resolves to it through the loader", async () => {
    const skill = await readFile(SKILL_PATH, "utf-8");
    const step4 = section(skill, "## Step 4 - Update `qfai.config.yaml` (minimal diff)");
    expect(step4).toContain("Keep all other config keys unchanged.");
    expect(step4).toContain("a value the project set stays");

    const loaded = await specsDirOf("paths:\n  specsDir: docs/spec\n");
    expect(loaded.issues).toEqual([]);
    expect(loaded.specsDir).toBe("docs/spec");
  });
});

describe("Tool Selection Rationale Recorded", () => {
  // QFAI:AC-0001-0079-01
  // QFAI:EX-0001-0079-01
  it("records one Stack row per test layer that names the tool, its evidence and its fit", async () => {
    const skill = await readFile(SKILL_PATH, "utf-8");
    const step3 = section(skill, "## Step 3 - Update project context (evidence-first)");
    expect(step3).toContain(
      "with one row per test layer whose Choice names the tool, the files it was observed in, and why it fits",
    );

    const template = await readFile(TECH_TEMPLATE_PATH, "utf-8");
    const testerRow = "| Test runner         | `<test runner>`                            |";
    expect(template).toContain(testerRow);
    const layerRows = [
      "| Integration tests | Vitest 4: `package.json` and `vitest.config.ts` show it, and `tests/integration/` runs on it; it runs the checks that call the module boundary directly |",
      "| Browser tests | Playwright: `playwright.config.ts` and `tests/e2e/` show it; it drives a real browser, which the browser flows need |",
    ].join("\n");

    const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-configure-tech-"));
    try {
      const file = path.join(dir, "tech.md");
      await writeFile(file, template.replace(testerRow, layerRows), "utf-8");
      const result = spawnSync(
        process.execPath,
        [resolveMdschemaCli(), "check", "--schema", TECH_SCHEMA_PATH, file],
        { encoding: "utf-8" },
      );
      expect(`${result.stdout ?? ""}${result.stderr ?? ""}`).toContain("No violations");
      expect(result.status).toBe(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
