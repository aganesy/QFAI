import path from "node:path";

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
  detectPlatform,
  validateAgentDefinition,
  validateBpApDb,
  validateContractReferences,
  validateDesignToken,
  validateDiscussionPackReadiness,
  validateDiscussionVisuals,
  validateDensityHints,
  validateHtmlMock,
  validateLegacyStatusDir,
  validateLayerCoverage,
  validateLayeredTraceability,
  validateMermaidScreenFlow,
  validateMermaidEnforcement,
  validateOrphanProhibition,
  validatePrototypingEvidence,
  validateResearchSummary,
  validateRepositoryHygiene,
  validateSpecSplitByCapability,
  validateStatusInSpecs,
  validateTddList,
  validateUiDefinitionConsistency,
  validateDdpFields,
  validateDesignAudit,
  validateDesignSlop,
  validateDiscussionDesignHardening,
  validateNavigationFlow,
  validateRenderCritique,
  validateDesignFidelity,
  validateFullHarnessSkill,
  validatePrototypingSkillContent,
  runAllUixValidators,
} from "./validators/index.js";
import { readSafe } from "./validators/utils.js";

const UIUX_VALIDATION_BUDGET_MS = 2000;

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

  // Include platform detection in UI/UX performance budget.
  const uiuxStart = performance.now();
  // Detect platform for UI/UX validators
  const platformResult = await detectPlatform(root, config, options.platform);
  const platform = platformResult.platform;

  // UI/UX validators with performance budget
  const uiuxValidators: Array<() => Promise<Issue[]>> = [
    () => validateDesignToken(root, config),
    () => validateHtmlMock(root, platform, config),
    () => validateMermaidScreenFlow(root, config),
    () => validateBpApDb(root, config),
    () => validateUiDefinitionConsistency(root, config),
    () => validateResearchSummary(root, config),
    () => validateAgentDefinition(root, config),
    () => validateDesignAudit(root, config),
    () => validateDesignSlop(root, config),
    () => runAllUixValidators(root, config),
  ];
  const uiuxIssueGroups = await Promise.all(uiuxValidators.map((validator) => validator()));
  const uiuxIssues: Issue[] = [...platformResult.issues, ...uiuxIssueGroups.flat()];

  const uiuxElapsed = performance.now() - uiuxStart;
  if (uiuxElapsed > UIUX_VALIDATION_BUDGET_MS) {
    uiuxIssues.push({
      code: "QFAI-UIUX-PERF",
      severity: "warning",
      category: "compatibility",
      message: `UI/UX validation exceeded budget (${UIUX_VALIDATION_BUDGET_MS}ms). All validators were executed.`,
      rule: "uiux.performanceBudget",
    });
  }

  // Skill content validators (spec-0031, spec-0035)
  const skillsDir = resolvePath(root, config, "skillsDir");
  const fullHarnessResult = await validateFullHarnessSkill(skillsDir);
  const prototypingSkillPath = path.join(skillsDir, "qfai-prototyping", "SKILL.md");
  const prototypingSkillContent = await readSafe(prototypingSkillPath);
  const prototypingSkillResult =
    prototypingSkillContent.length > 0
      ? validatePrototypingSkillContent(prototypingSkillContent)
      : { issues: [] };

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
    ...(await validateTddList(root, config)),
    ...(await validateDdpFields(root, config)),
    ...(await validateDiscussionDesignHardening(root, config)),
    ...(await validateNavigationFlow(root, config)),
    ...(await validateRenderCritique(root, config)),
    ...(await validateDesignFidelity(root, config)),
    ...fullHarnessResult.issues,
    ...prototypingSkillResult.issues,
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
