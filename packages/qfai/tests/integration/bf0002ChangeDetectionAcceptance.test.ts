import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import { removeTempTree } from "../helpers/tempTree.js";
import { isRecord, REPO_ROOT } from "../scripts/helpers/hygieneTree.js";

const FULL_LANE_CONDITION = "${{ needs.detect.outputs.full == 'true' }}";

type Job = Record<string, unknown>;
type Detection = { status: number; full: boolean | null; reason: string; stdout: string };

function ciJobs(): Record<string, Job> {
  const document: unknown = parseYaml(
    readFileSync(path.join(REPO_ROOT, ".github", "workflows", "ci.yml"), "utf8"),
  );
  if (!isRecord(document) || !isRecord(document["jobs"])) throw new Error("ci.yml has no jobs");
  const jobs: Record<string, Job> = {};
  for (const [id, job] of Object.entries(document["jobs"])) {
    if (!isRecord(job)) throw new Error(`job ${id} is not a mapping`);
    jobs[id] = job;
  }
  return jobs;
}

function job(id: string): Job {
  const found = ciJobs()[id];
  if (found === undefined) throw new Error(`ci.yml has no ${id} job`);
  return found;
}

function steps(id: string): Job[] {
  const value = job(id)["steps"];
  if (!Array.isArray(value)) throw new Error(`job ${id} has no steps`);
  return value.filter(isRecord);
}

/** The quoted Node program a step carries in a heredoc, byte for byte. */
function quotedProgram(step: Job | undefined): string {
  const run = step?.["run"];
  const body =
    typeof run === "string" ? /<<'NODE'\n([\s\S]*?)\nNODE(?:\n|$)/u.exec(run)?.[1] : null;
  if (typeof body !== "string" || body.length === 0) throw new Error("no quoted Node program");
  return body;
}

function declaredContext(): Record<string, unknown> {
  const declaration: unknown = JSON.parse(
    readFileSync(path.join(REPO_ROOT, ".github", "required-status-contexts.json"), "utf8"),
  );
  const contexts = isRecord(declaration) ? declaration["contexts"] : undefined;
  const [context] = Array.isArray(contexts) ? contexts : [];
  if (!isRecord(context) || !Array.isArray(contexts) || contexts.length !== 1) {
    throw new Error("the required-status declaration must hold exactly one context");
  }
  return context;
}

function stringList(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string")) {
    throw new Error(`${label} must be a list of strings`);
  }
  return value;
}

/** Whether the job executes once change detection has chosen `full`. */
function executes(candidate: Job, full: boolean): boolean {
  const condition = candidate["if"];
  if (condition === undefined || condition === "always()") return true;
  if (condition === FULL_LANE_CONDITION) return full;
  throw new Error(`condition is not modelled: ${String(condition)}`);
}

function executingJobs(full: boolean): string[] {
  return Object.entries(ciJobs())
    .filter(([, candidate]) => executes(candidate, full))
    .map(([id]) => id)
    .sort();
}

/** Runs the change-detection program the workflow carries over a synthetic diff. */
async function detect(input: {
  paths?: readonly string[];
  diffError?: string;
  diffStatus?: string;
}): Promise<Detection> {
  const dir = mkdtempSync(path.join(os.tmpdir(), "qfai-bf0002-detect-"));
  try {
    const program = path.join(dir, "detect.mjs");
    const pathsFile = path.join(dir, "changed.txt");
    const errorFile = path.join(dir, "diff-err.txt");
    const statusFile = path.join(dir, "diff-status.txt");
    const outputFile = path.join(dir, "github-output.txt");
    const classify = steps("detect").find((step) => step["id"] === "classify");
    writeFileSync(program, quotedProgram(classify), "utf8");
    if (input.paths !== undefined) writeFileSync(pathsFile, `${input.paths.join("\n")}\n`, "utf8");
    writeFileSync(errorFile, input.diffError ?? "", "utf8");
    if (input.diffStatus !== undefined) writeFileSync(statusFile, `${input.diffStatus}\n`, "utf8");
    writeFileSync(outputFile, "", "utf8");
    const child = spawnSync(process.execPath, [program, pathsFile, errorFile, statusFile], {
      encoding: "utf8",
      env: { ...process.env, GITHUB_OUTPUT: outputFile },
      timeout: 15_000,
    });
    if (child.error) throw child.error;
    const written = readFileSync(outputFile, "utf8");
    const full = /^full=(.*)$/mu.exec(written)?.[1];
    return {
      status: child.status ?? -1,
      full: full === undefined ? null : full.trim() === "true",
      reason: /^reason=(.*)$/mu.exec(written)?.[1]?.trim() ?? "",
      stdout: `${child.stdout}${child.stderr}`,
    };
  } finally {
    await removeTempTree(dir);
  }
}

/** Runs the aggregate verdict program over a needs map and returns its exit status. */
async function verdictStatus(needs: Record<string, { result: string }>): Promise<number> {
  const dir = mkdtempSync(path.join(os.tmpdir(), "qfai-bf0002-verdict-"));
  try {
    const program = path.join(dir, "verdict.mjs");
    writeFileSync(
      program,
      quotedProgram(steps("ci-pass").find((step) => String(step["run"]).includes("<<'NODE'"))),
      "utf8",
    );
    const child = spawnSync(process.execPath, [program], {
      encoding: "utf8",
      env: { ...process.env, NEEDS_JSON: JSON.stringify(needs) },
      timeout: 15_000,
    });
    if (child.error) throw child.error;
    return child.status ?? -1;
  } finally {
    await removeTempTree(dir);
  }
}

function verdictNeeds(
  executing: readonly string[],
): Record<string, { result: "success" | "skipped" }> {
  const needs = stringList(job("ci-pass")["needs"], "ci-pass needs");
  return Object.fromEntries(
    needs.map((name) => [name, { result: executing.includes(name) ? "success" : "skipped" }]),
  );
}

const DOCUMENTATION_ONLY = ["packages/qfai/docs/guide.md", ".claude/rules/notes.md"];

describe("BF-0002 change detection acceptance", () => {
  // QFAI:AC-0002-0013-03
  it("runs only the jobs the pin records for a Markdown-only change, and the verdict stays green", async () => {
    const detected = await detect({ paths: DOCUMENTATION_ONLY });
    expect(detected.status, detected.stdout).toBe(0);
    expect(detected.full).toBe(false);

    const executing = executingJobs(detected.full ?? true);
    const pin = declaredContext()["documentationOnlyCostPin"];
    if (!isRecord(pin)) throw new Error("the declaration holds no documentation-only pin");
    expect(executing).toEqual(stringList(pin["jobs"], "pinned jobs").sort());
    const ceiling = executing.reduce((sum, id) => {
      const minutes = job(id)["timeout-minutes"];
      if (typeof minutes !== "number") throw new Error(`${id} declares no timeout-minutes`);
      return sum + minutes;
    }, 0);
    expect(ceiling).toBe(pin["timeoutMinutesSum"]);

    // The executing dependencies are the declared ones that carry no pinned condition.
    const conditions = declaredContext()["dependencyConditions"];
    if (!isRecord(conditions)) throw new Error("the declaration holds no dependency conditions");
    const dependencies = stringList(declaredContext()["dependencies"], "dependencies");
    expect(executing.filter((id) => id !== "ci-pass")).toEqual(
      dependencies.filter((name) => !(name in conditions)).sort(),
    );

    // A matrix job is gated on the job, so one skipped check reports under its bare name.
    const matrixJobs = Object.entries(ciJobs()).filter(([, candidate]) => {
      const strategy = candidate["strategy"];
      return isRecord(strategy) && isRecord(strategy["matrix"]);
    });
    expect(matrixJobs.length).toBeGreaterThan(0);
    for (const [id, candidate] of matrixJobs) {
      expect(candidate["if"], id).toBe(FULL_LANE_CONDITION);
      expect(candidate, id).not.toHaveProperty("name");
      expect(executing, id).not.toContain(id);
    }

    expect(await verdictStatus(verdictNeeds(executing))).toBe(0);
  });

  // QFAI:AC-0002-0013-04
  it("fails open with a warning naming the reason when the diff cannot be computed", async () => {
    const checkout = steps("detect").find(
      (step) => typeof step["uses"] === "string" && step["uses"].startsWith("actions/checkout@"),
    );
    const inputs = checkout?.["with"];
    expect(isRecord(inputs) ? inputs["fetch-depth"] : undefined).toBe(0);
    const classify = steps("detect").find((step) => step["id"] === "classify");
    expect(String(classify?.["run"])).toContain("git diff --name-only --no-renames");

    const unreachable = "fatal: bad revision 'deadbeef...cafebabe'";
    const failed = await detect({
      paths: ["packages/qfai/docs/guide.md"],
      diffError: unreachable,
      diffStatus: "128",
    });
    expect(failed.status).toBe(0);
    expect(failed.full).toBe(true);
    expect(failed.stdout).toContain("::warning");
    expect(failed.stdout).toContain(unreachable);
    expect(failed.reason).toContain(unreachable);

    const shallow = await detect({
      paths: [],
      diffError: "fatal: no merge base",
      diffStatus: "0",
    });
    expect(shallow.full).toBe(true);
    expect(shallow.stdout).toContain("::warning");
    expect(shallow.stdout).toContain("fatal: no merge base");

    // Everything is selected, so every lane runs and the verdict is still reachable and green.
    expect(job("ci-pass")["if"]).toBe("always()");
    expect(await verdictStatus(verdictNeeds(executingJobs(true)))).toBe(0);
  });

  // QFAI:AC-0002-0013-05
  it("selects the full lane set for an unrecognized path and for the assistant catalog, and treats mirrors as documentation", async () => {
    const unrecognized = await detect({ paths: ["somewhere/else.md"] });
    expect(unrecognized.full).toBe(true);
    expect(unrecognized.reason).toContain("somewhere/else.md");

    const rootFile = await detect({ paths: ["NOTES.md"] });
    expect(rootFile.full).toBe(true);

    const mixed = await detect({ paths: [...DOCUMENTATION_ONLY, "somewhere/else.md"] });
    expect(mixed.full).toBe(true);

    const assistant = await detect({ paths: [".qfai/assistant/rule/test-layers.md"] });
    expect(assistant.full).toBe(true);
    expect(assistant.reason).toContain(".qfai/assistant/rule/test-layers.md");

    const mirrors = await detect({
      paths: [".claude/rules/example.md", ".agents/rules/example.md", ".codex/example.md"],
    });
    expect(mirrors.status, mirrors.stdout).toBe(0);
    expect(mirrors.full).toBe(false);
  });

  // QFAI:AC-0002-0013-06
  it("keeps the lint and mirror lanes and the required context running when no test lane is selected", async () => {
    const detected = await detect({ paths: DOCUMENTATION_ONLY });
    expect(detected.full).toBe(false);
    const executing = executingJobs(detected.full ?? true);

    const commands = (id: string): string =>
      steps(id)
        .map((step) => step["run"])
        .filter((run): run is string => typeof run === "string")
        .join("\n");

    expect(executing).toContain("lint");
    expect(commands("lint")).toContain("pnpm ci:lint");
    expect(commands("lint")).toContain("check-no-internal-version-leakage.sh");
    expect(commands("lint")).toContain("check-branch-version-pin.sh");
    const manifest: unknown = JSON.parse(
      readFileSync(path.join(REPO_ROOT, "package.json"), "utf8"),
    );
    const scripts = isRecord(manifest) ? manifest["scripts"] : undefined;
    expect(isRecord(scripts) ? scripts["ci:lint"] : undefined).toContain("run-lint-checks.sh");
    expect(isRecord(scripts) ? scripts["ci:lint:structure"] : undefined).toContain("lint:md");
    const aggregate = readFileSync(path.join(REPO_ROOT, "scripts", "run-lint-checks.sh"), "utf8");
    expect(aggregate).toContain("pnpm format:check");

    const hosts = Object.keys(ciJobs()).filter((id) =>
      commands(id).includes("pnpm -C packages/qfai lint:mirror-surface"),
    );
    expect(hosts).toEqual(["mirror-surface"]);
    const context = declaredContext();
    const conditions = context["dependencyConditions"];
    for (const host of hosts) {
      expect(executing).toContain(host);
      expect(job(host)).not.toHaveProperty("if");
      expect(stringList(context["unconditionalDependencies"], "unconditional")).toContain(host);
      expect(isRecord(conditions) ? conditions : {}).not.toHaveProperty(host);
    }

    expect(context).toMatchObject({ workflow: "ci.yml", job: "ci-pass" });
    expect(job("ci-pass")).not.toHaveProperty("name");
    expect(executing).toContain("ci-pass");
    expect(executing).toContain("build");
    expect(job("test")).not.toHaveProperty("name");
    expect(job("test")["strategy"]).toMatchObject({ matrix: { slice: expect.any(Array) } });
  });
});
