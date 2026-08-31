import path from "node:path";

import { SUNSETS } from "../sunset.js";

/**
 * SSOT for the 4-layer assistant-tree path segments.
 * Hard-coded `.qfai/assistant/<layer>/` literals elsewhere in
 * the codebase are lint-rejected; build path strings through
 * the helpers in this module.
 */

export const ASSISTANT_DIR = ".qfai/assistant" as const;

export const ASSISTANT_LAYERS = ["constitution", "manifest", "catalog", "process"] as const;

export type AssistantLayer = (typeof ASSISTANT_LAYERS)[number];

export const LEGACY_ASSISTANT_STEERING_DIR = ".qfai/assistant/steering" as const;

export const PROJECT_STEERING_DIR = ".qfai/steering" as const;

export const PROJECT_STEERING_TEMPLATES_SUBDIR = "_templates" as const;

export const MIGRATIONS_SUBDIR = "migrations" as const;

/**
 * Sunset label for the legacy `.qfai/assistant/steering/` layout.
 *
 * Derived from `SUNSETS.legacyAssistantSteering` rather than pinned here. The
 * pin used to live in this module as `{ major, minor }`, which put it outside
 * `isAtOrPastSunset` — it could not parse that shape — so three separate
 * hand-rolled comparators grew around it, in `assistantTreeMigration`,
 * `skillDocReferences` and `init`. Two of them ignored the patch and
 * prerelease fields and so disagreed with every other deprecation about
 * `1.10.0-rc.1`. Deriving the label removes the possibility of drift instead of
 * asking three call sites to stay in step.
 */
export function legacyAssistantSteeringSunsetLabel(): string {
  return SUNSETS.legacyAssistantSteering;
}

export function isAssistantLayer(value: string): value is AssistantLayer {
  return (ASSISTANT_LAYERS as readonly string[]).includes(value);
}

export function assistantLayerDir(layer: AssistantLayer): string {
  return `${ASSISTANT_DIR}/${layer}`;
}

export function joinAssistantLayer(
  destRoot: string,
  layer: AssistantLayer,
  ...rest: string[]
): string {
  return path.join(destRoot, ASSISTANT_DIR, layer, ...rest);
}

/**
 * The same layer, on the **asset** side: a path inside the packaged
 * `assets/init/.qfai/assistant/` tree, whose root the caller already holds.
 *
 * Both sides of a template-vs-project comparison have to name the layer, and
 * only the project side went through this module. A layer renamed or moved
 * here would have taken `joinAssistantLayer` with it while the asset path kept
 * a literal segment, so the read would miss, its `ENOENT` would be swallowed
 * as "no template", and the merge would stop without saying so. Routing both
 * sides through one typed `AssistantLayer` makes that a compile error instead.
 */
export function joinAssistantAssetLayer(
  assistantAssetsRoot: string,
  layer: AssistantLayer,
  ...rest: string[]
): string {
  return path.join(assistantAssetsRoot, layer, ...rest);
}

export function joinLegacyAssistantSteering(destRoot: string, ...rest: string[]): string {
  return path.join(destRoot, LEGACY_ASSISTANT_STEERING_DIR, ...rest);
}

/**
 * Legacy pre-recut `.qfai/assistant/instructions/` surface — relocated
 * to constitution/ by `qfai init --upgrade-assistant-tree`. Helper kept
 * so call sites do not embed the literal segments and remain consistent
 * with the SSOT-style accessor used for the legacy steering surface.
 */
export const LEGACY_ASSISTANT_INSTRUCTIONS_DIR = ".qfai/assistant/instructions" as const;

export function joinLegacyAssistantInstructions(destRoot: string, ...rest: string[]): string {
  return path.join(destRoot, LEGACY_ASSISTANT_INSTRUCTIONS_DIR, ...rest);
}

export function joinProjectSteering(destRoot: string, ...rest: string[]): string {
  return path.join(destRoot, PROJECT_STEERING_DIR, ...rest);
}

export function migrationMemoRelativePath(version: string): string {
  return `${ASSISTANT_DIR}/process/${MIGRATIONS_SUBDIR}/v${version}-assistant-layer-recut.md`;
}

export function joinMigrationMemo(destRoot: string, version: string): string {
  return path.join(destRoot, migrationMemoRelativePath(version));
}

/**
 * SSOT for the work-log entry `kind` enum. MUST match
 * `.qfai/contracts/cli/worklog-entry.schema.md#kind enum` exactly.
 * Imported by:
 *   - worklogSurface.ts (ALLOWED_KINDS check)
 *   - init.ts (PROJECT_STEERING_README_BODY enumeration)
 * so the enum cannot drift between the validator and the seeded README.
 */
export const WORKLOG_ENTRY_KINDS = [
  "milestone",
  "decision",
  "risk",
  "consultation-needed",
  "unexpected",
  "unscoped-discovery",
  "handoff",
  "blocker",
  "scope-up",
  "scope-down",
  "spike",
] as const;

export type WorklogEntryKind = (typeof WORKLOG_ENTRY_KINDS)[number];

/**
 * SSOT for the work-log entry `status` enum. MUST match
 * `.qfai/contracts/cli/worklog-entry.schema.md#status enum` exactly.
 * Imported by:
 *   - worklogSurface.ts (ALLOWED_STATUS check)
 * so the enum cannot drift between the validator and the contract.
 */
export const WORKLOG_ENTRY_STATUSES = ["active", "handoff", "archived"] as const;

export type WorklogEntryStatus = (typeof WORKLOG_ENTRY_STATUSES)[number];

/**
 * SSOT for the handoff body required sections. MUST match
 * `.qfai/contracts/cli/worklog-entry.schema.md#kind: handoff body`.
 * Imported by:
 *   - worklogSurface.ts (REQUIRED_HANDOFF_SECTIONS check)
 *   - init.ts (PROJECT_STEERING_ENTRY_TEMPLATE)
 */
export const HANDOFF_REQUIRED_SECTIONS = [
  "## State of the task",
  "## Next single action",
  "## Constraints to preserve",
  "## Open questions",
  "## References to consult first",
] as const;
