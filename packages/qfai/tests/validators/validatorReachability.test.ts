import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// Anchored to this file, not to `process.cwd()`: a runner launched from the
// repo root resolves `src/core` to a path that does not exist, and the walk
// below would then scan nothing and pass vacuously.
// tests/validators/<this file> -> tests -> packages/qfai
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const coreRoot = path.join(packageRoot, "src", "core");

/**
 * Every entry point that can end up emitting findings. `validate.ts` is the one
 * that matters — it owns the profile tables — but a validator wired only into a
 * CLI command is still live, so the CLI roots are walked too rather than being
 * reported as dead.
 */
const ENTRY_POINTS = ["validate.ts", "../index.ts", "../cli/index.ts", "../cli/main.ts"] as const;

/**
 * Validator modules that no entry point reaches today, each pinned to the issue
 * that owns its fate. This is a freeze of the backlog, not permission to grow
 * it: a NEW unreachable module fails this test, which is the point — a
 * validator with its own tests and its own rule codes looks enforced to every
 * reader, and nothing else in the suite notices that it never runs.
 *
 * Removing an entry when its module is wired in (or deleted) is not merely
 * expected, it is required: the assertions below check the list in both
 * directions. An entry left behind after its module was connected would let a
 * later disconnection slip past unnoticed, because the filter would keep
 * hiding the module.
 */
const KNOWN_UNREACHABLE = new Map<string, string>([
  ["validators/atddLedger.ts", "#402 — QFAI-ATDD-001 is in no profile"],
  ["validators/auditProfile.ts", "unfiled — same class as #402"],
  ["validators/businessFlow.ts", "unfiled — same class as #402"],
  ["validators/mermaidFence.ts", "unfiled — same class as #402"],
  ["validators/requirePack.ts", "unfiled — same class as #402"],
  ["validators/requirementsContext.ts", "unfiled — same class as #402"],
  ["validators/skill/phaseOrdering.ts", "unfiled — same class as #402"],
  ["validators/skill/sidecarFlowOrdering.ts", "unfiled — same class as #402"],
  ["validators/uix/antiPreference.ts", "#403 — retired uix/ validators"],
  ["validators/uix/designSystemPresence.ts", "#403 — retired uix/ validators"],
  ["validators/uix/fixtureCoverage.ts", "#403 — retired uix/ validators"],
  ["validators/uix/index.ts", "#403 — retired uix/ validators"],
  ["validators/uix/nonUiOverfire.ts", "#403 — retired uix/ validators"],
  ["validators/uix/tasteReflection.ts", "#403 — retired uix/ validators"],
]);

/**
 * Validator functions the barrel re-exports but that nothing ever calls. A
 * re-export loads the module, so `collectReachable()` rightly calls it
 * reachable — yet the function never runs, so its rule codes can never fire.
 * The dispatch assertion below is what separates the two, and this is its
 * freeze of the backlog, on the same terms as `KNOWN_UNREACHABLE`.
 */
const KNOWN_UNDISPATCHED = new Map<string, string>([
  [
    "validateImportLiteEvidencePresence",
    "unfiled — QFAI-IMPLITE-* cannot fire; same class as #402",
  ],
  ["validateRequireIndexShape", "unfiled — QFAI-REQINDEX-* cannot fire; same class as #402"],
  [
    "validateDelegationMapIssues",
    // `tests/unit/validators-are-wired.test.ts` calls this one wired, but it
    // only checks that the name appears in the barrel's text — which is the
    // very re-export that hides the missing call site.
    "unfiled — re-exported and tested, never called; same class as #402",
  ],
  // Their only call site is `uix/nonUiOverfire.ts`, itself unreachable below.
  ["validateStrategyStrong", "#403 — retired uix/ validators"],
  ["validateTasteInterview", "#403 — retired uix/ validators"],
]);

/**
 * A relative specifier in an `import` / `export ... from` / `import(...)`
 * position. Only relative specifiers matter: a bare specifier is a dependency,
 * never a module of this package.
 *
 * Applied to {@link runtimeSource}, never to raw text: `import type` and a
 * specifier quoted inside a comment are erased before this runs, because
 * neither loads a module and neither can make a validator emit a finding.
 */
const RELATIVE_SPECIFIER = /(?:from|import)\s*\(?\s*["'](\.[^"']+)["']/g;

/**
 * An `import ... from` / `export ... from` statement. The clause is spelled out
 * (namespace, named bindings, or a default binding) rather than matched with a
 * wildcard so that a declaration such as `export function validateX() {}` can
 * never be mistaken for the head of the next module statement.
 */
const MODULE_STATEMENT =
  /^[ \t]*(?:import|export)\s+(?:type\s+)?(?:\*(?:\s+as\s+\w+)?|\{[^}]*\}|\w+(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+))?)\s+from\s*["'][^"']+["']/gm;

/**
 * Strip everything that cannot produce a runtime module edge: comments first
 * (a commented-out import is not an edge), then type-only statements — both
 * `import type { X } from` and an `import { type X } from` whose every named
 * binding is type-only, since TypeScript erases both.
 *
 * Line comments are only recognised after start-of-line or whitespace so that
 * the `//` of a URL inside a string literal does not swallow the rest of a
 * line.
 */
function runtimeSource(source: string): string {
  const withoutComments = source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|\s)\/\/[^\n]*/g, "$1");

  return withoutComments.replace(MODULE_STATEMENT, (statement) => {
    if (/^\s*(?:import|export)\s+type\b/.test(statement)) {
      return " ";
    }
    const braces = /\{([^}]*)\}/.exec(statement);
    if (braces?.[1] === undefined) {
      return statement;
    }
    const bindings = braces[1]
      .split(",")
      .map((binding) => binding.trim())
      .filter((binding) => binding.length > 0);

    return bindings.length > 0 && bindings.every((binding) => /^type\s/.test(binding))
      ? " "
      : statement;
  });
}

/**
 * Resolve a specifier the way NodeNext does for this package's own sources:
 * the emitted `.js` extension maps back to the `.ts` on disk, and a directory
 * specifier resolves to its `index.ts`.
 */
async function resolveSpecifier(specifier: string, fromFile: string): Promise<string | null> {
  let candidate = path.resolve(path.dirname(fromFile), specifier);

  if (candidate.endsWith(".js")) {
    candidate = `${candidate.slice(0, -".js".length)}.ts`;
  }

  const asIndex = `${candidate.replace(/\.ts$/, "")}/index.ts`;
  for (const target of [candidate, asIndex]) {
    try {
      const stats = await stat(target);
      if (stats.isFile()) {
        return target;
      }
    } catch {
      // Unresolvable here is not a failure: `.json` imports, asset paths and
      // type-only specifiers all land here and none of them can reach a
      // validator. `tsc -b` is what proves the imports resolve.
      continue;
    }
  }

  return null;
}

async function walkTsFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkTsFiles(full)));
    } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) {
      files.push(full);
    }
  }
  return files;
}

/** Files transitively imported from `ENTRY_POINTS`. */
async function collectReachable(): Promise<Set<string>> {
  const reachable = new Set<string>();
  const queue = ENTRY_POINTS.map((entry) => path.resolve(coreRoot, entry));

  while (queue.length > 0) {
    const file = queue.pop();
    if (file === undefined || reachable.has(file)) {
      continue;
    }
    reachable.add(file);

    let source: string;
    try {
      source = await readFile(file, "utf-8");
    } catch {
      // An entry point that no longer exists must not silently shrink the
      // graph; `ENTRY_POINTS` is asserted separately below.
      continue;
    }

    for (const match of runtimeSource(source).matchAll(RELATIVE_SPECIFIER)) {
      const specifier = match[1];
      if (specifier === undefined) {
        continue;
      }
      const resolved = await resolveSpecifier(specifier, file);
      if (resolved !== null && !reachable.has(resolved)) {
        queue.push(resolved);
      }
    }
  }

  return reachable;
}

/**
 * An export that survives compilation. A module whose every export is a `type`
 * or an `interface` emits nothing at runtime, so being reached only by
 * `import type` is correct for it and says nothing about a dead validator.
 */
const RUNTIME_EXPORT = /^[ \t]*export\s+(?!type\b|interface\b)/m;

/** Validator modules that can actually run, i.e. the ones this guard is about. */
async function collectValidatorModules(): Promise<string[]> {
  const files = await walkTsFiles(path.join(coreRoot, "validators"));
  const modules: string[] = [];
  for (const file of files) {
    try {
      if (RUNTIME_EXPORT.test(runtimeSource(await readFile(file, "utf-8")))) {
        modules.push(file);
      }
    } catch {
      // Unreadable here means the walk raced a delete; `tsc -b` owns that.
      continue;
    }
  }
  return modules;
}

/** The barrel every profile imports its validators from. */
const BARREL = path.join(coreRoot, "validators", "index.ts");

/** A `export { … } from "…"` clause in the barrel. */
const BARREL_REEXPORT = /export\s+(?:type\s+)?\{([^}]*)\}\s*from\s*["']([^"']+)["']/g;

/**
 * Every `validate*` binding the barrel re-exports, mapped to the module that
 * declares it. Type re-exports are skipped: a type cannot be dispatched.
 */
async function collectBarrelValidators(): Promise<Map<string, string>> {
  const source = await readFile(BARREL, "utf-8");
  const declaredIn = new Map<string, string>();

  for (const match of source.matchAll(BARREL_REEXPORT)) {
    const [, bindings, specifier] = match;
    if (bindings === undefined || specifier === undefined || /export\s+type/.test(match[0])) {
      continue;
    }
    const owner = await resolveSpecifier(specifier, BARREL);
    if (owner === null) {
      continue;
    }
    for (const binding of bindings.split(",")) {
      const name = binding
        .trim()
        .split(/\s+as\s+/)
        .pop()
        ?.trim();
      if (name !== undefined && /^validate[A-Z]/.test(name)) {
        declaredIn.set(name, owner);
      }
    }
  }

  return declaredIn;
}

const toRelative = (file: string): string =>
  path.relative(coreRoot, file).split(path.sep).join("/");

describe("validator reachability", () => {
  it("every entry point exists", async () => {
    for (const entry of ENTRY_POINTS) {
      const stats = await stat(path.resolve(coreRoot, entry));
      expect(stats.isFile(), `${entry} is not a file`).toBe(true);
    }
  });

  it("no validator module is unreachable from an entry point", async () => {
    const reachable = await collectReachable();
    const modules = await collectValidatorModules();
    expect(modules.length).toBeGreaterThan(0);

    const unreachable = modules
      .filter((file) => !reachable.has(file))
      .map(toRelative)
      .filter((relative) => !KNOWN_UNREACHABLE.has(relative))
      .sort();

    expect(unreachable).toEqual([]);
  });

  it("no pinned backlog entry has gone stale", async () => {
    const reachable = await collectReachable();
    const modules = new Set((await collectValidatorModules()).map(toRelative));

    // Deleted: the module named by the entry is gone, so the pin is dangling.
    const missing = [...KNOWN_UNREACHABLE.keys()].filter((relative) => !modules.has(relative));
    // Connected: the module is now reachable, so the entry is masking it. It
    // must be deleted here at the moment it is wired in, or a later regression
    // that disconnects it again cannot fail this test.
    const connected = [...KNOWN_UNREACHABLE.keys()].filter((relative) =>
      reachable.has(path.join(coreRoot, ...relative.split("/"))),
    );

    expect([...missing, ...connected].sort()).toEqual([]);
  });

  it("every validator the barrel re-exports is dispatched, not merely loaded", async () => {
    const reachable = await collectReachable();
    const declaredIn = await collectBarrelValidators();
    expect(declaredIn.size).toBeGreaterThan(0);

    const dispatched = new Set<string>();
    for (const file of reachable) {
      // The barrel's own re-export is the thing under suspicion, and a
      // reference inside the declaring module is not a dispatch either.
      if (file === BARREL) {
        continue;
      }
      let source: string;
      try {
        source = await readFile(file, "utf-8");
      } catch {
        continue;
      }
      for (const [name, owner] of declaredIn) {
        if (dispatched.has(name) || owner === file) {
          continue;
        }
        if (new RegExp(`\\b${name}\\b`).test(source)) {
          dispatched.add(name);
        }
      }
    }

    const undispatched = [...declaredIn.keys()].filter((name) => !dispatched.has(name)).sort();

    // Equality, not a subset: an entry whose validator has since been wired in
    // — or removed from the barrel — must be deleted from the pinned list in
    // the same change, or it would go on masking that validator forever.
    expect(undispatched).toEqual([...KNOWN_UNDISPATCHED.keys()].sort());
  });
});
