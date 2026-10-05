/**
 * The paths of the prototyping state file, which an artifact reference must
 * never point at.
 */

/** Project-root relative path to the prototyping state file. */
export const PROTOTYPING_JSON_REL = ".qfai/evidence/prototyping/prototyping.json" as const;

/** The location the state file had before it moved under `prototyping/`. */
export const PROTOTYPING_JSON_LEGACY_REL = ".qfai/evidence/prototyping.json" as const;
