import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { collectSpecPackDirs } from "../discovery.js";
import type { Issue } from "../types.js";
import { isMissingFileError, issue } from "./utils.js";

export async function validateDeltas(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const specsRoot = resolvePath(root, config, "specsDir");
  const packs = await collectSpecPackDirs(specsRoot);
  if (packs.length === 0) {
    return [];
  }

  const issues: Issue[] = [];
  for (const pack of packs) {
    const deltaPath = path.join(pack, "delta.md");
    try {
      await readFile(deltaPath, "utf-8");
    } catch (error) {
      if (isMissingFileError(error)) {
        issues.push(
          issue(
            "QFAI-DELTA-001",
            "delta.md が見つかりません。",
            "error",
            deltaPath,
            "delta.exists",
            undefined,
            "change",
            "spec-xxxx/delta.md を作成してください（テンプレは init 生成物を参照してください）。",
          ),
        );
        continue;
      }
      throw error;
    }
  }

  return issues;
}
