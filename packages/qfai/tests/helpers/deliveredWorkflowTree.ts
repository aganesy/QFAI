/**
 * The workflow set as an adopter receives it: a project tree written by `qfai init`, a reader for
 * one delivered workflow's jobs, and a runner that executes one step's `run:` body under bash.
 *
 * Every suite that asserts on the delivered workflows, rather than on the packaged assets, needs
 * these three. They live here so a fix to one of them — how bash is found, how the tree is removed,
 * how a step's outputs are read — reaches every suite at once. No assertions live here.
 */
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterAll } from "vitest";
import { parse as parseYaml } from "yaml";

import { runInit } from "../../src/cli/commands/init.js";
import { isRecord } from "./shippedWorkflowFixtures.js";
import { captureStdout } from "./stdout.js";
import { removeTempTree } from "./tempTree.js";

/**
 * Registers one `qfai init` project tree for the calling test file and returns its accessor.
 *
 * The tree is built on first use and shared by every test in the file: initialising a full asset
 * tree per test repeats the same work and has pushed a slice past its timeout before. It is removed
 * after the file's last test. Call this at the top level of a test file.
 */
export function useDeliveredProject(prefix: string): () => Promise<string> {
  let projectPromise: Promise<string> | undefined;
  afterAll(async () => {
    if (projectPromise === undefined) return;
    await removeTempTree(await projectPromise);
  });
  return () => {
    projectPromise ??= (async () => {
      const dir = await mkdtemp(path.join(os.tmpdir(), prefix));
      await captureStdout(() => runInit({ dir, force: false, dryRun: false, yes: true }));
      return dir;
    })();
    return projectPromise;
  };
}

/** The `.github/workflows` directory of a delivered project. */
export function deliveredWorkflowsDir(projectDir: string): string {
  return path.join(projectDir, ".github", "workflows");
}

/** The text of one delivered workflow file. */
export async function readDeliveredWorkflow(projectDir: string, file: string): Promise<string> {
  return readFile(path.join(deliveredWorkflowsDir(projectDir), file), "utf-8");
}

/** One delivered workflow's `jobs` map as written, keyed by job id, or a throw when it has none. */
export async function readDeliveredJobMap(
  projectDir: string,
  file: string,
): Promise<Record<string, unknown>> {
  const parsed: unknown = parseYaml(await readDeliveredWorkflow(projectDir, file));
  if (!isRecord(parsed) || !isRecord(parsed["jobs"])) {
    throw new Error(`${file} was delivered without a jobs map`);
  }
  return parsed["jobs"];
}

/** One delivered workflow's mapping-valued jobs, keyed `<file>#<job>`. */
export async function readDeliveredJobs(
  projectDir: string,
  file: string,
): Promise<Record<string, Record<string, unknown>>> {
  const out: Record<string, Record<string, unknown>> = {};
  for (const [id, job] of Object.entries(await readDeliveredJobMap(projectDir, file))) {
    if (isRecord(job)) out[`${file}#${id}`] = job;
  }
  return out;
}

/** What one executed step left behind. `skipped` is true when no bash could be started. */
export interface StepRun {
  status: number | null;
  stdout: string;
  stderr: string;
  outputs: Record<string, string>;
  skipped: boolean;
}

/**
 * Executes one `run:` body under bash with a stubbed `GITHUB_OUTPUT`, returning the exit status,
 * both streams and the `key=value` pairs the shell published.
 *
 * `-e -o pipefail` are the flags GitHub applies to a `shell: bash` step, so a claim about a lane's
 * exit semantics is only a claim about the delivered file when they are on. Running the body is the
 * only way to tell a step that resolves a value from one that merely mentions it.
 */
export async function runWorkflowStep(
  body: string,
  cwd: string,
  env: NodeJS.ProcessEnv = {},
): Promise<StepRun> {
  const stage = await mkdtemp(path.join(os.tmpdir(), "qfai-workflow-step-"));
  try {
    const scriptPath = path.join(stage, "step.sh");
    const outputPath = path.join(stage, "github-output.txt");
    await writeFile(scriptPath, body, "utf8");
    await writeFile(outputPath, "", "utf8");
    const child = spawnSync("bash", ["-e", "-o", "pipefail", scriptPath], {
      cwd,
      encoding: "utf-8",
      env: { ...process.env, ...env, GITHUB_OUTPUT: outputPath },
    });
    if (child.error !== undefined) {
      // `bash` is absent on some Windows images. Rethrowing would turn a missing interpreter into a
      // failure of the property under test, which it is not.
      const error: unknown = child.error;
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? String(error.code ?? "")
          : "";
      if (code === "ENOENT") {
        return { status: null, stdout: "", stderr: "", outputs: {}, skipped: true };
      }
      throw child.error;
    }
    const outputs: Record<string, string> = {};
    for (const line of (await readFile(outputPath, "utf8")).split(/\r?\n/)) {
      const eq = line.indexOf("=");
      if (eq > 0) outputs[line.slice(0, eq)] = line.slice(eq + 1);
    }
    return {
      status: child.status,
      stdout: child.stdout ?? "",
      stderr: child.stderr ?? "",
      outputs,
      skipped: false,
    };
  } finally {
    await removeTempTree(stage);
  }
}
