/**
 * Meta-test: every public validator function under src/core/validators/ must
 * be referenced from the validate.ts symbol graph (validate.ts itself, OR a
 * module transitively imported by validate.ts).
 *
 * This catches the "validator written but never invoked" failure mode that
 * allowed `validateExecutionPlan` and `validateDelegationMap` to lurk as dead
 * code in v1.8.3 (RR §8.6). The guard used to scan `validators/prototyping/`
 * only — 5 of 91 declarations — while the same failure mode kept landing in
 * the other 86. Adding a new validator anywhere under `validators/` without
 * wiring it into a runXxxValidators function (directly or via an orchestrator
 * like validateStateGate) MUST fail this test in CI.
 *
 * Implementation strategy:
 *   1. Walk every TS file under src/core/validators/ recursively
 *   2. Extract every exported validator: both `export function validate*(`
 *      declarations and `export const validate* = …` function values
 *   3. Build a "reachable text" set by walking the *symbol* graph out of
 *      validate.ts: follow relative imports transitively, and resolve imports
 *      that go through a barrel (`index.ts`) to the modules that actually
 *      supply the imported names. Barrel bodies, comments, import declarations
 *      and the validator declarations themselves are stripped, so a bare
 *      re-export, an unused import or a mention in prose never counts as
 *      wiring — only a call or a registry reference does.
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
/**
 * `export const validateX = …` / `export const validateX: Fn = …`. A validator
 * bound to a variable is just as exported — and just as capable of being dead —
 * as a function declaration, so it must be collected too.
 */
const PUBLIC_VALIDATOR_CONST_RE = /^export\s+(?:const|let|var)\s+(validate\w+)\s*(?::[^=;]*)?=/gm;
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
    for (const re of [PUBLIC_VALIDATOR_RE, PUBLIC_VALIDATOR_CONST_RE]) {
      re.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = re.exec(body)) !== null) {
        const name = match[1];
        if (name && !DEPRECATED_LEGACY_VALIDATORS.has(name)) {
          out.push({ name, file });
        }
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
 * Characters after which a `/` opens a regular expression literal rather than a
 * division. Used by `stripComments` so a regex body such as `/\/\//` is not
 * mistaken for the start of a line comment.
 */
const REGEX_LITERAL_PREV = new Set<string>([
  "",
  "\n",
  "(",
  ",",
  "=",
  ":",
  "[",
  "!",
  "&",
  "|",
  "?",
  "{",
  "}",
  ";",
  "+",
  "-",
  "*",
  "%",
  "~",
  "^",
  "<",
  ">",
]);

/**
 * Remove every comment — block, whole-line AND trailing — while leaving string,
 * template and regex literals intact. A regex-only strip anchored at the start
 * of a line misses a trailing comment such as
 * `return issues; // TODO: call validateNewGate`, which would leave the name in
 * the reachable text and make an unwired validator look wired.
 */
function stripComments(body: string): string {
  let out = "";
  let index = 0;
  let prevSignificant = "";
  while (index < body.length) {
    const ch = body[index];
    const next = body[index + 1];
    if (ch === "/" && next === "/") {
      while (index < body.length && body[index] !== "\n") index += 1;
      continue;
    }
    if (ch === "/" && next === "*") {
      index += 2;
      while (index < body.length && !(body[index] === "*" && body[index + 1] === "/")) index += 1;
      index += 2;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      out += ch;
      index += 1;
      while (index < body.length) {
        const inner = body[index];
        if (inner === "\\") {
          out += body.slice(index, index + 2);
          index += 2;
          continue;
        }
        out += inner;
        index += 1;
        if (inner === ch) break;
        if (ch !== "`" && inner === "\n") break; // unterminated quote — bail on the line
      }
      prevSignificant = ch;
      continue;
    }
    if (ch === "/" && REGEX_LITERAL_PREV.has(prevSignificant)) {
      out += ch;
      index += 1;
      let inCharClass = false;
      while (index < body.length) {
        const inner = body[index];
        if (inner === "\\") {
          out += body.slice(index, index + 2);
          index += 2;
          continue;
        }
        if (inner === "[") inCharClass = true;
        else if (inner === "]") inCharClass = false;
        out += inner;
        index += 1;
        if (inner === "/" && !inCharClass) break;
        if (inner === "\n") break; // unterminated literal — it was a division
      }
      prevSignificant = "/";
      continue;
    }
    out += ch;
    if (ch === "\n") prevSignificant = "\n";
    else if (ch !== undefined && !/\s/.test(ch)) prevSignificant = ch;
    index += 1;
  }
  return out;
}

/**
 * Remove text that mentions a validator without invoking it: comments (block,
 * whole-line and trailing), `import … from` declarations, the validator's own
 * `export function` / `export const` declaration head, and `export { … } from`
 * re-export statements. Without this, a declaration, an import line or a barrel
 * line makes a dead validator look reachable — which is exactly how
 * `validateDelegationMapIssues` passed the old guard, and how an orchestrator
 * that imports a new validator but forgets to call it would still pass this one.
 */
function stripNonInvokingText(body: string): string {
  return stripComments(body)
    .replace(/^import\s+[^;]*?\sfrom\s*["'][^"']+["']\s*;?/gm, "")
    .replace(/^import\s*["'][^"']+["']\s*;?/gm, "")
    .replace(/export\s+(?:type\s+)?\{[^}]*\}\s*from\s+["'][^"']+["'];?/g, "")
    .replace(/^export\s+(?:async\s+)?function\s+validate\w+\s*\(/gm, "function __declared__(")
    .replace(/^export\s+(?:const|let|var)\s+validate\w+\s*(?::[^=;]*)?=/gm, "const __declared__ =");
}

/**
 * The identifiers a barrel actually re-exports, parsed from its `export { … }
 * from "…"` clauses. Exact identifiers matter: a substring test on the barrel
 * body reports `validateTraceability` as exported merely because the file
 * mentions `validateTraceabilityIntegrity`, which silently forgives the very
 * omission the P4 check exists to catch. `export type { … }` clauses are
 * skipped — a type re-export is not a validator re-export.
 */
function barrelExportedNames(indexBody: string): ReadonlySet<string> {
  const names = new Set<string>();
  const valueReexportRe = /export\s+\{([^}]*)\}\s*from\s+["'][^"']+["']/g;
  let match: RegExpExecArray | null;
  while ((match = valueReexportRe.exec(indexBody)) !== null) {
    const clause = match[1];
    if (!clause) continue;
    for (const name of clauseNames(clause, "public")) {
      names.add(name);
    }
  }
  return names;
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

    // The pre-widening guard saw 5 of 91 declarations. Any scope regression
    // that re-narrows the collector trips here.
    expect(all.length).toBeGreaterThan(prototypingOnly.length * 5);
    const dirs = new Set(all.map((v) => path.relative(VALIDATORS_ROOT, path.dirname(v.file))));
    expect(dirs.has("")).toBe(true);
    expect(dirs.has("uix")).toBe(true);
    expect(dirs.has("prototyping")).toBe(true);
  });

  it("validators/index.ts re-exports every public validator under validators/ (excluding pending-wiring and grandfathered exemptions)", async () => {
    const validators = await collectPublicValidators(VALIDATORS_ROOT);
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
    const validators = await collectPublicValidators(VALIDATORS_ROOT);
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

  it("stripNonInvokingText keeps only text that can invoke a validator", () => {
    // Regression fixture for the reachability tightening itself: every shape
    // below mentions a validator without calling it. If any of them survives,
    // an unwired validator counts as wired.
    const fixture = [
      "/**",
      " * QFAI-PROT-310 was produced by validateBlockCommentOnly.",
      " */",
      'import { validateImportedButNeverCalled } from "./neverCalled.js";',
      'import type { Issue } from "../types.js";',
      'export { validateBarrelOnly } from "./barrelOnly.js";',
      "// TODO: call validateLineCommentOnly here one day",
      "export const validateAliasDeclaredHere = validateActuallyCalled;",
      "export function validateDeclaredHere(input: string): Issue[] {",
      "  const fence = /\\/\\//; // regex, not a comment: validateTrailingCommentOnly",
      '  const doc = "https://example.com/#validateInsideStringUrl";',
      "  if (fence.test(doc)) return validateAlsoCalled(input); // validateTrailingAfterCode",
      "  return validateActuallyCalled(input);",
      "}",
    ].join("\n");

    const stripped = stripNonInvokingText(fixture);

    expect(stripped).not.toContain("validateBlockCommentOnly");
    expect(stripped).not.toContain("validateLineCommentOnly");
    expect(stripped).not.toContain("validateImportedButNeverCalled");
    expect(stripped).not.toContain("validateBarrelOnly");
    expect(stripped).not.toContain("validateDeclaredHere");
    // Trailing comments count as prose too — both after a regex literal and
    // after a real statement.
    expect(stripped).not.toContain("validateTrailingCommentOnly");
    expect(stripped).not.toContain("validateTrailingAfterCode");
    // …but the code on those lines, and anything a string literal happens to
    // contain, must survive: over-stripping would report a wired validator as
    // dead.
    expect(stripped).toContain("validateAlsoCalled");
    expect(stripped).toContain("validateInsideStringUrl");
    expect(stripped).toContain("validateActuallyCalled");
    // An `export const validate… =` head is a declaration, not an invocation,
    // exactly like the `export function` head above.
    expect(stripped).not.toContain("validateAliasDeclaredHere");
  });

  it("the retired QFAI-PROT-310 producer is absent from the reachable graph", async () => {
    // End-to-end backstop: `validateExecutionPlanIssues` no longer exists
    // anywhere in src/ — its single remaining occurrence is a JSDoc mention in
    // prototyping/delegationMap.ts. The old guard asserted this name was
    // "wired" and went green on that comment alone. The strip-level regression
    // protection lives in the fixture test above.
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
