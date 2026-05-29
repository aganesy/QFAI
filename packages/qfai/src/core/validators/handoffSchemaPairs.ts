/**
 * SSOT-sync pair manifest for the CLI-HANDOFF canonical schema (Pair IV).
 *
 * The schema source-of-truth lives at
 * `packages/qfai/src/core/schemas/handoff.ts`. Every skill writer that
 * persists a `handoff.yaml` MUST reference the canonical fields from
 * that schema (via import or a literal write of the same fields).
 *
 * The pair check is structural: when the schema source declares field X
 * in `HANDOFF_MINIMUM_FIELDS`, every registered writer file must also
 * mention field X verbatim (substring containment, no regex). Asymmetric
 * edits — schema-side add without writer update, or writer-side write
 * of a field NOT in the schema — fire `R-HANDOFF-SCHEMA-DRIFT`.
 *
 * Tokens are short, stable substrings so the check stays deterministic.
 */
export const HANDOFF_SCHEMA_REL = "packages/qfai/src/core/schemas/handoff.ts";

export type HandoffWriterPair = {
  /** Stable human-readable clause name. */
  readonly clause: string;
  /** Writer source file that persists a handoff payload. */
  readonly writerRel: string;
  /**
   * Stable token whose presence in `writerRel` proves the writer
   * intentionally targets the canonical handoff surface. Drift form is
   * "writer says it writes handoff but doesn't reference the canonical
   * fields from `HANDOFF_MINIMUM_FIELDS`".
   */
  readonly writerToken: string;
};

/**
 * Initial registered writer list. Add a new entry whenever a new skill
 * gains a handoff-write call-site. The current canonical writer is the
 * library `core/handoff/writer.ts`; future skill-side writers must
 * register here so the pair-sync scan catches missing fields.
 */
export const HANDOFF_WRITER_PAIRS: readonly HandoffWriterPair[] = [
  {
    clause: "canonical-handoff-writer",
    writerRel: "packages/qfai/src/core/handoff/writer.ts",
    writerToken: "HandoffArtifact",
  },
];
