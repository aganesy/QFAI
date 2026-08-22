/**
 * Meta-test: every prototyping validator function with `Issue[]` return must
 * be called from the validate.ts symbol graph (validate.ts itself, OR an
 * orchestrator imported by validate.ts).
 *
 * This catches the "validator written but never invoked" failure mode that
 * allowed `validateExecutionPlan` and `validateDelegationMap` to lurk as dead
 * code in v1.8.3 (RR §8.6). Adding a new prototyping validator without
 * wiring it into runPrototypingValidators (directly or via an orchestrator
 * like validateStateGate) MUST fail this test in CI.
 *
 * Implementation strategy:
 *   1. Walk every TS file under src/core/validators/prototyping/
 *   2. Extract every `export function validate*(`
 *   3. Load the module graph: validate.ts plus every file it imports under
 *      `./validators/...`, and their imports in turn (2-hop). This reaches the
 *      orchestrator pattern where validate.ts imports `validateStateGate` and
 *      the orchestrator internally calls a sibling validator.
 *   4. Walk that graph one *function body* at a time: every loaded module's
 *      top-level code and validate.ts's *exported* functions are the seeds,
 *      and any other body — including validate.ts's own orchestrators — joins
 *      them only once reachable code uses its name. Assert each validator is
 *      used from what that walk reaches, OR is on the documented
 *      PENDING_WIRING allowlist (existing dead code that requires a
 *      follow-up wiring effort).
 *
 * Step 4 is the load-bearing one. This guard used to decide reachability with
 * `String.includes` over raw file text, which counted a name mentioned in a
 * doc comment and a name re-exported from the validators barrel as evidence of
 * wiring. Both are non-calls, and `src/core/validators/index.ts` re-exports
 * every prototyping validator by design (the second test below requires it),
 * so the guard could not fail for the situation it was written for — and
 * because that barrel pulls every validator file into the module graph, mere
 * membership in the graph is not wiring either: one dead validator calling
 * another must not vouch for it. See `tests/helpers/wiringGraph.ts`.
 */
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  buildWiringGraph,
  collectModuleBindings,
  stripCommentsAndLiterals,
  type WiringGraph,
  type WiringModule,
} from "../helpers/wiringGraph.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROTOTYPING_VALIDATORS_DIR = path.resolve(__dirname, "../../src/core/validators/prototyping");
const VALIDATORS_INDEX = path.resolve(__dirname, "../../src/core/validators/index.ts");
const VALIDATE_TS = path.resolve(__dirname, "../../src/core/validate.ts");
const SRC_ROOT = path.resolve(__dirname, "../../src");

const PUBLIC_VALIDATOR_RE = /^export\s+(?:async\s+)?function\s+(validate\w+)\s*\(/gm;

/**
 * Legacy custom-Issue-returning functions kept for backward compatibility
 * (will be deleted in Phase 7). Their *Issues replacement is the wiring path.
 */
const DEPRECATED_LEGACY_VALIDATORS = new Set<string>([
  "validateExecutionPlan",
  "validateDelegationMap",
]);

/**
 * Validators known to be dead code awaiting wiring.
 *
 * `validateDelegationMapIssues` (QFAI-PROT-311) is defined, unit-tested and
 * re-exported from the barrel, but nothing calls it — the old raw-text guard
 * accepted that barrel line as proof of wiring. Wiring it back into
 * runPrototypingValidators is tracked separately (issue #563); it is
 * allowlisted here so this guard reports the truth instead of a false green.
 *
 * This list MUST shrink over time and MUST never grow without explicit
 * justification. The sentinel below pins its exact contents and re-checks that
 * every entry is still genuinely unwired, so neither a new entry nor an
 * exemption that has outlived its reason goes unnoticed.
 */
const PENDING_WIRING: ReadonlySet<string> = new Set<string>(["validateDelegationMapIssues"]);

/**
 * Validators this guard names explicitly, keyed by the issue code they own.
 *
 * Every entry must resolve to a real definition under
 * validators/prototyping/. `validateExecutionPlanIssues` (QFAI-PROT-310) used
 * to be asserted here and no longer exists anywhere in `src/`: its only
 * occurrence was prose inside a doc comment, which the raw-text guard happily
 * accepted. Its catalog entry is left alone on purpose — orphaned catalog keys
 * are tracked separately.
 */
const CATALOG_OWNERS: ReadonlyMap<string, string> = new Map<string, string>([
  ["QFAI-PROT-311", "validateDelegationMapIssues"],
]);

async function listTsFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir);
  const out: string[] = [];
  for (const name of entries) {
    if (name.endsWith(".d.ts")) continue;
    const full = path.join(dir, name);
    const s = await stat(full);
    if (s.isDirectory()) {
      out.push(...(await listTsFiles(full)));
    } else if (name.endsWith(".ts") && !name.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
}

async function collectPublicValidators(
  dir: string,
): Promise<Array<{ name: string; file: string }>> {
  const files = await listTsFiles(dir);
  const out: Array<{ name: string; file: string }> = [];
  for (const file of files) {
    // Comment-stripped, so a commented-out declaration cannot register as a
    // definition the rest of this file then treats as real.
    const body = stripCommentsAndLiterals(await readFile(file, "utf-8"));
    PUBLIC_VALIDATOR_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = PUBLIC_VALIDATOR_RE.exec(body)) !== null) {
      const name = match[1];
      if (name !== undefined && !DEPRECATED_LEGACY_VALIDATORS.has(name)) {
        out.push({ name, file });
      }
    }
  }
  return out;
}

/** Resolves a relative import specifier to a `.ts` path inside `src/`. */
function resolveLocalImport(fromFile: string, specifier: string): string | undefined {
  const resolved = path.resolve(path.dirname(fromFile), specifier.replace(/\.js$/, ".ts"));
  return resolved.startsWith(SRC_ROOT) ? resolved : undefined;
}

/** Reads a source file, returning undefined for anything unresolvable. */
async function readSourceOrUndefined(file: string): Promise<string | undefined> {
  try {
    return await readFile(file, "utf-8");
  } catch {
    // A directory index or a specifier that does not map 1:1 onto a file —
    // best-effort traversal, the caller simply gets no fragment.
    return undefined;
  }
}

/**
 * The relative specifiers this module actually evaluates at runtime.
 *
 * Only value `import` / `export … from` statements count. Matching every
 * `from "./…"` in the raw text pulled in modules reached by an `import type`
 * edge — erased at compile time — as well as any specifier written in a
 * comment or a string, and each such module's top-level code was then treated
 * as reachable. A validator used at the top level of a module nobody evaluates
 * would have read as wired. {@link collectModuleBindings} strips comments,
 * template and regex literals and keeps only runtime edges.
 */
function localImportSpecifiers(body: string): string[] {
  return collectModuleBindings(body).runtimeSpecifiers.filter((specifier) =>
    specifier.startsWith("."),
  );
}

/**
 * Build the call graph rooted at validate.ts: validate.ts plus every local file
 * it imports, and their local imports in turn, to a fixed point. Orchestrators
 * that wrap multiple sibling validators are detected this way, however many
 * modules deep the delegation runs.
 *
 * Being *in* that module graph is not wiring. `validators/index.ts` is a barrel
 * that re-exports every prototyping validator, so every one of those files is
 * loaded no matter what calls it; a dead validator calling another dead
 * validator would otherwise make the second look wired. {@link buildWiringGraph}
 * therefore admits a function body only once code already proven reachable uses
 * that function — import aliases (`import { validateFoo as runFoo }`) included,
 * and validate.ts's own non-exported orchestrators held to the same rule, so
 * deleting the `runPrototypingValidators(...)` call is caught rather than
 * masked by that orchestrator's body still being scanned.
 */
async function buildValidateWiringGraph(): Promise<WiringGraph> {
  const validateBody = await readFile(VALIDATE_TS, "utf-8");
  const visited = new Set<string>([VALIDATE_TS]);
  const frontier: Array<{ file: string; source: string }> = [
    { file: VALIDATE_TS, source: validateBody },
  ];
  const imported: WiringModule[] = [];

  // Fixed point, not a fixed depth: an orchestrator reached through the barrel
  // may itself delegate through a helper module, and stopping at two hops would
  // report the validator that helper calls as unwired.
  while (frontier.length > 0) {
    const current = frontier.pop();
    if (current === undefined) continue;
    for (const rel of localImportSpecifiers(current.source)) {
      const resolved = resolveLocalImport(current.file, rel);
      if (resolved === undefined || visited.has(resolved)) continue;
      visited.add(resolved);
      const source = await readSourceOrUndefined(resolved);
      if (source === undefined) continue;
      imported.push({ file: resolved, source });
      frontier.push({ file: resolved, source });
    }
  }
  return buildWiringGraph({ file: VALIDATE_TS, source: validateBody }, imported);
}

describe("meta-test: prototyping validators are wired into the pipeline", () => {
  it("every public Issue[]-returning validator under validators/prototyping/ is called from validate.ts", async () => {
    const validators = await collectPublicValidators(PROTOTYPING_VALIDATORS_DIR);
    const graph = await buildValidateWiringGraph();

    expect(validators.length, "expected at least one public validator").toBeGreaterThan(0);

    const unwired: Array<{ name: string; file: string }> = [];
    for (const { name, file } of validators) {
      if (PENDING_WIRING.has(name)) continue;
      if (!graph.isCalled(name)) {
        unwired.push({ name, file });
      }
    }

    if (unwired.length > 0) {
      const lines = unwired
        .map((u) => `  - ${u.name} (${path.relative(process.cwd(), u.file)})`)
        .join("\n");
      throw new Error(
        `The following prototyping validators are exported but never called from validate.ts:\n${lines}\n\n` +
          "Wire the validator into runPrototypingValidators (directly or via an orchestrator " +
          "like validateStateGate) before merging. A barrel re-export or a doc-comment mention " +
          "is not wiring. This guard exists to prevent the v1.8.3 dead-code-validator " +
          "regression (RR §8.6).",
      );
    }
  });

  it("validators/index.ts re-exports every public prototyping validator", async () => {
    const validators = await collectPublicValidators(PROTOTYPING_VALIDATORS_DIR);
    const indexBody = await readFile(VALIDATORS_INDEX, "utf-8");

    const missingExports: string[] = [];
    for (const { name } of validators) {
      if (!indexBody.includes(name)) {
        missingExports.push(name);
      }
    }

    expect(
      missingExports,
      `validators/index.ts must re-export every public prototyping validator. Missing: ${missingExports.join(", ")}`,
    ).toEqual([]);
  });

  it("every validator named by this guard still exists and is called", async () => {
    const defined = new Set(
      (await collectPublicValidators(PROTOTYPING_VALIDATORS_DIR)).map((v) => v.name),
    );
    const graph = await buildValidateWiringGraph();

    const missingDefinitions: string[] = [];
    const notCalled: string[] = [];
    for (const [code, name] of CATALOG_OWNERS) {
      if (!defined.has(name)) missingDefinitions.push(`${name} (${code})`);
      else if (!PENDING_WIRING.has(name) && !graph.isCalled(name)) {
        notCalled.push(`${name} (${code})`);
      }
    }

    expect(
      missingDefinitions,
      "a validator named here no longer exists under validators/prototyping/ — " +
        "restore it, or drop the entry together with its catalog code",
    ).toEqual([]);
    expect(notCalled, "named validators must reach runPrototypingValidators").toEqual([]);
  });

  it("PENDING_WIRING lists exactly the known-unwired validators", async () => {
    // Tripwire: a new entry means a contributor shipped a validator nothing
    // calls, and must be justified here in writing. The list MUST shrink —
    // delete the entry (and this expectation's element) as soon as #563 wires
    // validateDelegationMapIssues into runPrototypingValidators.
    expect([...PENDING_WIRING].sort()).toEqual(["validateDelegationMapIssues"]);

    const defined = new Set(
      (await collectPublicValidators(PROTOTYPING_VALIDATORS_DIR)).map((v) => v.name),
    );
    const stale = [...PENDING_WIRING].filter((name) => !defined.has(name));
    expect(stale, "PENDING_WIRING names a validator that no longer exists").toEqual([]);

    // The exemption must expire the moment it stops being true. Without this,
    // wiring validateDelegationMapIssues (#563) would leave a permanent
    // exemption behind: the main test and CATALOG_OWNERS both skip allowlisted
    // names, so a later regression that unwires it again would go unnoticed.
    const graph = await buildValidateWiringGraph();
    const nowWired = [...PENDING_WIRING].filter((name) => graph.isCalled(name));
    expect(
      nowWired,
      "these validators are wired now — delete them from PENDING_WIRING (and from the " +
        "expectation above) so the guard starts enforcing their wiring again",
    ).toEqual([]);
  });
});
