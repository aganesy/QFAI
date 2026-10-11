import { execFileSync, spawnSync, type SpawnSyncReturns } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect } from "vitest";
import { parse as parseYaml } from "yaml";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "..",
);
const WORKFLOWS_DIR = path.join(REPO_ROOT, ".github", "workflows");

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const stepRun = (step: Record<string, unknown>): string =>
  typeof step["run"] === "string" ? step["run"] : "";

export type WindowsSuiteMode =
  | "success"
  | "failed"
  | "zero"
  | "missing-flow"
  | "skipped-flow"
  | "wrong-title"
  | "missing-duration"
  | "runner-failed";

export type WindowsSuiteResult = {
  status: number | null;
  stdout: string;
  stderr: string;
  invocation: unknown;
  sha: string;
  summary: string;
  evidence: unknown;
  report: unknown;
  evidenceExistsBeforeExecution: boolean;
  rawReportExists: boolean;
};

export type NamedFixture = { root: string; sha: string; file: string };

export function namedGit(root: string, ...args: string[]): string {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

export function namedFixture(
  file = "packages/qfai/tests/core/one.test.ts",
  sha256 = false,
): NamedFixture {
  const root = mkdtempSync(path.join(tmpdir(), "qfai-named-head-"));
  mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  writeFileSync(path.join(root, file), "export const fixture = true;\n");
  writeFileSync(
    path.join(root, "packages", "qfai", "vitest.workspace.ts"),
    readFileSync(path.join(REPO_ROOT, "packages", "qfai", "vitest.workspace.ts")),
  );
  namedGit(root, "init", "-b", "main", ...(sha256 ? ["--object-format=sha256"] : []));
  namedGit(root, "config", "user.email", "fixture@example.invalid");
  namedGit(root, "config", "user.name", "Named test fixture");
  namedGit(root, "config", "core.autocrlf", "false");
  namedGit(root, "add", "--", file, "packages/qfai/vitest.workspace.ts");
  namedGit(root, "commit", "-m", "Test fixture");
  const sha = namedGit(root, "rev-parse", "HEAD");
  const origin = path.join(root, "origin.git");
  namedGit(root, "init", "--bare", ...(sha256 ? ["--object-format=sha256"] : []), origin);
  namedGit(root, "remote", "add", "origin", origin);
  namedGit(root, "push", "origin", "HEAD:refs/pull/37/head");
  return { root, sha, file };
}

export function windowsSuiteWorkflow(): Record<string, unknown> {
  const source = path.join(WORKFLOWS_DIR, "windows-full-suite-diagnostic.yml");
  expect(existsSync(source), "the manual Windows full-suite diagnostic must exist").toBe(true);
  const document: unknown = parseYaml(readFileSync(source, "utf-8"));
  if (!isRecord(document)) throw new Error("Windows diagnostic must contain a workflow mapping");
  return document;
}

export function windowsSuiteJob(): Record<string, unknown> {
  const jobs = windowsSuiteWorkflow()["jobs"];
  if (!isRecord(jobs)) throw new Error("Windows diagnostic jobs are absent");
  const values = Object.values(jobs);
  if (values.length !== 1 || !isRecord(values[0]))
    throw new Error("Windows diagnostic must have exactly one job");
  return values[0];
}

export function windowsSuiteSteps(): Record<string, unknown>[] {
  const steps = windowsSuiteJob()["steps"];
  if (!Array.isArray(steps)) throw new Error("Windows diagnostic steps are absent");
  return steps.filter(isRecord);
}

export function windowsSuiteProgram(marker: string): string {
  const bodies = windowsSuiteSteps()
    .map(stepRun)
    .filter((run) => run.includes(`<<'${marker}'`));
  const [body] = bodies;
  if (bodies.length !== 1 || body === undefined)
    throw new Error(`expected one Windows diagnostic ${marker} body`);
  const lines = body.split("\n");
  const opener = lines.findIndex((line) => line.includes(`<<'${marker}'`));
  const terminator = lines.findIndex((line) => line.trimEnd() === marker);
  if (opener < 0 || terminator <= opener) throw new Error(`invalid ${marker} delimiters`);
  return lines.slice(opener + 1, terminator).join("\n") + "\n";
}

export function runWindowsPreflight(
  fixture: NamedFixture,
  changes: Record<string, string> = {},
): SpawnSyncReturns<string> {
  const program = path.join(fixture.root, "windows-full-suite-preflight.mjs");
  writeFileSync(program, windowsSuiteProgram("PREFLIGHT"));
  return spawnSync(process.execPath, [program], {
    cwd: fixture.root,
    encoding: "utf-8",
    env: {
      ...process.env,
      PR_NUMBER: "37",
      EXPECTED_SHA: fixture.sha,
      DISPATCH_REF: "refs/heads/main",
      DEFAULT_BRANCH: "main",
      WORKFLOW_SHA: fixture.sha,
      RUNNER_TEMP: fixture.root,
      GITHUB_RUN_ID: "918",
      ...changes,
    },
  });
}

export const FULL_FLOW_TITLE =
  "returns findings to their owners, then carries the same flow through acceptance, implementation and report";

export function runWindowsSuite(mode: WindowsSuiteMode, changeHead = false): WindowsSuiteResult {
  const fixture = namedFixture();
  try {
    const preflight = runWindowsPreflight(fixture);
    expect(preflight.status, preflight.stderr).toBe(0);
    const flowName = path.join(
      fixture.root,
      "packages/qfai/tests/e2e/bf0001DevelopVerifyFlowE2E.test.ts",
    );
    const ordinaryName = path.join(fixture.root, "packages/qfai/tests/unit/ordinary.test.ts");
    const flowStatus = mode === "skipped-flow" ? "pending" : "passed";
    const flow = {
      name: flowName,
      status: flowStatus,
      startTime: 1000,
      endTime: mode === "missing-duration" ? undefined : 1140,
      assertionResults: [
        {
          title: mode === "wrong-title" ? "a different flow case" : FULL_FLOW_TITLE,
          fullName: mode === "wrong-title" ? "a different flow case" : FULL_FLOW_TITLE,
          status: flowStatus,
          duration: mode === "missing-duration" ? undefined : 140,
        },
      ],
    };
    const ordinary = {
      name: ordinaryName,
      status: mode === "failed" ? "failed" : "passed",
      startTime: 1000,
      endTime: 1080,
      assertionResults: [
        {
          title: "ordinary",
          fullName: "ordinary",
          status: mode === "failed" ? "failed" : "passed",
          duration: 80,
        },
      ],
    };
    const files = mode === "zero" ? [] : mode === "missing-flow" ? [ordinary] : [ordinary, flow];
    const report = {
      success: mode !== "failed",
      startTime: 1000,
      numTotalTestSuites: files.length,
      numPassedTestSuites: files.filter((file) => file.status === "passed").length,
      numFailedTestSuites: mode === "failed" ? 1 : 0,
      numPendingTestSuites: mode === "skipped-flow" ? 1 : 0,
      numTotalTests: files.length,
      numPassedTests: files.reduce(
        (count, file) =>
          count + file.assertionResults.filter((test) => test.status === "passed").length,
        0,
      ),
      numFailedTests: mode === "failed" ? 1 : 0,
      numPendingTests: mode === "skipped-flow" ? 1 : 0,
      testResults: files,
    };
    const control = path.join(fixture.root, ".git", "vitest-control.json");
    writeFileSync(
      control,
      JSON.stringify({ report, status: mode === "runner-failed" ? 7 : mode === "failed" ? 1 : 0 }),
    );
    const cli = path.join(fixture.root, "packages/qfai/node_modules/vitest/vitest.mjs");
    mkdirSync(path.dirname(cli), { recursive: true });
    writeFileSync(
      cli,
      `import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
const root = path.resolve("../..");
const control = JSON.parse(readFileSync(path.join(root, ".git", "vitest-control.json"), "utf-8"));
const args = process.argv.slice(2);
writeFileSync(path.join(root, ".git", "vitest-args.json"), JSON.stringify({ args, cwd: process.cwd(), tokenKeys: Object.keys(process.env).filter((name) => ["GH_TOKEN", "GITHUB_TOKEN", "ACTIONS_RUNTIME_TOKEN"].includes(name.toUpperCase())) }));
let report;
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--outputFile" || arg === "--outputFile.json") report = args[index + 1];
  if (arg.startsWith("--outputFile=")) report = arg.slice("--outputFile=".length);
  if (arg.startsWith("--outputFile.json=")) report = arg.slice("--outputFile.json=".length);
}
if (!report) throw new Error("diagnostic must capture the native JSON reporter");
writeFileSync(report, JSON.stringify(control.report));
process.exitCode = control.status;
`,
    );
    if (changeHead) {
      writeFileSync(path.join(fixture.root, fixture.file), "export const later = true;\n");
      namedGit(fixture.root, "add", "--", fixture.file);
      namedGit(fixture.root, "commit", "-m", "Moved before the native runner");
    }
    const runner = path.join(fixture.root, "runner.mjs");
    writeFileSync(runner, windowsSuiteProgram("RUNNER"));
    const evidencePath = path.join(fixture.root, "windows-full-suite", "evidence.json");
    const reportPath = path.join(fixture.root, "windows-full-suite", "vitest-results.json");
    const evidenceExistsBeforeExecution = existsSync(evidencePath);
    const result = spawnSync(process.execPath, [runner], {
      cwd: fixture.root,
      encoding: "utf-8",
      env: {
        ...process.env,
        PR_NUMBER: "37",
        EXPECTED_SHA: fixture.sha,
        DISPATCH_REF: "refs/heads/main",
        DEFAULT_BRANCH: "main",
        WORKFLOW_SHA: fixture.sha,
        RUNNER_TEMP: fixture.root,
        GITHUB_RUN_ID: "918",
        GITHUB_STEP_SUMMARY: path.join(fixture.root, "summary.md"),
        GH_TOKEN: "fixture-token",
        GITHUB_TOKEN: "fixture-token",
        ACTIONS_RUNTIME_TOKEN: "fixture-token",
      },
    });
    const invocationPath = path.join(fixture.root, ".git", "vitest-args.json");
    const invocation: unknown = existsSync(invocationPath)
      ? JSON.parse(readFileSync(invocationPath, "utf-8"))
      : undefined;
    return {
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
      invocation,
      sha: fixture.sha,
      evidence: existsSync(evidencePath)
        ? JSON.parse(readFileSync(evidencePath, "utf-8"))
        : undefined,
      report:
        existsSync(reportPath) && readFileSync(reportPath, "utf-8").length > 0
          ? JSON.parse(readFileSync(reportPath, "utf-8"))
          : undefined,
      evidenceExistsBeforeExecution,
      rawReportExists: existsSync(reportPath),
      summary: existsSync(path.join(fixture.root, "summary.md"))
        ? readFileSync(path.join(fixture.root, "summary.md"), "utf-8")
        : "",
    };
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
}
