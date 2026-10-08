import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createDoctorData } from "../../src/core/doctor.js";
import { getInitAssetsDir } from "../../src/shared/assets.js";
import { useAdopterTreePool } from "../helpers/doctorFixtures.js";

const pool = useAdopterTreePool();

const RULE = [".qfai", "assistant", "rule", "workflow.md"] as const;
const SKILL = [".qfai", "assistant", "skill", "qfai-sdd", "SKILL.md"] as const;

function packagedPath(segments: readonly string[]): string {
  return path.join(getInitAssetsDir(), ...segments);
}

async function driftFindings(
  root: string,
): Promise<{ id: string; severity: string; message: string }[]> {
  const data = await createDoctorData({ startDir: root, rootExplicit: true });
  return data.checks.filter((check) => check.id.startsWith("assistant.drift."));
}

describe("qfai doctor reports a shipped assistant file that differs from the shipped text", () => {
  // QFAI:EX-0003-0031-01
  it("warns for an edited file, names both copies and the remedy, and changes nothing", async () => {
    // QFAI:AC-0003-0031-01
    const root = await pool.seedAdopterTree();
    const installedFile = path.join(root, ...RULE);
    const edited = `${await readFile(packagedPath(RULE), "utf-8")}\nA local edit.\n`;
    await writeFile(installedFile, edited, "utf-8");

    const found = await driftFindings(root);

    expect(found).toHaveLength(1);
    expect(found[0]?.id).toBe("assistant.drift.rule/workflow.md");
    expect(found[0]?.severity).toBe("warning");
    expect(found[0]?.message).toContain(".qfai/assistant/rule/workflow.md");
    expect(found[0]?.message).toContain(packagedPath(RULE));
    expect(found[0]?.message).toContain("qfai init --force");
    expect(await readFile(installedFile, "utf-8")).toBe(edited);
  });

  // QFAI:EX-0003-0031-01
  it("warns once for each edited file", async () => {
    // QFAI:AC-0003-0031-01
    const root = await pool.seedAdopterTree();
    await writeFile(path.join(root, ...SKILL), "edited\n", "utf-8");
    await writeFile(path.join(root, ...RULE), "edited\n", "utf-8");

    const found = await driftFindings(root);

    expect(found.map((check) => check.id)).toEqual([
      "assistant.drift.skill/qfai-sdd/SKILL.md",
      "assistant.drift.rule/workflow.md",
    ]);
  });

  // QFAI:EX-0003-0031-02
  it("raises nothing for a fresh install, converted line endings or a missing file", async () => {
    // QFAI:AC-0003-0031-01
    const root = await pool.seedAdopterTree();
    expect(await driftFindings(root)).toEqual([]);

    const shipped = await readFile(packagedPath(SKILL), "utf-8");
    await writeFile(path.join(root, ...SKILL), shipped.replace(/\r?\n/g, "\r\n"), "utf-8");
    await rm(path.join(root, ...RULE));

    expect(await driftFindings(root)).toEqual([]);
  });

  // QFAI:EX-0003-0031-03
  it("raises nothing for files the package does not ship", async () => {
    // QFAI:AC-0003-0031-01
    const root = await pool.seedAdopterTree();
    const assistant = path.join(root, ".qfai", "assistant");
    await writeFile(path.join(assistant, "rule", "workflow.local.md"), "# Local\n", "utf-8");
    await writeFile(path.join(assistant, "agent", "own-reviewer.md"), "# Own\n", "utf-8");
    await mkdir(path.join(assistant, "skill.local", "own-skill"), { recursive: true });
    await writeFile(
      path.join(assistant, "skill.local", "own-skill", "SKILL.md"),
      "# Own skill\n",
      "utf-8",
    );

    expect(await driftFindings(root)).toEqual([]);
  });
});
