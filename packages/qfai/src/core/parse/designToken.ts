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
/** Deeper nesting than this is no real token tree, and walking it could exhaust the stack. */
const MAX_NESTING_DEPTH = 64;

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
  flattenTokens(layer as Record<string, unknown>, layerName, target, errors, [layer]);
}

function flattenTokens(
  obj: Record<string, unknown>,
  prefix: string,
  target: Map<string, DesignTokenValue>,
  errors: DesignTokenParseError[],
  ancestors: readonly object[],
): void {
  for (const [key, value] of Object.entries(obj)) {
    const path = `${prefix}.${key}`;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const record = value as Record<string, unknown>;
      const problem =
        findShapeProblem(record, ancestors) ??
        ("$value" in record ? findValueProblem(record.$value, [...ancestors, record]) : undefined);
      if (problem) {
        errors.push({ message: `${problem} at: ${path}; nothing under it is read.`, path });
        continue;
      }
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
        flattenTokens(record, path, target, errors, [...ancestors, record]);
      }
    }
  }
}

/** A YAML alias can make a node its own ancestor; such a graph has no end to walk. */
function findShapeProblem(value: object, ancestors: readonly object[]): string | undefined {
  if (ancestors.includes(value)) {
    return "YAML alias cycle";
  }
  if (ancestors.length >= MAX_NESTING_DEPTH) {
    return `Nesting deeper than ${MAX_NESTING_DEPTH} levels`;
  }
  return undefined;
}

function findValueProblem(value: unknown, ancestors: readonly object[]): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const own = findShapeProblem(value, ancestors);
  if (own) {
    return own;
  }
  const inner = [...ancestors, value];
  const children: unknown[] = Array.isArray(value) ? value : Object.values(value);
  for (const child of children) {
    const problem = findValueProblem(child, inner);
    if (problem) {
      return problem;
    }
  }
  return undefined;
}

function resolveAllReferences(result: DesignTokenParseResult): void {
  const allTokens = new Map<string, DesignTokenValue>();
  for (const [key, val] of result.primitives) allTokens.set(key, val);
  for (const [key, val] of result.semantics) allTokens.set(key, val);
  for (const [key, val] of result.components) allTokens.set(key, val);

  const outcomes = new Map<string, Outcome>();
  for (const [path] of allTokens) {
    resolveTokenRef(path, allTokens, outcomes, result);
  }
}

/**
 * A resolved token carries its height: the longest chain of references below
 * it, 0 for a literal. A token that cannot resolve stays failed, so whatever
 * references it fails too instead of holding a partial substitution.
 */
type Outcome = { value: string; height: number } | "failed";

/** `index` is the token's discovery order in this walk, `low` the smallest index it reaches back to. */
type Frame = { path: string; refs: readonly string[]; next: number; index: number; low: number };

/**
 * Resolves `start` and every token it reaches, walking an explicit stack so a
 * long chain cannot exhaust the call stack. The walk groups tokens into sets
 * that reference one another (Tarjan's strongly connected components) and
 * settles each set once every token it references outside the set is settled.
 * Each token's outcome, and the token a reference cycle is named at, depend on
 * the references alone, not on the order the file declares tokens in or on
 * which token the walk started from.
 */
function resolveTokenRef(
  start: string,
  allTokens: Map<string, DesignTokenValue>,
  outcomes: Map<string, Outcome>,
  result: DesignTokenParseResult,
): void {
  if (outcomes.has(start)) {
    return;
  }
  const openIndex = new Map<string, number>();
  const open: string[] = [];
  const frames: Frame[] = [];
  const enter = (path: string): void => {
    const index = openIndex.size;
    openIndex.set(path, index);
    open.push(path);
    frames.push({ path, refs: referencesOf(path, allTokens), next: 0, index, low: index });
  };
  enter(start);

  while (frames.length > 0) {
    const frame = frames[frames.length - 1];
    if (!frame) break;
    const refPath = frame.refs[frame.next];
    if (refPath !== undefined) {
      frame.next += 1;
      if (outcomes.has(refPath) || !allTokens.has(refPath)) continue;
      const refIndex = openIndex.get(refPath);
      if (refIndex === undefined) {
        enter(refPath);
      } else {
        frame.low = Math.min(frame.low, refIndex);
      }
      continue;
    }
    frames.pop();
    const parent = frames[frames.length - 1];
    if (parent) {
      parent.low = Math.min(parent.low, frame.low);
    }
    if (frame.low === frame.index) {
      const members = open.splice(open.indexOf(frame.path));
      settleComponent(members, allTokens, outcomes, result);
    }
  }
}

/**
 * Settles one set of tokens that reference one another. A set of two or more,
 * or one token referencing itself, is a reference cycle: it is reported once,
 * at its member whose name sorts first, and none of its members resolves.
 */
function settleComponent(
  members: readonly string[],
  allTokens: Map<string, DesignTokenValue>,
  outcomes: Map<string, Outcome>,
  result: DesignTokenParseResult,
): void {
  const sorted = [...members].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const [first] = sorted;
  if (first === undefined) {
    return;
  }
  if (sorted.length > 1 || referencesOf(first, allTokens).includes(first)) {
    result.errors.push({ message: `Circular reference detected: ${first}`, path: first });
  }
  for (const path of sorted) {
    settleToken(path, allTokens, outcomes, result);
  }
}

function referencesOf(path: string, allTokens: Map<string, DesignTokenValue>): string[] {
  const value = allTokens.get(path)?.$value;
  if (typeof value !== "string") {
    return [];
  }
  return [...value.matchAll(REF_PATTERN)].flatMap((ref) => (ref[1] ? [ref[1]] : []));
}

/** Decides one token once every token it references has an outcome. */
function settleToken(
  path: string,
  allTokens: Map<string, DesignTokenValue>,
  outcomes: Map<string, Outcome>,
  result: DesignTokenParseResult,
): void {
  const rawValue = stringifyTokenValue(allTokens.get(path)?.$value);
  let resolved = rawValue;
  let height = 0;
  let failed = false;

  for (const refPath of referencesOf(path, allTokens)) {
    if (!allTokens.has(refPath)) {
      result.errors.push({
        message: `Unresolved token reference: {${refPath}} at ${path}`,
        path,
      });
      failed = true;
      continue;
    }
    const outcome = outcomes.get(refPath);
    if (outcome === undefined || outcome === "failed") {
      failed = true;
      continue;
    }
    height = Math.max(height, outcome.height + 1);
    resolved = resolved.split(`{${refPath}}`).join(outcome.value);
  }

  if (!failed && height > MAX_RESOLVE_DEPTH) {
    result.errors.push({
      message: `Max reference depth exceeded at: ${path}`,
      path,
    });
    failed = true;
  }

  if (failed) {
    outcomes.set(path, "failed");
    return;
  }
  outcomes.set(path, { value: resolved, height });
  result.resolved.set(path, resolved);
}

function stringifyTokenValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value && typeof value === "object") {
    return stableJsonStringify(value);
  }
  return "";
}

function stableJsonStringify(value: unknown): string {
  const normalized = normalizeForStableJson(value);
  return JSON.stringify(normalized);
}

function normalizeForStableJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeForStableJson(item));
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    const normalized: Record<string, unknown> = {};
    for (const key of keys) {
      normalized[key] = normalizeForStableJson(record[key]);
    }
    return normalized;
  }
  return value;
}
