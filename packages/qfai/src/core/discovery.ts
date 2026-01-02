import { access } from "node:fs/promises";

import { collectFiles } from "./fs.js";
import { collectSpecEntries } from "./specLayout.js";

export type ContractFiles = {
  api: string[];
  ui: string[];
  db: string[];
};

export async function collectSpecPackDirs(
  specsRoot: string,
): Promise<string[]> {
  const entries = await collectSpecEntries(specsRoot);
  return entries.map((entry) => entry.dir);
}

export async function collectSpecFiles(specsRoot: string): Promise<string[]> {
  const entries = await collectSpecEntries(specsRoot);
  return filterExisting(entries.map((entry) => entry.specPath));
}

export async function collectDeltaFiles(specsRoot: string): Promise<string[]> {
  const entries = await collectSpecEntries(specsRoot);
  return filterExisting(entries.map((entry) => entry.deltaPath));
}

export async function collectScenarioFiles(
  specsRoot: string,
): Promise<string[]> {
  const entries = await collectSpecEntries(specsRoot);
  return filterExisting(entries.map((entry) => entry.scenarioPath));
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

export async function collectDbContractFiles(
  dbRoot: string,
): Promise<string[]> {
  return collectFiles(dbRoot, { extensions: [".sql"] });
}

export async function collectContractFiles(
  uiRoot: string,
  apiRoot: string,
  dbRoot: string,
): Promise<ContractFiles> {
  const [ui, api, db] = await Promise.all([
    collectUiContractFiles(uiRoot),
    collectApiContractFiles(apiRoot),
    collectDbContractFiles(dbRoot),
  ]);
  return { ui, api, db };
}

async function filterExisting(files: string[]): Promise<string[]> {
  const existing: string[] = [];
  for (const file of files) {
    if (await exists(file)) {
      existing.push(file);
    }
  }
  return existing;
}

async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}
