import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { QfaiConfig } from "../../../src/core/config.js";
import {
  readUiContractInventory,
  resolveAllUiBearingSpecs,
  resolvePrimaryPrototypingSpec,
} from "../../../src/core/prototyping/specResolution.js";

const roots: string[] = [];

async function fixtureRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-ui-contract-resolution-"));
  roots.push(root);
  return root;
}

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

function config(primaryUiContract?: string): QfaiConfig {
  return {
    paths: {
      contractsDir: ".qfai/spec/03_contract",
      specsDir: ".qfai/spec",
      discussionDir: ".qfai/discussion",
      outDir: ".qfai/out",
      skillsDir: ".qfai/assistant/skill",
      promptsDir: ".qfai/assistant/prompt",
      srcDir: "src",
      testsDir: "tests",
    },
    validation: {
      failOn: "error",
      testStrategy: {
        requireLayerTags: false,
        requireSizeTags: false,
        forbidTestTodoStubs: true,
      },
      traceability: {
        testFileGlobs: [],
        testFileExcludeGlobs: [],
      },
    },
    output: { validateJsonPath: ".qfai/report/validate.json" },
    prototyping: primaryUiContract ? { primaryUiContract } : {},
  };
}

async function uiContract(
  root: string,
  relative: string,
  id: string,
  screens: string,
): Promise<void> {
  const file = path.join(root, ".qfai/spec/03_contract/ui", relative);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `# QFAI-CONTRACT-ID: ${id}\nscreens: ${screens}\n`, "utf-8");
}

describe("UI contract prototyping scope", () => {
  // QFAI:EX-0001-0114-03
  it("uses declared UI IDs with screens across nested yaml and yml files", async () => {
    const root = await fixtureRoot();
    await uiContract(root, "nested/checkout.yml", "UI-0042", "[{id: checkout}]");
    await uiContract(root, "home.yaml", "UI-0001", "[{id: home}]");
    await uiContract(root, "empty.yaml", "UI-0007", "[]");
    await uiContract(root, "wrong.yaml", "API-0009", "[{id: api}]");

    expect(await resolveAllUiBearingSpecs(root, config())).toEqual(["UI-0001", "UI-0042"]);
    expect(
      (await readUiContractInventory(root, config())).find(
        (entry) => entry.uiContractId === "UI-0042",
      ),
    ).toMatchObject({
      screenIds: ["checkout"],
      contractPath: ".qfai/spec/03_contract/ui/nested/checkout.yml",
    });
    expect(await resolvePrimaryPrototypingSpec(root, config())).toEqual({
      uiContractId: "UI-0001",
      contractPath: ".qfai/spec/03_contract/ui/home.yaml",
      source: "contract-scan",
    });
  });

  it("honours a full primary pin only when that contract has screens", async () => {
    const root = await fixtureRoot();
    await uiContract(root, "home.yaml", "UI-0001", "[{id: home}]");
    await uiContract(root, "detail.yaml", "UI-0042", "[{id: detail}]");
    expect((await resolvePrimaryPrototypingSpec(root, config("UI-0042")))?.uiContractId).toBe(
      "UI-0042",
    );
    expect(await resolvePrimaryPrototypingSpec(root, config("UI-9999"))).toBeUndefined();
  });

  // QFAI:EX-0001-0114-01
  it("does not infer UI-bearing from a spec marker or file name", async () => {
    const root = await fixtureRoot();
    const spec = path.join(root, ".qfai/spec/spec-0001/01_Spec.md");
    await mkdir(path.dirname(spec), { recursive: true });
    await writeFile(spec, "---\nsurface_type: ui-bearing\n---\n# Prototyping\n", "utf-8");
    await uiContract(root, "spec-0001.yaml", "UI-0001", "[]");
    expect(await resolveAllUiBearingSpecs(root, config())).toEqual([]);
  });
});
