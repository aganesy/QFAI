/**
 * Skill manifest schema (Pair III SSOT-side).
 *
 * The full manifest schema (file location, validation rules, distributed-surface
 * lint) is owned by the skill-governance slice; this module exposes only the
 * canonical field-name token that the doctor probe and the schema MUST agree
 * on. The pair check in `validators/skillManifestDrift.ts` scans for this
 * token on both sides.
 */

export const SKILL_MANIFEST_RUNTIME_DEPENDENCIES_FIELD = "runtimeDependencies";

export type SkillManifestRuntimeDependencyName = string;

export type SkillManifest = {
  /**
   * List of npm package names whose presence the doctor probes when
   * `qfai doctor --profile <skill>` is invoked. Each entry is an
   * npm-spec name (no version), e.g. `"playwright"`.
   */
  readonly runtimeDependencies?: readonly SkillManifestRuntimeDependencyName[];
};
