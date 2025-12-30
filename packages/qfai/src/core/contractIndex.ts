import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "./config.js";
import { resolvePath } from "./config.js";
import {
  collectApiContractFiles,
  collectDataContractFiles,
  collectUiContractFiles,
} from "./discovery.js";
import {
  extractApiContractIds,
  extractUiContractIds,
  parseStructuredContract,
} from "./contracts.js";
import { extractIds } from "./ids.js";

export type ContractIndex = {
  ids: Set<string>;
  idToFiles: Map<string, Set<string>>;
  files: { ui: string[]; api: string[]; data: string[] };
  structuredParseFailedFiles: Set<string>;
};

export async function buildContractIndex(
  root: string,
  config: QfaiConfig,
): Promise<ContractIndex> {
  const contractsRoot = resolvePath(root, config, "contractsDir");
  const uiRoot = path.join(contractsRoot, "ui");
  const apiRoot = path.join(contractsRoot, "api");
  const dataRoot = path.join(contractsRoot, "db");

  const [uiFiles, apiFiles, dataFiles] = await Promise.all([
    collectUiContractFiles(uiRoot),
    collectApiContractFiles(apiRoot),
    collectDataContractFiles(dataRoot),
  ]);

  const index: ContractIndex = {
    ids: new Set<string>(),
    idToFiles: new Map<string, Set<string>>(),
    files: { ui: uiFiles, api: apiFiles, data: dataFiles },
    structuredParseFailedFiles: new Set<string>(),
  };

  await indexUiContracts(uiFiles, index);
  await indexApiContracts(apiFiles, index);
  await indexDataContracts(dataFiles, index);

  return index;
}

async function indexUiContracts(
  files: string[],
  index: ContractIndex,
): Promise<void> {
  for (const file of files) {
    const text = await readFile(file, "utf-8");
    try {
      const doc = parseStructuredContract(file, text);
      extractUiContractIds(doc).forEach((id) => record(index, id, file));
    } catch {
      index.structuredParseFailedFiles.add(file);
      extractIds(text, "UI").forEach((id) => record(index, id, file));
    }
  }
}

async function indexApiContracts(
  files: string[],
  index: ContractIndex,
): Promise<void> {
  for (const file of files) {
    const text = await readFile(file, "utf-8");
    try {
      const doc = parseStructuredContract(file, text);
      extractApiContractIds(doc).forEach((id) => record(index, id, file));
    } catch {
      index.structuredParseFailedFiles.add(file);
      extractIds(text, "API").forEach((id) => record(index, id, file));
    }
  }
}

async function indexDataContracts(
  files: string[],
  index: ContractIndex,
): Promise<void> {
  for (const file of files) {
    const text = await readFile(file, "utf-8");
    extractIds(text, "DATA").forEach((id) => record(index, id, file));
  }
}

function record(index: ContractIndex, id: string, file: string): void {
  index.ids.add(id);
  const current = index.idToFiles.get(id) ?? new Set<string>();
  current.add(file);
  index.idToFiles.set(id, current);
}
