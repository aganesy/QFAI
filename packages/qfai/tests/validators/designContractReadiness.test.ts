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
      "  - id: design-quality",
      "    weight: 3",
      "  - id: originality",
      "    weight: 3",
      "hard_floors:",
      "  - id: functionality",
      "    min_score: 80",
      "  - id: accessibility-risk",
      "    min_score: 80",
      "  - id: originality",
      "    min_score: 80",
      "weighted_axes:",
      "  - design-quality",
      "  - originality",
    ].join("\n"),
    "utf-8",
  );
  await writeFile(
    path.join(designDir, "selected-direction.yaml"),
    [
      "chosen_direction_id: direction-02",
      "winning_rationale: Strong hierarchy with differentiated typography.",
      "carry_forward_rules:",
      "  - Keep the asymmetrical hero and condensed headline pairing",
    ].join("\n"),
    "utf-8",
  );
  await writeFile(
    path.join(designDir, "evaluator-calibration.yaml"),
    [
      "good_critique_examples:",
      "  - Specific critique tied to user goals",
      "too_lenient_examples:",
      "  - Generic praise without evidence",
      "blandness_fail_examples:",
      "  - Recycled default admin shell",
      "originality_fail_examples:",
      "  - Near-copy of reference product",
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

  it("legacy direction_id alias でも selected-direction contract を受理する", async () => {
    const root = await newTempRoot();
    await seedUiContract(root);
    await seedDesignContracts(root);

    const designDir = path.join(root, ".qfai", "contracts", "design");
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

  it("evaluator-calibration.yaml が壊れている場合は parse error を返す", async () => {
    const root = await newTempRoot();
    await seedUiContract(root);
    await seedDesignContracts(root);

    const designDir = path.join(root, ".qfai", "contracts", "design");
    await writeFile(
      path.join(designDir, "evaluator-calibration.yaml"),
      "good_critique_examples: [\n",
      "utf-8",
    );

    const issues = await validateDesignContractReadiness(root, defaultConfig);

    expect(issues.map((issue) => issue.code)).toContain("QFAI-DCON-011");
  });

  it("evaluator-calibration.yaml の必須 field が欠けている場合は error を返す", async () => {
    const root = await newTempRoot();
    await seedUiContract(root);
    await seedDesignContracts(root);

    const designDir = path.join(root, ".qfai", "contracts", "design");
    await writeFile(
      path.join(designDir, "evaluator-calibration.yaml"),
      [
        "good_critique_examples:",
        "  - Specific critique tied to user goals",
        "too_lenient_examples:",
        "  - Generic praise without evidence",
      ].join("\n"),
      "utf-8",
    );

    const issues = await validateDesignContractReadiness(root, defaultConfig);

    expect(issues.map((issue) => issue.code)).toContain("QFAI-DCON-010");
  });

  it("structured /qfai-sdd contract shapes でも meaningful content があれば受理する", async () => {
    const root = await newTempRoot();
    await seedUiContract(root);
    await seedDesignContracts(root);

    const designDir = path.join(root, ".qfai", "contracts", "design");
    await writeFile(
      path.join(designDir, "exploration-brief.yaml"),
      [
        "product_intent:",
        "  feeling:",
        "    - role: seeker",
        "      statement: 店舗物件特有条件を業務的に速く比較できる。",
        "target_users:",
        "  - role: seeker",
        "    goals:",
        "      - 条件比較",
        "must_preserve_interactions:",
        "  seeker:",
        "    primary_flow:",
        "      - 条件入力",
        "brand_signals:",
        "  tone:",
        "    - 信頼できる",
        "differentiation_targets:",
        "  - id: DIFF-001",
        "    statement: 店舗物件固有条件をカード上位へ出す。",
      ].join("\n"),
      "utf-8",
    );
    await writeFile(
      path.join(designDir, "evaluator-calibration.yaml"),
      [
        "good_critique_examples:",
        "  - example: primary task が card 上位に出ていない",
        "    why:",
        "      - failure location が具体的",
        "too_lenient_examples:",
        "  - example: 雰囲気がよい",
        "    why:",
        "      - 軸に接続していない",
        "blandness_fail_examples:",
        "  - example: generic dashboard",
        "    why:",
        "      - 店舗物件らしさがない",
        "originality_fail_examples:",
        "  - example: flashy AI hero",
        "    why:",
        "      - operational clarity を壊す",
      ].join("\n"),
      "utf-8",
    );

    const issues = await validateDesignContractReadiness(root, defaultConfig);

    expect(issues).toEqual([]);
  });

  it("provisional selected-direction は selection_rationale で通す", async () => {
    const root = await newTempRoot();
    await seedUiContract(root);
    await seedDesignContracts(root);

    const designDir = path.join(root, ".qfai", "contracts", "design");
    await writeFile(
      path.join(designDir, "selected-direction.yaml"),
      [
        "selection_status: provisional_for_downstream",
        "chosen_direction_id: direction-02",
        "selection_rationale: 実装と prototyping の baseline として方向を正規化する。",
        "carry_forward_rules:",
        "  - search-first を保つ",
      ].join("\n"),
      "utf-8",
    );

    const issues = await validateDesignContractReadiness(root, defaultConfig);

    expect(issues).toEqual([]);
  });

  it("design-system は component_semantics / content_tone でも component guidance を満たせる", async () => {
    const root = await newTempRoot();
    await seedUiContract(root);
    await seedDesignContracts(root);

    const designDir = path.join(root, ".qfai", "contracts", "design");
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
        "  motion_rules: []",
        "component_semantics:",
        "  - id: storefront_listing_card",
        "    purpose: 店舗物件比較のカード",
        "    semantics:",
        "      - article",
        "content_tone:",
        "  labels:",
        "    - 店舗物件ドメイン語彙を優先する",
      ].join("\n"),
      "utf-8",
    );

    const issues = await validateDesignContractReadiness(root, defaultConfig);

    expect(issues).toEqual([]);
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
