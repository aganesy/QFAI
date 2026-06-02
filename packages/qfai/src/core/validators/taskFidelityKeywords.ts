/**
 * SSOT for the required `taskFidelity` keyword set surfaced by
 * `QFAI-CRIT-009` and the shipped `references/evidence-requirements.md`
 * reference doc.
 *
 * The renderCritique validator, the `--capture` template emitter, and
 * the operator-facing doc all read this list so the keyword set never
 * silently drifts between the three surfaces.
 */

export const TASK_FIDELITY_REQUIRED_KEYWORDS: readonly string[] = [
  "cta_visibility",
  "four_state_check",
] as const;

/**
 * Operator-facing section name the validator references in its error
 * text. Centralized so the doc + validator + template emitter agree on
 * the wording.
 */
export const TASK_FIDELITY_SECTION_NAME = "## taskFidelity";
