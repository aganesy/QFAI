/**
 * Surface adapter for prototyping evidence.
 *
 * Detects surface type and adapts evidence fields:
 * - Non-visual surfaces (CLI, API, library): visual-review = n/a
 * - Visual surfaces (web, mobile, desktop): visual-review = collected (when mode allows runtime)
 * - Low-cost mode: runtime and visual-review are always n/a (static-only)
 *
 * Phase M4 of v1.7.7 Mode Switch UX (spec-0006).
 */

export type SurfaceType = "web" | "mobile" | "desktop" | "cli" | "api" | "library";

type EvidenceStatus = "collected" | "n/a";

export type SurfaceEvidenceResult = {
  visual_review: EvidenceStatus;
  static_evidence: EvidenceStatus;
  runtime_evidence: EvidenceStatus;
};

export type SurfaceAdapterInput = {
  surfaceType: SurfaceType;
  effectiveMode: string;
};

const VISUAL_SURFACES: ReadonlySet<SurfaceType> = new Set(["web", "mobile", "desktop"]);

/**
 * Adapt evidence fields based on surface type and effective mode.
 *
 * @param input.surfaceType - The project's surface type
 * @param input.effectiveMode - The resolved effective prototyping mode
 * @returns Evidence field statuses adapted for the surface
 */
export function adaptSurfaceEvidence(input: SurfaceAdapterInput): SurfaceEvidenceResult {
  const { surfaceType, effectiveMode } = input;
  const isVisual = VISUAL_SURFACES.has(surfaceType);
  const isLowCost = effectiveMode === "low-cost";

  // Static evidence is always collected
  const static_evidence: EvidenceStatus = "collected";

  // Runtime evidence: n/a in low-cost mode
  const runtime_evidence: EvidenceStatus = isLowCost ? "n/a" : "collected";

  // Visual review: n/a if non-visual surface OR if low-cost mode (no runtime)
  const visual_review: EvidenceStatus = isVisual && !isLowCost ? "collected" : "n/a";

  return { visual_review, static_evidence, runtime_evidence };
}
