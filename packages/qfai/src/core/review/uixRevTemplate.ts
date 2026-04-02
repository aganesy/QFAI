/**
 * UIX review template — spec-0037
 *
 * Defines the 5 canonical review items for the uix-rev reviewer.
 *
 * BR-0037-0001 through BR-0037-0006
 */

export type ReviewItemId =
  | "taste-reflection-quality"
  | "anti-preference-enforcement"
  | "trend-relevance-freshness"
  | "dynamic-axis-specificity"
  | "generic-fallback-persistence";

export type ReviewItem = {
  id: ReviewItemId;
  name: string;
  description: string;
  evaluationCriteria: string[];
};

export const CANONICAL_REVIEW_ITEMS: readonly ReviewItem[] = [
  {
    id: "taste-reflection-quality",
    name: "Taste Reflection Quality",
    description:
      "Evaluates whether taste interview responses are reflected in selected direction, strategy, and evaluation artifacts.",
    evaluationCriteria: [
      "Presence of taste themes in selected direction / 3-layer evaluation family",
      "Specificity of reflection vs generic parroting",
      "Taste interview sections are reflected across selected direction, strategy, and evaluation layers",
    ],
  },
  {
    id: "anti-preference-enforcement",
    name: "Anti-Preference Enforcement",
    description:
      "Verifies anti-preferences from the taste interview are excluded from selected direction and strategy decisions.",
    evaluationCriteria: [
      "No anti-preference themes appear as positive design direction",
      "Explicit exclusion documentation present",
      "Cross-reference with taste interview anti_preferences section",
    ],
  },
  {
    id: "trend-relevance-freshness",
    name: "Trend Relevance & Freshness",
    description: "Evaluates temporal relevance and session-specificity of referenced trends.",
    evaluationCriteria: [
      "Freshness date check against configurable window",
      "Domain alignment between trend and project context",
      "Source translation quality assessment",
      "Confidence level appropriateness for use case",
    ],
  },
  {
    id: "dynamic-axis-specificity",
    name: "Dynamic Axis Specificity",
    description:
      "Checks axes are project-specific and derived from taste/trend inputs, not generic defaults.",
    evaluationCriteria: [
      "Axes reference taste interview sources",
      "Axes reference trend scan sources",
      "No boilerplate axes without taste/trend derivation",
      "Layer assignment matches source type (invariant/trend-derived/product-specific)",
    ],
  },
  {
    id: "generic-fallback-persistence",
    name: "Generic Fallback Persistence",
    description:
      "Flags generic/placeholder axes remaining after taste/trend specialization should have occurred.",
    evaluationCriteria: [
      "Count of generic axes that should have been specialized = 0",
      "Generic axis names like 'visual consistency' without source derivation are flagged",
      "Cross-check with trend scan for available specialization candidates",
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
    /\busability\b(?!.*source_translation)/i,
    /\bgeneral\s+accessibility\b/i,
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
