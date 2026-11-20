import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createDoctorData } from "../../src/core/doctor.js";
import { getInitAssetsDir } from "../../src/shared/assets.js";
import { IDLE, jobsOf, LANE_RUNS, startedBy } from "../helpers/shippedJobCounts.js";
import { isRecord } from "../helpers/shippedWorkflowFixtures.js";
import { removeTempTree } from "../helpers/tempTree.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
});

const SHIPPED = ["qfai-docs.yml", "qfai-tests.yml", "qfai-validate.yml"] as const;

const LIGHT = "vars.QFAI_CI_LIGHT_RUNNER, else vars.QFAI_CI_RUNNER, else ubuntu-latest";
const HEAVY = "vars.QFAI_CI_RUNNER, else ubuntu-latest";

function packagedText(name: string): Promise<string> {
  return readFile(path.join(getInitAssetsDir(), "root", ".github", "workflows", name), "utf-8");
}

async function project(installed: Record<string, string>): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-workflow-cost-"));
  roots.push(root);
  await writeFile(path.join(root, "qfai.config.yaml"), "paths:\n  specsDir: .qfai/spec\n", "utf-8");
  await mkdir(path.join(root, ".github", "workflows"), { recursive: true });
  for (const [name, text] of Object.entries(installed)) {
    await writeFile(path.join(root, ".github", "workflows", name), text, "utf-8");
  }
  return root;
}

async function costCheck(root: string) {
  const data = await createDoctorData({ startDir: root, rootExplicit: true });
  return data.checks.find((check) => check.id === "workflows.cost");
}

describe("qfai doctor reports the jobs the shipped workflows start per pull request event", () => {
  // QFAI:EX-0003-0011-27
  it("lists the idle and lane-running jobs of each installed workflow and the runner of each job", async () => {
    // QFAI:AC-0003-0011-12
    const texts: Record<string, string> = {};
    for (const name of SHIPPED) texts[name] = await packagedText(name);
    const root = await project(texts);

    const check = await costCheck(root);

    expect(check?.severity).toBe("info");
    expect(check?.message).toContain(
      `qfai-docs.yml starts 1 job when nothing is to run (scope) and up to 4 when its lane runs (scope, checks x2, docs), with scope and docs on ${LIGHT}; checks on ${HEAVY}.`,
    );
    expect(check?.message).toContain(
      `qfai-tests.yml starts 1 job when nothing is to run (detection) and up to 7 when its lane runs (detection, tests x5, verdict), with detection and verdict on ${LIGHT}; tests on ${HEAVY}.`,
    );
    expect(check?.message).toContain(
      `qfai-validate.yml starts 1 job (validate), with validate on ${HEAVY}.`,
    );
    const details = check?.details;
    expect(isRecord(details) ? details["workflows"] : undefined).toEqual(
      SHIPPED.map((name) => {
        const jobs = jobsOf(texts[name] ?? "");
        const idle = startedBy(jobs, IDLE);
        const laneRuns = startedBy(jobs, LANE_RUNS);
        return {
          file: name,
          idle: { jobs: idle.total, ids: idle.ids },
          laneRuns: { jobs: laneRuns.total, ids: laneRuns.ids },
        };
      }),
    );
  });

  // QFAI:EX-0003-0011-28
  it("reports only the workflows that are installed, and nothing when none is", async () => {
    // QFAI:AC-0003-0011-12
    const one = await costCheck(
      await project({ "qfai-validate.yml": await packagedText("qfai-validate.yml") }),
    );
    const none = await costCheck(await project({}));

    expect(one?.message).toContain("qfai-validate.yml starts 1 job");
    expect(one?.message).not.toContain("qfai-docs.yml");
    expect(none).toBeUndefined();
  });

  // QFAI:EX-0003-0011-28
  it("names a workflow whose job condition it does not read instead of guessing a count", async () => {
    // QFAI:AC-0003-0011-12
    const tests = await packagedText("qfai-tests.yml");
    const edited = tests.replace(
      /^ {4}if: \$\{\{ always\(\) && .*needs\.detection\.outputs\.selected != '\[\]' \}\}$/m,
      "    if: ${{ github.actor == 'someone' }}",
    );
    expect(edited).not.toBe(tests);
    const root = await project({
      "qfai-tests.yml": edited,
      "qfai-validate.yml": await packagedText("qfai-validate.yml"),
    });

    const check = await costCheck(root);

    expect(check?.severity).toBe("info");
    expect(check?.message).toContain("qfai-validate.yml starts 1 job");
    expect(check?.message).toContain("qfai-tests.yml could not be counted");
    expect(check?.message).not.toContain("qfai-tests.yml starts");
  });

  // QFAI:EX-0003-0011-40
  it("counts a matrix job once per combination of its axes", async () => {
    // QFAI:AC-0003-0011-12
    const root = await project({
      "qfai-docs.yml": await docsWithMatrix(["check: [shape, mermaid]", "node: [20, 22, 24]"]),
    });

    const check = await costCheck(root);

    expect(check?.message).toContain(
      "qfai-docs.yml starts 1 job when nothing is to run (scope) and up to 8 when its lane runs (scope, checks x6, docs)",
    );
  });

  // QFAI:EX-0003-0011-40
  it("counts one leg per entry of a matrix that is only an include list", async () => {
    // QFAI:AC-0003-0011-12
    const root = await project({
      "qfai-docs.yml": await docsWithMatrix([
        "include:",
        "  - check: shape",
        "  - check: mermaid",
        "  - check: links",
      ]),
    });

    const check = await costCheck(root);

    expect(check?.message).toContain("up to 5 when its lane runs (scope, checks x3, docs)");
  });

  // QFAI:EX-0003-0011-40
  it("multiplies the test lane's layer axis by a literal axis", async () => {
    // QFAI:AC-0003-0011-12
    const root = await project({ "qfai-tests.yml": await testsWithMatrix(["node: [20, 22]"]) });

    const check = await costCheck(root);

    expect(check?.message).toContain(
      "qfai-tests.yml starts 1 job when nothing is to run (detection) and up to 12 when its lane runs (detection, tests x10, verdict)",
    );
  });

  // QFAI:EX-0003-0011-40
  it("removes the excluded combinations and adds an included one that extends none", async () => {
    // QFAI:AC-0003-0011-12
    const root = await project({
      "qfai-docs.yml": await docsWithMatrix([
        "check: [shape, mermaid]",
        "os: [ubuntu-latest, windows-latest]",
        "exclude:",
        "  - check: mermaid",
        "    os: windows-latest",
        "include:",
        "  - check: shape",
        "    os: ubuntu-latest",
        "    node: 22",
        "  - check: links",
      ]),
    });

    const check = await costCheck(root);

    expect(check?.message).toContain("up to 6 when its lane runs (scope, checks x4, docs)");
  });

  // QFAI:EX-0003-0011-41
  it("names a workflow whose matrix it cannot read instead of guessing a count", async () => {
    // QFAI:AC-0003-0011-12
    const docs = await packagedText("qfai-docs.yml");
    const strategyExpression = docs.replace(
      /^ {4}strategy:\n {6}fail-fast: false\n {6}matrix:\n {8}check: \[shape, mermaid\]$/m,
      "    strategy: ${{ fromJSON(vars.CHECKS_STRATEGY) }}",
    );
    expect(strategyExpression).not.toBe(docs);
    const unreadable: [string, string][] = [
      ["qfai-docs.yml", strategyExpression],
      ["qfai-docs.yml", await docsWithMatrix(["${{ fromJSON(vars.CHECKS) }}"])],
      [
        "qfai-docs.yml",
        await docsWithMatrix([
          "check: [shape, mermaid]",
          "include: ${{ fromJSON(vars.EXTRA_CHECKS) }}",
        ]),
      ],
      [
        "qfai-docs.yml",
        await docsWithMatrix(["check: [shape, mermaid]", "exclude:", "  - os: windows-latest"]),
      ],
      ["qfai-docs.yml", await docsWithMatrix(["check: [shape, mermaid]", "node: []"])],
      ["qfai-docs.yml", await docsWithMatrix(["{}"])],
      [
        "qfai-docs.yml",
        await docsWithMatrix([
          "check: [shape, mermaid]",
          "exclude:",
          "  - check: shape",
          "  - check: mermaid",
        ]),
      ],
      ["qfai-tests.yml", await testsWithMatrix(["include:", "  - node: 22"])],
    ];
    for (const [name, text] of unreadable) {
      const root = await project({ [name]: text });

      const check = await costCheck(root);

      expect(check?.severity).toBe("info");
      expect(check?.message).toContain(`${name} could not be counted`);
      expect(check?.message).not.toContain(`${name} starts`);
    }
  });
});

describe("qfai doctor reads the triggers of the shipped workflows before counting their jobs", () => {
  // QFAI:EX-0003-0011-42
  it("reports a workflow whose triggers start it on no pull request as starting no job", async () => {
    // QFAI:AC-0003-0011-12
    const silent = [
      "on:\n  push:\n    branches: [main, master]",
      "on: push",
      "on: [push, workflow_dispatch]",
      "on:\n  pull_request:\n    types: [closed]",
    ];
    for (const on of silent) {
      const root = await project({ "qfai-validate.yml": await validateWithTriggers(on) });

      const check = await costCheck(root);

      expect(check?.severity).toBe("info");
      expect(check?.message).toContain(
        "qfai-validate.yml starts no job on a pull request event: its `on:` does not start it on one.",
      );
      const details = check?.details;
      expect(isRecord(details) ? details["workflows"] : undefined).toEqual([
        {
          file: "qfai-validate.yml",
          idle: { jobs: 0, ids: "" },
          laneRuns: { jobs: 0, ids: "" },
        },
      ]);
    }
  });

  // QFAI:EX-0003-0011-42
  it("counts the jobs of a workflow each pull request trigger form starts", async () => {
    // QFAI:AC-0003-0011-12
    const started = [
      "on: pull_request",
      "on: [push, pull_request]",
      "on:\n  push:\n  pull_request:",
      "on:\n  pull_request:\n    types: [opened, closed]",
      "on:\n  pull_request:\n    types: synchronize",
    ];
    for (const on of started) {
      const root = await project({ "qfai-validate.yml": await validateWithTriggers(on) });

      const check = await costCheck(root);

      expect(check?.message).toContain("qfai-validate.yml starts 1 job (validate)");
    }
  });

  // QFAI:EX-0003-0011-43
  it("names a workflow whose triggers it cannot read instead of guessing a count", async () => {
    // QFAI:AC-0003-0011-12
    const unreadable = [
      "on:\n  pull_request:\n    branches: [main]",
      "on:\n  pull_request:\n    paths: ['src/**']",
      "on:\n  pull_request:\n    branches-ignore: [release]",
      "on:\n  pull_request:\n    paths-ignore: ['docs/**']",
      "on:\n  pull_request_target:",
      "on: [pull_request_target]",
      "on:\n  pull_request:\n    types: {opened: true}",
      "on: [push, {pull_request: null}]",
      "on: 1",
      "run-name: no trigger",
    ];
    for (const on of unreadable) {
      const root = await project({ "qfai-validate.yml": await validateWithTriggers(on) });

      const check = await costCheck(root);

      expect(check?.severity).toBe("info");
      expect(check?.message).toContain("qfai-validate.yml could not be counted");
      expect(check?.message).not.toContain("qfai-validate.yml starts");
    }
  });
});

/** The shipped validate workflow with its `on:` block replaced by the given text. */
async function validateWithTriggers(on: string): Promise<string> {
  const validate = await packagedText("qfai-validate.yml");
  const edited = validate.replace(/^on:\n[\s\S]*?\n\n/m, () => `${on}\n\n`);
  expect(edited).not.toBe(validate);
  return edited;
}

/** The matrix lines given, as the value of `matrix:` inline when one line is not a key. */
function matrixBlock(lines: readonly string[]): string {
  const [first, ...rest] = lines;
  if (first !== undefined && rest.length === 0 && !/^[A-Za-z_][\w-]*:/.test(first)) {
    return `      matrix: ${first}`;
  }
  return ["      matrix:", ...lines.map((line) => `        ${line}`)].join("\n");
}

/** The shipped docs workflow with the matrix of its `checks` job replaced by the given lines. */
async function docsWithMatrix(lines: readonly string[]): Promise<string> {
  const docs = await packagedText("qfai-docs.yml");
  const edited = docs.replace(/^ {6}matrix:\n {8}check: \[shape, mermaid\]$/m, matrixBlock(lines));
  expect(edited).not.toBe(docs);
  return edited;
}

/** The shipped tests workflow with the given lines added after the layer axis of its matrix. */
async function testsWithMatrix(lines: readonly string[]): Promise<string> {
  const tests = await packagedText("qfai-tests.yml");
  const edited = tests.replace(
    /^ {8}layer: \$\{\{ fromJSON\(needs\.detection\.outputs\.selected\) \}\}$/m,
    (layer) => [layer, ...lines.map((line) => `        ${line}`)].join("\n"),
  );
  expect(edited).not.toBe(tests);
  return edited;
}
