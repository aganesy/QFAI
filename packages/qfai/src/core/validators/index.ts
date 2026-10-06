// ---------------------------------------------------------------------------
// Canonical validators — production path
// ---------------------------------------------------------------------------

export { validateDiscussionPackReadiness } from "./discussionPack.js";
export { validateDiscussionVisuals } from "./discussionVisuals.js";
export { validateDesignDirectionProposal } from "./designDirectionProposal.js";
export { validateDbContractApplyOrder } from "./dbContractApplyOrder.js";
export { validateStoryPolicyPlaceholders } from "./assistantAssets.js";
export { validateStoryTreeContractReferences } from "./contractReferences.js";
export {
  validateStoryTreeObligations,
  validateStoryTreeObligationsModel,
} from "./storyTreeObligations.js";
export {
  validateConstraintIds,
  validateStoryDirectories,
  validateStoryTreeStructure,
  validateStoryTreeStructureModel,
  validateTechArchitecture,
} from "./storyTreeStructure.js";
export { validateExternalReferences } from "./externalReferences.js";
export { validateStoryTreeDrift } from "./upstreamSsotGuard.js";
export { validateDocumentSchema } from "./documentSchema.js";
export { validateStaleTerms } from "./staleTerms.js";
export { validateConfigReferenceIntegrity } from "./configReferenceIntegrity.js";
export { validateRepositoryHygiene } from "./repositoryHygiene.js";
export { validateDesignToken } from "./designToken.js";
export { validateHtmlMock } from "./htmlMock.js";
export type { HtmlMockTiming } from "./htmlMock.js";
export { validateMermaidScreenFlow } from "./mermaidScreenFlow.js";
export { detectPlatform } from "./platformDetection.js";
export { validateUiDefinitionConsistency } from "./uiDefinitionConsistency.js";
export { validateUiScreenEntries } from "./uiScreenEntries.js";
export { validateUiContractParse } from "./contracts.js";
export { validateUiMarkerPresence } from "./uiMarkerPresence.js";
export { validateUiPrototypeMode } from "./uiPrototypeMode.js";
export { validateResearchSummary } from "./researchSummary.js";
export { validateAgentDefinition } from "./agentDefinition.js";
export { validateSkillRoles } from "./skillRoles.js";
export { validateStepTree } from "./stepTree.js";
export { validateDesignAudit } from "./designAudit.js";
export { loadLayoutAntiPatterns, findLayoutAntiPatterns } from "./layoutAntiPatterns.js";
export type { LayoutAntiPattern, LayoutAntiPatternScope } from "./layoutAntiPatterns.js";
export {
  validateDesignContractReadiness,
  validateRootDesignMdParse,
} from "./designContractReadiness.js";
export { isUiBearingSpec } from "./uixDetection.js";
export {
  validateThreeLayerModel,
  validateForbiddenLegacyFiles,
  validateThreeLayerFamilyCompleteness,
} from "./uix/threeLayer.js";
export { validateTrendScan } from "./uix/trendScan.js";
export { validateScreenContractSchema } from "./uix/screenContract.js";
export { runCanonicalUixValidators } from "./uix/canonical.js";
export { validateCompetitiveReferences } from "./uix/competitiveRefs.js";
export { validatePrototypingSkillContent } from "./skill/prototypingSkill.js";
export {
  STUB_SOURCE_FILE_PATTERN,
  stubSourceFilePattern,
  validateTestTodoStubs,
} from "./testTodoStubs.js";
export { validateAssistantTreeMigration } from "./assistantTreeMigration.js";
export { validateAssistantAnchorReferences } from "./assistantAnchorReferences.js";
export { validateSkillDocReferences } from "./skillDocReferences.js";
export { detectMockHrefDrift } from "./reviewerGate.js";
export { detectSkillManifestDrift } from "./skillManifestDrift.js";
export type { SkillManifestPair } from "./skillManifestPairs.js";
export {
  SKILL_MANIFEST_PAIRS,
  SKILL_MANIFEST_PROBE_IMPL_REL,
  SKILL_MANIFEST_SCHEMA_REL,
} from "./skillManifestPairs.js";
export {
  AUTO_DECIDE_ALLOWED_TOKENS,
  parseAutopilotPolicy,
  validateAutopilotPolicy,
} from "./autopilotPolicy.js";
export type { AutopilotPolicyParseResult } from "./autopilotPolicy.js";
export { detectHandoffSchemaDrift } from "./handoffSchemaDrift.js";
export {
  PACKAGE_SELF_GOVERNANCE_FAMILIES,
  PACKAGE_SOURCE_ROOT_REL,
  unevaluatedPackageSelfGovernanceFamilies,
  runPackageSelfGovernanceValidators,
} from "./packageSelfGovernance.js";
export { STALE_REFERENCES, validateStaleReferences } from "./staleReferences.js";
export type { StaleReferenceEntry } from "./staleReferences.js";
export { HANDOFF_SCHEMA_REL, HANDOFF_WRITER_PAIRS } from "./handoffSchemaPairs.js";
export type { HandoffWriterPair } from "./handoffSchemaPairs.js";
