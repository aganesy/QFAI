import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

import { removeTempTree } from "../helpers/tempTree.js";
import {
  editWorkflow,
  firstContext,
  plantedTree,
  REPO_ROOT,
  runLane,
} from "../scripts/helpers/hygieneTree.js";

const WORKFLOW = path.join(REPO_ROOT, ".github/workflows/ci.yml");
const PINNER = path.join(REPO_ROOT, "scripts/pin-code-path-cost.mjs");

type Verdict = { status: number | null; output: string };
type VerdictJob = { name: string; needs: string[]; program: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function verdictJob(workflow = WORKFLOW): VerdictJob {
  const document: unknown = parseYaml(readFileSync(workflow, "utf8"));
  if (!isRecord(document) || !isRecord(document["jobs"])) {
    throw new Error("ci.yml has no jobs map");
  }
  const job = document["jobs"]["ci-pass"];
  if (!isRecord(job) || !Array.isArray(job["needs"])) {
    throw new Error("ci-pass has no needs list");
  }
  const needs = job["needs"];
  if (!needs.every((name) => typeof name === "string") || needs.length === 0) {
    throw new Error("ci-pass needs must be nonempty job names");
  }
  const steps = job["steps"];
  if (!Array.isArray(steps)) throw new Error("ci-pass has no steps");
  const candidates = steps.filter(
    (step): step is Record<string, unknown> =>
      isRecord(step) && typeof step["run"] === "string" && step["run"].includes("<<'NODE'"),
  );
  if (candidates.length !== 1) throw new Error("ci-pass needs exactly one verdict program");
  const [step] = candidates;
  if (!step || !isRecord(step["env"]) || step["env"]["NEEDS_JSON"] !== "${{ toJSON(needs) }}") {
    throw new Error("verdict must receive the serialized needs map");
  }
  const run = step["run"];
  if (typeof run !== "string") throw new Error("verdict program is missing");
  const body = /<<'NODE'\n([\s\S]*?)\nNODE(?:\n|$)/u.exec(run)?.[1];
  if (!body) throw new Error("verdict heredoc is missing or empty");
  return { name: "ci-pass", needs, program: body };
}

async function evaluate(
  program: string,
  needs: Record<string, { result?: string }>,
): Promise<Verdict> {
  const root = mkdtempSync(path.join(os.tmpdir(), "qfai-bf0002-verdict-"));
  try {
    const file = path.join(root, "verdict.mjs");
    writeFileSync(file, `${program}\n`, "utf8");
    const child = spawnSync(process.execPath, [file], {
      encoding: "utf8",
      env: { ...process.env, NEEDS_JSON: JSON.stringify(needs) },
      timeout: 10_000,
    });
    if (child.error) throw child.error;
    return { status: child.status, output: `${child.stdout ?? ""}${child.stderr ?? ""}` };
  } finally {
    await removeTempTree(root);
  }
}

function needsWith(names: readonly string[], result: string): Record<string, { result: string }> {
  return Object.fromEntries(names.map((name) => [name, { result }]));
}

describe("BF-0002 own-CI verdict and code-path release cost", () => {
  // QFAI:AC-0002-0013-01
  it("rejects a newly wired failed or cancelled need without editing the verdict body", async () => {
    const verdict = verdictJob();
    const futureNeed = "future-ci-lane";
    const root = mkdtempSync(path.join(os.tmpdir(), "qfai-bf0002-wiring-"));
    try {
      const changed: unknown = parseYaml(readFileSync(WORKFLOW, "utf8"));
      if (!isRecord(changed) || !isRecord(changed["jobs"])) {
        throw new Error("ci.yml has no jobs map");
      }
      const job = changed["jobs"]["ci-pass"];
      if (!isRecord(job) || !Array.isArray(job["needs"])) {
        throw new Error("ci-pass has no needs list");
      }
      job["needs"] = [...verdict.needs, futureNeed];
      const changedWorkflow = path.join(root, "ci.yml");
      writeFileSync(changedWorkflow, stringifyYaml(changed), "utf8");
      const expanded = verdictJob(changedWorkflow);
      expect(expanded.needs).toEqual([...verdict.needs, futureNeed]);
      expect(expanded.program).toBe(verdict.program);
      for (const result of ["failure", "cancelled"]) {
        const observed = await evaluate(expanded.program, {
          ...needsWith(expanded.needs, "success"),
          [futureNeed]: { result },
        });
        expect(observed.status).toBe(1);
        expect(observed.output).toContain(`CI job ${futureNeed} concluded ${result}`);
        expect(expanded.name).toBe(verdict.name);
      }
    } finally {
      await removeTempTree(root);
    }
  });

  // QFAI:AC-0002-0013-02
  it("accepts all-success and all-skipped maps but rejects unknown and empty states", async () => {
    const verdict = verdictJob();
    expect((await evaluate(verdict.program, needsWith(verdict.needs, "success"))).status).toBe(0);
    expect((await evaluate(verdict.program, needsWith(verdict.needs, "skipped"))).status).toBe(0);
    const unknown = await evaluate(verdict.program, needsWith(verdict.needs, "pending"));
    expect(unknown.status).toBe(1);
    expect(unknown.output).toContain("concluded pending");
    expect((await evaluate(verdict.program, {})).status).toBe(1);
  });

  // QFAI:AC-0002-0017-04
  it("fails on a code-path cost change and passes after the checked-in pinner updates all four figures", async () => {
    const root = plantedTree(() => {});
    try {
      const initial = runLane(root);
      expect(initial.exitCode, initial.output).toBe(0);
      const before = firstContext(root).codePathCostPin;
      expect(before).toBeDefined();

      editWorkflow(root, "ci.yml", (text) => {
        const needle = /(\n {2}test:\n[\s\S]*?\n {4}timeout-minutes: )10\b/u;
        if (!needle.test(text)) throw new Error("conditional test job timeout was not found");
        return text.replace(needle, (_match, prefix: string) => `${prefix}11`);
      });
      const stale = runLane(root);
      expect(stale.exitCode).toBe(1);
      expect(stale.output).toContain("code-path-cost-pin");
      expect(stale.output).toContain("timeoutMinutesSum");
      expect(stale.output).toContain(String(before?.timeoutMinutesSum));

      const repin = spawnSync(process.execPath, [PINNER, "--root", root], {
        cwd: root,
        encoding: "utf8",
        timeout: 30_000,
      });
      if (repin.error) throw repin.error;
      expect(repin.status, `${repin.stdout ?? ""}${repin.stderr ?? ""}`).toBe(0);
      const after = firstContext(root).codePathCostPin;
      expect(after).toBeDefined();
      expect(after?.timeoutMinutesSum).toBe((before?.timeoutMinutesSum ?? 0) + 9);
      expect(after?.instances).toBe(before?.instances);
      expect(after?.installInstances).toBe(before?.installInstances);
      expect(after?.buildJobs).toEqual(before?.buildJobs);
      const repaired = runLane(root);
      expect(repaired.exitCode, repaired.output).toBe(0);
    } finally {
      await removeTempTree(root);
    }
  });
});
