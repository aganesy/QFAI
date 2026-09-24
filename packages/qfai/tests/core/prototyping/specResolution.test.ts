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
import {
  checkUiContractsCoveredDrift,
  readUiContractsCovered,
} from "../../../src/core/prototyping/specsCovered.js";

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
      require: { specSections: [] },
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
  it("uses declared CON-UI IDs with screens across nested yaml and yml files", async () => {
    const root = await fixtureRoot();
    await uiContract(root, "nested/checkout.yml", "CON-UI-0042", "[{id: checkout}]");
    await uiContract(root, "home.yaml", "CON-UI-0001", "[{id: home}]");
    await uiContract(root, "empty.yaml", "CON-UI-0007", "[]");
    await uiContract(root, "wrong.yaml", "CON-API-0009", "[{id: api}]");

    expect(await resolveAllUiBearingSpecs(root, config())).toEqual(["CON-UI-0001", "CON-UI-0042"]);
    expect(
      (await readUiContractInventory(root, config())).find(
        (entry) => entry.uiContractId === "CON-UI-0042",
      ),
    ).toMatchObject({
      screenIds: ["checkout"],
      contractPath: ".qfai/spec/03_contract/ui/nested/checkout.yml",
    });
    expect(await resolvePrimaryPrototypingSpec(root, config())).toEqual({
      uiContractId: "CON-UI-0001",
      contractPath: ".qfai/spec/03_contract/ui/home.yaml",
      source: "contract-scan",
    });
  });

  it("honours a full primary pin only when that contract has screens", async () => {
    const root = await fixtureRoot();
    await uiContract(root, "home.yaml", "CON-UI-0001", "[{id: home}]");
    await uiContract(root, "detail.yaml", "CON-UI-0042", "[{id: detail}]");
    expect((await resolvePrimaryPrototypingSpec(root, config("CON-UI-0042")))?.uiContractId).toBe(
      "CON-UI-0042",
    );
    expect(await resolvePrimaryPrototypingSpec(root, config("CON-UI-9999"))).toBeUndefined();
  });

  it("does not infer UI-bearing from a spec marker or file name", async () => {
    const root = await fixtureRoot();
    const spec = path.join(root, ".qfai/spec/spec-0001/01_Spec.md");
    await mkdir(path.dirname(spec), { recursive: true });
    await writeFile(spec, "---\nsurface_type: ui-bearing\n---\n# Prototyping\n", "utf-8");
    await uiContract(root, "spec-0001.yaml", "CON-UI-0001", "[]");
    expect(await resolveAllUiBearingSpecs(root, config())).toEqual([]);
  });
});

describe("frozen UI contract scope", () => {
  it("rejects old fields, absent arrays, and unsafe IDs", () => {
    expect(readUiContractsCovered({ specsCovered: ["0001"] })).toEqual({ kind: "legacy" });
    expect(
      readUiContractsCovered({ frozenSpecsCovered: ["0001"], uiContractsCovered: ["CON-UI-0001"] }),
    ).toEqual({ kind: "legacy" });
    expect(readUiContractsCovered({ uiContractsCovered: [] }).kind).toBe("malformed");
    expect(readUiContractsCovered({ uiContractsCovered: ["../CON-UI-0001"] }).kind).toBe(
      "malformed",
    );
  });

  it("compares one frozen full-ID set with a live snapshot", () => {
    const frozen = readUiContractsCovered({ uiContractsCovered: ["CON-UI-0001", "CON-UI-0007"] });
    expect(frozen.kind).toBe("ok");
    if (frozen.kind !== "ok") return;
    expect(checkUiContractsCoveredDrift(frozen.value, ["CON-UI-0007", "CON-UI-0042"])).toEqual({
      drifted: true,
      added: ["CON-UI-0042"],
      removed: ["CON-UI-0001"],
    });
  });
});
