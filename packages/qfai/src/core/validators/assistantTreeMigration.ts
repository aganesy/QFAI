import type { Dirent } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { hasErrnoCode, isEnoent } from "../fs/errno.js";
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

  // 2. Each canonical layer should be a directory so the tree is visible
  // to consumers. A missing layer, or another entry at its path, is
  // info-only (init seeds it), so it can't fail validate by itself.
  for (const layer of ASSISTANT_LAYERS) {
    const kind = await layerEntryKind(joinAssistantLayer(root, layer));
    if (kind === "directory") continue;
    const message =
      kind === "absent"
        ? `.qfai/assistant/${layer}/ is not seeded yet. Run \`qfai init\` to seed the assistant tree.`
        : `.qfai/assistant/${layer} is not a directory. Move it aside and run \`qfai init\` to seed the layer.`;
    issues.push(
      issue(
        "QFAI-ASSISTANT-002",
        message,
        "info",
        `.qfai/assistant/${layer}/`,
        "assistantTreeMigration.layerSeed",
      ),
    );
  }

  return issues;
}

/** What is at a layer path: nothing, a directory, or another entry. An unreadable path throws. */
async function layerEntryKind(layerDir: string): Promise<"absent" | "directory" | "other"> {
  try {
    return (await stat(layerDir)).isDirectory() ? "directory" : "other";
  } catch (error: unknown) {
    if (isEnoent(error) || (hasErrnoCode(error) && error.code === "ENOTDIR")) {
      return "absent";
    }
    throw error;
  }
}
