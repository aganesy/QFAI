/**
 * SSOT-sync pair manifest for the per-skill `runtimeDependencies`
 * surface (Pair III).
 *
 * Two source files MUST agree on the canonical field name that names a
 * skill's runtime npm dependencies:
 *
 *   - the doctor probe implementation that reads the manifest and
 *     probes node_modules for each declared dep
 *     (`packages/qfai/src/core/doctor/skillManifestProbe.ts`).
 *   - the manifest-schema declaration owned by the skill-governance
 *     surface (`packages/qfai/src/core/schemas/skillManifest.ts`).
 *
 * Drift form: one side references the canonical field name (the
 * `probeToken` / `schemaToken` below) and the other side does NOT.
 * Symmetric absent/present pairs raise no finding.
 *
 * Tokens are short, stable substrings — no regex — to keep the pair
 * check deterministic and cheap. Mirrors `MOCK_HREF_PAIRS` /
 * `EVIDENCE_MUTATION_PAIRS`.
 */

export const SKILL_MANIFEST_PROBE_IMPL_REL = "packages/qfai/src/core/doctor/skillManifestProbe.ts";

export const SKILL_MANIFEST_SCHEMA_REL = "packages/qfai/src/core/schemas/skillManifest.ts";

export type SkillManifestPair = {
  /** Stable human-readable clause name (used in justification text). */
  readonly clause: string;
  /** Probe-side source file. */
  readonly probeImplRel: string;
  /** Schema-side source file. */
  readonly schemaRel: string;
  /** Substring whose presence proves the probe references the canonical field name. */
  readonly probeToken: string;
  /** Substring whose presence proves the schema declares the canonical field name. */
  readonly schemaToken: string;
};

export const SKILL_MANIFEST_PAIRS: readonly SkillManifestPair[] = [
  {
    clause: "skill-manifest-runtime-dependencies-field",
    probeImplRel: SKILL_MANIFEST_PROBE_IMPL_REL,
    schemaRel: SKILL_MANIFEST_SCHEMA_REL,
    probeToken: "SKILL_MANIFEST_RUNTIME_DEPENDENCIES_FIELD",
    schemaToken: "SKILL_MANIFEST_RUNTIME_DEPENDENCIES_FIELD",
  },
];
