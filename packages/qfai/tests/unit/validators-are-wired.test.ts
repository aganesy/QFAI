/**
 * Meta-test: every prototyping validator function with `Issue[]` return must
 * be referenced from the validate.ts symbol graph (validate.ts itself, OR an
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
 *   3. Build a "reachable text" set: validate.ts plus the source bodies of
 *      every file directly imported from validate.ts under
 *      `./validators/...` (1-hop). This handles the orchestrator pattern
 *      where validate.ts imports `validateStateGate` and the orchestrator
 *      internally calls `validateExecutionPlanIssues`.
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

const PROTOTYPING_VALIDATORS_DIR = path.resolve(
  __dirname,
  "../../src/core/validators/prototyping",
);
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
 * Validators known to be dead code as of v1.8.4 Phase 2. Wiring them into
 * the prototyping pipeline is tracked as a follow-up task (TODO: file an
 * issue once Phase 8 lands). Adding a NEW validator to this list requires
 * a comment justifying why it cannot be wired in the same PR.
 *
 * This list MUST shrink over time and MUST never grow without explicit
 * justification.
 */
const PENDING_WIRING: ReadonlySet<string> = new Set<string>([
  // Discovered by Phase 2 meta-test on v1.8.4. Each is unit-tested in
  // tests/integration/prototypingSkillV1716Integration.test.ts but is
  // never invoked from runPrototypingValidators or any other production
  // pipeline. Wire into validateStateGate (or a future stateGate-style
  // orchestrator) in a follow-up commit.
  "validateScreenshotDir",
  "validateLighthouseGate",
  "validateIterationGate",
  "validateDesignSystemThreshold",
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
      // 2-hop: also follow imports of orchestrators (e.g. validators/index.ts
      // re-exports stateGate.ts; if validate.ts imports from index.ts, we
      // need index.ts → stateGate.ts).
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
          "Wire the validator into runPrototypingValidators (directly or via an orchestrator " +
          "like validateStateGate) before merging. This guard exists to prevent the v1.8.3 " +
          "dead-code-validator regression (RR §8.6).",
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

  it("validateExecutionPlanIssues is wired (QFAI-PROT-310)", async () => {
    const reachable = await buildReachableText();
    expect(
      reachable.includes("validateExecutionPlanIssues"),
      "validateExecutionPlanIssues must reach runPrototypingValidators",
    ).toBe(true);
  });

  it("validateDelegationMapIssues is wired (QFAI-PROT-311)", async () => {
    const reachable = await buildReachableText();
    expect(
      reachable.includes("validateDelegationMapIssues"),
      "validateDelegationMapIssues must reach runPrototypingValidators",
    ).toBe(true);
  });

  it("PENDING_WIRING list does not grow silently", () => {
    // Tripwire: if a contributor adds to PENDING_WIRING without justification,
    // this assertion documents the current count and forces a deliberate
    // update when changing it. The list MUST shrink, not grow.
    expect(PENDING_WIRING.size).toBe(4);
  });
});
