import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { getInitAssetsDir } from "../../shared/assets.js";
import { resolvePath, type QfaiConfig } from "../config.js";

const SEED_FILES = [
  "decisions.md",
  "open-questions.md",
  "01_policy/objective.md",
  "01_policy/initiative.md",
  "01_policy/principle.md",
  "01_policy/glossary.md",
  "01_policy/constraint.md",
  "02_business-flow/business-flows.md",
  "03_contract/contracts.md",
  "03_contract/tech.md",
  "03_contract/structure.md",
] as const;

const SEED_DIRS = [
  "01_policy",
  "02_business-flow",
  "03_contract",
  "03_contract/api",
  "03_contract/db",
  "03_contract/ui",
  "03_contract/cli",
  "03_contract/design",
] as const;

/** True only while the story tree still has exactly the files written by init. */
export async function isPristineStorySeed(root: string, config: QfaiConfig): Promise<boolean> {
  const specDir = path.resolve(root, ".qfai", "spec");
  if (resolvePath(root, config, "specsDir") !== specDir) return false;
  if (resolvePath(root, config, "contractsDir") !== path.join(specDir, "03_contract")) {
    return false;
  }

  try {
    const templateDir = path.join(
      getInitAssetsDir(),
      ".qfai",
      "assistant",
      "skill",
      "qfai-sdd",
      "templates",
      "spec",
    );
    const expectedDirs = new Set<string>(["", ...SEED_DIRS]);
    const expectedFiles = new Set<string>(SEED_FILES);
    for (const relativeDir of expectedDirs) {
      const dir = path.join(specDir, relativeDir);
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        const relative = path.posix.join(relativeDir.replaceAll("\\", "/"), entry.name);
        if (entry.isDirectory() && expectedDirs.has(relative)) continue;
        if (entry.isFile() && expectedFiles.has(relative)) continue;
        return false;
      }
    }
    for (const relative of SEED_FILES) {
      const [actual, template] = await Promise.all([
        readFile(path.join(specDir, relative)),
        readFile(path.join(templateDir, relative)),
      ]);
      if (!actual.equals(template)) return false;
    }
    return true;
  } catch {
    return false;
  }
}
