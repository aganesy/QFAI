// QFAI:AC-0001-0203-05
// QFAI:EX-0001-0203-14
// QFAI:EX-0001-0203-15

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, it } from "vitest";

import { validateProject } from "../../../src/core/validate.js";

// The `QFAI_CONFIG_INVALID` issues `qfai validate` reports for `workflow.mode` under `config`.
async function modeIssues(config: string) {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-workflow-mode-"));
  try {
    await writeFile(path.join(root, "qfai.config.yaml"), config, "utf-8");
    const { issues } = await validateProject(root);
    return issues
      .filter((issue) => issue.code === "QFAI_CONFIG_INVALID")
      .filter((issue) => issue.message.includes("workflow.mode"))
      .map(({ severity, message }) => ({ severity, message }));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

it("A workflow mode that is none of the three is one error naming all three", async () => {
  const issues = await modeIssues("workflow:\n  mode: always\n");

  expect(issues).toHaveLength(1);
  const [issue] = issues;
  expect(issue?.severity).toBe("error");
  for (const word of ["workflow.mode", "active", "shadow", "off"]) {
    expect(issue?.message).toContain(word);
  }
});

it("No key, shadow and off raise no workflow mode issue", async () => {
  for (const config of ["{}\n", "workflow:\n  mode: shadow\n", "workflow:\n  mode: off\n"]) {
    expect(await modeIssues(config), config).toEqual([]);
  }
});
