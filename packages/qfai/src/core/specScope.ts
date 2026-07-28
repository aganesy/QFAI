import path from "node:path";

/**
 * Per-spec scoping for `qfai validate --spec <id>`.
 *
 * `qfai-sdd` delegates Slice in parallel per spec and gates each slice with
 * `validate`, but a repo-global run makes a worker fail on a sibling agent's
 * in-flight spec. A scope narrows a run to the named specs: findings owned by
 * an out-of-scope spec are dropped, and per-spec side effects (the
 * `specs-coverage/spec-NNNN.md` report) are not written for them.
 *
 * Repo-level findings — config, assistant assets, `_policies/**`, contracts —
 * are never filtered out: they are not owned by any single spec and a worker
 * that ignored them would gate on an incomplete picture.
 */
export type SpecScope = ReadonlySet<string>;

const SPEC_DIR_PATTERN = /^spec-(\d{4})$/i;

/**
 * Normalizes a CLI `--spec` value to a 4-digit spec number.
 *
 * Accepts `3`, `0003`, `spec-0003` and `spec-3`. Returns `null` when the value
 * carries no resolvable number so the caller can report a parse error rather
 * than silently validating everything.
 */
export function normalizeSpecId(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }
  const withoutPrefix = trimmed.replace(/^spec[-_]?/i, "");
  if (!/^\d{1,4}$/.test(withoutPrefix)) {
    return null;
  }
  return withoutPrefix.padStart(4, "0");
}

/**
 * Builds a scope from raw CLI values. Returns `undefined` when no `--spec` was
 * passed, which means "no scoping" — every spec participates.
 */
export function buildSpecScope(values: readonly string[] | undefined): SpecScope | undefined {
  if (values === undefined || values.length === 0) {
    return undefined;
  }
  const scope = new Set<string>();
  for (const value of values) {
    const normalized = normalizeSpecId(value);
    if (normalized !== null) {
      scope.add(normalized);
    }
  }
  return scope.size === 0 ? undefined : scope;
}

/** True when `specNumber` participates in `scope` (an absent scope includes everything). */
export function isSpecInScope(specNumber: string, scope: SpecScope | undefined): boolean {
  return scope === undefined || scope.has(specNumber);
}

/**
 * Returns the spec number that owns `filePath`, or `null` when the path is not
 * inside a `spec-NNNN` directory under `specsRoot` (including `_policies/**`,
 * which is shared and therefore owned by no spec).
 */
export function owningSpecNumber(filePath: string, specsRoot: string): string | null {
  const relative = path.relative(specsRoot, filePath);
  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }
  const [head] = relative.split(/[\\/]/);
  if (head === undefined) {
    return null;
  }
  const match = SPEC_DIR_PATTERN.exec(head);
  return match?.[1] ?? null;
}

/**
 * True when a finding on `filePath` belongs to the run's scope. Findings that
 * no spec owns always belong.
 */
export function isPathInSpecScope(
  filePath: string | undefined,
  specsRoot: string,
  scope: SpecScope | undefined,
): boolean {
  if (scope === undefined || filePath === undefined) {
    return true;
  }
  const owner = owningSpecNumber(filePath, specsRoot);
  return owner === null || scope.has(owner);
}
