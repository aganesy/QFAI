/**
 * Tests for `populateSurfaceTypeIfUiCompanion` — the helper that
 * `/qfai-sdd` invokes to write `surface_type: ui-bearing` into a
 * spec's `01_Spec.md` frontmatter when a matching
 * `.qfai/contracts/ui/<spec>-*.yaml` companion is present.
 *
 */
// QFAI:SPEC-0013:TC-0013-0030

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { legacyLayoutConfig as defaultConfig } from "./legacyLayoutConfig.js";
import { populateSurfaceTypeIfUiCompanion } from "../../src/core/detection/surfaceType.js";
import { validateProject } from "../../src/core/validate.js";

let root = "";

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-surface-type-"));
});

afterEach(async () => {
  if (root) {
    await rm(root, { recursive: true, force: true });
  }
});

async function makeSpec(specId: string, specBody: string): Promise<string> {
  const specDir = path.join(root, ".qfai", "specs", `spec-${specId}`);
  await mkdir(specDir, { recursive: true });
  const specPath = path.join(specDir, "01_Spec.md");
  await writeFile(specPath, specBody, "utf-8");
  // Minimal layered v1421 marker (`02_User-stories.md`) so
  // `collectSpecEntries` classifies the dir consistently.
  await writeFile(path.join(specDir, "02_User-stories.md"), "# User stories\n", "utf-8");
  await writeFile(
    path.join(specDir, "03_Acceptance-Criteria.md"),
    "# Acceptance Criteria\n",
    "utf-8",
  );
  return specPath;
}

async function makeUiCompanion(specId: string, slug: string): Promise<void> {
  const uiDir = path.join(root, ".qfai", "contracts", "ui");
  await mkdir(uiDir, { recursive: true });
  const fileName = `ui-${specId}-${slug}.yaml`;
  await writeFile(
    path.join(uiDir, fileName),
    ["screens:", "  - id: dashboard", "    route: /dashboard", "    primary_tasks: []", ""].join(
      "\n",
    ),
    "utf-8",
  );
}

describe("TC-0013-0030: populateSurfaceTypeIfUiCompanion auto-populates frontmatter", () => {
  it("writes `surface_type: ui-bearing` when a UI companion is present and frontmatter lacks the key", async () => {
    const specPath = await makeSpec(
      "0099",
      ["---", "id: spec-0099", "---", "", "# Sample spec", ""].join("\n"),
    );
    await makeUiCompanion("0099", "dashboard");

    const result = await populateSurfaceTypeIfUiCompanion(root, "0099", defaultConfig);
    expect(result.changed).toBe(true);

    const updated = await readFile(specPath, "utf-8");
    expect(updated).toMatch(/surface_type:\s*ui-bearing/);
  });

  it("is idempotent — running twice does not duplicate the key or otherwise mutate the file", async () => {
    const specPath = await makeSpec(
      "0098",
      ["---", "id: spec-0098", "---", "", "# Sample spec", ""].join("\n"),
    );
    await makeUiCompanion("0098", "panel");

    await populateSurfaceTypeIfUiCompanion(root, "0098", defaultConfig);
    const afterFirst = await readFile(specPath, "utf-8");
    const second = await populateSurfaceTypeIfUiCompanion(root, "0098", defaultConfig);
    const afterSecond = await readFile(specPath, "utf-8");

    expect(second.changed).toBe(false);
    expect(afterSecond).toBe(afterFirst);
    expect(afterSecond.match(/surface_type:\s*ui-bearing/g)?.length ?? 0).toBe(1);
  });

  it("does nothing (returns changed=false) for a spec with no UI companion", async () => {
    const specPath = await makeSpec(
      "0097",
      ["---", "id: spec-0097", "---", "", "# Sample spec", ""].join("\n"),
    );

    const result = await populateSurfaceTypeIfUiCompanion(root, "0097", defaultConfig);
    expect(result.changed).toBe(false);

    const body = await readFile(specPath, "utf-8");
    expect(body).not.toMatch(/surface_type:\s*ui-bearing/);
  });
});

it("runs SDD story validation without the retired surface type finding", async () => {
  const config = structuredClone(defaultConfig);
  config.paths.specsDir = ".qfai/spec";
  config.paths.contractsDir = ".qfai/spec/03_contract";
  const flowFile = path.join(
    root,
    ".qfai",
    "spec",
    "02_business-flow",
    "business-flow-0001",
    "business-flow.md",
  );
  await mkdir(path.dirname(flowFile), { recursive: true });
  await writeFile(flowFile, "# BF-0001: Checkout\n", "utf-8");
  const uiContract = path.join(root, ".qfai", "spec", "03_contract", "ui", "checkout.yaml");
  await mkdir(path.dirname(uiContract), { recursive: true });
  await writeFile(uiContract, "# QFAI-CONTRACT-ID: CON-UI-0001\nscreens: []\n", "utf-8");

  const result = await validateProject(
    root,
    { config, issues: [], configPath: path.join(root, "qfai.config.yaml") },
    { profile: "sdd" },
  );
  expect(result.profileValidatorsRan).toBe(true);
  expect(result.issues.some((finding) => finding.code.startsWith("QFAI-STORY-"))).toBe(true);
  expect(result.issues.some((finding) => finding.code === "D-SURFACE-TYPE-MISSING")).toBe(false);
});
