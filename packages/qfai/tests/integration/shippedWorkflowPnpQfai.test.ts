/**
 * Integration: under Yarn Plug'n'Play the delivered validation and document lanes run the QFAI the
 * project depends on (spec-0002)
 *
 * Plug'n'Play writes no `node_modules`, so `npx qfai` and a check for `node_modules/qfai` both
 * found nothing in a PnP project and fell back to the newest QFAI from the registry. Both lanes now
 * ask Yarn which version the project resolves and install that one.
 *
 * Every assertion reads the tree `runInit` writes into a temporary directory. Each step runs under
 * bash in a project laid out the way Yarn Plug'n'Play lays one out: a `package.json` and a
 * `.pnp.cjs`, with no `node_modules`. `yarn node` is replaced by the real `node` with `NODE_PATH`
 * pointing at a staged copy of the package, which stands in for the Plug'n'Play resolver, and
 * `npm`, `npx` and the validator's own entry record their arguments instead of running.
 */
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterAll, describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import { runInit } from "../helpers/legacyInit.js";
import { collectJobSteps, findWorkflowJob } from "../helpers/shippedWorkflowFixtures.js";
import { captureStdout } from "../helpers/stdout.js";
import { removeTempTree } from "../helpers/tempTree.js";

/** Bash is absent on some Windows images; the cases that execute a step are skipped there. */
const HAS_BASH = spawnSync("bash", ["--version"], { encoding: "utf-8" }).error === undefined;

/** The version the staged Plug'n'Play resolver answers with. Not this package's own. */
const RESOLVED = "4.5.6";
const VALIDATE_COPY = "tmp/qfai-validate";
const VALIDATE_ENTRY = `${VALIDATE_COPY}/node_modules/qfai/dist/cli/index.mjs`;

let initPromise: Promise<string> | undefined;

/** The initialised project, built once for the whole file. */
function initialised(): Promise<string> {
  initPromise ??= (async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-int-pnp-"));
    await captureStdout(() => runInit({ dir, force: false, dryRun: false, yes: true }));
    return dir;
  })();
  return initPromise;
}

afterAll(async () => {
  if (initPromise === undefined) return;
  await removeTempTree(await initPromise);
});

async function stepBody(file: string, jobId: string, name: string): Promise<string> {
  const text = await readFile(
    path.join(await initialised(), ".github", "workflows", file),
    "utf-8",
  );
  const job = findWorkflowJob(parseYaml(text), jobId);
  if (job === undefined) throw new Error(`${file} has no ${jobId} job`);
  const body = collectJobSteps(job).find((step) => step["name"] === name)?.["run"];
  if (typeof body !== "string") throw new Error(`${file} has no run step named ${name}`);
  return body;
}

interface Project {
  /** What the project's `package.json` declares for qfai, or `undefined` for no declaration. */
  readonly declares?: string | undefined;
  /** The version the staged resolver answers with, or `undefined` when it resolves nothing. */
  readonly resolves?: string | undefined;
}

interface Run {
  readonly status: number | null;
  readonly stderr: string;
  /** One entry per recorded call: the program, then its arguments. */
  readonly calls: string[][];
  readonly output: string;
}

/** Runs one step body in a Plug'n'Play project, with `env` added to the step's environment. */
async function runStep(
  body: string,
  project: Project,
  env: Record<string, string> = {},
): Promise<Run> {
  const stage = await mkdtemp(path.join(os.tmpdir(), "qfai-int-pnp-run-"));
  try {
    const work = path.join(stage, "project");
    const resolver = path.join(stage, "pnp");
    await mkdir(work, { recursive: true });
    await mkdir(resolver, { recursive: true });
    const manifest =
      project.declares === undefined
        ? { name: "adopter" }
        : { name: "adopter", devDependencies: { qfai: project.declares } };
    await writeFile(path.join(work, "package.json"), JSON.stringify(manifest), "utf-8");
    await writeFile(path.join(work, ".pnp.cjs"), "// staged\n", "utf-8");
    if (project.resolves !== undefined) {
      // The published package exports `.` only, so a payload that asked for
      // `qfai/package.json` would fail here the way it fails on the real one.
      const qfai = path.join(resolver, "qfai");
      await mkdir(path.join(qfai, "dist"), { recursive: true });
      const own = {
        name: "qfai",
        version: project.resolves,
        exports: { ".": { require: "./dist/index.cjs" } },
      };
      await writeFile(path.join(qfai, "package.json"), JSON.stringify(own), "utf-8");
      await writeFile(path.join(qfai, "dist", "index.cjs"), "module.exports = {};\n", "utf-8");
    }
    const log = path.join(stage, "calls.log");
    const output = path.join(stage, "github-output");
    await writeFile(log, "", "utf-8");
    await writeFile(output, "", "utf-8");
    const prelude = [
      `record() { local IFS=$'\\t'; printf '%s\\n' "$*" >> "$CALL_LOG"; }`,
      `npm() { record npm "$@"; }`,
      `npx() { record npx "$@"; }`,
      // The validator's own entry is recorded; any other `node` is the real one.
      `node() { if [ "$1" = "${VALIDATE_ENTRY}" ]; then record node "$@"; else command node "$@"; fi; }`,
      `yarn() { if [ "$1" = node ]; then shift; NODE_PATH="$PNP_RESOLVER" command node "$@"; else record yarn "$@"; fi; }`,
      "",
    ].join("\n");
    const script = path.join(stage, "step.sh");
    await writeFile(script, `${prelude}${body}`, "utf-8");
    const child = spawnSync("bash", ["-e", "-o", "pipefail", script], {
      cwd: work,
      encoding: "utf-8",
      env: {
        ...process.env,
        ...env,
        CALL_LOG: log,
        GITHUB_OUTPUT: output,
        PNP_RESOLVER: project.resolves === undefined ? path.join(stage, "empty") : resolver,
      },
    });
    if (child.error !== undefined) throw child.error;
    const lines = (await readFile(log, "utf-8")).split(/\r?\n/).filter((line) => line !== "");
    return {
      status: child.status,
      stderr: child.stderr ?? "",
      calls: lines.map((line) => line.split("\t")),
      output: await readFile(output, "utf-8"),
    };
  } finally {
    await removeTempTree(stage);
  }
}

/** The bare arguments of one recorded `npm install`, which name the packages it installs. */
function packagesOf(call: readonly string[]): string[] {
  return call.slice(2).filter((argument) => !argument.startsWith("-"));
}

// QFAI:AC-0002-0006-03
describe("the delivered validation lane runs the QFAI a Yarn Plug'n'Play project depends on", () => {
  const RESOLVE = "Resolve the QFAI a Yarn Plug'n'Play project depends on";
  const resolveBody = () => stepBody("qfai-validate.yml", "validate", RESOLVE);

  // QFAI:EX-0002-0006-04
  it.skipIf(!HAS_BASH)(
    "installs the version Yarn resolves under the checkout and hands it on",
    async () => {
      const run = await runStep(await resolveBody(), { declares: "^4.5.0", resolves: RESOLVED });

      expect(run.status, run.stderr).toBe(0);
      expect(run.calls).toHaveLength(1);
      const [call = []] = run.calls;
      expect(call.slice(0, 2)).toEqual(["npm", "install"]);
      expect(call).toContain(`--prefix=${VALIDATE_COPY}`);
      expect(call).toContain("--no-save");
      expect(call).toContain("--registry=https://registry.npmjs.org/");
      expect(call).toContain("--ignore-scripts");
      expect(call).toContain("--include=optional");
      expect(packagesOf(call)).toEqual([`qfai@${RESOLVED}`]);
      expect(run.output).toBe(`version=${RESOLVED}\n`);
    },
  );

  // QFAI:EX-0002-0006-04
  it.skipIf(!HAS_BASH)("installs nothing for a project that does not declare QFAI", async () => {
    const run = await runStep(await resolveBody(), {});

    expect(run.status, run.stderr).toBe(0);
    expect(run.calls).toEqual([]);
    expect(run.output).toBe("");
  });

  // QFAI:EX-0002-0006-04
  it.skipIf(!HAS_BASH).each([
    ["Yarn resolves no QFAI", undefined],
    ["the resolved version is followed by an argument", `${RESOLVED} left-pad`],
    ["the resolved version is a range", "^4.5.6"],
  ])("stops before installing when the project declares QFAI and %s", async (_name, resolves) => {
    const run = await runStep(await resolveBody(), { declares: "^4.5.0", resolves });

    expect(run.status).not.toBe(0);
    expect(run.calls).toEqual([]);
    expect(run.output).toBe("");
  });

  // QFAI:EX-0002-0006-04
  it.skipIf(!HAS_BASH).each([
    ["qfai validate", "full"],
    ["qfai validate (drift protocol)", "drift"],
  ])("runs %s with the installed copy, and through npx without one", async (name, profile) => {
    const body = await stepBody("qfai-validate.yml", "validate", name);
    const args = ["validate", "--profile", profile, "--fail-on", "error"];

    const pinned = await runStep(body, {}, { QFAI_VERSION: RESOLVED });
    expect(pinned.status, pinned.stderr).toBe(0);
    expect(pinned.calls).toEqual([["node", VALIDATE_ENTRY, ...args]]);

    const unpinned = await runStep(body, {}, { QFAI_VERSION: "" });
    expect(unpinned.status, unpinned.stderr).toBe(0);
    expect(unpinned.calls).toEqual([["npx", "qfai", ...args]]);
  });
});

// QFAI:AC-0002-0006-03
describe("the delivered document lane installs the QFAI a Yarn Plug'n'Play project depends on", () => {
  const INSTALL = "Install the document-shape and diagram checkers";
  const installBody = () => stepBody("qfai-docs.yml", "checks", INSTALL);

  // QFAI:EX-0002-0006-05
  it.skipIf(!HAS_BASH).each([
    ["declares QFAI", { declares: "^4.5.0", resolves: RESOLVED }, `qfai@${RESOLVED}`],
    ["does not declare QFAI", {}, "qfai"],
  ])(
    "installs the checkers with the right QFAI when the project %s",
    async (_name, project, qfai) => {
      const run = await runStep(await installBody(), project);

      expect(run.status, run.stderr).toBe(0);
      expect(run.calls).toHaveLength(1);
      const [call = []] = run.calls;
      expect(call.slice(0, 2)).toEqual(["npm", "install"]);
      expect(call).toContain("--prefix=tmp/qfai-docs-tools");
      expect(packagesOf(call)).toEqual(["mermaid@11.17.2", "jsdom@29.1.1", qfai]);
    },
  );

  // QFAI:EX-0002-0006-05
  it.skipIf(!HAS_BASH)(
    "stops before installing when Yarn cannot resolve the declared QFAI",
    async () => {
      const run = await runStep(await installBody(), { declares: "^4.5.0" });

      expect(run.status).not.toBe(0);
      expect(run.calls).toEqual([]);
    },
  );
});
