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

export type SpecScopeResolution = {
  /** `undefined` when no `--spec` was passed: every spec participates. */
  scope: SpecScope | undefined;
  /** Raw `--spec` values that carry no resolvable spec number. */
  invalid: string[];
};

/**
 * Resolves raw CLI `--spec` values, keeping the unresolvable ones so the caller
 * can report them.
 *
 * Silently dropping a typo would be the worst outcome for a gate: `--spec nope`
 * would collapse to "no scoping" and the run would report on the whole repo,
 * while `--spec 9999` would produce an empty target set — both exiting 0 without
 * ever looking at the spec the operator asked for.
 */
export function resolveSpecScope(values: readonly string[] | undefined): SpecScopeResolution {
  if (values === undefined || values.length === 0) {
    return { scope: undefined, invalid: [] };
  }
  const scope = new Set<string>();
  const invalid: string[] = [];
  for (const value of values) {
    const normalized = normalizeSpecId(value);
    if (normalized === null) {
      invalid.push(value);
      continue;
    }
    scope.add(normalized);
  }
  return { scope, invalid };
}

/**
 * Builds a scope from raw CLI values. Returns `undefined` when no `--spec` was
 * passed, which means "no scoping" — every spec participates.
 *
 * Prefer {@link resolveSpecScope} at a CLI boundary: this helper discards the
 * unresolvable values, and an all-invalid list collapses to "no scoping".
 */
export function buildSpecScope(values: readonly string[] | undefined): SpecScope | undefined {
  const { scope } = resolveSpecScope(values);
  return scope === undefined || scope.size === 0 ? undefined : scope;
}

/** True when `specNumber` participates in `scope` (an absent scope includes everything). */
export function isSpecInScope(specNumber: string, scope: SpecScope | undefined): boolean {
  return scope === undefined || scope.has(specNumber);
}

/** Where paths are resolved from. Both roots are absolute. */
export type SpecScopeRoots = {
  /** Repository root, used to resolve repo-relative `finding.file` values. */
  root: string;
  /** Absolute `specsDir`. */
  specsRoot: string;
};

/**
 * Returns the spec number that owns `filePath`, or `null` when the path is not
 * inside a `spec-NNNN` directory under `specsRoot` (including `_policies/**`,
 * which is shared and therefore owned by no spec).
 *
 * `finding.file` is absolute for some validators and repo-relative for others
 * (`surfaceTypeDrift` emits `.qfai/specs/spec-0004/01_Spec.md`), so the path is
 * resolved against `root` first. Comparing a repo-relative path with an
 * absolute `specsRoot` produces a `..`-prefixed result and would classify every
 * such finding as repo-level — leaking a sibling spec's warnings into a scoped
 * `--strict` run.
 */
/** Whether a path is under `specsRoot` at all — see {@link isFindingInSpecScope}. */
function isInsideSpecsRoot(filePath: string, roots: SpecScopeRoots): boolean {
  const absolute = path.isAbsolute(filePath) ? filePath : path.resolve(roots.root, filePath);
  const relative = path.relative(roots.specsRoot, absolute);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

export function owningSpecNumber(filePath: string, roots: SpecScopeRoots): string | null {
  const absolute = path.isAbsolute(filePath) ? filePath : path.resolve(roots.root, filePath);
  const relative = path.relative(roots.specsRoot, absolute);
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
  roots: SpecScopeRoots,
  scope: SpecScope | undefined,
): boolean {
  if (scope === undefined || filePath === undefined) {
    return true;
  }
  const owner = owningSpecNumber(filePath, roots);
  return owner === null || scope.has(owner);
}

/**
 * True when a finding belongs to the run's scope.
 *
 * A finding may implicate several files while carrying only one representative
 * `file` — `QFAI-ID-001` reports a duplicate ID against the lexicographically
 * first of the files that define it. Judging by that single path would drop a
 * violation the in-scope spec is party to (spec-0003 sorts first, so scoping to
 * spec-0004 would hide its own duplicate). Every implicated path is therefore
 * considered, and one in-scope path keeps the finding.
 */
export function isFindingInSpecScope(
  finding: { file?: string; relatedFiles?: string[] },
  roots: SpecScopeRoots,
  scope: SpecScope | undefined,
): boolean {
  if (scope === undefined) {
    return true;
  }
  const paths = [finding.file, ...(finding.relatedFiles ?? [])].filter(
    (value): value is string => value !== undefined,
  );
  if (paths.length === 0) {
    return true;
  }
  // An unowned path means "unattributed", not "belongs to every spec". Judging
  // with `some(isPathInSpecScope)` over the whole list made one repo-level path
  // grant universal membership, so a finding whose representative `file` is a
  // test path (`tests/integration/spec-0001/…` — outside `specsRoot`, hence
  // unowned) survived every `--spec` filter no matter what its `relatedFiles`
  // attributed it to. Once any path names an owning spec the finding IS
  // attributed, and only those owners decide.
  // Three kinds of path, and only the first two say anything about scope.
  //
  //   - inside a `spec-NNNN` directory: an owner;
  //   - inside `specsRoot` but not in one — `_policies/**` — a **shared spec
  //     artifact**. A finding that names one is genuinely repo-level: the
  //     duplicate `QFAI-ID-001` reports between a shared policy and one spec is
  //     present for every spec, and dropping it outside that spec's own run hid
  //     it from the others;
  //   - outside `specsRoot` — a `tests/**` file, say — **auxiliary**. It is the
  //     path the operator edits, not a claim about ownership, and letting it
  //     grant universal membership is what made attributed findings survive
  //     every `--spec` filter.
  const owners: string[] = [];
  let sharedSpecArtifact = false;
  for (const value of paths) {
    const owner = owningSpecNumber(value, roots);
    if (owner !== null) {
      owners.push(owner);
    } else if (isInsideSpecsRoot(value, roots)) {
      sharedSpecArtifact = true;
    }
  }
  if (sharedSpecArtifact || owners.length === 0) {
    return true;
  }
  return owners.some((owner) => scope.has(owner));
}
