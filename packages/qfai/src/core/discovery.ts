import { access } from "node:fs/promises";
import path from "node:path";

import { collectFiles } from "./fs.js";
import { collectSpecEntries } from "./specLayout.js";

export type ContractFiles = {
  api: string[];
  ui: string[];
  db: string[];
  thema: string[];
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
  const files = await collectFiles(uiRoot, { extensions: [".yaml", ".yml"] });
  return filterByBasenamePrefix(files, "ui-");
}

export async function collectThemaContractFiles(
  uiRoot: string,
): Promise<string[]> {
  const files = await collectFiles(uiRoot, { extensions: [".yaml", ".yml"] });
  return filterByBasenamePrefix(files, "thema-");
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
  const [ui, thema, api, db] = await Promise.all([
    collectUiContractFiles(uiRoot),
    collectThemaContractFiles(uiRoot),
    collectApiContractFiles(apiRoot),
    collectDbContractFiles(dbRoot),
  ]);
  return { ui, thema, api, db };
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

function filterByBasenamePrefix(files: string[], prefix: string): string[] {
  const lowerPrefix = prefix.toLowerCase();
  return files.filter((file) =>
    path.basename(file).toLowerCase().startsWith(lowerPrefix),
  );
}
