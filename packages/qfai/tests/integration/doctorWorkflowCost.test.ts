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

  // QFAI:EX-0003-0011-27
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

  // QFAI:EX-0003-0011-27
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

  // QFAI:EX-0003-0011-28
  it("names a workflow whose matrix is an expression instead of guessing a count", async () => {
    // QFAI:AC-0003-0011-12
    for (const lines of [
      ["check: [shape, mermaid]", "include: ${{ fromJSON(vars.EXTRA_CHECKS) }}"],
      ["${{ fromJSON(vars.CHECKS) }}"],
    ]) {
      const root = await project({ "qfai-docs.yml": await docsWithMatrix(lines) });

      const check = await costCheck(root);

      expect(check?.message).toContain("qfai-docs.yml could not be counted");
      expect(check?.message).not.toContain("qfai-docs.yml starts");
    }
  });
});

/** The shipped docs workflow with the matrix of its `checks` job replaced by the given lines. */
async function docsWithMatrix(lines: readonly string[]): Promise<string> {
  const docs = await packagedText("qfai-docs.yml");
  const [first, ...rest] = lines;
  const replacement =
    rest.length === 0 && first?.startsWith("${{") === true
      ? `      matrix: ${first}`
      : ["      matrix:", ...lines.map((line) => `        ${line}`)].join("\n");
  const edited = docs.replace(/^ {6}matrix:\n {8}check: \[shape, mermaid\]$/m, replacement);
  expect(edited).not.toBe(docs);
  return edited;
}
