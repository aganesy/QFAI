/**
 * L2 evidence builders — v1.7.15
 *
 * Constructs L2 panel inputs from real discussion / screen contract / trend artifacts.
 * Zero-filling is prohibited. Missing artifacts → throw.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type {
  DiscussionAxisInputs,
  ScreenContractInputs,
  TrendAlignmentInputs,
} from "../harness/panelInputs.js";
import { findLatestDiscussionPackDir } from "../discussionPack.js";

/**
 * Build discussion axis inputs from real discussion artifacts.
 * Reads discussion pack and extracts axis counts + aggregate score.
 * Throws if no discussion pack or no evaluatable axes exist.
 */
export async function buildDiscussionAxisInputs(root: string): Promise<DiscussionAxisInputs> {
  const discussionRoot = path.join(root, ".qfai", "discussion");
  const latestPack = await findLatestDiscussionPackDir(discussionRoot);
  if (!latestPack) {
    throw new Error(
      "L2 evidence failure: no discussion pack found. " +
        "Full-harness requires a completed discussion pack under .qfai/discussion/.",
    );
  }

  // Read discussion files to extract axis information
  let invariantAxes = 0;
  let trendDerivedAxes = 0;
  let productSpecificAxes = 0;
  let aggregateScore = 0;
  let axisFileFound = false;
  const evidenceRefs: string[] = [latestPack];

  // Try reading OQ-Resolution-Log or structured evaluation output
  const filesToScan = [
    "12_OQ-Resolution-Log.md",
    "11_OQ-Register.md",
    "06_REQ.md",
    "07_NFR.md",
    "05_Scope.md",
  ];

  for (const fileName of filesToScan) {
    const filePath = path.join(latestPack, fileName);
    try {
      const content = await readFile(filePath, "utf-8");
      if (content.trim().length > 0) {
        evidenceRefs.push(filePath);

        // Extract axis counts from structured content
        const invariantMatches = content.match(/invariant|universal|core/gi);
        const trendMatches = content.match(/trend|market|competitive/gi);
        const productMatches = content.match(/product-specific|domain-specific|unique/gi);

        if (invariantMatches) invariantAxes += invariantMatches.length;
        if (trendMatches) trendDerivedAxes += trendMatches.length;
        if (productMatches) productSpecificAxes += productMatches.length;
        axisFileFound = true;
      }
    } catch {
      // File doesn't exist, continue
    }
  }

  if (!axisFileFound) {
    throw new Error(
      "L2 evidence failure: discussion pack exists but contains no evaluatable axes. " +
        "Ensure discussion pack has OQ-Register, REQ, NFR, or Scope files.",
    );
  }

  const totalAxes = invariantAxes + trendDerivedAxes + productSpecificAxes;
  if (totalAxes === 0) {
    throw new Error(
      "L2 evidence failure: discussion pack contains no classifiable axes (invariant/trend/product).",
    );
  }

  // Compute aggregate score based on coverage completeness
  // This is derived from the ratio of axis categories present
  const categoriesPresent =
    (invariantAxes > 0 ? 1 : 0) +
    (trendDerivedAxes > 0 ? 1 : 0) +
    (productSpecificAxes > 0 ? 1 : 0);
  aggregateScore = categoriesPresent / 3;

  return {
    invariantAxes,
    trendDerivedAxes,
    productSpecificAxes,
    aggregateScore,
    evidenceRefs,
  };
}

/**
 * Build screen contract inputs from real UI fidelity evidence.
 * Uses screen observations and contract coverage data.
 * Throws if no screen contract evidence exists.
 */
export function buildScreenContractInputs(
  root: string,
  uiFidelityScreens: Array<{
    route: string;
    uiContractId: string;
    observed: { elementsPlaced: number; actionsWired: number };
    expected: { elements: number; actions: number };
  }>,
): ScreenContractInputs {
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

  const evidenceRefs: string[] = uiFidelityScreens.map(
    (s) => `screen-contract:${s.uiContractId}:${s.route}`,
  );

  return {
    totalContracts,
    coveredContracts,
    fidelityScore,
    evidenceRefs,
  };
}

/**
 * Build trend alignment inputs from real trend research artifacts.
 * Reads trend scan / competitive analysis files.
 * Throws if no trend source evidence exists.
 */
export async function buildTrendAlignmentInputs(root: string): Promise<TrendAlignmentInputs> {
  const discussionRoot = path.join(root, ".qfai", "discussion");
  const latestPack = await findLatestDiscussionPackDir(discussionRoot);
  if (!latestPack) {
    throw new Error(
      "L2 evidence failure: no discussion pack for trend alignment. " +
        "Full-harness requires a completed discussion pack.",
    );
  }

  let trendSourcesChecked = 0;
  let translationConsistency = 0;
  let competitiveGapsCovered = 0;
  const evidenceRefs: string[] = [];

  // Scan for trend/competitive research artifacts
  const trendFiles = ["04_Sources.md", "05_Scope.md"];
  // Also check for uiux subdirectory trend artifacts
  const uiuxTrendFiles: string[] = [];
  const uiuxDir = path.join(latestPack, "uiux");
  try {
    const uiuxEntries = await readdir(uiuxDir);
    uiuxTrendFiles.push(
      ...uiuxEntries.filter(
        (e) =>
          e.includes("trend") ||
          e.includes("competitive") ||
          e.includes("reference") ||
          e.includes("10_"),
      ),
    );
  } catch {
    // uiux dir may not exist
  }

  for (const fileName of trendFiles) {
    const filePath = path.join(latestPack, fileName);
    try {
      const content = await readFile(filePath, "utf-8");
      if (content.trim().length > 0) {
        evidenceRefs.push(filePath);
        // Count trend sources from structured references
        const sourceMatches = content.match(/https?:\/\/[^\s)]+/g);
        if (sourceMatches) trendSourcesChecked += sourceMatches.length;
        // Check for competitive gap references
        const gapMatches = content.match(/competitive|gap|benchmark|alternative/gi);
        if (gapMatches) competitiveGapsCovered += gapMatches.length;
      }
    } catch {
      // File doesn't exist
    }
  }

  for (const fileName of uiuxTrendFiles) {
    const filePath = path.join(uiuxDir, fileName);
    try {
      const content = await readFile(filePath, "utf-8");
      if (content.trim().length > 0) {
        evidenceRefs.push(filePath);
        const sourceMatches = content.match(/https?:\/\/[^\s)]+/g);
        if (sourceMatches) trendSourcesChecked += sourceMatches.length;
        const gapMatches = content.match(/competitive|gap|benchmark|alternative/gi);
        if (gapMatches) competitiveGapsCovered += gapMatches.length;
      }
    } catch {
      // File doesn't exist
    }
  }

  if (trendSourcesChecked === 0) {
    throw new Error(
      "L2 evidence failure: no trend sources found. " +
        "Full-harness requires at least one trend/competitive research source.",
    );
  }

  // Translation consistency based on coverage of trend sources in discussion
  translationConsistency = Math.min(1, trendSourcesChecked / 5);

  return {
    trendSourcesChecked,
    translationConsistency,
    competitiveGapsCovered: Math.min(competitiveGapsCovered, trendSourcesChecked),
    evidenceRefs,
  };
}
