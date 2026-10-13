import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createDoctorData } from "../../src/core/doctor.js";
import { getInitAssetsDir } from "../../src/shared/assets.js";
import { removeTempTree } from "../helpers/tempTree.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
});

const SHIPPED = ["qfai-docs.yml", "qfai-tests.yml", "qfai-validate.yml"] as const;

function packagedPath(name: string): string {
  return path.join(getInitAssetsDir(), "root", ".github", "workflows", name);
}

async function project(installed: Record<string, string>): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-workflow-drift-"));
  roots.push(root);
  await writeFile(path.join(root, "qfai.config.yaml"), "paths:\n  specsDir: .qfai/spec\n", "utf-8");
  await mkdir(path.join(root, ".github", "workflows"), { recursive: true });
  for (const [name, text] of Object.entries(installed)) {
    await writeFile(path.join(root, ".github", "workflows", name), text, "utf-8");
  }
  return root;
}

async function driftFindings(
  root: string,
): Promise<{ id: string; severity: string; message: string }[]> {
  const data = await createDoctorData({ startDir: root, rootExplicit: true });
  return data.checks.filter((check) => check.id.startsWith("workflows.drift"));
}

describe("qfai doctor reports a shipped workflow that differs from the shipped text", () => {
  // QFAI:EX-0003-0011-25
  it("warns for an edited workflow, names the shipped file to copy from and changes nothing", async () => {
    // QFAI:AC-0003-0011-11
    const shipped = await readFile(packagedPath("qfai-validate.yml"), "utf-8");
    const edited = `${shipped}# a local edit\n`;
    const root = await project({
      "qfai-docs.yml": await readFile(packagedPath("qfai-docs.yml"), "utf-8"),
      "qfai-validate.yml": edited,
    });

    const found = await driftFindings(root);

    expect(found).toHaveLength(1);
    expect(found[0]?.id).toBe("workflows.drift.qfai-validate");
    expect(found[0]?.severity).toBe("warning");
    expect(found[0]?.message).toContain(".github/workflows/qfai-validate.yml");
    expect(found[0]?.message).toContain(packagedPath("qfai-validate.yml"));
    expect(
      await readFile(path.join(root, ".github", "workflows", "qfai-validate.yml"), "utf-8"),
    ).toBe(edited);
  });

  // QFAI:EX-0003-0011-31
  it("counts the lines that differ and names no job for a change outside the jobs", async () => {
    // QFAI:AC-0003-0011-14
    const shipped = await readFile(packagedPath("qfai-validate.yml"), "utf-8");
    const root = await project({ "qfai-validate.yml": `${shipped}# a local edit\n` });

    const [found] = await driftFindings(root);

    expect(found?.message).toContain(
      "in 1 line (1 only in the installed file, 0 only in the shipped copy). Doctor changes nothing.",
    );
    expect(found?.message).not.toContain("jobs that differ");
    expect(found?.message).toContain("that replaces every local change");
  });

  // QFAI:EX-0003-0011-31
  it("names the job whose definition differs", async () => {
    // QFAI:AC-0003-0011-14
    const shipped = await readFile(packagedPath("qfai-docs.yml"), "utf-8");
    const stale = "    timeout-minutes: 15\n";
    expect(shipped).toContain(stale);
    const root = await project({
      "qfai-docs.yml": shipped.replace(stale, "    timeout-minutes: 45\n"),
    });

    const [found] = await driftFindings(root);

    expect(found?.message).toContain(
      "in 2 lines (1 only in the installed file, 1 only in the shipped copy); jobs that differ: checks.",
    );
  });

  // QFAI:EX-0003-0011-31
  it("names every shipped job when the installed file defines none of them", async () => {
    // QFAI:AC-0003-0011-14
    const root = await project({ "qfai-tests.yml": "name: edited\n" });

    const [found] = await driftFindings(root);

    expect(found?.id).toBe("workflows.drift.qfai-tests");
    expect(found?.message).toMatch(
      /\(1 only in the installed file, \d+ only in the shipped copy\)/,
    );
    expect(found?.message).toContain("jobs that differ: ");
  });

  // QFAI:EX-0003-0011-25
  it("warns once for each edited workflow", async () => {
    // QFAI:AC-0003-0011-11
    const root = await project(Object.fromEntries(SHIPPED.map((name) => [name, "name: edited\n"])));

    const found = await driftFindings(root);

    expect(found.map((check) => check.id)).toEqual([
      "workflows.drift.qfai-docs",
      "workflows.drift.qfai-tests",
      "workflows.drift.qfai-validate",
    ]);
  });

  // QFAI:EX-0003-0011-26
  it("raises nothing for an identical workflow, one with converted line endings, or an absent one", async () => {
    // QFAI:AC-0003-0011-11
    const tests = await readFile(packagedPath("qfai-tests.yml"), "utf-8");
    const root = await project({
      "qfai-docs.yml": await readFile(packagedPath("qfai-docs.yml"), "utf-8"),
      "qfai-tests.yml": tests.replace(/\r?\n/g, "\r\n"),
    });

    expect(await driftFindings(root)).toEqual([]);
  });
});
