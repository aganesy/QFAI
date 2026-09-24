import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { parseRecordTable } from "../../../../src/core/storyTree/tables.js";
import {
  executePlannedStep,
  type MigrationContext,
} from "../../../../src/migration/specToStory/harness.js";
import { step02 } from "../../../../src/migration/specToStory/step02MergeTables.js";

const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

async function fixture(): Promise<MigrationContext> {
  const root = await mkdtemp(path.join(tmpdir(), "qfai-migration-records-"));
  roots.push(root);
  const specsDir = path.join(root, ".qfai", "spec");
  await mkdir(path.join(specsDir, "_policies"), { recursive: true });
  return {
    root,
    specsDir,
    contractsDir: path.join(specsDir, "03_contract"),
    config: {} as MigrationContext["config"],
  };
}

async function run(
  context: MigrationContext,
): Promise<{ code: number; output: string; error: string }> {
  let output = "";
  let error = "";
  const code = await executePlannedStep(step02, context, false, {
    stdout: {
      write: (value) => {
        output += value;
      },
    },
    stderr: {
      write: (value) => {
        error += value;
      },
    },
  });
  return { code, output, error };
}

describe("migration decision table merge", () => {
  it("keeps suffixed legacy IDs distinct and reruns without changing the table", async () => {
    const context = await fixture();
    await writeFile(
      path.join(context.specsDir, "_policies", "08_Decisions.md"),
      "# Decisions\n\n### DR-0106: First\n\n- Status: accepted\n\n### DR-0106-A: Amendment\n\n- Status: accepted\n\n### DR-0107: Second\n\n- Status: accepted\n\n### DR-0107-A: Amendment\n\n- Status: accepted\n",
      "utf8",
    );

    const first = await run(context);
    expect(first.code).toBe(0);
    const target = path.join(context.specsDir, "decisions.md");
    const original = await readFile(target, "utf8");
    const parsed = parseRecordTable(original, "decisions");
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows.map((row) => row.id)).toEqual([
      "DEC-0001",
      "DEC-0002",
      "DEC-0003",
      "DEC-0004",
    ]);
    expect(parsed.rows.map((row) => row.content)).toEqual([
      ".qfai/spec/_policies/08_Decisions.md#DR-0106: First",
      ".qfai/spec/_policies/08_Decisions.md#DR-0106-A: Amendment",
      ".qfai/spec/_policies/08_Decisions.md#DR-0107: Second",
      ".qfai/spec/_policies/08_Decisions.md#DR-0107-A: Amendment",
    ]);

    const second = await run(context);
    expect(second.code).toBe(0);
    expect(second.output).toContain("## Operations\nnone");
    expect(await readFile(target, "utf8")).toBe(original);
  });

  it("names an invalid existing row before writing", async () => {
    const context = await fixture();
    await writeFile(
      path.join(context.specsDir, "decisions.md"),
      "# Decisions\n\n| ID | Content | Approach | Status |\n| --- | --- | --- | --- |\n| DEC-0001 | First | - | DONE |\n| DEC-0001 | Second | - | DONE |\n",
      "utf8",
    );

    const result = await run(context);
    expect(result.code).toBe(2);
    expect(result.error).toContain("decisions declares DEC-0001 more than once");
  });
});
