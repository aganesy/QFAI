import path from "node:path";

import { collectFiles } from "./fs.js";

const LEGACY_SPEC_NAME = "spec.md";
const SPEC_NAMED_PATTERN = /^spec-\d{4}-[^/\\]+\.md$/i;

export type ContractFiles = {
  api: string[];
  ui: string[];
  db: string[];
};

export async function collectSpecFiles(specRoot: string): Promise<string[]> {
  const files = await collectFiles(specRoot, { extensions: [".md"] });
  return files.filter((file) => isSpecFile(file));
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

function isSpecFile(filePath: string): boolean {
  const name = path.basename(filePath).toLowerCase();
  return name === LEGACY_SPEC_NAME || SPEC_NAMED_PATTERN.test(name);
}
