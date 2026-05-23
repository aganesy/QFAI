import type { Dirent } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import {
  ASSISTANT_LAYERS,
  joinAssistantLayer,
  joinLegacyAssistantSteering,
  isAssistantLayer,
  LEGACY_STEERING_SUNSET,
  legacyAssistantSteeringSunsetLabel,
} from "../paths/assistantPaths.js";
import type { Issue } from "../types.js";
import { resolveToolVersion } from "../version.js";
import { exists, issue } from "./utils.js";

/**
 * The validator compares the running tool version's major.minor against
 * LEGACY_STEERING_SUNSET (imported from assistantPaths.ts):
 *   - if current < sunset: emit warning (compatibility window)
 *   - if current >= sunset: emit error (post-sunset, cutoff enforced)
 * so legacy paths cannot survive past the announced cutoff release.
 */
function parseSemver(value: string): { major: number; minor: number; patch: number } | null {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(value);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function legacyDeprecationSeverity(current: string): "warning" | "error" {
  const parsed = parseSemver(current);
  if (!parsed) return "warning";
  if (parsed.major < LEGACY_STEERING_SUNSET.major) return "warning";
  if (parsed.major > LEGACY_STEERING_SUNSET.major) return "error";
  return parsed.minor < LEGACY_STEERING_SUNSET.minor ? "warning" : "error";
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
  // from LEGACY_STEERING_SUNSET onwards. Both surfaces fire symmetric
  // findings per qfai-init.md contract line 50.
  const current = await resolveToolVersion();
  const sunset = legacyAssistantSteeringSunsetLabel();
  const severity = legacyDeprecationSeverity(current);
  for (const legacySurface of [
    { dir: joinLegacyAssistantSteering(root), label: ".qfai/assistant/steering/" },
    {
      dir: path.join(root, ".qfai", "assistant", "instructions"),
      label: ".qfai/assistant/instructions/",
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
