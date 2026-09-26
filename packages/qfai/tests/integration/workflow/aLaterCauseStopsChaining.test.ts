// QFAI:AC-0001-0199-03
// QFAI:EX-0001-0199-07

import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import {
  DISCOVERY_PROPOSAL,
  field,
  minimalProject,
  removeProjects,
  resultFor,
  routedRun,
  submit,
  workflow,
} from "./workflowProject.js";

afterEach(removeProjects);

// Every journal event of the run, in sequence order.
async function journalOf(root: string, runId: string): Promise<unknown[]> {
  const dir = path.join(root, ".qfai", "run", runId, "journal");
  const names = (await readdir(dir)).filter((name) => name.endsWith(".json")).sort();
  return Promise.all(
    names.map(async (name): Promise<unknown> =>
      JSON.parse(await readFile(path.join(dir, name), "utf8")),
    ),
  );
}

it("A run in running", async () => {
  const root = await minimalProject("workflow:\n  mode: active\n");
  const config = await readFile(path.join(root, "qfai.config.yaml"));
  const { runId } = await routedRun(root);
  const issued = workflow(root, ["next", "--run", runId]);
  // A rule added under the assistant tree while the run is in flight.
  const rule = path.join(root, ".qfai", "assistant", "rule", "local-policy.md");
  await mkdir(path.dirname(rule), { recursive: true });
  await writeFile(rule, "# Local policy\n\nAdded outside the run.\n");
  const accepted = await submit(root, runId, "accept", resultFor(issued.json, "discussion-1"));
  const untouched = (await readFile(path.join(root, "qfai.config.yaml"))).equals(config);
  await rm(rule);
  workflow(root, ["resume", "--run", runId]);
  const cleared = (await journalOf(root, runId)).find(
    (event) => field(event, "event") === "blocker-cleared-and-revalidated",
  );

  expect({
    state: field(accepted.json, "run.state"),
    cause: field(accepted.json, "halt.cause"),
    untouched,
    cleared: [field(cleared, "from"), field(cleared, "to")],
  }).toEqual({
    state: "blocked",
    cause: "policy-drift",
    untouched: true,
    cleared: ["blocked", "ready"],
  });
});

it("The run edits qfai", async () => {
  const root = await minimalProject("workflow:\n  mode: active\n");
  const proposal = {
    ...DISCOVERY_PROPOSAL,
    proposedWriteScope: [...DISCOVERY_PROPOSAL.proposedWriteScope, "qfai.config.yaml"],
  };
  const { runId, routed } = await routedRun(root, proposal);
  const issued = workflow(root, ["next", "--run", runId]);
  const config = path.join(root, "qfai.config.yaml");
  const edited = "workflow:\n  mode: active\n# edited inside the run\n";
  await writeFile(config, edited);
  const accepted = await submit(root, runId, "accept", resultFor(issued.json, "discussion-1"));

  expect({
    routed: field(routed.json, "ok"),
    state: field(accepted.json, "run.state"),
    cause: field(accepted.json, "halt.cause"),
    config: await readFile(config, "utf8"),
  }).toEqual({ routed: true, state: "blocked", cause: "policy-drift", config: edited });
});
