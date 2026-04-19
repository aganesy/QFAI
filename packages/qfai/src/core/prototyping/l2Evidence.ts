/**
 * L2 evidence builders — v1.7.15
 *
 * Constructs L2 panel inputs from real discussion / screen contract / trend artifacts.
 * Zero-filling is prohibited. Missing artifacts → throw.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  DiscussionAxisInputs,
  ScreenContractInputs,
  TrendAlignmentInputs,
} from "../harness/panelInputs.js";
import { findLatestDiscussionPackDir } from "../discussionPack.js";
import { toRepoRelativeArtifactRef } from "./pathUtils.js";
import { readCanonicalScreenContracts } from "./screenContracts.js";
import {
  readRequiredAggregateScore,
  readRequiredAxisCount,
  readRequiredBulletCount,
  readRequiredFieldCount,
  readRequiredScreenCount,
} from "./structuredArtifactReaders.js";

/**
 * Build discussion axis inputs from real discussion artifacts.
 * Reads discussion pack and extracts axis counts + aggregate score.
 * Throws if no discussion pack or no evaluatable axes exist.
 *
 * `discussionDir` is the absolute path of the configured discussion directory
 * (resolved from `paths.discussionDir`). Defaults to `<root>/.qfai/discussion`
 * when omitted so standalone callers / tests work without the config layer.
 */
export async function buildDiscussionAxisInputs(
  root: string,
  discussionDir?: string,
): Promise<DiscussionAxisInputs> {
  const discussionRoot = discussionDir ?? path.join(root, ".qfai", "discussion");
  const latestPack = await findLatestDiscussionPackDir(discussionRoot);
  if (!latestPack) {
    throw new Error(
      "L2 evidence failure: no discussion pack found. " +
        "Full-harness requires a completed discussion pack under .qfai/discussion/.",
    );
  }

  const invariantPath = path.join(latestPack, "uiux", "20_design_eval_invariant.md");
  const trendPath = path.join(latestPack, "uiux", "21_design_eval_trend_derived.md");
  const productPath = path.join(latestPack, "uiux", "22_design_eval_product_specific.md");
  const aggregatePath = path.join(latestPack, "uiux", "23_design_eval_aggregate.md");

  const [invariantRaw, trendRaw, productRaw, aggregateRaw] = await Promise.all([
    readRequiredFile(invariantPath),
    readRequiredFile(trendPath),
    readRequiredFile(productPath),
    readRequiredFile(aggregatePath),
  ]);

  return {
    invariantAxes: readRequiredAxisCount(invariantRaw),
    trendDerivedAxes: readRequiredAxisCount(trendRaw),
    productSpecificAxes: readRequiredAxisCount(productRaw),
    aggregateScore: readRequiredAggregateScore(aggregateRaw),
    evidenceRefs: [
      toRepoRelativeArtifactRef({
        repoRoot: root,
        absolutePath: invariantPath,
        anchor: "discussion-axes-invariant",
      }),
      toRepoRelativeArtifactRef({
        repoRoot: root,
        absolutePath: trendPath,
        anchor: "discussion-axes-trend-derived",
      }),
      toRepoRelativeArtifactRef({
        repoRoot: root,
        absolutePath: productPath,
        anchor: "discussion-axes-product-specific",
      }),
      toRepoRelativeArtifactRef({
        repoRoot: root,
        absolutePath: aggregatePath,
        anchor: "discussion-axes-aggregate",
      }),
    ],
    degradedScoring: false,
  };
}

/**
 * Build screen contract inputs from real UI fidelity evidence.
 * Uses screen observations and contract coverage data.
 * Throws if no screen contract evidence exists.
 */
export async function buildScreenContractInputs(
  root: string,
  uiFidelityScreens: Array<{
    route: string;
    uiContractId: string;
    screenId?: string;
    observed: { elementsPlaced: number; actionsWired: number };
    expected: { elements: number; actions: number };
  }>,
  discussionDir?: string,
): Promise<ScreenContractInputs> {
  if (uiFidelityScreens.length === 0) {
    throw new Error(
      "L2 evidence failure: no screen contract evidence. " +
        "Full-harness requires UI fidelity screens with contract coverage.",
    );
  }

  const totalContracts = uiFidelityScreens.length;
  const coveredContracts = uiFidelityScreens.filter((s) => s.observed.elementsPlaced > 0).length;

  // Compute fidelity score from actual observation vs expected
  let totalFidelity = 0;
  for (const screen of uiFidelityScreens) {
    const expectedTotal = screen.expected.elements + screen.expected.actions;
    if (expectedTotal === 0) {
      totalFidelity += 1; // No expectations = trivially satisfied
      continue;
    }
    const observedTotal = screen.observed.elementsPlaced + screen.observed.actionsWired;
    totalFidelity += Math.min(1, observedTotal / expectedTotal);
  }
  const fidelityScore = totalFidelity / totalContracts;

  const latestPack = await findLatestDiscussionPackDir(
    discussionDir ?? path.join(root, ".qfai", "discussion"),
  );
  if (!latestPack) {
    throw new Error(
      "L2 evidence failure: no discussion pack found for screen contract evidence. " +
        "Full-harness requires 40_screen_contracts.md.",
    );
  }
  const declaredContracts = await readCanonicalScreenContracts(latestPack);
  const degradedScoring = declaredContracts.length === 0;
  const declaredByScreenId = new Map(declaredContracts.map((screen) => [screen.screenId, screen]));
  const declaredByRoute = new Map(declaredContracts.map((screen) => [screen.route, screen]));
  const evidenceRefs: string[] = uiFidelityScreens.map((screen) => {
    const declared =
      (screen.screenId ? declaredByScreenId.get(screen.screenId) : undefined) ??
      declaredByRoute.get(screen.route);
    if (!declared) {
      throw new Error(
        `L2 evidence failure: no canonical screen contract sourceRef for route "${screen.route}".`,
      );
    }
    return declared.sourceRef;
  });

  return {
    totalContracts,
    coveredContracts,
    fidelityScore,
    evidenceRefs,
    degradedScoring,
  };
}

/**
 * Build trend alignment inputs from real trend research artifacts.
 * Reads trend scan / competitive analysis files.
 * Throws if no trend source evidence exists.
 */
export async function buildTrendAlignmentInputs(
  root: string,
  discussionDir?: string,
): Promise<TrendAlignmentInputs> {
  const discussionRoot = discussionDir ?? path.join(root, ".qfai", "discussion");
  const latestPack = await findLatestDiscussionPackDir(discussionRoot);
  if (!latestPack) {
    throw new Error(
      "L2 evidence failure: no discussion pack for trend alignment. " +
        "Full-harness requires a completed discussion pack.",
    );
  }

  const sourcesPath = path.join(latestPack, "04_Sources.md");
  const screenContractsPath = path.join(latestPack, "uiux", "40_screen_contracts.md");
  const [content, screenContractsRaw] = await Promise.all([
    readRequiredFile(sourcesPath),
    readRequiredFile(screenContractsPath),
  ]);
  const trendSourcesChecked = readRequiredBulletCount(content, "Trend Scan");
  const competitiveGapsCovered = readRequiredBulletCount(content, "Competitive Reference Registry");
  const structuredSignals = [
    readRequiredFieldCount(content, "translation"),
    readRequiredFieldCount(content, "local_implication"),
    readRequiredFieldCount(content, "decision_connection"),
    readRequiredFieldCount(content, "evaluation_connection"),
  ];
  readRequiredScreenCount(screenContractsRaw);
  const translationConsistency =
    structuredSignals.reduce((sum, signal) => sum + Math.min(signal, 1), 0) /
    structuredSignals.length;

  if (trendSourcesChecked === 0) {
    throw new Error(
      "L2 evidence failure: no trend sources found. " +
        "Full-harness requires at least one trend/competitive research source.",
    );
  }

  return {
    trendSourcesChecked,
    translationConsistency,
    competitiveGapsCovered,
    evidenceRefs: [
      toRepoRelativeArtifactRef({
        repoRoot: root,
        absolutePath: sourcesPath,
        anchor: "trend-scan",
      }),
      toRepoRelativeArtifactRef({
        repoRoot: root,
        absolutePath: screenContractsPath,
        anchor: "screen-contracts",
      }),
    ],
    degradedScoring: false,
  };
}

async function readRequiredFile(filePath: string): Promise<string> {
  try {
    const raw = await readFile(filePath, "utf-8");
    if (raw.trim().length === 0) {
      throw new Error("file is empty");
    }
    return raw;
  } catch (error) {
    throw new Error(
      `L2 evidence failure: required canonical artifact is missing or unreadable: ${filePath}. ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
