#!/usr/bin/env node
/* global console, process */
/** Collect complete root validation reports from two exact CI snapshots. */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { assertCompleteValidationReport } from "./check-dogfood-backlog.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { parse } = require("../packages/qfai/node_modules/yaml");
const output = path.join(root, "tmp", "dogfood-finding-reports");
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const manifest = {
  targetSha: process.env.QFAI_MEASUREMENT_MAIN,
  headSha: process.env.QFAI_MEASUREMENT_HEAD,
  runId: process.env.GITHUB_RUN_ID,
  runAttempt: process.env.GITHUB_RUN_ATTEMPT,
  job: process.env.GITHUB_JOB,
  nodeVersion: process.version,
  complete: false,
  snapshots: [],
};

function command(program, args, cwd, options = {}) {
  const result = spawnSync(program, args, { cwd, env: process.env, stdio: "inherit", ...options });
  if (result.error) throw new Error(`Could not run ${program}: ${result.error.message}`);
  if (result.signal !== null || result.status === null) {
    throw new Error(`${program} did not complete: ${String(result.signal)}`);
  }
  return result;
}

function text(program, args, cwd) {
  const result = command(program, args, cwd, { encoding: "utf8", stdio: "pipe" });
  if (result.status !== 0)
    throw new Error(`${program} exited ${String(result.status)}: ${result.stderr}`);
  return result.stdout.trim();
}

function run(program, args, cwd, options) {
  const result = command(program, args, cwd, options);
  if (result.status !== 0) throw new Error(`${program} exited ${String(result.status)}.`);
}

function saveManifest() {
  writeFileSync(path.join(output, "metadata.json"), JSON.stringify(manifest, null, 2) + "\n");
}

function producedReport(cwd, program, args, reportPath) {
  const result = command(program, args, cwd);
  const bytes = readFileSync(path.join(cwd, reportPath));
  if (bytes.length === 0) throw new Error(`Producer wrote an empty report: ${reportPath}`);
  JSON.parse(bytes.toString("utf8"));
  return { program, args, status: result.status, reportPath, sha256: digest(bytes) };
}

function main() {
  mkdirSync(output, { recursive: true });
  saveManifest();
  for (const sha of [manifest.targetSha, manifest.headSha]) {
    if (!/^[a-f0-9]{40}$/.test(sha ?? ""))
      throw new Error("Both snapshot revisions must be exact Git SHAs.");
    if (text("git", ["rev-parse", sha + "^{commit}"], root) !== sha) {
      throw new Error("Snapshot revision did not resolve to the requested commit.");
    }
  }
  manifest.originMainAtStart = text("git", ["rev-parse", "origin/main"], root);
  manifest.remoteMainAtStart = text("git", ["ls-remote", "origin", "refs/heads/main"], root).split(
    "\t",
  )[0];
  saveManifest();
  if (
    manifest.originMainAtStart !== manifest.targetSha ||
    manifest.remoteMainAtStart !== manifest.targetSha
  ) {
    throw new Error(
      "Main moved before collection; retain the fixed target and collect again after integration.",
    );
  }
  const expectedPackage = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  const workspace = mkdtempSync(path.join(os.tmpdir(), "qfai-finding-snapshots-"));
  const inputs = [
    "packages/qfai/src",
    "packages/qfai/assets",
    ".qfai",
    "qfai.config.yaml",
    "package.json",
    "packages/qfai/package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "packages/qfai/tsup.config.ts",
    "packages/qfai/tsconfig.build.json",
    "tsconfig.base.json",
    ".github/actions/setup/action.yml",
    ".github/actions/setup/dependency-builds.txt",
    ".github/actions/setup/verify-rebuild-sources.mjs",
    "scripts/check-workflow-hygiene.mjs",
    "packages/qfai/tests/integration/shippedWorkflowShapeGate.test.ts",
    "packages/qfai/tests/integration/shippedWorkflowShape.ts",
    ".github/required-status-contexts.json",
    ".github/workflows/ci.yml",
    "scripts/dogfood-backlog.json",
  ];
  for (const [label, sha] of [
    ["main", manifest.targetSha],
    ["head", manifest.headSha],
  ]) {
    const cwd = path.join(workspace, label);
    run("git", ["worktree", "add", "--detach", cwd, sha], root);
    if (text("git", ["rev-parse", "--is-shallow-repository"], cwd) !== "false") {
      throw new Error("Snapshot history is incomplete.");
    }
    const pkg = JSON.parse(readFileSync(path.join(cwd, "package.json"), "utf8"));
    if (
      pkg.packageManager !== expectedPackage.packageManager ||
      pkg.engines.node !== expectedPackage.engines.node
    ) {
      throw new Error("Snapshot toolchain differs; collection requires a new toolchain decision.");
    }
    const actionPath = path.join(cwd, ".github", "actions", "setup");
    const actionBytes = readFileSync(path.join(actionPath, "action.yml"));
    const action = parse(actionBytes.toString("utf8"));
    const matches = action.runs.steps.filter((step) => step.name === "Install dependencies");
    const install = matches[0];
    if (
      matches.length !== 1 ||
      install.shell !== "bash" ||
      typeof install.run !== "string" ||
      install.env !== undefined ||
      install["working-directory"] !== undefined ||
      install.if !== undefined ||
      install["continue-on-error"] !== undefined
    ) {
      throw new Error("Snapshot install step no longer has the reviewed execution shape.");
    }
    const body = install.run.replaceAll(
      "${{ github.action_path }}",
      "${QFAI_SNAPSHOT_ACTION_PATH}",
    );
    if (body.includes("${{"))
      throw new Error("Snapshot install contains an unsupported expression.");
    const snapshot = {
      label,
      sha,
      historyComplete: true,
      packageManager: pkg.packageManager,
      engines: pkg.engines,
      inputs: inputs.map((input) => ({
        path: input,
        object: text("git", ["rev-parse", sha + ":" + input], cwd),
      })),
      installActionSha256: digest(actionBytes),
      expandedInstallSha256: digest(body),
      producers: [],
      reports: [],
    };
    manifest.snapshots.push(snapshot);
    snapshot.pnpmVersion = text("pnpm", ["--version"], cwd);
    snapshot.corepackVersion = text("corepack", ["--version"], cwd);
    snapshot.requiredPnpmVersion = /^pnpm@(\d+\.\d+\.\d+)$/.exec(pkg.packageManager)?.[1];
    saveManifest();
    if (
      snapshot.requiredPnpmVersion === undefined ||
      snapshot.pnpmVersion !== snapshot.requiredPnpmVersion
    ) {
      throw new Error(
        `Snapshot pnpm ${snapshot.pnpmVersion} does not match ${pkg.packageManager}.`,
      );
    }
    run("bash", ["--noprofile", "--norc", "-e", "-o", "pipefail", "-c", body], cwd, {
      env: { ...process.env, QFAI_SNAPSHOT_ACTION_PATH: actionPath },
    });
    run("pnpm", ["build"], cwd);
    const cli = path.join(cwd, "packages", "qfai", "dist", "cli", "index.mjs");
    snapshot.cliSha256 = digest(readFileSync(cli));
    snapshot.cliSourceSha = sha;
    snapshot.producers.push(
      producedReport(
        cwd,
        "node",
        ["scripts/check-workflow-hygiene.mjs", "--report-dir", ".qfai/review/workflow-hygiene"],
        ".qfai/review/workflow-hygiene/workflow-hygiene.json",
      ),
    );
    snapshot.producers.push(
      producedReport(
        cwd,
        "pnpm",
        ["-C", "packages/qfai", "lint:workflow-shape"],
        ".qfai/review/shipped-workflow-shape/shipped-workflow-shape.json",
      ),
    );
    saveManifest();
    for (const profile of ["tdd", "sdd", "full"]) {
      run(
        "node",
        [
          cli,
          "validate",
          "--root",
          cwd,
          "--profile",
          profile,
          "--fail-on",
          "never",
          "--format",
          "github",
        ],
        cwd,
      );
      const source = path.join(cwd, ".qfai", "report", "validate.json");
      const bytes = readFileSync(source);
      const filename = label + "-" + profile + ".json";
      copyFileSync(source, path.join(output, filename));
      snapshot.pendingReport = { profile, filename, sha256: digest(bytes) };
      saveManifest();
      const parsed = JSON.parse(bytes.toString("utf8"));
      if (!Array.isArray(parsed.issues)) throw new Error("Root report has no issues array.");
      assertCompleteValidationReport(parsed);
      snapshot.reports.push({
        ...snapshot.pendingReport,
        issueCount: parsed.issues.length,
      });
      delete snapshot.pendingReport;
      saveManifest();
    }
  }
  manifest.remoteMainAtEnd = text("git", ["ls-remote", "origin", "refs/heads/main"], root).split(
    "\t",
  )[0];
  manifest.mainMovedDuringCollection = manifest.remoteMainAtEnd !== manifest.targetSha;
  manifest.complete =
    manifest.snapshots.length === 2 &&
    manifest.snapshots.every((snapshot) => snapshot.reports.length === 3);
  saveManifest();
  if (!manifest.complete) throw new Error("Collection did not produce all six reports.");
}

try {
  main();
} catch (error) {
  manifest.failure = String(error);
  mkdirSync(output, { recursive: true });
  saveManifest();
  console.error("Root report collection failed: " + String(error));
  process.exitCode = 1;
}
