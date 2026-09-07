/**
 * Layout anti-pattern (lap-*) registry.
 *
 * The lap-* registry replaces the legacy slop registry. Patterns are
 * applied to iter HTML output (not discussion-pack markdown). Each entry
 * is either:
 *
 *   - `scope: "layout"` — regex is matched against the HTML string;
 *   - `scope: "semantic"` — regex is a no-op (`(?!).*`) and judgment is
 *     deferred to the reviewer LLM.
 *
 * The 8 entries (lap-001..lap-008) are FIXED by the Phase 3 plan and
 * MUST NOT be added to or removed from the JSON without the orchestrator
 * regenerating the plan.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type LayoutAntiPatternScope = "layout" | "semantic";

export type LayoutAntiPattern = {
  readonly id: string;
  readonly regex: string;
  readonly scope: LayoutAntiPatternScope;
};

function isValidLayoutAntiPattern(rule: unknown): rule is LayoutAntiPattern {
  if (typeof rule !== "object" || rule === null) return false;
  const r = rule as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.regex === "string" &&
    (r.scope === "layout" || r.scope === "semantic")
  );
}

function defaultPatternsPath(): string {
  const base = import.meta.url;
  const basePath = base.startsWith("file:") ? fileURLToPath(base) : base;
  const baseDir = path.dirname(basePath);
  // Candidates for each place this module is loaded from. The depth differs
  // per entry point, and a missing candidate is not a loud failure: the
  // caller fails soft, so an unresolvable registry silently drops the
  // unknown-code obligation. `../assets/...` is the one that resolves from
  // `dist/index.mjs` — the `exports["."]` import path a library consumer
  // reaches `validateProject` through. Without it all three candidates
  // missed there, so `qfai-prototyping/SKILL.md`'s unconditional promise
  // that an unknown `lap-*` code fails validate was true only for the `bin`.
  //   src/core/validators/       -> layoutAntiPatterns.json  (dev, colocated)
  //   dist/cli/index.mjs         -> ../../assets/validators/...
  //   dist/index.mjs             -> ../assets/validators/...
  const candidates = [
    path.join(baseDir, "layoutAntiPatterns.json"),
    path.resolve(baseDir, "../../../assets/validators/layoutAntiPatterns.json"),
    path.resolve(baseDir, "../../assets/validators/layoutAntiPatterns.json"),
    path.resolve(baseDir, "../assets/validators/layoutAntiPatterns.json"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- literal array, always has [0]
  return candidates[0]!;
}

/**
 * Load the lap-* registry from `layoutAntiPatterns.json`. Throws if the
 * file is missing or unparseable. Callers that want to fail-soft are
 * expected to wrap this in a try/catch (mirroring the prior loader's
 * contract).
 */
export function loadLayoutAntiPatterns(jsonPath?: string): LayoutAntiPattern[] {
  const target = jsonPath ?? defaultPatternsPath();
  const raw = readFileSync(target, "utf-8");
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];
  const result: LayoutAntiPattern[] = [];
  for (const entry of parsed) {
    if (isValidLayoutAntiPattern(entry)) {
      result.push({ id: entry.id, regex: entry.regex, scope: entry.scope });
    }
  }
  return result;
}

/**
 * Apply layout-scope regexes against `html` and return the matching ids.
 * Semantic-scope entries are skipped because the reviewer LLM judges
 * them — their regex (`(?!).*`) is a deliberate no-op.
 *
 * Each id is reported at most once even when its regex hits multiple
 * times (mirroring the legacy `seenRules` short-circuit in the slop
 * scanner).
 */
export function findLayoutAntiPatterns(
  html: string,
  patterns: ReadonlyArray<LayoutAntiPattern>,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const pattern of patterns) {
    if (pattern.scope !== "layout") continue;
    if (seen.has(pattern.id)) continue;
    let regex: RegExp;
    try {
      regex = new RegExp(pattern.regex, "gi");
    } catch {
      continue;
    }
    if (regex.test(html)) {
      seen.add(pattern.id);
      out.push(pattern.id);
    }
  }
  return out;
}
