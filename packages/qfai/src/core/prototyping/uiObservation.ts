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
import type { BrowserQaFinding, BrowserQaRunResult } from "../browserQa/types.js";
import type { CanonicalScreenContract } from "./screenContracts.js";
import { buildActionCoverage, type ObservedActionControl } from "./actionCoverage.js";

export async function loadCapturedHtml(htmlPath: string): Promise<string | null> {
  try {
    return await readFile(htmlPath, "utf-8");
  } catch {
    return null;
  }
}

export function extractDomLabelsWithJsdom(html: string): string[] {
  return extractDomObservationWithJsdom(html).labels;
}

export function extractDomObservationWithJsdom(html: string): {
  labels: string[];
  controls: ObservedActionControl[];
} {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const labels: string[] = [];
  const controls: ObservedActionControl[] = [];

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

  const actionableSelectors = [
    "button",
    "a[href]",
    "input[type='button']",
    "input[type='submit']",
    "input[type='reset']",
    "input:not([type])",
    "[role='button']",
    "[data-testid]",
    "[onclick]",
  ];
  for (const el of doc.querySelectorAll(actionableSelectors.join(","))) {
    const text = el.textContent.trim();
    const ariaLabel = el.getAttribute("aria-label")?.trim();
    const id = el.getAttribute("id")?.trim();
    const testId = el.getAttribute("data-testid")?.trim();
    const name = el.getAttribute("name")?.trim();
    const selector = buildSelector(el);
    const interactionTargetResolved = selector.length > 0;
    controls.push({
      ...(text ? { label: text } : {}),
      ...(ariaLabel && !text ? { label: ariaLabel } : {}),
      ...(id ? { id } : testId ? { id: testId } : name ? { id: name } : {}),
      selector,
      interactionTargetResolved,
    });
  }

  return {
    labels: [...new Set(labels)],
    controls,
  };
}

/**
 * Build screen-level UI observation summary from render results and browser QA.
 * v1.7.15: each screen gets its own observation, not a flattened aggregate.
 */
export async function buildUiObservationSummary(
  renderResult?: RenderRunnerResult,
  browserQaResult?: BrowserQaRunResult,
  screenContracts: Array<CanonicalScreenContract & { actionIds?: string[] }> = [],
): Promise<UiObservationSummary> {
  const screens: ScreenObservation[] = [];
  const evidenceRefs: string[] = [];
  const browserQaByScreen = new Map<string, { refs: Set<string>; findings: BrowserQaFinding[] }>();
  const contractByRoute = new Map(screenContracts.map((screen) => [screen.route, screen]));
  const contractById = new Map(screenContracts.map((screen) => [screen.screenId, screen]));

  if (browserQaResult) {
    for (const phase of browserQaResult.phases) {
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
          findings: [],
        };
        for (const ref of phase.evidence_refs) {
          existing.refs.add(ref);
        }
        for (const ref of finding.evidence_refs) {
          existing.refs.add(ref);
        }
        existing.findings.push(finding);
        browserQaByScreen.set(key, existing);
      }
      // Phase-level fallback: when a phase executed successfully but produced
      // no findings, its evidence_refs would otherwise be dropped. Keep those
      // refs scoped to the originating screen/route emitted by
      // runBrowserQaPerScreen so unrelated screens stay unobserved.
      const phaseExecuted = phase.status === "executed" || phase.status === "passed";
      if (phaseExecuted && phase.findings.length === 0 && phase.evidence_refs.length > 0) {
        const contract = screenContracts.find(
          (entry) =>
            entry.screenId === phase.screen_id ||
            (phase.route !== undefined && entry.route === phase.route),
        );
        if (contract) {
          const key = contract.screenId;
          const existing = browserQaByScreen.get(key) ?? {
            refs: new Set<string>(),
            findings: [],
          };
          for (const ref of phase.evidence_refs) {
            existing.refs.add(ref);
          }
          browserQaByScreen.set(key, existing);
        }
      }
    }
  }

  if (renderResult) {
    for (const entry of renderResult.entries) {
      if (entry.status === "captured" && entry.html_path) {
        evidenceRefs.push(entry.html_path);
        const html = await loadCapturedHtml(entry.html_path);
        const domObservation = html
          ? extractDomObservationWithJsdom(html)
          : { labels: [], controls: [] as ObservedActionControl[] };
        const domLabels = domObservation.labels;
        const contract = contractByRoute.get(entry.target) ?? contractById.get(entry.target);
        const screenId = contract?.screenId ?? entry.target;
        const screenRoute = contract?.route ?? entry.target;
        const screenQa = browserQaByScreen.get(screenId) ??
          browserQaByScreen.get(screenRoute) ?? {
            refs: new Set<string>(),
            findings: [],
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
        const browserQaEvidenceRefs = [...new Set([...screenQa.refs])];
        const actionCoverage = buildActionCoverage({
          actionIds: contract?.actionIds ?? [],
          controls: domObservation.controls,
          browserQaFindings: screenQa.findings,
        });
        const evidenceMissing = browserQaEvidenceRefs.length === 0;

        screens.push({
          screenId,
          route: screenRoute,
          htmlCaptureRef: entry.html_path,
          domLabelsFound: domLabels,
          elementsPlaced: domLabels.length,
          actionsDeclared: actionCoverage.actionsDeclared,
          actionsObserved: actionCoverage.actionsObserved,
          actionsWired: actionCoverage.actionsWired,
          missingActions: actionCoverage.missingActions,
          mockPathFindings,
          browserQaEvidenceRefs,
          browserQaObserved: browserQaEvidenceRefs.length > 0,
          evidenceMissing,
        });
      }
    }
  }

  return { screens, evidenceRefs: [...new Set(evidenceRefs)] };
}

function buildSelector(element: Element): string {
  const id = element.getAttribute("id")?.trim();
  if (id) {
    return `${element.tagName.toLowerCase()}#${id}`;
  }
  const testId = element.getAttribute("data-testid")?.trim();
  if (testId) {
    return `${element.tagName.toLowerCase()}[data-testid="${testId}"]`;
  }
  const name = element.getAttribute("name")?.trim();
  if (name) {
    return `${element.tagName.toLowerCase()}[name="${name}"]`;
  }
  const ariaLabel = element.getAttribute("aria-label")?.trim();
  if (ariaLabel) {
    return `${element.tagName.toLowerCase()}[aria-label="${ariaLabel}"]`;
  }
  const text = element.textContent.trim();
  if (text) {
    return `${element.tagName.toLowerCase()}[text="${text.slice(0, 80)}"]`;
  }
  return element.tagName.toLowerCase();
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
