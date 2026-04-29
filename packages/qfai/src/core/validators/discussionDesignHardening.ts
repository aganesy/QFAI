import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { isDiscussionUiBearingPack } from "../detection/surfaceType.js";
import { findLatestDiscussionPackDir } from "../discussionPack.js";
import type { Issue, IssueSeverity } from "../types.js";
import { issue, readSafe } from "./utils.js";

const REQUIRED_SIDECARS = [
  "uiux/30_exploration_brief.md",
  "uiux/31_reference_pool.md",
  "uiux/32_design_anti_goals.md",
  "uiux/33_exploration_rubric.md",
  "uiux/34_evaluator_calibration.md",
  "uiux/40_screen_contracts.md",
  "uiux/50_review_input_bundle.md",
] as const;

const REFERENCE_POOL_COLUMNS = [
  "Kind",
  "Source URL",
  "Adopted points",
  "Rejected points",
  "Local translation",
  "Copy risk",
  "Template usage policy",
] as const;

const PLACEHOLDER_RE = /\[(?:adopted|rejected|translation|why|guideline|rule refs)\]/i;

function canonicalIssue(
  code: string,
  message: string,
  severity: IssueSeverity,
  file: string,
  rule: string,
): Issue {
  return issue(code, message, severity, file, rule, undefined, "canonical");
}

export async function validateDiscussionDesignHardening(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const discussionDir = path.join(root, config.paths.discussionDir);
  const packRoot = await findLatestDiscussionPackDir(discussionDir);
  if (!packRoot) return [];

  const uiBearing = await isDiscussionUiBearingPack(packRoot);
  if (!uiBearing) return [];

  const issues: Issue[] = [];
  for (const relPath of REQUIRED_SIDECARS) {
    const content = await readSafe(path.join(packRoot, relPath));
    if (!content) {
      issues.push(
        canonicalIssue(
          "UIX-VAL-EXPLORE-SIDECAR-MISSING",
          `Required exploration sidecar missing: ${relPath}.`,
          "error",
          relPath,
          "discussionDesignHardening.requiredSidecar",
        ),
      );
    }
  }

  issues.push(
    ...(await validateSection(
      packRoot,
      "uiux/30_exploration_brief.md",
      [
        "## Product Intent",
        "## Must-preserve Interactions",
        "## Brand Signals",
        "## Differentiation Targets",
      ],
      "UIX-VAL-EXPLORE-BRIEF",
    )),
  );

  issues.push(
    ...(await validateSection(
      packRoot,
      "uiux/33_exploration_rubric.md",
      [
        "## Design Quality",
        "## Originality",
        "## Craft",
        "## Functionality",
        "## Brand Memorability",
        "## Category Distinctiveness",
        "## Template Dependency Risk",
        "## Localization Fit",
      ],
      "UIX-VAL-EXPLORE-RUBRIC",
    )),
  );

  issues.push(
    ...(await validateSection(
      packRoot,
      "uiux/34_evaluator_calibration.md",
      [
        "## Good Critique",
        "## Too Lenient",
        "## Blandness Fail",
        "## Originality Fail",
        "## Template Copy Fail",
      ],
      "UIX-VAL-EVAL-CALIBRATION",
    )),
  );

  issues.push(...(await validateReferencePool(packRoot)));

  const antiGoals = await readSafe(path.join(packRoot, "uiux/32_design_anti_goals.md"));
  if (antiGoals && !/^- /m.test(antiGoals)) {
    issues.push(
      canonicalIssue(
        "UIX-VAL-EXPLORE-ANTI-GOALS",
        "32_design_anti_goals.md must contain at least one bullet anti-goal.",
        "error",
        "uiux/32_design_anti_goals.md",
        "discussionDesignHardening.antiGoals",
      ),
    );
  }

  const reviewBundle = await readSafe(path.join(packRoot, "uiux/50_review_input_bundle.md"));
  if (reviewBundle && !/best-of-history/i.test(reviewBundle)) {
    issues.push(
      canonicalIssue(
        "UIX-VAL-EXPLORE-HISTORY",
        "50_review_input_bundle.md must describe best-of-history handling for later iterations.",
        "warning",
        "uiux/50_review_input_bundle.md",
        "discussionDesignHardening.bestOfHistory",
      ),
    );
  }

  return issues;
}

async function validateReferencePool(packRoot: string): Promise<Issue[]> {
  const relPath = "uiux/31_reference_pool.md";
  const content = await readSafe(path.join(packRoot, relPath));
  if (!content) {
    return [];
  }

  const issues: Issue[] = [];
  for (const column of REFERENCE_POOL_COLUMNS) {
    if (!content.includes(column)) {
      issues.push(
        canonicalIssue(
          "UIX-VAL-REFERENCE-POOL",
          `${relPath} is missing required column '${column}'.`,
          "error",
          relPath,
          "discussionDesignHardening.referencePoolColumn",
        ),
      );
    }
  }

  if (PLACEHOLDER_RE.test(content)) {
    issues.push(
      canonicalIssue(
        "UIX-VAL-REFERENCE-POOL",
        `${relPath} contains unresolved placeholder text.`,
        "error",
        relPath,
        "discussionDesignHardening.referencePoolPlaceholder",
      ),
    );
  }

  return issues;
}

async function validateSection(
  packRoot: string,
  relPath: string,
  headings: string[],
  code: string,
): Promise<Issue[]> {
  const content = await readSafe(path.join(packRoot, relPath));
  if (!content) {
    return [];
  }
  const issues: Issue[] = [];
  for (const heading of headings) {
    if (!content.includes(heading)) {
      issues.push(
        canonicalIssue(
          code,
          `${relPath} is missing required heading '${heading}'.`,
          "error",
          relPath,
          "discussionDesignHardening.requiredHeading",
        ),
      );
    }
  }
  return issues;
}
