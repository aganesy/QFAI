/**
 * Layout anti-pattern registry.
 *
 * Patterns are applied to iteration HTML, not to discussion-pack markdown.
 * Each entry is either:
 *
 *   - `scope: "layout"` — the regex is matched against the HTML string;
 *   - `scope: "semantic"` — the regex is a no-op (`(?!).*`) and the
 *     judgement is left to the reviewer.
 *
 * An entry describes a defect, not a shape. A layout being common is not
 * evidence of anything, and a detection blocks convergence, so an entry
 * that reports a familiar shape stops an ordinary product finishing the
 * loop.
 *
 * The registry is data, and every entry names what makes it a defect. The
 * authority is a published heuristic, an accessibility criterion, or the
 * project's own declared contract — never this repository deciding it
 * dislikes something. Searching for a catalogue of bad layouts finds none,
 * because common layouts are not defects; what is catalogued is
 * accessibility failures, deceptive patterns and heuristic violations.
 *
 * Definitions are pinned rather than researched per run: `certify` re-scans
 * the captures, so a check whose answer depends on what a search returned
 * that morning cannot agree with itself.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type LayoutAntiPatternScope = "layout" | "semantic";

export type LayoutAntiPattern = {
  readonly id: string;
  readonly regex: string;
  readonly scope: LayoutAntiPatternScope;
  /**
   * What makes this a defect, in one line, naming something other than this
   * repository's opinion: a published heuristic, an accessibility criterion,
   * or the project's own declared contract.
   *
   * An entry with none is dropped at load. That is the whole guard against
   * the registry filling up with shapes somebody disliked — a rule with no
   * authority behind it cannot be argued with, only obeyed.
   */
  readonly source: string;
};

function isValidLayoutAntiPattern(rule: unknown): rule is LayoutAntiPattern {
  if (typeof rule !== "object" || rule === null) return false;
  const r = rule as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.regex === "string" &&
    (r.scope === "layout" || r.scope === "semantic") &&
    typeof r.source === "string" &&
    r.source.trim().length > 0
  );
}

/**
 * `assets/validators/layoutAntiPatterns.json` candidates for a module sitting
 * at `baseDir`.
 *
 * One registry file, three depths, because this module is loaded from three
 * places and each sits a different distance below the package root:
 *
 * | Loaded from          | Depth below the package root |
 * | -------------------- | ---------------------------- |
 * | `src/core/validators/` | three                      |
 * | `dist/cli/index.mjs`   | two                        |
 * | `dist/index.mjs`       | one                        |
 *
 * `dist/index.mjs` is the `exports["."]` path a library consumer reaches
 * `validateProject` through, and it is one level up rather than two. Without
 * its candidate the registry resolved only for the `bin`, and the promise that
 * an unknown `lap-*` code fails validate held only there — a missing candidate
 * is not a loud failure, because the caller fails soft and an unresolvable
 * registry silently drops the obligation.
 *
 * Exported for the test that pins those depths; `loadLayoutAntiPatterns` is
 * the API.
 */
export function layoutAntiPatternsCandidates(baseDir: string): string[] {
  return [
    path.resolve(baseDir, "../../../assets/validators/layoutAntiPatterns.json"),
    path.resolve(baseDir, "../../assets/validators/layoutAntiPatterns.json"),
    path.resolve(baseDir, "../assets/validators/layoutAntiPatterns.json"),
  ];
}

function defaultPatternsPath(): string {
  const base = import.meta.url;
  const basePath = base.startsWith("file:") ? fileURLToPath(base) : base;
  const baseDir = path.dirname(basePath);
  const candidates = layoutAntiPatternsCandidates(baseDir);
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
      result.push({
        id: entry.id,
        regex: entry.regex,
        scope: entry.scope,
        source: entry.source,
      });
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
