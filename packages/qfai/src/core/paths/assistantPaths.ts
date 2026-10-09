import path from "node:path";

/**
 * SSOT for the assistant-tree path segments.
 * Hard-coded `.qfai/assistant/<layer>/` literals elsewhere in
 * the codebase are lint-rejected; build path strings through
 * the helpers in this module.
 */

export const ASSISTANT_DIR = ".qfai/assistant" as const;

export const ASSISTANT_LAYERS = ["rule", "skill", "step", "agent", "prompt"] as const;

export type AssistantLayer = (typeof ASSISTANT_LAYERS)[number];

/** The layers `qfai init --force` overwrites from the package. */
export const REFRESHED_ASSISTANT_LAYERS = [
  "skill",
  "step",
  "agent",
  "rule",
] as const satisfies readonly AssistantLayer[];

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
