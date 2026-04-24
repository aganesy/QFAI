import path from "node:path";

import { loadConfig, resolvePath, type ConfigLoadResult } from "./config.js";
import { collectScenarioFiles } from "./discovery.js";
import {
  buildScCoverage,
  collectScIdsFromScenarioFiles,
  collectScTestReferences,
} from "./traceability.js";
import type { Issue, ValidationCounts, ValidationProfile, ValidationResult } from "./types.js";
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
  validateLayerCoverage,
  validateLayeredTraceability,
  validateBreakthroughEvidence,
  validateMermaidScreenFlow,
  validateMermaidEnforcement,
  validateOrphanProhibition,
  validatePrototypingEvidence,
  validatePrototypingDesignSystem,
  validateResearchSummary,
  validateRepositoryHygiene,
  validateSpecSplitByCapability,
  validateStatusInSpecs,
  validateTddList,
  validateUiDefinitionConsistency,
  validateDesignAudit,
  validateDesignSlop,
  validateDiscussionDesignHardening,
  validateNavigationFlow,
  validateRenderCritique,
  validateDesignFidelity,
  validateDesignContractReadiness,
  validatePrototypingSkillContent,
  runCanonicalUixValidators,
  validateTraceabilityIntegrity,
  validateUiEvidenceArtifacts,
} from "./validators/index.js";
import { readSafe } from "./validators/utils.js";

const UIUX_VALIDATION_BUDGET_MS = 2000;

export type ValidationOptions = {
  profile?: ValidationProfile;
  platform?: string;
};

export async function validateProject(
  root: string,
  configResult?: ConfigLoadResult,
  options: ValidationOptions = {},
): Promise<ValidationResult> {
  const resolved = configResult ?? (await loadConfig(root));
  const { config, issues: configIssues } = resolved;
  const profile: ValidationProfile = options.profile ?? "full";

  const findings = [
    ...configIssues,
    ...(await runProfileValidators(root, config, profile, options.platform)),
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
    profile,
    issues,
    counts: countIssues(issues),
    traceability: {
      sc: scCoverage,
      testFiles,
    },
    waivers,
  };
}

async function runProfileValidators(
  root: string,
  config: ConfigLoadResult["config"],
  profile: ValidationProfile,
  platformOption?: string,
): Promise<Issue[]> {
  switch (profile) {
    case "discussion":
      return runDiscussionValidators(root, config);
    case "sdd":
      return runSddValidators(root, config);
    case "prototyping":
      return runPrototypingValidators(root, config, platformOption);
    case "atdd":
      return runAtddValidators(root, config);
    case "tdd":
      return runTddValidators(root, config);
    case "verify":
    case "full":
      return runFullValidators(root, config, platformOption);
  }
}

async function runDiscussionValidators(
  root: string,
  config: ConfigLoadResult["config"],
): Promise<Issue[]> {
  return [
    ...(await validateDiscussionMermaid(root)),
    ...(await validateDiscussionPackReadiness(root, config)),
    ...(await validateDiscussionVisuals(root)),
    ...(await validateDiscussionDesignHardening(root, config)),
    ...(await validateResearchSummary(root, config)),
    ...(await runCanonicalUixValidators(root, config)),
  ];
}

async function runSddValidators(
  root: string,
  config: ConfigLoadResult["config"],
  includeCodeReferences = false,
): Promise<Issue[]> {
  return [
    ...(await validateMermaidEnforcement(root)),
    ...(await validateSpecPacks(root, config)),
    ...(await validateStatusInSpecs(root, config)),
    ...(await validateDensityHints(root, config)),
    ...(await validateSpecSplitByCapability(root, config)),
    ...(await validateLayeredTraceability(root, config)),
    ...(await validateOrphanProhibition(root, config)),
    ...(await validateLayerCoverage(root, config)),
    ...(await validateContractReferences(root, config)),
    ...(await validateTraceability(root, config, { includeCodeReferences })),
    ...(await validateDefinedIds(root, config)),
    ...(await validateContracts(root, config)),
    ...(await validateNavigationFlow(root, config)),
  ];
}

async function runPrototypingValidators(
  root: string,
  config: ConfigLoadResult["config"],
  platformOption?: string,
): Promise<Issue[]> {
  return [
    ...(await runUiuxValidators(root, config, platformOption)),
    ...(await validatePrototypingEvidence(root, config)),
    ...(await validateBreakthroughEvidence(root, config)),
    ...(await validatePrototypingDesignSystem(root, config)),
    ...(await validateUiEvidenceArtifacts(root, config)),
    ...(await validateRenderCritique(root, config)),
    ...(await validateDesignFidelity(root, config)),
    ...(await validateDesignContractReadiness(root, config)),
  ];
}

async function runAtddValidators(
  root: string,
  config: ConfigLoadResult["config"],
): Promise<Issue[]> {
  return [...(await validateAtddCodeTraceability(root, config))];
}

async function runTddValidators(
  root: string,
  config: ConfigLoadResult["config"],
  includeTraceability = true,
): Promise<Issue[]> {
  return [
    ...(await validateTddList(root, config)),
    ...(includeTraceability
      ? await validateTraceability(root, config, { includeCodeReferences: true })
      : []),
    ...(await validateTraceabilityIntegrity(root, config)),
  ];
}

async function runFullValidators(
  root: string,
  config: ConfigLoadResult["config"],
  platformOption?: string,
): Promise<Issue[]> {
  return [
    ...(await validateRepositoryHygiene(root, config)),
    ...(await validateSkillsIntegrity(root, config)),
    ...(await validateAssistantAssets(root, config)),
    ...(await runDiscussionValidators(root, config)),
    ...(await runSddValidators(root, config, true)),
    ...(await validateReviewArtifacts(root)),
    ...(await runPrototypingValidators(root, config, platformOption)),
    ...(await runAtddValidators(root, config)),
    ...(await runTddValidators(root, config, false)),
    ...(await validatePrototypingSkill(root, config)),
  ];
}

async function runUiuxValidators(
  root: string,
  config: ConfigLoadResult["config"],
  platformOption?: string,
): Promise<Issue[]> {
  const uiuxStart = performance.now();
  const platformResult = await detectPlatform(root, config, platformOption);
  const platform = platformResult.platform;
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
    () => runCanonicalUixValidators(root, config),
  ];
  const uiuxIssueGroups = await Promise.all(uiuxValidators.map((validator) => validator()));
  const uiuxIssues: Issue[] = [...platformResult.issues, ...uiuxIssueGroups.flat()];

  const uiuxElapsed = performance.now() - uiuxStart;
  if (uiuxElapsed > UIUX_VALIDATION_BUDGET_MS) {
    uiuxIssues.push({
      code: "QFAI-UIUX-PERF",
      severity: "warning",
      category: "canonical",
      message: `UI/UX validation exceeded budget (${UIUX_VALIDATION_BUDGET_MS}ms). All validators were executed.`,
      rule: "uiux.performanceBudget",
    });
  }
  return uiuxIssues;
}

async function validatePrototypingSkill(
  root: string,
  config: ConfigLoadResult["config"],
): Promise<Issue[]> {
  const skillsDir = resolvePath(root, config, "skillsDir");
  const prototypingSkillPath = path.join(skillsDir, "qfai-prototyping", "SKILL.md");
  const prototypingSkillContent = await readSafe(prototypingSkillPath);
  return prototypingSkillContent.length > 0
    ? validatePrototypingSkillContent(prototypingSkillContent).issues
    : [];
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
