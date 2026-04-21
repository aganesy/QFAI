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
export { validateOrphanProhibition } from "./orphanProhibition.js";
export { validatePrototypingEvidence } from "./prototypingEvidence.js";
export { validatePrototypingDesignSystem } from "./prototypingDesignSystem.js";
export { validatePrototypingRecommendation } from "./prototypingRecommendation.js";
export { validateRequireIndexShape } from "./requireIndex.js";
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
export { validateDiscussionDesignHardening } from "./discussionDesignHardening.js";
export { validateDesignAudit } from "./designAudit.js";
export { validateDesignSlop } from "./designSlop.js";
export { validateDesignContractReadiness } from "./designContractReadiness.js";
export { validateUiEvidenceArtifacts } from "./uiEvidenceArtifacts.js";
export { isUiBearingSpec } from "./uixDetection.js";
export {
  validateThreeLayerModel,
  validateForbiddenLegacyFiles,
  validateThreeLayerFamilyCompleteness,
} from "./uix/threeLayer.js";
export { validateTasteInterview } from "./uix/taste.js";
export { validateTrendScan } from "./uix/trend.js";
export { validateScoringReady } from "./uix/scoringReady.js";
export { validateStrategyStrong } from "./uix/strategy.js";
export { validateScreenContractSchema } from "./uix/screenContract.js";
export { runCanonicalUixValidators } from "./uix/canonical.js";
export { validateTraceabilityIntegrity } from "./traceabilityIntegrity.js";
export { validatePrototypingSkillContent } from "./skill/prototypingSkill.js";
