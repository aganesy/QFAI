/**
 * Panel scoring input DTO — v1.7.15
 *
 * Separates evidence collection from scoring logic.
 * Every field is required; missing evidence is a MeasurementError.
 */

export type RuntimeGateEvidence = {
  uiRoutes: Array<{ route: string; status: number }>;
  apiEndpoints: Array<{ method: string; path: string; status: number }>;
};

export type RenderEvidenceSummary = {
  totalScreens: number;
  capturedScreens: number;
  failedScreens: number;
  viewports: string[];
  evidenceRefs: string[];
};

export type BrowserQaSummary = {
  executed: boolean;
  blockingFindings: number;
  experienceFindings: number;
  visualFindings: number;
  totalFindings: number;
  phasesExecuted: string[];
  evidenceRefs: string[];
};

export type UiObservationSummary = {
  domLabelsFound: string[];
  elementsPlaced: number;
  actionsWired: number;
  htmlCaptureRefs: string[];
};

export type SpecCoverageSummary = {
  declared: {
    uiRoutes: number;
    apiEndpoints: number;
    dbObjects: number;
  };
  checked: {
    uiOk: number;
    apiNon404: number;
    dbPresent: number;
  };
  missing: {
    uiRoutes: string[];
    apiEndpoints: string[];
    dbObjects: string[];
  };
  evidenceRefs: string[];
};

export type DiscussionAxisInputs = {
  invariantAxes: number;
  trendDerivedAxes: number;
  productSpecificAxes: number;
  aggregateScore: number;
  evidenceRefs: string[];
};

export type ScreenContractInputs = {
  totalContracts: number;
  coveredContracts: number;
  fidelityScore: number;
  evidenceRefs: string[];
};

export type TrendAlignmentInputs = {
  trendSourcesChecked: number;
  translationConsistency: number;
  competitiveGapsCovered: number;
  evidenceRefs: string[];
};

export type FullHarnessPanelInputs = {
  runtimeGate: RuntimeGateEvidence;
  renderEvidence: RenderEvidenceSummary;
  browserQa: BrowserQaSummary;
  uiObservation: UiObservationSummary;
  specCoverage: SpecCoverageSummary;
  discussionAxes: DiscussionAxisInputs;
  screenContract: ScreenContractInputs;
  trendAlignment: TrendAlignmentInputs;
};

export class MeasurementError extends Error {
  constructor(
    message: string,
    public readonly missingEvidence: string[],
  ) {
    super(message);
    this.name = "MeasurementError";
  }
}

export function validatePanelInputs(inputs: FullHarnessPanelInputs): void {
  const missing: string[] = [];

  if (inputs.renderEvidence.totalScreens === 0) {
    missing.push("renderEvidence.screens (no screens captured)");
  }
  if (!inputs.browserQa.executed) {
    missing.push("browserQa (not executed)");
  }
  if (inputs.specCoverage.evidenceRefs.length === 0) {
    missing.push("specCoverage.evidenceRefs (empty)");
  }

  if (missing.length > 0) {
    throw new MeasurementError(
      `Full-harness measurement requires complete evidence. Missing: ${missing.join(", ")}`,
      missing,
    );
  }
}
