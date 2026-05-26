/**
 * Advisory-failing layout anti-pattern scanners.
 *
 * Two scanners are bundled here, both surface findings that are
 * advisory-failing — they prevent convergence unless overridden by an
 * explicit Reviewer justification:
 *
 *   - lap-009  md5-duplicate-capture — two distinct screens whose
 *              captured PNG bytes share the same md5 digest. Surface
 *              the offender screen ids + the shared md5.
 *   - lap-010  missing-route — SPA hash/path route declared in a UI
 *              contract but not reachable in the captured HTML.
 *              Accepts both `targetUrl#/<route>` and `targetUrl/<route>`
 *              forms.
 *
 * Pure / deterministic. The CLI passes the per-screen capture md5 map
 * (lap-009) or the per-screen captured HTML map (lap-010); the helpers
 * decide whether a finding is emitted.
 */

import { md5Buffer } from "./captureMd5.js";

export type Lap009Finding = {
  readonly code: "lap-009";
  readonly category: "duplicate-capture";
  readonly offenders: readonly string[];
  readonly md5: string;
};

export type Lap010Finding = {
  readonly code: "lap-010";
  readonly category: "missing-route";
  readonly screenId: string;
  readonly route: string;
};

export type AdvisoryFinding = Lap009Finding | Lap010Finding;

/**
 * Compute lap-009 findings from a map of `screenId -> capturedBytes`.
 * For each md5 with ≥ 2 screens, emit one Lap009Finding listing the
 * offender screen ids (sorted alphabetically for determinism).
 */
export function findMd5DuplicateCaptures(
  pngsByScreen: ReadonlyMap<string, Buffer>,
): Lap009Finding[] {
  const md5ToScreens = new Map<string, string[]>();
  for (const [id, bytes] of pngsByScreen.entries()) {
    const digest = md5Buffer(bytes);
    const existing = md5ToScreens.get(digest);
    if (existing) {
      existing.push(id);
    } else {
      md5ToScreens.set(digest, [id]);
    }
  }
  const out: Lap009Finding[] = [];
  // Sort md5 keys for deterministic output ordering.
  const md5Keys = Array.from(md5ToScreens.keys()).sort();
  for (const digest of md5Keys) {
    const screens = md5ToScreens.get(digest);
    if (!screens || screens.length < 2) continue;
    const sortedScreens = [...screens].sort();
    out.push({
      code: "lap-009",
      category: "duplicate-capture",
      offenders: sortedScreens,
      md5: digest,
    });
  }
  return out;
}

/**
 * Decide whether a given declared route is reachable in the captured
 * HTML for a screen. Accepts both `<target>#/<route>` (hash routing)
 * and `<target>/<route>` (path routing) forms.
 *
 * Implementation note: this is a simple literal substring search
 * (`html.includes(candidate)`), NOT an attribute-aware parse. The
 * route is therefore matched anywhere in the document — including
 * inside HTML comments, `<script>` / `<style>` bodies, and free-text
 * nodes. That can produce false-positives (route mentioned in a
 * comment but no actual link), and the reverse — a route reachable
 * via a templated `href` attribute that builds the path at runtime —
 * can produce false-negatives. lap-010 findings are advisory-failing
 * (Reviewer justification overrides), so this trade-off is acceptable
 * for the cost of avoiding a full HTML parser dependency at the
 * advisory layer. If precision becomes a recurring complaint, tighten
 * to a regex that anchors on `(href|to|route)=["']…<route>` and route
 * the looser substring check through a flag.
 */
export function htmlReachesRoute(html: string, route: string): boolean {
  const normalised = route.startsWith("/") ? route : `/${route}`;
  const candidates = [normalised, `#${normalised}`];
  // Accept both `routes/about` and `/routes/about` paths in href/to
  // attributes; the comparison is literal-substring so this is robust
  // against minor markup variations.
  for (const cand of candidates) {
    if (html.includes(cand)) return true;
  }
  return false;
}

/**
 * Compute lap-010 findings: for each (screenId, capturedHtml, declaredRoute)
 * triple where the route is not reachable in the html, emit a finding.
 */
export type Lap010Input = {
  readonly screenId: string;
  readonly route: string;
  readonly html: string;
};

export function findMissingRoutes(inputs: readonly Lap010Input[]): Lap010Finding[] {
  const out: Lap010Finding[] = [];
  for (const { screenId, route, html } of inputs) {
    if (!htmlReachesRoute(html, route)) {
      out.push({
        code: "lap-010",
        category: "missing-route",
        screenId,
        route,
      });
    }
  }
  return out;
}

/**
 * A reviewer override accepts a finding only when accompanied by a
 * non-empty `justification:` text. Used at the CLI boundary to decide
 * whether an advisory-failing finding survives an override request.
 */
export type AdvisoryOverride = {
  readonly findingCode: "lap-009" | "lap-010";
  readonly justification: string;
};

export function isAdvisoryOverrideAccepted(override: AdvisoryOverride | undefined): boolean {
  if (override === undefined) return false;
  return typeof override.justification === "string" && override.justification.trim().length > 0;
}
