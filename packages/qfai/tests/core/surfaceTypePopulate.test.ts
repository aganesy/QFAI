/**
 * The `sdd` profile no longer reports a UI contract whose spec lacks
 * `surface_type` frontmatter: the story tree has no spec frontmatter to mark.
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, expect, it } from "vitest";

import { legacyLayoutConfig as defaultConfig } from "./legacyLayoutConfig.js";
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
