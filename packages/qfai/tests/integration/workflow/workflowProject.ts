/**
 * The minimal project a built-CLI `workflow plan` case runs in, with no `qfai init`: one stub
 * `STEP.md` per step a package plan runs. The plans stay in the package.
 */
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parse as parseYaml } from "yaml";

import { removeTempTree } from "../../helpers/tempTree.js";

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const PLANS = path.join(PACKAGE_ROOT, "assets", "defaults", "workflows");
export const CLI = path.join(PACKAGE_ROOT, "dist", "cli", "index.mjs");

const roots: string[] = [];

export async function removeProjects(): Promise<void> {
  await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
}

function stepName(entry: unknown): string | undefined {
  if (typeof entry === "string") return entry;
  if (typeof entry !== "object" || entry === null || !("step" in entry)) return undefined;
  return typeof entry.step === "string" ? entry.step : undefined;
}

// Every step the package's plans run.
export async function planStepNames(): Promise<Set<string>> {
  const steps = new Set<string>();
  for (const name of await readdir(PLANS)) {
    const plan: unknown = parseYaml(await readFile(path.join(PLANS, name), "utf8"));
    const stages: unknown[] =
      typeof plan === "object" && plan !== null && "stages" in plan && Array.isArray(plan.stages)
        ? plan.stages
        : [];
    for (const stage of stages) {
      if (typeof stage !== "object" || stage === null || !("steps" in stage)) continue;
      const entries: unknown[] = Array.isArray(stage.steps) ? stage.steps : [];
      for (const step of entries.map(stepName)) if (step) steps.add(step);
    }
  }
  return steps;
}

/** A temp directory holding a stub `STEP.md` for every step, and an optional config. */
export async function minimalProject(config?: string): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-workflow-"));
  roots.push(root);
  for (const step of await planStepNames()) {
    const dir = path.join(root, ".qfai", "assistant", "step", step);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "STEP.md"), `# ${step}\n`);
  }
  if (config !== undefined) await writeFile(path.join(root, "qfai.config.yaml"), config);
  return root;
}

export interface CliRun {
  status: number | null;
  stdout: string;
  stderr: string;
  json: unknown;
}

function parsed(stdout: string): unknown {
  try {
    return JSON.parse(stdout);
  } catch {
    return undefined;
  }
}

/** `qfai workflow <args>` run by the built CLI in `root`, with `stdin` piped in when given. */
export function workflow(root: string, args: string[], stdin?: string): CliRun {
  const result = spawnSync(process.execPath, [CLI, "workflow", ...args], {
    cwd: root,
    encoding: "utf8",
    ...(stdin === undefined ? {} : { input: stdin }),
  });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    json: parsed(result.stdout),
  };
}

/** Writes `value` as JSON to `name` under `root`, returning the path relative to `root`. */
export async function writeJson(root: string, name: string, value: unknown): Promise<string> {
  const file = path.join(root, ...name.split("/"));
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
  return name;
}

/** Every file and directory under `root`, as sorted relative paths. */
export async function listTree(root: string): Promise<string[]> {
  const entries = await readdir(root, { recursive: true });
  return entries.map((entry) => entry.split(path.sep).join("/")).sort();
}

/** The value at a dotted path of a parsed JSON document. */
export function field(document: unknown, dotted: string): unknown {
  let value: unknown = document;
  for (const key of dotted.split(".")) {
    if (typeof value !== "object" || value === null) return undefined;
    value = Reflect.get(value, key);
  }
  return value;
}
