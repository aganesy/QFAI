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
 * Removing an entry when its module is wired in (or deleted) is expected. The
 * assertion below only requires that the unreachable set stays a subset of this
 * list, so clearing an issue never breaks the guard.
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
 * A relative specifier in an `import` / `export ... from` / `import(...)`
 * position. Only relative specifiers matter: a bare specifier is a dependency,
 * never a module of this package.
 */
const RELATIVE_SPECIFIER = /(?:from|import)\s*\(?\s*["'](\.[^"']+)["']/g;

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

    for (const match of source.matchAll(RELATIVE_SPECIFIER)) {
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
    const modules = await walkTsFiles(path.join(coreRoot, "validators"));
    expect(modules.length).toBeGreaterThan(0);

    const unreachable = modules
      .filter((file) => !reachable.has(file))
      .map(toRelative)
      .filter((relative) => !KNOWN_UNREACHABLE.has(relative))
      .sort();

    expect(unreachable).toEqual([]);
  });

  it("the pinned backlog names only validator modules that still exist", async () => {
    const modules = new Set((await walkTsFiles(path.join(coreRoot, "validators"))).map(toRelative));
    const stale = [...KNOWN_UNREACHABLE.keys()].filter((relative) => !modules.has(relative)).sort();

    expect(stale).toEqual([]);
  });
});
