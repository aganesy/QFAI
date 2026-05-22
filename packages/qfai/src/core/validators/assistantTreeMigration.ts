import type { Dirent } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import {
  ASSISTANT_LAYERS,
  joinAssistantLayer,
  joinLegacyAssistantSteering,
  isAssistantLayer,
} from "../paths/assistantPaths.js";
import type { Issue } from "../types.js";
import { resolveToolVersion } from "../version.js";
import { exists, issue } from "./utils.js";

function nextMinorVersion(current: string): string {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(current);
  if (!match) return current;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  return `${major}.${minor + 1}.0`;
}

export async function validateAssistantTreeMigration(
  root: string,
  _config: QfaiConfig,
): Promise<Issue[]> {
  const issues: Issue[] = [];

  // 1. 4-layer enum guard — any assistant-tree dir outside the 4 canonical
  // names is flagged (except the documented exceptions: agents/, skills/,
  // instructions/ — these are existing pre-recut surfaces).
  const assistantRoot = path.join(root, ".qfai", "assistant");
  if (await exists(assistantRoot)) {
    let dirEntries: Dirent[];
    try {
      dirEntries = await readdir(assistantRoot, { withFileTypes: true });
    } catch {
      dirEntries = [];
    }
    const PRE_RECUT_DIRS = new Set([
      "agents",
      "skills",
      "instructions",
      // skills.local/ is the protected user-customization surface
      // (REQ-0003 in spec-0003).
      "skills.local",
    ]);
    for (const entry of dirEntries) {
      if (!entry.isDirectory()) continue;
      if (isAssistantLayer(entry.name)) continue;
      if (PRE_RECUT_DIRS.has(entry.name)) continue;
      // steering/ is the explicit legacy layer that gets its own D-DEPRECATED-PATH below.
      if (entry.name === "steering") continue;
      issues.push(
        issue(
          "W-WORKLOG-SCHEMA",
          `.qfai/assistant/${entry.name}/ is not in the canonical 4-layer enum (${ASSISTANT_LAYERS.join(", ")}).`,
          "warning",
          `.qfai/assistant/${entry.name}/`,
          "assistantTreeMigration.enumGuard",
        ),
      );
    }
  }

  // 2. D-DEPRECATED-PATH — legacy .qfai/assistant/steering/ is read-compatible
  // for the current minor only; the sunset version is the next minor.
  const legacyDir = joinLegacyAssistantSteering(root);
  if (await exists(legacyDir)) {
    const current = await resolveToolVersion();
    const sunset = nextMinorVersion(current);
    issues.push(
      issue(
        "D-DEPRECATED-PATH",
        `.qfai/assistant/steering/ is read-compatible only for the current minor release. sunset: v${sunset}. Run \`qfai init --upgrade-assistant-tree\` to migrate.`,
        "warning",
        ".qfai/assistant/steering/",
        "assistantTreeMigration.deprecatedPath",
      ),
    );
  }

  // 3. Each of the 4 canonical layers should have at least a .gitkeep so the
  // tree is visible to consumers. Missing layer = info-only (the upgrade
  // helper will seed it). We intentionally use "info" severity so this
  // can't fail validate by itself.
  for (const layer of ASSISTANT_LAYERS) {
    const layerDir = joinAssistantLayer(root, layer);
    if (!(await exists(layerDir))) {
      issues.push(
        issue(
          "W-USER-EDIT-PRESERVED",
          `.qfai/assistant/${layer}/ is not seeded yet. Run \`qfai init\` to seed the 4-layer tree.`,
          "info",
          `.qfai/assistant/${layer}/`,
          "assistantTreeMigration.layerSeed",
        ),
      );
    }
  }

  return issues;
}
