import type { Dirent } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import {
  ASSISTANT_LAYERS,
  LEGACY_ASSISTANT_INSTRUCTIONS_DIR,
  LEGACY_ASSISTANT_STEERING_DIR,
  joinAssistantLayer,
  joinLegacyAssistantInstructions,
  joinLegacyAssistantSteering,
  isAssistantLayer,
  legacyAssistantSteeringSunsetLabel,
} from "../paths/assistantPaths.js";
import { SUNSETS, deprecationSeverity } from "../sunset.js";
import type { Issue } from "../types.js";
import { resolveToolVersion } from "../version.js";
import { exists, issue } from "./utils.js";

/**
 * The validator compares the running tool version's major.minor against
 * SUNSETS.legacyAssistantSteering (core/sunset.ts):
 *   - if current < sunset: emit warning (compatibility window)
 *   - if current >= sunset: emit error (post-sunset, cutoff enforced)
 * so legacy paths cannot survive past the announced cutoff release.
 */

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
      // skills.local/ is the protected user-customization surface.
      "skills.local",
    ]);
    // instructions/ and steering/ are pre-recut layers that get their
    // own D-DEPRECATED-PATH below (symmetric per qfai-init.md contract).
    const PRE_RECUT_DEPRECATED_DIRS = new Set(["instructions", "steering"]);
    for (const entry of dirEntries) {
      if (!entry.isDirectory()) continue;
      if (isAssistantLayer(entry.name)) continue;
      if (PRE_RECUT_DIRS.has(entry.name)) continue;
      if (PRE_RECUT_DEPRECATED_DIRS.has(entry.name)) continue;
      // Distinct finding code — `W-WORKLOG-SCHEMA` is reserved by
      // contract for worklog-entry frontmatter shape problems. The
      // 4-layer enum guard is a separate concern and uses its own
      // dedicated code to avoid code-class overload.
      issues.push(
        issue(
          "W-ASSISTANT-LAYOUT",
          `.qfai/assistant/${entry.name}/ is not in the canonical 4-layer enum (${ASSISTANT_LAYERS.join(", ")}).`,
          "warning",
          `.qfai/assistant/${entry.name}/`,
          "assistantTreeMigration.enumGuard",
        ),
      );
    }
  }

  // 2. D-DEPRECATED-PATH — pre-recut legacy layers (.qfai/assistant/
  // steering/ AND .qfai/assistant/instructions/) are read-compatible
  // for the current minor window only; severity escalates to error
  // from SUNSETS.legacyAssistantSteering onwards. Both surfaces fire symmetric
  // findings per qfai-init.md contract line 50.
  const current = await resolveToolVersion();
  const sunset = legacyAssistantSteeringSunsetLabel();
  const severity = deprecationSeverity(current, SUNSETS.legacyAssistantSteering);
  for (const legacySurface of [
    {
      dir: joinLegacyAssistantSteering(root),
      label: `${LEGACY_ASSISTANT_STEERING_DIR}/`,
    },
    {
      dir: joinLegacyAssistantInstructions(root),
      label: `${LEGACY_ASSISTANT_INSTRUCTIONS_DIR}/`,
    },
  ]) {
    if (!(await exists(legacySurface.dir))) continue;
    const headline =
      severity === "error"
        ? `${legacySurface.label} is past the announced sunset (v${sunset}).`
        : `${legacySurface.label} is read-compatible only for the current minor release.`;
    issues.push(
      issue(
        "D-DEPRECATED-PATH",
        `${headline} sunset: v${sunset}. Run \`qfai init --upgrade-assistant-tree\` to migrate.`,
        severity,
        legacySurface.label,
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
      // Distinct info-only code so it doesn't overlap with the
      // upgrade-collision semantics of W-USER-EDIT-PRESERVED in the
      // contract. This is purely a layer-not-yet-seeded notification.
      issues.push(
        issue(
          "I-ASSISTANT-LAYER-UNSEEDED",
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
