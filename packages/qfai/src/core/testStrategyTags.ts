export const LAYER_TAGS = new Set([
  "layer-unit",
  "layer-component",
  "layer-integration",
  "layer-api",
  "layer-e2e",
]);
export const SIZE_TAGS = new Set(["size-s", "size-m", "size-l"]);

export type LayerBucket =
  | "unit"
  | "component"
  | "integration"
  | "api"
  | "e2e"
  | "none"
  | "unknown";
export type SizeBucket = "s" | "m" | "l" | "none" | "unknown";

export function evaluateStrategyTags(tags: string[]): {
  layerTags: string[];
  sizeTags: string[];
  unknownLayerTags: string[];
  unknownSizeTags: string[];
  multipleLayerTags: boolean;
  multipleSizeTags: boolean;
  hasAnyTag: boolean;
  isAdopted: boolean;
} {
  const layerTags = tags.filter((tag) => tag.startsWith("layer-"));
  const sizeTags = tags.filter((tag) => tag.startsWith("size-"));
  const unknownLayerTags = layerTags.filter((tag) => !LAYER_TAGS.has(tag));
  const unknownSizeTags = sizeTags.filter((tag) => !SIZE_TAGS.has(tag));
  const validLayerTags = layerTags.filter((tag) => LAYER_TAGS.has(tag));
  const validSizeTags = sizeTags.filter((tag) => SIZE_TAGS.has(tag));
  const multipleLayerTags = layerTags.length > 1;
  const multipleSizeTags = sizeTags.length > 1;
  const hasAnyTag = layerTags.length > 0 || sizeTags.length > 0;
  const isAdopted =
    validLayerTags.length === 1 &&
    validSizeTags.length === 1 &&
    layerTags.length === 1 &&
    sizeTags.length === 1 &&
    unknownLayerTags.length === 0 &&
    unknownSizeTags.length === 0;

  return {
    layerTags,
    sizeTags,
    unknownLayerTags,
    unknownSizeTags,
    multipleLayerTags,
    multipleSizeTags,
    hasAnyTag,
    isAdopted,
  };
}

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
  }
  if (validTags.length === 0 && unknownTags.length === 0) {
    return "none";
  }
  return "unknown";
}
