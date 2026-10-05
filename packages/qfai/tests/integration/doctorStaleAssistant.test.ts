/**
 * Integration: `qfai doctor` warns, under `assistant.staleFiles`, about installed assistant files
 * that call a `qfai workflow` operation this CLI no longer has, and changes nothing.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createDoctorData } from "../../src/core/doctor.js";
import { useTempDirPool } from "../helpers/shippedWorkflowFixtures.js";

const newTempDir = useTempDirPool("qfai-doctor-stale-assistant-");

async function write(dir: string, relative: string, text: string): Promise<void> {
  const target = path.join(dir, ...relative.split("/"));
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, text, "utf-8");
}

async function staleFiles(dir: string) {
  const data = await createDoctorData({ startDir: dir, rootExplicit: true });
  return data.checks.find((entry) => entry.id === "assistant.staleFiles");
}

describe("doctor assistant.staleFiles", () => {
  // QFAI:AC-0003-0004-05
  // QFAI:EX-0003-0004-09
  it("warns about a file calling a retired operation and names init --force", async () => {
    const dir = await newTempDir();
    const skill = ".qfai/assistant/skill/qfai-run/SKILL.md";
    const text =
      "Read the mode from `npx qfai workflow status` first.\nThen `npx qfai workflow finish`.\n";
    await write(dir, skill, text);
    await write(
      dir,
      ".qfai/assistant/rule/other.md",
      "Run `npx qfai workflow plan --route fix`.\n",
    );

    const check = await staleFiles(dir);

    expect(check?.severity).toBe("warning");
    expect(check?.message).toContain("npx qfai init --force");
    expect(check?.details?.["files"]).toEqual([skill]);
    expect(check?.details?.["operations"]).toEqual(["finish", "status"]);
    expect(await readFile(path.join(dir, ...skill.split("/")), "utf-8")).toBe(text);
  });

  // QFAI:AC-0003-0004-06
  // QFAI:EX-0003-0004-10
  it("reports nothing when no file calls a retired operation", async () => {
    const dir = await newTempDir();
    await write(dir, ".qfai/assistant/skill/qfai-run/SKILL.md", "Run `npx qfai workflow plan`.\n");

    expect(await staleFiles(dir)).toBeUndefined();
  });

  // QFAI:AC-0003-0004-06
  // QFAI:EX-0003-0004-11
  it("reports nothing when the project has no assistant files", async () => {
    expect(await staleFiles(await newTempDir())).toBeUndefined();
  });
});
