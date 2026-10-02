// QFAI:AC-0001-0189-07
// QFAI:EX-0001-0189-19

import { rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import { hashAssistantAssetText } from "../../../src/core/assistantAssetProvenance.js";
import { field, removeProjects, workflow, write } from "../../e2e/workflowJourney.js";
import { EXAMPLE_IDS, REPORT, diagnosed, flowProject } from "./acceptanceRuns.js";

afterEach(removeProjects);

it("The sdd_append work order names the reproduction record, and a repeated next names its current digest", async () => {
  const root = await flowProject();
  const { runId, next } = await diagnosed(root, {
    verdict: "missing-test",
    matchedIds: [EXAMPLE_IDS[0]],
  });
  const reproduction = "Reproduced again, with the failing input.\r\n";
  await write(root, REPORT, reproduction);
  const repeated = workflow(root, ["next", "--run", runId]);

  expect({
    stageKind: field(next.json, "workOrder.stageKind"),
    issued: field(next.json, "workOrder.inputs"),
    repeated: field(repeated.json, "workOrder.inputs"),
  }).toEqual({
    stageKind: "sdd_append",
    issued: [
      { path: REPORT, digest: hashAssistantAssetText("Reproduced, re-run and reviewed.\n") },
    ],
    repeated: [{ path: REPORT, digest: hashAssistantAssetText(reproduction) }],
  });
}, 300_000);

it("A reproduction record outside the project is not read, so the work order names no input", async () => {
  const root = await flowProject();
  const outside = path.join(path.dirname(root), `outside-${path.basename(root)}.md`);
  await writeFile(outside, "Not part of the project.\n");
  try {
    const { next } = await diagnosed(root, {
      verdict: "missing-test",
      reproductionRef: `../${path.basename(outside)}`,
      matchedIds: [EXAMPLE_IDS[0]],
    });

    expect([field(next.json, "workOrder.stageKind"), field(next.json, "workOrder.inputs")]).toEqual(
      ["sdd_append", []],
    );
  } finally {
    await rm(outside, { force: true });
  }
}, 300_000);
