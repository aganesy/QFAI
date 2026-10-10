import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { cp, mkdir, mkdtemp, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import { assertPackagedGithubTopology } from "../../../../scripts/lib/pack-github-topology.mjs";
import { declaredIncludeGlobs, testFileCount } from "../helpers/runnerProjects.js";
import {
  acceptsRelease,
  gatePaths,
  operationJobs,
  releaseJobs,
  type ReleaseNeeds,
} from "../helpers/spec0017Release.js";
import {
  isRecord,
  jobSteps,
  matrixSlices,
  perSliceScriptEntries,
  releaseShapeSlices,
  runnerProjects,
  SLICED_JOBS,
  sorted,
  workflowJobs,
} from "../helpers/spec0017WorkflowSurfaces.js";
import { removeTempTree } from "../helpers/tempTree.js";
import { REPO_ROOT } from "../scripts/helpers/hygieneTree.js";

const SETUP_ACTION = "./.github/actions/setup";
const FROZEN_INSTALL = "pnpm install --frozen-lockfile";

function readText(...segments: string[]): string {
  return readFileSync(path.join(REPO_ROOT, ...segments), "utf8");
}

function setupSteps(): Record<string, unknown>[] {
  const action: unknown = parseYaml(readText(".github", "actions", "setup", "action.yml"));
  const runs = isRecord(action) ? action["runs"] : undefined;
  const steps = isRecord(runs) ? runs["steps"] : undefined;
  if (!Array.isArray(steps)) throw new Error("the shared setup definition has no steps");
  return steps.filter(isRecord);
}

function runText(step: Record<string, unknown>): string {
  const run = step["run"];
  return typeof run === "string" ? run : "";
}

function stepInputs(step: Record<string, unknown> | undefined): Record<string, unknown> {
  const inputs = step?.["with"];
  return isRecord(inputs) ? inputs : {};
}

describe("BF-0002 toolchain and release acceptance", () => {
  // QFAI:AC-0002-0015-01
  it("defines the install preamble once and has every toolchain job consume it", () => {
    expect(readText(".github", "workflows", "ci.yml")).not.toContain("frozen-lockfile");

    const steps = setupSteps();
    expect(steps).toHaveLength(4);
    const [shim, node, reshim, install] = steps;
    expect(runText(shim ?? {})).toContain("corepack enable");
    expect(node?.["uses"]).toEqual(expect.stringMatching(/^actions\/setup-node@[0-9a-f]{40}$/u));
    expect(stepInputs(node)["cache"]).toBe("pnpm");
    expect(stepInputs(node)["cache-dependency-path"]).toBe("pnpm-lock.yaml");
    expect(runText(reshim ?? {})).toContain("corepack prepare --activate");
    expect(runText(install ?? {})).toContain(FROZEN_INSTALL);
    expect(steps.filter((step) => runText(step).includes(FROZEN_INSTALL))).toHaveLength(1);

    const consumers = Object.keys(workflowJobs("ci.yml")).filter((id) =>
      jobSteps("ci.yml", id).some((step) => step["uses"] === SETUP_ACTION),
    );
    expect(consumers.length).toBeGreaterThan(1);
    for (const id of consumers) {
      for (const step of jobSteps("ci.yml", id)) {
        const uses = typeof step["uses"] === "string" ? step["uses"] : "";
        expect(uses, id).not.toContain("setup-node");
        expect(runText(step), id).not.toContain("corepack enable");
        expect(runText(step), id).not.toContain("pnpm install");
      }
    }
  });

  // QFAI:AC-0002-0015-02
  it("reads the Node version from a file here and keeps the shared definition out of the shipped tree", async () => {
    const [, node] = setupSteps();
    expect(String(stepInputs(node)["node-version-file"])).toContain("package.json");
    const literal = /^\d/u;
    for (const step of setupSteps()) {
      const version = stepInputs(step)["node-version"];
      expect(typeof version === "string" && literal.test(version)).toBe(false);
    }
    for (const workflow of ["ci.yml", "release.yml"]) {
      for (const [id, job] of Object.entries(workflowJobs(workflow))) {
        const steps = Array.isArray(job["steps"]) ? job["steps"].filter(isRecord) : [];
        for (const step of steps) {
          const version = stepInputs(step)["node-version"];
          expect(typeof version === "string" && literal.test(version), `${workflow} ${id}`).toBe(
            false,
          );
        }
      }
    }
    const ci: unknown = parseYaml(readText(".github", "workflows", "ci.yml"));
    expect(isRecord(ci) ? ci["env"] : undefined).toBeUndefined();
    const release: unknown = parseYaml(readText(".github", "workflows", "release.yml"));
    const releaseEnv = isRecord(release) && isRecord(release["env"]) ? release["env"] : {};
    expect(Object.keys(releaseEnv).filter((name) => /node/iu.test(name))).toEqual(["NODE_PUBLISH"]);

    const shipped = path.join(REPO_ROOT, "packages", "qfai", "assets", "init", "root", ".github");
    const copyRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-bf0002-actions-"));
    try {
      expect(() => assertPackagedGithubTopology(shipped)).not.toThrow();
      const copy = path.join(copyRoot, ".github");
      await cp(shipped, copy, { recursive: true });
      await mkdir(path.join(copy, "actions"));
      expect(() => assertPackagedGithubTopology(copy)).toThrow(
        "assets/init/root/.github/actions must not exist (only workflows/ is permitted).",
      );
    } finally {
      await removeTempTree(copyRoot);
    }
  });

  // QFAI:AC-0002-0016-04
  it("skips the report upload on cancellation, tolerates a missing report and keeps it at most a week", () => {
    const uploads = Object.keys(workflowJobs("ci.yml")).flatMap((id) =>
      jobSteps("ci.yml", id).filter(
        (step) =>
          typeof step["uses"] === "string" && step["uses"].startsWith("actions/upload-artifact@"),
      ),
    );
    expect(uploads.length).toBeGreaterThan(0);
    for (const upload of uploads) {
      const condition = String(upload["if"]);
      expect(condition).toContain("!cancelled()");
      expect(condition).not.toContain("always()");
      const inputs = stepInputs(upload);
      expect(inputs["if-no-files-found"]).toBe("warn");
      const retention = inputs["retention-days"];
      expect(typeof retention === "number" && retention <= 7).toBe(true);
    }
  });

  // QFAI:AC-0002-0017-02
  it("refuses publication unless verify, the gate and every gate of the selected shape succeeded", () => {
    const conditionOf = (id: string): string => {
      const condition = releaseJobs()[id]?.["if"];
      if (typeof condition !== "string") throw new Error(`${id} has no release condition`);
      return condition;
    };
    const githubRelease = conditionOf("github-release");
    const publish = conditionOf("publish");
    const gates = ["gate-tests", "gate-floor", "gate-floor-whole", ...operationJobs] as const;

    for (const { shape, checks } of gatePaths) {
      const selected = new Set<string>([
        shape === "sliced" ? "gate-tests" : "gate-floor-whole",
        ...(shape === "sliced" ? ["gate-floor"] : []),
        ...(checks === "operations" ? operationJobs : []),
      ]);
      const outputs = { "suite-shape": shape, "checks-shape": checks };
      const accepted = (): ReleaseNeeds => ({
        verify: { result: "success", outputs },
        gate: { result: "success" },
        ...Object.fromEntries(
          gates.map((name) => [name, { result: selected.has(name) ? "success" : "skipped" }]),
        ),
      });

      for (const condition of [githubRelease, publish]) {
        expect(acceptsRelease(condition, accepted(), "push"), `${shape}/${checks}`).toBe(true);
        for (const required of ["verify", "gate", ...selected]) {
          for (const state of [undefined, "failure", "cancelled", "skipped"]) {
            const needs = accepted();
            needs[required] = {
              ...needs[required],
              result: state,
            };
            expect(
              acceptsRelease(condition, needs, "push"),
              `${shape}/${checks}: ${required} ${String(state)}`,
            ).toBe(false);
          }
        }
        expect(acceptsRelease(condition, accepted(), "push", true), "cancelled run").toBe(false);
        for (const unknown of ["", "unknown"]) {
          const needs = accepted();
          needs["verify"] = { result: "success", outputs: { ...outputs, "suite-shape": unknown } };
          expect(acceptsRelease(condition, needs, "push"), `suite shape ${unknown}`).toBe(false);
        }
      }

      // The GitHub Release is push-only; npm publication also accepts a manual dispatch.
      expect(acceptsRelease(githubRelease, accepted(), "workflow_dispatch")).toBe(false);
      expect(acceptsRelease(publish, accepted(), "workflow_dispatch")).toBe(true);
    }
  });

  // QFAI:AC-0002-0019-02
  it("resolves one slice name on every surface, matches files for every project and has no pr-fix or pr-merge leg", () => {
    const projects = sorted(runnerProjects());
    expect(projects).toHaveLength(7);
    expect(sorted(perSliceScriptEntries().map((entry) => entry.slice))).toEqual(projects);
    expect(sorted(releaseShapeSlices())).toEqual(projects);
    for (const { workflow, job } of SLICED_JOBS) {
      expect(sorted(matrixSlices(workflow, job)), `${workflow}#${job}`).toEqual(projects);
    }

    const globs = declaredIncludeGlobs();
    for (const project of projects) {
      const matched = globs
        .filter((entry) => entry.project === project)
        .reduce((total, entry) => total + testFileCount(entry.glob), 0);
      expect(matched, `project ${project} matches no test file`).toBeGreaterThan(0);
    }

    const manifest: unknown = JSON.parse(readText("packages", "qfai", "package.json"));
    const scripts = isRecord(manifest) && isRecord(manifest["scripts"]) ? manifest["scripts"] : {};
    const surfaces = [
      ...projects,
      ...Object.keys(scripts),
      ...SLICED_JOBS.flatMap(({ workflow, job }) => matrixSlices(workflow, job)),
      ...releaseShapeSlices(),
    ];
    expect(surfaces.filter((name) => /\bpr-(?:fix|merge)\b/u.test(name))).toEqual([]);
  });
});

function namedDiagnosticProgram(marker: string): string {
  const job = workflowJobs("named-tests.yml")["named-test"];
  const steps = job?.["steps"];
  if (!Array.isArray(steps)) throw new Error("named diagnostic steps are absent");
  const programs = steps
    .filter(isRecord)
    .map((step) => step["run"])
    .filter((run): run is string => typeof run === "string" && run.includes(`<<'${marker}'`));
  const [run] = programs;
  if (programs.length !== 1 || run === undefined)
    throw new Error("expected one quoted runner body");
  const delimiter = `<<'${marker}'\n`;
  const begin = run.indexOf(delimiter) + delimiter.length;
  const end = run.indexOf(`\n${marker}`, begin);
  if (begin < delimiter.length || end < begin) throw new Error("missing ordered runner delimiters");
  return run.slice(begin, end) + "\n";
}

describe("the optional named diagnostic acceptance", () => {
  // QFAI:AC-0002-0026-01
  it("requires an explicit PR identity with read-only permissions and no test credentials", () => {
    const workflow: unknown = parseYaml(readText(".github", "workflows", "named-tests.yml"));
    if (!isRecord(workflow)) throw new Error("named diagnostic is not a mapping");
    expect(workflow["permissions"]).toEqual({ contents: "read" });
    const triggers = workflow["on"];
    expect(isRecord(triggers) ? Object.keys(triggers) : []).toEqual(["workflow_dispatch"]);
    const dispatch = isRecord(triggers) ? triggers["workflow_dispatch"] : undefined;
    const inputs = isRecord(dispatch) ? dispatch["inputs"] : undefined;
    if (!isRecord(inputs)) throw new Error("named diagnostic inputs are absent");
    expect(Object.keys(inputs)).toEqual(["pr", "sha", "project", "file"]);
    for (const input of Object.values(inputs)) {
      expect(isRecord(input) ? input["required"] : undefined).toBe(true);
      expect(isRecord(input) ? input["default"] : undefined).toBeUndefined();
    }
    const job = workflowJobs("named-tests.yml")["named-test"];
    expect(job?.["timeout-minutes"]).toBe(20);
    const text = readText(".github", "workflows", "named-tests.yml");
    expect(text).not.toContain("secrets.");
    expect(text).not.toContain("GITHUB_TOKEN");
    for (const step of jobSteps("named-tests.yml", "named-test")) {
      expect(runText(step)).not.toMatch(/\$\{\{\s*inputs\./u);
      if (String(step["uses"]).startsWith("actions/checkout@")) {
        expect(step["uses"]).toMatch(/^actions\/checkout@[a-f0-9]{40}$/u);
        expect(stepInputs(step)["persist-credentials"]).toBe(false);
        expect(stepInputs(step)["ref"]).toBe("${{ inputs.sha }}");
      }
    }
  });

  // QFAI:AC-0002-0026-02 QFAI:AC-0002-0026-03
  // QFAI:EX-0002-0026-12
  it("checks current project includes before the shared setup and uses normal failure gating", () => {
    const steps = jobSteps("named-tests.yml", "named-test");
    const preflight = steps.findIndex((step) => runText(step).includes("<<'PREFLIGHT'"));
    const setup = steps.findIndex((step) => step["uses"] === "./.ci-actions/.github/actions/setup");
    const build = steps.findIndex((step) => runText(step) === "pnpm -C packages/qfai build");
    const run = steps.findIndex((step) => runText(step).includes("<<'RUNNER'"));
    expect(preflight).toBeGreaterThan(-1);
    expect(setup).toBeGreaterThan(preflight);
    expect(build).toBeGreaterThan(setup);
    expect(run).toBeGreaterThan(build);
    expect(stepInputs(steps[setup])).toEqual({
      "engines-manifest": "./packages/qfai/package.json",
      "pin-engines-floor": "true",
    });
    expect(steps[build]?.["if"]).toBe("inputs.project == 'e2e' || inputs.project == 'integration'");
    expect(steps[run]?.["if"]).toBeUndefined();
    for (const step of steps) expect(step["continue-on-error"]).toBeUndefined();
    expect(runText(steps[run] ?? {})).toContain('node "${RUNNER_TEMP}/named-preflight.mjs"');
    const program = namedDiagnosticProgram("PREFLIGHT");
    expect(program).toContain('readFileSync("packages/qfai/vitest.workspace.ts"');
    expect(program).toContain('git("ls-tree", "HEAD", "--", file)');
    expect(program).toContain("committed.equals(readFileSync(target))");
    expect(sorted(runnerProjects())).toHaveLength(7);
    for (const entry of declaredIncludeGlobs()) {
      expect(entry.glob).toMatch(/^tests\/[a-z]+\/\*\*\/\*\.test\.ts$/u);
    }
    expect(setupSteps().some((step) => runText(step).includes(FROZEN_INSTALL))).toBe(true);
  });

  // QFAI:AC-0002-0026-05
  // QFAI:EX-0002-0026-14
  it("keeps all regular CI slices and its aggregate independent of diagnostic results", () => {
    const projects = sorted(runnerProjects());
    expect(sorted(matrixSlices("ci.yml", "test"))).toEqual(projects);
    expect(sorted(matrixSlices("ci.yml", "node-floor"))).toEqual(projects);
    const ci = workflowJobs("ci.yml");
    const aggregate = ci["ci-pass"];
    const needs = aggregate?.["needs"];
    expect(Array.isArray(needs) ? needs : []).toContain("test");
    expect(Array.isArray(needs) ? needs : []).toContain("node-floor");
    expect(Array.isArray(needs) ? needs : []).not.toContain("named-test");
    expect(readText(".github", "workflows", "ci.yml")).not.toContain("named-test");
    expect(readText(".github", "required-status-contexts.json")).not.toContain(
      "Named test diagnostic",
    );
    const diagnostic = workflowJobs("named-tests.yml");
    expect(Object.keys(diagnostic)).toEqual(["named-test"]);
    expect(diagnostic["named-test"]?.["needs"]).toBeUndefined();
    expect(diagnostic["ci-pass"]).toBeUndefined();
  });

  // QFAI:AC-0002-0026-02 QFAI:AC-0002-0026-03 QFAI:AC-0002-0026-04
  // QFAI:EX-0002-0026-01 QFAI:EX-0002-0026-10 QFAI:EX-0002-0026-11 QFAI:EX-0002-0026-13
  it.each([
    ["exact", 0, "Named diagnostic completed: 1 passed"],
    ["excluded", 1, "exactly the requested file"],
    ["collision", 1, "exactly the requested file"],
    ["empty", 1, "Vitest test run failed"],
    ["skipped", 1, "at least one executed test"],
    ["failure", 1, "Vitest test run failed"],
    ["timeout", 1, "Vitest test run failed"],
    ["remote moved", 1, "changed before execution"],
    ["checkout moved", 1, "changed before execution"],
    ["remote unavailable", 1, "changed before execution"],
    ["file changed during selection", 1, "differs from its pull request head"],
    ["file changed after setup", 1, "differs from its pull request head"],
  ] as const)("%s selection reports its real execution result", async (kind, status, message) => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-named-real-runner-"));
    try {
      const packageRoot = path.join(root, "packages", "qfai");
      const directory = path.join(packageRoot, "tests", "core");
      await mkdir(directory, { recursive: true });
      await symlink(
        path.join(REPO_ROOT, "packages", "qfai", "node_modules"),
        path.join(packageRoot, "node_modules"),
        "junction",
      );
      await writeFile(
        path.join(packageRoot, "vitest.workspace.ts"),
        readText("packages", "qfai", "vitest.workspace.ts"),
      );
      const target = path.join(directory, "one.test.ts");
      const changesDuringSelection = [
        "remote moved",
        "checkout moved",
        "remote unavailable",
        "file changed during selection",
      ].includes(kind);
      const code =
        kind === "empty"
          ? "export const marker = true;\n"
          : kind === "timeout"
            ? 'import { it } from "vitest";\nit("timeout", async () => { await new Promise((resolve) => setTimeout(resolve, 50)); }, 1);\n'
            : changesDuringSelection || kind === "file changed after setup"
              ? 'import { it } from "vitest";\nit("blocked", () => { throw new Error("SELECTED_TEST_EXECUTED"); });\n'
              : `import { expect, it } from "vitest";\nit${kind === "skipped" ? ".skip" : ""}("named behavior", () => { expect(${kind === "failure" ? "false" : "true"}).toBe(true); });\n`;
      await writeFile(target, code);
      await writeFile(
        path.join(directory, kind === "collision" ? "one.test.ts-copy.test.ts" : "other.test.ts"),
        'import { it } from "vitest";\nit("unselected", () => { throw new Error("UNSELECTED_TEST_EXECUTED"); });\n',
      );
      const include =
        kind === "excluded" ? "tests/core/missing.test.ts" : "tests/core/**/*.test.ts";
      const mutation =
        kind === "remote moved"
          ? 'git("commit", "--allow-empty", "-m", "Advanced remote"); git("push", "origin", "HEAD:refs/pull/37/head"); git("checkout", process.env.EXPECTED_SHA);'
          : kind === "checkout moved"
            ? 'git("commit", "--allow-empty", "-m", "Advanced checkout");'
            : kind === "remote unavailable"
              ? 'git("remote", "remove", "origin");'
              : kind === "file changed during selection"
                ? 'writeFileSync(path.join(process.env.RUNNER_TEMP, process.env.TEST_FILE), "export const changed = true;\\n");'
                : "";
      const configPreamble =
        mutation === ""
          ? ""
          : `import { execFileSync } from "node:child_process";\nimport { writeFileSync } from "node:fs";\nimport path from "node:path";\nif (process.argv.includes("list")) { const git = (...args) => execFileSync("git", args, { stdio: "pipe" }); ${mutation} }\n`;
      await writeFile(
        path.join(packageRoot, "vitest.config.mjs"),
        `${configPreamble}export default { test: { maxWorkers: 1, fileParallelism: false, projects: [{ test: { name: "core", include: [${JSON.stringify(include)}] } }] } };\n`,
      );
      const git = (...args: string[]): string =>
        execFileSync("git", args, {
          cwd: root,
          encoding: "utf-8",
          stdio: ["ignore", "pipe", "pipe"],
        }).trim();
      git("init", "-b", "main");
      git("config", "user.email", "fixture@example.invalid");
      git("config", "user.name", "Named runner fixture");
      git("config", "core.autocrlf", "false");
      git(
        "add",
        "packages/qfai/tests",
        "packages/qfai/vitest.config.mjs",
        "packages/qfai/vitest.workspace.ts",
      );
      git("commit", "-m", "Runner fixture");
      const head = git("rev-parse", "HEAD");
      const origin = path.join(root, "origin.git");
      git("init", "--bare", origin);
      git("remote", "add", "origin", origin);
      git("push", "origin", "HEAD:refs/pull/37/head");
      const program = path.join(root, "runner.mjs");
      const preflight = path.join(root, "named-preflight.mjs");
      await writeFile(program, namedDiagnosticProgram("RUNNER"));
      await writeFile(preflight, namedDiagnosticProgram("PREFLIGHT"));
      const options = {
        cwd: root,
        encoding: "utf-8" as const,
        timeout: 60_000,
        env: {
          ...process.env,
          PR_NUMBER: "37",
          EXPECTED_SHA: head,
          TEST_PROJECT: "core",
          TEST_FILE: "packages/qfai/tests/core/one.test.ts",
          RUNNER_TEMP: root,
        },
      };
      const initial = spawnSync(process.execPath, [preflight], options);
      expect(initial.status, initial.stdout + initial.stderr).toBe(0);
      expect(initial.stdout).toContain(head);
      if (kind === "file changed after setup") {
        await writeFile(target, code + "// Build changed this tracked file.\n");
        expect(git("rev-parse", "HEAD")).toBe(head);
      }
      const result = spawnSync(
        process.execPath,
        [kind === "file changed after setup" ? preflight : program],
        options,
      );
      const output = result.stdout + result.stderr;
      expect(result.status, output).toBe(status);
      expect(output).toContain(message);
      expect(output).not.toContain("UNSELECTED_TEST_EXECUTED");
      expect(output).not.toContain("SELECTED_TEST_EXECUTED");
      if (status !== 0) expect(output).not.toContain("Named diagnostic completed:");
      if (kind === "file changed during selection") expect(git("rev-parse", "HEAD")).toBe(head);
    } finally {
      await removeTempTree(root);
    }
  });
});
