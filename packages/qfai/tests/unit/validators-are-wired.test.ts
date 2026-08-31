/**
 * Meta-test: every public validator under src/core/validators/ must be invoked
 * from the validate.ts symbol graph (validate.ts itself, OR a symbol it
 * transitively reaches).
 *
 * This catches the "validator written but never invoked" failure mode that
 * allowed `validateExecutionPlan` and `validateDelegationMap` to lurk as dead
 * code in v1.8.3 (RR §8.6). The guard used to scan `validators/prototyping/`
 * only — 5 of 92 declarations — while the same failure mode kept landing in
 * the other 87. Adding a new validator anywhere under `validators/` without
 * wiring it into a runXxxValidators function (directly or via an orchestrator
 * like validateStateGate) MUST fail this test in CI.
 *
 * Implementation strategy (see tests/helpers/validatorGraph.ts):
 *   1. Walk every TS file under src/core/validators/ recursively
 *   2. Extract every exported validator: `export function validate*`,
 *      `export const validate* = …` AND `export { local as validateX }`
 *   3. Walk the *symbol* graph out of validate.ts: enter each module only for
 *      the names reachable code actually references, follow those names through
 *      barrels to the module that supplies them, and collect the identifiers
 *      used in value position. Comments, strings, type positions, declaration
 *      names and import/export specifiers are not identifiers in value
 *      position, so a mention in prose, an unused import, a bare re-export or a
 *      call inside a sibling export nobody imports never counts as wiring.
 *   4. Assert each validator name is in that set, OR is on the dated
 *      PENDING_WIRING allowlist (existing dead code awaiting a follow-up).
 */
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";
import { describe, expect, it } from "vitest";

import {
  ALL_SYMBOLS,
  barrelExportedNames,
  buildReachableNames,
  collectPublicValidators,
  collectValidatorExports,
  referencedNamesInSource,
} from "../helpers/validatorGraph.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VALIDATORS_ROOT = path.resolve(__dirname, "../../src/core/validators");
const PROTOTYPING_VALIDATORS_DIR = path.resolve(VALIDATORS_ROOT, "prototyping");
const VALIDATORS_INDEX = path.resolve(VALIDATORS_ROOT, "index.ts");
const VALIDATE_TS = path.resolve(__dirname, "../../src/core/validate.ts");
const SRC_ROOT = path.resolve(__dirname, "../../src");

/**
 * Legacy custom-Issue-returning functions kept for backward compatibility
 * (will be deleted in Phase 7). Their *Issues replacement is the wiring path.
 */
const DEPRECATED_LEGACY_VALIDATORS: ReadonlySet<string> = new Set<string>([
  "validateExecutionPlan",
  "validateDelegationMap",
]);

/**
 * Both analyses parse the whole `src/` graph, so they are computed once and
 * shared: they only read files this suite never writes, and re-running them per
 * test cost ~25s of CI time for an identical answer.
 */
let validatorsOnce: ReturnType<typeof collectPublicValidators> | null = null;
let reachableOnce: Promise<ReadonlySet<string>> | null = null;

const publicValidators = (): ReturnType<typeof collectPublicValidators> => {
  validatorsOnce ??= collectPublicValidators(VALIDATORS_ROOT, DEPRECATED_LEGACY_VALIDATORS);
  return validatorsOnce;
};

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

const reachableNames = (): Promise<ReadonlySet<string>> => {
  reachableOnce ??= buildReachableNames(VALIDATE_TS, SRC_ROOT);
  return reachableOnce;
};

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
 * This list MUST shrink over time and MUST never grow.
 * `PENDING_WIRING_INITIAL_KEYS` plus the staleness tripwires below keep both
 * directions honest.
 */
const PENDING_WIRING: ReadonlyMap<string, string> = new Map<string, string>([
  [
    "validateDiscussMermaid",
    "2026-08-22 — validators/discussMermaid.ts, unused `export const` alias, see #670",
  ],
  ["validateIntegrationSurface", "2026-08-22 — validators/integrationSurface.ts, see #670"],
  ["validateMermaidFenceUsage", "2026-08-22 — validators/mermaidFence.ts, see #670"],
  ["validateRequireIndexShape", "2026-08-22 — validators/requireIndex.ts, see #670"],
  ["validateRequirementsContext", "2026-08-22 — validators/requirementsContext.ts, see #670"],
  ["validateRequirePackReadiness", "2026-08-22 — validators/requirePack.ts, see #670"],
  ["validatePhaseOrdering", "2026-08-22 — validators/skill/phaseOrdering.ts, see #670"],
  ["validateSidecarFlowOrdering", "2026-08-22 — validators/skill/sidecarFlowOrdering.ts, see #670"],
  [
    "validateCanonicalSidecarFamilyCompleteness",
    "2026-08-22 — validators/uix/threeLayer.ts, unused `export const` alias, see #670",
  ],
  [
    "validateOptionComparison",
    "2026-08-22 — validators/uix/comparisonValidator.ts, `export { … as … }` alias reached only from the unwired uix/nonUiOverfire.ts, see #670",
  ],
  ["validateDesignSystemPresence", "2026-08-22 — validators/uix/designSystemPresence.ts, see #403"],
]);

/**
 * The exact keys recorded when the census was taken. `PENDING_WIRING` MUST
 * stay a subset of this set: resolving one entry frees no slot for a new one,
 * so the allowlist can only shrink. A size-only check would let a fresh
 * unwired validator take a retired entry's place.
 *
 * The census is re-taken only when the *collector* starts seeing a declaration
 * form it was blind to — `export const` (2026-08-22) and `export { … as … }`
 * (2026-08-22) each surfaced dead code that predated the guard, not new dead
 * code. Widening the collector is the only reason a name may join this set.
 */
const PENDING_WIRING_INITIAL_KEYS: ReadonlySet<string> = new Set<string>([
  "validateAtddCoverageLedgers",
  "validateBusinessFlowHasMermaid",
  "validateConvergenceDoc",
  "validateDiscussMermaid",
  "validateImportLiteEvidencePresence",
  "validateIntegrationSurface",
  "validateMermaidFenceUsage",
  "validateDelegationMapIssues",
  "validateRequireIndexShape",
  "validateRequirementsContext",
  "validateRequirePackReadiness",
  "validatePhaseOrdering",
  "validateSidecarFlowOrdering",
  "validateAntiPreference",
  "validateCanonicalSidecarFamilyCompleteness",
  "validateOptionComparison",
  "validateDesignSystemPresence",
  "validateStrategyStrong",
  "validateTasteInterview",
  "validateTasteReflection",
  "validateTrendScan",
]);

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

/**
 * Validators reachable from validate.ts through a direct module import rather
 * than through `validators/index.ts`. P4 requires the barrel re-export, so the
 * check below covers the whole tree; these names were already exempt when that
 * check was widened (2026-08-22) and are grandfathered. Like `PENDING_WIRING`
 * this set may only shrink — a newly added validator must be barrel-exported,
 * and `BARREL_EXPORT_EXEMPT_INITIAL_KEYS` below makes that structural rather
 * than aspirational.
 */
const BARREL_EXPORT_EXEMPT: ReadonlySet<string> = new Set<string>([
  "validateAssistantAssets",
  "validateContractConsistency",
  "validateContracts",
  "validateDbContractExecutability",
  "validateDiscussionMermaid",
  "validateDefinedIds",
  "validateSkillsIntegrity",
  "validateSpecPacks",
  "validateSpecStatus",
  "validateCreateRowCapabilityRefs",
  "validateTriageSection",
  "validateClassification",
  "validateExplorationArtifacts",
  "validateSidecarMissing",
  "validateOqClosure",
]);

/**
 * The exact keys recorded when `BARREL_EXPORT_EXEMPT` was taken (2026-08-22).
 * `BARREL_EXPORT_EXEMPT` MUST stay a subset of this set, for the same reason
 * `PENDING_WIRING` must stay a subset of its initial keys: without a fixed
 * baseline, forgetting a new validator's barrel export could be waved through
 * by appending its name to the exemption list.
 */
const BARREL_EXPORT_EXEMPT_INITIAL_KEYS: ReadonlySet<string> = new Set<string>([
  "validateAssistantAssets",
  "validateContractConsistency",
  "validateContracts",
  "validateDbContractExecutability",
  "validateDiscussionMermaid",
  "validateDefinedIds",
  "validateSkillsIntegrity",
  "validateSpecPacks",
  "validateSpecStatus",
  "validateCreateRowCapabilityRefs",
  "validateTriageSection",
  "validateClassification",
  "validateExplorationArtifacts",
  "validateSidecarMissing",
  "validateOqClosure",
]);

const DATED_ENTRY_RE = /^\d{4}-\d{2}-\d{2}\s/;

describe("meta-test: validators are wired into the pipeline", () => {
  it("every public Issue[]-returning validator under validators/ is reachable from validate.ts", async () => {
    const validators = await publicValidators();
    const reachable = await reachableNames();

    expect(validators.length, "expected at least one public validator").toBeGreaterThan(0);

    const unwired: Array<{ name: string; file: string }> = [];
    for (const { name, file } of validators) {
      if (PENDING_WIRING.has(name)) continue;
      if (!reachable.has(name)) {
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
    const all = await publicValidators();
    const prototypingOnly = await collectPublicValidators(
      PROTOTYPING_VALIDATORS_DIR,
      DEPRECATED_LEGACY_VALIDATORS,
    );

    // The pre-widening guard saw 5 of 92 declarations. Any scope regression
    // that re-narrows the collector trips here.
    expect(all.length).toBeGreaterThan(prototypingOnly.length * 5);
    const dirs = new Set(all.map((v) => path.relative(VALIDATORS_ROOT, path.dirname(v.file))));
    expect(dirs.has("")).toBe(true);
    expect(dirs.has("uix")).toBe(true);
    expect(dirs.has("prototyping")).toBe(true);
  });

  it("collects validators published through an export clause, not just declarations", async () => {
    // `export { local as validateX }` publishes a validator under a new public
    // name. A collector that reads only `export function` / `export const`
    // declarations lets that name skip both this guard and the P4 barrel check.
    const fixture = [
      "export { validateExplorationArtifacts as validateOptionComparison };",
      'export { validateReExported } from "./other.js";',
      "export function validateDeclared(): void {}",
      "export const validateAssigned = async (): Promise<void> => {};",
      "function validateInternal(): void {}",
    ].join("\n");

    const names = collectValidatorExports("fixture.ts", fixture);
    expect(names).toContain("validateOptionComparison");
    // Over-correction pins: the declaration forms still count, a pass-through
    // re-export is not a second declaration of the same validator, and a
    // module-private function is not public surface.
    expect(names).toContain("validateDeclared");
    expect(names).toContain("validateAssigned");
    expect(names).not.toContain("validateReExported");
    expect(names).not.toContain("validateInternal");

    const declared = await publicValidators();
    const optionComparison = declared.find((v) => v.name === "validateOptionComparison");
    expect(optionComparison?.file).toBe(
      path.resolve(VALIDATORS_ROOT, "uix/comparisonValidator.ts"),
    );
  });

  it("counts only identifiers in value position — prose, strings and imports are not wiring", () => {
    // Every shape below names a validator without invoking it. If any of them
    // is credited, an unwired validator counts as wired.
    const fixture = [
      "/** QFAI-PROT-310 was produced by validateBlockCommentOnly. */",
      'import { validateImportedButNeverCalled } from "./neverCalled.js";',
      'export { validateBarrelOnly } from "./barrelOnly.js";',
      "// TODO: call validateLineCommentOnly here one day",
      "export function validateDeclaredHere(input: string): string {",
      '  const doc = "ask validateInsideString, see https://x.test/#validateInsideUrl";',
      "  const label = `${validateInsideInterpolation(doc)} validateInsideTemplateText`;",
      "  return validateActuallyCalled(input, label); // validateTrailingComment",
      "}",
    ].join("\n");

    const referenced = referencedNamesInSource(fixture, ALL_SYMBOLS);

    for (const mention of [
      "validateBlockCommentOnly",
      "validateLineCommentOnly",
      "validateTrailingComment",
      "validateImportedButNeverCalled",
      "validateBarrelOnly",
      "validateDeclaredHere",
      "validateInsideString",
      "validateInsideUrl",
      "validateInsideTemplateText",
    ]) {
      expect(referenced.has(mention), `${mention} must not count as wiring`).toBe(false);
    }
    // Over-correction pins: real calls survive, including one written inside a
    // template interpolation and one sharing a line with a stripped comment.
    expect(referenced.has("validateActuallyCalled")).toBe(true);
    expect(referenced.has("validateInsideInterpolation")).toBe(true);
  });

  it("scans only the symbols an importer actually reaches, not whole module bodies", () => {
    // A module reached for one export must not vouch for its siblings: if the
    // only call to a validator lives in an exported function nobody imports,
    // the validator is still dead.
    const fixture = [
      'import { validateWired } from "./wired.js";',
      'import { validateOnlyInDeadCode } from "./dead.js";',
      "export async function runActiveValidators(root: string): Promise<string[]> {",
      "  return [...(await validateWired(root)), ...(await sharedHelper(root))];",
      "}",
      "export async function runExperimentalValidators(root: string): Promise<string[]> {",
      "  return validateOnlyInDeadCode(root);",
      "}",
      "async function sharedHelper(root: string): Promise<string[]> {",
      "  return validateReachedThroughHelper(root);",
      "}",
    ].join("\n");

    const fromActive = referencedNamesInSource(fixture, ["runActiveValidators"]);
    expect(fromActive.has("validateOnlyInDeadCode")).toBe(false);
    // Over-correction pins: the imported entry point still counts, and so does
    // anything it reaches through a module-private helper.
    expect(fromActive.has("validateWired")).toBe(true);
    expect(fromActive.has("validateReachedThroughHelper")).toBe(true);
    // The graph root (validate.ts) is entered whole, so both halves count there.
    expect(referencedNamesInSource(fixture, ALL_SYMBOLS).has("validateOnlyInDeadCode")).toBe(true);
  });

  it("credits an aliased named import to the name its module exports", () => {
    // `import { validateFoo as runFoo }` + `runFoo()` is a call to
    // validateFoo. Losing the alias mapping would report a wired validator as
    // dead and fail CI on correct code.
    const fixture = [
      'import { validateFoo as runFoo, validateBar } from "./validators.js";',
      'import { validateNeverCalled as runNever } from "./validators.js";',
      "export async function runGate(root: string): Promise<string[]> {",
      "  return [...(await runFoo(root)), ...(await validateBar(root))];",
      "}",
    ].join("\n");

    const referenced = referencedNamesInSource(fixture, ["runGate"]);
    expect(referenced.has("validateFoo")).toBe(true);
    // Over-correction pins: a plain named import still counts, the local alias
    // is not itself a validator name, and an alias that is never called stays
    // unwired.
    expect(referenced.has("validateBar")).toBe(true);
    expect(referenced.has("runFoo")).toBe(false);
    expect(referenced.has("validateNeverCalled")).toBe(false);
    expect(referenced.has("runNever")).toBe(false);
  });

  it("validators/index.ts re-exports every public validator under validators/ (excluding pending-wiring and grandfathered exemptions)", async () => {
    const validators = await publicValidators();
    const exported = barrelExportedNames(await readFile(VALIDATORS_INDEX, "utf-8"));

    const missingExports: string[] = [];
    for (const { name } of validators) {
      if (PENDING_WIRING.has(name)) continue;
      if (BARREL_EXPORT_EXEMPT.has(name)) continue;
      if (!exported.has(name)) {
        missingExports.push(name);
      }
    }

    expect(
      missingExports,
      `validators/index.ts must re-export every public validator under validators/ (design-principles.md P4). Missing: ${missingExports.join(", ")}`,
    ).toEqual([]);
  });

  it("BARREL_EXPORT_EXEMPT has no stale entries (re-exported or deleted validators must be removed)", async () => {
    const validators = await publicValidators();
    const declared = new Set(validators.map((v) => v.name));
    const exported = barrelExportedNames(await readFile(VALIDATORS_INDEX, "utf-8"));

    const stale = [...BARREL_EXPORT_EXEMPT].filter(
      (name) => !declared.has(name) || exported.has(name),
    );
    expect(
      stale,
      `These names no longer need an exemption — drop them from BARREL_EXPORT_EXEMPT: ${stale.join(", ")}`,
    ).toEqual([]);
  });

  it("BARREL_EXPORT_EXEMPT never grows (a new validator must be barrel-exported, not exempted)", () => {
    const added = [...BARREL_EXPORT_EXEMPT].filter(
      (name) => !BARREL_EXPORT_EXEMPT_INITIAL_KEYS.has(name),
    );
    expect(
      added,
      `BARREL_EXPORT_EXEMPT may only shrink — export the validator from validators/index.ts instead. New names: ${added.join(", ")}`,
    ).toEqual([]);
    expect(BARREL_EXPORT_EXEMPT.size).toBeLessThanOrEqual(BARREL_EXPORT_EXEMPT_INITIAL_KEYS.size);
  });

  // A name appearing in the reachable text can be satisfied by a barrel
  // re-export or a doc comment alone — which is how QFAI-PROT-311 stayed
  // dead while this suite was green. Pin the actual call site in
  // runPrototypingValidators so unwiring the reader fails here.
  it("runPrototypingValidators calls the delegationMap reader (QFAI-PROT-311)", async () => {
    const validateBody = await readFile(VALIDATE_TS, "utf-8");
    expect(
      /validatePrototypingDelegationMap\(/.test(validateBody),
      "validate.ts must invoke validatePrototypingDelegationMap(), not merely re-export it",
    ).toBe(true);
  });

  it("the retired QFAI-PROT-310 producer is absent from the reachable graph", async () => {
    // End-to-end backstop: `validateExecutionPlanIssues` no longer exists
    // anywhere in src/ — its single remaining occurrence is a JSDoc mention in
    // prototyping/delegationMap.ts. The old guard asserted this name was
    // "wired" and went green on that comment alone. The symbol-level regression
    // protection lives in the fixture tests above.
    const reachable = await reachableNames();
    expect(reachable.has("validateExecutionPlanIssues")).toBe(false);
  });

  it("validateDelegationMapIssues is wired through a call site (QFAI-PROT-311)", async () => {
    // This name used to satisfy the guard purely because validators/index.ts
    // re-exports it and the barrel body counted as reachable *text*, while
    // nothing called it. It is now genuinely wired: validate.ts calls
    // `validatePrototypingDelegationMap`, which calls this. The symbol walk
    // must credit that real call chain, and the census entry must be gone.
    // The "a re-export is not a call site" rule itself is pinned by the
    // fixture cases above, which do not depend on any one validator's status.
    const reachable = await reachableNames();
    expect(reachable.has("validateDelegationMapIssues")).toBe(true);
    expect(PENDING_WIRING.has("validateDelegationMapIssues")).toBe(false);
  });

  it("PENDING_WIRING never grows and carries a date per entry", () => {
    const added = [...PENDING_WIRING.keys()].filter(
      (name) => !PENDING_WIRING_INITIAL_KEYS.has(name),
    );
    expect(
      added,
      `PENDING_WIRING may only shrink — a resolved entry frees no slot. New names: ${added.join(", ")}`,
    ).toEqual([]);
    expect(PENDING_WIRING.size).toBeLessThanOrEqual(PENDING_WIRING_INITIAL_KEYS.size);
    const undated = [...PENDING_WIRING.entries()]
      .filter(([, note]) => !DATED_ENTRY_RE.test(note))
      .map(([name]) => name);
    expect(
      undated,
      `PENDING_WIRING entries must start with YYYY-MM-DD: ${undated.join(", ")}`,
    ).toEqual([]);
  });

  it("PENDING_WIRING has no stale entries (wired or deleted validators must be removed)", async () => {
    const validators = await publicValidators();
    const declared = new Set(validators.map((v) => v.name));
    const reachable = await reachableNames();

    const stale = [...PENDING_WIRING.keys()].filter(
      (name) => !declared.has(name) || reachable.has(name),
    );
    expect(
      stale,
      `These names are no longer dead code — drop them from PENDING_WIRING: ${stale.join(", ")}`,
    ).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// ATDD family: the same dead-code failure mode outside validators/prototyping/
// ---------------------------------------------------------------------------

const VALIDATORS_DIR = path.resolve(__dirname, "../../src/core/validators");

/**
 * The module that owns the ATDD gate family. Pinned by name so that deleting
 * it cannot be disguised by some other module happening to emit an ATDD code:
 * `modules.length > 0` alone would still hold and every other assertion would
 * vacuously pass.
 */
const ATDD_GATE_MODULE = path.resolve(VALIDATORS_DIR, "atddCodeTraceability.ts");

/** The exported entry point every `qfai validate` profile runs through. */
const VALIDATE_ENTRY = "validateProject";

/** The orchestrator `--profile atdd` dispatches to; the ATDD profile boundary. */
const ATDD_PROFILE_ENTRY = "runAtddValidators";

const ATDD_CODE_PATTERN = /^QFAI-ATDD-\d+$/;
/** Static `from "./x.js"` plus dynamic `await import("./x.js")` specifiers. */
const MODULE_SPECIFIER_RE = /(?:from\s*|import\s*\(\s*)["'](\.\.?\/[\w./-]+)["']/g;

function parse(fileName: string, body: string): ts.SourceFile {
  return ts.createSourceFile(fileName, body, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
}

/** Every string literal in a module, `code` constants included. Comments are not literals. */
function collectStringLiterals(fileName: string, body: string): string[] {
  const literals: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isStringLiteralLike(node)) literals.push(node.text);
    ts.forEachChild(node, visit);
  };
  visit(parse(fileName, body));
  return literals;
}

/**
 * `const RULE_ID = "QFAI-..."` bindings, by name. Rule IDs are routinely named
 * this way (`upstreamSsotGuard.ts:30` exports `UPSTREAM_SSOT_EDIT_RULE_ID` and
 * passes it to `issue()`), so a literal-only reader would see such a module
 * emit nothing and drop it from the ATDD family altogether.
 */
function collectStringConstants(source: ts.SourceFile): Map<string, string> {
  const constants = new Map<string, string>();
  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer !== undefined &&
      ts.isStringLiteralLike(node.initializer)
    ) {
      constants.set(node.name.text, node.initializer.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return constants;
}

/** The string value of an argument: a literal, or a constant declared in the module. */
function constantValue(
  expression: ts.Expression,
  constants: ReadonlyMap<string, string>,
): string | undefined {
  if (ts.isStringLiteralLike(expression)) return expression.text;
  if (ts.isIdentifier(expression)) return constants.get(expression.text);
  return undefined;
}

/**
 * Issue codes a module actually *emits*: the first argument of an `issue(...)`
 * call, plus any `code:` property in an Issue literal — as a string literal, or
 * as an identifier resolved against the module's own string constants.
 *
 * Prose is deliberately invisible here. `scaffoldPlaceholder.ts` and
 * `tddList.ts` both discuss `QFAI-ATDD-112` in comments and in the message text
 * of a `D-SCAFFOLD-*` / `TDDLIST_*` finding while emitting no ATDD code at all —
 * a whole-file text scan counted them as ATDD emitters, so a deletion of the
 * real gate module would have left the guard green on two impostors.
 *
 * Known limit: a rule ID *imported* from another module still reads as no code.
 * No validator does that today, and the `QFAI-ATDD-001` retirement check below
 * scans every string literal under `src/` precisely so a cross-module constant
 * cannot smuggle the retired code back in.
 */
function collectEmittedCodes(fileName: string, body: string): string[] {
  const source = parse(fileName, body);
  const constants = collectStringConstants(source);
  const codes = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "issue"
    ) {
      const first = node.arguments[0];
      const code = first === undefined ? undefined : constantValue(first, constants);
      if (code !== undefined) codes.add(code);
    }
    if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name) && node.name.text === "code") {
      const code = constantValue(node.initializer, constants);
      if (code !== undefined) codes.add(code);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return [...codes];
}

/** Top-level `export [async] function validate*` / `export const validate* =`. */
function collectExportedValidatorNames(fileName: string, body: string): string[] {
  const names: string[] = [];
  const isExported = (node: ts.Node): boolean =>
    ts.canHaveModifiers(node) &&
    (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

  for (const stmt of parse(fileName, body).statements) {
    if (ts.isFunctionDeclaration(stmt)) {
      if (stmt.name && stmt.name.text.startsWith("validate") && isExported(stmt)) {
        names.push(stmt.name.text);
      }
      continue;
    }
    if (ts.isVariableStatement(stmt) && isExported(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.name.text.startsWith("validate")) {
          names.push(decl.name.text);
        }
      }
    }
  }
  return names;
}

// ---------------------------------------------------------------------------
// Declaration-level call graph
//
// Module-level reachability is not wiring. A text (or even AST) hit anywhere in
// an importable module says nothing about whether that code ever runs: the call
// may sit in a helper nobody invokes, or in a comment. Reachability is
// therefore computed over *declarations* — who calls whom.
//
// A node is one specific declaration: (declaring file, declared name, position
// of the declaration). Every coarser key merges declarations that are not the
// same code. A bare name merges same-named declarations across the import
// graph; `file#name` still merges them *within* one file, so a top-level
// `check()` and a class method `check()` shared a node and a validator called
// only from the method read as executed whenever anything called the function.
//
// Edges resolve a call site by lexical scope: innermost enclosing scope first,
// then outward, then the module's own import bindings (following
// `export { x } from` barrels). Names only a receiver can reach — class
// methods, object-literal properties — are deliberately absent from every
// scope, so `check()` can never borrow `adapter.check`.
// ---------------------------------------------------------------------------

/** A call-graph node: the declaration `name` at `pos` inside `file`. */
function declId(file: string, name: string, pos: number): string {
  return `${file}#${name}@${pos}`;
}

/** Node for statements outside any function; importing the module runs them. */
function moduleTopLevelOwner(file: string): string {
  return `${file}#<module>`;
}

/**
 * The declaration name a call site names, or `undefined` when syntax alone
 * cannot say. `adapter.check()` deliberately yields nothing: reducing it to the
 * bare `check` hands the edge to whatever local `check()` the same file happens
 * to declare — including one nobody invokes — and a validator called only from
 * that dead local would read as executed.
 */
function calleeName(expression: ts.Expression): string | undefined {
  if (ts.isIdentifier(expression)) return expression.text;
  return undefined;
}

/** Combinators that invoke a callback argument where it stands. */
const CALLBACK_INVOKING_METHODS: ReadonlySet<string> = new Set<string>([
  "map",
  "flatMap",
  "forEach",
  "filter",
  "find",
  "findIndex",
  "findLast",
  "some",
  "every",
  "reduce",
  "sort",
  "then",
  "catch",
  "finally",
]);

/**
 * Whether an unnamed function runs at the point it is written — an IIFE, or the
 * callback of a combinator that invokes it. `register(() => validateAtddFoo())`
 * does not qualify: merely handing a closure to someone is not running it, and
 * folding its body into the caller would report a never-invoked validator as
 * executed.
 */
function invokedInPlace(node: ts.FunctionExpression | ts.ArrowFunction): boolean {
  let current: ts.Node = node;
  let parent: ts.Node | undefined = current.parent;
  while (parent !== undefined && ts.isParenthesizedExpression(parent)) {
    current = parent;
    parent = parent.parent;
  }
  if (parent === undefined || !ts.isCallExpression(parent)) return false;
  if (parent.expression === current) return true;
  if (!parent.arguments.some((argument) => argument === current)) return false;
  const callee = parent.expression;
  if (ts.isPropertyAccessExpression(callee)) return CALLBACK_INVOKING_METHODS.has(callee.name.text);
  if (ts.isIdentifier(callee)) return CALLBACK_INVOKING_METHODS.has(callee.text);
  return false;
}

/** Every node that opens a scope and can own call edges. */
type FunctionLike =
  | ts.FunctionDeclaration
  | ts.FunctionExpression
  | ts.ArrowFunction
  | ts.MethodDeclaration
  | ts.ConstructorDeclaration
  | ts.GetAccessorDeclaration
  | ts.SetAccessorDeclaration;

function asFunctionLike(node: ts.Node): FunctionLike | undefined {
  if (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isConstructorDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node)
  ) {
    return node;
  }
  return undefined;
}

/**
 * The name a *bare identifier* call site can use to reach this function —
 * `function validateX()` or `const validateX = async () => {}`.
 *
 * A class method and an object-literal property are deliberately nameless
 * here. Both are reachable only through a receiver (`adapter.check()`), which
 * `calleeName` refuses to resolve, so putting them in a scope under their bare
 * name would hand every `check()` an edge into a method nobody calls.
 */
function bindingName(node: FunctionLike): string | undefined {
  if (ts.isFunctionDeclaration(node)) return node.name?.text;
  if (ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
    const parent: ts.Node | undefined = node.parent;
    if (parent !== undefined && ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
      return parent.name.text;
    }
  }
  return undefined;
}

/** Human-readable half of a node id. The position is what makes it unique. */
function declLabel(node: FunctionLike): string {
  const bound = bindingName(node);
  if (bound !== undefined) return bound;
  if (ts.isConstructorDeclaration(node)) return "<constructor>";
  if (
    (ts.isMethodDeclaration(node) ||
      ts.isGetAccessorDeclaration(node) ||
      ts.isSetAccessorDeclaration(node)) &&
    ts.isIdentifier(node.name)
  ) {
    return `<method ${node.name.text}>`;
  }
  const parent: ts.Node | undefined = node.parent;
  if (parent !== undefined && ts.isPropertyAssignment(parent) && ts.isIdentifier(parent.name)) {
    return `<property ${parent.name.text}>`;
  }
  return "<anonymous>";
}

/** Where an imported / re-exported binding comes from. */
type ImportTarget = { file: string; name: string };

/** One lexical scope: what a bare identifier resolves to inside it. */
type ScopeInfo = {
  /** The enclosing scope's owning node; `undefined` for the module scope. */
  parent: ts.Node | undefined;
  /** Bare-callable name -> graph node id, for functions declared in this scope. */
  names: Map<string, string>;
};

type ModuleFacts = {
  file: string;
  source: ts.SourceFile;
  /** Scope-owner node -> its bindings. The module scope is keyed by `source`. */
  scopes: Map<ts.Node, ScopeInfo>;
  /** Function-like node -> its graph node id. */
  functionIds: Map<ts.Node, string>;
  /** Module-scope declarations — the only ones an import can land on. */
  topLevel: Map<string, string>;
  /** Local binding name -> origin, for static and `await import()` named imports. */
  imports: Map<string, ImportTarget>;
  /** `export { a as b } from "./x.js"` — exported name -> origin. */
  reExports: Map<string, ImportTarget>;
  /** `export * from "./x.js"` targets. */
  starReExports: string[];
};

/** Resolve a relative specifier to the `.ts` path this repo compiles it from. */
function specifierTarget(fromFile: string, specifier: string): string {
  return path.resolve(path.dirname(fromFile), specifier.replace(/\.js$/, ".ts"));
}

/** `await import("./x.js")` / `import("./x.js")` initializer -> resolved path. */
function dynamicImportTarget(file: string, initializer?: ts.Expression): string | undefined {
  let expr: ts.Expression | undefined = initializer;
  if (expr !== undefined && ts.isAwaitExpression(expr)) expr = expr.expression;
  if (expr === undefined || !ts.isCallExpression(expr)) return undefined;
  if (expr.expression.kind !== ts.SyntaxKind.ImportKeyword) return undefined;
  const arg = expr.arguments[0];
  if (arg === undefined || !ts.isStringLiteralLike(arg) || !arg.text.startsWith(".")) {
    return undefined;
  }
  return specifierTarget(file, arg.text);
}

/** Declarations and binding origins of one module — the input to edge resolution. */
function moduleFacts(file: string, body: string): ModuleFacts {
  const source = parse(file, body);
  const moduleScope: ScopeInfo = { parent: undefined, names: new Map<string, string>() };
  const scopes = new Map<ts.Node, ScopeInfo>([[source, moduleScope]]);
  const functionIds = new Map<ts.Node, string>();
  const imports = new Map<string, ImportTarget>();
  const reExports = new Map<string, ImportTarget>();
  const starReExports: string[] = [];

  const relativeTarget = (specifier?: ts.Expression): string | undefined =>
    specifier !== undefined && ts.isStringLiteralLike(specifier) && specifier.text.startsWith(".")
      ? specifierTarget(file, specifier.text)
      : undefined;

  const visit = (node: ts.Node, scope: ts.Node): void => {
    let childScope = scope;
    const fn = asFunctionLike(node);
    if (fn !== undefined) {
      const id = declId(file, declLabel(fn), fn.pos);
      functionIds.set(fn, id);
      // The name belongs to the *enclosing* scope; the function opens its own.
      const bound = bindingName(fn);
      if (bound !== undefined) scopes.get(scope)?.names.set(bound, id);
      scopes.set(fn, { parent: scope, names: new Map<string, string>() });
      childScope = fn;
    }

    if (
      ts.isImportDeclaration(node) &&
      node.importClause?.namedBindings !== undefined &&
      ts.isNamedImports(node.importClause.namedBindings)
    ) {
      const target = relativeTarget(node.moduleSpecifier);
      if (target !== undefined) {
        for (const element of node.importClause.namedBindings.elements) {
          imports.set(element.name.text, {
            file: target,
            name: (element.propertyName ?? element.name).text,
          });
        }
      }
    }

    if (ts.isExportDeclaration(node)) {
      const target = relativeTarget(node.moduleSpecifier);
      if (target !== undefined) {
        if (node.exportClause !== undefined && ts.isNamedExports(node.exportClause)) {
          for (const element of node.exportClause.elements) {
            reExports.set(element.name.text, {
              file: target,
              name: (element.propertyName ?? element.name).text,
            });
          }
        } else if (node.exportClause === undefined) {
          starReExports.push(target);
        }
      }
    }

    if (ts.isVariableDeclaration(node) && ts.isObjectBindingPattern(node.name)) {
      const target = dynamicImportTarget(file, node.initializer);
      if (target !== undefined) {
        for (const element of node.name.elements) {
          if (!ts.isIdentifier(element.name)) continue;
          const imported =
            element.propertyName !== undefined && ts.isIdentifier(element.propertyName)
              ? element.propertyName.text
              : element.name.text;
          imports.set(element.name.text, { file: target, name: imported });
        }
      }
    }

    ts.forEachChild(node, (child) => visit(child, childScope));
  };
  visit(source, source);
  return {
    file,
    source,
    scopes,
    functionIds,
    topLevel: moduleScope.names,
    imports,
    reExports,
    starReExports,
  };
}

/** Follow `export { x } from` / `export *` chains to the declaring module. */
function resolveExport(
  facts: ReadonlyMap<string, ModuleFacts>,
  file: string,
  name: string,
  seen: Set<string>,
): string | undefined {
  const key = `${file}#${name}`;
  if (seen.has(key)) return undefined;
  seen.add(key);
  const module = facts.get(file);
  if (module === undefined) return undefined;
  const declared = module.topLevel.get(name);
  if (declared !== undefined) return declared;
  const reExport = module.reExports.get(name);
  if (reExport !== undefined) return resolveExport(facts, reExport.file, reExport.name, seen);
  for (const star of module.starReExports) {
    const hit = resolveExport(facts, star, name, seen);
    if (hit !== undefined) return hit;
  }
  return undefined;
}

/**
 * The declaration a call site named `callee` reaches from inside `scope`.
 * Scopes are searched innermost first, so a nested `helper()` answers for its
 * own callers rather than for its module-scope namesake, and only then do the
 * module's import bindings apply.
 */
function resolveCallee(
  facts: ReadonlyMap<string, ModuleFacts>,
  module: ModuleFacts,
  scope: ts.Node,
  callee: string,
): string | undefined {
  let current: ts.Node | undefined = scope;
  while (current !== undefined) {
    const info = module.scopes.get(current);
    if (info === undefined) break;
    const local = info.names.get(callee);
    if (local !== undefined) return local;
    current = info.parent;
  }
  const imported = module.imports.get(callee);
  if (imported === undefined) return undefined;
  return resolveExport(facts, imported.file, imported.name, new Set<string>());
}

function addEdge(edges: Map<string, Set<string>>, from: string, to: string): void {
  const targets = edges.get(from) ?? new Set<string>();
  targets.add(to);
  edges.set(from, targets);
}

/** Add every `caller -> callee` edge in one module to the shared graph. */
function collectCallEdges(
  facts: ReadonlyMap<string, ModuleFacts>,
  module: ModuleFacts,
  edges: Map<string, Set<string>>,
): void {
  const walk = (node: ts.Node, owner: string, scope: ts.Node): void => {
    let nextOwner = owner;
    let nextScope = scope;
    const fn = asFunctionLike(node);
    const id = fn === undefined ? undefined : module.functionIds.get(fn);
    if (fn !== undefined && id !== undefined) {
      // Every function-like declaration owns its own body — a class method
      // included, so its calls never leak to a same-named function next to it.
      nextOwner = id;
      nextScope = fn;
      if (
        (ts.isFunctionExpression(fn) || ts.isArrowFunction(fn)) &&
        bindingName(fn) === undefined &&
        invokedInPlace(fn)
      ) {
        // An unnamed closure joins its caller only where it is actually
        // invoked, so a validator parked in a callback nobody runs stays
        // unreachable.
        addEdge(edges, owner, id);
      }
    }

    if (ts.isCallExpression(node)) {
      const callee = calleeName(node.expression);
      const target = callee === undefined ? undefined : resolveCallee(facts, module, scope, callee);
      if (target !== undefined) addEdge(edges, owner, target);
    }
    ts.forEachChild(node, (child) => walk(child, nextOwner, nextScope));
  };
  walk(module.source, moduleTopLevelOwner(module.file), module.source);
}

/**
 * Declaration-level call graph over a `path -> source` module set. `nodeOf`
 * hands back the node of a module-scope declaration: node ids carry a
 * declaration position, so a name alone can no longer address one.
 */
type CallGraph = {
  edges: Map<string, Set<string>>;
  nodeOf: (file: string, name: string) => string | undefined;
};

function buildCallGraph(modules: ReadonlyMap<string, string>): CallGraph {
  const facts = new Map<string, ModuleFacts>();
  for (const [file, body] of modules) {
    facts.set(file, moduleFacts(file, body));
  }
  const edges = new Map<string, Set<string>>();
  for (const module of facts.values()) {
    collectCallEdges(facts, module, edges);
  }
  return { edges, nodeOf: (file, name) => facts.get(file)?.topLevel.get(name) };
}

/** Names transitively invoked starting from `roots`. */
function reachableFrom(edges: ReadonlyMap<string, Set<string>>, roots: string[]): Set<string> {
  const seen = new Set<string>(roots);
  const queue = [...roots];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    for (const callee of edges.get(current) ?? []) {
      if (seen.has(callee)) continue;
      seen.add(callee);
      queue.push(callee);
    }
  }
  return seen;
}

/**
 * Every module transitively reachable from validate.ts through relative
 * specifiers, keyed by resolved `.ts` path. This is the *file* set the call
 * graph is built from — it decides which functions exist, not which run.
 */
async function buildImportedModules(): Promise<Map<string, string>> {
  const modules = new Map<string, string>();
  const queue: string[] = [VALIDATE_TS];
  const seen = new Set<string>(queue);

  while (queue.length > 0) {
    const file = queue.shift();
    if (file === undefined) break;
    let body: string;
    try {
      body = await readFile(file, "utf-8");
    } catch {
      // Unresolved specifier (directory index, type-only module) — best-effort
      // traversal, the guard degrades to "contributes no functions" for it.
      continue;
    }
    modules.set(file, body);
    MODULE_SPECIFIER_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = MODULE_SPECIFIER_RE.exec(body)) !== null) {
      const rel = match[1];
      if (!rel) continue;
      const resolved = path.resolve(path.dirname(file), rel.replace(/\.js$/, ".ts"));
      if (!resolved.startsWith(SRC_ROOT)) continue;
      if (seen.has(resolved)) continue;
      seen.add(resolved);
      queue.push(resolved);
    }
  }
  return modules;
}

type ExecutionGraph = { graph: CallGraph; modules: ReadonlyMap<string, string> };

async function buildExecutionGraph(): Promise<ExecutionGraph> {
  const modules = await buildImportedModules();
  return { graph: buildCallGraph(modules), modules };
}

/**
 * Declarations that run for *some* profile. `runProfileOwnValidators` dispatches
 * on `switch (profile)`, which a static graph cannot evaluate, so every branch
 * merges here — this set answers "does this run at all", never "does this run
 * for a given profile".
 */
function executedFromEntry(execution: ExecutionGraph): Set<string> {
  const entry = execution.graph.nodeOf(VALIDATE_TS, VALIDATE_ENTRY);
  const roots = [...execution.modules.keys()].map(moduleTopLevelOwner);
  if (entry !== undefined) roots.push(entry);
  return reachableFrom(execution.graph.edges, roots);
}

/**
 * Declarations that run for `qfai validate --profile atdd`. Rooted at the
 * profile's own orchestrator so that a validator moved to another profile's
 * branch — still reachable from `validateProject` — reads as unwired here.
 */
function executedFromAtddProfile(execution: ExecutionGraph): Set<string> {
  const entry = execution.graph.nodeOf(VALIDATE_TS, ATDD_PROFILE_ENTRY);
  return entry === undefined ? new Set<string>() : reachableFrom(execution.graph.edges, [entry]);
}

/**
 * Names a barrel actually re-exports, read from its `ExportDeclaration` nodes.
 * A raw-text regex matched `// export { validateAtddFoo } from "./foo.js";`
 * just as happily as the live line, so commenting a re-export out left the
 * validator unreachable through the barrel with the guard still green.
 */
function reExportFacts(file: string, body: string): { names: Set<string>; starTargets: string[] } {
  const facts = moduleFacts(file, body);
  return { names: new Set<string>(facts.reExports.keys()), starTargets: facts.starReExports };
}

async function collectReExportedNames(file: string): Promise<Set<string>> {
  const body = await readFile(file, "utf-8");
  const { names, starTargets } = reExportFacts(file, body);
  for (const target of starTargets) {
    try {
      const targetBody = await readFile(target, "utf-8");
      for (const name of collectExportedValidatorNames(target, targetBody)) names.add(name);
    } catch {
      // Unresolved star target (directory index, deleted module): it
      // contributes no exported name, so the barrel check stays strict.
    }
  }
  return names;
}

type AtddModule = { file: string; codes: string[]; exports: string[] };

/** Validator modules that emit at least one `QFAI-ATDD-NNN` issue code. */
async function collectAtddEmittingModules(): Promise<AtddModule[]> {
  const files = await listTsFiles(VALIDATORS_DIR);
  const out: AtddModule[] = [];
  for (const file of files) {
    if (path.basename(file) === "index.ts") continue;
    const body = await readFile(file, "utf-8");
    const codes = collectEmittedCodes(file, body)
      .filter((c) => ATDD_CODE_PATTERN.test(c))
      .sort();
    if (codes.length === 0) continue;
    out.push({ file, codes, exports: collectExportedValidatorNames(file, body) });
  }
  return out;
}

describe("meta-test: ATDD validators are reachable from the production graph", () => {
  const SAMPLE_FILE = path.join(SRC_ROOT, "atddSample.ts");
  const SAMPLE_SOURCE = "export async function validateAtddSample() {\n  return [];\n}";
  const caller = (file: string, source: string): ReadonlyMap<string, string> =>
    new Map([
      [SAMPLE_FILE, SAMPLE_SOURCE],
      [file, source],
    ]);

  /**
   * Whether the module-scope declaration `file#name` reaches the sample
   * validator. Node ids carry a declaration position, so roots are looked up
   * rather than spelled out; a missing root is a broken fixture, not a `false`.
   */
  const reachesSample = (graph: CallGraph, file: string, name: string): boolean => {
    const root = graph.nodeOf(file, name);
    if (root === undefined) {
      throw new Error(`fixture ${path.basename(file)} declares no module-scope ${name}`);
    }
    const sample = graph.nodeOf(SAMPLE_FILE, "validateAtddSample");
    if (sample === undefined) throw new Error("the sample validator is missing from the graph");
    return reachableFrom(graph.edges, [root]).has(sample);
  };

  it("neither a barrel re-export nor a commented-out call is a call site", () => {
    const barrel = path.join(SRC_ROOT, "barrel.ts");
    const graph = buildCallGraph(
      caller(
        barrel,
        [
          'export { validateAtddSample } from "./atddSample.js";',
          'import { validateAtddSample } from "./atddSample.js";',
          "async function runAtddValidators() {",
          "  // return [...(await validateAtddSample(root, config))];",
          "  return [];",
          "}",
        ].join("\n"),
      ),
    );
    expect(reachesSample(graph, barrel, "runAtddValidators")).toBe(false);

    const live = path.join(SRC_ROOT, "live.ts");
    const liveGraph = buildCallGraph(
      caller(
        live,
        [
          'import { validateAtddSample } from "./atddSample.js";',
          "async function runAtddValidators() {",
          "  return [...(await validateAtddSample())];",
          "}",
        ].join("\n"),
      ),
    );
    expect(reachesSample(liveGraph, live, "runAtddValidators")).toBe(true);
  });

  it("a call inside a function nobody invokes is not reachable", () => {
    const orphan = path.join(SRC_ROOT, "orphanHelper.ts");
    const graph = buildCallGraph(
      caller(
        orphan,
        [
          'import { validateAtddSample } from "./atddSample.js";',
          "async function runAtddValidators() {",
          "  return [];",
          "}",
          "async function unusedHelper() {",
          "  return validateAtddSample();",
          "}",
        ].join("\n"),
      ),
    );
    expect(reachesSample(graph, orphan, "runAtddValidators")).toBe(false);
    expect(reachesSample(graph, orphan, "unusedHelper")).toBe(true);
  });

  it("same-named declarations in different modules are distinct graph nodes", () => {
    // A bare-name graph merges both `check()` declarations into one node, so the
    // orphan module's call to the validator becomes reachable from the wired
    // `check()` and the validator reads as executed while nothing invokes it.
    const wired = path.join(SRC_ROOT, "wired.ts");
    const orphan = path.join(SRC_ROOT, "orphanModule.ts");
    const graph = buildCallGraph(
      new Map([
        [SAMPLE_FILE, SAMPLE_SOURCE],
        [
          wired,
          [
            "function check() {",
            "  return [];",
            "}",
            "async function runAtddValidators() {",
            "  return check();",
            "}",
          ].join("\n"),
        ],
        [
          orphan,
          [
            'import { validateAtddSample } from "./atddSample.js";',
            "function check() {",
            "  return validateAtddSample();",
            "}",
          ].join("\n"),
        ],
      ]),
    );
    expect(reachesSample(graph, wired, "runAtddValidators")).toBe(false);
    expect(reachesSample(graph, orphan, "check")).toBe(true);
  });

  it("same-named declarations inside one module are distinct graph nodes", () => {
    // Keying nodes by `file#name` was not enough: a top-level `check()` and a
    // class method `check()` still shared one node, so calling the function
    // dragged in the method's body and the validator only the method calls read
    // as executed. A method is reachable through a receiver alone, and
    // `adapter.check()` is not resolvable, so nothing reaches it here.
    const mixed = path.join(SRC_ROOT, "mixedDecls.ts");
    const graph = buildCallGraph(
      caller(
        mixed,
        [
          'import { validateAtddSample } from "./atddSample.js";',
          "function check() {",
          "  return [];",
          "}",
          "class Adapter {",
          "  check() {",
          "    return validateAtddSample();",
          "  }",
          "}",
          "async function runAtddValidators() {",
          "  return check();",
          "}",
        ].join("\n"),
      ),
    );
    expect(reachesSample(graph, mixed, "runAtddValidators")).toBe(false);

    // Over-correction pin: the top-level `check()` is still a live call target
    // next to a same-named method, so a validator it does call stays wired.
    const wired = path.join(SRC_ROOT, "wiredLocal.ts");
    const wiredGraph = buildCallGraph(
      caller(
        wired,
        [
          'import { validateAtddSample } from "./atddSample.js";',
          "function check() {",
          "  return validateAtddSample();",
          "}",
          "class Adapter {",
          "  check() {",
          "    return [];",
          "  }",
          "}",
          "async function runAtddValidators() {",
          "  return check();",
          "}",
        ].join("\n"),
      ),
    );
    expect(reachesSample(wiredGraph, wired, "runAtddValidators")).toBe(true);
  });

  it("a nested declaration does not answer for its module-scope namesake", () => {
    // The same merge one level down: `helper` declared inside an unreachable
    // function is not the module-scope `helper` that runAtddValidators calls.
    const nested = path.join(SRC_ROOT, "nestedScopes.ts");
    const graph = buildCallGraph(
      caller(
        nested,
        [
          'import { validateAtddSample } from "./atddSample.js";',
          "function helper() {",
          "  return [];",
          "}",
          "function unusedOuter() {",
          "  function helper() {",
          "    return validateAtddSample();",
          "  }",
          "  return helper();",
          "}",
          "async function runAtddValidators() {",
          "  return helper();",
          "}",
        ].join("\n"),
      ),
    );
    expect(reachesSample(graph, nested, "runAtddValidators")).toBe(false);
    // Over-correction pin: inside `unusedOuter`, `helper()` still resolves to
    // the nested declaration — scopes are searched innermost first.
    expect(reachesSample(graph, nested, "unusedOuter")).toBe(true);
  });

  it("a validator reached only from another profile's branch is not ATDD-wired", () => {
    // `switch (profile)` is not evaluated by a static graph: rooting at
    // validateProject merges every branch, so profile membership must be read
    // from the profile's own orchestrator instead.
    const entry = path.join(SRC_ROOT, "profileEntry.ts");
    const graph = buildCallGraph(
      caller(
        entry,
        [
          'import { validateAtddSample } from "./atddSample.js";',
          "export async function validateProject(profile) {",
          "  return runProfileOwnValidators(profile);",
          "}",
          "async function runProfileOwnValidators(profile) {",
          "  switch (profile) {",
          '    case "atdd":',
          "      return runAtddValidators();",
          "    default:",
          "      return runUiuxValidators();",
          "  }",
          "}",
          "async function runAtddValidators() {",
          "  return [];",
          "}",
          "async function runUiuxValidators() {",
          "  return validateAtddSample();",
          "}",
        ].join("\n"),
      ),
    );
    expect(reachesSample(graph, entry, "validateProject")).toBe(true);
    expect(reachesSample(graph, entry, "runAtddValidators")).toBe(false);
  });

  it("a property call does not borrow a same-named local declaration", () => {
    // `adapter.check()` reduced to a bare `check` handed the edge to the local
    // `check()` below — which nothing invokes — and the validator it calls read
    // as executed.
    const receiver = path.join(SRC_ROOT, "receiver.ts");
    const graph = buildCallGraph(
      caller(
        receiver,
        [
          'import { validateAtddSample } from "./atddSample.js";',
          "async function runAtddValidators(adapter) {",
          "  return adapter.check();",
          "}",
          "function check() {",
          "  return validateAtddSample();",
          "}",
        ].join("\n"),
      ),
    );
    expect(reachesSample(graph, receiver, "runAtddValidators")).toBe(false);
    expect(reachesSample(graph, receiver, "check")).toBe(true);
  });

  it("a validator parked in an unrun callback is not reachable from its registrar", () => {
    const registry = path.join(SRC_ROOT, "registry.ts");
    const graph = buildCallGraph(
      caller(
        registry,
        [
          'import { validateAtddSample } from "./atddSample.js";',
          "const pending = [];",
          "function register(task) {",
          "  pending.push(task);",
          "}",
          "async function runAtddValidators() {",
          "  register(() => validateAtddSample());",
          "  return [];",
          "}",
        ].join("\n"),
      ),
    );
    expect(reachesSample(graph, registry, "runAtddValidators")).toBe(false);

    // A callback a combinator invokes where it stands still counts as running.
    const mapped = path.join(SRC_ROOT, "mapped.ts");
    const mappedGraph = buildCallGraph(
      caller(
        mapped,
        [
          'import { validateAtddSample } from "./atddSample.js";',
          "async function runAtddValidators(specs) {",
          "  return (await Promise.all(specs.map((spec) => validateAtddSample(spec)))).flat();",
          "}",
        ].join("\n"),
      ),
    );
    expect(reachesSample(mappedGraph, mapped, "runAtddValidators")).toBe(true);
  });

  it("prose that merely names an ATDD code does not make a module an emitter", () => {
    const proseOnly = [
      "// `QFAI-ATDD-112` stopped demanding an annotation for L1/L2, so this",
      "// ledger is their only gate.",
      "const findings = [",
      '  issue("D-SCAFFOLD-PLACEHOLDER", "left exactly as QFAI-ATDD-112 saw it", "warning"),',
      "];",
    ].join("\n");
    expect(collectEmittedCodes("proseOnly.ts", proseOnly)).toEqual(["D-SCAFFOLD-PLACEHOLDER"]);

    const emitter = 'return [issue("QFAI-ATDD-112", "TC lacks a test annotation", "error")];';
    expect(collectEmittedCodes("emitter.ts", emitter)).toEqual(["QFAI-ATDD-112"]);
  });

  it("a rule ID handed to issue() through a constant is still an emitted code", () => {
    // `upstreamSsotGuard.ts:30,169` is the live instance of this shape. A
    // literal-only reader saw no code at all, so an ATDD validator written the
    // same way dropped out of the family and skipped every check below.
    const viaConstant = [
      'const ATDD_RULE_ID = "QFAI-ATDD-999";',
      'return [issue(ATDD_RULE_ID, "message", "error")];',
    ].join("\n");
    expect(collectEmittedCodes("viaConstant.ts", viaConstant)).toEqual(["QFAI-ATDD-999"]);

    const viaCodeProperty = [
      'const ATDD_RULE_ID = "QFAI-ATDD-998";',
      "return [{ code: ATDD_RULE_ID, severity: \"error\", message: 'm' }];",
    ].join("\n");
    expect(collectEmittedCodes("viaProperty.ts", viaCodeProperty)).toEqual(["QFAI-ATDD-998"]);
  });

  it("the ATDD gate module still exists and still emits the routing codes", async () => {
    const modules = await collectAtddEmittingModules();
    const gate = modules.find((m) => m.file === ATDD_GATE_MODULE);

    expect(
      gate?.file,
      "validators/atddCodeTraceability.ts owns the QFAI-ATDD-* family. If it was deleted or " +
        "stopped emitting, the reachability assertions below go vacuous.",
    ).toBe(ATDD_GATE_MODULE);
    // US -> tests/e2e/**, TC -> tests/integration/**, CON-API -> tests/api/**.
    // QFAI-ATDD-113 is the CON-API leg: without it pinned here, dropping the
    // CON-API coverage gate alone leaves every assertion in this file green.
    expect(gate?.codes).toEqual(
      expect.arrayContaining([
        "QFAI-ATDD-111",
        "QFAI-ATDD-112",
        "QFAI-ATDD-113",
        "QFAI-ATDD-121",
        "QFAI-ATDD-122",
      ]),
    );
  });

  it("every exported validator of an ATDD-emitting module runs on the atdd profile", async () => {
    const modules = await collectAtddEmittingModules();
    const execution = await buildExecutionGraph();
    const executed = executedFromAtddProfile(execution);

    const atddEntry = execution.graph.nodeOf(VALIDATE_TS, ATDD_PROFILE_ENTRY);
    expect(
      atddEntry !== undefined && executedFromEntry(execution).has(atddEntry),
      "runAtddValidators must itself be reachable from validateProject, or the check below " +
        "measures nothing.",
    ).toBe(true);

    const unwired: string[] = [];
    for (const { file, exports, codes } of modules) {
      const rel = path.relative(SRC_ROOT, file);
      if (exports.length === 0) {
        unwired.push(`${rel} (emits ${codes.join(", ")} but exports no validate* function)`);
        continue;
      }
      // Per validator, not per module: a module that co-locates a wired
      // `validateA` with an unwired `validateB` must still fail on B.
      for (const name of exports) {
        const node = execution.graph.nodeOf(file, name);
        // No node at all means the module is not even in validate.ts's import
        // closure — the strictest form of unwired.
        if (node === undefined || !executed.has(node)) unwired.push(`${rel}#${name}`);
      }
    }

    expect(
      unwired,
      "Each ATDD validator must be invoked on a path that actually executes under " +
        "`--profile atdd` — runAtddValidators, or an orchestrator it reaches. Being importable " +
        "is not wiring: a re-export from validators/index.ts, a commented-out call, and a call " +
        "inside a helper nobody invokes all leave the validator's issue codes unable to appear " +
        "in validate.json — exactly the dead-validator state QFAI-ATDD-001 was in. Reachability " +
        "from some *other* profile's branch is not wiring either.",
    ).toEqual([]);
  });

  it("validators/index.ts re-exports every ATDD-emitting validator", async () => {
    const modules = await collectAtddEmittingModules();
    const reExported = await collectReExportedNames(VALIDATORS_INDEX);

    const missing: string[] = [];
    for (const { exports } of modules) {
      for (const name of exports) {
        if (!reExported.has(name)) missing.push(name);
      }
    }

    expect(
      missing,
      `validators/index.ts must re-export every ATDD-emitting validator. Missing: ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("a commented-out re-export is not a re-export", () => {
    const barrel = path.join(VALIDATORS_DIR, "index.ts");
    const { names } = reExportFacts(
      barrel,
      [
        '// export { validateAtddCommented } from "./commented.js";',
        '/* export { validateAtddBlock } from "./block.js"; */',
        'export { validateAtddLive } from "./live.js";',
      ].join("\n"),
    );
    expect([...names]).toEqual(["validateAtddLive"]);
  });

  it("QFAI-ATDD-001 stays retired", async () => {
    // Every string literal under src/, not just a quoted hit under validators/:
    // re-declaring the code as `const ATDD_LEDGER_MISSING = "QFAI-ATDD-001"`
    // elsewhere and passing the constant to `issue()` would revive the finding
    // while leaving no matching literal in the validators directory.
    const files = await listTsFiles(SRC_ROOT);
    const emitters: string[] = [];
    for (const file of files) {
      const body = await readFile(file, "utf-8");
      if (!body.includes("QFAI-ATDD-001")) continue;
      if (collectStringLiterals(file, body).includes("QFAI-ATDD-001")) {
        emitters.push(path.relative(SRC_ROOT, file));
      }
    }

    expect(
      emitters,
      "QFAI-ATDD-001 fired on the *absence* of <spec-dir>/atdd/coverage-ledger.md, a file " +
        "`qfai init` never ships and that qfai-atdd/SKILL.md and catalog/test-layers.md both " +
        "classify as optional legacy. The code is retired; do not reintroduce it.",
    ).toEqual([]);
  });
});
