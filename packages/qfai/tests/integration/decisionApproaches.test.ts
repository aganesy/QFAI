import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateProject } from "../../src/core/validate.js";

let root: string;
const specs = ".qfai/spec";

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-decision-approaches-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function put(file: string, text: string): Promise<void> {
  const target = path.join(root, file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, text, "utf8");
}

async function approachFindings(rows: string[]) {
  await put(
    `${specs}/decisions.md`,
    [
      "# Decisions",
      "",
      "## Decisions",
      "",
      "| ID | Content | Approach | Status |",
      "| --- | --- | --- | --- |",
      ...rows,
      "",
    ].join("\n"),
  );
  const config = structuredClone(defaultConfig);
  config.paths.specsDir = specs;
  config.paths.contractsDir = `${specs}/03_contract`;
  const result = await validateProject(
    root,
    { config, issues: [], configPath: path.join(root, "qfai.config.yaml") },
    { profile: "sdd" },
  );
  return result.issues.filter((item) => item.code === "QFAI-STORY-017");
}

describe("the Approach cell of a decision row above the checked ID", () => {
  // QFAI:AC-0001-0053-08
  // QFAI:EX-0001-0053-09
  it("is reported as an error naming the row when an item is missing", async () => {
    const findings = await approachFindings([
      "| DEC-2098 | Decide | - Evidence: file:a.ts - Residual risk: x - Rollback: y | DONE |",
    ]);
    expect(findings.map((item) => [item.refs, item.severity])).toEqual([[["DEC-2098"], "error"]]);
    expect(findings[0]?.message).toContain("lacks the item Grounds");
  });

  // QFAI:AC-0001-0053-08
  // QFAI:EX-0001-0053-12
  it("passes a complete row and leaves an earlier row unread", async () => {
    const findings = await approachFindings([
      "| DEC-0008 | Old | Kept | DONE |",
      "| DEC-2097 | Old | Kept | DONE |",
      "| DEC-2098 | Decide | - Evidence: file:a.ts - Grounds: g - Residual risk: none — read-only - Rollback: none — nothing to undo | DONE |",
    ]);
    expect(findings).toEqual([]);
  });
});
