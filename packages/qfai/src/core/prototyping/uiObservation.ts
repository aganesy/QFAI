/**
 * UI observation — v1.7.15
 *
 * DOM / browser QA / render evidence-driven observation.
 * v1.7.15: screen-level observation, no synthetic fallback.
 * Insufficient evidence → explicit status.
 */

import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";
import type {
  UiObservationSummary,
  BrowserQaSummary,
  ScreenObservation,
} from "../harness/panelInputs.js";
import type { RenderRunnerResult } from "../evidence/types.js";
import type { BrowserQaRunResult } from "../browserQa/types.js";
import type { CanonicalScreenContract } from "./screenContracts.js";

export async function loadCapturedHtml(htmlPath: string): Promise<string | null> {
  try {
    return await readFile(htmlPath, "utf-8");
  } catch {
    return null;
  }
}

export function extractDomLabelsWithJsdom(html: string): string[] {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const labels: string[] = [];

  // Extract text from labels, buttons, headings, links, aria-labels
  const selectors = [
    "label",
    "button",
    "a",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "[aria-label]",
    "[placeholder]",
    "[title]",
  ];

  for (const selector of selectors) {
    const elements = doc.querySelectorAll(selector);
    for (const el of elements) {
      const ariaLabel = el.getAttribute("aria-label");
      if (ariaLabel?.trim()) {
        labels.push(ariaLabel.trim());
        continue;
      }
      const placeholder = el.getAttribute("placeholder");
      if (placeholder?.trim()) {
        labels.push(placeholder.trim());
        continue;
      }
      const title = el.getAttribute("title");
      if (title?.trim()) {
        labels.push(title.trim());
        continue;
      }
      const text = el.textContent.trim();
      if (text && text.length > 0 && text.length < 200) {
        labels.push(text);
      }
    }
  }

  return [...new Set(labels)];
}

/**
 * Build screen-level UI observation summary from render results and browser QA.
 * v1.7.15: each screen gets its own observation, not a flattened aggregate.
 */
export async function buildUiObservationSummary(
  renderResult?: RenderRunnerResult,
  browserQaResult?: BrowserQaRunResult,
  screenContracts: CanonicalScreenContract[] = [],
): Promise<UiObservationSummary> {
  const screens: ScreenObservation[] = [];
  const evidenceRefs: string[] = [];
  const browserQaByScreen = new Map<string, { refs: Set<string>; actions: number }>();
  const phaseLevelRefs = new Set<string>();
  const contractByRoute = new Map(screenContracts.map((screen) => [screen.route, screen]));
  const contractById = new Map(screenContracts.map((screen) => [screen.screenId, screen]));

  if (browserQaResult) {
    for (const phase of browserQaResult.phases) {
      for (const ref of phase.evidence_refs) {
        phaseLevelRefs.add(ref);
      }
      for (const finding of phase.findings) {
        const contract =
          (finding.route ? contractByRoute.get(finding.route) : undefined) ??
          (finding.screen_id ? contractById.get(finding.screen_id) : undefined);
        const key = contract?.screenId ?? finding.screen_id ?? finding.route ?? "";
        if (!key || !(contract || finding.screen_id || finding.route)) {
          continue;
        }
        const existing = browserQaByScreen.get(key) ?? {
          refs: new Set<string>(),
          actions: 0,
        };
        existing.actions += 1;
        for (const ref of phase.evidence_refs) {
          existing.refs.add(ref);
        }
        for (const ref of finding.evidence_refs) {
          existing.refs.add(ref);
        }
        browserQaByScreen.set(key, existing);
      }
    }
  }

  if (renderResult) {
    for (const entry of renderResult.entries) {
      if (entry.status === "captured" && entry.html_path) {
        evidenceRefs.push(entry.html_path);
        const html = await loadCapturedHtml(entry.html_path);
        const domLabels = html ? extractDomLabelsWithJsdom(html) : [];
        const contract = contractByRoute.get(entry.target) ?? contractById.get(entry.target);
        const screenId = contract?.screenId ?? entry.target;
        const screenRoute = contract?.route ?? entry.target;
        const screenQa = browserQaByScreen.get(screenId) ??
          browserQaByScreen.get(screenRoute) ?? {
            refs: new Set<string>(),
            actions: 0,
          };
        const mockPathFindings: ScreenObservation["mockPathFindings"] = [];
        if (browserQaResult) {
          for (const phase of browserQaResult.phases) {
            for (const finding of phase.findings) {
              const findingContract =
                (finding.route ? contractByRoute.get(finding.route) : undefined) ??
                (finding.screen_id ? contractById.get(finding.screen_id) : undefined);
              const matchesRoute =
                finding.route === screenRoute ||
                finding.screen_id === screenId ||
                findingContract?.screenId === screenId ||
                findingContract?.route === screenRoute;
              if (!matchesRoute) {
                continue;
              }
              mockPathFindings.push({
                id:
                  finding.screen_id ??
                  findingContract?.screenId ??
                  `${phase.phase}-${finding.route ?? "unknown"}`,
                status: finding.severity === "error" ? "fail" : "finding",
              });
            }
          }
        }
        const browserQaEvidenceRefs = [
          ...new Set([
            ...screenQa.refs,
            ...(screenQa.refs.size === 0 ? Array.from(phaseLevelRefs) : []),
          ]),
        ];

        screens.push({
          screenId,
          route: screenRoute,
          htmlCaptureRef: entry.html_path,
          domLabelsFound: domLabels,
          elementsPlaced: domLabels.length,
          actionsWired: screenQa.actions,
          mockPathFindings,
          browserQaEvidenceRefs,
          browserQaObserved: browserQaEvidenceRefs.length > 0 || mockPathFindings.length > 0,
        });
      }
    }
  }

  return { screens, evidenceRefs: [...new Set(evidenceRefs)] };
}

export function deriveMockPathFindingsFromBrowserQa(
  browserQaResult?: BrowserQaRunResult,
): Array<{ id: string; status: "fail" | "finding" }> {
  if (!browserQaResult) return [];

  const findings: Array<{ id: string; status: "fail" | "finding" }> = [];
  for (const phase of browserQaResult.phases) {
    for (const finding of phase.findings) {
      findings.push({
        id: finding.screen_id ?? `${phase.phase}-finding`,
        status: finding.severity === "error" ? "fail" : "finding",
      });
    }
  }

  return findings;
}

export function buildBrowserQaSummaryFromResult(
  browserQaResult?: BrowserQaRunResult,
): BrowserQaSummary {
  if (!browserQaResult) {
    return {
      executed: false,
      blockingFindings: 0,
      experienceFindings: 0,
      visualFindings: 0,
      totalFindings: 0,
      phasesExecuted: [],
      evidenceRefs: [],
    };
  }

  let blockingFindings = 0;
  let experienceFindings = 0;
  let visualFindings = 0;
  const phasesExecuted: string[] = [];
  const evidenceRefs: string[] = [];

  for (const phase of browserQaResult.phases) {
    if (phase.status === "executed" || phase.status === "passed") {
      phasesExecuted.push(phase.phase);
    }
    evidenceRefs.push(...phase.evidence_refs);
    for (const finding of phase.findings) {
      if (finding.severity === "error") {
        blockingFindings++;
      } else if (phase.phase === "visual") {
        visualFindings++;
      } else {
        experienceFindings++;
      }
      evidenceRefs.push(...finding.evidence_refs);
    }
  }

  return {
    executed: phasesExecuted.length > 0 || evidenceRefs.length > 0,
    blockingFindings,
    experienceFindings,
    visualFindings,
    totalFindings: blockingFindings + experienceFindings + visualFindings,
    phasesExecuted,
    evidenceRefs: [...new Set(evidenceRefs)],
  };
}
