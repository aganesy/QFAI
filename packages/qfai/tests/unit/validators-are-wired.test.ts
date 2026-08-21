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
 *   3. Build the "reachable code": validate.ts plus the source bodies of
 *      every file it imports under `./validators/...`, and their imports in
 *      turn (2-hop). This handles the orchestrator pattern where validate.ts
 *      imports `validateStateGate` and the orchestrator internally calls a
 *      sibling validator.
 *   4. Reduce that corpus to executable text — comments, string literals and
 *      `function name(` headers removed — and assert each validator name
 *      appears there as a *call expression*, OR is on the documented
 *      PENDING_WIRING allowlist (existing dead code that requires a
 *      follow-up wiring effort).
 *
 * Step 4 is the load-bearing one. This guard used to decide reachability with
 * `String.includes` over raw file text, which counted a name mentioned in a
 * doc comment and a name re-exported from the validators barrel as evidence of
 * wiring. Both are non-calls, and `src/core/validators/index.ts` re-exports
 * every prototyping validator by design (the second test below requires it),
 * so the guard could not fail for the situation it was written for. See
 * `tests/helpers/wiringGraph.ts`.
 */
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { isInvoked, stripCommentsAndLiterals, toExecutableCode } from "../helpers/wiringGraph.js";

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
 * justification. The sentinel below pins its exact contents so neither a new
 * entry nor a silently stale one goes unnoticed.
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

function localImportSpecifiers(body: string): string[] {
  const importRe = /from\s+["'](\.\.?\/[\w./-]+)["']/g;
  const out: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = importRe.exec(body)) !== null) {
    const rel = match[1];
    if (rel !== undefined) out.push(rel);
  }
  return out;
}

/**
 * Build the "reachable from validate.ts" code by including validate.ts plus
 * every file it imports under `./validators/`, `./prototyping/` or `./uiux/`,
 * and their imports in turn (2-hop). Orchestrators that wrap multiple sibling
 * validators are detected this way.
 *
 * The result is reduced to executable text: comments, literals and function
 * declaration headers are removed, so only a real call expression can satisfy
 * {@link isInvoked}.
 */
async function buildReachableCode(): Promise<string> {
  const validateBody = await readFile(VALIDATE_TS, "utf-8");
  const visited = new Set<string>();
  const fragments: string[] = [validateBody];

  for (const rel of localImportSpecifiers(validateBody)) {
    const resolved = resolveLocalImport(VALIDATE_TS, rel);
    if (resolved === undefined || visited.has(resolved)) continue;
    visited.add(resolved);
    const body = await readSourceOrUndefined(resolved);
    if (body === undefined) continue;
    fragments.push(body);

    for (const innerRel of localImportSpecifiers(body)) {
      const innerResolved = resolveLocalImport(resolved, innerRel);
      if (innerResolved === undefined || visited.has(innerResolved)) continue;
      visited.add(innerResolved);
      const innerBody = await readSourceOrUndefined(innerResolved);
      if (innerBody !== undefined) fragments.push(innerBody);
    }
  }
  return toExecutableCode(fragments.join("\n"));
}

describe("meta-test: prototyping validators are wired into the pipeline", () => {
  it("every public Issue[]-returning validator under validators/prototyping/ is called from validate.ts", async () => {
    const validators = await collectPublicValidators(PROTOTYPING_VALIDATORS_DIR);
    const reachable = await buildReachableCode();

    expect(validators.length, "expected at least one public validator").toBeGreaterThan(0);

    const unwired: Array<{ name: string; file: string }> = [];
    for (const { name, file } of validators) {
      if (PENDING_WIRING.has(name)) continue;
      if (!isInvoked(name, reachable)) {
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
    const reachable = await buildReachableCode();

    const missingDefinitions: string[] = [];
    const notCalled: string[] = [];
    for (const [code, name] of CATALOG_OWNERS) {
      if (!defined.has(name)) missingDefinitions.push(`${name} (${code})`);
      else if (!PENDING_WIRING.has(name) && !isInvoked(name, reachable)) {
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
  });
});
