/**
 * Every validation profile `qfai validate` and `qfai report` accept, in the order the CLI
 * lists them. The `ValidationProfile` type, the argument parser, the report's input check
 * and the help text all read this one list, so a profile added or removed here reaches
 * every consumer.
 */
export const VALIDATION_PROFILES = [
  "discussion",
  "sdd",
  "prototyping",
  "atdd",
  "tdd",
  "verify",
  "full",
  "saas-package",
  // Runs the drift guard alone. `tdd` evaluates it too, and is also the
  // completion gate, so a run that only wants the drift answer had to accept
  // every completion obligation with it.
  "drift",
] as const;

export type ValidationProfile = (typeof VALIDATION_PROFILES)[number];

/** The profiles as the CLI prints them in a usage line: `discussion|sdd|...`. */
export const VALIDATION_PROFILE_CHOICES = VALIDATION_PROFILES.join("|");

export function isValidationProfile(value: unknown): value is ValidationProfile {
  return VALIDATION_PROFILES.some((profile) => profile === value);
}
