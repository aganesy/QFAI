import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  collectApiContractFiles,
  collectDataContractFiles,
  collectSpecFiles,
  collectUiContractFiles,
} from "../../src/core/discovery.js";

describe("collectSpecFiles", () => {
  it("filters spec files by naming rules", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-discovery-"));
    const specRoot = path.join(root, ".qfai", "specs");
    const candidates = [
      "spec-001/spec.md",
      "SPEC-002/spec.md",
      "nested/spec-003/spec.md",
      "spec-004/delta.md",
      "spec-01/spec.md",
      "spec-0001/spec.md",
      "spec-001/specs.md",
    ];

    for (const file of candidates) {
      const fullPath = path.join(specRoot, file);
      await mkdir(path.dirname(fullPath), { recursive: true });
      await writeFile(fullPath, "sample");
    }

    const found = await collectSpecFiles(specRoot);
    const relative = found
      .map((file) => toPosix(path.relative(specRoot, file)))
      .sort();

    expect(relative).toEqual(
      [
        "SPEC-002/spec.md",
        "nested/spec-003/spec.md",
        "spec-001/spec.md",
      ].sort(),
    );
  });
});

describe("collectContractFiles", () => {
  it("collects contract files by allowed extensions", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-contracts-"));
    const uiRoot = path.join(root, ".qfai", "contracts", "ui");
    const apiRoot = path.join(root, ".qfai", "contracts", "api");
    const dataRoot = path.join(root, ".qfai", "contracts", "db");

    const uiFiles = ["ui.yaml", "ui.yml", "ui.json", "ui.md"];
    const apiFiles = ["api.yaml", "api.yml", "api.json", "api.md"];
    const dataFiles = ["schema.sql", "schema.yml"];

    for (const file of uiFiles) {
      const fullPath = path.join(uiRoot, file);
      await mkdir(path.dirname(fullPath), { recursive: true });
      await writeFile(fullPath, "sample");
    }

    for (const file of apiFiles) {
      const fullPath = path.join(apiRoot, file);
      await mkdir(path.dirname(fullPath), { recursive: true });
      await writeFile(fullPath, "sample");
    }

    for (const file of dataFiles) {
      const fullPath = path.join(dataRoot, file);
      await mkdir(path.dirname(fullPath), { recursive: true });
      await writeFile(fullPath, "sample");
    }

    const uiFound = await collectUiContractFiles(uiRoot);
    const apiFound = await collectApiContractFiles(apiRoot);
    const dataFound = await collectDataContractFiles(dataRoot);

    expect(uiFound.map((file) => path.basename(file)).sort()).toEqual(
      ["ui.yaml", "ui.yml"].sort(),
    );
    expect(apiFound.map((file) => path.basename(file)).sort()).toEqual(
      ["api.yaml", "api.yml", "api.json"].sort(),
    );
    expect(dataFound.map((file) => path.basename(file)).sort()).toEqual(
      ["schema.sql"].sort(),
    );
  });
});

function toPosix(value: string): string {
  return value.split(path.sep).join("/");
}
