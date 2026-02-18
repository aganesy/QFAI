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
import { validateDiscussMermaid } from "./validators/discussMermaid.js";
import { validateAssistantAssets } from "./validators/assistantAssets.js";
import { validateSkillsIntegrity } from "./validators/skillsIntegrity.js";
import { validateDefinedIds } from "./validators/ids.js";
import { validateReviewArtifacts } from "./validators/reviewArtifacts.js";
import { validateSpecPacks } from "./validators/specPack.js";
import { validateTraceability } from "./validators/traceability.js";
import {
  validateDensityHints,
  validateLayerCoverage,
  validateLayeredTraceability,
  validateMermaidEnforcement,
  validateOrphanProhibition,
  validateRequirePackReadiness,
  validateSpecSplitByCapability,
  validateStatusInSpecs,
} from "./validators/index.js";

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
    ...(await validateDiscussMermaid(root)),
    ...(await validateMermaidEnforcement(root)),
    ...(await validateSpecPacks(root, config)),
    ...(await validateRequirePackReadiness(root, config)),
    ...(await validateStatusInSpecs(root, config)),
    ...(await validateDensityHints(root, config)),
    ...(await validateReviewArtifacts(root)),
    ...(await validateSpecSplitByCapability(root, config)),
    ...(await validateLayeredTraceability(root, config)),
    ...(await validateOrphanProhibition(root, config)),
    ...(await validateLayerCoverage(root, config)),
    ...(await validateTraceability(root, config, phase)),
    ...(await validateDefinedIds(root, config)),
    ...(await validateContracts(root, config)),
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
