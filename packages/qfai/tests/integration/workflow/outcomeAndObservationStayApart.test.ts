// QFAI:SPEC-0018:TC-0018-0050

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import { hashAssistantAssetText } from "../../../src/core/assistantAssetProvenance.js";
import {
  featureRunAt,
  field,
  minimalProject,
  removeProjects,
  resultFor,
  submit,
} from "./workflowProject.js";

afterEach(removeProjects);

it("TC-0018-0050 (TDD-0307): Built CLI accept of a verify result naming its verify", async () => {
  const root = await minimalProject();
  const { runId, issued } = await featureRunAt(root, "verify");
  const report = `${JSON.stringify({ status: "PASS", scope: "full" }, null, 2)}\r\n`;
  await mkdir(path.join(root, ".qfai", "report"), { recursive: true });
  await writeFile(path.join(root, ".qfai", "report", "verify.json"), report);
  const accepted = await submit(
    root,
    runId,
    "accept",
    resultFor(issued.json, "verify-1", {
      artifactRefs: [{ path: ".qfai/report/verify.json", digest: hashAssistantAssetText(report) }],
    }),
  );
  const copy = path.join(root, ".qfai", "runs", runId, "reports", "verify", "verify.json");

  expect({
    ok: field(accepted.json, "ok"),
    copy: await readFile(copy, "utf8").catch(() => null),
  }).toEqual({ ok: true, copy: report });
});
