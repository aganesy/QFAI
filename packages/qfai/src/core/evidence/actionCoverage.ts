import type { BrowserQaFinding } from "../browserQa/types.js";

export type ObservedActionControl = {
  label?: string;
  id?: string;
  selector: string;
  interactionTargetResolved: boolean;
};

export type ActionCoverageResult = {
  actionsDeclared: number;
  actionsObserved: number;
  actionsWired: number;
  missingActions: string[];
};

export function buildActionCoverage(input: {
  actionIds: string[];
  controls: ObservedActionControl[];
  browserQaFindings: BrowserQaFinding[];
}): ActionCoverageResult {
  const declared = dedupe(input.actionIds);
  const controls = input.controls.map((control) => {
    const normalized: ObservedActionControl = {
      selector: control.selector.trim(),
      interactionTargetResolved: control.interactionTargetResolved,
    };
    if (typeof control.label === "string" && control.label.trim().length > 0) {
      normalized.label = control.label.trim();
    }
    if (typeof control.id === "string" && control.id.trim().length > 0) {
      normalized.id = control.id.trim();
    }
    return normalized;
  });
  const blockingFindings = input.browserQaFindings.filter(
    (finding) => finding.severity === "error",
  );

  let actionsObserved = 0;
  let actionsWired = 0;
  const missingActions: string[] = [];

  for (const actionId of declared) {
    const tokens = tokenize(actionId);
    const matchingControls = controls.filter((control) => matchesActionControl(control, tokens));
    if (matchingControls.length === 0) {
      missingActions.push(actionId);
      continue;
    }
    actionsObserved += 1;
    const hasInteractionTarget = matchingControls.some(
      (control) => control.interactionTargetResolved,
    );
    const blocked = blockingFindings.some((finding) => matchesFindingToAction(finding, tokens));
    if (hasInteractionTarget && !blocked) {
      actionsWired += 1;
    }
  }

  return {
    actionsDeclared: declared.length,
    actionsObserved,
    actionsWired,
    missingActions,
  };
}

function dedupe(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))];
}

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ");
}

function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length > 1);
}

function matchesActionControl(control: ObservedActionControl, tokens: string[]): boolean {
  const haystack = normalizeText(
    [control.label, control.id, control.selector].filter(Boolean).join(" "),
  );
  return matchesTokens(haystack, tokens);
}

function matchesFindingToAction(finding: BrowserQaFinding, tokens: string[]): boolean {
  const haystack = normalizeText(
    [
      finding.selector,
      finding.summary,
      finding.detail,
      finding.message,
      finding.repair_hint,
      finding.screen_id,
      finding.route,
    ]
      .filter((value): value is string => typeof value === "string")
      .join(" "),
  );
  return matchesTokens(haystack, tokens);
}

function matchesTokens(haystack: string, tokens: string[]): boolean {
  if (tokens.length === 0) {
    return false;
  }
  return tokens.every((token) => haystack.includes(token));
}
