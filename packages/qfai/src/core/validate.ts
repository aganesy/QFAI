import { loadConfig, resolvePath, type ConfigLoadResult } from "./config.js";
import { collectScenarioFiles } from "./discovery.js";
import {
  buildScCoverage,
  collectScIdsFromScenarioFiles,
  collectScTestReferences,
} from "./traceability.js";
import type { Issue, ValidationCounts, ValidationPhase, ValidationResult } from "./types.js";
import { resolveToolVersion } from "./version.js";
import { applyWaivers } from "./waivers.js";
import { validateContracts } from "./validators/contracts.js";
import { validateDiscussionMermaid } from "./validators/discussMermaid.js";
import { validateAssistantAssets } from "./validators/assistantAssets.js";
import { validateSkillsIntegrity } from "./validators/skillsIntegrity.js";
import { validateDefinedIds } from "./validators/ids.js";
import { validateReviewArtifacts } from "./validators/reviewArtifacts.js";
import { validateSpecPacks } from "./validators/specPack.js";
import { validateTraceability } from "./validators/traceability.js";
import { validateAtddCodeTraceability } from "./validators/atddCodeTraceability.js";
import {
  validateContractReferences,
  validateDiscussionPackReadiness,
  validateDiscussionVisuals,
  validateDensityHints,
  validateLegacyStatusDir,
  validateLayerCoverage,
  validateLayeredTraceability,
  validateMermaidEnforcement,
  validateOrphanProhibition,
  validatePrototypingEvidence,
  validateRepositoryHygiene,
  validateSpecSplitByCapability,
  validateStatusInSpecs,
} from "./validators/index.js";
import { validateDesignToken } from "./validators/designToken.js";
import { validateHtmlMock } from "./validators/htmlMock.js";
import { validateMermaidScreenFlow } from "./validators/mermaidScreenFlow.js";
import { validateBpApDb } from "./validators/bpApDb.js";
import { detectPlatform } from "./validators/platformDetection.js";
import { validateUiDefinitionConsistency } from "./validators/uiDefinitionConsistency.js";
import { validateResearchSummary } from "./validators/researchSummary.js";
import { validateAgentDefinition } from "./validators/agentDefinition.js";

export type ValidationOptions = {
  phase?: ValidationPhase;
  platform?: string;
};

export async function validateProject(
  root: string,
  configResult?: ConfigLoadResult,
  options: ValidationOptions = {},
): Promise<ValidationResult> {
  const resolved = configResult ?? (await loadConfig(root));
  const { config, issues: configIssues } = resolved;
  const phase: ValidationPhase = options.phase ?? "full";
  const atddCodeTraceabilityIssues =
    phase === "refinement" ? [] : await validateAtddCodeTraceability(root, config);

  // Detect platform for UI/UX validators
  const platformResult = await detectPlatform(root, config, options.platform);
  const platform = platformResult.platform;

  // UI/UX validators with performance budget
  const uiuxBudgetMs = 2000;
  const uiuxStart = performance.now();
  const uiuxIssues: Issue[] = [...platformResult.issues];
  const uiuxValidators: Array<{ name: string; run: () => Promise<Issue[]> }> = [
    { name: "designToken", run: () => validateDesignToken(root, config) },
    { name: "htmlMock", run: () => validateHtmlMock(root, platform, config) },
    { name: "mermaidScreenFlow", run: () => validateMermaidScreenFlow(root, config) },
    { name: "bpApDb", run: () => validateBpApDb(root, config) },
    { name: "uiDefinitionConsistency", run: () => validateUiDefinitionConsistency(root, config) },
    { name: "researchSummary", run: () => validateResearchSummary(root, config) },
    { name: "agentDefinition", run: () => validateAgentDefinition(root, config) },
  ];
  for (const validator of uiuxValidators) {
    uiuxIssues.push(...(await validator.run()));
  }

  const uiuxElapsed = performance.now() - uiuxStart;
  if (uiuxElapsed > uiuxBudgetMs) {
    uiuxIssues.push({
      code: "QFAI-UIUX-PERF",
      severity: "warning",
      category: "compatibility",
      message: `UI/UX validation exceeded budget (${uiuxBudgetMs}ms). All validators were executed.`,
      rule: "uiux.performanceBudget",
    });
  }

  const findings = [
    ...configIssues,
    ...(await validateRepositoryHygiene(root, config)),
    ...(await validateSkillsIntegrity(root, config)),
    ...(await validateAssistantAssets(root, config)),
    ...(await validateDiscussionMermaid(root)),
    ...(await validateMermaidEnforcement(root)),
    ...(await validateSpecPacks(root, config)),
    ...(await validateDiscussionPackReadiness(root, config)),
    ...(await validateDiscussionVisuals(root)),
    ...(await validateLegacyStatusDir(root)),
    ...(await validateStatusInSpecs(root, config)),
    ...(await validateDensityHints(root, config)),
    ...(await validateReviewArtifacts(root)),
    ...(await validatePrototypingEvidence(root, config)),
    ...(await validateSpecSplitByCapability(root, config)),
    ...(await validateLayeredTraceability(root, config)),
    ...(await validateOrphanProhibition(root, config)),
    ...(await validateLayerCoverage(root, config)),
    ...atddCodeTraceabilityIssues,
    ...(await validateContractReferences(root, config)),
    ...(await validateTraceability(root, config, phase)),
    ...(await validateDefinedIds(root, config)),
    ...(await validateContracts(root, config)),
    ...uiuxIssues,
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
