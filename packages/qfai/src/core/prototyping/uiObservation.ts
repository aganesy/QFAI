/**
 * UI observation — v1.7.15
 *
 * DOM / browser QA / render evidence-driven observation.
 * No synthetic fallback; insufficient evidence → explicit status.
 */

import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";
import type { UiObservationSummary, BrowserQaSummary } from "../harness/panelInputs.js";
import type { RenderRunnerResult } from "../evidence/types.js";
import type { BrowserQaRunResult } from "../browserQa/types.js";

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

export async function buildUiObservationSummary(
  renderResult?: RenderRunnerResult,
): Promise<UiObservationSummary> {
  const htmlCaptureRefs: string[] = [];
  let allLabels: string[] = [];

  if (renderResult) {
    for (const entry of renderResult.entries) {
      if (entry.status === "captured" && entry.html_path) {
        htmlCaptureRefs.push(entry.html_path);
        const html = await loadCapturedHtml(entry.html_path);
        if (html) {
          const labels = extractDomLabelsWithJsdom(html);
          allLabels.push(...labels);
        }
      }
    }
  }

  allLabels = [...new Set(allLabels)];

  return {
    domLabelsFound: allLabels,
    elementsPlaced: allLabels.length,
    actionsWired: 0, // Will be enriched by browser QA
    htmlCaptureRefs,
  };
}

export function deriveMockPathFindingsFromBrowserQa(
  browserQaResult?: BrowserQaRunResult,
): Array<{ id: string; status: string }> {
  if (!browserQaResult) return [];

  const findings: Array<{ id: string; status: string }> = [];
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
    executed: phasesExecuted.length > 0,
    blockingFindings,
    experienceFindings,
    visualFindings,
    totalFindings: blockingFindings + experienceFindings + visualFindings,
    phasesExecuted,
    evidenceRefs: [...new Set(evidenceRefs)],
  };
}
