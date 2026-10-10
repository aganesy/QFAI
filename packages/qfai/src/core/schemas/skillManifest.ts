/**
 * Declares runtimeDependencies for skill manifests.
 *
 * packageSelfGovernance runs skillManifestDrift against the source-file pairs
 * registered in skillManifestPairs. The check reads this file and the doctor
 * probe source to detect mismatched field-name tokens. The doctor probe uses
 * its own constant; it does not import this module.
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
