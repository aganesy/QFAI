import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { QfaiConfig } from "../../../src/core/config.js";
import { validateSpecIdLinkage } from "../../../src/core/validators/prototyping/specIdLinkage.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-spec-link-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

function makeConfig(): QfaiConfig {
  return {
    paths: {
      contractsDir: ".qfai/contracts",
      specsDir: ".qfai/specs",
      discussionDir: ".qfai/discussion",
      outDir: ".qfai/out",
      skillsDir: ".qfai/assistant/skills",
      promptsDir: ".qfai/assistant/skills",
      srcDir: "src",
      testsDir: "tests",
    },
    validation: {
      failOn: "error",
      require: { specSections: [] },
      testStrategy: {
        requireApiAtdd: false,
        requireE2eAtdd: false,
        requireIntegrationAtdd: false,
        requireUnitTdd: false,
        requireSpecTagBlock: false,
        requireRoutingProfile: false,
      },
    },
    output: {
      validateJsonPath: ".qfai/report/validate.json",
    },
  };
}

async function seedSpec(root: string, specId: string): Promise<void> {
  const dir = path.join(root, ".qfai", "specs", `spec-${specId}`);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "01_Spec.md"), `# Spec ${specId}\n`, "utf-8");
}

async function seedPrototypingJson(root: string, specsCovered: unknown[]): Promise<void> {
  const dir = path.join(root, ".qfai", "evidence", "prototyping");
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "prototyping.json"),
    JSON.stringify({ specsCovered, iterations: [] }),
    "utf-8",
  );
}

describe("validateSpecIdLinkage", () => {
  it("returns no issues when prototyping.json is missing", async () => {
    const root = await newTempDir();
    await seedSpec(root, "0001");

    const issues = await validateSpecIdLinkage(root, makeConfig());
    expect(issues).toEqual([]);
  });

  it("accepts specsCovered entries that reference existing specs", async () => {
    const root = await newTempDir();
    await seedSpec(root, "0001");
    await seedPrototypingJson(root, ["0001", "spec-0001"]);

    const issues = await validateSpecIdLinkage(root, makeConfig());
    expect(issues).toEqual([]);
  });

  it("emits QFAI-PROT-008 when specsCovered references a missing spec", async () => {
    const root = await newTempDir();
    await seedSpec(root, "0001");
    await seedPrototypingJson(root, ["9999"]);

    const issues = await validateSpecIdLinkage(root, makeConfig());
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-PROT-008");
    expect(issues[0]?.message).toContain("spec-9999");
  });

  it("emits QFAI-PROT-008 when specsCovered has a malformed spec id", async () => {
    const root = await newTempDir();
    await seedSpec(root, "0001");
    await seedPrototypingJson(root, ["abc"]);

    const issues = await validateSpecIdLinkage(root, makeConfig());
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-PROT-008");
  });
});
