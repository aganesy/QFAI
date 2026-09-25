// QFAI:AC-0001-0192-05
// QFAI:EX-0001-0192-11

import { readFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import {
  field,
  inbox,
  minimalProject,
  removeProjects,
  START_INPUT,
  treeDigest,
  workflow,
} from "./workflowProject.js";

afterEach(removeProjects);

async function eventOf(root: string, runId: string, name: string): Promise<unknown> {
  const text = await readFile(path.join(root, ".qfai", "run", runId, "journal", name), "utf8");
  return field(JSON.parse(text), "event");
}

it("Built CLI start on a temp repo in mode active", async () => {
  const root = await minimalProject();
  const input = await inbox(root, null, "start", START_INPUT);
  const outside = (rel: string) => rel.startsWith(".qfai/run/");
  const before = await treeDigest(root, outside);

  const started = workflow(root, ["start", "--in", input]);
  const runId = String(field(started.json, "run.id"));

  expect({
    exit: started.status,
    state: field(started.json, "run.state"),
    first: await eventOf(root, runId, "000001.json").catch(() => undefined),
    second: await eventOf(root, runId, "000002.json").catch(() => undefined),
    outsideUnchanged: (await treeDigest(root, outside)) === before,
  }).toEqual({
    exit: 0,
    state: "routing",
    first: "run-created",
    second: "capture-request",
    outsideUnchanged: true,
  });
});
