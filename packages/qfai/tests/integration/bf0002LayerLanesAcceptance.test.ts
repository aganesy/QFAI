/**
 * Acceptance tests for the remaining BF-0002 test-lane criteria: the layer split inside the
 * existing workflow file, the independent release checks, the runner knobs and the layer-to-lane
 * mapping in the shipped layer rule.
 *
 * Every case reads the real artifact: the workflow files, the release classifier run as a
 * program, the runner configuration modules and the shipped rule text.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { maskFencedCodeBlocks } from "../../src/core/ids.js";
import {
  acceptsRelease,
  classify,
  classifyTag,
  currentPackage,
  currentRoot,
  manifestWith,
  operationJobs,
  operationScripts,
  releaseJobs,
  runsUnder,
  scriptKeys,
  steps,
  TAGS,
  type ReleaseNeeds,
} from "../helpers/spec0017Release.js";
import {
  isRecord,
  matrixSlices,
  runnerProjects,
  sorted,
  workflowJob,
  workflowJobs,
} from "../helpers/spec0017WorkflowSurfaces.js";
import { REPO_ROOT } from "../scripts/helpers/hygieneTree.js";

const WORKFLOWS = path.join(REPO_ROOT, ".github", "workflows");
const PACKAGE_ROOT = path.join(REPO_ROOT, "packages", "qfai");
const ASSET_ASSISTANT = path.join(PACKAGE_ROOT, "assets", "init", ".qfai", "assistant");
const ROOT_ASSISTANT = path.join(REPO_ROOT, ".qfai", "assistant");
const LAYER_RULE = path.join("rule", "test-layers.md");
const FORMER_MAP = path.join("catalog", "test-layers-ci-lanes.md");

const WORKERS_ENV = "QFAI_TEST_MAX_WORKERS";
const CONCURRENCY_ENV = "QFAI_TEST_MAX_CONCURRENCY";

const CHECKOUT_PIN = /^actions\/checkout@[0-9a-f]{40}$/u;
const SIDECAR_SETUP = "./.ci-actions/.github/actions/setup";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

function needsOf(job: Record<string, unknown>): string[] {
  const needs = job["needs"];
  if (typeof needs === "string") return [needs];
  return Array.isArray(needs) ? needs.map(String) : [];
}

function withInputs(step: Record<string, unknown> | undefined): Record<string, unknown> {
  const inputs = step?.["with"];
  return isRecord(inputs) ? inputs : {};
}

function runBody(step: Record<string, unknown> | undefined): string {
  const run = step?.["run"];
  return typeof run === "string" ? run.trim() : "";
}

describe("BF-0002 layer-separated lanes", () => {
  // QFAI:AC-0002-0017-01
  it("keeps the layer split inside ci.yml and leaves the workflow file set and the aggregate name alone", () => {
    const files = readdirSync(WORKFLOWS)
      .filter((name) => /\.ya?ml$/u.test(name))
      .sort();
    // A per-layer workflow file would create a check name nobody has configured, so a new file
    // changes this list and is read in review.
    expect(files).toEqual([
      "ci.yml",
      "prepare-release.yml",
      "release-notes-drift.yml",
      "release.yml",
      "renovate.yml",
      "tag-release.yml",
    ]);

    const verdict = workflowJob("ci.yml", "ci-pass");
    expect(typeof verdict["name"] === "string" ? verdict["name"] : "ci-pass").toBe("ci-pass");
    const declaration: unknown = JSON.parse(
      readFileSync(path.join(REPO_ROOT, ".github", "required-status-contexts.json"), "utf8"),
    );
    const contexts =
      isRecord(declaration) && Array.isArray(declaration["contexts"])
        ? declaration["contexts"]
        : [];
    expect(
      contexts.filter(isRecord).map((entry) => [entry["workflow"], entry["job"]]),
    ).toContainEqual(["ci.yml", "ci-pass"]);

    const projects = sorted(runnerProjects());
    expect(projects.length).toBeGreaterThan(1);
    for (const job of ["test", "node-floor"]) {
      expect(sorted(matrixSlices("ci.yml", job)), job).toEqual(projects);
    }

    for (const file of files.filter((name) => !["ci.yml", "release.yml"].includes(name))) {
      for (const [id, job] of Object.entries(workflowJobs(file))) {
        const strategy = job["strategy"];
        const matrix = isRecord(strategy) ? strategy["matrix"] : undefined;
        expect(isRecord(matrix) ? matrix["slice"] : undefined, `${file}#${id}`).toBeUndefined();
      }
    }
  });

  // QFAI:AC-0002-0017-03
  it("runs the release checks as independent jobs for the current tag shape and gives every other tag its complete aggregate", () => {
    const current = classify(currentRoot(), currentPackage());
    expect(current.status, current.output).toBe(0);
    expect([current.shape, current.checks]).toEqual(["sliced", "operations"]);

    const rootKeys = scriptKeys(currentRoot());
    for (const dropped of operationScripts) {
      expect(rootKeys).toContain(dropped);
      const missing = classify(
        manifestWith(rootKeys.filter((key) => key !== dropped)),
        currentPackage(),
      );
      expect(missing.status, `${dropped}: ${missing.output}`).toBe(0);
      expect([missing.shape, missing.checks], dropped).toEqual(["sliced", "aggregate"]);
    }

    const extraSlice = classify(
      currentRoot(),
      manifestWith([...scriptKeys(currentPackage()), "test:extra-slice"]),
    );
    expect([extraSlice.shape, extraSlice.checks]).toEqual(["whole", "aggregate"]);
    const whole = classify(currentRoot(), manifestWith(["test"]));
    expect([whole.shape, whole.checks]).toEqual(["whole", "aggregate"]);
    for (const tag of TAGS) {
      const tagged = classifyTag(tag);
      expect([tagged.shape, tagged.checks], tag).toEqual(["whole", "aggregate"]);
    }

    const jobs = releaseJobs();
    const scriptByJob: Array<[string, string]> = [
      ["gate-ssot", "ci:gate:ssot"],
      ["gate-lint", "ci:gate:lint"],
      ["gate-types", "ci:gate:types"],
    ];
    expect(scriptByJob.map(([id]) => id)).toEqual(operationJobs);
    for (const [id, script] of scriptByJob) {
      const job = jobs[id];
      if (job === undefined) throw new Error(`release.yml declares no ${id} job`);
      expect(needsOf(job), id).toEqual(["verify"]);
      const [checkout, sidecar, setup, ...rest] = steps(job);
      expect(checkout?.["uses"], id).toEqual(expect.stringMatching(CHECKOUT_PIN));
      expect(withInputs(checkout)["persist-credentials"], id).toBe(false);
      expect(withInputs(checkout)["ref"], id).toBe("${{ needs.verify.outputs.sha }}");
      expect(sidecar?.["uses"], id).toEqual(expect.stringMatching(CHECKOUT_PIN));
      expect(withInputs(sidecar)["path"], id).toBe(".ci-actions");
      expect(withInputs(sidecar)["ref"], id).toBe("${{ github.sha }}");
      expect(setup?.["uses"], id).toBe(SIDECAR_SETUP);
      expect(rest.map(runBody), id).toEqual([`pnpm ${script}`]);
    }

    const gate = jobs["gate"];
    if (gate === undefined) throw new Error("release.yml declares no gate job");
    expect(needsOf(gate)).toEqual(["verify"]);
    const onOperations = steps(gate)
      .filter((step) => runsUnder(step, "release.yml#gate", "sliced", "operations"))
      .map(runBody)
      .filter((body) => body !== "");
    expect(onOperations).toEqual([
      "pnpm ci:gate:build",
      "bash packages/qfai/scripts/check-no-internal-version-leakage.sh",
    ]);
    for (const [id, job] of Object.entries(jobs)) {
      if (id === "gate") continue;
      const bodies = steps(job).map(runBody).join("\n");
      expect(bodies, id).not.toContain("ci:gate:build");
      expect(bodies, id).not.toContain("check-no-internal-version-leakage");
    }

    const rootScripts: unknown = JSON.parse(currentRoot());
    const scripts =
      isRecord(rootScripts) && isRecord(rootScripts["scripts"]) ? rootScripts["scripts"] : {};
    expect(scripts["ci:gate:checks"]).toBe(
      operationScripts.map((name) => `pnpm ${name}`).join(" && "),
    );
    expect(operationScripts.map((name) => scripts[name]).join(" && ")).toBe(
      "pnpm sync:ssot && git diff --exit-code .qfai/ qfai.config.yaml packages/qfai/assets/init/.qfai/ && bash ./scripts/run-lint-checks.sh gate && pnpm check-types && node ./scripts/check-build-warnings.mjs && pnpm verify:pack",
    );

    const gates = ["gate-tests", "gate-floor", "gate-floor-whole", ...operationJobs];
    const selected = new Set(["gate-tests", "gate-floor", ...operationJobs]);
    const outputs = { "suite-shape": "sliced", "checks-shape": "operations" };
    const accepted = (): ReleaseNeeds => ({
      verify: { result: "success", outputs },
      gate: { result: "success" },
      ...Object.fromEntries(
        gates.map((name) => [name, { result: selected.has(name) ? "success" : "skipped" }]),
      ),
    });
    for (const id of ["github-release", "publish"]) {
      const condition = jobs[id]?.["if"];
      if (typeof condition !== "string") throw new Error(`${id} has no release condition`);
      expect(acceptsRelease(condition, accepted(), "push"), id).toBe(true);
      for (const required of ["gate", ...operationJobs]) {
        for (const state of [undefined, "failure", "cancelled", "skipped"]) {
          const needs = accepted();
          needs[required] = { ...needs[required], result: state };
          expect(
            acceptsRelease(condition, needs, "push"),
            `${id}: ${required} ${String(state)}`,
          ).toBe(false);
        }
      }
      for (const unknown of [undefined, "", "unknown"]) {
        const needs = accepted();
        needs["verify"] = {
          result: "success",
          outputs: { ...outputs, "checks-shape": unknown },
        };
        expect(
          acceptsRelease(condition, needs, "push"),
          `${id}: checks shape ${String(unknown)}`,
        ).toBe(false);
      }
    }
  });
});

interface RunnerConfig {
  projects: Record<string, unknown>[];
  root: Record<string, unknown>;
}

/** The runner workspace and root configuration, loaded fresh under an environment. */
async function loadRunnerConfig(env: Readonly<Record<string, string>> = {}): Promise<RunnerConfig> {
  vi.resetModules();
  for (const key of [WORKERS_ENV, CONCURRENCY_ENV]) vi.stubEnv(key, undefined);
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);

  const workspace: unknown = await import("../../vitest.workspace");
  const entries = isRecord(workspace) ? workspace["default"] : undefined;
  if (!Array.isArray(entries)) throw new Error("vitest.workspace.ts exports no project list");
  const projects = entries
    .filter(isRecord)
    .map((entry) => entry["test"])
    .filter(isRecord);

  const rootModule: unknown = await import("../../vitest.config");
  const rootDefault = isRecord(rootModule) ? rootModule["default"] : undefined;
  const root = isRecord(rootDefault) ? rootDefault["test"] : undefined;
  if (!isRecord(root)) throw new Error("vitest.config.ts exports no test block");
  return { projects, root };
}

const isPositiveInteger = (value: unknown): boolean =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

describe("BF-0002 runner parallelism knobs", () => {
  // QFAI:AC-0002-0019-01
  it("declares the knobs per project and at the root, starts both tunable axes at ten and keeps each overridable", async () => {
    const { projects, root } = await loadRunnerConfig();
    expect(projects.map((project) => project["name"]).sort()).toEqual(sorted(runnerProjects()));

    for (const project of projects) {
      const name = String(project["name"]);
      expect(typeof project["pool"] === "string" && project["pool"] !== "", `${name} pool`).toBe(
        true,
      );
      expect(typeof project["isolate"], `${name} isolate`).toBe("boolean");
      expect(isPositiveInteger(project["maxConcurrency"]), `${name} maxConcurrency`).toBe(true);
      expect(isPositiveInteger(project["hookTimeout"]), `${name} hookTimeout`).toBe(true);
      expect(project["poolOptions"], `${name} poolOptions`).toBeUndefined();
      for (const rootOnly of ["maxWorkers", "minWorkers", "fileParallelism"]) {
        expect(project[rootOnly], `${name} ${rootOnly}`).toBeUndefined();
      }
    }
    expect(isPositiveInteger(root["maxWorkers"])).toBe(true);
    expect(isPositiveInteger(root["minWorkers"])).toBe(true);
    expect(typeof root["fileParallelism"]).toBe("boolean");

    // Ten on both axes, held to the cores the machine has.
    const start = Math.min(10, availableParallelism());
    expect(root["maxWorkers"]).toBe(start);
    expect(projects.map((project) => project["maxConcurrency"])).toEqual(projects.map(() => start));

    const overridden = await loadRunnerConfig({ [WORKERS_ENV]: "3", [CONCURRENCY_ENV]: "7" });
    expect(overridden.root["maxWorkers"]).toBe(3);
    expect(overridden.projects.map((project) => project["maxConcurrency"])).toEqual(
      overridden.projects.map(() => 7),
    );
    const unusable = await loadRunnerConfig({ [WORKERS_ENV]: "0", [CONCURRENCY_ENV]: "ten" });
    expect(unusable.root["maxWorkers"]).toBe(start);
    expect(unusable.projects.map((project) => project["maxConcurrency"])).toEqual(
      unusable.projects.map(() => start),
    );
  });
});

/** The text of the `## CI lane mapping` section, fenced blocks masked and the heading excluded. */
function mappingSection(rule: string): string {
  const lines = maskFencedCodeBlocks(rule).split("\n");
  const start = lines.findIndex((line) => line === "## CI lane mapping");
  if (start === -1) throw new Error("the layer rule has no `## CI lane mapping` section");
  const end = lines.findIndex((line, index) => index > start && /^## /u.test(line));
  return lines.slice(start + 1, end === -1 ? undefined : end).join("\n");
}

/** The layer names the crosswalk table lists, read from its `| L1 | Unit | ...` rows. */
function taxonomyLayers(rule: string): string[] {
  return [...rule.matchAll(/^\|\s*L\d\s*\|\s*([^|]+?)\s*\|/gm)].map((match) => match[1] ?? "");
}

/** The layer names a section routes, read from phrases such as `Unit and Component tests`. */
function namedLayers(section: string): string[] {
  const names = new Set<string>();
  for (const match of section.matchAll(
    /\b([A-Z][A-Za-z0-9]*)(?:\s+and\s+([A-Z][A-Za-z0-9]*))?\s+tests\b/g,
  )) {
    for (const name of [match[1], match[2]]) if (name !== undefined) names.add(name);
  }
  return [...names].sort();
}

describe("BF-0002 layer-to-lane mapping in the layer rule", () => {
  const rule = readFileSync(path.join(ASSET_ASSISTANT, LAYER_RULE), "utf8");

  // QFAI:AC-0002-0021-01
  it("adds no vocabulary or annotation path to the layer rule and keeps no sibling mapping file", () => {
    const section = mappingSection(rule);
    expect(section.trim()).not.toBe("");
    expect(section).not.toMatch(/layer-[\w-]+/iu);
    expect(section).not.toMatch(/^#{1,6}\s/mu);
    expect(section).toContain("This section adds no layer token or layer heading");
    expect(section).toMatch(/does not activate\s+per-level routing/u);
    expect(section).toMatch(
      /Place test annotations only in paths scanned by\s+`validation\.traceability\.testFileGlobs`/u,
    );
    expect(section.match(/annotation/giu)).toHaveLength(1);
    expect(section.match(/`[^`\n]*\/[^`\n]*`/gu)).toBeNull();

    expect(existsSync(path.join(ASSET_ASSISTANT, FORMER_MAP))).toBe(false);
    expect(existsSync(path.join(ROOT_ASSISTANT, FORMER_MAP))).toBe(false);
    const named = (directory: string): string[] =>
      readdirSync(directory, { recursive: true, encoding: "utf8" }).filter((entry) =>
        /ci-lane/iu.test(entry),
      );
    expect(named(ASSET_ASSISTANT)).toEqual([]);
    expect(readdirSync(path.join(ROOT_ASSISTANT, "rule")).sort()).toEqual(
      readdirSync(path.join(ASSET_ASSISTANT, "rule")).sort(),
    );
  });

  // QFAI:AC-0002-0021-02
  it("names only layers the taxonomy lists", () => {
    const taxonomy = taxonomyLayers(rule);
    expect(taxonomy.sort()).toEqual(["API", "Component", "E2E", "Integration", "Unit"]);

    const named = namedLayers(mappingSection(rule));
    expect(named.length).toBeGreaterThan(0);
    expect(named.filter((name) => !taxonomy.includes(name))).toEqual([]);

    // The check can fail: a layer the taxonomy lacks is reported.
    const planted = namedLayers("Route Unit and Security tests to a fast job.");
    expect(planted.filter((name) => !taxonomy.includes(name))).toEqual(["Security"]);
  });
});
