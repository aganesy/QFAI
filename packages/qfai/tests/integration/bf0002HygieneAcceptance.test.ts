import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import { removeTempTree } from "../helpers/tempTree.js";
import {
  editWorkflow,
  isRecord,
  plantedTree,
  REPO_ROOT,
  runLane,
} from "../scripts/helpers/hygieneTree.js";

const WORKFLOWS_DIR = path.join(REPO_ROOT, ".github", "workflows");
const ACTIONS_DIR = path.join(REPO_ROOT, ".github", "actions");
const PACKAGE_ROOT = path.join(REPO_ROOT, "packages", "qfai");

type OwnJob = { id: string; workflow: Record<string, unknown>; job: Record<string, unknown> };
type OwnStep = { where: string; step: Record<string, unknown> };

function readYaml(file: string): Record<string, unknown> {
  const document: unknown = parseYaml(readFileSync(file, "utf8"));
  if (!isRecord(document)) throw new Error(`${file} did not parse to a mapping`);
  return document;
}

function workflowFiles(): string[] {
  return readdirSync(WORKFLOWS_DIR).filter((name) => /\.ya?ml$/u.test(name));
}

function ownJobs(): OwnJob[] {
  return workflowFiles().flatMap((file) => {
    const workflow = readYaml(path.join(WORKFLOWS_DIR, file));
    const jobs = workflow["jobs"];
    if (!isRecord(jobs)) throw new Error(`${file} declares no jobs`);
    return Object.entries(jobs).map(([key, job]) => {
      if (!isRecord(job)) throw new Error(`${file} job ${key} is not a mapping`);
      return { id: `${file}::${key}`, workflow, job };
    });
  });
}

function compositeActionFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return compositeActionFiles(entryPath);
    return /^action\.ya?ml$/u.test(entry.name) ? [entryPath] : [];
  });
}

function stepsOf(container: unknown): Record<string, unknown>[] {
  if (!isRecord(container) || !Array.isArray(container["steps"])) return [];
  return container["steps"].filter(isRecord);
}

/** Every step of every own workflow job and every local composite action. */
function ownSteps(): OwnStep[] {
  const fromJobs = ownJobs().flatMap(({ id, job }) =>
    stepsOf(job).map((step) => ({ where: id, step })),
  );
  const fromActions = compositeActionFiles(ACTIONS_DIR).flatMap((file) => {
    const runs = readYaml(file)["runs"];
    return stepsOf(runs).map((step) => ({
      where: path.relative(REPO_ROOT, file).replace(/\\/gu, "/"),
      step,
    }));
  });
  return [...fromJobs, ...fromActions];
}

function replaceOnce(input: string, needle: string, replacement: string): string {
  if (!input.includes(needle)) throw new Error(`fixture target disappeared: ${needle}`);
  return input.replace(needle, replacement);
}

/** Flips `fail-fast` inside exactly one job's block of ci.yml. */
function enableFailFast(dir: string, job: string): void {
  editWorkflow(dir, "ci.yml", (text) => {
    const jobs = text.indexOf("\njobs:\n");
    const start = jobs < 0 ? -1 : text.indexOf(`\n  ${job}:\n`, jobs);
    if (start < 0) throw new Error(`ci.yml declares no ${job} job`);
    const from = start + `\n  ${job}:`.length;
    const next = /\n {2}[A-Za-z_][\w-]*:/u.exec(text.slice(from));
    const end = next === null ? text.length : from + next.index;
    const block = text.slice(start, end);
    const broken = block.replace("fail-fast: false", "fail-fast: true");
    if (broken === block) throw new Error(`${job} disables no fail-fast`);
    return `${text.slice(0, start)}${broken}${text.slice(end)}`;
  });
}

describe("BF-0002 workflow hygiene acceptance", () => {
  // QFAI:AC-0002-0014-01
  it("reaches a permission block from every own job and accepts the two documented forms", async () => {
    const jobs = ownJobs();
    expect(jobs.length).toBeGreaterThan(0);
    const unreachable = jobs
      .filter(({ job, workflow }) => !("permissions" in job) && !("permissions" in workflow))
      .map(({ id }) => id);
    expect(unreachable).toEqual([]);

    const verdict = jobs.find(({ id }) => id === "ci.yml::ci-pass");
    expect(verdict?.job["permissions"]).toEqual({});
    const publishing = jobs.find(({ id }) => id === "release.yml::publish");
    const granted = publishing?.job["permissions"];
    expect(isRecord(granted) ? granted["id-token"] : undefined).toBe("write");

    const root = plantedTree(() => {});
    try {
      const result = runLane(root);
      expect(result.exitCode, result.output).toBe(0);
    } finally {
      await removeTempTree(root);
    }
  });

  // QFAI:AC-0002-0014-02
  it("names the workflow and job when both permission blocks go, and accepts either block alone", async () => {
    const both = plantedTree((dir) => {
      editWorkflow(dir, "ci.yml", (text) =>
        replaceOnce(
          replaceOnce(text, "permissions:\n  contents: read\n", ""),
          "    permissions: {}\n",
          "",
        ),
      );
    });
    const workflowOnly = plantedTree((dir) => {
      editWorkflow(dir, "ci.yml", (text) => replaceOnce(text, "    permissions: {}\n", ""));
    });
    const jobOnly = plantedTree((dir) => {
      editWorkflow(dir, "ci.yml", (text) =>
        replaceOnce(text, "permissions:\n  contents: read\n", ""),
      );
    });
    try {
      const removed = runLane(both);
      expect(removed.exitCode, removed.output).toBe(1);
      expect(removed.output).toContain("ci.yml");
      expect(removed.output).toContain("ci-pass");

      const inherited = runLane(workflowOnly);
      expect(inherited.exitCode, inherited.output).toBe(0);

      // The job-level block alone leaves the other jobs of the file unreachable, which the
      // lane rightly reports. What it must not do is blame the job that declares its own.
      const declared = runLane(jobOnly);
      expect(declared.output).not.toContain("ci-pass");
    } finally {
      await Promise.all([both, workflowOnly, jobOnly].map((root) => removeTempTree(root)));
    }
  });

  // QFAI:AC-0002-0014-03
  it("refuses to persist the checkout token on any step and keeps full history a per-job request", async () => {
    const checkouts = ownSteps().filter(
      ({ step }) =>
        typeof step["uses"] === "string" && step["uses"].startsWith("actions/checkout@"),
    );
    expect(checkouts.length).toBeGreaterThan(0);
    const persisting = checkouts.filter(({ step }) => {
      const inputs = step["with"];
      return !isRecord(inputs) || inputs["persist-credentials"] !== false;
    });
    expect(persisting.map(({ where }) => where)).toEqual([]);

    const fullHistory = checkouts.filter(({ step }) => {
      const inputs = step["with"];
      return isRecord(inputs) && inputs["fetch-depth"] === 0;
    });
    expect(fullHistory.length).toBeGreaterThan(0);
    expect(fullHistory.length).toBeLessThan(checkouts.length);
    for (const { workflow } of ownJobs()) {
      expect(JSON.stringify(workflow["env"] ?? {})).not.toContain("fetch-depth");
      expect(JSON.stringify(workflow["defaults"] ?? {})).not.toContain("fetch-depth");
    }

    const root = plantedTree((dir) => {
      editWorkflow(dir, "ci.yml", (text) =>
        text.replace(/ {2}check-types:[\s\S]*?\n {10}persist-credentials: false\n/u, (block) =>
          block.replace(/\n {10}persist-credentials: false\n/u, "\n"),
        ),
      );
    });
    try {
      const result = runLane(root);
      expect(result.exitCode, result.output).toBe(1);
      expect(result.output).toContain("ci.yml");
      expect(result.output).toContain("check-types");
    } finally {
      await removeTempTree(root);
    }
  });

  // QFAI:AC-0002-0014-04
  it("accepts only full commit pins, tolerates a version trailer, and names a planted floating reference", async () => {
    const references = ownSteps().flatMap(({ step }) =>
      typeof step["uses"] === "string" && !step["uses"].startsWith("./") ? [step["uses"]] : [],
    );
    expect(references.length).toBeGreaterThan(0);
    const floating = references.filter((reference) => !/@[0-9a-f]{40}$/u.test(reference));
    expect(floating).toEqual([]);

    const workflow = readFileSync(path.join(WORKFLOWS_DIR, "ci.yml"), "utf8");
    expect(workflow).toMatch(/uses: actions\/checkout@[0-9a-f]{40} # v\d/u);

    const clean = plantedTree(() => {});
    const planted = plantedTree((dir) => {
      editWorkflow(dir, "ci.yml", (text) =>
        text.replace(/uses: actions\/upload-artifact@[0-9a-f]{40}[^\n]*/u, (match) =>
          match.replace(/@[0-9a-f]{40}[^\n]*/u, "@main"),
        ),
      );
    });
    try {
      const accepted = runLane(clean);
      expect(accepted.exitCode, accepted.output).toBe(0);
      const refused = runLane(planted);
      expect(refused.exitCode, refused.output).toBe(1);
      expect(refused.output).toContain("action-pin");
      expect(refused.output).toContain("actions/upload-artifact");
    } finally {
      await Promise.all([clean, planted].map((root) => removeTempTree(root)));
    }
  });

  // QFAI:AC-0002-0014-05
  it("names the bump owner in files a gate can read: the Renovate configuration, its workflow and its guide", () => {
    const config = readFileSync(path.join(REPO_ROOT, ".github", "renovate.json5"), "utf8");
    expect(config).toMatch(/^\s*"helpers:pinGitHubActionDigests",/mu);
    expect(config).toMatch(/matchManagers:\s*\["github-actions"\]/u);

    const workflow = readYaml(path.join(WORKFLOWS_DIR, "renovate.yml"));
    const jobs = workflow["jobs"];
    if (!isRecord(jobs)) throw new Error("renovate.yml declares no jobs");
    const bumpers = stepsOf(jobs["renovate"]).flatMap((step) =>
      typeof step["uses"] === "string" ? [step["uses"]] : [],
    );
    expect(bumpers.some((uses) => /^renovatebot\/github-action@[0-9a-f]{40}$/u.test(uses))).toBe(
      true,
    );

    const guide = readFileSync(path.join(REPO_ROOT, ".github", "renovate.md"), "utf8");
    expect(guide).toMatch(/\*\*What runs it:\*\*\s*`\.github\/workflows\/renovate\.yml`/u);
    expect(guide).toMatch(/\*\*What it does:\*\*\s*`\.github\/renovate\.json5`/u);

    const rootConfigs = [
      "renovate.json",
      "renovate.json5",
      ".renovaterc",
      ".renovaterc.json",
      "dependabot.yml",
    ];
    expect(rootConfigs.filter((name) => existsSync(path.join(REPO_ROOT, name)))).toEqual([]);
  });

  // QFAI:AC-0002-0020-02
  it("keeps the shipped-set contract gate in a lane every pull request runs, with the duplicate gone and the cost recorded as the lost cross-check", () => {
    const gate = "tests/integration/shippedWorkflowShapeGate.test.ts";
    expect(existsSync(path.join(PACKAGE_ROOT, gate))).toBe(true);

    const scripts = (file: string): Record<string, unknown> => {
      const manifest: unknown = JSON.parse(readFileSync(file, "utf8"));
      const declared = isRecord(manifest) ? manifest["scripts"] : undefined;
      if (!isRecord(declared)) throw new Error(`${file} declares no scripts`);
      return declared;
    };
    expect(scripts(path.join(PACKAGE_ROOT, "package.json"))["lint:workflow-shape"]).toBe(
      `vitest run ${gate}`,
    );
    const rootScripts = scripts(path.join(REPO_ROOT, "package.json"));
    expect(String(rootScripts["ci:lint:structure"])).toContain("lint:workflow-shape");
    expect(String(rootScripts["ci:lint"])).toContain("run-lint-checks.sh");
    expect(readFileSync(path.join(WORKFLOWS_DIR, "ci.yml"), "utf8")).toContain("run: pnpm ci:lint");

    expect(existsSync(path.join(WORKFLOWS_DIR, "qfai-validate.yml"))).toBe(false);
    expect(
      existsSync(
        path.join(
          REPO_ROOT,
          "packages",
          "qfai",
          "assets",
          "init",
          "root",
          ".github",
          "workflows",
          "qfai-validate.yml",
        ),
      ),
    ).toBe(true);

    const record = readFileSync(path.join(REPO_ROOT, ".qfai", "spec", "decisions.md"), "utf8")
      .split(/\r?\n/u)
      .find((line) => /^\| DEC-\d+ \|/u.test(line) && line.includes("#DR-0017-0007:"));
    expect(record).toBeDefined();
    expect(record).toContain("**manual cross-check**");
    expect(record).toMatch(/It is \*\*not\*\* the loss of a mirror/u);
  });

  // QFAI:AC-0002-0018-03
  it("fails each rule independently, names file job and rule, and returns to green when the plant is removed", async () => {
    const plants: { rule: string; job: string; plant: (dir: string) => void }[] = [
      {
        rule: "job-guardrails",
        job: "lint",
        plant: (dir) =>
          editWorkflow(dir, "ci.yml", (text) =>
            replaceOnce(
              text,
              "  lint:\n    runs-on: ubuntu-latest\n    timeout-minutes: 10\n",
              "  lint:\n    runs-on: ubuntu-latest\n",
            ),
          ),
      },
      {
        rule: "checkout-credentials",
        job: "detect",
        plant: (dir) =>
          editWorkflow(dir, "ci.yml", (text) =>
            replaceOnce(
              text,
              "          persist-credentials: false\n",
              "          persist-credentials: true\n",
            ),
          ),
      },
      {
        rule: "action-pin",
        job: "detect",
        plant: (dir) =>
          editWorkflow(dir, "ci.yml", (text) =>
            text.replace(/uses: actions\/checkout@[0-9a-f]{40}/u, "uses: actions/checkout@main"),
          ),
      },
      { rule: "matrix-fail-fast", job: "test", plant: (dir) => enableFailFast(dir, "test") },
      {
        rule: "secret-inheritance",
        job: "lint",
        plant: (dir) =>
          editWorkflow(dir, "ci.yml", (text) =>
            replaceOnce(text, "  lint:\n", "  lint:\n    secrets: inherit\n"),
          ),
      },
    ];
    for (const { rule, job, plant } of plants) {
      const root = plantedTree(plant);
      try {
        const result = runLane(root);
        expect(result.exitCode, `${rule}: ${result.output}`).toBe(1);
        const lines = result.output.split(/\r?\n/u).filter((line) => line.includes(rule));
        expect(lines.length, rule).toBeGreaterThan(0);
        const joined = lines.join("\n");
        expect(joined).toContain("ci.yml");
        expect(joined).toContain(job);
      } finally {
        await removeTempTree(root);
      }
    }
    const restored = plantedTree(() => {});
    try {
      const result = runLane(restored);
      expect(result.exitCode, result.output).toBe(0);
    } finally {
      await removeTempTree(restored);
    }
  });
});
