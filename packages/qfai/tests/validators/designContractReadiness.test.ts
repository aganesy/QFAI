import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import {
  validatePrototypingDesignContractReadiness,
  validateSddDesignContractReadiness,
} from "../../src/core/validators/designContractReadiness.js";

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

async function seedSddDesignContracts(root: string): Promise<void> {
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
    path.join(designDir, "reference-pool.yaml"),
    [
      'schemaVersion: "1.0"',
      "references:",
      "  - id: REF-001",
      "    kind: template-seed",
      "    source: https://ui.shadcn.com/blocks",
      "    adopted_points:",
      "      - Accessible composition",
      "    rejected_points:",
      "      - Default SaaS dashboard look",
      "    local_translation:",
      "      - Keep structure and replace visual language",
      "    copy_risk: medium",
      "    template_usage_policy: reference-only",
    ].join("\n"),
    "utf-8",
  );
  await writeFile(
    path.join(designDir, "brand-design.yaml"),
    [
      'schemaVersion: "1.0"',
      "brand_personality:",
      "  - calm",
      "audience_emotion:",
      "  - confident comparison",
      "category_conventions:",
      "  - dense operational surfaces",
      "differentiation_strategy:",
      "  - domain-specific signals before generic cards",
      "visual_language:",
      "  color: restrained with one signature accent",
      "content_tone:",
      "  - direct labels",
      "do_not_look_like:",
      "  - generic SaaS dashboard",
    ].join("\n"),
    "utf-8",
  );
  await writeFile(
    path.join(designDir, "evaluation-rubric.yaml"),
    [
      "axes:",
      "  - id: design-quality",
      "    weight: 3",
      "  - id: brand-memorability",
      "    weight: 2",
      "hard_floors:",
      "  - id: functionality",
      "    min_score: 80",
      "weighted_axes:",
      "  - design-quality",
      "  - brand-memorability",
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
    path.join(designDir, "absorption-policy.yaml"),
    [
      "minAbsorptionsPerSurvivor: 2",
      "require_rejected_reason: true",
      "allow_adapt_required: true",
    ].join("\n"),
    "utf-8",
  );
}

async function seedPrototypingDesignContracts(root: string): Promise<void> {
  const designDir = path.join(root, ".qfai", "contracts", "design");
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
  await writeFile(
    path.join(designDir, "prototype-handoff.yaml"),
    [
      'schemaVersion: "1.0"',
      "sourcePrototypeRefs:",
      "  winnerHtml: .qfai/prototypes/winner/index.html",
      "surfaceProfiles:",
      "  primary: web",
      "screens:",
      "  - screenId: dashboard",
      "    prototypeRef: .qfai/prototypes/winner/index.html#dashboard",
      "visualDna:",
      "  color:",
      "    primary: '#2563eb'",
      "implementationHandoff:",
      "  mustPreserve:",
      "    - Visual hierarchy from winner screenshot",
    ].join("\n"),
    "utf-8",
  );
}

describe("design contract readiness validators", () => {
  it("UI contract があるのに SDD design contracts が無い場合は error を返す", async () => {
    const root = await newTempRoot();
    await seedUiContract(root);

    const issues = await validateSddDesignContractReadiness(root, defaultConfig);

    expect(issues.map((issue) => issue.code)).toContain("QFAI-DCON-001");
  });

  it("SDD stage では canonical pre-prototyping design contracts が揃っていれば pass する", async () => {
    const root = await newTempRoot();
    await seedUiContract(root);
    await seedSddDesignContracts(root);

    const issues = await validateSddDesignContractReadiness(root, defaultConfig);

    expect(issues).toEqual([]);
  });

  it("prototyping stage では winner contracts も必須にする", async () => {
    const root = await newTempRoot();
    await seedUiContract(root);
    await seedSddDesignContracts(root);

    const issues = await validatePrototypingDesignContractReadiness(root, defaultConfig);

    expect(issues.filter((issue) => issue.code === "QFAI-DCON-001")).toHaveLength(3);
  });

  it("prototyping stage の required contracts が揃っていれば pass する", async () => {
    const root = await newTempRoot();
    await seedUiContract(root);
    await seedSddDesignContracts(root);
    await seedPrototypingDesignContracts(root);

    const issues = await validatePrototypingDesignContractReadiness(root, defaultConfig);

    expect(issues).toEqual([]);
  });

  it("SDD stage で winner contracts が存在すると premature error を返す", async () => {
    const root = await newTempRoot();
    await seedUiContract(root);
    await seedSddDesignContracts(root);
    await seedPrototypingDesignContracts(root);

    const issues = await validateSddDesignContractReadiness(root, defaultConfig);

    expect(issues.map((issue) => issue.code)).toContain("QFAI-DCON-019");
  });

  it("reference-pool.yaml が壊れている場合は parse error を返す", async () => {
    const root = await newTempRoot();
    await seedUiContract(root);
    await seedSddDesignContracts(root);
    const designDir = path.join(root, ".qfai", "contracts", "design");
    await writeFile(path.join(designDir, "reference-pool.yaml"), "references: [\n", "utf-8");

    const issues = await validateSddDesignContractReadiness(root, defaultConfig);

    expect(issues.map((issue) => issue.code)).toContain("QFAI-DCON-014");
  });

  it("reference-pool.yaml の必須 field が欠けている場合は error を返す", async () => {
    const root = await newTempRoot();
    await seedUiContract(root);
    await seedSddDesignContracts(root);
    const designDir = path.join(root, ".qfai", "contracts", "design");
    await writeFile(
      path.join(designDir, "reference-pool.yaml"),
      ["references:", "  - id: REF-001", "    kind: unknown"].join("\n"),
      "utf-8",
    );

    const issues = await validateSddDesignContractReadiness(root, defaultConfig);

    expect(issues.map((issue) => issue.code)).toContain("QFAI-DCON-015");
  });

  it("reference-pool.yaml の copy_risk と template_usage_policy は列挙値だけを許可する", async () => {
    const root = await newTempRoot();
    await seedUiContract(root);
    await seedSddDesignContracts(root);
    const designDir = path.join(root, ".qfai", "contracts", "design");
    await writeFile(
      path.join(designDir, "reference-pool.yaml"),
      [
        'schemaVersion: "1.0"',
        "references:",
        "  - id: REF-001",
        "    kind: template-seed",
        "    source: https://ui.shadcn.com/blocks",
        "    adopted_points:",
        "      - Accessible composition",
        "    rejected_points:",
        "      - Default SaaS dashboard look",
        "    local_translation:",
        "      - Keep structure and replace visual language",
        "    copy_risk: low because only structural learning is reused",
        "    template_usage_policy: reference_only",
      ].join("\n"),
      "utf-8",
    );

    const issues = await validateSddDesignContractReadiness(root, defaultConfig);

    expect(issues.filter((issue) => issue.code === "QFAI-DCON-015")).toHaveLength(2);
  });

  it("brand-design.yaml が壊れている場合は parse error を返す", async () => {
    const root = await newTempRoot();
    await seedUiContract(root);
    await seedSddDesignContracts(root);
    const designDir = path.join(root, ".qfai", "contracts", "design");
    await writeFile(path.join(designDir, "brand-design.yaml"), "brand_personality: [\n", "utf-8");

    const issues = await validateSddDesignContractReadiness(root, defaultConfig);

    expect(issues.map((issue) => issue.code)).toContain("QFAI-DCON-016");
  });

  it("brand-design.yaml の必須 field が欠けている場合は error を返す", async () => {
    const root = await newTempRoot();
    await seedUiContract(root);
    await seedSddDesignContracts(root);
    const designDir = path.join(root, ".qfai", "contracts", "design");
    await writeFile(
      path.join(designDir, "brand-design.yaml"),
      ["brand_personality:", "  - calm"].join("\n"),
      "utf-8",
    );

    const issues = await validateSddDesignContractReadiness(root, defaultConfig);

    expect(issues.map((issue) => issue.code)).toContain("QFAI-DCON-017");
  });

  it("legacy design contract が存在すると error を返す", async () => {
    const root = await newTempRoot();
    await seedUiContract(root);
    await seedSddDesignContracts(root);
    const designDir = path.join(root, ".qfai", "contracts", "design");
    await writeFile(path.join(designDir, "anchor-selection.yaml"), "legacy: true\n", "utf-8");

    const issues = await validateSddDesignContractReadiness(root, defaultConfig);

    expect(issues.map((issue) => issue.code)).toContain("QFAI-DCON-018");
  });

  it("legacy selected-direction alias は受理しない", async () => {
    const root = await newTempRoot();
    await seedUiContract(root);
    await seedSddDesignContracts(root);
    await seedPrototypingDesignContracts(root);
    const designDir = path.join(root, ".qfai", "contracts", "design");
    await writeFile(
      path.join(designDir, "selected-direction.yaml"),
      [
        "direction_id: direction-02",
        "selection_rationale: legacy rationale",
        "carry_forward_rules:",
        "  - search-first",
      ].join("\n"),
      "utf-8",
    );

    const issues = await validatePrototypingDesignContractReadiness(root, defaultConfig);

    expect(issues.filter((issue) => issue.code === "QFAI-DCON-004")).toHaveLength(2);
  });

  it("absorption-policy.yaml の数値と真偽値は型も検証する", async () => {
    const root = await newTempRoot();
    await seedUiContract(root);
    await seedSddDesignContracts(root);
    const designDir = path.join(root, ".qfai", "contracts", "design");
    await writeFile(
      path.join(designDir, "absorption-policy.yaml"),
      [
        'minAbsorptionsPerSurvivor: "2"',
        'require_rejected_reason: "true"',
        'allow_adapt_required: "true"',
      ].join("\n"),
      "utf-8",
    );

    const issues = await validateSddDesignContractReadiness(root, defaultConfig);

    expect(issues.filter((issue) => issue.code === "QFAI-DCON-021")).toHaveLength(3);
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

    const issues = await validateSddDesignContractReadiness(root, config);
    const missingDesignIssues = issues.filter((issue) => issue.code === "QFAI-DCON-001");

    expect(missingDesignIssues.length).toBeGreaterThan(0);
    expect(missingDesignIssues[0]?.suggested_action).toContain("workspace/contracts/design/");
  });
});
