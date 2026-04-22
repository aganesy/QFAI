import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateDesignContractReadiness } from "../../src/core/validators/designContractReadiness.js";

const tempDirs: string[] = [];

async function newTempRoot(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-design-contract-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

async function seedUiContract(root: string): Promise<void> {
  const uiDir = path.join(root, ".qfai", "contracts", "ui");
  await mkdir(uiDir, { recursive: true });
  await writeFile(
    path.join(uiDir, "ui-0001-dashboard.yaml"),
    [
      "# QFAI-CONTRACT-ID: CON-UI-0001",
      "screens:",
      "  - id: dashboard",
      "    title: Dashboard",
      "    route: /dashboard",
    ].join("\n"),
    "utf-8",
  );
}

describe("validateDesignContractReadiness", () => {
  it("UI contract があるのに design contracts が無い場合は error を返す", async () => {
    const root = await newTempRoot();
    await seedUiContract(root);

    const issues = await validateDesignContractReadiness(root, defaultConfig);

    expect(issues.map((issue) => issue.code)).toContain("QFAI-DCON-001");
  });

  it("required design contracts が揃っていれば issue を返さない", async () => {
    const root = await newTempRoot();
    await seedUiContract(root);

    const designDir = path.join(root, ".qfai", "contracts", "design");
    await mkdir(designDir, { recursive: true });
    await writeFile(
      path.join(designDir, "design-system.yaml"),
      [
        "checklist:",
        "  color: []",
        "  typography: []",
        "  spacing: []",
        "  border_radius: []",
        "  shadow: []",
        "  dos_and_donts: []",
      ].join("\n"),
      "utf-8",
    );
    await writeFile(
      path.join(designDir, "evaluation-axes.yaml"),
      [
        "invariant_axes: []",
        "trend_derived_axes: []",
        "product_specific_axes: []",
        "aggregate_rules:",
        "  required_visual_categories: []",
      ].join("\n"),
      "utf-8",
    );
    await writeFile(
      path.join(designDir, "anchor-selection.yaml"),
      [
        "selected_anchor:",
        "  option_id: OPT-01",
        "  title: Dashboard",
        "  rationale: Stable baseline",
      ].join("\n"),
      "utf-8",
    );

    const issues = await validateDesignContractReadiness(root, defaultConfig);

    expect(issues).toEqual([]);
  });

  it("required design contract が壊れた YAML の場合は parse error を返す", async () => {
    const root = await newTempRoot();
    await seedUiContract(root);

    const designDir = path.join(root, ".qfai", "contracts", "design");
    await mkdir(designDir, { recursive: true });
    await writeFile(path.join(designDir, "design-system.yaml"), "checklist: [\n", "utf-8");
    await writeFile(
      path.join(designDir, "evaluation-axes.yaml"),
      [
        "invariant_axes: []",
        "trend_derived_axes: []",
        "product_specific_axes: []",
        "aggregate_rules: {}",
      ].join("\n"),
      "utf-8",
    );
    await writeFile(
      path.join(designDir, "anchor-selection.yaml"),
      [
        "selected_anchor:",
        "  option_id: OPT-01",
        "  title: Dashboard",
        "  rationale: Stable baseline",
      ].join("\n"),
      "utf-8",
    );

    const issues = await validateDesignContractReadiness(root, defaultConfig);

    expect(issues.map((issue) => issue.code)).toContain("QFAI-DCON-006");
  });
});
