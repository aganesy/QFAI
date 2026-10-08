import { readFileSync } from "node:fs";
import { cp, mkdir, mkdtemp } from "node:fs/promises";
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
