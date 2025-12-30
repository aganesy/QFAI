import path from "node:path";

import { collectFiles } from "./fs.js";

const SPEC_PACK_DIR_PATTERN = /^spec-\d{3}$/;

export type ContractFiles = {
  api: string[];
  ui: string[];
  db: string[];
};

export async function collectSpecPackDirs(
  specsRoot: string,
): Promise<string[]> {
  const files = await collectFiles(specsRoot, { extensions: [".md"] });
  const packs = new Set<string>();
  for (const file of files) {
    if (isSpecPackFile(file, "spec.md")) {
      packs.add(path.dirname(file));
    }
  }
  return Array.from(packs).sort();
}

export async function collectSpecFiles(specsRoot: string): Promise<string[]> {
  const files = await collectFiles(specsRoot, { extensions: [".md"] });
  return files.filter((file) => isSpecPackFile(file, "spec.md"));
}

export async function collectDeltaFiles(specsRoot: string): Promise<string[]> {
  const files = await collectFiles(specsRoot, { extensions: [".md"] });
  return files.filter((file) => isSpecPackFile(file, "delta.md"));
}

export async function collectScenarioFiles(
  specsRoot: string,
): Promise<string[]> {
  const files = await collectFiles(specsRoot, { extensions: [".md"] });
  return files.filter((file) => isSpecPackFile(file, "scenario.md"));
}

export async function collectUiContractFiles(
  uiRoot: string,
): Promise<string[]> {
  return collectFiles(uiRoot, { extensions: [".yaml", ".yml"] });
}

export async function collectApiContractFiles(
  apiRoot: string,
): Promise<string[]> {
  return collectFiles(apiRoot, { extensions: [".yaml", ".yml", ".json"] });
}

export async function collectDataContractFiles(
  dataRoot: string,
): Promise<string[]> {
  return collectFiles(dataRoot, { extensions: [".sql"] });
}

export async function collectContractFiles(
  uiRoot: string,
  apiRoot: string,
  dataRoot: string,
): Promise<ContractFiles> {
  const [ui, api, db] = await Promise.all([
    collectUiContractFiles(uiRoot),
    collectApiContractFiles(apiRoot),
    collectDataContractFiles(dataRoot),
  ]);
  return { ui, api, db };
}

function isSpecPackFile(filePath: string, baseName: string): boolean {
  if (path.basename(filePath).toLowerCase() !== baseName) {
    return false;
  }
  const dirName = path.basename(path.dirname(filePath)).toLowerCase();
  return SPEC_PACK_DIR_PATTERN.test(dirName);
}
