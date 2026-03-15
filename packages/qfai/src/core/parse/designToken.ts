import { parse as parseYaml } from "yaml";

export type DesignTokenValue = {
  $type?: string;
  $value: unknown;
  $description?: string;
  platform?: string;
};

export type DesignTokenParseResult = {
  primitives: Map<string, DesignTokenValue>;
  semantics: Map<string, DesignTokenValue>;
  components: Map<string, DesignTokenValue>;
  resolved: Map<string, string>;
  errors: DesignTokenParseError[];
};

export type DesignTokenParseError = {
  message: string;
  path?: string;
  line?: number;
  column?: number;
};

const REF_PATTERN = /\{([^}]+)\}/g;
const MAX_RESOLVE_DEPTH = 10;

export function parseDesignToken(yamlContent: string): DesignTokenParseResult {
  const result: DesignTokenParseResult = {
    primitives: new Map(),
    semantics: new Map(),
    components: new Map(),
    resolved: new Map(),
    errors: [],
  };

  let parsed: unknown;
  try {
    parsed = parseYaml(yamlContent);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    result.errors.push({ message: `YAML parse error: ${msg}` });
    return result;
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    result.errors.push({ message: "Design Token YAML must be an object at root level." });
    return result;
  }

  const root = parsed as Record<string, unknown>;

  collectLayer(root.primitive, "primitive", result.primitives, result.errors);
  collectLayer(root.semantic, "semantic", result.semantics, result.errors);
  collectLayer(root.component, "component", result.components, result.errors);

  resolveAllReferences(result);

  return result;
}

function collectLayer(
  layer: unknown,
  layerName: string,
  target: Map<string, DesignTokenValue>,
  errors: DesignTokenParseError[],
): void {
  if (layer === undefined || layer === null) {
    return;
  }
  if (typeof layer !== "object" || Array.isArray(layer)) {
    errors.push({ message: `${layerName} layer must be an object.`, path: layerName });
    return;
  }
  flattenTokens(layer as Record<string, unknown>, layerName, target, errors);
}

function flattenTokens(
  obj: Record<string, unknown>,
  prefix: string,
  target: Map<string, DesignTokenValue>,
  errors: DesignTokenParseError[],
): void {
  for (const [key, value] of Object.entries(obj)) {
    const path = `${prefix}.${key}`;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const record = value as Record<string, unknown>;
      if ("$value" in record) {
        const token: DesignTokenValue = {
          $value: record.$value,
        };
        if (typeof record.$type === "string") {
          token.$type = record.$type;
        }
        if (typeof record.$description === "string") {
          token.$description = record.$description;
        }
        if (typeof record.platform === "string") {
          token.platform = record.platform;
        }
        target.set(path, token);
      } else {
        flattenTokens(record, path, target, errors);
      }
    }
  }
}

function resolveAllReferences(result: DesignTokenParseResult): void {
  const allTokens = new Map<string, DesignTokenValue>();
  for (const [key, val] of result.primitives) allTokens.set(key, val);
  for (const [key, val] of result.semantics) allTokens.set(key, val);
  for (const [key, val] of result.components) allTokens.set(key, val);

  for (const [path] of allTokens) {
    resolveTokenRef(path, allTokens, new Set(), 0, result);
  }
}

function resolveTokenRef(
  path: string,
  allTokens: Map<string, DesignTokenValue>,
  visited: Set<string>,
  depth: number,
  result: DesignTokenParseResult,
): string | undefined {
  if (result.resolved.has(path)) {
    return result.resolved.get(path);
  }

  if (depth > MAX_RESOLVE_DEPTH) {
    result.errors.push({
      message: `Max reference depth exceeded at: ${path}`,
      path,
    });
    return undefined;
  }

  if (visited.has(path)) {
    result.errors.push({
      message: `Circular reference detected: ${path}`,
      path,
    });
    return undefined;
  }

  const token = allTokens.get(path);
  if (!token) {
    return undefined;
  }

  const rawValue = stringifyTokenValue(token.$value);
  const refs = [...rawValue.matchAll(REF_PATTERN)];

  if (refs.length === 0) {
    result.resolved.set(path, rawValue);
    return rawValue;
  }

  visited.add(path);
  let resolved = rawValue;

  for (const ref of refs) {
    const refPath = ref[1];
    if (!refPath) continue;

    const refToken = allTokens.get(refPath);
    if (!refToken) {
      result.errors.push({
        message: `Unresolved token reference: {${refPath}} at ${path}`,
        path,
      });
      continue;
    }

    const refValue = resolveTokenRef(refPath, allTokens, new Set(visited), depth + 1, result);
    if (refValue !== undefined) {
      resolved = resolved.split(`{${refPath}}`).join(refValue);
    }
  }

  result.resolved.set(path, resolved);
  return resolved;
}

export { resolveTokenRef as _resolveTokenRefForTest };

function stringifyTokenValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}
