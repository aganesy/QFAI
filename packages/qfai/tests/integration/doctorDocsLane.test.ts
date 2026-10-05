import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createDoctorData } from "../../src/core/doctor.js";
import { removeTempTree } from "../helpers/tempTree.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
});

const LANE = ".github/workflows/qfai-docs.yml";

async function project(withLane: boolean): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-docs-lane-"));
  roots.push(root);
  await writeFile(path.join(root, "qfai.config.yaml"), "paths:\n  specsDir: .qfai/spec\n", "utf-8");
  if (withLane) {
    await mkdir(path.join(root, ".github", "workflows"), { recursive: true });
    await writeFile(path.join(root, LANE), "name: qfai docs\n", "utf-8");
  }
  return root;
}

async function docsLane(root: string): Promise<{ severity: string; message: string } | undefined> {
  const data = await createDoctorData({ startDir: root, rootExplicit: true });
  return data.checks.find((check) => check.id === "workflows.docsLane");
}

describe("qfai doctor reports a missing document-schema lane", () => {
  // QFAI:EX-0003-0011-14
  it("warns when the lane is missing and names the copy to restore", async () => {
    // QFAI:AC-0003-0011-07
    const root = await project(false);

    const check = await docsLane(root);

    expect(check?.severity).toBe("error");
    expect(check?.message).toContain(LANE);
    expect(check?.message).toContain("qfai-docs.yml");
  });

  // QFAI:EX-0003-0011-14
  it("warns as well when the lane was installed and then removed", async () => {
    // QFAI:AC-0003-0011-07
    const root = await project(true);
    await rm(path.join(root, LANE));

    expect((await docsLane(root))?.severity).toBe("error");
  });

  // QFAI:EX-0003-0011-15
  it("is ok when the lane is present", async () => {
    // QFAI:AC-0003-0011-07
    const root = await project(true);

    expect((await docsLane(root))?.severity).toBe("ok");
  });
});
