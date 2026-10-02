// QFAI:AC-0001-0219-01
// QFAI:AC-0001-0219-02
// QFAI:AC-0001-0219-03

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, expect, it } from "vitest";

import {
  appendRecords,
  readJournal,
  type JournalRecord,
} from "../../../src/core/workflow/persistence.js";
import { flat, rowOf, sectionOf } from "../../helpers/shippedAssistant.js";
import {
  field,
  inbox,
  minimalProject,
  removeProjects,
  startRun,
  workflow,
} from "./workflowProject.js";

afterEach(async () => {
  await removeProjects();
});

const RECORDED_AT = "2026-09-28T00:00:00.000Z";

// A plan an earlier version accepted, under a route id the catalog no longer holds.
function retiredPlan(route: string, kinds: readonly string[]): NonNullable<JournalRecord["plan"]> {
  return {
    route,
    goal: "Keep the export working.",
    writeScope: [],
    expectedBehaviorRefs: [{ kind: "request", ref: "request" }],
    observedRefs: [],
    stages: kinds.map((kind) => ({
      stageInstanceId: kind,
      stageKind: kind,
      steps: [{ name: kind === "verify" ? "verify-repo-gate" : "maintain-edit" }],
    })),
  };
}

// A run started by the command, whose journal then records the retired plan an earlier version
// accepted, and a completion where the case asks for one.
async function runOnRetiredRoute(root: string, route: string, kinds: string[], done: boolean) {
  const runId = await startRun(root);
  const runDir = path.join(root, ".qfai", "run", runId);
  const journal = await readJournal(runDir);
  if (!journal.ok) throw new Error("the started run has no journal");
  const next = journal.records.length + 1;
  const common = { operation: "next", recordedAt: RECORDED_AT };
  const plan = retiredPlan(route, kinds);
  const records: Omit<JournalRecord, "prevHash">[] = [
    { ...common, sequence: next, event: "plan-accepted", from: "routing", to: "ready", plan },
    ...(done
      ? [
          {
            ...common,
            sequence: next + 1,
            event: "validated-final-result-and-target",
            from: "ready",
            to: "completed",
          },
        ]
      : []),
  ];
  await appendRecords(runDir, journal.lastHash, records);
  return runId;
}

// The run's local summary, written as the earlier version wrote it.
async function writeSummary(root: string, runId: string, route: string): Promise<string> {
  const file = path.join(root, ".qfai", "evidence", "workflow", runId, "summary.json");
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify({ runId, route, state: "completed" }, null, 2)}\n`);
  return file;
}

const RETIRED: [string, string[], string][] = [
  ["direct", ["maintenance", "verify"], "edit-text"],
  ["bugfix", ["diagnose", "verify"], "fix-defect"],
  ["bounded-change", ["sdd", "verify"], "add-feature"],
  ["discovery", ["discussion"], "decide-design"],
  ["feature", ["sdd", "prototype", "verify"], "prototype-feature"],
  ["feature", ["sdd", "verify"], "add-feature"],
];

// QFAI:EX-0001-0219-01
it("Completed runs recorded under the five retired route ids", async () => {
  const shown: string[] = [];
  const unchanged: boolean[] = [];
  for (const [route, kinds] of RETIRED) {
    const root = await minimalProject();
    const runId = await runOnRetiredRoute(root, route, kinds, true);
    const summary = await writeSummary(root, runId, route);
    const before = await readFile(summary);
    const status = workflow(root, ["status", "--run", runId]);
    shown.push(String(field(status.json, "route")));
    unchanged.push(before.equals(await readFile(summary)));
  }

  expect({ shown, unchanged }).toEqual({
    shown: RETIRED.map(([, , successor]) => successor),
    unchanged: RETIRED.map(() => true),
  });
});

// QFAI:EX-0001-0219-02
it("A run left in ready on bugfix, then next, resume and a stop", async () => {
  const root = await minimalProject();
  const runId = await runOnRetiredRoute(root, "bugfix", ["diagnose", "verify"], false);
  const refusal = (args: string[]) => {
    const run = workflow(root, args);
    return {
      code: field(run.json, "error.code"),
      cause: field(run.json, "error.cause"),
      named: String(field(run.json, "error.message")).includes("bugfix"),
    };
  };
  const next = refusal(["next", "--run", runId]);
  const resume = refusal(["resume", "--run", runId]);
  const status = field(workflow(root, ["status", "--run", runId]).json, "route");
  const stopIn = await inbox(root, runId, "stop", { stop: true, answeredBy: "operator" });
  const stop = field(
    workflow(root, ["decision", "--run", runId, "--in", stopIn]).json,
    "run.state",
  );

  const refused = { code: "fail-closed", cause: "contract-undeclared", named: true };
  expect({ next, resume, status, stop }).toEqual({
    next: refused,
    resume: refused,
    status: "fix-defect",
    stop: "cancelled",
  });
});

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const MIGRATION_NOTES = "docs/MIGRATION-2.0.0.md";

// The route ids a row of the notes' table names after the retired id it starts with.
function successorsIn(notes: string, retired: string): string[] {
  const row = rowOf(notes, `| \`${retired}\``);
  return [...row.matchAll(/`([a-z-]+)`/g)].slice(1).map((match) => match[1] ?? "");
}

// QFAI:EX-0001-0219-03
it("The migration notes of the release that retires the five route ids", async () => {
  const manifest: unknown = JSON.parse(
    await readFile(path.join(PACKAGE_ROOT, "package.json"), "utf8"),
  );
  const guide = await readFile(path.join(PACKAGE_ROOT, MIGRATION_NOTES), "utf8");
  const notes = sectionOf(guide.split("\r\n").join("\n"), "## Workflow routes and payloads");
  const text = flat(notes);

  expect({
    shipped: Reflect.get(Object(manifest), "files"),
    direct: successorsIn(notes, "direct"),
    bugfix: successorsIn(notes, "bugfix"),
    boundedChange: successorsIn(notes, "bounded-change"),
    feature: successorsIn(notes, "feature"),
    discovery: successorsIn(notes, "discovery"),
    proposalFieldsUnnamed: ["candidateRoute", "requiredStages", "optionalSteps"].filter(
      (name) => !text.includes(`\`${name}\``),
    ),
    planWhenGone: /a plan no longer carries `when`/i.test(text),
  }).toEqual({
    shipped: expect.arrayContaining([MIGRATION_NOTES]),
    direct: ["edit-text"],
    bugfix: ["fix-defect"],
    boundedChange: ["add-feature"],
    feature: ["prototype-feature", "add-feature"],
    discovery: ["decide-design"],
    proposalFieldsUnnamed: [],
    planWhenGone: true,
  });
});
