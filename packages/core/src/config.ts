import { readFile } from "node:fs/promises";
import path from "node:path";

export type QfaiConfig = {
  docsDir: string;
  specsDir: string;
  scenariosDir: string;
  rulesDir: string;
  steeringDir: string;
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
  docsDir: "docs",
  specsDir: "docs/specs",
  scenariosDir: "docs/scenarios",
  rulesDir: "docs/rules",
  steeringDir: "docs/steering",
  contractsDir: "contracts",
  uiContractsDir: "contracts/ui",
  apiContractsDir: "contracts/api",
  dataContractsDir: "contracts/data",
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

export async function loadConfig(root: string): Promise<QfaiConfig> {
  const configPath = path.join(root, "qfai.config.json");
  try {
    const raw = await readFile(configPath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<QfaiConfig>;
    return { ...defaultConfig, ...parsed };
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
