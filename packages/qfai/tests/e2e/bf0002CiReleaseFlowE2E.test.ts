/**
 * A pull request's path from the own CI workflow's diff to its required status context.
 * The shipped adopter workflow is exercised by spec0003ShippedWorkflowSetE2E; this file
 * connects the repository-owned classifier, a representative declared lane, and the
 * serialized-needs verdict. Other lane implementations have their own focused tests.
 */
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import { removeTempTree } from "../helpers/tempTree.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const fixtureDirs: string[] = [];
const bashAvailable = spawnSync("bash", ["--version"], { stdio: "ignore" }).status === 0;

afterAll(async () => {
  await Promise.all(fixtureDirs.map((dir) => removeTempTree(dir)));
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown, label: string): string[] {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    !value.every((item) => typeof item === "string")
  ) {
    throw new Error(`${label} must be a nonempty string array`);
  }
  return value;
}

async function yamlRecord(file: string): Promise<Record<string, unknown>> {
  const parsed: unknown = parseYaml(await readFile(path.join(repoRoot, file), "utf8"));
  if (!isRecord(parsed)) throw new Error(`${file} has no YAML mapping`);
  return parsed;
}

async function ciJobs(): Promise<Record<string, Record<string, unknown>>> {
  const jobs = (await yamlRecord(".github/workflows/ci.yml"))["jobs"];
  if (!isRecord(jobs)) throw new Error("ci.yml has no jobs map");
  const narrowed: Record<string, Record<string, unknown>> = {};
  for (const [name, job] of Object.entries(jobs)) {
    if (!isRecord(job)) throw new Error(`ci.yml job ${name} is not a mapping`);
    narrowed[name] = job;
  }
  return narrowed;
}

function stepsOf(job: Record<string, unknown>, label: string): Record<string, unknown>[] {
  if (!Array.isArray(job["steps"])) throw new Error(`${label} has no steps`);
  const steps: Record<string, unknown>[] = [];
  for (const step of job["steps"]) {
    if (!isRecord(step)) throw new Error(`${label} has a non-mapping step`);
    steps.push(step);
  }
  return steps;
}

function namedRun(job: Record<string, unknown>, jobName: string, stepName: string): string {
  const step = stepsOf(job, jobName).find((entry) => entry["name"] === stepName);
  if (typeof step?.["run"] !== "string") {
    throw new Error(`${jobName} has no run body for ${stepName}`);
  }
  return step["run"];
}

type StepResult = {
  status: number | null;
  output: string;
  values: Record<string, string>;
  calls: string[];
};

async function runBash(
  body: string,
  cwd: string,
  env: NodeJS.ProcessEnv = {},
): Promise<StepResult> {
  const stage = await mkdtemp(path.join(os.tmpdir(), "qfai-bf0002-step-"));
  fixtureDirs.push(stage);
  const script = path.join(stage, "step.sh");
  const outputFile = path.join(stage, "github-output.txt");
  const callsFile = path.join(stage, "calls.txt");
  await Promise.all([
    writeFile(script, body, "utf8"),
    writeFile(outputFile, "", "utf8"),
    writeFile(callsFile, "", "utf8"),
  ]);
  const child = spawnSync("bash", ["-e", "-o", "pipefail", script], {
    cwd,
    encoding: "utf8",
    timeout: 30000,
    env: {
      ...process.env,
      ...env,
      RUNNER_TEMP: stage,
      GITHUB_OUTPUT: outputFile,
      QFAI_CALL_LOG: callsFile,
    },
  });
  if (child.error) throw child.error;
  const values: Record<string, string> = {};
  for (const line of (await readFile(outputFile, "utf8")).split(/\r?\n/)) {
    const equals = line.indexOf("=");
    if (equals > 0) values[line.slice(0, equals)] = line.slice(equals + 1);
  }
  return {
    status: child.status,
    output: `${child.stdout ?? ""}${child.stderr ?? ""}`,
    values,
    calls: (await readFile(callsFile, "utf8")).split(/\r?\n/).filter(Boolean),
  };
}

function git(dir: string, args: string[]): string {
  const child = spawnSync("git", args, { cwd: dir, encoding: "utf8", timeout: 30000 });
  if (child.error || child.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${child.stderr ?? String(child.error)}`);
  }
  return (child.stdout ?? "").trim();
}

async function pullRequestFixture(): Promise<{
  dir: string;
  base: string;
  docs: string;
  source: string;
}> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-bf0002-pr-"));
  fixtureDirs.push(dir);
  git(dir, ["init", "--quiet", "--initial-branch", "main"]);
  git(dir, ["config", "user.name", "QFAI E2E"]);
  git(dir, ["config", "user.email", "qfai-e2e@example.invalid"]);
  await writeFile(path.join(dir, "REVIEW.md"), "base\n", "utf8");
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "--quiet", "-m", "base"]);
  const base = git(dir, ["rev-parse", "HEAD"]);
  await writeFile(path.join(dir, "REVIEW.md"), "base\ndocumentation\n", "utf8");
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "--quiet", "-m", "documentation"]);
  const docs = git(dir, ["rev-parse", "HEAD"]);
  await mkdir(path.join(dir, "packages", "qfai", "src"), { recursive: true });
  await writeFile(
    path.join(dir, "packages", "qfai", "src", "index.ts"),
    "export const x = 1;\n",
    "utf8",
  );
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "--quiet", "-m", "source"]);
  return { dir, base, docs, source: git(dir, ["rev-parse", "HEAD"]) };
}

async function requiredContext(jobs: Record<string, Record<string, unknown>>): Promise<{
  name: string;
  needs: string[];
  job: Record<string, unknown>;
}> {
  const declaration: unknown = JSON.parse(
    await readFile(path.join(repoRoot, ".github", "required-status-contexts.json"), "utf8"),
  );
  if (!isRecord(declaration) || !Array.isArray(declaration["contexts"])) {
    throw new Error("required-status-contexts.json has no contexts");
  }
  const [only] = declaration["contexts"];
  if (declaration["contexts"].length !== 1 || !isRecord(only)) {
    throw new Error("BF-0002 requires one declared status context");
  }
  if (only["workflow"] !== "ci.yml" || typeof only["job"] !== "string") {
    throw new Error("the required context does not name ci.yml and a job");
  }
  const job = jobs[only["job"]];
  if (job === undefined) throw new Error(`ci.yml has no required job ${only["job"]}`);
  const needs = stringArray(job["needs"], `${only["job"]}.needs`);
  expect(needs).toEqual(stringArray(only["dependencies"], "required context dependencies"));
  expect(job["if"]).toBe("always()");
  return { name: only["job"], needs, job };
}

function needResults(
  jobs: Record<string, Record<string, unknown>>,
  names: string[],
  full: boolean,
  testResult: string,
): Record<string, { result: string }> {
  // GitHub owns job scheduling. Preserve each declared job condition when modelling
  // its needs result; the classifier, lane command and verdict are executed below.
  const results: Record<string, { result: string }> = {};
  for (const name of names) {
    const job = jobs[name];
    if (job === undefined) throw new Error(`required context needs missing job ${name}`);
    const condition = job["if"];
    if (condition === undefined || condition === "always()") {
      results[name] = { result: name === "test" ? testResult : "success" };
    } else if (condition === "${{ needs.detect.outputs.full == 'true' }}") {
      results[name] = { result: full ? (name === "test" ? testResult : "success") : "skipped" };
    } else {
      throw new Error(`BF-0002 fixture cannot evaluate condition on ${name}: ${String(condition)}`);
    }
  }
  return results;
}

async function verdict(
  context: { name: string; job: Record<string, unknown> },
  cwd: string,
  needs: Record<string, { result?: string }>,
): Promise<StepResult> {
  const step = stepsOf(context.job, context.name).find((entry) =>
    String(entry["name"] ?? "").includes("serialized needs map"),
  );
  if (typeof step?.["run"] !== "string" || !isRecord(step["env"])) {
    throw new Error("the required context has no serialized-needs verdict step");
  }
  expect(step["env"]["NEEDS_JSON"]).toBe("${{ toJSON(needs) }}");
  return runBash(step["run"], cwd, { NEEDS_JSON: JSON.stringify(needs) });
}

const pnpmDouble = `pnpm() {
  printf '%s\\n' "$*" >> "$QFAI_CALL_LOG"
  return "$QFAI_PNPM_STATUS"
}
`;

// QFAI:BF-0002
describe.skipIf(process.platform === "win32" || !bashAvailable)(
  "BF-0002: pull request CI reaches the required verdict",
  { timeout: 120000 },
  () => {
    it("keeps a documentation-only pull request green through unconditional lint and skipped lanes", async () => {
      const repo = await pullRequestFixture();
      const jobs = await ciJobs();
      const context = await requiredContext(jobs);
      expect(context.name).toBe("ci-pass");
      const detect = jobs["detect"];
      const lint = jobs["lint"];
      const mirror = jobs["mirror-surface"];
      if (detect === undefined || lint === undefined || mirror === undefined) {
        throw new Error("ci.yml lacks detection or unconditional lint jobs");
      }
      expect(lint["if"]).toBeUndefined();
      expect(mirror["if"]).toBeUndefined();
      const selected = await runBash(
        namedRun(detect, "detect", "Classify the change against the enumerated directory lists"),
        repo.dir,
        {
          BASE_SHA: repo.base,
          HEAD_SHA: repo.docs,
          EVENT_NAME: "pull_request",
        },
      );
      expect(selected.status).toBe(0);
      expect(selected.values["full"]).toBe("false");
      expect(selected.values["reason"]).toContain("documentation-only");
      const lintRun = await runBash(
        `${pnpmDouble}\n${namedRun(lint, "lint", "Run lint gate")}`,
        repo.dir,
        {
          QFAI_PNPM_STATUS: "0",
        },
      );
      expect(lintRun.status).toBe(0);
      expect(lintRun.calls).toContain("ci:lint");
      const result = await verdict(
        context,
        repo.dir,
        needResults(jobs, context.needs, false, "skipped"),
      );
      expect(result.status).toBe(0);
      expect(result.output).toContain("test: skipped");
      expect(result.output).toContain("lint: success");
    });

    it("selects and invokes a source-change test lane, then rejects its install failure", async () => {
      const repo = await pullRequestFixture();
      const jobs = await ciJobs();
      const context = await requiredContext(jobs);
      const detect = jobs["detect"];
      const testJob = jobs["test"];
      if (detect === undefined || testJob === undefined)
        throw new Error("ci.yml lacks detect or test");
      const selected = await runBash(
        namedRun(detect, "detect", "Classify the change against the enumerated directory lists"),
        repo.dir,
        {
          BASE_SHA: repo.docs,
          HEAD_SHA: repo.source,
          EVENT_NAME: "pull_request",
        },
      );
      expect(selected.status).toBe(0);
      expect(selected.values["full"]).toBe("true");
      expect(selected.values["reason"]).toContain("source path");
      expect(selected.output).not.toContain("::warning");
      expect(stringArray(testJob["needs"], "test.needs")).toContain("detect");
      const strategy = testJob["strategy"];
      const matrix = isRecord(strategy) ? strategy["matrix"] : undefined;
      const slices = isRecord(matrix) ? matrix["slice"] : undefined;
      expect(stringArray(slices, "test matrix slices")).toContain("unit");
      const lane = stepsOf(testJob, "test").find((entry) =>
        String(entry["name"] ?? "").startsWith("Run tests ("),
      );
      if (typeof lane?.["run"] !== "string") throw new Error("test job has no matrix test step");
      const unitBody = lane["run"].replaceAll("${{ matrix.slice }}", "unit");
      expect(unitBody).not.toBe(lane["run"]);
      const passed = await runBash(`${pnpmDouble}\n${unitBody}`, repo.dir, {
        QFAI_PNPM_STATUS: "0",
      });
      expect(passed.status).toBe(0);
      expect(passed.calls).toContain("-C packages/qfai test:unit");
      expect(
        (await verdict(context, repo.dir, needResults(jobs, context.needs, true, "success")))
          .status,
      ).toBe(0);

      const setup = await yamlRecord(".github/actions/setup/action.yml");
      const runs = setup["runs"];
      if (!isRecord(runs)) throw new Error("setup action has no runs mapping");
      const install = stepsOf(runs, "setup action").find(
        (entry) => entry["name"] === "Install dependencies",
      );
      if (typeof install?.["run"] !== "string") throw new Error("setup action has no install step");
      const failedInstall = await runBash(`${pnpmDouble}\n${install["run"]}`, repo.dir, {
        QFAI_PNPM_STATUS: "23",
      });
      expect(failedInstall.status).toBe(23);
      expect(failedInstall.calls).toContain(
        "install --frozen-lockfile --ignore-scripts --ignore-pnpmfile",
      );
      expect(failedInstall.calls).toHaveLength(1);
      const failedVerdict = await verdict(
        context,
        repo.dir,
        needResults(jobs, context.needs, true, "failure"),
      );
      expect(failedVerdict.status).toBe(1);
      expect(failedVerdict.output).toContain("CI job test concluded failure");
    });

    it("fails open on an unavailable diff and rejects an unrecognized dependency state", async () => {
      const repo = await pullRequestFixture();
      const jobs = await ciJobs();
      const context = await requiredContext(jobs);
      const detect = jobs["detect"];
      if (detect === undefined) throw new Error("ci.yml lacks detect");
      const degraded = await runBash(
        namedRun(detect, "detect", "Classify the change against the enumerated directory lists"),
        repo.dir,
        {
          BASE_SHA: "0".repeat(40),
          HEAD_SHA: repo.source,
          EVENT_NAME: "pull_request",
        },
      );
      expect(degraded.status).toBe(0);
      expect(degraded.values["full"]).toBe("true");
      expect(degraded.output).toContain("::warning title=change detection failed open::");
      const needs = needResults(jobs, context.needs, true, "success");
      needs["future-lane"] = { result: "unknown" };
      const unknown = await verdict(context, repo.dir, needs);
      expect(unknown.status).toBe(1);
      expect(unknown.output).toContain("CI job future-lane concluded unknown");
    });
  },
);
