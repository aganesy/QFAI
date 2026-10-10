import type { Dirent } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { ASSISTANT_LAYERS, joinAssistantLayer, isAssistantLayer } from "../paths/assistantPaths.js";
import type { Issue } from "../types.js";
import { exists, issue } from "./utils.js";

export async function validateAssistantTreeMigration(
  root: string,
  _config: QfaiConfig,
): Promise<Issue[]> {
  const issues: Issue[] = [];

  // 1. Canonical assistant-layer enum guard.
  const assistantRoot = path.join(root, ".qfai", "assistant");
  if (await exists(assistantRoot)) {
    let dirEntries: Dirent[];
    try {
      dirEntries = await readdir(assistantRoot, { withFileTypes: true });
    } catch {
      dirEntries = [];
    }
    const EXTRA_DIRS = new Set(["skill.local"]);
    for (const entry of dirEntries) {
      if (!entry.isDirectory()) continue;
      if (isAssistantLayer(entry.name)) continue;
      if (EXTRA_DIRS.has(entry.name)) continue;
      issues.push(
        issue(
          "QFAI-ASSISTANT-001",
          `.qfai/assistant/${entry.name}/ is not in the canonical layer set (${ASSISTANT_LAYERS.join(", ")}).`,
          "warning",
          `.qfai/assistant/${entry.name}/`,
          "assistantTreeMigration.enumGuard",
        ),
      );
    }
  }

  // 2. Each canonical layer should have at least a .gitkeep so the
  // tree is visible to consumers. Missing layer = info-only (init seeds
  // it). We intentionally use "info" severity so this can't fail validate
  // by itself.
  for (const layer of ASSISTANT_LAYERS) {
    const layerDir = joinAssistantLayer(root, layer);
    if (!(await exists(layerDir))) {
      // This is purely a layer-not-yet-seeded notification.
      issues.push(
        issue(
          "QFAI-ASSISTANT-002",
          `.qfai/assistant/${layer}/ is not seeded yet. Run \`qfai init\` to seed the assistant tree.`,
          "info",
          `.qfai/assistant/${layer}/`,
          "assistantTreeMigration.layerSeed",
        ),
      );
    }
  }

  return issues;
}
