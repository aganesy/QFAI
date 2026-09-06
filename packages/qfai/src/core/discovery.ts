import { access } from "node:fs/promises";
import path from "node:path";

import { collectFiles } from "./fs.js";
import { collectSpecEntries, type SpecEntry } from "./specLayout.js";

export type ContractFiles = {
  api: string[];
  ui: string[];
  db: string[];
  thema: string[];
};

export async function collectSpecPackDirs(specsRoot: string): Promise<string[]> {
  const entries = await collectSpecEntries(specsRoot);
  return entries.map((entry) => entry.dir);
}

export async function collectSpecFiles(specsRoot: string): Promise<string[]> {
  const entries = await collectSpecEntries(specsRoot);
  return filterExisting(entries.map((entry) => entry.specMetaPath));
}

export async function collectDeltaFiles(specsRoot: string): Promise<string[]> {
  const entries = await collectSpecEntries(specsRoot);
  const candidates = entries.flatMap((entry) => [entry.deltaPath, ...entry.deltaCandidates]);
  return filterExisting(unique(candidates));
}

export async function collectScenarioFiles(specsRoot: string): Promise<string[]> {
  const entries = await collectSpecEntries(specsRoot);
  return filterExisting(entries.map((entry) => entry.examplesPath));
}

/**
 * The scenario files of the specs that are still current.
 *
 * `collectScenarioFiles` maps every spec's Examples file, retired ones
 * included. Aggregates that describe what the repository is held to **now** —
 * the scenario count, the strategy mix, SC coverage — have to drop the retired
 * ones, or a report states a retired spec's history as current work.
 *
 * The filter lives here, beside the collector, because both `createReportData`
 * and `validateProject` have to reach the same answer: SC coverage is computed
 * during validation and merely carried into the report, so filtering on the
 * report side alone left `summary.scenarios` excluding a retired scenario while
 * SC Coverage's total and `missingIds` still counted the SC IDs inside it —
 * and `scSources`, built from the filtered list, could name no source for them.
 *
 * A spec is dropped only on a resolved lifecycle (`SpecEntry.status` present
 * and not `active`); an incomplete or unreadable declaration leaves `status`
 * undefined and the spec current, matching what `validate` gates on.
 */
export function activeScenarioFiles(
  scenarioFiles: readonly string[],
  specEntries: readonly SpecEntry[],
): string[] {
  const retired = new Set<string>();
  for (const entry of specEntries) {
    if (entry.status !== undefined && entry.status !== "active") {
      retired.add(path.resolve(entry.examplesPath));
    }
  }
  if (retired.size === 0) {
    return [...scenarioFiles];
  }
  return scenarioFiles.filter((file) => !retired.has(path.resolve(file)));
}

export async function collectCaseCatalogueFiles(specsRoot: string): Promise<string[]> {
  const entries = await collectSpecEntries(specsRoot);
  return filterExisting(entries.map((entry) => entry.testCasesPath));
}

export async function collectTraceabilityMatrixFiles(specsRoot: string): Promise<string[]> {
  const entries = await collectSpecEntries(specsRoot);
  return filterExisting(
    entries
      .filter((entry) => entry.layout !== "layered")
      .map((entry) => entry.traceabilityLedgerPath),
  );
}

export async function collectUiContractFiles(uiRoot: string): Promise<string[]> {
  return collectFiles(uiRoot, { extensions: [".yaml", ".yml"] });
}

export function collectThemaContractFiles(): Promise<string[]> {
  return Promise.resolve([]);
}

export async function collectApiContractFiles(apiRoot: string): Promise<string[]> {
  return collectFiles(apiRoot, { extensions: [".yaml", ".yml", ".json"] });
}

export async function collectDbContractFiles(dbRoot: string): Promise<string[]> {
  return collectFiles(dbRoot, { extensions: [".sql"] });
}

export async function collectContractFiles(
  uiRoot: string,
  apiRoot: string,
  dbRoot: string,
): Promise<ContractFiles> {
  const [ui, thema, api, db] = await Promise.all([
    collectUiContractFiles(uiRoot),
    collectThemaContractFiles(),
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

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}
