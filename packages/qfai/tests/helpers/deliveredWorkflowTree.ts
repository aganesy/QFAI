/**
 * The workflow set as `qfai init` delivers it: one initialised project per
 * suite, the accessors that read its `.github/workflows/`, and a runner that
 * executes one delivered `run:` body. Shared by the suites that assert on the
 * delivered tree rather than on the packaged assets. No assertions live here.
 */
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { parse as parseYaml } from "yaml";

import { runInit } from "../../src/cli/commands/init.js";
import { isRecord } from "./shippedWorkflowFixtures.js";
import { captureStdout } from "./stdout.js";
import { removeTempTree } from "./tempTree.js";

export interface DeliveredWorkflowTree {
  /** The initialised project, built on first use and reused after that. */
  project: () => Promise<string>;
  workflowsDir: () => Promise<string>;
  workflowText: (file: string) => Promise<string>;
  /** The delivered file's job map, keyed `<file>#<job>`. */
  jobsOf: (file: string) => Promise<Record<string, Record<string, unknown>>>;
  /** Removes the project if one was built. Call it from the suite's `afterAll`. */
  cleanup: () => Promise<void>;
}

/**
 * One lazily initialised project for the calling suite.
 *
 * Each init copies the full asset tree, so a suite builds one and every test
 * in it reads that one.
 */
export function deliveredWorkflowTree(prefix: string): DeliveredWorkflowTree {
  let projectPromise: Promise<string> | undefined;

  const project = (): Promise<string> => {
    projectPromise ??= (async () => {
      const dir = await mkdtemp(path.join(os.tmpdir(), prefix));
      await captureStdout(() => runInit({ dir, force: false, dryRun: false, yes: true }));
      return dir;
    })();
    return projectPromise;
  };

  const workflowsDir = async (): Promise<string> =>
    path.join(await project(), ".github", "workflows");

  const workflowText = async (file: string): Promise<string> =>
    readFile(path.join(await workflowsDir(), file), "utf-8");

  const jobsOf = async (file: string): Promise<Record<string, Record<string, unknown>>> => {
    const parsed: unknown = parseYaml(await workflowText(file));
    if (!isRecord(parsed) || !isRecord(parsed["jobs"])) {
      throw new Error(`${file} was delivered without a jobs map`);
    }
    const out: Record<string, Record<string, unknown>> = {};
    for (const [id, job] of Object.entries(parsed["jobs"])) {
      if (isRecord(job)) out[`${file}#${id}`] = job;
    }
    return out;
  };

  const cleanup = async (): Promise<void> => {
    if (projectPromise === undefined) return;
    const dir = await projectPromise;
    await removeTempTree(dir);
  };

  return { project, workflowsDir, workflowText, jobsOf, cleanup };
}

export type StepRun = {
  status: number | null;
  stdout: string;
  stderr: string;
  outputs: Record<string, string>;
  skipped: boolean;
};

/**
 * Executes one delivered `run:` body under bash with a stubbed `GITHUB_OUTPUT`, returning the exit
 * status, both streams and the `key=value` pairs the shell published.
 *
 * `-e -o pipefail` are the flags GitHub applies to a `shell: bash` step, so a claim about a lane's
 * exit semantics is only a claim about the delivered file when they are on.
 */
export async function runStep(
  body: string,
  cwd: string,
  env: NodeJS.ProcessEnv = {},
): Promise<StepRun> {
  const stage = await mkdtemp(path.join(os.tmpdir(), "qfai-delivered-step-"));
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
