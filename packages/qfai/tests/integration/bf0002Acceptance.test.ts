import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import { removeTempTree } from "../helpers/tempTree.js";
import {
  editWorkflow,
  isRecord,
  plantedTree,
  REPO_ROOT,
  runLane,
  SHIPPED_WORKFLOWS_REL,
} from "../scripts/helpers/hygieneTree.js";

const shippedWorkflow = "qfai-tests.yml";

function replaceOnce(input: string, pattern: RegExp, replacement: string): string {
  const changed = input.replace(pattern, replacement);
  if (changed === input) throw new Error(`fixture target disappeared: ${pattern.source}`);
  return changed;
}

describe("BF-0002 pull request workflow acceptance", () => {
  // QFAI:AC-0002-0018-01
  // QFAI:AC-0002-0018-02
  it("evaluates both workflow trees and names every structural hygiene rule on success", async () => {
    const root = plantedTree(() => {});
    try {
      const result = runLane(root);
      expect(result.exitCode, result.output).toBe(0);
      expect(result.output).toContain("Rules run over both workflow trees:");
      for (const rule of [
        "job-guardrails",
        "checkout-credentials",
        "action-pin",
        "matrix-fail-fast",
        "secret-inheritance",
      ]) {
        expect(result.output).toContain(rule);
      }
      expect(result.output).toContain("Rules run over the shipped workflow tree only:");
      expect(result.output).toContain("shipped-third-party");
      expect(result.output).toContain("required-context");
    } finally {
      await removeTempTree(root);
    }
  });

  // QFAI:AC-0002-0018-04
  // QFAI:AC-0002-0018-06
  it("rejects a violation planted only in a shipped workflow and names its shipped path", async () => {
    const packageJson: unknown = JSON.parse(
      readFileSync(path.join(REPO_ROOT, "package.json"), "utf8"),
    );
    if (
      typeof packageJson !== "object" ||
      packageJson === null ||
      !("scripts" in packageJson) ||
      typeof packageJson.scripts !== "object" ||
      packageJson.scripts === null ||
      !("ci:lint" in packageJson.scripts)
    ) {
      throw new Error("the root package has no ci:lint script");
    }
    expect(packageJson.scripts["ci:lint"]).toContain("check-workflow-hygiene.mjs");
    const ci = readFileSync(path.join(REPO_ROOT, ".github", "workflows", "ci.yml"), "utf8");
    expect(ci).toMatch(/\n {2}lint:\n(?:(?!\n {2}[a-z-]+:)[\s\S])*?run: pnpm ci:lint/u);
    const root = plantedTree((dir) => {
      const file = path.join(dir, SHIPPED_WORKFLOWS_REL, shippedWorkflow);
      writeFileSync(
        file,
        replaceOnce(
          readFileSync(file, "utf8"),
          /uses: actions\/checkout@[a-f0-9]{40}/u,
          "uses: actions/checkout@v5",
        ),
        "utf8",
      );
    });
    try {
      const result = runLane(root);
      expect(result.exitCode).toBe(1);
      expect(result.output).toContain("action-pin");
      expect(result.output).toContain(
        "packages/qfai/assets/init/root/.github/workflows/qfai-tests.yml",
      );
    } finally {
      await removeTempTree(root);
    }
  });

  // QFAI:AC-0002-0018-05
  it("accepts the sanctioned package manager action but rejects an unsanctioned owner", async () => {
    const clean = plantedTree(() => {});
    const planted = plantedTree((dir) => {
      const file = path.join(dir, SHIPPED_WORKFLOWS_REL, shippedWorkflow);
      writeFileSync(
        file,
        replaceOnce(
          readFileSync(file, "utf8"),
          /uses: pnpm\/action-setup@[a-f0-9]{40}/u,
          `uses: stranger/action-setup@${"a".repeat(40)}`,
        ),
        "utf8",
      );
    });
    try {
      const allowed = runLane(clean);
      expect(allowed.exitCode, allowed.output).toBe(0);
      expect(allowed.output).toContain("shipped-third-party");
      const refused = runLane(planted);
      expect(refused.exitCode).toBe(1);
      expect(refused.output).toContain("shipped-third-party");
      expect(refused.output).toContain("stranger");
    } finally {
      await Promise.all([removeTempTree(clean), removeTempTree(planted)]);
    }
  });

  // QFAI:AC-0002-0018-07
  it("refuses a skippable required context in the pull request workflow", async () => {
    const root = plantedTree((dir) => {
      editWorkflow(dir, "ci.yml", (source) =>
        replaceOnce(source, /(\n {2}ci-pass:\n[\s\S]*?\n {4}if: )always\(\)/u, "$1false"),
      );
    });
    try {
      const result = runLane(root);
      expect(result.exitCode).toBe(1);
      expect(result.output).toContain("required-context");
      expect(result.output).toContain("ci-pass");
    } finally {
      await removeTempTree(root);
    }
  });

  // QFAI:AC-0002-0016-03
  it("keeps build work in the required aggregate verdict", () => {
    const workflow: unknown = parseYaml(
      readFileSync(path.join(REPO_ROOT, ".github", "workflows", "ci.yml"), "utf8"),
    );
    if (!isRecord(workflow)) {
      throw new Error("ci.yml has no jobs");
    }
    const jobs = workflow["jobs"];
    if (!isRecord(jobs)) {
      throw new Error("ci.yml has no build or ci-pass job");
    }
    const build = jobs["build"];
    const verdict = jobs["ci-pass"];
    if (!isRecord(build) || !isRecord(verdict)) {
      throw new Error("build or ci-pass is not a job");
    }
    expect(build).not.toHaveProperty("if");
    expect(build).not.toHaveProperty("needs");
    expect(verdict).toHaveProperty("if", "always()");
    expect(verdict).toHaveProperty("needs", expect.arrayContaining(["build", "lint", "test"]));
    const declaration: unknown = JSON.parse(
      readFileSync(path.join(REPO_ROOT, ".github", "required-status-contexts.json"), "utf8"),
    );
    if (!isRecord(declaration) || !Array.isArray(declaration["contexts"])) {
      throw new Error("required context declaration is missing or ambiguous");
    }
    const [context] = declaration["contexts"];
    if (declaration["contexts"].length !== 1 || !isRecord(context)) {
      throw new Error("required context declaration has no single context");
    }
    expect(context).toMatchObject({ workflow: "ci.yml", job: "ci-pass" });
    expect(context["dependencies"]).toEqual(verdict["needs"]);
    expect(context["verificationSet"]).toContain(
      "Derive the verdict from the serialized needs map",
    );
    const buildSteps = build["steps"];
    if (!Array.isArray(buildSteps)) throw new Error("build has no steps");
    const names = buildSteps.map((step: unknown) => (isRecord(step) ? step["name"] : undefined));
    for (const name of [
      "Run build & pack verification",
      "QFAI self-validate this repo (dogfooding — TDD gates)",
      "QFAI self-validate this repo (dogfooding — SDD gates)",
      "QFAI self-validate this repo (dogfooding — full profile)",
      "Run qfai validate gate (fail on error)",
    ]) {
      expect(names).toContain(name);
    }
    for (const step of buildSteps) {
      expect(step).not.toHaveProperty("continue-on-error");
    }
    const verdictSteps = verdict["steps"];
    if (!Array.isArray(verdictSteps)) throw new Error("ci-pass has no steps");
    expect(verdictSteps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          env: expect.objectContaining({ NEEDS_JSON: "${{ toJSON(needs) }}" }),
        }),
      ]),
    );
  });

  // QFAI:AC-0002-0020-01
  it("folds own-repository full validation into the single pull request workflow", () => {
    const workflowsDir = path.join(REPO_ROOT, ".github", "workflows");
    const workflowFiles = readdirSync(workflowsDir).filter((name) => /\.ya?ml$/u.test(name));
    expect(workflowFiles).not.toContain("validate.yml");
    const pullRequestWorkflows = workflowFiles.filter((name) => {
      const workflow: unknown = parseYaml(readFileSync(path.join(workflowsDir, name), "utf8"));
      return isRecord(workflow) && isRecord(workflow["on"]) && "pull_request" in workflow["on"];
    });
    expect(pullRequestWorkflows).toEqual(["ci.yml"]);
    const ci = readFileSync(path.join(workflowsDir, "ci.yml"), "utf8");
    expect(ci).toMatch(
      /\n {2}build:\n[\s\S]*?node scripts\/check-dogfood-backlog\.mjs --profile full/u,
    );
    expect(ci).toMatch(/\n {2}build:\n[\s\S]*?Run qfai validate gate \(fail on error\)/u);
    const dogfood = readFileSync(
      path.join(REPO_ROOT, "scripts", "check-dogfood-backlog.mjs"),
      "utf8",
    );
    expect(dogfood).toContain('"packages/qfai/dist/cli/index.mjs"');
    expect(dogfood).toContain('"--root", "."');
  });
});
