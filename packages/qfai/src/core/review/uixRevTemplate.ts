/**
 * UIX review template.
 *
 * Defines the canonical review items for the uix-rev reviewer.
 */

export type ReviewItemId =
  | "reference-pool-translation"
  | "anti-goal-enforcement"
  | "exploration-brief-quality"
  | "screen-contract-sufficiency"
  | "breakthrough-readiness"
  | "accept-refine-pivot-judgement";

export type ReviewItem = {
  id: ReviewItemId;
  name: string;
  description: string;
  evaluationCriteria: string[];
};

export const CANONICAL_REVIEW_ITEMS: readonly ReviewItem[] = [
  {
    id: "reference-pool-translation",
    name: "Reference Pool Translation",
    description:
      "Evaluates whether the reference pool is translated into product-specific design inputs rather than copied verbatim.",
    evaluationCriteria: [
      "Adopted and rejected reference points are both documented",
      "Local translation is specific to the product context",
      "Reference pool supports divergence instead of template fixation",
    ],
  },
  {
    id: "anti-goal-enforcement",
    name: "Anti-goal Enforcement",
    description:
      "Verifies anti-goals are explicit and actively excluded from exploration and polishing decisions.",
    evaluationCriteria: [
      "No anti-goal themes appear as positive design direction",
      "Explicit exclusion documentation is present",
      "Rejected directions align with anti-goals",
    ],
  },
  {
    id: "exploration-brief-quality",
    name: "Exploration Brief Quality",
    description:
      "Evaluates whether the planner output gives enough structure for divergent exploration without prematurely fixing a solution.",
    evaluationCriteria: [
      "Product intent is concrete and measurable",
      "Must-preserve interactions are explicit",
      "Brand signals and differentiation targets are actionable",
    ],
  },
  {
    id: "screen-contract-sufficiency",
    name: "Screen Contract Sufficiency",
    description:
      "Evaluates whether 40_screen_contracts.md provides complete, independently verifiable screen contracts.",
    evaluationCriteria: [
      "All 11 canonical fields present per screen",
      "Routes are unique across all contracts",
      "Required states include default/loading/empty/error",
    ],
  },
  {
    id: "breakthrough-readiness",
    name: "Breakthrough Readiness",
    description:
      "Evaluates whether the harness is prepared to branch when polishing stalls before completion.",
    evaluationCriteria: [
      "Best-of-history handling is documented",
      "Plateau / breakthrough conditions are explicit",
      "Breakthrough branches are compared against the incumbent instead of being ignored",
    ],
  },
  {
    id: "accept-refine-pivot-judgement",
    name: "Accept / Refine / Pivot Judgement",
    description:
      "Final reviewer judgement on whether the review input bundle (50_review_input_bundle.md) is ready for acceptance.",
    evaluationCriteria: [
      "Accept: all review items pass with sufficient quality",
      "Refine: specific items need improvement before acceptance",
      "Pivot: fundamental rework needed in approach or direction",
    ],
  },
] as const;

/**
 * Get the canonical list of review item IDs.
 */
export function getCanonicalReviewItemIds(): ReviewItemId[] {
  return CANONICAL_REVIEW_ITEMS.map((item) => item.id);
}

/**
 * Get a review item by ID.
 */
export function getReviewItem(id: ReviewItemId): ReviewItem | undefined {
  return CANONICAL_REVIEW_ITEMS.find((item) => item.id === id);
}

/**
 * Check if content contains generic fallback axes.
 */
export function detectGenericFallbackAxes(axesContent: string): string[] {
  const genericPatterns = [
    /\bvisual\s+consistency\b/i,
    /\busability\b/i,
    /\bgeneral\s+accessibility\b/i,
    /\bmodern\b/i,
    /\bclean\b/i,
  ];

  const genericAxes: string[] = [];
  for (const line of axesContent.split("\n")) {
    for (const pattern of genericPatterns) {
      if (pattern.test(line)) {
        const name = line.replace(/^[\s#-]+/, "").trim();
        if (name && !genericAxes.includes(name)) {
          genericAxes.push(name);
        }
      }
    }
  }
  return genericAxes;
}
