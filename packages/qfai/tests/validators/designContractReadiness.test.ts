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

async function seedDesignContracts(root: string): Promise<void> {
  const designDir = path.join(root, ".qfai", "contracts", "design");
  await mkdir(designDir, { recursive: true });
  await writeFile(
    path.join(designDir, "exploration-brief.yaml"),
    [
      "product_intent: Clarify the primary decision in one screen",
      "target_users:",
      "  - operations manager",
      "must_preserve_interactions:",
      "  - Search remains visible above the fold",
      "brand_signals:",
      "  - Calm confidence",
      "differentiation_targets:",
      "  - Avoid generic admin-shell defaults",
    ].join("\n"),
    "utf-8",
  );
  await writeFile(
    path.join(designDir, "evaluation-rubric.yaml"),
    [
      "axes:",
      "  - design_quality",
      "  - originality",
      "hard_floors:",
      "  - functionality",
      "  - accessibility",
      "weighted_axes:",
      "  - design_quality",
      "  - originality",
    ].join("\n"),
    "utf-8",
  );
  await writeFile(
    path.join(designDir, "selected-direction.yaml"),
    [
      "direction_id: direction-02",
      "winning_rationale: Strong hierarchy with differentiated typography.",
      "carry_forward_rules:",
      "  - Keep the asymmetrical hero and condensed headline pairing",
    ].join("\n"),
    "utf-8",
  );
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
      "  component_tone: []",
      "  motion_rules: []",
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

  it("新しい required design contracts が揃っていれば issue を返さない", async () => {
    const root = await newTempRoot();
    await seedUiContract(root);
    await seedDesignContracts(root);

    const issues = await validateDesignContractReadiness(root, defaultConfig);

    expect(issues).toEqual([]);
  });

  it("壊れた YAML の場合は parse error を返す", async () => {
    const root = await newTempRoot();
    await seedUiContract(root);
    await seedDesignContracts(root);

    const designDir = path.join(root, ".qfai", "contracts", "design");
    await writeFile(path.join(designDir, "exploration-brief.yaml"), "product_intent: [\n", "utf-8");

    const issues = await validateDesignContractReadiness(root, defaultConfig);

    expect(issues.map((issue) => issue.code)).toContain("QFAI-DCON-006");
  });

  it("custom contractsDir でも suggested_action は実際の design contract path を案内する", async () => {
    const root = await newTempRoot();
    const config = {
      ...defaultConfig,
      paths: {
        ...defaultConfig.paths,
        contractsDir: "workspace/contracts",
      },
    };
    const uiDir = path.join(root, "workspace", "contracts", "ui");
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

    const issues = await validateDesignContractReadiness(root, config);
    const missingDesignIssues = issues.filter((issue) => issue.code === "QFAI-DCON-001");

    expect(missingDesignIssues.length).toBeGreaterThan(0);
    expect(missingDesignIssues[0]?.suggested_action).toContain("workspace/contracts/design/");
  });
});
