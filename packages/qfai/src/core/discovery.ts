import { collectFiles } from "./fs.js";

export type ContractFiles = {
  api: string[];
  ui: string[];
  db: string[];
  thema: string[];
};

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
