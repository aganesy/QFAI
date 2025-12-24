import type { ValidationResult } from "./types.js";
import { validateContracts } from "./validators/contracts.js";
import { validateScenarios } from "./validators/scenario.js";
import { validateSpecs } from "./validators/spec.js";
import { validateTraceability } from "./validators/traceability.js";

export async function validateProject(root: string): Promise<ValidationResult> {
  const issues = [
    ...(await validateSpecs(root)),
    ...(await validateScenarios(root)),
    ...(await validateContracts(root)),
    ...(await validateTraceability(root)),
  ];

  return { issues };
}
