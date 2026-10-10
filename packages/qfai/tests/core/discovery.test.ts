import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  collectApiContractFiles,
  collectDbContractFiles,
  collectUiContractFiles,
  collectThemaContractFiles,
} from "../../src/core/discovery.js";

describe("collectContractFiles", () => {
  it("collects contract files by allowed extensions", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-contracts-"));
    const uiRoot = path.join(root, ".qfai", "contracts", "ui");
    const apiRoot = path.join(root, ".qfai", "contracts", "api");
    const dbRoot = path.join(root, ".qfai", "contracts", "db");

    const uiFiles = ["ui-0001-sample.yaml", "ui-0002-sample.yml", "ui.json", "ui.md"];
    const themaFiles = ["thema-001-sample.yml", "thema-002-sample.yaml", "thema.json"];
    const apiFiles = ["api.yaml", "api.yml", "api.json", "api.md"];
    const dbFiles = ["schema.sql", "schema.yml"];

    for (const file of uiFiles) {
      const fullPath = path.join(uiRoot, file);
      await mkdir(path.dirname(fullPath), { recursive: true });
      await writeFile(fullPath, "sample");
    }

    for (const file of themaFiles) {
      const fullPath = path.join(uiRoot, file);
      await mkdir(path.dirname(fullPath), { recursive: true });
      await writeFile(fullPath, "sample");
    }

    for (const file of apiFiles) {
      const fullPath = path.join(apiRoot, file);
      await mkdir(path.dirname(fullPath), { recursive: true });
      await writeFile(fullPath, "sample");
    }

    for (const file of dbFiles) {
      const fullPath = path.join(dbRoot, file);
      await mkdir(path.dirname(fullPath), { recursive: true });
      await writeFile(fullPath, "sample");
    }

    const uiFound = await collectUiContractFiles(uiRoot);
    const themaFound = await collectThemaContractFiles();
    const apiFound = await collectApiContractFiles(apiRoot);
    const dbFound = await collectDbContractFiles(dbRoot);

    // Collection dedicated to thema contracts is retired; yaml/yml files under ui are treated as UI contract candidates.
    expect(uiFound.map((file) => path.basename(file)).sort()).toEqual(
      [
        "ui-0001-sample.yaml",
        "ui-0002-sample.yml",
        "thema-001-sample.yml",
        "thema-002-sample.yaml",
      ].sort(),
    );
    expect(themaFound.map((file) => path.basename(file)).sort()).toEqual([]);
    expect(apiFound.map((file) => path.basename(file)).sort()).toEqual(
      ["api.yaml", "api.yml", "api.json"].sort(),
    );
    expect(dbFound.map((file) => path.basename(file)).sort()).toEqual(["schema.sql"].sort());
  });
});
