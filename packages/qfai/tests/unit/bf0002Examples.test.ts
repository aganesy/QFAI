import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import { plantedTree, runLane } from "../scripts/helpers/hygieneTree.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const workflowPath = path.join(root, ".github/workflows/ci.yml");
const declarationPath = path.join(root, ".github/required-status-contexts.json");

function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be a map`);
  }
  return value as Record<string, unknown>;
}

function workflowJobs(): Record<string, unknown> {
  return record(record(parseYaml(readFileSync(workflowPath, "utf8")), "workflow")["jobs"], "jobs");
}

function job(id: string): Record<string, unknown> {
  return record(workflowJobs()[id], `job ${id}`);
}

function steps(id: string): Record<string, unknown>[] {
  const value = job(id)["steps"];
  if (!Array.isArray(value)) throw new Error(`job ${id} has no steps`);
  return value.map((entry: unknown, index: number) => record(entry, `${id} step ${index}`));
}

function verdictProgram(): string {
  const matching = steps("ci-pass").filter(
    (step) => typeof step["run"] === "string" && step["run"].includes("<<'NODE'"),
  );
  if (matching.length !== 1) throw new Error("ci-pass must carry one quoted Node program");
  const step = matching[0];
  if (step === undefined || typeof step["run"] !== "string") throw new Error("missing program");
  const lines = step["run"].split("\n");
  const start = lines.findIndex((line) => line.includes("<<'NODE'"));
  const end = lines.findIndex((line, index) => index > start && line.trimEnd() === "NODE");
  if (start < 0 || end <= start) throw new Error("ci-pass Node program is incomplete");
  expect(record(step["env"], "verdict environment")["NEEDS_JSON"]).toBe("${{ toJSON(needs) }}");
  return lines.slice(start + 1, end).join("\n");
}

function evaluateVerdict(needs: Record<string, { result?: string | undefined }>): {
  exitCode: number;
  output: string;
} {
  const directory = mkdtempSync(path.join(tmpdir(), "qfai-bf2-verdict-"));
  const script = path.join(directory, "verdict.mjs");
  try {
    writeFileSync(script, verdictProgram(), "utf8");
    const result = spawnSync(process.execPath, [script], {
      encoding: "utf8",
      env: { ...process.env, NEEDS_JSON: JSON.stringify(needs) },
    });
    return { exitCode: result.status ?? -1, output: `${result.stdout}${result.stderr}` };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function declaredNeeds(): string[] {
  const needs = job("ci-pass")["needs"];
  if (!Array.isArray(needs) || !needs.every((value) => typeof value === "string")) {
    throw new Error("ci-pass needs must be a job list");
  }
  return needs;
}

function needsWith(result: string): Record<string, { result: string }> {
  return Object.fromEntries(declaredNeeds().map((name) => [name, { result }]));
}

describe("BF-0002 CI verdict examples", () => {
  it("evaluates a newly wired need without an edit to the verdict body", () => {
    // QFAI:EX-0002-0013-01
    const source = verdictProgram().replace(/^\s*\/\/.*$/gm, "");
    const future = "new-independent-check";
    expect(source).not.toContain(future);
    for (const name of declaredNeeds()) expect(source).not.toContain(`needs.${name}`);
    const result = evaluateVerdict({ ...needsWith("success"), [future]: { result: "failure" } });
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain(future);
  });

  it("accepts all success and all skipped", () => {
    // QFAI:EX-0002-0013-02
    expect(declaredNeeds().length).toBeGreaterThan(0);
    for (const state of ["success", "skipped"]) {
      expect(evaluateVerdict(needsWith(state)).exitCode).toBe(0);
    }
  });

  it("rejects failed, cancelled, and unrecognized results", () => {
    const [first] = declaredNeeds();
    if (first === undefined) throw new Error("ci-pass has no dependency");
    for (const state of ["failure", "cancelled"]) {
      // QFAI:EX-0002-0013-03
      const result = evaluateVerdict({ ...needsWith("success"), [first]: { result: state } });
      expect(result.exitCode).toBe(1);
      expect(result.output).toContain(first);
      expect(result.output).toContain(state);
    }
    for (const value of ["neutral", "SUCCESS", "", undefined]) {
      // QFAI:EX-0002-0013-04
      expect(
        evaluateVerdict({ ...needsWith("success"), [first]: { result: value } }).exitCode,
      ).toBe(1);
    }
    expect(evaluateVerdict({}).exitCode).toBe(1);
  });

  it("keeps test matrices declared while their jobs use the detection result", () => {
    // QFAI:EX-0002-0013-06
    for (const id of ["node-floor", "test"]) {
      const selected = job(id);
      expect(selected["needs"]).toContain("detect");
      expect(selected["if"]).toBe("${{ needs.detect.outputs.full == 'true' }}");
      const strategy = record(selected["strategy"], `${id} strategy`);
      const matrix = record(strategy["matrix"], `${id} matrix`);
      expect(matrix["slice"]).toEqual([
        "core",
        "validators",
        "integration",
        "e2e",
        "cli",
        "unit",
        "scripts",
        "pr-fix",
        "pr-merge",
      ]);
    }
  });

  it("keeps unconditional lint and build in the required verdict", () => {
    // QFAI:EX-0002-0013-11
    const lint = job("lint");
    const build = job("build");
    const verdict = job("ci-pass");
    expect(lint).not.toHaveProperty("if");
    expect(build).not.toHaveProperty("if");
    expect(verdict["if"]).toBe("always()");
    expect(declaredNeeds()).toEqual(expect.arrayContaining(["detect", "lint", "build"]));
    const lintCommands = steps("lint")
      .map((step) => step["run"])
      .filter((run): run is string => typeof run === "string")
      .join("\n");
    for (const command of [
      "pnpm ci:lint",
      "check-no-internal-version-leakage.sh",
      "check-branch-version-pin.sh",
    ]) {
      expect(lintCommands).toContain(command);
    }
    const mirrorCommands = steps("mirror-surface")
      .map((step) => step["run"])
      .filter((run): run is string => typeof run === "string")
      .join("\n");
    expect(job("mirror-surface")).not.toHaveProperty("if");
    expect(mirrorCommands).toContain("lint:mirror-surface");
    const packageJson = record(
      JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")),
      "package",
    );
    const scripts = record(packageJson["scripts"], "package scripts");
    expect(scripts["ci:lint"]).toContain("check-workflow-hygiene.mjs");
    const lintScript = readFileSync(path.join(root, "scripts/run-lint-checks.sh"), "utf8");
    expect(lintScript).toContain("pnpm format:check");
    expect(lintScript).toContain("pnpm ci:lint:structure");
    expect(scripts["ci:lint:structure"]).toContain("pnpm lint:md");
    expect(scripts["ci:lint:scans"]).toContain("check-tracked-symlinks.mjs");
  });

  it("keeps build verification in the non-skippable release path", () => {
    // QFAI:EX-0002-0016-04
    // QFAI:EX-0002-0020-02
    const build = job("build");
    expect(build).not.toHaveProperty("if");
    expect(build).not.toHaveProperty("needs");
    expect(declaredNeeds()).toContain("build");
    const buildSteps = steps("build");
    expect(buildSteps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Run build & pack verification" }),
        expect.objectContaining({
          name: "QFAI self-validate this repo (dogfooding — full profile)",
        }),
        expect.objectContaining({ name: "Run qfai validate gate (fail on error)" }),
      ]),
    );
    const fullProfile = buildSteps.find(
      (step) => step["name"] === "QFAI self-validate this repo (dogfooding — full profile)",
    );
    expect(fullProfile?.["run"]).toContain("check-dogfood-backlog.mjs --profile full");
    const dogfood = readFileSync(path.join(root, "scripts/check-dogfood-backlog.mjs"), "utf8");
    expect(dogfood).toContain('"packages/qfai/dist/cli/index.mjs"');
    expect(dogfood).toContain('"--root", "."');
    const sandboxValidate = buildSteps.find(
      (step) => step["name"] === "Run qfai validate gate (fail on error)",
    );
    expect(sandboxValidate?.["run"]).toContain("packages/qfai/dist/cli/index.mjs validate");
    expect(sandboxValidate?.["run"]).toContain("--root tmp/pack/sandbox/out --fail-on error");
    // QFAI:EX-0002-0016-05
    for (const name of [
      "Run build & pack verification",
      "QFAI self-validate this repo (dogfooding — TDD gates)",
      "QFAI self-validate this repo (dogfooding — SDD gates)",
      "QFAI self-validate this repo (dogfooding — full profile)",
      "Run qfai validate gate (fail on error)",
    ]) {
      const verification = buildSteps.find((step) => step["name"] === name);
      expect(verification, `missing verification ${name}`).toBeDefined();
      expect(verification).not.toHaveProperty("continue-on-error");
    }
    // QFAI:EX-0002-0020-03
    const declaration = record(JSON.parse(readFileSync(declarationPath, "utf8")), "declaration");
    const contexts = declaration["contexts"];
    if (!Array.isArray(contexts) || contexts.length !== 1) throw new Error("one context required");
    const context = record(contexts[0], "required context");
    expect(context["job"]).toBe("ci-pass");
    expect(context["verificationSet"]).toEqual(
      expect.arrayContaining(["QFAI self-validate this repo (dogfooding — full profile)"]),
    );
  });

  it("runs both workflow hygiene scopes and reports a shipped-only violation", () => {
    // QFAI:EX-0002-0018-01
    // QFAI:EX-0002-0018-02
    // QFAI:EX-0002-0018-08
    const clean = plantedTree(() => {});
    const planted = plantedTree((directory) => {
      const target = path.join(
        directory,
        "packages/qfai/assets/init/root/.github/workflows/qfai-tests.yml",
      );
      const before = readFileSync(target, "utf8");
      const after = before.replace(
        /uses: actions\/checkout@[a-f0-9]{40}/u,
        "uses: actions/checkout@v5",
      );
      if (after === before) throw new Error("shipped checkout fixture is stale");
      writeFileSync(target, after, "utf8");
    });
    try {
      const baseline = runLane(clean);
      expect(baseline.exitCode, baseline.output).toBe(0);
      expect(baseline.output).toContain("Rules run over both workflow trees:");
      for (const rule of [
        "job-guardrails",
        "checkout-credentials",
        "action-pin",
        "matrix-fail-fast",
        "secret-inheritance",
      ]) {
        expect(baseline.output).toContain(rule);
      }
      const violation = runLane(planted);
      expect(violation.exitCode).toBe(1);
      expect(violation.output).toContain("action-pin");
      expect(violation.output).toContain(
        "packages/qfai/assets/init/root/.github/workflows/qfai-tests.yml",
      );
    } finally {
      rmSync(clean, { recursive: true, force: true });
      rmSync(planted, { recursive: true, force: true });
    }
  });

  // QFAI:EX-0002-0001-02
  it("refuses a shipped checkout that no longer disables credential persistence", () => {
    const clean = plantedTree(() => {});
    const planted = plantedTree((directory) => {
      const target = path.join(
        directory,
        "packages/qfai/assets/init/root/.github/workflows/qfai-tests.yml",
      );
      const before = readFileSync(target, "utf8");
      const after = before.replace("          persist-credentials: false\n", "");
      if (after === before) throw new Error("shipped checkout fixture is stale");
      writeFileSync(target, after, "utf8");
    });
    try {
      const baseline = runLane(clean);
      expect(baseline.exitCode, baseline.output).toBe(0);
      const violation = runLane(planted);
      expect(violation.exitCode).toBe(1);
      expect(violation.output).toContain("checkout-credentials");
      expect(violation.output).toContain("qfai-tests.yml");
      expect(violation.output).toContain("detection");
      const shipped = readFileSync(
        path.join(root, "packages/qfai/assets/init/root/.github/workflows/qfai-tests.yml"),
        "utf8",
      );
      const doc = record(parseYaml(shipped), "shipped test workflow");
      const detection = record(record(doc["jobs"], "shipped jobs")["detection"], "detection");
      const checkout = detection["steps"];
      if (!Array.isArray(checkout)) throw new Error("detection steps missing");
      const first = record(checkout[0], "detection checkout");
      const withBlock = record(first["with"], "checkout options");
      expect(withBlock["fetch-depth"]).toBe(0);
      expect(record(doc["defaults"] ?? {}, "workflow defaults")).not.toHaveProperty("fetch-depth");
    } finally {
      rmSync(clean, { recursive: true, force: true });
      rmSync(planted, { recursive: true, force: true });
    }
  });
});
