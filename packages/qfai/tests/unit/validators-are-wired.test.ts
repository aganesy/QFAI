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
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
  ["validateAtddCoverageLedgers", "2026-08-22 — validators/atddLedger.ts, see #402"],
  ["validateBusinessFlowHasMermaid", "2026-08-22 — validators/businessFlow.ts, see #670"],
  ["validateConvergenceDoc", "2026-08-22 — validators/docs/convergenceDoc.ts, see #670"],
  [
    "validateDiscussMermaid",
    "2026-08-22 — validators/discussMermaid.ts, unused `export const` alias, see #670",
  ],
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
  [
    "validateCanonicalSidecarFamilyCompleteness",
    "2026-08-22 — validators/uix/threeLayer.ts, unused `export const` alias, see #670",
  ],
  [
    "validateOptionComparison",
    "2026-08-22 — validators/uix/comparisonValidator.ts, `export { … as … }` alias reached only from the unwired uix/nonUiOverfire.ts, see #670",
  ],
  ["validateDesignSystemPresence", "2026-08-22 — validators/uix/designSystemPresence.ts, see #403"],
  ["validateStrategyStrong", "2026-08-22 — validators/uix/strategy.ts, see #403"],
  ["validateTasteInterview", "2026-08-22 — validators/uix/taste.ts, see #403"],
  ["validateTasteReflection", "2026-08-22 — validators/uix/tasteReflection.ts, see #403"],
  ["validateTrendScan", "2026-08-22 — validators/uix/trendScan.ts, see #403"],
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

  it("the retired QFAI-PROT-310 producer is absent from the reachable graph", async () => {
    // End-to-end backstop: `validateExecutionPlanIssues` no longer exists
    // anywhere in src/ — its single remaining occurrence is a JSDoc mention in
    // prototyping/delegationMap.ts. The old guard asserted this name was
    // "wired" and went green on that comment alone. The symbol-level regression
    // protection lives in the fixture tests above.
    const reachable = await reachableNames();
    expect(reachable.has("validateExecutionPlanIssues")).toBe(false);
  });

  it("a barrel re-export alone does not count as wiring (QFAI-PROT-311)", async () => {
    // `validateDelegationMapIssues` used to satisfy this guard because
    // validators/index.ts re-exports it and the barrel body was part of the
    // reachable text. Nothing calls it. The symbol walk must keep reporting it
    // as unwired until it is wired or retired.
    const reachable = await reachableNames();
    expect(reachable.has("validateDelegationMapIssues")).toBe(false);
    expect(PENDING_WIRING.has("validateDelegationMapIssues")).toBe(true);
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
