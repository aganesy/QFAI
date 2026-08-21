/**
 * Non-UI over-fire regression validator.
 *
 * Verifies that all UI-bearing validators produce zero fires
 * when run against a non-UI project fixture.
 */
import type { QfaiConfig } from "../../config.js";
import type { Issue } from "../../types.js";
import { validateAntiPreference } from "./antiPreference.js";
import { validateCompetitiveReferences } from "./competitiveRefs.js";
import { validateOptionComparison } from "./comparisonValidator.js";
import { validateScreenContractSchema } from "./screenContract.js";
import { validateStrategyStrong } from "./strategy.js";
import { validateTasteInterview } from "./taste.js";
import { validateTasteReflection } from "./tasteReflection.js";
import { validateThreeLayerModel } from "./threeLayer.js";
import { validateTrendScan } from "./trend.js";

/**
 * Run all UI-bearing validators against a pack and count fires.
 * Used as a regression test for non-UI safety.
 */
export async function countUiBearingFires(
  root: string,
  config: QfaiConfig,
): Promise<{ fireCount: number; issues: Issue[] }> {
  const validators = [
    validateTasteInterview,
    validateTrendScan,
    validateThreeLayerModel,
    validateStrategyStrong,
    validateScreenContractSchema,
    validateOptionComparison,
    validateTasteReflection,
    validateAntiPreference,
    validateCompetitiveReferences,
  ];

  const allIssues: Issue[] = [];
  for (const validator of validators) {
    const issues = await validator(root, config);
    allIssues.push(...issues);
  }

  return { fireCount: allIssues.length, issues: allIssues };
}
