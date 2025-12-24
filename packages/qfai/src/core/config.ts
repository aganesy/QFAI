import { readFile } from "node:fs/promises";
import path from "node:path";

import { parse as parseYaml } from "yaml";

export type QfaiConfig = {
  specDir: string;
  decisionsDir: string;
  scenariosDir: string;
  rulesDir: string;
  contractsDir: string;
  uiContractsDir: string;
  apiContractsDir: string;
  dataContractsDir: string;
  srcDir: string;
  testsDir: string;
  specRequiredSections: string[];
};

export type ConfigPathKey = Exclude<keyof QfaiConfig, "specRequiredSections">;

export const defaultConfig: QfaiConfig = {
  specDir: "qfai/spec",
  decisionsDir: "qfai/spec/decisions",
  scenariosDir: "qfai/spec",
  rulesDir: "qfai/rules",
  contractsDir: "qfai/contracts",
  uiContractsDir: "qfai/contracts/ui",
  apiContractsDir: "qfai/contracts/api",
  dataContractsDir: "qfai/contracts/db",
  srcDir: "src",
  testsDir: "tests",
  specRequiredSections: [
    "背景",
    "ゴール",
    "非ゴール",
    "境界",
    "前提",
    "決定事項",
    "業務ルール",
  ],
};

export function getConfigPath(root: string): string {
  return path.join(root, "qfai", "qfai.config.yaml");
}

export async function loadConfig(root: string): Promise<QfaiConfig> {
  const configPath = getConfigPath(root);
  try {
    const raw = await readFile(configPath, "utf-8");
    const parsed = parseYaml(raw);
    if (parsed && typeof parsed === "object") {
      return { ...defaultConfig, ...(parsed as Partial<QfaiConfig>) };
    }
    return defaultConfig;
  } catch (error) {
    if (isMissingFile(error)) {
      return defaultConfig;
    }
    throw error;
  }
}

export function resolvePath(
  root: string,
  config: QfaiConfig,
  key: ConfigPathKey,
): string {
  return path.resolve(root, config[key]);
}

function isMissingFile(error: unknown): boolean {
  if (error && typeof error === "object" && "code" in error) {
    return (error as { code?: string }).code === "ENOENT";
  }
  return false;
}
