/** Test-only timing of real validator export boundaries, including their I/O. */
import { createHistogram, performance } from "node:perf_hooks";

import { vi } from "vitest";

import * as agentDefinition from "../../src/core/validators/agentDefinition.js";
import * as assistantAnchorReferences from "../../src/core/validators/assistantAnchorReferences.js";
import * as assistantAssets from "../../src/core/validators/assistantAssets.js";
import * as assistantTreeMigration from "../../src/core/validators/assistantTreeMigration.js";
import * as autopilotPolicy from "../../src/core/validators/autopilotPolicy.js";
import * as configReferenceIntegrity from "../../src/core/validators/configReferenceIntegrity.js";
import * as contractConsistency from "../../src/core/validators/contractConsistency.js";
import * as contractReferences from "../../src/core/validators/contractReferences.js";
import * as contracts from "../../src/core/validators/contracts.js";
import * as dbContractApplyOrder from "../../src/core/validators/dbContractApplyOrder.js";
import * as designAudit from "../../src/core/validators/designAudit.js";
import * as designContractReadiness from "../../src/core/validators/designContractReadiness.js";
import * as designDirectionProposal from "../../src/core/validators/designDirectionProposal.js";
import * as designToken from "../../src/core/validators/designToken.js";
import * as discussMermaid from "../../src/core/validators/discussMermaid.js";
import * as discussionPack from "../../src/core/validators/discussionPack.js";
import * as discussionVisuals from "../../src/core/validators/discussionVisuals.js";
import * as documentSchema from "../../src/core/validators/documentSchema.js";
import * as externalReferences from "../../src/core/validators/externalReferences.js";
import * as forbiddenIdentifiers from "../../src/core/validators/forbiddenIdentifiers.js";
import * as handoffSchemaDrift from "../../src/core/validators/handoffSchemaDrift.js";
import * as htmlMock from "../../src/core/validators/htmlMock.js";
import * as integrationSurface from "../../src/core/validators/integrationSurface.js";
import * as mermaidScreenFlow from "../../src/core/validators/mermaidScreenFlow.js";
import * as packageSelfGovernance from "../../src/core/validators/packageSelfGovernance.js";
import * as platformDetection from "../../src/core/validators/platformDetection.js";
import * as repositoryHygiene from "../../src/core/validators/repositoryHygiene.js";
import * as researchSummary from "../../src/core/validators/researchSummary.js";
import * as reviewerGate from "../../src/core/validators/reviewerGate.js";
import * as prototypingSkill from "../../src/core/validators/skill/prototypingSkill.js";
import * as skillDocReferences from "../../src/core/validators/skillDocReferences.js";
import * as skillManifestDrift from "../../src/core/validators/skillManifestDrift.js";
import * as skillRoles from "../../src/core/validators/skillRoles.js";
import * as staleTerms from "../../src/core/validators/staleTerms.js";
import * as stepTree from "../../src/core/validators/stepTree.js";
import * as storyTreeObligations from "../../src/core/validators/storyTreeObligations.js";
import * as storyTreeStructure from "../../src/core/validators/storyTreeStructure.js";
import * as testTodoStubs from "../../src/core/validators/testTodoStubs.js";
import * as uiDefinitionConsistency from "../../src/core/validators/uiDefinitionConsistency.js";
import * as uiMarkerPresence from "../../src/core/validators/uiMarkerPresence.js";
import * as uiPrototypeMode from "../../src/core/validators/uiPrototypeMode.js";
import * as uiScreenCopy from "../../src/core/validators/uiScreenCopy.js";
import * as uiScreenEntries from "../../src/core/validators/uiScreenEntries.js";
import * as canonical from "../../src/core/validators/uix/canonical.js";
import * as classification from "../../src/core/validators/uix/classification.js";
import * as comparisonValidator from "../../src/core/validators/uix/comparisonValidator.js";
import * as competitiveRefs from "../../src/core/validators/uix/competitiveRefs.js";
import * as foundation from "../../src/core/validators/uix/foundation.js";
import * as oqClosure from "../../src/core/validators/uix/oqClosure.js";
import * as screenContract from "../../src/core/validators/uix/screenContract.js";
import * as threeLayer from "../../src/core/validators/uix/threeLayer.js";
import * as trendScan from "../../src/core/validators/uix/trendScan.js";
import * as upstreamSsotGuard from "../../src/core/validators/upstreamSsotGuard.js";
import * as configuration from "../../src/core/config.js";
import * as storyModel from "../../src/core/storyTree/tree.js";
import * as waivers from "../../src/core/waivers.js";
import * as fileScan from "../../src/core/fs.js";

export type ValidatorMeasurement = {
  name: string;
  capture: "observed" | "uncaptured";
  invokedCalls: number;
  recordedCalls: number;
  inclusiveMs: number;
  minMs: number | null;
  maxMs: number | null;
};

/**
 * Spies forward the exact arguments and results to the original functions.
 * Parallel and nested boundaries overlap; never sum their inclusive times.
 * Zero calls are uncaptured: internal or saved imported references can bypass spies.
 * Same-module calls remain inside their caller's time. Finer attribution needs
 * a CPU profile after these measurements identify a costly boundary.
 */
export function measureValidators() {
  const restores: Array<() => void> = [];
  const readers: Array<() => ValidatorMeasurement> = [];
  function register<Args extends unknown[], Result>(
    name: string,
    original: (...args: Args) => Result,
    install: (call: (...args: Args) => Result) => {
      mockRestore(): void;
      mock: { calls: unknown[][] };
    },
  ): void {
    const histogram = createHistogram();
    const spy = install(performance.timerify(original, { histogram }));
    restores.push(() => spy.mockRestore());
    readers.push(() => ({
      name,
      capture: spy.mock.calls.length > 0 ? "observed" : "uncaptured",
      invokedCalls: spy.mock.calls.length,
      recordedCalls: histogram.count,
      inclusiveMs: histogram.count === 0 ? 0 : (histogram.mean * histogram.count) / 1e6,
      minMs: histogram.count === 0 ? null : histogram.min / 1e6,
      maxMs: histogram.count === 0 ? null : histogram.max / 1e6,
    }));
  }
  const restore = () => {
    for (const undo of restores.reverse()) undo();
  };
  try {
    register(
      "core/validators/agentDefinition:validateAgentDefinition",
      agentDefinition.validateAgentDefinition,
      (call) => vi.spyOn(agentDefinition, "validateAgentDefinition").mockImplementation(call),
    );
    register(
      "core/validators/assistantAnchorReferences:validateAssistantAnchorReferences",
      assistantAnchorReferences.validateAssistantAnchorReferences,
      (call) =>
        vi
          .spyOn(assistantAnchorReferences, "validateAssistantAnchorReferences")
          .mockImplementation(call),
    );
    register(
      "core/validators/assistantAssets:validateAssistantAssets",
      assistantAssets.validateAssistantAssets,
      (call) => vi.spyOn(assistantAssets, "validateAssistantAssets").mockImplementation(call),
    );
    register(
      "core/validators/assistantAssets:validateStoryPolicyPlaceholders",
      assistantAssets.validateStoryPolicyPlaceholders,
      (call) =>
        vi.spyOn(assistantAssets, "validateStoryPolicyPlaceholders").mockImplementation(call),
    );
    register(
      "core/validators/assistantTreeMigration:validateAssistantTreeMigration",
      assistantTreeMigration.validateAssistantTreeMigration,
      (call) =>
        vi.spyOn(assistantTreeMigration, "validateAssistantTreeMigration").mockImplementation(call),
    );
    register(
      "core/validators/autopilotPolicy:validateAutopilotPolicy",
      autopilotPolicy.validateAutopilotPolicy,
      (call) => vi.spyOn(autopilotPolicy, "validateAutopilotPolicy").mockImplementation(call),
    );
    register(
      "core/validators/configReferenceIntegrity:validateConfigReferenceIntegrity",
      configReferenceIntegrity.validateConfigReferenceIntegrity,
      (call) =>
        vi
          .spyOn(configReferenceIntegrity, "validateConfigReferenceIntegrity")
          .mockImplementation(call),
    );
    register(
      "core/validators/contractConsistency:validateContractConsistency",
      contractConsistency.validateContractConsistency,
      (call) =>
        vi.spyOn(contractConsistency, "validateContractConsistency").mockImplementation(call),
    );
    register(
      "core/validators/contractReferences:validateStoryTreeContractReferences",
      contractReferences.validateStoryTreeContractReferences,
      (call) =>
        vi
          .spyOn(contractReferences, "validateStoryTreeContractReferences")
          .mockImplementation(call),
    );
    register("core/validators/contracts:validateContracts", contracts.validateContracts, (call) =>
      vi.spyOn(contracts, "validateContracts").mockImplementation(call),
    );
    register(
      "core/validators/contracts:validateUiContractParse",
      contracts.validateUiContractParse,
      (call) => vi.spyOn(contracts, "validateUiContractParse").mockImplementation(call),
    );
    register(
      "core/validators/dbContractApplyOrder:validateDbContractApplyOrder",
      dbContractApplyOrder.validateDbContractApplyOrder,
      (call) =>
        vi.spyOn(dbContractApplyOrder, "validateDbContractApplyOrder").mockImplementation(call),
    );
    register(
      "core/validators/designAudit:validateDesignAudit",
      designAudit.validateDesignAudit,
      (call) => vi.spyOn(designAudit, "validateDesignAudit").mockImplementation(call),
    );
    register(
      "core/validators/designContractReadiness:validateRootDesignMdParse",
      designContractReadiness.validateRootDesignMdParse,
      (call) =>
        vi.spyOn(designContractReadiness, "validateRootDesignMdParse").mockImplementation(call),
    );
    register(
      "core/validators/designContractReadiness:validateDesignContractReadiness",
      designContractReadiness.validateDesignContractReadiness,
      (call) =>
        vi
          .spyOn(designContractReadiness, "validateDesignContractReadiness")
          .mockImplementation(call),
    );
    register(
      "core/validators/designDirectionProposal:validateDesignDirectionProposal",
      designDirectionProposal.validateDesignDirectionProposal,
      (call) =>
        vi
          .spyOn(designDirectionProposal, "validateDesignDirectionProposal")
          .mockImplementation(call),
    );
    register(
      "core/validators/designToken:validateDesignToken",
      designToken.validateDesignToken,
      (call) => vi.spyOn(designToken, "validateDesignToken").mockImplementation(call),
    );
    register(
      "core/validators/discussMermaid:validateDiscussionMermaid",
      discussMermaid.validateDiscussionMermaid,
      (call) => vi.spyOn(discussMermaid, "validateDiscussionMermaid").mockImplementation(call),
    );
    register(
      "core/validators/discussionPack:validateDiscussionPackReadiness",
      discussionPack.validateDiscussionPackReadiness,
      (call) =>
        vi.spyOn(discussionPack, "validateDiscussionPackReadiness").mockImplementation(call),
    );
    register(
      "core/validators/discussionVisuals:validateDiscussionVisuals",
      discussionVisuals.validateDiscussionVisuals,
      (call) => vi.spyOn(discussionVisuals, "validateDiscussionVisuals").mockImplementation(call),
    );
    register(
      "core/validators/documentSchema:validateDocumentSchema",
      documentSchema.validateDocumentSchema,
      (call) => vi.spyOn(documentSchema, "validateDocumentSchema").mockImplementation(call),
    );
    register(
      "core/validators/externalReferences:validateExternalReferences",
      externalReferences.validateExternalReferences,
      (call) => vi.spyOn(externalReferences, "validateExternalReferences").mockImplementation(call),
    );
    register(
      "core/validators/forbiddenIdentifiers:validateForbiddenIdentifiers",
      forbiddenIdentifiers.validateForbiddenIdentifiers,
      (call) =>
        vi.spyOn(forbiddenIdentifiers, "validateForbiddenIdentifiers").mockImplementation(call),
    );
    register(
      "core/validators/handoffSchemaDrift:detectHandoffSchemaDrift",
      handoffSchemaDrift.detectHandoffSchemaDrift,
      (call) => vi.spyOn(handoffSchemaDrift, "detectHandoffSchemaDrift").mockImplementation(call),
    );
    register("core/validators/htmlMock:validateHtmlMock", htmlMock.validateHtmlMock, (call) =>
      vi.spyOn(htmlMock, "validateHtmlMock").mockImplementation(call),
    );
    register(
      "core/validators/integrationSurface:validateIntegrationSurface",
      integrationSurface.validateIntegrationSurface,
      (call) => vi.spyOn(integrationSurface, "validateIntegrationSurface").mockImplementation(call),
    );
    register(
      "core/validators/integrationSurface:inspectIntegrationSurface",
      integrationSurface.inspectIntegrationSurface,
      (call) => vi.spyOn(integrationSurface, "inspectIntegrationSurface").mockImplementation(call),
    );
    register(
      "core/validators/mermaidScreenFlow:validateMermaidScreenFlow",
      mermaidScreenFlow.validateMermaidScreenFlow,
      (call) => vi.spyOn(mermaidScreenFlow, "validateMermaidScreenFlow").mockImplementation(call),
    );
    register(
      "core/validators/packageSelfGovernance:runPackageSelfGovernanceValidators",
      packageSelfGovernance.runPackageSelfGovernanceValidators,
      (call) =>
        vi
          .spyOn(packageSelfGovernance, "runPackageSelfGovernanceValidators")
          .mockImplementation(call),
    );
    register(
      "core/validators/platformDetection:detectPlatform",
      platformDetection.detectPlatform,
      (call) => vi.spyOn(platformDetection, "detectPlatform").mockImplementation(call),
    );
    register(
      "core/validators/repositoryHygiene:validateRepositoryHygiene",
      repositoryHygiene.validateRepositoryHygiene,
      (call) => vi.spyOn(repositoryHygiene, "validateRepositoryHygiene").mockImplementation(call),
    );
    register(
      "core/validators/researchSummary:validateResearchSummary",
      researchSummary.validateResearchSummary,
      (call) => vi.spyOn(researchSummary, "validateResearchSummary").mockImplementation(call),
    );
    register(
      "core/validators/reviewerGate:detectMockHrefDrift",
      reviewerGate.detectMockHrefDrift,
      (call) => vi.spyOn(reviewerGate, "detectMockHrefDrift").mockImplementation(call),
    );
    register(
      "core/validators/skill/prototypingSkill:detectAspirationalClaims",
      prototypingSkill.detectAspirationalClaims,
      (call) => vi.spyOn(prototypingSkill, "detectAspirationalClaims").mockImplementation(call),
    );
    register(
      "core/validators/skill/prototypingSkill:validatePrototypingSkillContent",
      prototypingSkill.validatePrototypingSkillContent,
      (call) =>
        vi.spyOn(prototypingSkill, "validatePrototypingSkillContent").mockImplementation(call),
    );
    register(
      "core/validators/skillDocReferences:validateSkillDocReferences",
      skillDocReferences.validateSkillDocReferences,
      (call) => vi.spyOn(skillDocReferences, "validateSkillDocReferences").mockImplementation(call),
    );
    register(
      "core/validators/skillManifestDrift:detectSkillManifestDrift",
      skillManifestDrift.detectSkillManifestDrift,
      (call) => vi.spyOn(skillManifestDrift, "detectSkillManifestDrift").mockImplementation(call),
    );
    register(
      "core/validators/skillRoles:validateSkillRoles",
      skillRoles.validateSkillRoles,
      (call) => vi.spyOn(skillRoles, "validateSkillRoles").mockImplementation(call),
    );
    register(
      "core/validators/staleTerms:validateStaleTerms",
      staleTerms.validateStaleTerms,
      (call) => vi.spyOn(staleTerms, "validateStaleTerms").mockImplementation(call),
    );
    register("core/validators/stepTree:validateStepTree", stepTree.validateStepTree, (call) =>
      vi.spyOn(stepTree, "validateStepTree").mockImplementation(call),
    );
    register(
      "core/validators/storyTreeObligations:validateStoryTreeObligationsModel",
      storyTreeObligations.validateStoryTreeObligationsModel,
      (call) =>
        vi
          .spyOn(storyTreeObligations, "validateStoryTreeObligationsModel")
          .mockImplementation(call),
    );
    register(
      "core/validators/storyTreeObligations:validateStoryTreeObligations",
      storyTreeObligations.validateStoryTreeObligations,
      (call) =>
        vi.spyOn(storyTreeObligations, "validateStoryTreeObligations").mockImplementation(call),
    );
    register(
      "core/validators/storyTreeStructure:validateStoryTreeStructureModel",
      storyTreeStructure.validateStoryTreeStructureModel,
      (call) =>
        vi.spyOn(storyTreeStructure, "validateStoryTreeStructureModel").mockImplementation(call),
    );
    register(
      "core/validators/storyTreeStructure:validateStoryDirectories",
      storyTreeStructure.validateStoryDirectories,
      (call) => vi.spyOn(storyTreeStructure, "validateStoryDirectories").mockImplementation(call),
    );
    register(
      "core/validators/storyTreeStructure:validateStoryTreeStructure",
      storyTreeStructure.validateStoryTreeStructure,
      (call) => vi.spyOn(storyTreeStructure, "validateStoryTreeStructure").mockImplementation(call),
    );
    register(
      "core/validators/storyTreeStructure:validateTechArchitecture",
      storyTreeStructure.validateTechArchitecture,
      (call) => vi.spyOn(storyTreeStructure, "validateTechArchitecture").mockImplementation(call),
    );
    register(
      "core/validators/storyTreeStructure:validateConstraintIds",
      storyTreeStructure.validateConstraintIds,
      (call) => vi.spyOn(storyTreeStructure, "validateConstraintIds").mockImplementation(call),
    );
    register(
      "core/validators/testTodoStubs:validateTestTodoStubs",
      testTodoStubs.validateTestTodoStubs,
      (call) => vi.spyOn(testTodoStubs, "validateTestTodoStubs").mockImplementation(call),
    );
    register(
      "core/validators/uiDefinitionConsistency:validateUiDefinitionConsistency",
      uiDefinitionConsistency.validateUiDefinitionConsistency,
      (call) =>
        vi
          .spyOn(uiDefinitionConsistency, "validateUiDefinitionConsistency")
          .mockImplementation(call),
    );
    register(
      "core/validators/uiMarkerPresence:validateUiMarkerPresence",
      uiMarkerPresence.validateUiMarkerPresence,
      (call) => vi.spyOn(uiMarkerPresence, "validateUiMarkerPresence").mockImplementation(call),
    );
    register(
      "core/validators/uiPrototypeMode:validateUiPrototypeMode",
      uiPrototypeMode.validateUiPrototypeMode,
      (call) => vi.spyOn(uiPrototypeMode, "validateUiPrototypeMode").mockImplementation(call),
    );
    register(
      "core/validators/uiScreenCopy:validateUiScreenCopy",
      uiScreenCopy.validateUiScreenCopy,
      (call) => vi.spyOn(uiScreenCopy, "validateUiScreenCopy").mockImplementation(call),
    );
    register(
      "core/validators/uiScreenEntries:validateUiScreenEntries",
      uiScreenEntries.validateUiScreenEntries,
      (call) => vi.spyOn(uiScreenEntries, "validateUiScreenEntries").mockImplementation(call),
    );
    register(
      "core/validators/uix/canonical:runCanonicalUixValidators",
      canonical.runCanonicalUixValidators,
      (call) => vi.spyOn(canonical, "runCanonicalUixValidators").mockImplementation(call),
    );
    register(
      "core/validators/uix/classification:validateClassification",
      classification.validateClassification,
      (call) => vi.spyOn(classification, "validateClassification").mockImplementation(call),
    );
    register(
      "core/validators/uix/comparisonValidator:validateExplorationArtifacts",
      comparisonValidator.validateExplorationArtifacts,
      (call) =>
        vi.spyOn(comparisonValidator, "validateExplorationArtifacts").mockImplementation(call),
    );
    register(
      "core/validators/uix/competitiveRefs:validateCompetitiveReferences",
      competitiveRefs.validateCompetitiveReferences,
      (call) => vi.spyOn(competitiveRefs, "validateCompetitiveReferences").mockImplementation(call),
    );
    register(
      "core/validators/uix/foundation:validateSidecarMissing",
      foundation.validateSidecarMissing,
      (call) => vi.spyOn(foundation, "validateSidecarMissing").mockImplementation(call),
    );
    register(
      "core/validators/uix/oqClosure:validateOqClosure",
      oqClosure.validateOqClosure,
      (call) => vi.spyOn(oqClosure, "validateOqClosure").mockImplementation(call),
    );
    register(
      "core/validators/uix/screenContract:validateScreenContractSchema",
      screenContract.validateScreenContractSchema,
      (call) => vi.spyOn(screenContract, "validateScreenContractSchema").mockImplementation(call),
    );
    register(
      "core/validators/uix/threeLayer:validateThreeLayerFamilyCompleteness",
      threeLayer.validateThreeLayerFamilyCompleteness,
      (call) =>
        vi.spyOn(threeLayer, "validateThreeLayerFamilyCompleteness").mockImplementation(call),
    );
    register(
      "core/validators/uix/trendScan:validateTrendScan",
      trendScan.validateTrendScan,
      (call) => vi.spyOn(trendScan, "validateTrendScan").mockImplementation(call),
    );
    register(
      "core/validators/upstreamSsotGuard:validateStoryTreeDrift",
      upstreamSsotGuard.validateStoryTreeDrift,
      (call) => vi.spyOn(upstreamSsotGuard, "validateStoryTreeDrift").mockImplementation(call),
    );
    register("core/config:loadConfig", configuration.loadConfig, (call) =>
      vi.spyOn(configuration, "loadConfig").mockImplementation(call),
    );
    register("core/storyTree/tree:readStoryTreeModel", storyModel.readStoryTreeModel, (call) =>
      vi.spyOn(storyModel, "readStoryTreeModel").mockImplementation(call),
    );
    register("core/waivers:applyWaivers", waivers.applyWaivers, (call) =>
      vi.spyOn(waivers, "applyWaivers").mockImplementation(call),
    );
    register("core/fs:collectFilesByGlobs", fileScan.collectFilesByGlobs, (call) =>
      vi.spyOn(fileScan, "collectFilesByGlobs").mockImplementation(call),
    );
  } catch (error: unknown) {
    restore();
    throw error;
  }
  return { read: () => readers.map((read) => read()), restore };
}
