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
 * Validators known to be dead code awaiting wiring. As of v1.8.4 Phase 3
 * this set is empty: the four validators discovered by the Phase 2 meta-test
 * (validateScreenshotDir, validateLighthouseGate, validateIterationGate,
 * validateDesignSystemThreshold) were each given a `*Issues` adapter and
 * dispatched from validateStateGate.
 *
 * This list MUST shrink over time and MUST never grow without explicit
 * justification. The sentinel `expect(PENDING_WIRING.size).toBe(0)` keeps
 * accidental regressions visible.
 */
const PENDING_WIRING: ReadonlySet<string> = new Set<string>();

/** `export { a, b } from "./mod.js";` — `export type { … }` is not matched. */
const BARREL_EXPORT_RE = /export\s*\{([^}]*)\}\s*from\s*["']([^"']+)["']/g;

/**
 * Barrel entries known to have outlived their call site. `validators/index.ts`
 * announces itself as the production path, so a name listed there with no
 * caller reads as a live rule; the guard below reports that, and these are the
 * pre-existing cases it must not fail on.
 *
 * This list MUST shrink, never grow — with one exception already spent: the
 * guard moved from "referenced anywhere under `src/**`" to "called from a
 * module reachable from `validate.ts`", and three names the looser rule had
 * been passing surfaced at once. They are pre-existing gaps, each out of scope
 * here:
 * - `validateImportLiteEvidencePresence` (QFAI-IMPLITE-001);
 * - `validateDelegationMapIssues` — reached only through the barrel;
 * - `validateTasteInterview`, `validateTrendScan`, `validateStrategyStrong` —
 *   UI-bearing checks absent from `runCanonicalUixValidators`, whose only
 *   caller is the test-only helper `uix/nonUiOverfire.ts`. Wiring them changes
 *   what `qfai validate` reports, so it belongs to a UIX change, not here.
 */
const KNOWN_UNWIRED_BARREL_EXPORTS: ReadonlySet<string> = new Set<string>([
  "validateImportLiteEvidencePresence",
  "validateDelegationMapIssues",
  "validateTasteInterview",
  "validateTrendScan",
  "validateStrategyStrong",
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

/**
 * Every name re-exported from `validators/index.ts`, mapped to the absolute
 * path of the module that defines it.
 */
async function collectBarrelExports(): Promise<Map<string, string>> {
  const indexBody = await readFile(VALIDATORS_INDEX, "utf-8");
  const out = new Map<string, string>();
  BARREL_EXPORT_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = BARREL_EXPORT_RE.exec(indexBody)) !== null) {
    const names = match[1];
    const rel = match[2];
    if (names === undefined || rel === undefined) continue;
    const owner = path.resolve(path.dirname(VALIDATORS_INDEX), rel.replace(/\.js$/, ".ts"));
    for (const raw of names.split(",")) {
      const name = raw
        .trim()
        .replace(/^type\s+/, "")
        .split(/\s+as\s+/)[0]
        ?.trim();
      if (name !== undefined && name.length > 0) {
        out.set(name, owner);
      }
    }
  }
  return out;
}

/** The `validate*` subset of the barrel — the names this guard audits. */
async function collectBarrelValidators(): Promise<Map<string, string>> {
  const all = await collectBarrelExports();
  return new Map(Array.from(all).filter(([name]) => name.startsWith("validate")));
}

/**
 * Reduce a module to the text that can actually execute: block and line
 * comments, string / template literals, and `import … from "…"` /
 * `export { … } from "…"` declarations all go away.
 *
 * Without this, prose about a rule counts as wiring. `validateTddList` is
 * named in four comments under `src/core/`, so a substring scan keeps calling
 * it "wired" even after `validate.ts` drops both its import and its call —
 * exactly the regression this guard exists to catch. A bare re-export is not
 * a call site either: it only moves the name one module further along.
 */
function codeOnly(source: string): string {
  return (
    source
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      // A `//` preceded by `:`, a quote or a backslash belongs to a URL, a
      // string or an escaped regex atom, not to a comment.
      .replace(/(^|[^:\\"'`])\/\/[^\n]*/g, "$1")
      .replace(/^[ \t]*import\b[^;]*?\bfrom\s*["'][^"']*["'];?/gm, " ")
      .replace(/^[ \t]*import\s*["'][^"']*["'];?/gm, " ")
      .replace(/^[ \t]*export\s*(?:type\s+)?\{[^}]*\}\s*from\s*["'][^"']*["'];?/gm, " ")
      .replace(/`(?:\\.|[^`\\])*`/g, '""')
      .replace(/(["'])(?:\\.|(?!\1)[^\\\n])*\1/g, '""')
  );
}

/**
 * True when `source` uses `name` as an identifier in executable position —
 * either a call `name(…)` or a function value handed to something that calls
 * it (`[name]`, `{ gate: name }`, `run(name)`). Identifier boundaries keep
 * `validateDelegationMap` from being satisfied by `validateDelegationMapIssues`.
 *
 * A trailing `:` marks a property key rather than a value, so registries that
 * are *keyed* by validator name (`SAAS_PACKAGE_SKIPPED_GATE_FAMILIES`) do not
 * masquerade as call sites — they are data about the gate, not the gate.
 */
function referencesName(source: string, name: string): boolean {
  return new RegExp(`(?<![\\w$])${name}(?![\\w$])(?!\\s*:)`).test(codeOnly(source));
}

/** Comments out; everything else — imports included — kept verbatim. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:\\"'`])\/\/[^\n]*/g, "$1");
}

/** `import … from "./x.js"` / `export … from "./x.js"` targets. */
const MODULE_EDGE_RE = /from\s*["'](\.\.?\/[\w./-]+)["']/g;

/** Resolve a relative specifier to the `src/**` file it names, if any. */
async function resolveModule(fromFile: string, rel: string): Promise<string | undefined> {
  const base = path.resolve(path.dirname(fromFile), rel.replace(/\.js$/, ""));
  for (const candidate of [`${base}.ts`, path.join(base, "index.ts")]) {
    if (!candidate.startsWith(SRC_ROOT)) continue;
    try {
      if ((await stat(candidate)).isFile()) return candidate;
    } catch {
      // not this shape — try the next candidate
    }
  }
  return undefined;
}

/**
 * The modules whose code can actually run when `validate.ts` runs: the
 * transitive closure of relative import edges from `validate.ts`, plus — for
 * every barrel name a reached module actually calls — the module defining it.
 *
 * Membership in `src/**` is not enough. `uix/nonUiOverfire.ts` lives in `src/`
 * but nothing imports it; only `tests/validators/uix/nonUiOverfire.test.ts`
 * does. Counting its references as wiring let `validateTasteInterview`,
 * `validateTrendScan` and `validateStrategyStrong` read as live rules while
 * being absent from every production call path.
 *
 * The barrel itself is never expanded: it re-exports every validator, wired or
 * not, so following its edges would make "listed in the barrel" mean
 * "reachable" by construction — the very thing under audit.
 */
async function collectReachableModules(barrel: Map<string, string>): Promise<Set<string>> {
  const reached = new Set<string>([VALIDATE_TS]);
  const queue: string[] = [VALIDATE_TS];

  while (queue.length > 0) {
    const file = queue.pop();
    if (file === undefined) continue;
    let body: string;
    try {
      body = await readFile(file, "utf-8");
    } catch {
      continue; // unreadable module — nothing to traverse
    }

    const edges: string[] = [];
    const code = stripComments(body);
    MODULE_EDGE_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = MODULE_EDGE_RE.exec(code)) !== null) {
      const rel = match[1];
      if (rel !== undefined) edges.push(rel);
    }

    for (const rel of edges) {
      const resolved = await resolveModule(file, rel);
      if (resolved === undefined || resolved === VALIDATORS_INDEX) continue;
      if (reached.has(resolved)) continue;
      reached.add(resolved);
      queue.push(resolved);
    }

    // A barrel name used here pulls in the module that defines it, which the
    // skipped barrel edge would otherwise have supplied.
    for (const [name, owner] of barrel) {
      if (reached.has(owner)) continue;
      if (referencesName(body, name)) {
        reached.add(owner);
        queue.push(owner);
      }
    }
  }
  return reached;
}

/** Names called from at least one module reachable from `validate.ts`. */
async function namesWithReachableCallSite(
  names: Map<string, string>,
  reachable: Set<string>,
): Promise<Set<string>> {
  const referenced = new Set<string>();
  for (const file of reachable) {
    if (file === VALIDATORS_INDEX) continue;
    let body: string;
    try {
      body = await readFile(file, "utf-8");
    } catch {
      continue; // unreadable module — nothing to count
    }
    for (const [name, owner] of names) {
      // The defining module always mentions its own export; the barrel is what
      // is being audited. A reference from anywhere else is a real call site.
      if (file !== owner && referencesName(body, name)) referenced.add(name);
    }
  }
  return referenced;
}

describe("meta-test: validators/index.ts lists only wired validators", () => {
  it("every validate* re-exported from the barrel has a call site outside the barrel", async () => {
    const barrel = await collectBarrelValidators();
    expect(barrel.size, "expected the barrel to re-export validators").toBeGreaterThan(10);

    const reachable = await collectReachableModules(await collectBarrelExports());
    const referenced = await namesWithReachableCallSite(barrel, reachable);
    const unwired = Array.from(barrel.keys())
      .filter((name) => !referenced.has(name) && !KNOWN_UNWIRED_BARREL_EXPORTS.has(name))
      .sort();

    expect(
      unwired,
      "validators/index.ts declares itself the production path, so a name listed there with no call " +
        "site reads as a live rule. Delete the barrel line when a validator is retired, or wire it in.",
    ).toEqual([]);
  });

  it("counts only executable references, not prose, re-exports or longer names", () => {
    // Rejected: the name is mentioned, never used.
    expect(referencesName("// validateFoo reads the ledger table", "validateFoo")).toBe(false);
    expect(referencesName("/**\n * See `validateFoo`.\n */", "validateFoo")).toBe(false);
    expect(referencesName('import { validateFoo } from "./foo.js";', "validateFoo")).toBe(false);
    expect(referencesName('export { validateFoo } from "./foo.js";', "validateFoo")).toBe(false);
    expect(referencesName('const skipped = ["validateFoo"];', "validateFoo")).toBe(false);
    expect(referencesName("issues.push(...validateFooIssues(root));", "validateFoo")).toBe(false);
    expect(referencesName('const families = { validateFoo: ["FOO_*"] };', "validateFoo")).toBe(
      false,
    );

    // Accepted: a call, or a value something else will call.
    expect(referencesName("issues.push(...(await validateFoo(root)));", "validateFoo")).toBe(true);
    expect(referencesName("const gates = [validateFoo];", "validateFoo")).toBe(true);
    expect(referencesName("const gates = { tdd: validateFoo };", "validateFoo")).toBe(true);
  });

  it("counts call sites only from modules the validate.ts graph reaches", async () => {
    const reachable = await collectReachableModules(await collectBarrelExports());

    // A module validate.ts pulls in through the barrel, two hops down.
    expect(reachable.has(path.resolve(SRC_ROOT, "core/validators/uix/canonical.ts"))).toBe(true);
    // A src/ helper whose only caller is a test. Its references must not count
    // as wiring, or a validator dropped from the production graph goes unseen.
    expect(reachable.has(path.resolve(SRC_ROOT, "core/validators/uix/nonUiOverfire.ts"))).toBe(
      false,
    );
    expect(reachable.has(VALIDATORS_INDEX)).toBe(false);
  });

  it("the retired /qfai-require validators are gone from the barrel", async () => {
    const barrel = await collectBarrelValidators();
    expect(barrel.has("validateRequireIndexShape")).toBe(false);
    expect(barrel.has("validateRequirementsContext")).toBe(false);
  });
});

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
});
