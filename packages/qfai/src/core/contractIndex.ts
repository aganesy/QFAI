import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "./config.js";
import { resolvePath } from "./config.js";
import {
  collectApiContractFiles,
  collectDbContractFiles,
  collectUiContractFiles,
} from "./discovery.js";
import { extractDeclaredContractIds } from "./contractsDecl.js";

export type ContractIndex = {
  ids: Set<string>;
  idToFiles: Map<string, Set<string>>;
  files: { ui: string[]; api: string[]; db: string[] };
};

export async function buildContractIndex(
  root: string,
  config: QfaiConfig,
): Promise<ContractIndex> {
  const contractsRoot = resolvePath(root, config, "contractsDir");
  const uiRoot = path.join(contractsRoot, "ui");
  const apiRoot = path.join(contractsRoot, "api");
  const dbRoot = path.join(contractsRoot, "db");

  const [uiFiles, apiFiles, dbFiles] = await Promise.all([
    collectUiContractFiles(uiRoot),
    collectApiContractFiles(apiRoot),
    collectDbContractFiles(dbRoot),
  ]);

  const index: ContractIndex = {
    ids: new Set<string>(),
    idToFiles: new Map<string, Set<string>>(),
    files: { ui: uiFiles, api: apiFiles, db: dbFiles },
  };

  await indexContractFiles(uiFiles, index);
  await indexContractFiles(apiFiles, index);
  await indexContractFiles(dbFiles, index);

  return index;
}

async function indexContractFiles(
  files: string[],
  index: ContractIndex,
): Promise<void> {
  for (const file of files) {
    const text = await readFile(file, "utf-8");
    extractDeclaredContractIds(text).forEach((id) => record(index, id, file));
  }
}

function record(index: ContractIndex, id: string, file: string): void {
  index.ids.add(id);
  const current = index.idToFiles.get(id) ?? new Set<string>();
  current.add(file);
  index.idToFiles.set(id, current);
}
