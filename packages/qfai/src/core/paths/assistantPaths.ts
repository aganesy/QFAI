import path from "node:path";

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

export const MIGRATIONS_SUBDIR = "migrations" as const;

/**
 * Pinned sunset for the legacy `.qfai/assistant/steering/` layout.
 * SSOT shared by `qfai init` (sunset text in the migration memo and
 * the D-DEPRECATED-PATH info line) AND by the
 * `assistantTreeMigration` validator (severity escalation past the
 * cutoff). Keeping these two surfaces in sync via a single constant
 * prevents the migration helper from advertising one cutoff while
 * the validator enforces a different one.
 */
export const LEGACY_STEERING_SUNSET = { major: 1, minor: 10 } as const;

export function legacyAssistantSteeringSunsetLabel(): string {
  return `${LEGACY_STEERING_SUNSET.major}.${LEGACY_STEERING_SUNSET.minor}.0`;
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
