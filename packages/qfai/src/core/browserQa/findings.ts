import type { BrowserQaFinding, BrowserQaInput, BrowserQaPhase } from "./types.js";

function resolveScreenId(input: BrowserQaInput, fallbackRoute?: string): string | undefined {
  if (!input.screenContracts?.length) {
    return undefined;
  }
  const route = fallbackRoute ?? input.routes?.[0];
  if (!route) {
    return undefined;
  }
  return input.screenContracts.find((contract) => contract.route === route)?.screen_id;
}

export function createBrowserQaFinding(
  input: BrowserQaInput,
  config: {
    phase: BrowserQaPhase;
    severity: BrowserQaFinding["severity"];
    summary: string;
    detail: string;
    selector?: string;
    evidenceRefs: string[];
    repairSuggestions: string[];
    route?: string;
  },
): BrowserQaFinding {
  const screenId = resolveScreenId(input, config.route);
  return {
    phase: config.phase,
    severity: config.severity,
    summary: config.summary,
    detail: config.detail,
    ...(screenId ? { screen_id: screenId } : {}),
    ...(config.selector ? { selector: config.selector } : {}),
    evidence_refs: config.evidenceRefs,
    repair_suggestions: config.repairSuggestions,
    category: config.phase,
    message: config.summary,
    ...(config.route ? { route: config.route } : {}),
    ...(config.repairSuggestions[0] ? { repair_hint: config.repairSuggestions[0] } : {}),
  };
}
