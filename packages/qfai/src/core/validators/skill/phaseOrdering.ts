/**
 * SKILL.md phase-ordering validator.
 *
 * Checks that Phase A appears before Phase B in the Required Process step 9 entry.
 * A mutation swapping their order is a dependency violation.
 */

export interface PhaseOrderingIssue {
  readonly rule: "SKILL-PHASE-ORDER";
  readonly message: string;
}

export function validatePhaseOrdering(skillMdContent: string): PhaseOrderingIssue[] {
  const phaseAIdx = skillMdContent.indexOf("Phase A");
  const phaseBIdx = skillMdContent.indexOf("Phase B");

  if (phaseAIdx === -1 || phaseBIdx === -1) {
    return [];
  }

  if (phaseBIdx < phaseAIdx) {
    return [
      {
        rule: "SKILL-PHASE-ORDER",
        message:
          "Phase B appears before Phase A in SKILL.md Required Process step 9; Phase A (brand selection) MUST precede Phase B (customization).",
      },
    ];
  }

  return [];
}
