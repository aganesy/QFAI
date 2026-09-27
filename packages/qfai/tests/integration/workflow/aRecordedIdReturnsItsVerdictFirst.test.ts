// QFAI:SPEC-0018:TC-0018-0056

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import {
  FEATURE_PROPOSAL,
  field,
  minimalProject,
  removeProjects,
  resultFor,
  startRun,
  submit,
  workflow,
} from "./workflowProject.js";

afterEach(removeProjects);

async function journalBytes(root: string, runId: string): Promise<string> {
  const dir = path.join(root, ".qfai", "runs", runId, "journal");
  const names = (await readdir(dir)).sort();
  const files = await Promise.all(names.map((name) => readFile(path.join(dir, name), "utf8")));
  return files.join("\n");
}

it("TC-0018-0056 (TDD-0308): Built CLI", async () => {
  const root = await minimalProject();
  const runId = await startRun(root);
  const routing = workflow(root, ["next", "--run", runId]);
  const result = resultFor(routing.json, "route-1", { proposal: FEATURE_PROPOSAL });
  const first = await submit(root, runId, "accept", result);
  const afterFirst = await journalBytes(root, runId);

  const again = await submit(root, runId, "accept", result);
  const afterAgain = await journalBytes(root, runId);
  const stale = await submit(root, runId, "accept", { ...result, resultId: "route-2" });
  const afterStale = await journalBytes(root, runId);

  expect({
    replay: [again.status, again.json === undefined ? null : again.stdout === first.stdout],
    stale: [stale.status, field(stale.json, "error.code")],
    journal: [afterAgain === afterFirst, afterStale === afterFirst],
  }).toEqual({ replay: [0, true], stale: [2, "stale-sequence"], journal: [true, true] });
});
