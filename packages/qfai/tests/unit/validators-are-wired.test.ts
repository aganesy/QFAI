/**
 * Meta-test: every public validator function under src/core/validators/ must
 * be referenced from the validate.ts symbol graph (validate.ts itself, OR a
 * module transitively imported by validate.ts).
 *
 * This catches the "validator written but never invoked" failure mode that
 * allowed `validateExecutionPlan` and `validateDelegationMap` to lurk as dead
 * code in v1.8.3 (RR §8.6). The guard used to scan `validators/prototyping/`
 * only — 5 of 89 declarations — while the same failure mode kept landing in
 * the other 84. Adding a new validator anywhere under `validators/` without
 * wiring it into a runXxxValidators function (directly or via an orchestrator
 * like validateStateGate) MUST fail this test in CI.
 *
 * Implementation strategy:
 *   1. Walk every TS file under src/core/validators/ recursively
 *   2. Extract every `export function validate*(`
 *   3. Build a "reachable text" set by walking the *symbol* graph out of
 *      validate.ts: follow relative imports transitively, and resolve imports
 *      that go through a barrel (`index.ts`) to the modules that actually
 *      supply the imported names. Barrel bodies, comments and the validator
 *      declarations themselves are stripped, so a bare re-export or a mention
 *      in prose never counts as wiring.
 *   4. Assert each validator name appears in the reachable text, OR is on the
 *      dated PENDING_WIRING allowlist (existing dead code that requires a
 *      follow-up wiring effort).
 */
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VALIDATORS_ROOT = path.resolve(__dirname, "../../src/core/validators");
const PROTOTYPING_VALIDATORS_DIR = path.resolve(VALIDATORS_ROOT, "prototyping");
const VALIDATORS_INDEX = path.resolve(VALIDATORS_ROOT, "index.ts");
const VALIDATE_TS = path.resolve(__dirname, "../../src/core/validate.ts");
const SRC_ROOT = path.resolve(__dirname, "../../src");

const PUBLIC_VALIDATOR_RE = /^export\s+(?:async\s+)?function\s+(validate\w+)\s*\(/gm;
const IMPORT_RE =
  /import\s+(?:type\s+)?(?:(\w+)\s*,?\s*)?(?:\{([^}]*)\})?\s*from\s+["'](\.\.?\/[\w./-]+)["']/g;
const REEXPORT_RE = /export\s+(?:type\s+)?\{([^}]*)\}\s*from\s+["'](\.\.?\/[\w./-]+)["']/g;

/**
 * Legacy custom-Issue-returning functions kept for backward compatibility
 * (will be deleted in Phase 7). Their *Issues replacement is the wiring path.
 */
const DEPRECATED_LEGACY_VALIDATORS = new Set<string>([
  "validateExecutionPlan",
  "validateDelegationMap",
]);

/**
 * Validators known to be dead code awaiting wiring, each with the date the
 * entry was recorded and the issue that owns the triage.
 *
 * This census was taken when the guard was widened from `validators/prototyping/`
 * to the whole `validators/` tree: the names below were already unwired and are
 * grandfathered so the widened guard can land green. Each one must be resolved
 * individually — wire it into a runXxxValidators path, or delete it and retire
 * its finding code — and the entry removed in the same change.
 *
 * This list MUST shrink over time and MUST never grow. `PENDING_WIRING_BASELINE`
 * plus the staleness tripwires below keep both directions honest.
 */
const PENDING_WIRING: ReadonlyMap<string, string> = new Map<string, string>([
  ["validateAtddCoverageLedgers", "2026-08-22 — validators/atddLedger.ts, see #402"],
  ["validateBusinessFlowHasMermaid", "2026-08-22 — validators/businessFlow.ts, see #670"],
  ["validateConvergenceDoc", "2026-08-22 — validators/docs/convergenceDoc.ts, see #670"],
  ["validateImportLiteEvidencePresence", "2026-08-22 — validators/importLite.ts, see #407"],
  ["validateIntegrationSurface", "2026-08-22 — validators/integrationSurface.ts, see #670"],
  ["validateMermaidFenceUsage", "2026-08-22 — validators/mermaidFence.ts, see #670"],
  [
    "validateDelegationMapIssues",
    "2026-08-22 — validators/prototyping/delegationMap.ts, barrel re-export only, see #670",
  ],
  ["validateRequireIndexShape", "2026-08-22 — validators/requireIndex.ts, see #670"],
  ["validateRequirementsContext", "2026-08-22 — validators/requirementsContext.ts, see #670"],
  ["validateRequirePackReadiness", "2026-08-22 — validators/requirePack.ts, see #670"],
  ["validatePhaseOrdering", "2026-08-22 — validators/skill/phaseOrdering.ts, see #670"],
  ["validateSidecarFlowOrdering", "2026-08-22 — validators/skill/sidecarFlowOrdering.ts, see #670"],
  ["validateAntiPreference", "2026-08-22 — validators/uix/antiPreference.ts, see #403"],
  ["validateDesignSystemPresence", "2026-08-22 — validators/uix/designSystemPresence.ts, see #403"],
  ["validateStrategyStrong", "2026-08-22 — validators/uix/strategy.ts, see #403"],
  ["validateTasteInterview", "2026-08-22 — validators/uix/taste.ts, see #403"],
  ["validateTasteReflection", "2026-08-22 — validators/uix/tasteReflection.ts, see #403"],
  ["validateTrendScan", "2026-08-22 — validators/uix/trendScan.ts, see #403"],
]);

/** Census size at the moment the guard was widened. MUST only ever decrease. */
const PENDING_WIRING_BASELINE = 18;

const DATED_ENTRY_RE = /^\d{4}-\d{2}-\d{2}\s/;

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
      if (name && !DEPRECATED_LEGACY_VALIDATORS.has(name)) {
        out.push({ name, file });
      }
    }
  }
  return out;
}

const isBarrel = (file: string): boolean => path.basename(file) === "index.ts";

/** Resolve a relative TS import specifier to an on-disk source file. */
async function resolveModule(fromFile: string, spec: string): Promise<string | null> {
  const base = path.resolve(path.dirname(fromFile), spec.replace(/\.js$/, ""));
  for (const candidate of [`${base}.ts`, path.join(base, "index.ts")]) {
    try {
      const s = await stat(candidate);
      if (s.isFile()) return candidate;
    } catch {
      // candidate shape does not exist — try the next one
    }
  }
  return null;
}

/** Local names in an import/export brace clause (`a`, `b as c` → `a`, `c`). */
function clauseNames(clause: string, side: "local" | "public"): string[] {
  return clause
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => {
      const halves = part.split(/\s+as\s+/);
      const picked = side === "local" ? halves[0] : (halves[1] ?? halves[0]);
      return (picked ?? "").trim();
    })
    .filter((name) => name.length > 0);
}

/**
 * Remove text that mentions a validator without invoking it: comments, the
 * validator's own `export function` declaration head, and `export { … } from`
 * re-export statements. Without this, a declaration or a barrel line makes a
 * dead validator look reachable — which is exactly how `validateDelegationMapIssues`
 * passed the old guard.
 */
function stripNonInvokingText(body: string): string {
  return body
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/export\s+(?:type\s+)?\{[^}]*\}\s*from\s+["'][^"']+["'];?/g, "")
    .replace(/^export\s+(?:async\s+)?function\s+validate\w+\s*\(/gm, "function __declared__(");
}

/** Modules a barrel supplies the requested names from. */
async function barrelTargets(barrel: string, names: readonly string[]): Promise<string[]> {
  const wanted = new Set(names);
  const body = await readFile(barrel, "utf-8");
  const out = new Set<string>();
  REEXPORT_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = REEXPORT_RE.exec(body)) !== null) {
    const clause = match[1];
    const spec = match[2];
    if (!clause || !spec) continue;
    if (!clauseNames(clause, "public").some((name) => wanted.has(name))) continue;
    const resolved = await resolveModule(barrel, spec);
    if (resolved) out.add(resolved);
  }
  return [...out];
}

/** Modules one import statement pulls into the graph. */
async function importTargets(file: string, match: RegExpExecArray): Promise<string[]> {
  const spec = match[3];
  if (!spec) return [];
  const resolved = await resolveModule(file, spec);
  if (!resolved || !resolved.startsWith(SRC_ROOT)) return [];
  if (!isBarrel(resolved)) return [resolved];
  const defaultName = match[1];
  const clause = match[2];
  const names = [
    ...(defaultName ? [defaultName] : []),
    ...(clause ? clauseNames(clause, "local") : []),
  ];
  return barrelTargets(resolved, names);
}

/**
 * Build the "reachable from validate.ts" text by walking relative imports
 * transitively out of validate.ts. Imports that pass through a barrel are
 * resolved to the modules that actually supply the imported names, so an
 * unused re-export never drags a dead module into the graph.
 */
async function buildReachableText(): Promise<string> {
  const queue: string[] = [VALIDATE_TS];
  const visited = new Set<string>([VALIDATE_TS]);
  const fragments: string[] = [];

  while (queue.length > 0) {
    const file = queue.shift();
    if (!file) break;
    let body: string;
    try {
      body = await readFile(file, "utf-8");
    } catch {
      continue; // unresolved or non-file module — best-effort traversal
    }
    fragments.push(stripNonInvokingText(body));
    IMPORT_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = IMPORT_RE.exec(body)) !== null) {
      for (const target of await importTargets(file, match)) {
        if (visited.has(target)) continue;
        visited.add(target);
        queue.push(target);
      }
    }
  }
  return fragments.join("\n");
}

describe("meta-test: validators are wired into the pipeline", () => {
  it("every public Issue[]-returning validator under validators/ is reachable from validate.ts", async () => {
    const validators = await collectPublicValidators(VALIDATORS_ROOT);
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
        `The following validators are exported but not reachable from validate.ts:\n${lines}\n\n` +
          "Wire the validator into the matching runXxxValidators function (directly or via an " +
          "orchestrator like validateStateGate) before merging. A barrel re-export in " +
          "validators/index.ts is NOT wiring. This guard exists to prevent the v1.8.3 " +
          "dead-code-validator regression (RR §8.6).",
      );
    }
  });

  it("the guard scans the whole validators tree, not just prototyping/", async () => {
    const all = await collectPublicValidators(VALIDATORS_ROOT);
    const prototypingOnly = await collectPublicValidators(PROTOTYPING_VALIDATORS_DIR);

    // The pre-widening guard saw 5 of 89 declarations. Any scope regression
    // that re-narrows the collector trips here.
    expect(all.length).toBeGreaterThan(prototypingOnly.length * 5);
    const dirs = new Set(all.map((v) => path.relative(VALIDATORS_ROOT, path.dirname(v.file))));
    expect(dirs.has("")).toBe(true);
    expect(dirs.has("uix")).toBe(true);
    expect(dirs.has("prototyping")).toBe(true);
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

  it("a prose mention alone does not count as wiring (QFAI-PROT-310)", async () => {
    // `validateExecutionPlanIssues` no longer exists anywhere in src/ — its
    // single remaining occurrence is a JSDoc mention in
    // prototyping/delegationMap.ts. The old guard asserted this name was
    // "wired" and went green on that comment alone.
    const reachable = await buildReachableText();
    expect(reachable.includes("validateExecutionPlanIssues")).toBe(false);
  });

  it("a barrel re-export alone does not count as wiring (QFAI-PROT-311)", async () => {
    // `validateDelegationMapIssues` used to satisfy this guard because
    // validators/index.ts re-exports it and the barrel body was part of the
    // reachable text. Nothing calls it. The tightened reachability walk must
    // keep reporting it as unwired until it is wired or retired.
    const reachable = await buildReachableText();
    expect(reachable.includes("validateDelegationMapIssues")).toBe(false);
    expect(PENDING_WIRING.has("validateDelegationMapIssues")).toBe(true);
  });

  it("PENDING_WIRING never grows and carries a date per entry", () => {
    expect(PENDING_WIRING.size).toBeLessThanOrEqual(PENDING_WIRING_BASELINE);
    const undated = [...PENDING_WIRING.entries()]
      .filter(([, note]) => !DATED_ENTRY_RE.test(note))
      .map(([name]) => name);
    expect(
      undated,
      `PENDING_WIRING entries must start with YYYY-MM-DD: ${undated.join(", ")}`,
    ).toEqual([]);
  });

  it("PENDING_WIRING has no stale entries (wired or deleted validators must be removed)", async () => {
    const validators = await collectPublicValidators(VALIDATORS_ROOT);
    const declared = new Set(validators.map((v) => v.name));
    const reachable = await buildReachableText();

    const stale = [...PENDING_WIRING.keys()].filter(
      (name) => !declared.has(name) || reachable.includes(name),
    );
    expect(
      stale,
      `These names are no longer dead code — drop them from PENDING_WIRING: ${stale.join(", ")}`,
    ).toEqual([]);
  });
});
