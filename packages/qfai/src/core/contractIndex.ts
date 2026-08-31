import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "./config.js";
import { resolvePath } from "./config.js";
import {
  collectApiContractFiles,
  collectDbContractFiles,
  collectUiContractFiles,
  collectThemaContractFiles,
} from "./discovery.js";
import { extractDeclaredContractIds, extractDeclaredDependencies } from "./contractsDecl.js";

export type ContractIndex = {
  ids: Set<string>;
  idToFiles: Map<string, Set<string>>;
  /**
   * Declared apply-order dependencies, per contract id.
   *
   * The index modelled only `id -> files`, so the composition a multi-file
   * schema is forced into by `QFAI-CONTRACT-011` was unrepresentable.
   */
  idToDependencies: Map<string, Set<string>>;
  files: { ui: string[]; thema: string[]; api: string[]; db: string[] };
};

export async function buildContractIndex(root: string, config: QfaiConfig): Promise<ContractIndex> {
  const contractsRoot = resolvePath(root, config, "contractsDir");
  const uiRoot = path.join(contractsRoot, "ui");
  const apiRoot = path.join(contractsRoot, "api");
  const dbRoot = path.join(contractsRoot, "db");

  const [uiFiles, themaFiles, apiFiles, dbFiles] = await Promise.all([
    collectUiContractFiles(uiRoot),
    collectThemaContractFiles(),
    collectApiContractFiles(apiRoot),
    collectDbContractFiles(dbRoot),
  ]);

  const index: ContractIndex = {
    ids: new Set<string>(),
    idToFiles: new Map<string, Set<string>>(),
    idToDependencies: new Map<string, Set<string>>(),
    files: { ui: uiFiles, thema: themaFiles, api: apiFiles, db: dbFiles },
  };

  await indexContractFiles(uiFiles, index);
  await indexContractFiles(themaFiles, index);
  await indexContractFiles(apiFiles, index);
  await indexContractFiles(dbFiles, index);

  return index;
}

async function indexContractFiles(files: string[], index: ContractIndex): Promise<void> {
  for (const file of files) {
    const text = await readFile(file, "utf-8");
    // One file declares one id (`QFAI-CONTRACT-011`), so its dependency list
    // belongs to that id without ambiguity.
    const dependencies = extractDeclaredDependencies(text, file);
    extractDeclaredContractIds(text).forEach((id) => {
      record(index, id, file);
      if (dependencies.length === 0) return;
      const known = index.idToDependencies.get(id) ?? new Set<string>();
      for (const dependency of dependencies) {
        // A self-reference is a typo, not a dependency, and would make every
        // graph trivially cyclic.
        if (dependency !== id.toUpperCase()) known.add(dependency);
      }
      index.idToDependencies.set(id, known);
    });
  }
}

function record(index: ContractIndex, id: string, file: string): void {
  index.ids.add(id);
  const current = index.idToFiles.get(id) ?? new Set<string>();
  current.add(file);
  index.idToFiles.set(id, current);
}
