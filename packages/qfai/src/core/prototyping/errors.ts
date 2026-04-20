export class CalibrationResolutionError extends Error {
  readonly code = "QFAI_PROT_CALIBRATION_RESOLUTION_FAILED";

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "CalibrationResolutionError";
  }
}

export class UiFidelityEvidenceError extends Error {
  readonly code = "QFAI_PROT_UI_FIDELITY_INSUFFICIENT";

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "UiFidelityEvidenceError";
  }
}

export class SpecCoverageBuildError extends Error {
  readonly code = "QFAI_PROT_SPEC_COVERAGE_BUILD_FAILED";

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "SpecCoverageBuildError";
  }
}

export class L2EvidenceBuildError extends Error {
  readonly code = "QFAI_PROT_L2_EVIDENCE_BUILD_FAILED";

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "L2EvidenceBuildError";
  }
}

export class FullHarnessRuntimeError extends Error {
  readonly code = "QFAI_PROT_FULL_HARNESS_RUNTIME_FAILED";

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "FullHarnessRuntimeError";
  }
}

export class EvidenceWriteError extends Error {
  readonly code = "QFAI_PROT_EVIDENCE_WRITE_FAILED";

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "EvidenceWriteError";
  }
}
