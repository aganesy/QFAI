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
      contractsDir: ".qfai/spec/03_contract",
      specsDir: ".qfai/spec",
      discussionDir: ".qfai/discussion",
      outDir: ".qfai/out",
      skillsDir: ".qfai/assistant/skill",
      promptsDir: ".qfai/assistant/skill",
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

async function seedUiContract(root: string, contractId: string): Promise<void> {
  const dir = path.join(root, ".qfai", "spec", "03_contract", "ui");
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, `ui-${contractId}.yaml`),
    `# QFAI-CONTRACT-ID: CON-UI-${contractId}\nscreens:\n  - id: home\n`,
    "utf-8",
  );
}

async function seedPrototypingJson(root: string, uiContractsCovered: unknown[]): Promise<void> {
  const dir = path.join(root, ".qfai", "evidence", "prototyping");
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "prototyping.json"),
    JSON.stringify({ uiContractsCovered, iterations: [] }),
    "utf-8",
  );
}

describe("validateSpecIdLinkage", () => {
  it("returns no issues when prototyping.json is missing", async () => {
    const root = await newTempDir();
    await seedUiContract(root, "0001");

    const issues = await validateSpecIdLinkage(root, makeConfig());
    expect(issues).toEqual([]);
  });

  it("accepts UI contract IDs that declare screens", async () => {
    const root = await newTempDir();
    await seedUiContract(root, "0001");
    await seedPrototypingJson(root, ["CON-UI-0001"]);

    const issues = await validateSpecIdLinkage(root, makeConfig());
    expect(issues).toEqual([]);
  });

  it("emits QFAI-PROT-008 when the frozen UI contract is missing", async () => {
    const root = await newTempDir();
    await seedUiContract(root, "0001");
    await seedPrototypingJson(root, ["CON-UI-9999"]);

    const issues = await validateSpecIdLinkage(root, makeConfig());
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-PROT-008");
    expect(issues[0]?.message).toContain("CON-UI-9999");
  });

  it("emits QFAI-PROT-008 when a UI contract ID is malformed", async () => {
    const root = await newTempDir();
    await seedUiContract(root, "0001");
    await seedPrototypingJson(root, ["abc"]);

    const issues = await validateSpecIdLinkage(root, makeConfig());
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-PROT-008");
  });

  it("rejects the retired specsCovered field", async () => {
    const root = await newTempDir();
    await seedUiContract(root, "0001");
    const dir = path.join(root, ".qfai", "evidence", "prototyping");
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, "prototyping.json"),
      JSON.stringify({ specsCovered: ["0001"], iterations: [] }),
      "utf-8",
    );

    const issues = await validateSpecIdLinkage(root, makeConfig());
    expect(issues.map((issue) => issue.code)).toEqual(["QFAI-PROT-008"]);
  });
});
