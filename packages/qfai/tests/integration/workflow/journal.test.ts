// QFAI:SPEC-0018:TC-0018-0106
// QFAI:SPEC-0018:TC-0018-0234
// QFAI:SPEC-0018:TC-0018-0237
// QFAI:SPEC-0018:TC-0018-0242

import { spawnSync } from "node:child_process";
import { createHash, createHmac } from "node:crypto";
import { existsSync } from "node:fs";
import { readdir, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import {
  featureRunAt,
  field,
  inbox,
  minimalProject,
  removeProjects,
  resultFor,
  START_INPUT,
  startRun,
  submit,
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
  const journal = path.join(root, ".qfai", "runs", runId, "journal");
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

it("TC-0018-0234 (TDD-0451): Built CLI run with a distinctive request sentence under a temp root", async () => {
  const root = await minimalProject();
  const sentence = "Paint the zebra crossing ultraviolet at dawn.";
  const input = { ...START_INPUT, request: { text: sentence } };
  const { runId } = await featureRunAt(root, "implement", input);
  const tracked = await filesUnder(path.join(root, ".qfai", "evidence", "workflow", runId));
  const real = await realpath(root);
  const roots = [root, real, root.split(path.sep).join("/"), real.split(path.sep).join("/")];
  const escaped = roots.map((each) => JSON.stringify(each).slice(1, -1));
  const privateCopy: unknown = JSON.parse(
    await readFile(path.join(root, ".qfai", "runs", runId, "request.private.json"), "utf8"),
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
  }).toEqual({ files: true, sentence: false, root: false, keyed: true, bare: false });
});

it("TC-0018-0237 (TDD-0454): Built CLI run from start to finish on a temp project", async () => {
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
    outsideRuns: written.filter((file) => !file.startsWith(".qfai/runs/")),
    stateFile: existsSync(path.join(root, ".qfai", "state.json")),
  }).toEqual({ finished: "string", outsideRuns: [], stateFile: false });
});

it("TC-0018-0242 (TDD-0471): the tracked summary copies nothing of settled", async () => {
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
  ["TC-0018-0106 (TDD-0319): next", ["next"]],
  ["TC-0018-0106 (TDD-0320): accept", ["accept", "--in"]],
  ["TC-0018-0106 (TDD-0321): decision", ["decision", "--in"]],
  ["TC-0018-0106 (TDD-0322): status", ["status"]],
  ["TC-0018-0106 (TDD-0323): resume", ["resume"]],
  ["TC-0018-0106 (TDD-0324): finish", ["finish"]],
  ["TC-0018-0106 (TDD-0325): start", ["start"]],
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
