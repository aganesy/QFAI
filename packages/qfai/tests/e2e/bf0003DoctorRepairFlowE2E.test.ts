// QFAI:BF-0003

import { spawnSync } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { removeTempTree } from "../helpers/tempTree.js";

const CLI = path.resolve(__dirname, "../../dist/cli/index.mjs");
const roots: string[] = [];

type CliResult = { status: number | null; stdout: string; stderr: string };
type DoctorResult = {
  config: { found: boolean; configPath: string };
  summary: { error: number; warning: number };
  checks: Array<{ id: string; severity: string; message: string }>;
};
type ValidateResult = {
  counts: { error: number };
  issues: Array<{ code: string; severity: string }>;
};

function cli(root: string, ...args: string[]): CliResult {
  const child = spawnSync(process.execPath, [CLI, ...args], {
    cwd: root,
    encoding: "utf8",
    timeout: 30_000,
  });
  if (child.error) throw child.error;
  return { status: child.status, stdout: child.stdout ?? "", stderr: child.stderr ?? "" };
}

async function fixture(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-bf0003-"));
  roots.push(root);
  const initialized = cli(root, "init", "--dir", root, "--yes");
  expect(initialized.status).toBe(0);
  const configPath = path.join(root, "qfai.config.yaml");
  const config = await readFile(configPath, "utf8");
  expect(config).toContain("specsDir: .qfai/spec");
  await writeFile(
    configPath,
    config
      .replace("specsDir: .qfai/spec", "specsDir: docs/stories")
      .replace("contractsDir: .qfai/spec/03_contract", "contractsDir: docs/contracts"),
    "utf8",
  );
  return root;
}

async function exists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

afterEach(async () => {
  for (const root of roots.splice(0)) await removeTempTree(root);
});

describe("BF-0003: diagnose and repair a QFAI workspace", () => {
  // QFAI:US-0003-0001
  // QFAI:US-0003-0002
  // QFAI:US-0003-0005
  // QFAI:US-0003-0012
  // QFAI:US-0003-0013
  // QFAI:US-0003-0015
  it("QFAI:BF-0003 records the finding, owner, targeted repair and confirming checks", async () => {
    const root = await fixture();
    const beforePath = path.join(root, ".qfai/report/doctor.before.json");
    const afterPath = path.join(root, ".qfai/report/doctor.after.json");
    const scopedPath = path.join(root, ".qfai/report/validate.flow-0003.json");

    const before = cli(
      root,
      "doctor",
      "--root",
      root,
      "--format",
      "json",
      "--fail-on",
      "error",
      "--out",
      beforePath,
    );
    expect(before.status).toBe(0);
    const beforeData = JSON.parse(await readFile(beforePath, "utf8")) as DoctorResult;
    expect(beforeData.config).toMatchObject({ found: true, configPath: "qfai.config.yaml" });
    expect(beforeData.summary.error).toBe(0);
    expect(beforeData.checks.find((check) => check.id === "paths.specsDir")).toMatchObject({
      severity: "warning",
    });
    expect(cli(root, "doctor", "--root", root, "--fail-on", "warning").status).toBe(1);
    const missingFlow = cli(
      root,
      "validate",
      "--root",
      root,
      "--flow",
      "BF-0003",
      "--profile",
      "sdd",
      "--fail-on",
      "error",
    );
    expect(missingFlow.status).toBe(1);
    expect(missingFlow.stdout + missingFlow.stderr).toContain("QFAI-FLOW-005");
    expect(await exists(scopedPath)).toBe(false);

    // The path and absent flow belong to the story tree; the DG rule belongs
    // to a policy artifact. Repair those sources, then rerun each diagnostic.
    const flowDir = path.join(root, "docs/stories/02_business-flow/business-flow-0003");
    const storyDir = path.join(flowDir, "user-story-0003-0001");
    const policy = path.join(root, "docs/stories/01_policy/policy.md");
    const contractDir = path.join(root, "docs/contracts/cli");
    await mkdir(storyDir, { recursive: true });
    await mkdir(path.dirname(policy), { recursive: true });
    await mkdir(contractDir, { recursive: true });
    await writeFile(
      path.join(flowDir, "business-flow.md"),
      "# BF-0003: Repair a workspace\n\n```mermaid\nflowchart TD\n  Diagnose[Diagnose] --> Repair[Repair the declared sources]\n  Repair --> Recheck[Recheck]\n```\n",
      "utf8",
    );
    await writeFile(
      path.join(flowDir, "user-stories.md"),
      "# User Stories\n\n- US-0003-0001: Repair a diagnosed workspace.\n",
      "utf8",
    );
    await writeFile(
      path.join(storyDir, "01_User-story.md"),
      "# US-0003-0001: Repair a diagnosed workspace\n",
      "utf8",
    );
    await writeFile(
      path.join(storyDir, "02_Acceptance-Criteria.md"),
      "# Acceptance Criteria\n\n```gherkin\n# AC-0003-0001-01\nScenario: Confirm the targeted repair\n  Given a diagnosed workspace\n  When its declared sources are repaired\n  Then the affected checks pass\n```\n",
      "utf8",
    );
    await writeFile(
      path.join(storyDir, "03_Example.md"),
      "# Examples\n\n| EX-ID | AC-Ref | Input | Expected |\n| --- | --- | --- | --- |\n| EX-0003-0001-01 | AC-0003-0001-01 | Missing story path | Recheck succeeds |\n",
      "utf8",
    );
    await writeFile(
      path.join(contractDir, "repair.md"),
      "# Repair contract\n\n## Rules\n\n| BR-ID | Statement | Examples |\n| --- | --- | --- |\n| BR-0003 | Recheck the diagnosed source after repair. | EX-0003-0001-01 |\n",
      "utf8",
    );
    await writeFile(
      path.join(root, "docs/contracts/contracts.md"),
      "# Contracts\n\n## Contract Index\n\n| Short ID | Entity | Declared ID | File | Depends On | Reconciled With | Purpose |\n| --- | --- | --- | --- | --- | --- | --- |\n| CLI-003 | Repair | - | cli/repair.md | - | - | Confirm a targeted repair. |\n",
      "utf8",
    );
    await writeFile(
      policy,
      "## Decision Guardrails\n### DG-0001: Boundary\n- Guardrail: Keep the repair scoped.\n",
      "utf8",
    );
    const incompleteRule = cli(root, "guardrails", "check", "--root", root, "--format", "json");
    expect(incompleteRule.status).toBe(1);
    expect(
      (JSON.parse(incompleteRule.stdout) as { summary: { errors: number } }).summary.errors,
    ).toBeGreaterThan(0);

    await writeFile(
      policy,
      "## Decision Guardrails\n### DG-0001: Boundary\n- Type: non-goal\n- Guardrail: Keep the repair scoped.\n- Rationale: Scope is fixed.\n- Reconsider: When the scope changes.\n",
      "utf8",
    );
    const after = cli(
      root,
      "doctor",
      "--root",
      root,
      "--format",
      "json",
      "--fail-on",
      "error",
      "--out",
      afterPath,
    );
    expect(after.status).toBe(0);
    const afterData = JSON.parse(await readFile(afterPath, "utf8")) as DoctorResult;
    expect(afterData.summary.error).toBe(0);
    expect(afterData.checks.find((check) => check.id === "paths.specsDir")).toMatchObject({
      severity: "ok",
    });

    // Check the diagnosed flow finding directly. This minimal fixture does not
    // claim that every unrelated SDD obligation in a full project is complete.
    const validated = cli(
      root,
      "validate",
      "--root",
      root,
      "--flow",
      "BF-0003",
      "--profile",
      "sdd",
      "--fail-on",
      "never",
    );
    expect(validated.status).toBe(0);
    const validation = JSON.parse(await readFile(scopedPath, "utf8")) as ValidateResult;
    expect(validation.issues.some((issue) => issue.code === "QFAI-FLOW-005")).toBe(false);
    const guardrails = cli(root, "guardrails", "check", "--root", root, "--format", "json");
    expect(guardrails.status).toBe(0);
    expect(JSON.parse(guardrails.stdout)).toMatchObject({ summary: { errors: 0 } });
    const listed = cli(root, "guardrails", "list", "--root", root, "--format", "json");
    expect(listed.status).toBe(0);
    expect(listed.stdout).toContain("DG-0001");
    expect(await exists(beforePath)).toBe(true);
    expect(await exists(afterPath)).toBe(true);
  });

  // QFAI:US-0003-0016
  it("reports malformed configuration and explicit guardrail input failures", async () => {
    const root = await fixture();
    await writeFile(
      path.join(root, "qfai.config.yaml"),
      "paths:\n  specsDir: docs/stories\nuiux:\n  renderEvidence:\n    failOpen: not-a-boolean\n",
      "utf8",
    );
    const invalidConfig = cli(root, "doctor", "--root", root, "--format", "json");
    expect(invalidConfig.status).toBe(1);
    const diagnosis = JSON.parse(invalidConfig.stdout) as DoctorResult;
    expect(diagnosis.checks.find((check) => check.id === "config.load")).toMatchObject({
      severity: "error",
    });

    const noAction = cli(root, "guardrails", "--root", root, "--format", "json");
    expect(noAction.status).toBe(2);
    expect(JSON.parse(noAction.stdout)).toMatchObject({ error: { code: "invalid-arguments" } });
    const missingPath = cli(
      root,
      "guardrails",
      "check",
      "--root",
      root,
      "--path",
      "missing.md",
      "--format",
      "json",
    );
    expect(missingPath.status).toBe(2);
    expect(JSON.parse(missingPath.stdout)).toMatchObject({
      error: { code: "load-failed", details: [{ path: "missing.md" }] },
    });
  });
});
