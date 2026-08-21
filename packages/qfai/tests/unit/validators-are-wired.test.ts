/**
 * Meta-test: every prototyping validator function with `Issue[]` return must
 * be referenced from the validate.ts symbol graph (validate.ts itself, OR a
 * module imported by validate.ts).
 *
 * This catches the "validator written but never invoked" failure mode that
 * allowed `validateExecutionPlan` and `validateDelegationMap` to lurk as dead
 * code in v1.8.3 (RR §8.6). Adding a new prototyping validator without
 * dispatching it from runPrototypingValidators MUST fail this test in CI.
 *
 * Implementation strategy:
 *   1. Walk every TS file under src/core/validators/prototyping/
 *   2. Extract every `export function validate*(`
 *   3. Build a "reachable text" set: validate.ts plus the source bodies of
 *      every file directly imported from validate.ts under
 *      `./validators/...` (1-hop), plus the files those re-export (2-hop).
 *      The second hop is what resolves the barrel: validate.ts imports
 *      `validateDelegationMapIssues` from `./validators/index.js`, which
 *      re-exports it from `./prototyping/delegationMap.js`.
 *   4. Assert each validator name appears in the reachable text, OR is on
 *      the documented PENDING_WIRING allowlist (existing dead code that
 *      requires a follow-up wiring effort).
 */
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

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
 * Validators known to be dead code awaiting wiring. This set is empty: the
 * unwired validators the Phase 2 meta-test discovered were subsequently
 * deleted rather than adapted, so no name is left to track here. Every
 * prototyping validator that survives is dispatched from
 * runPrototypingValidators.
 *
 * This list MUST shrink over time and MUST never grow without explicit
 * justification. The sentinel `expect(PENDING_WIRING.size).toBe(0)` keeps
 * accidental regressions visible.
 */
const PENDING_WIRING: ReadonlySet<string> = new Set<string>();

/**
 * Validator names this guard mentions on purpose even though `src/` does not
 * declare them: they identify the dead-code regression this meta-test was
 * written to prevent, and both functions have since been deleted.
 */
const HISTORICAL_REFERENCES: ReadonlySet<string> = new Set<string>([
  "validateExecutionPlan",
  "validateDelegationMap",
]);

const COMMENT_LINE_RE = /^\s*(?:\/\/|\/\*|\*)/;
const VALIDATOR_MENTION_RE = /validate[A-Z]\w*/g;
const VALIDATOR_DECLARATION_RE = /(?:function|const|let)\s+(validate\w+)\s*[(=]/g;

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
    const body = await readFile(file, "utf-8");
    PUBLIC_VALIDATOR_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = PUBLIC_VALIDATOR_RE.exec(body)) !== null) {
      const name = match[1];
      if (!DEPRECATED_LEGACY_VALIDATORS.has(name)) {
        out.push({ name, file });
      }
    }
  }
  return out;
}

/**
 * Build the "reachable from validate.ts" text by including validate.ts plus
 * every file directly imported from validate.ts under `./validators/`,
 * `./prototyping/`, or `./uiux/` (1-hop). Orchestrators that wrap multiple
 * sibling validators are detected this way.
 */
async function buildReachableText(): Promise<string> {
  const validateBody = await readFile(VALIDATE_TS, "utf-8");
  const importRe = /from\s+["'](\.\.?\/[\w./-]+)["']/g;
  const visited = new Set<string>();
  const fragments: string[] = [validateBody];

  let match: RegExpExecArray | null;
  while ((match = importRe.exec(validateBody)) !== null) {
    const rel = match[1];
    if (!rel) continue;
    // Resolve relative to validate.ts (which lives in src/core/)
    const resolved = path.resolve(path.dirname(VALIDATE_TS), rel.replace(/\.js$/, ".ts"));
    if (!resolved.startsWith(SRC_ROOT)) continue;
    if (visited.has(resolved)) continue;
    visited.add(resolved);
    try {
      const body = await readFile(resolved, "utf-8");
      fragments.push(body);
      // 2-hop: also follow re-exports (e.g. validators/index.ts re-exports
      // prototyping/delegationMap.ts; if validate.ts imports from index.ts,
      // we need index.ts → delegationMap.ts).
      let inner: RegExpExecArray | null;
      const innerRe = /from\s+["'](\.\.?\/[\w./-]+)["']/g;
      while ((inner = innerRe.exec(body)) !== null) {
        const innerRel = inner[1];
        if (!innerRel) continue;
        const innerResolved = path.resolve(
          path.dirname(resolved),
          innerRel.replace(/\.js$/, ".ts"),
        );
        if (!innerResolved.startsWith(SRC_ROOT)) continue;
        if (visited.has(innerResolved)) continue;
        visited.add(innerResolved);
        try {
          fragments.push(await readFile(innerResolved, "utf-8"));
        } catch {
          // ignore — may be a directory index or non-existent; we just want
          // best-effort traversal
        }
      }
    } catch {
      // ignore unresolved imports
    }
  }
  return fragments.join("\n");
}

/** Every `validate*` function name declared anywhere under src/. */
async function collectDeclaredValidatorNames(): Promise<Set<string>> {
  const files = await listTsFiles(SRC_ROOT);
  const declared = new Set<string>();
  for (const file of files) {
    const body = await readFile(file, "utf-8");
    VALIDATOR_DECLARATION_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = VALIDATOR_DECLARATION_RE.exec(body)) !== null) {
      declared.add(match[1]);
    }
  }
  return declared;
}

/** Every `validate*` name this guard names in one of its own comments. */
function collectDocumentedValidatorNames(guardSource: string): Set<string> {
  const documented = new Set<string>();
  for (const line of guardSource.split(/\r?\n/)) {
    if (!COMMENT_LINE_RE.test(line)) continue;
    VALIDATOR_MENTION_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = VALIDATOR_MENTION_RE.exec(line)) !== null) {
      documented.add(match[0]);
    }
  }
  return documented;
}

describe("meta-test: prototyping validators are wired into the pipeline", () => {
  it("every public Issue[]-returning validator under validators/prototyping/ is reachable from validate.ts", async () => {
    const validators = await collectPublicValidators(PROTOTYPING_VALIDATORS_DIR);
    const reachable = await buildReachableText();

    expect(validators.length, "expected at least one public validator").toBeGreaterThan(0);

    const unwired: Array<{ name: string; file: string }> = [];
    for (const { name, file } of validators) {
      if (PENDING_WIRING.has(name)) continue;
      if (!reachable.includes(name)) {
        unwired.push({ name, file });
      }
    }

    if (unwired.length > 0) {
      const lines = unwired
        .map((u) => `  - ${u.name} (${path.relative(process.cwd(), u.file)})`)
        .join("\n");
      throw new Error(
        `The following prototyping validators are exported but not reachable from validate.ts:\n${lines}\n\n` +
          "Dispatch the validator from runPrototypingValidators in src/core/validate.ts before " +
          "merging. This guard exists to prevent the v1.8.3 dead-code-validator regression " +
          "(RR §8.6).",
      );
    }
  });

  it("validators/index.ts re-exports every public prototyping validator (excluding pending-wiring)", async () => {
    const validators = await collectPublicValidators(PROTOTYPING_VALIDATORS_DIR);
    const indexBody = await readFile(VALIDATORS_INDEX, "utf-8");

    const missingExports: string[] = [];
    for (const { name } of validators) {
      if (PENDING_WIRING.has(name)) continue;
      if (!indexBody.includes(name)) {
        missingExports.push(name);
      }
    }

    expect(
      missingExports,
      `validators/index.ts must re-export every public prototyping validator. Missing: ${missingExports.join(", ")}`,
    ).toEqual([]);
  });

  it("validateDelegationMapIssues is wired (QFAI-PROT-311)", async () => {
    const reachable = await buildReachableText();
    expect(
      reachable.includes("validateDelegationMapIssues"),
      "validateDelegationMapIssues must reach runPrototypingValidators",
    ).toBe(true);
  });

  it("PENDING_WIRING list does not grow silently (target: stay at 0)", () => {
    // Tripwire: if a contributor adds to PENDING_WIRING without justification,
    // this assertion documents the current count and forces a deliberate
    // update when changing it. The list MUST shrink, not grow.
    //
    // v1.8.4 Phase 3: PENDING_WIRING is empty. Every prototyping validator
    // is now reachable from runPrototypingValidators. NEW dead-code
    // validators cannot enter the codebase silently.
    expect(PENDING_WIRING.size).toBe(0);
  });

  it("documents only validators that src/ actually declares", async () => {
    // The guard tells the next contributor how to wire a validator. If its
    // own prose names functions that no longer exist, the instructions send
    // that contributor after a mechanism no file implements — the same
    // dead-surface defect the guard was built to catch.
    const guardSource = await readFile(__filename, "utf-8");
    const documented = collectDocumentedValidatorNames(guardSource);
    const declared = await collectDeclaredValidatorNames();

    const phantom = [...documented]
      .filter((name) => !declared.has(name) && !HISTORICAL_REFERENCES.has(name))
      .sort();

    expect(
      phantom,
      "these validators are named in this guard's comments but declared nowhere in src/: " +
        `${phantom.join(", ")}. Rewrite the prose to name a mechanism that exists, or add the ` +
        "name to HISTORICAL_REFERENCES if it is deliberately cited as a past regression.",
    ).toEqual([]);
  });
});
