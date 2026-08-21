export const LAYER_TAGS = new Set([
  "layer-unit",
  "layer-component",
  "layer-integration",
  "layer-api",
  "layer-e2e",
]);
export const SIZE_TAGS = new Set(["size-s", "size-m", "size-l"]);

export type LayerBucket = "unit" | "component" | "integration" | "api" | "e2e" | "none" | "unknown";
export type SizeBucket = "s" | "m" | "l" | "none" | "unknown";

export function classifyLayer(tags: string[]): LayerBucket {
  const layerTags = tags.filter((tag) => tag.startsWith("layer-"));
  const validTags = layerTags.filter((tag) => LAYER_TAGS.has(tag));
  const unknownTags = layerTags.filter((tag) => !LAYER_TAGS.has(tag));

  if (validTags.length === 1 && unknownTags.length === 0) {
    const name = validTags[0];
    if (name === "layer-unit") return "unit";
    if (name === "layer-component") return "component";
    if (name === "layer-integration") return "integration";
    if (name === "layer-api") return "api";
    if (name === "layer-e2e") return "e2e";
    return "unknown";
  }
  if (validTags.length === 0 && unknownTags.length === 0) {
    return "none";
  }
  return "unknown";
}

export function classifySize(tags: string[]): SizeBucket {
  const sizeTags = tags.filter((tag) => tag.startsWith("size-"));
  const validTags = sizeTags.filter((tag) => SIZE_TAGS.has(tag));
  const unknownTags = sizeTags.filter((tag) => !SIZE_TAGS.has(tag));

  if (validTags.length === 1 && unknownTags.length === 0) {
    const name = validTags[0];
    if (name === "size-s") return "s";
    if (name === "size-m") return "m";
    if (name === "size-l") return "l";
    return "unknown";
  }
  if (validTags.length === 0 && unknownTags.length === 0) {
    return "none";
  }
  return "unknown";
}
