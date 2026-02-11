import { loadConfig, resolvePath, type ConfigLoadResult } from "./config.js";
import { collectScenarioFiles } from "./discovery.js";
import {
  buildScCoverage,
  collectScIdsFromScenarioFiles,
  collectScTestReferences,
} from "./traceability.js";
import type {
  Issue,
  ValidationCounts,
  ValidationPhase,
  ValidationResult,
} from "./types.js";
import { resolveToolVersion } from "./version.js";
import { applyWaivers } from "./waivers.js";
import { validateContracts } from "./validators/contracts.js";
import { validateCaseCatalogues } from "./validators/caseCatalogue.js";
import { validateDeltas } from "./validators/delta.js";
import { validateDiscussMermaid } from "./validators/discussMermaid.js";
import { validateDefinedIds } from "./validators/ids.js";
import { validatePlans } from "./validators/plan.js";
import { validateRequirementsContext } from "./validators/requirementsContext.js";
import { validateAssistantAssets } from "./validators/assistantAssets.js";
import { validateScenarios } from "./validators/scenario.js";
import { validateSkillsIntegrity } from "./validators/skillsIntegrity.js";
import { validateSpecs } from "./validators/spec.js";
import { validateAtddCoverageLedgers } from "./validators/atddLedger.js";
import { validateTraceability } from "./validators/traceability.js";
import { validateTraceabilityMatrices } from "./validators/traceabilityMatrix.js";

export type ValidationOptions = {
  phase?: ValidationPhase;
};

export async function validateProject(
  root: string,
  configResult?: ConfigLoadResult,
  options: ValidationOptions = {},
): Promise<ValidationResult> {
  const resolved = configResult ?? (await loadConfig(root));
  const { config, issues: configIssues } = resolved;
  const phase: ValidationPhase = options.phase ?? "full";
  const findings = [
    ...configIssues,
    ...(await validateSkillsIntegrity(root, config)),
    ...(await validateAssistantAssets(root, config)),
    ...(await validateRequirementsContext(root, config)),
    ...(await validateDiscussMermaid(root)),
    ...(await validateSpecs(root, config)),
    ...(await validateDeltas(root, config)),
    ...(await validateScenarios(root, config)),
    ...(phase === "refinement" ? [] : await validatePlans(root, config)),
    ...(phase === "atdd"
      ? await validateAtddCoverageLedgers(root, config)
      : []),
    ...(await validateCaseCatalogues(root, config)),
    ...(await validateContracts(root, config)),
    ...(await validateTraceabilityMatrices(root, config, phase)),
    ...(await validateDefinedIds(root, config)),
    ...(await validateTraceability(root, config, phase)),
  ];
  const { issues, waivers } = await applyWaivers(root, findings);

  const specsRoot = resolvePath(root, config, "specsDir");
  const scenarioFiles = await collectScenarioFiles(specsRoot);
  const scIds = await collectScIdsFromScenarioFiles(scenarioFiles);
  const { refs: scTestRefs, scan: testFiles } = await collectScTestReferences(
    root,
    config.validation.traceability.testFileGlobs,
    config.validation.traceability.testFileExcludeGlobs,
  );
  const scCoverage = buildScCoverage(scIds, scTestRefs);

  const toolVersion = await resolveToolVersion();
  return {
    toolVersion,
    phase,
    issues,
    counts: countIssues(issues),
    traceability: {
      sc: scCoverage,
      testFiles,
    },
    waivers,
  };
}

function countIssues(issues: Issue[]): ValidationCounts {
  return issues.reduce<ValidationCounts>(
    (acc, issue) => {
      if (issue.suppressed) {
        return acc;
      }
      acc[issue.severity] += 1;
      return acc;
    },
    { info: 0, warning: 0, error: 0 },
  );
}
