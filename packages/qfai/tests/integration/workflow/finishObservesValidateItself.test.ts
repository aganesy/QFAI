// QFAI:SPEC-0018:TC-0018-0030
// QFAI:SPEC-0018:TC-0018-0039
// QFAI:SPEC-0018:TC-0018-0240

import { spawnSync } from "node:child_process";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { afterEach, expect, it } from "vitest";

import { validateQuietly } from "../../../src/core/workflow/observe.js";
import {
  CLI,
  commitAll,
  featureRunAt,
  field,
  initProject,
  minimalProject,
  removeProjects,
  resultFor,
  routedRun,
  submit,
  workflow,
} from "./workflowProject.js";

afterEach(removeProjects);

it("TC-0018-0039 (TDD-0305): Built CLI on a fixture whose validate is clean, asserted first", async () => {
  const root = await initProject();
  const errors = (await validateQuietly(root)).issues.filter((issue) => issue.severity === "error");
  const { runId, issued } = await featureRunAt(root, "verify");
  const report = path.join(root, ".qfai", "runs", "shared", "verify.json");
  await mkdir(path.dirname(report), { recursive: true });
  await writeFile(report, '{"status":"PASS","scope":"full"}\n');
  await submit(
    root,
    runId,
    "accept",
    resultFor(issued.json, "verify-1", {
      artifactRefs: [{ path: ".qfai/runs/shared/verify.json", digest: "submitted" }],
      reviewResults: [
        { role: "qa-gatekeeper", agentInstance: "qa-1", verdict: "PASS", reportRef: "qa.md" },
      ],
    }),
  );
  commitAll(root);
  const finished = workflow(root, ["finish", "--run", runId]);

  expect({
    errors,
    target: field(finished.json, "target"),
    unmet: field(finished.json, "unmet") ?? [],
    state: field(finished.json, "run.state"),
    exit: finished.status,
  }).toEqual({ errors: [], target: "qfai_done", unmet: [], state: "completed", exit: 0 });
}, 180_000);

// Git subcommands that read the repository and change nothing in it.
const READ_ONLY_GIT = new Set([
  "status",
  "diff",
  "ls-files",
  "rev-parse",
  "log",
  "show",
  "cat-file",
  "ls-tree",
  "merge-base",
  "for-each-ref",
  "show-ref",
  "check-ignore",
]);

// A preload that records every child process the CLI starts, as `[method, file, args]` lines.
async function spawnRecorder(dir: string, log: string): Promise<string> {
  const file = path.join(dir, "record-spawns.mjs");
  const methods = ["spawn", "spawnSync", "execFile", "execFileSync", "exec", "execSync", "fork"];
  const source = [
    'import childProcess from "node:child_process";',
    'import { appendFileSync } from "node:fs";',
    'import { syncBuiltinESMExports } from "node:module";',
    `for (const name of ${JSON.stringify(methods)}) {`,
    "  const original = childProcess[name];",
    "  childProcess[name] = function recorded(...args) {",
    "    const argv = Array.isArray(args[1]) ? args[1] : [];",
    `    appendFileSync(${JSON.stringify(log)}, JSON.stringify([name, String(args[0]), argv]) + "\\n");`,
    "    return original.apply(this, args);",
    "  };",
    "}",
    "syncBuiltinESMExports();",
  ];
  await writeFile(file, `${source.join("\n")}\n`);
  return pathToFileURL(file).href;
}

// The git subcommand of an argv, past any `-c key=value` and other leading options.
function gitSubcommand(argv: string[]): string {
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index] ?? "";
    if (arg === "-c" || arg === "-C") index += 1;
    else if (!arg.startsWith("-")) return arg;
  }
  return "";
}

it("TC-0018-0030 (TDD-0303): Temp repo whose validate reports an error", async () => {
  const root = await minimalProject();
  const { runId, issued } = await featureRunAt(root, "verify");
  const accepted = await submit(
    root,
    runId,
    "accept",
    resultFor(issued.json, "verify-1", { gateResults: [{ gateId: "validate", verdict: "PASS" }] }),
  );
  const log = path.join(root, ".qfai", "runs", "spawns.log");
  const recorder = await spawnRecorder(path.join(root, ".qfai", "runs"), log);
  const finished = spawnSync(
    process.execPath,
    ["--import", recorder, CLI, "workflow", "finish", "--run", runId],
    { cwd: root, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } },
  );
  const document: unknown = JSON.parse(finished.stdout);
  const spawned = (await readFile(log, "utf8").catch(() => ""))
    .split("\n")
    .filter(Boolean)
    .map((line): unknown => JSON.parse(line));
  const notReadOnlyGit = spawned.filter((entry) => {
    const [, file, argv] = Array.isArray(entry) ? entry : [];
    const args = Array.isArray(argv) ? argv.map(String) : [];
    return file !== "git" || !READ_ONLY_GIT.has(gitSubcommand(args));
  });
  const journal = path.join(root, ".qfai", "runs", runId, "journal");
  const events = await Promise.all(
    (await readdir(journal)).map((name) => readFile(path.join(journal, name), "utf8")),
  );
  const unmet = field(document, "unmet");

  expect({
    accepted: field(accepted.json, "ok"),
    receipts: field(document, "receipts"),
    gateFailed: Array.isArray(unmet)
      ? unmet.some((entry) => field(entry, "condition") === "gate-failed")
      : false,
    submitted: events
      .map((text): unknown => JSON.parse(text))
      .flatMap((event) => {
        const gates = field(event, "gateResults");
        return Array.isArray(gates) ? gates : [];
      }),
    notReadOnlyGit,
  }).toEqual({
    accepted: true,
    receipts: [{ gateId: "validate", verdict: "FAIL", trustLevel: "cli_observed" }],
    gateFailed: true,
    submitted: [{ gateId: "validate", verdict: "PASS", trustLevel: "agent_reported" }],
    notReadOnlyGit: [],
  });
});

it("TC-0018-0240: Under failOn never, a debt whose finding the finish validate still reports", async () => {
  const root = await minimalProject("validation:\n  failOn: never\n");
  const finding = (await validateQuietly(root)).issues.find((issue) => issue.file);
  const { runId } = await routedRun(root);
  const issued = workflow(root, ["next", "--run", runId]);
  const debt = {
    findingCode: finding?.code,
    path: finding?.file,
    cause: "The finding stands after this stage.",
    owningSpec: "spec-0001",
    detectingCommand: "qfai validate",
    resolvingOwner: "operator",
    blockingExtent: "completion",
  };
  const accepted = await submit(
    root,
    runId,
    "accept",
    resultFor(issued.json, "discussion-1", { outcome: "accepted_with_debt", debts: [debt] }),
  );
  const unmet = field(workflow(root, ["finish", "--run", runId]).json, "unmet");
  const conditions = (Array.isArray(unmet) ? unmet : []).map((entry) => field(entry, "condition"));

  expect({
    accepted: field(accepted.json, "ok"),
    debtOpen: conditions.includes("debt-open"),
    gateFailed: conditions.includes("gate-failed"),
  }).toEqual({ accepted: true, debtOpen: true, gateFailed: false });
});
