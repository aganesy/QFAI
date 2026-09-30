/**
 * Integration: the delivered document lane installs its checkers outside the project's dependency
 * tree (spec-0002)
 *
 * The lane installs the schema checker, Mermaid and the DOM Mermaid runs under after the project's own
 * package manager has installed its dependencies. npm cannot read a node_modules that pnpm laid out, so
 * an install into that tree stops with an internal error and neither document check ever runs. The
 * checkers therefore go into a directory of their own, and the checker scripts are told where it is.
 *
 * Every assertion reads the tree `runInit` writes into a temporary directory, never `assets/init/**`.
 * The install step is executed under bash with `npm` replaced by a function that records its arguments,
 * so what is asserted is what the delivered step asks npm to do, in a project laid out the way pnpm
 * lays one out.
 */
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterAll, describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import { runInit } from "../../src/cli/commands/init.js";
import { collectJobSteps, findWorkflowJob } from "../helpers/shippedWorkflowFixtures.js";
import { captureStdout } from "../helpers/stdout.js";
import { removeTempTree } from "../helpers/tempTree.js";

const TOOLS_DIR = "tmp/qfai-docs-tools";
const INSTALL_STEP = "Install the document-shape and diagram checkers";

let initPromise: Promise<string> | undefined;

/** The initialised project, built once for the whole file. */
function initialised(): Promise<string> {
  initPromise ??= (async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-int-docs-install-"));
    await captureStdout(() => runInit({ dir, force: false, dryRun: false, yes: true }));
    return dir;
  })();
  return initPromise;
}

afterAll(async () => {
  if (initPromise === undefined) return;
  await removeTempTree(await initPromise);
});

/** The steps of the delivered `checks` job, in order. */
async function checkSteps(): Promise<Array<Record<string, unknown>>> {
  const file = path.join(await initialised(), ".github", "workflows", "qfai-docs.yml");
  const job = findWorkflowJob(parseYaml(await readFile(file, "utf-8")), "checks");
  if (job === undefined) throw new Error("the delivered docs workflow has no checks job");
  return collectJobSteps(job);
}

async function runBody(name: string): Promise<string> {
  const step = (await checkSteps()).find((candidate) => candidate["name"] === name);
  const body = step?.["run"];
  if (typeof body !== "string") throw new Error(`no run step named ${name}`);
  return body;
}

type Recorded = { status: number | null; stderr: string; calls: string[][] };

/**
 * Runs the install step in a project laid out as pnpm lays one out, with `npm` recording its arguments.
 * Each call is one line of the log: its arguments, joined by a tab.
 */
async function runInstall(withQfai: boolean): Promise<Recorded | "no-bash"> {
  const body = await runBody(INSTALL_STEP);
  const stage = await mkdtemp(path.join(os.tmpdir(), "qfai-int-docs-install-run-"));
  try {
    await mkdir(path.join(stage, "node_modules", ".pnpm"), { recursive: true });
    await writeFile(path.join(stage, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n", "utf-8");
    if (withQfai) await mkdir(path.join(stage, "node_modules", "qfai"), { recursive: true });
    const log = path.join(stage, "npm-calls.log");
    const script = path.join(stage, "step.sh");
    const prelude = `npm() { local IFS=$'\\t'; printf '%s\\n' "$*" >> "$NPM_LOG"; }\n`;
    await writeFile(script, `${prelude}${body}`, "utf-8");
    await writeFile(log, "", "utf-8");
    const child = spawnSync("bash", ["-e", "-o", "pipefail", script], {
      cwd: stage,
      encoding: "utf-8",
      env: { ...process.env, NPM_LOG: log },
    });
    if (child.error !== undefined) {
      // `bash` is absent on some Windows images; a missing interpreter says nothing about the lane.
      const error: unknown = child.error;
      const code =
        typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
      if (code === "ENOENT") return "no-bash";
      throw child.error;
    }
    const lines = (await readFile(log, "utf-8")).split(/\r?\n/).filter((line) => line !== "");
    return {
      status: child.status,
      stderr: child.stderr ?? "",
      calls: lines.map((line) => line.split("\t")),
    };
  } finally {
    await removeTempTree(stage);
  }
}

describe("the delivered document lane installs its checkers outside the project's dependency tree", () => {
  // QFAI:EX-0002-0003-07
  it.each([
    ["depends on QFAI", true],
    ["does not depend on QFAI", false],
  ])("installs into its own prefix when the project %s", async (_name, withQfai) => {
    const run = await runInstall(withQfai);
    if (run === "no-bash") return;

    expect(run.status, run.stderr).toBe(0);
    // One install, so the checkers and QFAI land together rather than the second install pruning
    // what the first one added.
    expect(run.calls).toHaveLength(1);
    const [call = []] = run.calls;
    expect(call[0]).toBe("install");
    expect(call).toContain(`--prefix=${TOOLS_DIR}`);
    expect(call).toContain("--no-save");
    expect(call).toContain("--registry=https://registry.npmjs.org/");
    const packages = call.filter((argument) => !argument.startsWith("-") && argument !== "install");
    expect(packages).toEqual([
      "@jackchuka/mdschema@0.15.4",
      "mermaid@11.17.2",
      "jsdom@29.1.1",
      ...(withQfai ? [] : ["qfai"]),
    ]);
  });

  // QFAI:EX-0002-0003-07
  it("never installs into the project's own node_modules", async () => {
    const body = await runBody(INSTALL_STEP);
    const installs = body
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith("npm install"));

    expect(installs.length).toBeGreaterThan(0);
    for (const line of installs) expect(line).toContain(`--prefix=${TOOLS_DIR}`);
  });

  // QFAI:EX-0002-0003-08
  it("tells both checkers where the tools are, from wherever the checkers run", async () => {
    const steps = await checkSteps();
    const commands = steps
      .map((step) => String(step["run"] ?? ""))
      .flatMap((body) => body.split(/\r?\n/))
      .map((line) => line.trim())
      .filter((line) => line.startsWith("node "));

    expect(commands).toEqual([
      `node node_modules/qfai/assets/scripts/check-mdschema.mjs --tools ${TOOLS_DIR} --scope all --summary`,
      `node ${TOOLS_DIR}/node_modules/qfai/assets/scripts/check-mdschema.mjs --tools ${TOOLS_DIR} --scope all --summary`,
      `node node_modules/qfai/assets/scripts/check-mermaid.mjs --tools ${TOOLS_DIR}`,
      `node ${TOOLS_DIR}/node_modules/qfai/assets/scripts/check-mermaid.mjs --tools ${TOOLS_DIR}`,
    ]);
  });
});
