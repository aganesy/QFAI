import type { BrowserQaRunResult } from "../browserQa/types.js";
import type { RenderRunnerResult } from "../evidence/types.js";

import type { CanonicalScreenContract } from "./screenContracts.js";

export type ObservedUiRoute = {
  screenId: string;
  route: string;
  declaredRef: string;
  url?: string;
  rendered: boolean;
  browserVisited: boolean;
  httpStatus?: number;
  renderEvidenceRefs: string[];
  browserQaEvidenceRefs: string[];
};

export type RuntimeObservation = {
  ui: ObservedUiRoute[];
};

export function buildRuntimeObservation(input: {
  screenContracts: CanonicalScreenContract[];
  renderResult?: RenderRunnerResult;
  browserQaResult?: BrowserQaRunResult;
  targetUrl?: string;
}): RuntimeObservation {
  const renderByRoute = new Map<string, Set<string>>();
  const browserByRoute = new Map<string, Set<string>>();
  const browserByScreenId = new Map<string, Set<string>>();

  for (const entry of input.renderResult?.entries ?? []) {
    if (entry.status !== "captured") {
      continue;
    }
    const route = entry.target;
    const refs = renderByRoute.get(route) ?? new Set<string>();
    if (entry.screenshot_path) {
      refs.add(entry.screenshot_path);
    }
    if (entry.html_path) {
      refs.add(entry.html_path);
    }
    renderByRoute.set(route, refs);
  }

  for (const phase of input.browserQaResult?.phases ?? []) {
    const phaseRefs = new Set<string>(phase.evidence_refs);
    for (const finding of phase.findings) {
      for (const ref of finding.evidence_refs) {
        phaseRefs.add(ref);
      }
      if (finding.route) {
        const refs = browserByRoute.get(finding.route) ?? new Set<string>();
        for (const ref of phaseRefs) {
          refs.add(ref);
        }
        browserByRoute.set(finding.route, refs);
      }
      if (finding.screen_id) {
        const refs = browserByScreenId.get(finding.screen_id) ?? new Set<string>();
        for (const ref of phaseRefs) {
          refs.add(ref);
        }
        browserByScreenId.set(finding.screen_id, refs);
      }
    }
    // Phase-level fallback: when Browser QA finishes a phase with no findings
    // (e.g. Playwright smoke passed cleanly), `phase.evidence_refs` would
    // otherwise never reach the per-screen maps. Attach them to every known
    // screen contract so `assertRuntimeGateLeafRefs` still sees the observation.
    const phaseExecuted = phase.status === "executed" || phase.status === "passed";
    if (phaseExecuted && phase.findings.length === 0 && phase.evidence_refs.length > 0) {
      for (const screen of input.screenContracts) {
        const byScreen = browserByScreenId.get(screen.screenId) ?? new Set<string>();
        for (const ref of phaseRefs) {
          byScreen.add(ref);
        }
        browserByScreenId.set(screen.screenId, byScreen);
        const byRoute = browserByRoute.get(screen.route) ?? new Set<string>();
        for (const ref of phaseRefs) {
          byRoute.add(ref);
        }
        browserByRoute.set(screen.route, byRoute);
      }
    }
  }

  const ui = input.screenContracts
    .map<ObservedUiRoute | null>((screen) => {
      const renderEvidenceRefs = [...(renderByRoute.get(screen.route) ?? new Set<string>())];
      const browserQaEvidenceRefs = [
        ...new Set([
          ...(browserByRoute.get(screen.route) ?? new Set<string>()),
          ...(browserByScreenId.get(screen.screenId) ?? new Set<string>()),
        ]),
      ];
      const rendered = renderEvidenceRefs.length > 0;
      const browserVisited = browserQaEvidenceRefs.length > 0;
      if (!rendered && !browserVisited) {
        return null;
      }
      return {
        screenId: screen.screenId,
        route: screen.route,
        declaredRef: screen.sourceRef,
        ...(input.targetUrl
          ? { url: new URL(screen.route, ensureTrailingSlash(input.targetUrl)).toString() }
          : {}),
        rendered,
        browserVisited,
        renderEvidenceRefs,
        browserQaEvidenceRefs,
      };
    })
    .filter((entry): entry is ObservedUiRoute => entry !== null);

  return { ui };
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}
