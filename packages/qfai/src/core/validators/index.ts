// ---------------------------------------------------------------------------
// Canonical validators — production path
// ---------------------------------------------------------------------------

export { validateDiscussionPackReadiness } from "./discussionPack.js";
export { validateDiscussionVisuals } from "./discussionVisuals.js";
export { validateDensityHints } from "./densityHints.js";
export { validateImportLiteEvidencePresence } from "./importLite.js";
export { validateLayerCoverage } from "./layerCoverage.js";
export { validateLayeredTraceability } from "./layeredTraceability.js";
export { validateMermaidEnforcement } from "./mermaidEnforcement.js";
export { validateContractReferences } from "./contractReferences.js";
export { validateAtddCodeTraceability } from "./atddCodeTraceability.js";
export { validateAtddCoverageDepth } from "./atddCoverageDepth.js";
export { validateScaffoldPlaceholder } from "./scaffoldPlaceholder.js";
export { validateOrphanProhibition } from "./orphanProhibition.js";
export { validatePrototypingEvidence, validateScreenIdCasing } from "./prototypingEvidence.js";
export {
  validateDelegationMapIssues,
  validatePrototypingDelegationMap,
} from "./prototyping/delegationMap.js";
export { validateCompletionCertificateIssues } from "./prototyping/completionCertificate.js";
export { validateConfigReferenceIntegrity } from "./configReferenceIntegrity.js";
export { validatePrototypingArtifactRefIntegrity } from "./prototyping/refIntegrity.js";
export { validateSpecIdLinkage } from "./prototyping/specIdLinkage.js";
export { validateRepositoryHygiene } from "./repositoryHygiene.js";
export { validateReviewArtifacts } from "./reviewArtifacts.js";
export { validateSpecSplitByCapability } from "./specSplitByCapability.js";
export { validateStatusInSpecs } from "./statusInSpecs.js";
export { validateDesignToken } from "./designToken.js";
export { validateHtmlMock } from "./htmlMock.js";
export { validateMermaidScreenFlow } from "./mermaidScreenFlow.js";
export { validateBpApDb } from "./bpApDb.js";
export { detectPlatform } from "./platformDetection.js";
export { validateUiDefinitionConsistency } from "./uiDefinitionConsistency.js";
export { validateResearchSummary } from "./researchSummary.js";
export { validateAgentDefinition } from "./agentDefinition.js";
export { validateTddList } from "./tddList.js";
export { validateNavigationFlow } from "./navigationFlow.js";
export { validateRenderCritique } from "./renderCritique.js";
export { validateDesignFidelity } from "./designFidelity.js";
export { validateDesignAudit } from "./designAudit.js";
export { loadLayoutAntiPatterns, findLayoutAntiPatterns } from "./layoutAntiPatterns.js";
export type { LayoutAntiPattern, LayoutAntiPatternScope } from "./layoutAntiPatterns.js";
export {
  validatePrototypingDesignContractReadiness,
  validateSddDesignContractReadiness,
} from "./designContractReadiness.js";
export { validateUiEvidenceArtifacts } from "./uiEvidenceArtifacts.js";
export { isUiBearingSpec } from "./uixDetection.js";
export {
  validateThreeLayerModel,
  validateForbiddenLegacyFiles,
  validateThreeLayerFamilyCompleteness,
} from "./uix/threeLayer.js";
export { validateTrendScan } from "./uix/trendScan.js";
export { validateScreenContractSchema } from "./uix/screenContract.js";
export { runCanonicalUixValidators } from "./uix/canonical.js";
export { validateSpecRequiredFilesCatalog } from "./specRequiredFilesCatalog.js";
export { validateMarkdownTableArity } from "./markdownTableArity.js";
export { validateTraceabilityIntegrity } from "./traceabilityIntegrity.js";
export { validateUpstreamSsotGuard } from "./upstreamSsotGuard.js";
export { validatePrototypingSkillContent } from "./skill/prototypingSkill.js";
export { validateTestTodoStubs } from "./testTodoStubs.js";
export { validateWorklogSurface } from "./worklogSurface.js";
export { validateAssistantTreeMigration } from "./assistantTreeMigration.js";
export { validateAssistantAnchorReferences } from "./assistantAnchorReferences.js";
export { validateSkillDocReferences } from "./skillDocReferences.js";
export { validateReviewerJustification } from "./reviewerJustification.js";
export { validateReviewerGate, detectMockHrefDrift } from "./reviewerGate.js";
export { validateSurfaceTypeDrift } from "./surfaceTypeDrift.js";
export { detectDesignMdPatchOutOfZone, validateDesignMdPatchZone } from "./designMdPatchZone.js";
export { detectEvidenceMutationUnlogged } from "./evidenceMutationUnlogged.js";
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
export {
  CATALOG_ADVISORY_FAILING_CODES,
  JUSTIFICATION_CATALOG,
  isAdvisoryFailingCatalogCode,
} from "./justificationCatalog.js";
export type { JustificationCatalogEntry } from "./justificationCatalog.js";
export {
  STALE_REFERENCES,
  STALE_REFERENCE_SUNSET,
  staleReferenceSeverity,
  validateStaleReferences,
} from "./staleReferences.js";
export type { StaleReferenceEntry } from "./staleReferences.js";
export { HANDOFF_SCHEMA_REL, HANDOFF_WRITER_PAIRS } from "./handoffSchemaPairs.js";
export type { HandoffWriterPair } from "./handoffSchemaPairs.js";
export {
  detectExplorationCertifyAttempt,
  resolveCertifyAcceptedIterationIndex,
} from "./prototyping/explorationCertify.js";
