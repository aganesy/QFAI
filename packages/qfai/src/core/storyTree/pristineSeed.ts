import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { getInitAssetsDir } from "../../shared/assets.js";
import { isEnoent } from "../fs/errno.js";
import { resolvePath, type QfaiConfig } from "../config.js";
import { STORY_SEED_DIRS, STORY_SEED_PATHS } from "./layout.js";

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
    const expectedDirs = new Set<string>(["", ...STORY_SEED_DIRS]);
    const expectedFiles = new Set<string>(STORY_SEED_PATHS);
    for (const relativeDir of expectedDirs) {
      const dir = path.join(specDir, relativeDir);
      // A seed directory holding no file is absent from a clone. A missing one
      // that should hold a seed file fails the file comparison below.
      const entries = await readdir(dir, { withFileTypes: true }).catch((cause: unknown) => {
        if (isEnoent(cause)) return [];
        throw cause;
      });
      for (const entry of entries) {
        const relative = path.posix.join(relativeDir.replaceAll("\\", "/"), entry.name);
        if (entry.isDirectory() && expectedDirs.has(relative)) continue;
        if (entry.isFile() && expectedFiles.has(relative)) continue;
        return false;
      }
    }
    for (const relative of STORY_SEED_PATHS) {
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
