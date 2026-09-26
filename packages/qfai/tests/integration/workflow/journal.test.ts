// QFAI:AC-0001-0195-05
// QFAI:AC-0001-0196-01
// QFAI:AC-0001-0196-04
// QFAI:AC-0001-0196-05
// QFAI:AC-0001-0196-09
// QFAI:AC-0001-0199-01
// QFAI:AC-0001-0201-05
// QFAI:EX-0001-0195-11
// QFAI:EX-0001-0196-03
// QFAI:EX-0001-0196-09
// QFAI:EX-0001-0196-11
// QFAI:EX-0001-0196-12
// QFAI:EX-0001-0196-13
// QFAI:EX-0001-0199-03
// QFAI:EX-0001-0201-18
// QFAI:EX-0001-0201-20
// Fault seeds: FAULT-001, FAULT-002, FAULT-005, FAULT-006, FAULT-022

import { spawnSync } from "node:child_process";
import { createHash, createHmac } from "node:crypto";
import { existsSync } from "node:fs";
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import { hashAssistantAssetText } from "../../../src/core/assistantAssetProvenance.js";
import { policyDigestsOf } from "../../../src/core/workflow/observe.js";
import { snapshotOf, writeSnapshot } from "../../../src/core/workflow/fold.js";
import { readJournal } from "../../../src/core/workflow/persistence.js";
import {
  featureRunAt,
  field,
  inbox,
  minimalProject,
  removeProjects,
  resultFor,
  routedRun,
  START_INPUT,
  startRun,
  submit,
  treeDigest,
  workflow,
} from "./workflowProject.js";

afterEach(removeProjects);

// Every file under a directory, as text.
async function filesUnder(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true }).catch(() => []);
  const files = entries.filter((entry) => entry.isFile());
  return Promise.all(
    files.map((entry) => readFile(path.join(entry.parentPath, entry.name), "utf8")),
  );
}

// Rewrites one published event and chains every later event to the new bytes, as a run written
// that way would hold it.
async function rewriteEvent(
  root: string,
  runId: string,
  sequence: number,
  edit: (event: Record<string, unknown>) => object,
) {
  const journal = path.join(root, ".qfai", "run", runId, "journal");
  const names = (await readdir(journal)).filter((name) => /^\d{6}\.json$/.test(name)).sort();
  let prevHash: string | null = null;
  for (const [index, name] of names.entries()) {
    const file = path.join(journal, name);
    let bytes = await readFile(file);
    if (index + 1 >= sequence) {
      const event: unknown = JSON.parse(bytes.toString("utf8"));
      const object = typeof event === "object" && event !== null ? { ...event } : {};
      const edited = index + 1 === sequence ? edit(object) : object;
      bytes = Buffer.from(`${JSON.stringify({ ...edited, prevHash }, null, 2)}\n`, "utf8");
      await writeFile(file, bytes);
    }
    prevHash = createHash("sha256").update(bytes).digest("hex");
  }
}

async function trackedSummary(root: string, runId: string): Promise<unknown> {
  const file = path.join(root, ".qfai", "evidence", "workflow", runId, "summary.json");
  return JSON.parse(await readFile(file, "utf8").catch(() => "null"));
}

// QFAI:EX-0001-0201-39
it("Built CLI run with a distinctive request sentence under a temp root", async () => {
  const root = await minimalProject();
  const sentence = "Paint the zebra crossing ultraviolet at dawn.";
  const input = { ...START_INPUT, request: { text: sentence } };
  const { runId } = await featureRunAt(root, "implement", input);
  const tracked = await filesUnder(path.join(root, ".qfai", "evidence", "workflow", runId));
  const real = await realpath(root);
  const roots = [root, real, root.split(path.sep).join("/"), real.split(path.sep).join("/")];
  const escaped = roots.map((each) => JSON.stringify(each).slice(1, -1));
  const privateCopy: unknown = JSON.parse(
    await readFile(path.join(root, ".qfai", "run", runId, "request.private.json"), "utf8"),
  );
  const key = String(field(privateCopy, "digestKey"));
  const requestDigest = field(await trackedSummary(root, runId), "requestDigest");

  expect({
    files: tracked.length > 0,
    sentence: tracked.some((text) => text.includes(sentence)),
    root: tracked.some((text) => [...roots, ...escaped].some((each) => text.includes(each))),
    keyed:
      requestDigest ===
      createHmac("sha256", Buffer.from(key, "hex")).update(sentence).digest("hex"),
    bare: requestDigest === createHash("sha256").update(sentence).digest("hex"),
    secret: tracked.some((text) => text.includes(key)),
  }).toEqual({
    files: true,
    sentence: false,
    root: false,
    keyed: true,
    bare: false,
    secret: false,
  });
});

it("Built CLI run from start to finish on a temp project", async () => {
  const root = await minimalProject();
  const { runId, issued } = await featureRunAt(root, "verify");
  await submit(root, runId, "accept", resultFor(issued.json, "verify-1"));
  const finished = workflow(root, ["finish", "--run", runId]);
  const status = spawnSync("git", ["status", "--porcelain", "--ignored", "--untracked-files=all"], {
    cwd: root,
    encoding: "utf8",
  });
  const written = status.stdout
    .split("\n")
    .filter(Boolean)
    .map((line) => line.slice(3))
    .filter((file) => !file.startsWith(`.qfai/evidence/workflow/${runId}/`));

  expect({
    finished: typeof field(finished.json, "run.state"),
    outsideRuns: written.filter((file) => !file.startsWith(".qfai/run/")),
    stateFile: existsSync(path.join(root, ".qfai", "state.json")),
  }).toEqual({ finished: "string", outsideRuns: [], stateFile: false });
});

it("the tracked summary copies nothing of settled", async () => {
  const root = await minimalProject();
  const { runId, issued } = await featureRunAt(root, "implement");
  const settled = field(issued.json, "workOrder.settled.answers.0");
  const text = JSON.stringify(await trackedSummary(root, runId));

  expect({
    summary: text !== "null",
    settledField: text.includes('"settled"'),
    question: text.includes(String(field(settled, "text"))),
    chosen: text.includes(String(field(settled, "chosen.0"))),
  }).toEqual({ summary: true, settledField: false, question: false, chosen: false });
});

const NEWER: [string, string[]][] = [
  ["next", ["next"]],
  ["accept", ["accept", "--in"]],
  ["decision", ["decision", "--in"]],
  ["status", ["status"]],
  ["resume", ["resume"]],
  ["finish", ["finish"]],
  ["start", ["start"]],
];

for (const [title, [operation = "", withInput]] of NEWER) {
  it(title, async () => {
    const root = await minimalProject();
    const runId = await startRun(root);
    await rewriteEvent(root, runId, 1, (event) => {
      const context = event.executionContext;
      const fixed = typeof context === "object" && context !== null ? context : {};
      return { ...event, executionContext: { ...fixed, qfaiVersion: "999.0.0" } };
    });
    const payload = await inbox(root, operation === "start" ? null : runId, operation, START_INPUT);
    const args =
      operation === "start"
        ? ["start", "--in", payload]
        : [operation, "--run", runId, ...(withInput ? ["--in", payload] : [])];
    const refused = workflow(root, args);

    expect(field(refused.json, "error.code")).toBe("newer-record");
  });
}

const RUNS = path.join(".qfai", "run");

function runDirOf(root: string, runId: string): string {
  return path.join(root, RUNS, runId);
}

// A discovery run routed and ready, whose journal holds four events.
async function readyRun() {
  const root = await minimalProject();
  const { runId, routed } = await routedRun(root);
  return { root, runId, routed };
}

async function writeLock(root: string, owner: object): Promise<string> {
  const lock = path.join(root, RUNS, ".lock");
  const text = JSON.stringify({
    pid: process.pid,
    hostname: os.hostname(),
    worktree: await realpath(root),
    runId: null,
    operation: "accept",
    startedAt: "2026-09-25T00:00:00.000Z",
    token: "held-by-the-test",
    ...owner,
  });
  await writeFile(lock, text);
  return text;
}

it("A run directory whose journal the core cannot parse as a record", async () => {
  const root = await minimalProject();
  const legacy = "run-20200101000000000";
  await mkdir(path.join(root, RUNS, legacy, "journal"), { recursive: true });
  await writeFile(
    path.join(root, RUNS, legacy, "journal", "000001.json"),
    JSON.stringify({ state: "running", stage: "implement" }),
  );
  const reported = workflow(root, ["status", "--run", legacy]);
  const started = workflow(root, ["start", "--in", await inbox(root, null, "start", START_INPUT)]);

  expect({
    state: field(reported.json, "run.state"),
    start: [field(started.json, "ok"), field(started.json, "error.code")],
  }).toEqual({ state: "legacy", start: [true, undefined] });
});

it("Built CLI", async () => {
  const root = await minimalProject();
  const runId = await startRun(root);
  const second = workflow(root, ["start", "--in", await inbox(root, null, "again", START_INPUT)]);

  expect({
    code: field(second.json, "error.code"),
    run: [field(second.json, "run.id"), field(second.json, "run.state")],
    exit: second.status,
  }).toEqual({ code: "run-active", run: [runId, "routing"], exit: 2 });
});

it("A write operation while", async () => {
  const { root, runId } = await readyRun();
  const startedAt = "2026-09-25T01:02:03.456Z";
  await writeLock(root, { runId, operation: "accept", startedAt });
  const refused = workflow(root, ["next", "--run", runId]);
  const message = String(field(refused.json, "error.message"));

  expect({
    code: field(refused.json, "error.code"),
    names: [runId, "accept", startedAt].map((part) => message.includes(part)),
  }).toEqual({ code: "lock-held", names: [true, true, true] });
});

it("A lock whose start time is years old and whose pid is the live test process", async () => {
  const { root, runId } = await readyRun();
  const lock = await writeLock(root, { runId, startedAt: "2001-01-01T00:00:00.000Z" });
  const refused = workflow(root, ["next", "--run", runId]);

  expect({
    code: field(refused.json, "error.code"),
    lock: await readFile(path.join(root, RUNS, ".lock"), "utf8"),
  }).toEqual({ code: "lock-held", lock });
});

it("A lock on this host whose pid is an exited child, with an orphan journal/", async () => {
  const { root, runId, routed } = await readyRun();
  const child = spawnSync(process.execPath, ["-e", ""]);
  await writeLock(root, { runId, pid: child.pid });
  const pending = String(Number(field(routed.json, "run.sequence")) + 1).padStart(6, "0");
  const orphan = path.join(runDirOf(root, runId), "journal", `.${pending}.tmp`);
  await writeFile(orphan, '{"event":"authorized-stop"}');
  const next = workflow(root, ["next", "--run", runId]);

  expect({
    ok: field(next.json, "ok"),
    state: field(next.json, "run.state"),
    orphan: existsSync(orphan),
    lock: existsSync(path.join(root, RUNS, ".lock")),
  }).toEqual({ ok: true, state: "running", orphan: false, lock: false });
});

it("A lock naming another hostname and a pid not alive here", async () => {
  const { root, runId } = await readyRun();
  const child = spawnSync(process.execPath, ["-e", ""]);
  const lock = await writeLock(root, {
    runId,
    hostname: `${os.hostname()}-elsewhere`,
    pid: child.pid,
  });
  const refused = workflow(root, ["next", "--run", runId]);

  expect({
    code: field(refused.json, "error.code"),
    lock: await readFile(path.join(root, RUNS, ".lock"), "utf8"),
  }).toEqual({ code: "lock-held", lock });
});

it("An LF and a CRLF copy of a watched file", async () => {
  const lf = "workflow:\n  mode: active\nvalidation:\n  failOn: error\n";
  const root = await minimalProject(lf);
  const before = await policyDigestsOf(root);
  const runId = await startRun(root);
  await writeFile(path.join(root, "qfai.config.yaml"), lf.split("\n").join("\r\n"));
  const after = await policyDigestsOf(root);
  const finished = workflow(root, ["finish", "--run", runId]);
  const unmet = field(finished.json, "unmet");

  expect({
    equal: after["qfai.config.yaml"] === before["qfai.config.yaml"],
    drift: Array.isArray(unmet)
      ? unmet.filter((entry) => field(entry, "condition") === "policy-drift")
      : unmet,
  }).toEqual({ equal: true, drift: [] });
});

// The verdict of each step of a short run, with nothing that names the run or the root.
async function verdictsIn(root: string) {
  const { runId, routing, routed } = await routedRun(root);
  const issued = workflow(root, ["next", "--run", runId]);
  const accepted = await submit(root, runId, "accept", resultFor(issued.json, "discussion-1"));
  const status = workflow(root, ["status", "--run", runId]);
  return [routing, routed, issued, accepted, status].map((step) => [
    step.status,
    field(step.json, "ok"),
    field(step.json, "run.state"),
    field(step.json, "run.sequence"),
    field(step.json, "error.code"),
    field(step.json, "workOrder.stageKind"),
  ]);
}

it("Built CLI under a temp root whose name has a space", async () => {
  const spaced = await minimalProject(undefined, "qfai workflow ");
  const plain = await minimalProject();

  expect({ space: spaced.includes(" "), verdicts: await verdictsIn(spaced) }).toEqual({
    space: true,
    verdicts: await verdictsIn(plain),
  });
});

it("A changed file reached through a symlink on POSIX, or a junction on Windows, whose real path is outside the project root", async () => {
  const root = await minimalProject();
  const outside = await mkdtemp(path.join(os.tmpdir(), "qfai-outside-"));
  await writeFile(path.join(outside, "total.ts"), "export const total = 0;\n");
  await mkdir(path.join(root, "src"), { recursive: true });
  await symlink(outside, path.join(root, "src", "linked"), "junction");
  const { runId, issued } = await featureRunAt(root, "implement");
  const refused = await submit(
    root,
    runId,
    "accept",
    resultFor(issued.json, "implement-1", {
      changedFiles: [
        {
          path: "src/linked/total.ts",
          digest: hashAssistantAssetText("export const total = 0;\n"),
        },
      ],
    }),
  );
  await rm(outside, { recursive: true, force: true });

  expect({
    code: field(refused.json, "error.code"),
    reasons: field(refused.json, "error.reasons"),
  }).toEqual({
    code: "invalid-input",
    reasons: [{ reason: "write-scope", subject: "src/linked/total.ts" }],
  });
});

it("A changed file named by a case variant of a write-area path", async () => {
  const root = await minimalProject();
  await mkdir(path.join(root, "src"), { recursive: true });
  await writeFile(path.join(root, "src", "total.ts"), "export const total = 0;\n");
  const caseInsensitive = existsSync(path.join(root, "SRC", "TOTAL.TS"));
  const { runId, issued } = await featureRunAt(root, "implement");
  const submitted = await submit(
    root,
    runId,
    "accept",
    resultFor(issued.json, "implement-1", {
      changedFiles: [
        { path: "SRC/total.ts", digest: hashAssistantAssetText("export const total = 0;\n") },
      ],
    }),
  );

  expect({
    ok: field(submitted.json, "ok"),
    reasons: field(submitted.json, "error.reasons"),
  }).toEqual(
    caseInsensitive
      ? { ok: true, reasons: undefined }
      : { ok: false, reasons: [{ reason: "write-scope", subject: "SRC/total.ts" }] },
  );
});

async function integrityRefusal(root: string, runId: string) {
  const before = await treeDigest(root);
  const refused = workflow(root, ["next", "--run", runId]);
  return {
    code: field(refused.json, "error.code"),
    exit: refused.status,
    unchanged: (await treeDigest(root)) === before,
  };
}

it("A published journal/000004", async () => {
  const { root, runId } = await readyRun();
  await writeFile(path.join(runDirOf(root, runId), "journal", "000004.json"), '{"sequence": 4,');
  const refused = await integrityRefusal(root, runId);
  const status = workflow(root, ["status", "--run", runId]);

  expect({ ...refused, state: field(status.json, "run.state") }).toEqual({
    code: "torn-event",
    exit: 1,
    unchanged: true,
    state: "failed",
  });
});

const GAPS: [string, string][] = [
  ["missing-000003", "000003.json"],
  ["missing-000001", "000001.json"],
];

for (const [title, missing] of GAPS) {
  it(title, async () => {
    const { root, runId } = await readyRun();
    await rm(path.join(runDirOf(root, runId), "journal", missing));

    expect(await integrityRefusal(root, runId)).toEqual({
      code: "sequence-gap",
      exit: 1,
      unchanged: true,
    });
  });
}

it("An event whose prevHash does not match the previous file's bytes", async () => {
  const { root, runId } = await readyRun();
  const third = path.join(runDirOf(root, runId), "journal", "000003.json");
  const event: unknown = JSON.parse(await readFile(third, "utf8"));
  const edited = {
    ...(typeof event === "object" && event !== null ? event : {}),
    prevHash: "0".repeat(64),
  };
  await writeFile(third, `${JSON.stringify(edited, null, 2)}\n`);

  expect(await integrityRefusal(root, runId)).toEqual({
    code: "hash-mismatch",
    exit: 1,
    unchanged: true,
  });
});

it("status on a journal with a torn event", async () => {
  const { root, runId } = await readyRun();
  await writeFile(path.join(runDirOf(root, runId), "journal", "000004.json"), "{");
  const before = await treeDigest(root);
  const status = workflow(root, ["status", "--run", runId]);

  expect({
    state: field(status.json, "run.state"),
    cause: field(status.json, "cause"),
    exit: status.status,
    unchanged: (await treeDigest(root)) === before,
  }).toEqual({ state: "failed", cause: "torn-event", exit: 0, unchanged: true });
});

it("A published event with a snapshot one sequence behind", async () => {
  const root = await minimalProject();
  const runId = await startRun(root);
  const snapshotFile = path.join(runDirOf(root, runId), "snapshot.json");
  const behind = await readFile(snapshotFile, "utf8");
  const issued = workflow(root, ["next", "--run", runId]);
  await writeFile(snapshotFile, behind);
  const again = workflow(root, ["next", "--run", runId]);
  const reflects = field(JSON.parse(await readFile(snapshotFile, "utf8")), "reflects");

  expect({
    same:
      field(again.json, "workOrder.workOrderId") === field(issued.json, "workOrder.workOrderId"),
    reflects,
    workOrders: await readdir(path.join(runDirOf(root, runId), "work-orders")),
  }).toEqual({
    same: true,
    reflects: field(issued.json, "run.sequence"),
    workOrders: [`${String(field(issued.json, "workOrder.workOrderId"))}.json`],
  });
});

it("Delete snapshot", async () => {
  const { root, runId } = await readyRun();
  const runDir = runDirOf(root, runId);
  const deleted = await readFile(path.join(runDir, "snapshot.json"), "utf8");
  const before = workflow(root, ["status", "--run", runId]).stdout;
  await rm(path.join(runDir, "snapshot.json"));
  const after = workflow(root, ["status", "--run", runId]).stdout;
  const journal = await readJournal(runDir);
  const rebuilt = await mkdtemp(path.join(os.tmpdir(), "qfai-rebuilt-"));
  const folded = journal.ok ? snapshotOf(journal.records) : null;
  if (folded) await writeSnapshot(rebuilt, folded);
  const copy = await readFile(path.join(rebuilt, "snapshot.json"), "utf8").catch(() => "");
  await rm(rebuilt, { recursive: true, force: true });

  expect({ status: after === before, rebuilt: copy === deleted }).toEqual({
    status: true,
    rebuilt: true,
  });
});

it("Files under work-orders/ that no event references, left by a crash at write step 4", async () => {
  const root = await minimalProject();
  const runId = await startRun(root);
  const workOrders = path.join(runDirOf(root, runId), "work-orders");
  await mkdir(workOrders, { recursive: true });
  await writeFile(path.join(workOrders, "work-order-route-1.json"), "left by a crash");
  await writeFile(path.join(workOrders, "work-order-stray-1.json"), "left by a crash");
  const issued = workflow(root, ["next", "--run", runId]);
  const status = workflow(root, ["status", "--run", runId]);
  const written: unknown = JSON.parse(
    await readFile(path.join(workOrders, "work-order-route-1.json"), "utf8"),
  );

  expect({
    issued: field(issued.json, "workOrder.workOrderId"),
    replaced: JSON.stringify(written) === JSON.stringify(field(issued.json, "workOrder")),
    stage: field(status.json, "stage"),
  }).toEqual({ issued: "work-order-route-1", replaced: true, stage: "route" });
});

it("Tracked files behind the journal after a crash at write step 6", async () => {
  const root = await minimalProject();
  const { runId } = await featureRunAt(root, "implement");
  const file = path.join(root, ".qfai", "evidence", "workflow", runId, "summary.json");
  const current: unknown = JSON.parse(await readFile(file, "utf8"));
  await writeFile(file, `${JSON.stringify({ runId, state: "ready" })}\n`);
  workflow(root, ["next", "--run", runId]);
  const rebuilt: unknown = JSON.parse(await readFile(file, "utf8"));
  const without = (summary: unknown) => ({
    ...(typeof summary === "object" ? summary : {}),
    updatedAt: "",
  });

  expect(without(rebuilt)).toEqual(without(current));
});

it("Built CLI status while", async () => {
  const { root, runId, routed } = await readyRun();
  await writeLock(root, { runId });
  const pending = String(Number(field(routed.json, "run.sequence")) + 1).padStart(6, "0");
  await writeFile(path.join(runDirOf(root, runId), "journal", `.${pending}.tmp`), "{}");
  const before = await treeDigest(runDirOf(root, runId));
  const status = workflow(root, ["status", "--run", runId]);

  expect({
    ok: field(status.json, "ok"),
    sequence: field(status.json, "run.sequence"),
    unchanged: (await treeDigest(runDirOf(root, runId))) === before,
  }).toEqual({ ok: true, sequence: field(routed.json, "run.sequence"), unchanged: true });
});
