import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import type { FailOn, OutputFormat, QfaiConfig } from "../../core/config.js";
import { loadConfig } from "../../core/config.js";
import { normalizeValidationResult } from "../../core/normalize.js";
import { isStoryTreeId } from "../../core/storyTree/ids.js";
import { hasStoryTreeEntries, resolveStoryTreeRoots } from "../../core/storyTree/layout.js";
import { buildCiProfileIssue } from "../../core/phasePolicy.js";
import { toRelativePath } from "../../core/paths.js";
import { ATTESTATION_MISSING_CODE, HANDOFF_SCHEMA_CODE } from "../../core/saasPackage/profile.js";
import { saasPackageSkippedGateFamilies } from "../../core/saasPackage/skippedGates.js";
import type {
  Issue,
  ValidationProfile,
  ValidationResult,
  ValidationTimings,
} from "../../core/types.js";
import {
  PACKAGE_SELF_GOVERNANCE_FAMILIES,
  unevaluatedPackageSelfGovernanceFamilies,
} from "../../core/validators/packageSelfGovernance.js";
import { writeValidateRunLog } from "../../core/runLog.js";
import { validateProject } from "../../core/validate.js";
import { resolveToolPackageDir, resolveToolVersion } from "../../core/version.js";
import { resolveFailOn, shouldFail, strictSupersededBy } from "../lib/failOn.js";
import { buildIncompleteRunIssue, incompleteRunResult } from "../lib/warnings.js";

export type ValidateOptions = {
  root: string;
  strict: boolean;
  failOn?: FailOn;
  format?: OutputFormat;
  profile?: ValidationProfile;
  platform?: string;
  /** Restrict a story-tree run to the named business flows (`--flow`, repeatable). */
  flowIds?: readonly string[];
  /**
   * Override the tool version this run reports as its own.
   *
   * It reaches the provenance line and the result of a run that could not
   * complete. Operational callers leave it undefined; production reads
   * `packages/qfai/package.json#version`.
   */
  toolVersionOverride?: string;
};

/**
 * The release that retired the legacy `.qfai/output/validate.json` write path.
 *
 * Nothing compares against it: the path is not written and the finding is an
 * `error`. It appears in the message so an operator meeting the finding knows
 * which release stopped writing the file they are still reading.
 */
const LEGACY_VALIDATE_JSON_SUNSET = "1.10.0";
const LEGACY_VALIDATE_JSON_REL = ".qfai/output/validate.json";

async function pathExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Normalize a configured path for comparison against the legacy
 * literal. Lowercased, posix-slashed, leading `./` stripped, repeated
 * slashes collapsed. Comparison is case-insensitive only on the textual
 * normalization step (no filesystem casing inspection) so the rule
 * fires identically on Windows + macOS + Linux configs.
 */
function normalizeForLegacyMatch(p: string): string {
  return p.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/^\.\//, "").toLowerCase();
}

/**
 * True when the configured validate JSON path is the legacy
 * `.qfai/output/validate.json` SSOT (the canonical path has since
 * moved to `.qfai/report/validate.json`). Absolute paths are never
 * treated as legacy — the legacy SSOT is the relative repo-rooted
 * literal only; operators who deliberately point at an absolute path
 * have explicitly opted out of the canonical SSOT.
 *
 * Exported so `report --run-validate` gates on the same predicate. That command
 * writes a validate result too, and a private copy of the rule here meant the
 * report path bypassed the migration gate the validate path enforces.
 */
export function configTargetsLegacyValidateJsonPath(configuredPath: string): boolean {
  if (path.isAbsolute(configuredPath)) return false;
  return normalizeForLegacyMatch(configuredPath) === LEGACY_VALIDATE_JSON_REL;
}

/**
 * Outcome of the legacy `validate.json` migration gate: the
 * `D-DEPRECATED-PATH` finding a run must carry (if any) plus the writer
 * decisions derived from the same signals.
 */
export type LegacyValidateJsonGate = {
  /** Finding to append to the run's result, or `null` when none is due. */
  issue: Issue | null;
  /** True when `output.validateJsonPath` still names the legacy SSOT. */
  configTargetsLegacyPath: boolean;
  /** True when the writer must refuse the configured (legacy) target. */
  refuseConfiguredLegacyWrite: boolean;
};

/**
 * Evaluate the legacy `.qfai/output/validate.json` migration gate.
 *
 * Shared by `qfai validate` and `qfai report --run-validate`: both run
 * `validateProject` and then write `output.validateJsonPath`, so both owe the
 * operator the same finding and the same post-sunset write refusal. When only
 * `validate` applied it, `report --run-validate` — the documented single-step
 * CI usage — re-created the legacy path and exited 0 on a project `validate`
 * rejects with exit 1.
 */
export async function evaluateLegacyValidateJsonGate(args: {
  root: string;
  configuredValidateJsonPath: string;
}): Promise<LegacyValidateJsonGate> {
  // Detect whether the operator's project config still aims the writer
  // at the legacy SSOT. This is a stronger signal than "the legacy file
  // exists on disk" — even a clean filesystem will trigger the gate if
  // the config points there, because the writer is about to recreate
  // the stale path on this very run.
  const configTargetsLegacyPath = configTargetsLegacyValidateJsonPath(
    args.configuredValidateJsonPath,
  );
  // The finding is due only where there is observable evidence — the config or
  // a file on disk — that a consumer still depends on the legacy path.
  // Otherwise every clean run would carry an unactionable error for a path the
  // project never used. A `--flow` scope may not suppress it: the evidence is
  // of a dependency this project has, and suppressing it would let a scoped run
  // walk past the migration gate with exit 0.
  const legacyOnDisk = await pathExists(path.join(args.root, LEGACY_VALIDATE_JSON_REL));
  const emitDeprecationIssue = legacyOnDisk || configTargetsLegacyPath;
  return {
    issue: emitDeprecationIssue
      ? buildDeprecationIssue({
          configTargetsLegacyPath,
        })
      : null,
    configTargetsLegacyPath,
    // The legacy SSOT is dead: a config that still names it is refused, which
    // is the migration gate.
    refuseConfiguredLegacyWrite: configTargetsLegacyPath,
  };
}

export async function runValidate(options: ValidateOptions): Promise<number> {
  const startedAt = new Date();
  const root = path.resolve(options.root);
  const configResult = await loadConfig(root);
  // The CI narrow-profile finding is appended to a real run, not substituted
  // for one. Replacing the run made every stage gate that names a narrow
  // profile unreachable in CI.
  const ciProfileIssue = buildCiProfileIssue(options.profile);
  // Wrapped, because an unhandled rejection here would leave the operator with
  // one stderr line and no verdict — no `counts:`, no `run-log:`, no
  // `validate.json` — and every shipped skill pipes validate through `| tail`,
  // so that line would be all an agent sees. Enumerating the `stat` sites
  // that can raise reduces the ways in; this is what answers when the next one
  // appears.
  //
  // `unknown`, deliberately not narrowed to a filesystem error: the point is a
  // verdict for anything unexpected, and a narrowed catch would put the next
  // unclassified failure back on the path this exists to close.
  let validated: ValidationResult;
  try {
    validated = await validateProject(root, configResult, {
      ...(options.profile ? { profile: options.profile } : {}),
      ...(options.platform ? { platform: options.platform } : {}),
      ...(options.flowIds && options.flowIds.length > 0 ? { flowIds: options.flowIds } : {}),
    });
  } catch (error: unknown) {
    validated = incompleteRunResult(
      options.toolVersionOverride ?? (await resolveToolVersion()),
      buildIncompleteRunIssue(error, "validate"),
      options.profile,
    );
  }
  const rawResult = ciProfileIssue
    ? {
        ...validated,
        issues: [...validated.issues, ciProfileIssue],
        counts: { ...validated.counts, warning: validated.counts.warning + 1 },
      }
    : validated;
  // Test callers override; production reads the same package.json#version the
  // rest of the toolchain uses (so the source-of-truth is single). Resolved
  // once here and handed to the gate, which would otherwise read it again.
  const effectiveToolVersion = options.toolVersionOverride ?? (await resolveToolVersion());
  await emitProvenance(effectiveToolVersion);
  const configuredValidateJsonPath = configResult.config.output.validateJsonPath;
  const scopedFlowIds = options.flowIds ?? [];
  const legacyGate = await evaluateLegacyValidateJsonGate({
    root,
    configuredValidateJsonPath,
  });
  const { refuseConfiguredLegacyWrite } = legacyGate;
  const result: ValidationResult = legacyGate.issue
    ? appendIssue(rawResult, legacyGate.issue)
    : rawResult;
  const normalized = normalizeValidationResult(root, result);
  // `!== false` rather than a truth test: a result that carries no claim (one
  // not produced by `validateProject`) keeps the ordinary per-profile wording.
  const partialProfileNotice = normalized.issues.some((item) => item.code === "QFAI-LAYOUT-001")
    ? null
    : buildPartialProfileNotice(
        normalized.profile,
        normalized.profileValidatorsRan !== false,
        await unevaluatedPackageSelfGovernanceFamilies(root),
      );
  if (partialProfileNotice) {
    normalized.issues.push(partialProfileNotice);
    normalized.counts = recountIssues(normalized.counts, partialProfileNotice);
  }

  const failOn = resolveFailOn(options, configResult.config.validation.failOn);
  // No special case for an incomplete run. `QFAI-SCAN-002` is an `error`, so
  // `counts.error` is non-zero and `shouldFail` already fails the run under
  // every `--fail-on` but `never` — which is the one exception a caller asked
  // for explicitly, and there the finding is still in the output and in
  // `validate.json`.
  //
  // A second guard such as `runIncomplete || …` here would be unreachable,
  // because the severity is what decides. The invariant it would protect — that
  // this finding stays an `error` — is pinned in `validateRunIncomplete.test.ts`,
  // which is where it can fail.
  if (strictSupersededBy(options)) {
    emitStrictSupersededNotice(failOn);
  }
  const willFail = shouldFail(normalized, failOn);

  const runLog = await writeValidateRunLog({
    root,
    config: configResult.config,
    result: normalized,
    startedAt,
    command: "/qfai-validate",
    status: willFail ? "fail" : "pass",
    failOn,
  });
  const runLogPath = toRelativePath(root, runLog.reportDir);

  // A `--flow` run is one worker's view of one slice, so it writes its own
  // report rather than the shared one. Resolve it BEFORE the GitHub summary:
  // pointed at the shared `validate.json`, that summary would name a file this
  // run never wrote — either missing, or a stale repo-wide report from another
  // run — and the findings dropped by the annotation cap would be unreachable.
  const scopedReportRel =
    scopedFlowIds.length > 0 ? scopedReportPath(configuredValidateJsonPath, scopedFlowIds) : null;

  const format = options.format ?? "text";
  if (format === "text") {
    emitText(normalized, failOn);
    emitTextRunLog(runLogPath);
  }
  if (format === "github") {
    const jsonPath = resolveJsonPath(
      root,
      scopedReportRel ?? configResult.config.output.validateJsonPath,
    );
    emitGitHubOutput(normalized, root, jsonPath, {
      failOn,
      willFail,
      runLogPath,
    });
  }
  if (scopedFlowIds.length > 0) {
    // Writing a scoped result to the shared `validate.json` /
    // `validate-<profile>.json` / legacy path would let parallel Slice workers
    // race on the same files, leaving the last finisher's single flow looking
    // like a repo-wide PASS to every downstream reader.
    //
    // The migration gate applies here too. `scopedReportPath` derives its
    // directory from `output.validateJsonPath`, so a config still pointing at
    // the legacy SSOT would put `validate.flow-0003.json` inside the
    // deprecated directory — new files appearing under a path the gate exists
    // to retire, which reads as "still fine to write here".
    if (
      scopedReportRel !== null &&
      !refuseConfiguredLegacyWrite &&
      !normalized.issues.some((issue) => issue.code === "QFAI-FLOW-005")
    ) {
      await emitJson(normalized, root, scopedReportRel);
    }
  } else {
    // Always-latest report + profile-suffixed report.
    // Post-sunset, refuse to write to the configured legacy path: the
    // migration gate must direct the operator to update their config
    // instead of silently producing a stale-named file. The accompanying
    // deprecation issue (severity=error) already carries the actionable
    // text; here we just skip the physical write.
    if (!refuseConfiguredLegacyWrite) {
      await emitJson(normalized, root, configuredValidateJsonPath);
      const profileLabel = normalized.profile ?? options.profile ?? "full";
      const profileSuffixedRel = profileSuffixedReportPath(
        configuredValidateJsonPath,
        profileLabel,
      );
      await emitJson(normalized, root, profileSuffixedRel);
    }
  }

  return willFail ? 1 : 0;
}

/**
 * Report path for a `--flow`-scoped run: `<dir>/<base>.flow-0003+0004.json`,
 * or `null` when the scope is not writable.
 *
 * Derived from the configured path so a custom `output.validateJsonPath` still
 * lands next to its siblings, and deterministic in the spec ids so re-running
 * the same worker overwrites only its own file.
 *
 * `null` when ANY value is unnormalizable. Two reasons, both load-bearing:
 * raw user input must never reach a filename (`--flow x/../../../outside`
 * escapes the report directory once `path.resolve` runs); and dropping the bad
 * value would make `--flow BF-0003 --flow nope` — a run that fails with
 * `QFAI-FLOW-005` — write the SAME file as a healthy `--flow BF-0003`, so
 * whichever finished last decided whether that slice looked like a PASS. The
 * run's exit code, stdout and run-log still carry the failure.
 */
export function scopedReportPath(
  configuredPath: string,
  flowIds: readonly string[],
): string | null {
  const normalizedIds: string[] = [];
  for (const id of flowIds) {
    const normalizedId = isStoryTreeId(id, "BF") ? id.slice(3) : null;
    if (normalizedId === null) {
      return null;
    }
    normalizedIds.push(normalizedId);
  }
  if (normalizedIds.length === 0) {
    return null;
  }
  const normalized = configuredPath.replace(/\\/g, "/");
  const slash = normalized.lastIndexOf("/");
  const dir = slash === -1 ? "" : normalized.slice(0, slash + 1);
  const base = slash === -1 ? normalized : normalized.slice(slash + 1);
  const dot = base.lastIndexOf(".");
  const stem = dot === -1 ? base : base.slice(0, dot);
  const ext = dot === -1 ? "" : base.slice(dot);
  const suffix = Array.from(new Set(normalizedIds)).sort().join("+");
  return `${dir}${stem}.flow-${suffix}${ext}`;
}

/** Detect the story-tree layout through the configured specs directory. */
export async function isStoryTreeProject(root: string, config: QfaiConfig): Promise<boolean> {
  const specsDir = resolveStoryTreeRoots(root, config).specsDir;
  try {
    return hasStoryTreeEntries(await readdir(specsDir));
  } catch (caught: unknown) {
    if ((caught as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw caught;
  }
}

/**
 * Compute the `.qfai/report/validate-<profile>.json` path that mirrors
 * the configured always-latest path. Splits at the basename so a custom
 * `validateJsonPath` of `.qfai/output/foo.json` still produces
 * `.qfai/output/foo-<profile>.json` — keeps backward compatibility with
 * non-default configurations.
 *
 * Exported so the certify-side `--upgrade-scope full` reader can derive
 * the same canonical signal path from the loaded config rather than
 * hardcoding a literal — otherwise an operator override of
 * `output.validateJsonPath` in `qfai.config.yaml` redirects the writer
 * but not the reader, and `--upgrade-scope full` refuses to upgrade
 * even when the saas-package gates are actually passing under the
 * custom location.
 */
export function profileSuffixedReportPath(configured: string, profile: string): string {
  const dir = path.posix.dirname(configured.replace(/\\/g, "/"));
  const base = path.posix.basename(configured.replace(/\\/g, "/"));
  const ext = path.posix.extname(base);
  const stem = ext.length > 0 ? base.slice(0, -ext.length) : base;
  return path.posix.join(dir, `${stem}-${profile}${ext}`);
}

/**
 * Build the `D-DEPRECATED-PATH` finding for the legacy validate output SSOT.
 *
 * Two states reach this function, both of them `error`: the legacy path is
 * retired, so nothing writes it and a project still naming it has a migration
 * to make.
 *
 *   1. `configTargetsLegacyPath` — the config points at the legacy path, so
 *      the writer refused and the message directs the operator to update it.
 *   2. Otherwise — a stale file left on disk, so the message asks for it to be
 *      deleted.
 */
function buildDeprecationIssue(args: { configTargetsLegacyPath: boolean }): Issue {
  const message = args.configTargetsLegacyPath
    ? `qfai.config.yaml#output.validateJsonPath points at the legacy SSOT ` +
      `${LEGACY_VALIDATE_JSON_REL}, which is past the announced sunset ` +
      `(${LEGACY_VALIDATE_JSON_SUNSET}). The validate writer REFUSED this ` +
      `write to enforce the migration gate. Update output.validateJsonPath ` +
      `to .qfai/report/validate.json (canonical) and rerun validate.`
    : `Legacy validate output path ${LEGACY_VALIDATE_JSON_REL} is past the announced ` +
      `sunset (${LEGACY_VALIDATE_JSON_SUNSET}); the legacy file is no longer written but ` +
      `still exists on disk. Update consumers to read .qfai/report/validate.json or ` +
      `.qfai/report/validate-<profile>.json and delete the stale legacy file.`;
  return {
    code: "D-DEPRECATED-PATH",
    severity: "error",
    category: "canonical",
    message,
    file: LEGACY_VALIDATE_JSON_REL,
    rule: "validate.legacyOutputDeprecated",
  };
}

/** Finding families grouped by the validators the current profiles run. */
export const GATE_GROUP_FAMILIES = {
  hygiene: ["QFAI-HYG-*"],
  "skills-integrity": ["QFAI-SKILLS-*"],
  "assistant-assets": ["QFAI-ASSETS-*"],
  discussion: ["QFAI-DPACK-*", "QFAI-VIS-*"],
  "grilling-discussion": ["QFAI-GRILL-002"],
  "research-summary": ["QFAI-RESEARCH-*"],
  "canonical-uix": [
    "UIX-VAL-3LAYER-*",
    "UIX-VAL-CLASSIFICATION-*",
    "UIX-VAL-DIRECTION-*",
    "UIX-VAL-OQ-*",
    "UIX-VAL-SCREEN-*",
    "UIX-VAL-SIDECAR-*",
    "UIX-VAL-T05",
    "UIX-VAL-TREND-*",
  ],
  "story-structure": [
    "QFAI-STORY-001",
    "QFAI-STORY-002",
    "QFAI-STORY-003",
    "QFAI-STORY-004",
    "QFAI-STORY-005",
    "QFAI-STORY-011",
    "QFAI-SPACK-102",
  ],
  "grilling-flow": ["QFAI-GRILL-001"],
  "story-contract-index": ["QFAI-CONTRACT-034"],
  "story-test-obligations": [
    "QFAI-STORY-006",
    "QFAI-STORY-007",
    "QFAI-STORY-008",
    "QFAI-STORY-009",
    "QFAI-SCAN-002",
  ],
  "story-atdd-depth": ["QFAI-ATDD-131", "QFAI-ATDD-132", "QFAI-ATDD-133"],
  sdd: [
    "QFAI-AUTOPILOT-*",
    "W-WORKLOG-*",
    "W-PENDING-PROMOTION",
    "W-ASSISTANT-LAYOUT",
    "W-SKILL-DOC-BROKEN-REF",
    "W-SKILL-PROJECT-MEMORY",
    "W-STALE-REFERENCE",
    "I-ASSISTANT-LAYER-UNSEEDED",
  ],
  "reviewer-gate-sdd": [
    "R-CERTIFY-VERIFY-CIRCULAR",
    "R-PROMPT-SCANNER-DRIFT",
    "R-AUTOPILOT-POLICY-*",
    "R-HANDOFF-INCOMPLETE",
    "R-WORKLOG-DRIFT",
    "R-REJECTED-READOPT",
  ],
  "reviewer-gate-shared": [
    "R-MOCK-HREF-DRIFT",
    "R-DESIGN-MD-PATCH-OUT-OF-ZONE",
    "R-EVIDENCE-MUTATION-UNLOGGED",
  ],
  "reviewer-justification-only": ["R-PACK-LOCATION-DRIFT", "R-EXPLORATION-CERTIFY-ATTEMPT"],
  contracts: [
    "QFAI-CONTRACT-000",
    "QFAI-CONTRACT-010",
    "QFAI-CONTRACT-011",
    "QFAI-CONTRACT-012",
    "QFAI-CONTRACT-013",
    "QFAI-CONTRACT-014",
    "QFAI-CONTRACT-015",
    "QFAI-CONTRACT-020",
    "QFAI-CONTRACT-031",
    "QFAI-CONTRACT-036",
    "QFAI-CONTRACT-037",
    "QFAI-CONTRACT-038",
    "QFAI-CONTRACT-040",
    "QFAI-CONTRACT-041",
    "QFAI-DB-*",
  ],
  "ui-screen-entries": ["QFAI-CONTRACT-042"],
  "contract-parse": ["QFAI-CONTRACT-021"],
  "contract-ssot-modules": ["QFAI-CONTRACT-050"],
  "design-contract-readiness": ["QFAI-DCON-030", "QFAI-DCON-031", "QFAI-DCON-032", "QFAI-DCON-034"],
  "root-design-md-parse": ["QFAI-DCON-033"],
  "design-contract-readiness-sdd": ["QFAI-DCON-019"],
  "design-contract-readiness-prototyping": [
    "QFAI-DCON-001",
    "QFAI-DCON-005",
    "QFAI-DCON-009",
    "QFAI-DCON-012",
    "QFAI-DCON-013",
  ],
  "package-self-governance": PACKAGE_SELF_GOVERNANCE_FAMILIES,
  "review-artifacts": ["QFAI-REVIEW-*"],
  prototyping: [
    "QFAI-PROT-*",
    "QFAI-CRIT-*",
    "QFAI-UIE-*",
    "QFAI-DT-*",
    "QFAI-MOCK-*",
    "QFAI-FLOW-001",
    "QFAI-FLOW-002",
    "QFAI-FLOW-004",
    "QFAI-BPAP-*",
    "QFAI-CONSISTENCY-*",
    "QFAI-AGENT-*",
    "QFAI-AUD-*",
    "QFAI-PLATFORM-*",
    "QFAI-CFG-LINK-*",
  ],
  "prototyping-skill": ["UIX-VAL-SKILL-*"],
  "atdd-scaffold": ["D-SCAFFOLD-PLACEHOLDER"],
  "test-stubs": ["QFAI-TEST-*"],
  drift: ["QFAI-DRIFT-*", "QFAI-STORY-010"],
  "saas-package-profile": [ATTESTATION_MISSING_CODE, HANDOFF_SCHEMA_CODE],
} as const satisfies Record<string, readonly string[]>;

type GateGroup = keyof typeof GATE_GROUP_FAMILIES;
const ALL_GATE_GROUPS = Object.keys(GATE_GROUP_FAMILIES) as GateGroup[];

const STAGE_ONLY_GATE_GROUPS: Partial<Record<GateGroup, ValidationProfile>> = {
  "design-contract-readiness-sdd": "sdd",
  drift: "drift",
  "saas-package-profile": "saas-package",
};

function stageOwnerOf(group: GateGroup): ValidationProfile | undefined {
  return Object.prototype.hasOwnProperty.call(STAGE_ONLY_GATE_GROUPS, group)
    ? STAGE_ONLY_GATE_GROUPS[group]
    : undefined;
}

const FULL_GATE_GROUPS: readonly GateGroup[] = ALL_GATE_GROUPS.filter(
  (group) => stageOwnerOf(group) === undefined,
);

const PROTOTYPING_GATE_GROUPS: readonly GateGroup[] = [
  "prototyping",
  "ui-screen-entries",
  "contract-parse",
  "reviewer-gate-shared",
  "design-contract-readiness",
  "design-contract-readiness-prototyping",
  "root-design-md-parse",
  "research-summary",
  "canonical-uix",
];

const PROFILE_GATE_GROUPS: Record<ValidationProfile, readonly GateGroup[]> = {
  full: FULL_GATE_GROUPS,
  verify: FULL_GATE_GROUPS,
  discussion: [
    "discussion",
    "research-summary",
    "canonical-uix",
    "review-artifacts",
    "grilling-discussion",
    "root-design-md-parse",
  ],
  sdd: [
    "story-structure",
    "grilling-flow",
    "story-contract-index",
    "design-contract-readiness",
    "design-contract-readiness-sdd",
    "sdd",
    "reviewer-gate-sdd",
    "reviewer-gate-shared",
    "reviewer-justification-only",
    "contracts",
    "ui-screen-entries",
    "contract-parse",
    "contract-ssot-modules",
    "package-self-governance",
    "review-artifacts",
  ],
  prototyping: PROTOTYPING_GATE_GROUPS,
  atdd: ["story-test-obligations", "story-atdd-depth", "atdd-scaffold", "test-stubs"],
  tdd: [
    "story-test-obligations",
    "test-stubs",
    "drift",
    "contracts",
    "ui-screen-entries",
    "contract-parse",
    "contract-ssot-modules",
  ],
  "saas-package": [...PROTOTYPING_GATE_GROUPS, "saas-package-profile"],
  drift: ["drift"],
};

function isKnownProfile(profile: string): profile is ValidationProfile {
  return Object.prototype.hasOwnProperty.call(PROFILE_GATE_GROUPS, profile);
}

/** Families a profile does not evaluate, split by where the reader must go. */
type UnevaluatedGates = {
  /** Deduped, order-preserving families a `full` scan would have covered. */
  readonly fullCovered: readonly string[];
  /** Families only one stage's own profile ever runs, with that profile. */
  readonly stageOnly: readonly { readonly family: string; readonly profile: ValidationProfile }[];
  /**
   * Families the profile DOES wire in, whose own detectors cannot fire because
   * their inputs are absent from this tree.
   *
   * A third axis rather than part of `fullCovered`, because the remedy that
   * list carries — "run the full profile" — does not apply: a full scan wires
   * the same detectors and its inputs are just as absent, so sending the reader
   * there is advice that cannot be followed. It is also why they must survive
   * the `fullCovered.length === 0` case: `full` and `verify` reach it, and
   * dropped there, the notice would say a full run had evaluated every gate it
   * covers while two of its detectors had structurally not run.
   */
  readonly preconditionGated: readonly string[];
};

/**
 * The groups a profile does not run, split by where the reader must go.
 *
 * `unevaluatedSelfGovernance` carries the self-governance codes whose own
 * inputs are absent, so those detectors cannot fire whatever the project does
 * and their codes are reported even though the profile wires them in. It is
 * per code, not per group: the two detectors read different files, and a tree
 * carrying one detector's inputs but not the other's would otherwise drop both
 * from the notice while one of them had structurally not run. They are their
 * own axis, `preconditionGated`: no profile owns them the way a stage-only
 * group is owned, so there is no `--profile` to send the reader to, and a full
 * scan is not the remedy either because it wires the same detectors.
 */
function unevaluatedGates(
  profile: string,
  unevaluatedSelfGovernance: readonly string[],
): UnevaluatedGates {
  if (!isKnownProfile(profile)) {
    return { fullCovered: [], stageOnly: [], preconditionGated: [] };
  }
  const evaluated = new Set<GateGroup>(PROFILE_GATE_GROUPS[profile]);
  const fullCovered: string[] = [];
  const stageOnly: { family: string; profile: ValidationProfile }[] = [];
  // Reported on every profile that wires the group in, `full` and `verify`
  // included: the codes describe THIS tree, not this profile's composition.
  const preconditionGated = evaluated.has("package-self-governance")
    ? [...new Set(unevaluatedSelfGovernance)]
    : [];
  const pushFullCovered = (family: string): void => {
    if (!fullCovered.includes(family)) fullCovered.push(family);
  };
  for (const group of ALL_GATE_GROUPS) {
    if (evaluated.has(group)) continue;
    const owner = stageOwnerOf(group);
    for (const family of GATE_GROUP_FAMILIES[group]) {
      // A stage-only gate is not reachable from `full`, so pointing the reader
      // at a full scan for it would be advice that cannot be followed.
      if (owner === undefined) {
        pushFullCovered(family);
      } else if (!stageOnly.some((entry) => entry.family === family)) {
        stageOnly.push({ family, profile: owner });
      }
    }
  }
  if (fullCovered.length === 0) {
    // A profile that runs every group a full scan covers is not partial, and
    // this is the partial-profile list — appending anything here would put
    // "full is a partial profile" into the artifact. The other two axes are
    // reported either way, which is the point: `full` reaches this branch, and
    // a precondition-gated detector that could not fire is a fact about the
    // tree that its notice still has to carry.
    return { fullCovered, stageOnly, preconditionGated };
  }
  if (profile === "saas-package") {
    // Keep the skip-set SSOT wired in: a gate added to
    // `SAAS_PACKAGE_SKIPPED_GATES` must reach the notice even if it belongs to
    // a group the profile otherwise runs. Every skipped family belongs to a
    // group `full` runs, so a full scan is the accurate remedy for all of them.
    for (const family of saasPackageSkippedGateFamilies()) pushFullCovered(family);
  }
  return { fullCovered, stageOnly, preconditionGated };
}

/**
 * Notice describing what a run did NOT evaluate.
 *
 * A PASS on a partial profile is not layered coverage, and every profile
 * writes the shared always-latest `validate.json` — so the omission has to be
 * visible in the artifact, not only in the operator's head.
 *
 * `full` / `verify` get their own wording rather than silence: they evaluate
 * every gate a full scan covers, but three groups are stage-only, and a run
 * that says nothing at all reads as complete coverage of every gate in the
 * tool.
 *
 * All of that describes what the requested profile *would* evaluate, which is
 * only what it did evaluate when its validators actually ran.
 * `runProfileValidators` returns the integration-surface findings alone when a
 * path those validators walk cannot be walked, so the group table describes
 * nothing that happened: `profileValidatorsRan === false` gets its own wording
 * rather than a coverage claim printed next to the `QFAI-LINK-001` that
 * contradicts it.
 */
function buildPartialProfileNotice(
  profile: string | undefined,
  profileValidatorsRan: boolean,
  unevaluatedSelfGovernance: readonly string[],
): Issue | null {
  // `core/validate.ts` resolves `options.profile ?? "full"` before this runs,
  // so the only caller always supplies one; this is the parser-rejection path.
  if (!profile) {
    return null;
  }
  if (!profileValidatorsRan) {
    return profileNotice(
      `profile="${profile}" evaluated NO hard gate in this run. The integration-surface ` +
        "inspection found a path this profile's own validators walk that cannot be walked, so " +
        "the run stopped before any of them ran and reported only that damage " +
        "(`QFAI-LINK-001`). Repair the path it names and re-run: neither these findings nor " +
        "their absence says anything about this profile's gates.",
    );
  }
  // There is no "blocked" branch any more: a narrow profile in CI runs its own
  // validators, so the ordinary partial-profile wording is accurate.
  const { fullCovered, stageOnly, preconditionGated } = unevaluatedGates(
    profile,
    unevaluatedSelfGovernance,
  );
  if (fullCovered.length === 0 && stageOnly.length === 0 && preconditionGated.length === 0) {
    return null;
  }
  // A stage-only gate is unreachable from a full scan, so it is named with the
  // profile that does run it instead of being folded into the "run full" list.
  // Sending the reader to `--fail-on error` for one of them would repeat the
  // advice that produced the false PASS.
  const stageOnlySentence =
    stageOnly.length === 0
      ? ""
      : ` Stage-ownership gates no full scan runs: ${stageOnly
          .map((entry) => `${entry.family} (\`--profile ${entry.profile}\`)`)
          .join(", ")}.`;
  // A precondition-gated detector is wired in and still did not run, so the
  // remedy is neither a wider profile nor another one: its inputs are absent.
  // Naming it in its own sentence is what keeps "evaluated every gate a full
  // scan covers" from reading as coverage it does not have.
  const preconditionSentence =
    preconditionGated.length === 0
      ? ""
      : ` Wired in but not evaluable in this tree, because their own inputs are absent: ` +
        `${preconditionGated.join(", ")}.`;
  const message =
    fullCovered.length === 0
      ? `profile="${profile}" evaluated every gate a full scan covers.` +
        stageOnlySentence +
        preconditionSentence
      : `profile="${profile}" is a partial profile. Hard gates NOT evaluated in this run: ` +
        `${fullCovered.join(", ")}. A PASS here is not full-scan coverage — run ` +
        "`qfai validate --fail-on error` (full profile) before declaring completion." +
        stageOnlySentence +
        preconditionSentence;
  return profileNotice(message);
}

/** The `QFAI-PROFILE-001` envelope every coverage wording above shares. */
function profileNotice(message: string): Issue {
  return {
    code: "QFAI-PROFILE-001",
    severity: "info",
    category: "canonical",
    message,
    rule: "validate.partialProfileCoverage",
  };
}

/**
 * Append one finding to a result and keep `counts` in step.
 *
 * Exported so `report --run-validate` folds the shared migration-gate finding
 * into its result exactly the way `validate` does — a hand-rolled copy there
 * would be free to forget the recount and hand the gate a stale severity
 * tally.
 */
export function appendIssue(result: ValidationResult, added: Issue): ValidationResult {
  return {
    ...result,
    issues: [...result.issues, added],
    counts: recountIssues(result.counts, added),
  };
}

function recountIssues(
  counts: ValidationResult["counts"],
  added: Issue,
): ValidationResult["counts"] {
  if (added.suppressed) return counts;
  return {
    info: counts.info + (added.severity === "info" ? 1 : 0),
    warning: counts.warning + (added.severity === "warning" ? 1 : 0),
    error: counts.error + (added.severity === "error" ? 1 : 0),
  };
}

function emitStrictSupersededNotice(failOn: FailOn): void {
  process.stderr.write(
    `qfai validate: --strict is superseded by --fail-on ${failOn} (effective failOn=${failOn})\n`,
  );
}

/**
 * Renders the default `--format text` output.
 *
 * The emitted line grammar is the validate contract's text output grammar;
 * both must be changed together.
 */
export function emitText(result: ValidationResult, failOn: FailOn): void {
  for (const item of result.issues) {
    const location = item.file ? ` (${item.file})` : "";
    const refs = item.refs && item.refs.length > 0 ? ` refs=${item.refs.join(",")}` : "";
    const suppressed = item.suppressed ? " suppressed=true" : "";
    process.stdout.write(
      `[${item.severity}] ${item.code} ${item.message}${location}${refs}${suppressed}\n`,
    );
    if (shouldEmitIssueDetail(item, failOn)) {
      emitTextField("error_code", item.code);
      emitTextField("target", resolveIssueTarget(item));
      emitTextField("expected", resolveIssueExpected(item));
      emitTextField("current", item.message);
      emitTextField("fix", resolveIssueFix(item));
    }
  }
  process.stdout.write(
    `counts: info=${result.counts.info} warning=${result.counts.warning} error=${result.counts.error}\n`,
  );
  // 実効 failOn はこれまで `--format github` の summary 行にしか現れず、既定の
  // text 出力を読むレビュアーには終了コードの根拠が見えなかった。
  process.stdout.write(`fail-on: ${failOn}\n`);
  const overruns = formatTimingOverruns(result.timings);
  if (overruns) {
    process.stdout.write(`${overruns}\n`);
  }
}

/**
 * The validator groups that overshot their budget, as one text line, or `null`
 * when everything fit.
 *
 * Printed next to the counts rather than pushed as a finding: how long a run
 * took describes the machine, not the tree, so it must not move
 * `counts.warning` and make the same commit report different totals on a
 * laptop and on a loaded CI runner.
 */
export function formatTimingOverruns(timings: ValidationTimings | undefined): string | null {
  if (!timings) {
    return null;
  }
  const parts: string[] = [];
  if (timings.uiuxMs > timings.uiuxBudgetMs) {
    parts.push(
      `uiux=${formatOverrunMs(timings.uiuxMs, timings.uiuxBudgetMs)}ms ` +
        `(budget ${timings.uiuxBudgetMs}ms)`,
    );
  }
  if (timings.htmlMockMs > timings.htmlMockBudgetMs) {
    parts.push(
      `htmlMock=${formatOverrunMs(timings.htmlMockMs, timings.htmlMockBudgetMs)}ms ` +
        `(budget ${timings.htmlMockBudgetMs}ms)`,
    );
  }
  return parts.length > 0 ? `timings: over budget ${parts.join(" ")}` : null;
}

const MAX_OVERRUN_DECIMALS = 9;

/**
 * A measurement that already exceeds `budget`, rendered at the coarsest
 * precision that still reads as larger than the budget.
 *
 * Rounding to whole milliseconds unconditionally would print
 * `uiux=2000ms (budget 2000ms)` for a 2000.1ms run — a diagnostic that
 * contradicts the over-budget branch it was printed from — and collapse a
 * fractional custom budget to `0ms (budget 0.1ms)`. So the decimals grow until
 * the rendered value is strictly greater than the budget.
 */
function formatOverrunMs(value: number, budget: number): string {
  for (let decimals = 0; decimals <= MAX_OVERRUN_DECIMALS; decimals += 1) {
    const rendered = value.toFixed(decimals);
    if (Number(rendered) > budget) {
      return rendered;
    }
  }
  return String(value);
}

function emitTextRunLog(runLogPath: string): void {
  process.stdout.write(`run-log: ${runLogPath}\n`);
}

/**
 * The version and the directory it came from — first line of every run.
 *
 * Otherwise `toolVersion` is only inside `validate.json`, which the README calls
 * internal and not a stable external contract, and an `npx qfai` that resolved
 * three directories up, against another branch's lockfile, is indistinguishable
 * in the transcript from one that resolved locally.
 *
 * **Before the work, and in every format.** Printed beside `run-log:` it would
 * be absent from `--format github`, which is the format the shipped SDD loop
 * prescribes (`skills/qfai-sdd/SKILL.md`, `templates/evidence/sdd-spec.md`), so
 * the answer would be missing from the path the product actually runs. Printed
 * after `validateProject` returns, it would be missing from the run that needs
 * it most: an old externally-resolved qfai throwing on a newer project
 * structure leaves a stack trace and nothing about which binary produced it.
 *
 * stdout is safe in both formats — neither puts machine-readable JSON there.
 */
async function emitProvenance(toolVersion: string): Promise<void> {
  const packageDir = await resolveToolPackageDir();
  const where = packageDir === null ? "resolution unknown" : packageDir;
  process.stdout.write(`qfai: ${toolVersion} (${where})\n`);
}

function emitGitHubOutput(
  result: ValidationResult,
  root: string,
  jsonPath: string,
  status: { failOn: FailOn; willFail: boolean; runLogPath: string },
): void {
  const deduped = dedupeIssues(result.issues);
  const dropped = Math.max(result.issues.length - deduped.length, 0);
  const perLevel = capPerLevel(deduped);

  emitGitHubSummary(result, {
    total: deduped.length,
    emitted: perLevel.emitted.length,
    levels: perLevel.levels,
    dropped,
    jsonPath,
    root,
    timingOverruns: formatTimingOverruns(result.timings),
    ...status,
  });

  for (const issue of perLevel.emitted) {
    emitGitHub(issue, status.failOn);
  }
}

/** What one annotation level looked like: how many exist, and how many were emitted. */
export interface LevelTally {
  readonly level: GitHubLevel;
  readonly total: number;
  readonly emitted: number;
}

/**
 * The issues to emit, capped at GitHub's own limit for each level, plus a tally per level.
 *
 * The cap is applied on the level the ANNOTATION carries, not on `issue.severity`, and those are
 * not the same partition: a suppressed error annotates as `notice`. Capping by severity would
 * count a suppressed error against the error budget while the runner counted it against the
 * notice one — so the summary would be wrong in the direction that matters, claiming a level was
 * complete while the runner truncated it. One derivation, used here and by the emitter.
 *
 * Order within a level is preserved, so the first ten of a level are the first ten a reader
 * would have seen.
 */
export function capPerLevel(issues: Issue[]): { emitted: Issue[]; levels: LevelTally[] } {
  const buckets = new Map<GitHubLevel, Issue[]>();
  for (const issue of issues) {
    const level = gitHubLevel(issue);
    const bucket = buckets.get(level);
    if (bucket === undefined) buckets.set(level, [issue]);
    else bucket.push(issue);
  }

  const emitted: Issue[] = [];
  const levels: LevelTally[] = [];
  // A FIXED order, so the note reads the same way from one run to the next rather than in
  // whichever order the issues happened to arrive.
  for (const level of GITHUB_LEVELS) {
    const bucket = buckets.get(level) ?? [];
    if (bucket.length === 0) continue;
    const kept = bucket.slice(0, GITHUB_ANNOTATION_LIMIT_PER_LEVEL);
    emitted.push(...kept);
    levels.push({ level, total: bucket.length, emitted: kept.length });
  }
  return { emitted, levels };
}

/**
 * Whether an issue prints its `expected` / `fix` detail: every error, and a
 * warning when warnings fail the run. Tied to `severity === "error"` alone, the
 * rule-description catalogue would be unreachable for every warning-severity
 * code, although under `--strict` / `--fail-on warning` the warning is exactly
 * what fails the run.
 */
function shouldEmitIssueDetail(issue: Issue, failOn: FailOn): boolean {
  if (issue.severity === "error") {
    return true;
  }
  return failOn === "warning" && issue.severity === "warning";
}

/** The three levels GitHub counts separately, in the order the summary reports them. */
export const GITHUB_LEVELS = ["error", "warning", "notice"] as const;

type GitHubLevel = (typeof GITHUB_LEVELS)[number];

/**
 * The level an issue annotates as.
 *
 * Extracted from `emitGitHub` so the per-level cap and the emitter cannot disagree about which
 * budget an issue spends. A suppressed issue is a `notice` whatever its severity, and that is
 * exactly the case a second copy of this expression would get wrong.
 */
export function gitHubLevel(issue: Issue): GitHubLevel {
  if (issue.suppressed) return "notice";
  if (issue.severity === "error") return "error";
  return issue.severity === "warning" ? "warning" : "notice";
}

function emitGitHub(issue: Issue, failOn: FailOn): void {
  const level = gitHubLevel(issue);
  // The location metadata is ESCAPED, and by the property rules rather than the message
  // ones. `issue.file` can come from a finding the reviewer gate
  // ingested out of `.qfai/review/**`, which is a directory a pull request writes — so a
  // `file` of `x\n::stop-commands::token` split this line in two and let a fork's pull
  // request inject a workflow command, suppressing or forging every annotation after it.
  //
  // A property value needs `:` and `,` escaped as well as `%` and the newlines: they are the
  // separators GitHub parses the metadata block with, so a `file` containing either changes
  // which properties this command appears to set.
  const file = issue.file ? `file=${escapeGitHubCommandProperty(issue.file)}` : "";
  const line = issue.loc?.line ? `,line=${issue.loc.line}` : "";
  const column = issue.loc?.column ? `,col=${issue.loc.column}` : "";
  const location = file ? ` ${file}${line}${column}` : "";
  const suffix = shouldEmitIssueDetail(issue, failOn)
    ? ` expected=${resolveIssueExpected(issue)} | fix=${resolveIssueFix(issue)}`
    : "";
  const message = escapeGitHubCommandValue(`${issue.code}: ${issue.message}${suffix}`);
  process.stdout.write(`::${level}${location}::${message}\n`);
}

function emitGitHubSummary(
  result: ValidationResult,
  options: {
    total: number;
    emitted: number;
    levels: LevelTally[];
    dropped: number;
    jsonPath: string;
    runLogPath: string;
    root: string;
    failOn: FailOn;
    willFail: boolean;
    timingOverruns: string | null;
  },
): void {
  const summary = [
    "qfai validate summary:",
    `error=${result.counts.error}`,
    `warning=${result.counts.warning}`,
    `info=${result.counts.info}`,
    `annotations=${options.emitted}/${options.total}`,
    `failOn=${options.failOn}`,
    `result=${options.willFail ? "FAIL" : "PASS"}`,
  ].join(" ");
  process.stdout.write(`${summary}\n`);

  if (options.timingOverruns) {
    // The measurement is not a finding, so it has no annotation of its own to
    // ride on; without this line a CI run in `--format github` would only
    // carry the overrun inside validate.json#timings.
    process.stdout.write(`::notice::${escapeGitHubCommandValue(options.timingOverruns)}\n`);
  }

  const truncated = options.levels.filter((tally) => tally.emitted < tally.total);
  if (options.dropped > 0 || truncated.length > 0) {
    const details = [
      "qfai validate note:",
      options.dropped > 0 ? `deduped=${options.dropped}` : null,
      // PER LEVEL, because one number cannot express a per-level cap: a run with 5 errors and
      // 200 notices is complete on one level and truncated on the other, and a single
      // `omittedOverLimit=195` reads as though something was lost everywhere.
      truncated.length > 0
        ? `omittedOverLimit=${truncated
            .map((tally) => `${tally.level} ${tally.emitted}/${tally.total}`)
            .join(", ")}`
        : null,
    ]
      .filter(Boolean)
      .join(" ");
    process.stdout.write(`${details}\n`);
    process.stdout.write(
      "qfai validate note: GitHub shows at most 10 annotations per level per step. " +
        "Everything omitted is in the JSON in full.\n",
    );
  }

  const relative = toRelativePath(options.root, options.jsonPath);
  process.stdout.write(`qfai validate note: see ${relative} or --format text for the details.\n`);
  process.stdout.write(`qfai validate note: see ${options.runLogPath} for the run-log.\n`);

  process.stdout.write(
    "qfai validate note: next, qfai report generates report.md (e.g. qfai report).\n",
  );
}

function dedupeIssues(issues: Issue[]): Issue[] {
  const seen = new Set<string>();
  const deduped: Issue[] = [];
  for (const issue of issues) {
    const key = issueKey(issue);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(issue);
  }
  return deduped;
}

function issueKey(issue: Issue): string {
  const file = issue.file ?? "";
  const line = issue.loc?.line ?? "";
  const column = issue.loc?.column ?? "";
  const suppressed = issue.suppressed ? "suppressed" : "";
  return [issue.code, issue.severity, issue.message, file, line, column, suppressed].join("|");
}

async function emitJson(result: ValidationResult, root: string, jsonPath: string): Promise<void> {
  const abs = resolveJsonPath(root, jsonPath);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, `${JSON.stringify(result, null, 2)}\n`, "utf-8");
}

function resolveJsonPath(root: string, jsonPath: string): string {
  return path.isAbsolute(jsonPath) ? jsonPath : path.resolve(root, jsonPath);
}

/**
 * GitHub's own cap on annotations, which is per LEVEL and per STEP.
 *
 * One cap of 100 over the whole run, with a summary printing
 * `annotations=${min(total, 100)}/${total}`, would report a run with 40 errors as
 * `annotations=40/40` — "every finding was emitted" — while the runner displays ten and drops
 * thirty without saying so. The summary is the only thing an operator sees. Measured on the
 * `test (cli)` lane, all three levels sat at exactly ten, so the truncation is the steady state
 * rather than an edge case.
 *
 * Emitting past the cap buys nothing: the runner drops the extras, and a local `--format github`
 * run just prints more lines that no reader gets. What is owed is not a smaller number but an
 * honest report, which is why the per-level tally exists beside this.
 *
 * The cap is per STEP, and a step may run `validate` more than once — so this bounds what THIS
 * invocation emits, not what the step ultimately displays. The note says the rule rather than
 * promising an outcome this process cannot see.
 */
export const GITHUB_ANNOTATION_LIMIT_PER_LEVEL = 10;

/**
 * Human-readable "expected state" per issue code. Exported so a test can assert
 * that every code an emitter can raise at error severity is either catalogued
 * here or explicitly recorded as pending, instead of shipping without one.
 */
export const ISSUE_EXPECTED_BY_CODE: Record<string, string> = {
  "QFAI-CFG-001":
    "qfai.config.yaml sets no key that has been retired. A retired key is still parsed so an existing config keeps loading, but nothing reads it, so leaving it in place misreports the gate the tool actually runs.",
  "QFAI-FLOW-005": "Every `--flow` value names an existing BF-NNNN business flow.",
  "QFAI-LAYOUT-001":
    "The configured spec directory uses the story-tree layout without old spec-pack entries.",
  "QFAI-STORY-001": "Every required story-tree policy and contract file exists.",
  "QFAI-STORY-002": "Story-tree IDs are well formed, unique, and consistent with their paths.",
  "QFAI-STORY-003": "The decisions and open-questions tables have valid records.",
  "QFAI-STORY-004": "Each story has acceptance criteria and examples with valid references.",
  "QFAI-STORY-005": "Every business rule and contract reference resolves.",
  "QFAI-STORY-006":
    "The selected profile's story obligations have test annotations: BF and AC in ATDD, EX in TDD.",
  "QFAI-STORY-007":
    "The selected profile checks its story annotations in the required test layers: BF and AC in ATDD, EX in TDD.",
  "QFAI-STORY-008":
    "The selected profile's BF, AC, or EX test annotations name declared story-tree IDs.",
  "QFAI-STORY-009":
    "Each test exception cites a declared BF, AC, or EX ID and a decision row in force.",
  "QFAI-STORY-010":
    "Protected story-tree files change through an in-force change request, and decision rows remain append-only.",
  "QFAI-STORY-011": "Every business-flow file contains a Mermaid flowchart or sequence diagram.",
  "QFAI-GRILL-001": "Each affected business flow records its pre-draft grilling checkpoint.",
  "QFAI-SPACK-102": "No open question is a decision the user was asked for and never took.",
  "QFAI-PROFILE-001":
    "A partial profile does not evaluate every hard gate; a PASS on it is not full-scan coverage.",
  "QFAI-PROT-011":
    "Every spec named in `prototyping.json#frozenSurfaceUnion` still resolves as UI-bearing, so the open loop describes screens that exist; a retired surface is either restored or the loop is reset deliberately from cycle 0.",
  "QFAI-SCAN-002":
    "`validate` runs to completion, so its output is a verdict; a run that could not finish reports that as a finding rather than as a bare stderr line with no counts, no run-log and no validate.json.",
  "QFAI-TOOL-002":
    "The qfai a project's gates run through is the one its own dependency declaration installs, so the gating version is pinned by its own lockfile rather than by whichever checkout `npx` reached first.",
  "QFAI-TOOL-001":
    "The qfai that runs a project's gates is resolved from inside that project, so the gating version is pinned by its own lockfile; a global install or a monorepo-root hoist is a benign reading of the same path test.",
  "QFAI-PLATFORM-003":
    "Every `--platform` given is read by the profile it is given to; the discussion / sdd / atdd / tdd profiles never reach platform detection, so a value passed there changes nothing about the run.",
  "QFAI-TEST-001":
    "No test file holds a silent placeholder — `it.todo` / `pytest.skip` / `t.Skip` / `@Disabled` / `#[ignore]` and the other dialects' stub forms.",
  "QFAI-TEST-003":
    "No vitest/jest test is parked with a `.skip` modifier; a parked suite is waived per path in `.qfai/waivers.yml` instead.",

  "QFAI-ATDD-131":
    "Every BF has a Coverage Depth Matrix at `.qfai/evidence/coverage-depth-BF-NNNN.md`.",
  "QFAI-ATDD-132":
    "The Coverage Depth Matrix and ATDD evidence are tracked or unignored so their justifications are committed.",
  "QFAI-ATDD-133":
    "Each matrix covers its BF, US, AC, and EX obligations, and `.qfai/evidence/atdd-BF-NNNN.md` links it with matching counted totals.",
  "QFAI-LINK-001":
    "Every qfai-owned entry in .claude/.agents/.codex/.github skill and agent directories is a symlink that resolves.",
  "QFAI-LINK-002":
    "Every `file.md#anchor` citation inside .qfai/assistant/** names a document that is there, and a heading that is in it.",
  "QFAI-DPACK-001":
    "A latest discussion-pack directory exists under `.qfai/discussion/discussion-<timestamp>/`.",
  "QFAI-DPACK-002":
    "The latest discussion-pack contains the required markdown files; no prototyping sidecar artifact is required.",
  "QFAI-DPACK-003": "The latest discussion-pack files contain minimum substantive content.",
  "QFAI-DPACK-004":
    "No open OQ remains in `11_OQ-Register.md` (`Disposition: open` blocks discussion completion).",
  "QFAI-DPACK-005":
    "Discussion pack naming must use `discussion-YYYYMMDDhhmmssSSS` for canonical outputs.",
  "QFAI-DPACK-006": "Legacy discussion serial packs should be migrated or removed.",
  "QFAI-DPACK-007":
    "Every deferred OQ in `11_OQ-Register.md` must have a corresponding row in `13_Deferred.md`.",
  "QFAI-DPACK-008": "`03_Story-Workshop.md` must include at least one Mermaid block.",
  "QFAI-DPACK-009":
    "`03_Story-Workshop.md` Mermaid content should include `flowchart` or `sequenceDiagram`.",
  "QFAI-DPACK-010":
    "Legacy discussion naming is deprecated; canonical naming should be used for new outputs.",
  "QFAI-DPACK-011":
    "On a visual surface, every `DESIGN.md` key and archetype a discussion pack proposes is one the front-matter schema accepts.",
  "QFAI-HYG-001": "Legacy directory aliases are forbidden and must be migrated to canonical names.",
  "QFAI-HYG-002": "Template/sample artifacts should not remain under `paths.specsDir`.",
  "QFAI-REVIEW-001":
    "Root `.gitignore` contains QFAI managed entries or legacy `.qfai/review/.gitignore` exists.",
  "QFAI-REVIEW-002":
    "At least one review pack directory exists under `.qfai/review/review-<timestamp>/`.",
  "QFAI-REVIEW-003": "Each review pack contains `review_request.md`.",
  "QFAI-REVIEW-004": "Each review pack contains `summary.json`.",
  "QFAI-REVIEW-005": "Each review pack contains one or more reviewer files (`Rxx_*.md`).",
  "QFAI-REVIEW-006": "Each review summary JSON is parseable.",
  "QFAI-REVIEW-007": "Each review summary satisfies the minimum schema.",
  "QFAI-VIS-001": "`02_Inception-Deck.md` should include at least one Mermaid diagram.",
  "QFAI-VIS-002":
    "HTML+CSS visual mock is an optional fallback aid and should only be referenced when intentionally selected. Sidecar artifacts (uiux/) are the primary UI definition.",
  "QFAI-PROT-244": "captured render artifacts must be path-only and referenced files must exist.",
  "QFAI-PROT-251":
    "render evidence path field contains inline payload (data URI, base64, inline HTML, or oversized content). Path-only required.",
  "QFAI-PROT-252":
    "render evidence status requires accompanying field (skippedReason for skipped, error for failed, imagePath/htmlPath for captured).",
  "QFAI-PROT-253":
    "render evidence top-level status contradicts screen-level statuses (e.g. status=captured but no captured screens).",
  "QFAI-PROT-273": "browser QA bundle schema is invalid (missing or malformed browserQa block).",
  "QFAI-PROT-274":
    "browser QA executed/status contradiction (e.g. executed=true but status!=completed).",
  "QFAI-PROT-275": "browser QA summary is malformed (non-object or invalid bucket counts).",
  "QFAI-PROT-276": "browser QA findings are malformed (non-array or invalid finding structure).",
  "QFAI-PROT-311":
    "executionPlan.delegationMap is present but is not an object, or one of its entries assigns a category to a role outside the SKILL.md Delegation Scope Table.",
  "QFAI-PROT-335":
    ".qfai/evidence/prototyping/completion-certificate.json is required when prototyping completion is claimed (run `qfai prototyping certify` after all gates pass).",
  "QFAI-PROT-336":
    ".qfai/evidence/prototyping/completion-certificate.json digest mismatch — evidence has been modified since certify; re-run `qfai prototyping certify`.",
  "QFAI-CFG-LINK-001":
    "qfai.config.yaml: prototyping.primaryUiContract names a CON-UI-NNNN contract declared under `<paths.contractsDir>/ui/`.",
  "QFAI-CFG-LINK-002":
    "qfai.config.yaml: paths.* points to a directory that does not exist on disk.",
  "QFAI-CFG-LINK-003":
    "qfai.config.yaml: prototyping.calibration.packPath points to a directory that does not exist on disk.",
  "QFAI-UIE-001":
    "Every screen declared in `<paths.contractsDir>/ui/*.yaml` has a screenshot evidence file at `.qfai/evidence/prototyping/screenshots/<screen-id>.png`.",
  "QFAI-UIE-002":
    "Every screen declared in `<paths.contractsDir>/ui/*.yaml` has an HTML snapshot evidence file at `.qfai/evidence/prototyping/html/<screen-id>.html`.",
  "QFAI-UIE-003":
    "Every declared screen id used for prototyping evidence filenames must be path-safe (`[A-Za-z0-9._-]+`).",
  "QFAI-DCON-001":
    "UI-bearing execution requires the canonical design contracts for the current phase when UI contracts exist.",
  "QFAI-DCON-005":
    "design-system.yaml must define checklist entries for color, typography, spacing, border_radius, shadow, dos_and_donts, and motion_rules, plus component guidance via checklist.component_tone or richer component guidance blocks.",
  "QFAI-DCON-009": "design-system.yaml must parse as an object-shaped YAML document.",
  "QFAI-DCON-012": "prototype-handoff.yaml must parse as an object-shaped YAML document.",
  "QFAI-DCON-013":
    "prototype-handoff.yaml must carry `finalIterIndex` as a non-negative integer, and `finalArtifact`, `designMdPath`, `designMdSha256`, `designSystemMirror` and `implementationNotes` each as a non-empty string — the first two and the fourth a path, the third the frozen DESIGN.md sha256, the last the prose the loop hands on. On a target whose UI contracts declare screens it carries `procurement`, a mapping of a `procured`, an `authored` and a `drawn-from-project` list and nothing else. A `procured` row names `screen`, `region` and `item` and an `authored` row `screen`, `region` and `why`, one row per region across the two; a `drawn-from-project` row names the `screen` that needed nothing. Every declared screen appears in one of the three, and none appears both as needing nothing and as needing something.",
  "QFAI-DCON-019":
    "design-system.yaml and prototype-handoff.yaml are produced by /qfai-prototyping, not /qfai-sdd.",
  "QFAI-DCON-030":
    "Root DESIGN.md is required as the brand SSOT for UI-bearing projects (file missing).",
  "QFAI-DCON-031":
    "DESIGN.md.lock.yaml must exist under contracts/design/ and contain a designMdSha256 string.",
  "QFAI-DCON-032":
    "Root DESIGN.md sha256 must match DESIGN.md.lock.yaml#designMdSha256 (re-freeze after intentional edits).",
  "QFAI-DCON-033":
    "Root DESIGN.md exists but failed to parse per design-md-spec (front-matter is malformed).",
  "QFAI-DCON-034":
    "Root DESIGN.md must be the project's own brand SSOT, not the unreplaced qfai sample seeded by `qfai init`.",
  "QFAI-AGENT-015":
    "Every role a skill declares is dispatchable: some routing phase or its review profile selects it.",
  "QFAI-AGENT-016":
    "Every routed skill's `SKILL.md` frontmatter parses, and its `roles:` and `routing-profile:` are usable, so the routing cross-check has something to read.",
  "QFAI-AGENT-017":
    "Every skill that declares a `routing-profile:` is routed at least one dispatchable phase by the routing manifest.",
  "QFAI-AGENT-018":
    "Each routed skill has exactly one review gate, named by both sides and defined in the review-profile manifest.",
  "QFAI-AGENT-019":
    "A skill's `roles:` is a superset of every agent the routing manifest binds to it, including the reviewers its review profile selects.",
  "QFAI-RESEARCH-012":
    "The latest discussion pack carries a `## Research Summary` section, so the research-first protocol has something to check.",
  "QFAI-PROT-337":
    "prototyping.mode=exploration downgraded one or more declared-error gates to warning; the notice names the source file and the affected codes.",
  // The apply-order family. Each of these reads a column or a declaration that
  // nothing read before them, so a project meeting one of them for the first
  // time has a backlog to work through rather than a single edit.
  "QFAI-CONTRACT-015":
    "Every contract file states its apply order (`-- Depends on:` for SQL, `x-qfai-depends-on` for YAML/JSON), writing `-` when nothing has to be applied before it.",
  "QFAI-CONTRACT-034": "Every declared contract has a row in a contract index.",
  "QFAI-CONTRACT-036":
    "Every table a DB contract's foreign key references is either created by that same contract or by one its declared apply order names, so applying the contracts in the declared order never meets a `REFERENCES` to a table that does not exist yet.",
  // Reads the implementation tree rather than another declaration, so what it
  // reports is a contract and a screen that disagree.
  "QFAI-CONTRACT-037":
    "Every `data-qfai` marker a UI contract writes literally is mentioned by at least one file under the configured source directory, so an element the contract declares is one something on the screen renders.",
  // Without this entry nothing rejects a value here, so a project carrying a
  // typo passes and is never told.
  "QFAI-CONTRACT-038":
    "Every `prototype.mode` a UI contract declares is one this tooling knows, so the contract's own words say what kind of prototype the review is walking. A contract that declares no mode is asked nothing.",
  "QFAI-CONTRACT-040":
    "Every state/status value an API contract mandates must have a representable counterpart in the domain declared by the DB contract(s) bounding the same normalized field name (CHECK ... IN, CREATE TYPE ... AS ENUM, or inline ENUM), unless a DB contract declares it `Derived (not stored)`. Pairing is by normalized field name, not by an explicit pair declaration, so the finding is an error only when every such contract bounds the field with an ENUM.",
  "QFAI-CONTRACT-041":
    "Every `-- Derived (not stored): <column> = <values> from <inputs>` declaration in a DB contract parses, and every value it names is one the paired API contract requires and the DB domain cannot store. A declaration that does not parse was not read, and one that covers a stored or unrequested value is a claim about the schema that is not true of it.",
  "QFAI-CONTRACT-042":
    "`screens` in a UI contract is a list, every entry in it is a mapping with an `id` and a `route`, no two entries of one contract share an `id` (each spec's own contract is one), and contracts sharing an `id` state it with the same `title`, `route` and `primary_tasks`, so each entry is a screen every consumer reads.",
  // Same rule as `QFAI-BPAP-001` below: `paths.contractsDir` is configurable, so
  // the expected state names the contracts root by role. Pinning the default
  // path sent a project that moved its contracts to repair a directory it does
  // not use, and the offending file is already on the finding's own line.
  "QFAI-CONTRACT-050":
    "Every `- SSOT modules:` entry in a contract under the configured contracts directory must resolve to a readable file or directory that travels with the project.",
  // `paths.contractsDir` is configurable, so the expected state names the file
  // by role rather than pinning the default location: a project that moved its
  // contracts must not be told to repair a directory it does not use. The
  // offending path is already on the finding's `target:` line.
  "QFAI-BPAP-001": "Every BP/AP rule file in the contracts `design/` directory is readable.",
  "QFAI-BPAP-002": "Every BP/AP rule file parses as YAML.",
  "QFAI-BPAP-003": "Every BP/AP rule file holds a top-level YAML array of rule entries.",
  "QFAI-BPAP-004": "Every BP entry has an `id` of the form `BP-XXXX`.",
  "QFAI-BPAP-005": "BP IDs are unique across every BP rule file.",
  // The check is `toSafeString(value).trim() === ""`, so a required key that is
  // present but holds `[]`, `{}`, or `null` fails it exactly like an absent
  // one. The expected state says "non-empty scalar", not "present", so the
  // report does not read as if the key were missing when it is not.
  "QFAI-BPAP-006": "Every BP entry gives each of its required fields a non-empty scalar value.",
  "QFAI-BPAP-007": "Every AP entry has an `id` of the form `AP-XXXX`.",
  "QFAI-BPAP-008": "AP IDs are unique across every AP rule file.",
  "QFAI-BPAP-009": "Every AP entry gives each of its required fields a non-empty scalar value.",
  "QFAI-BPAP-010": "Every AP entry declares a `detection_method` from the supported set.",
  "QFAI-BPAP-011": "Every BP/AP entry declares a `severity` from the supported set.",
  "QFAI-BPAP-012": "Every BP/AP entry declares a `platform` from the supported set.",
  // The layered spec ladder: US->CAP, AC->US, BR->AC, EX->AC|BR, TC->EX. Each
  // rung raises an even code when the `Parent` is absent and the odd one above
  // it when the `Parent` is there but names nothing the level above defines —
  // the same two states at five different heights.
  // `paths.skillsDir` is configurable and the diff is taken against whatever it
  // resolves to, so the expected state names the tree by role. The directory
  // actually compared is on the finding's `target:` line.
  "QFAI-SKILLS-001":
    "The project's assistant skills directory matches the skill assets shipped by the installed QFAI version.",
  "QFAI-ASSETS-003":
    "The contract-layer tech.md and structure.md hold project values rather than shipped `<...>` slots and TODO/TBD placeholders. qfai-implement reads gate commands from <paths.contractsDir>/tech.md#standard-commands-copy-paste.",
  // Both state the graph, not a path: `paths.skillsDir` is configurable, and
  // the file actually judged is on the finding's `target:` line.
  "QFAI-SKILLS-013":
    "Every file under a skill's `references/` is cited by some document reachable from that skill's `SKILL.md`, so progressive disclosure can reach it.",
  "QFAI-SKILLS-014":
    "Every document under the skills tree can be read, so reference reachability is decided over the whole graph rather than over the part that happened to open.",
  "QFAI-SKILLS-015":
    "Every skill carries both fields a host registers it by: a `name:` that is its own directory, in lowercase letters, digits and single hyphens to 64 characters, and a `description:` with text in it, to 1024 characters and with no `<` or `>` — a skill that should not be offered to the model declares `disable-model-invocation: true` and keeps the description, rather than dropping the field and losing the registration with it.",
  "D-SAAS-PACKAGE-ATTESTATION-MISSING":
    "The saas-package profile finds a design-system attestation at its configured path.",
  "D-SAAS-PACKAGE-HANDOFF-SCHEMA":
    "A cross-skill handoff, when present, parses as an object and conforms to the handoff schema.",
  "QFAI-DRIFT-001":
    "Upstream SSOT files are unchanged relative to the base branch, or the change carries an approved Change Request.",
  // The assistant-tree provenance family. Every governed file under
  // `constitution/` and `catalog/` is either byte-identical to the installed
  // release or an explicitly recorded local overlay; the four classifications
  // below are the ways that can fail, and the fifth is the comparison itself
  // being impossible.
  "QFAI-ASSETS-004":
    "Every governed assistant file qfai wrote is still the content the installed release ships (`qfai init --force` refreshes an unedited stale copy).",
  "QFAI-ASSETS-005":
    "No governed assistant file is a local fork: a project-specific rule lives in a `*.local.md` overlay of the same layer, not in the qfai-owned file.",
  "QFAI-ASSETS-006":
    "Every file under the governed assistant layers is either shipped by the installed release or a `*.local.md` overlay.",
  "QFAI-ASSETS-007":
    "Every normative file the installed release ships exists in the project as a regular file.",
  "QFAI-ASSETS-008":
    "The governed assistant layers can be read on both sides, so provenance is actually compared rather than assumed clean.",
  "QFAI-ASSETS-009":
    "The assistant layers `qfai init --force` regenerates (`skills/`, `agents/`) hold what the installed release ships, so the project is not running the skill bodies it initialised with.",
  "QFAI-RESEARCH-013":
    "A UI-bearing discussion pack registers at least `uiux.competitive_refs_min` complete competitive references (default 3) in `04_Sources.md`.",
  "QFAI-RESEARCH-014":
    "Every registered competitive reference populates `adopted_points`, `rejected_points` and `local_translation` with real content rather than a placeholder.",
  "QFAI-RESEARCH-015":
    "Every `source_id` in the Research Summary resolves to an `id` in the same `sources[]` list.",
  "QFAI-RESEARCH-016":
    "The current discussion pack's `04_Sources.md` holds the `## Research Summary` slot, so the stored protocol output is in the file that owns it.",
  "QFAI-RESEARCH-017": "Every `sources[]` entry declares its `id`.",
  "QFAI-RESEARCH-018":
    "Every `best_practices[]` / `anti_patterns[]` entry declares `id`, `category`, `title`, `description` and `source_id`.",
  "QFAI-RESEARCH-019": "Every `reflection[]` entry declares `source_id` and `finding`.",
  "QFAI-RESEARCH-020":
    "`.qfai/state.json#discussion.currentId` resolves to a discussion pack on disk, so the Research Summary is read from the pack the operator selected.",
  "QFAI-RESEARCH-021":
    "No required Research Summary value is still the shipped `[...]` template placeholder.",
  "QFAI-AUTOPILOT-001":
    "Every `qfai-*` SKILL.md keeps its hard-required bucket to the common entries plus the ones it declares for itself, and names no retired entry. A skill may carry fewer — one it never reads costs a prompt and buys nothing — and never more.",
};

/**
 * Human-readable remediation per issue code, for codes whose emitters cannot
 * say more at the call site than the message already does. An emitter that
 * passes `suggested_action` always wins over this catalog: it knows the concrete
 * values that failed the check.
 */
export const ISSUE_FIX_BY_CODE: Record<string, string> = {
  "QFAI-ATDD-131":
    "Create the Coverage Depth Matrix for the named business flow under .qfai/evidence/.",
  "QFAI-ATDD-132": "Track the named coverage matrix and ATDD evidence file in Git.",
  "QFAI-ATDD-133":
    "Repair the named matrix rows and six coverage axes, then make its counts match the linked ATDD evidence.",
  "QFAI-CONTRACT-034":
    "Correct the named contract index row or add its missing contract file, then rerun validate.",
  "QFAI-DRIFT-001":
    "Restore the protected file or record an in-force change request authorizing the named change.",
  "QFAI-FLOW-005": "Use an existing BF-NNNN ID for --flow, or create the flow before selecting it.",
  "QFAI-LAYOUT-001":
    "Invoke the `/qfai-migration-spec-to-story` skill in your AI assistant to move the old spec packs to the story tree, then rerun validate.",
  "QFAI-SCAN-002":
    "Fix the unreadable test path or reduce the configured test globs so the selected tests can all be scanned.",
  "QFAI-SPACK-102":
    "Record the user's decision in the open-question row, or leave it open until the decision is made.",
  "QFAI-STORY-001": "Create the required policy or contract file named in the finding.",
  "QFAI-STORY-002": "Correct the named story-tree ID or directory so the ID and path agree.",
  "QFAI-STORY-003": "Repair the named decisions or open-questions row and its required fields.",
  "QFAI-STORY-004": "Add the missing AC or EX record and repair the cited story reference.",
  "QFAI-STORY-005": "Define the missing business rule or contract, or correct the cited reference.",
  "QFAI-STORY-006":
    "Add a real test in the required layer with a QFAI annotation for the named BF, AC, or EX.",
  "QFAI-STORY-007":
    "Move the named test annotation to its required E2E, integration, API, or unit layer.",
  "QFAI-STORY-008":
    "Correct the annotation to a declared BF, AC, or EX ID, or remove a stale annotation.",
  "QFAI-STORY-010":
    "Restore the protected row or record an in-force change request for the named file change.",
  "QFAI-STORY-011": "Add a Mermaid flowchart or sequence diagram to the named business-flow file.",
  // The finding already names the offending key and the release the window
  // closes at; this is the catalog half, which `qfai report` renders for
  // codes whose `issue(...)` sites carry no `suggested_action` of their own.
  "QFAI-CFG-001":
    "Delete the named key from qfai.config.yaml. It changes no behaviour, so removing it is not a settings change — every validator already runs as if it were absent.",
  "QFAI-BPAP-001":
    "Restore read access to the file, or delete it if it is no longer part of the rule set.",
  "QFAI-BPAP-002": "Correct the YAML syntax the parse error points at, then rerun validate.",
  // QFAI-BPAP-001/002/003 fire on both `best-practices*.yaml` and
  // `anti-patterns*.yaml`, so the example ID has to stay neutral: spelling
  // `BP-0001` here would walk an anti-pattern author straight into
  // QFAI-BPAP-007, which demands the `AP-XXXX` form.
  "QFAI-BPAP-003":
    "Rewrite the file as a top-level YAML sequence of entries (`- id: BP-0001` in a best-practices file, `- id: AP-0001` in an anti-patterns file); a mapping at the root is not a rule set.",
  "QFAI-BPAP-004": "Rename the entry's `id` to `BP-` followed by four digits, e.g. `BP-0001`.",
  "QFAI-BPAP-005":
    "Give one of the colliding entries a fresh BP ID, or merge them if they state the same practice.",
  // Both codes fire on a present-but-empty value as well as on an absent key:
  // the check reads `toSafeString(value).trim()`, and a `description: []` or a
  // `detection_method: {}` reduces to the empty string. "Add the missing field"
  // is unusable on that path — the key is already there, and adding a second
  // one of the same name is a YAML duplicate rather than a repair.
  "QFAI-BPAP-006":
    "Give the BP entry a non-empty scalar for the field the message names: add the key when it is absent, and overwrite the value in place when the key is present but empty or written as a list or mapping. Drop the entry instead if the practice is no longer needed.",
  "QFAI-BPAP-007": "Rename the entry's `id` to `AP-` followed by four digits, e.g. `AP-0001`.",
  "QFAI-BPAP-008":
    "Give one of the colliding entries a fresh AP ID, or merge them if they state the same anti-pattern.",
  "QFAI-BPAP-009":
    "Give the AP entry a non-empty scalar for the field the message names: add the key when it is absent, and overwrite the value in place when the key is present but empty or written as a list or mapping. Drop the entry instead if the anti-pattern is no longer needed.",
  "QFAI-BPAP-010": "Set `detection_method` to one of the values the message lists.",
  "QFAI-BPAP-011": "Set `severity` to one of the values the message lists.",
  "QFAI-BPAP-012": "Set `platform` to one of the values the message lists.",
  // All four declared-mapping paths (blank cell, several directories, a CAP on
  // two rows, two CAPs on one directory) pass no `suggested_action`, and one
  // repair covers them: the `Spec` cell is the mapping, so the fix is always to
  // make each row name exactly one directory that no other row names.
  "QFAI-AGENT-015":
    "Remove the role from the skill's `roles:`, or bind it in the package defaults (`packages/qfai/assets/defaults/agent-routing.yml` or `review-profiles.yml`). For a project-specific binding, override the complete route or profile in `qfai.config.yaml`.",
  "QFAI-AGENT-016":
    "Repair the `SKILL.md` frontmatter the message names: close the `---` block, and give `roles:` a list of strings and `routing-profile:` a non-empty profile name.",
  "QFAI-AGENT-017":
    "Add a route with a dispatching phase to `packages/qfai/assets/defaults/agent-routing.yml`, or add a complete project-specific route under `qfai.config.yaml#routing`. Drop the skill's `routing-profile:` if it is deliberately un-routed.",
  "QFAI-AGENT-018":
    "Make the skill's `routing-profile:` and the route's `review_profile:` name the same profile. Define package defaults in `packages/qfai/assets/defaults/review-profiles.yml`; use `qfai.config.yaml#routing` and `#reviewProfiles` for complete project-specific overrides.",
  "QFAI-AGENT-019":
    "Add the agent to the skill's `roles:`, or remove its binding from `packages/qfai/assets/defaults/agent-routing.yml` or `review-profiles.yml`. For a project-specific binding, override the complete route or profile in `qfai.config.yaml`.",
  // The orphan-prohibition emitter passes no `suggested_action` on any path, so
  // every rung of the ladder depends on this catalog for its `fix:` line. The
  // even codes are repaired by writing a `Parent`, the odd ones by pointing an
  // existing `Parent` at something the level above actually defines.
  // Only the mirror-only rejection paths pass a `suggested_action`. The rest —
  // a missing `visual.*` block or key, a legacy `checklist.*` key, missing
  // component guidance, a mirror value that diverges from DESIGN.md, and a
  // mirror key DESIGN.md never authored — all fall through to this entry, so it
  // has to name every repair, not just the additive one.
  "QFAI-DCON-005":
    "design-system.yaml is a verbatim copy of DESIGN.md, so repair the entry the message names in whichever direction it is off: add it when it is missing (the `visual.*` block or key, the legacy `checklist.*` key, or the component-guidance block), copy DESIGN.md's value over it when the two diverge, and delete it when DESIGN.md does not author it. Then refreeze the lock and rerun validate.",
  // The browser-QA bundle checks are schema assertions raised by a local
  // `makeIssue` helper that has no `suggested_action` parameter, so every one of
  // their call sites depends on this catalog for its `fix:` line.
  "QFAI-PROT-273":
    "Add the `browserQa` block the message names to the browser-QA bundle, with `executed` a boolean and `status` one of completed|skipped|failed.",
  "QFAI-PROT-274":
    "Make `browserQa.executed` and `browserQa.status` agree: `executed=true` pairs with `status=completed`, and any other status pairs with `executed=false`.",
  "QFAI-PROT-275":
    "Give `browserQa.summary` an object per phase (smoke, interaction, visual, accessibility) carrying `status`, `findingsCount`, and `checksCount`, with `passed`/`failed` numeric when present.",
  "QFAI-PROT-276":
    "Make `findings` an array whose every entry carries a non-empty summary and detail, a severity from the supported set, at least one `evidence_refs` entry, and `repair_suggestions`.",
  "QFAI-RESEARCH-015":
    "Point `source_id` at an `id` that the same Research Summary's `sources[]` declares, or add the missing source entry.",
  "QFAI-RESEARCH-016":
    "Add a `## Research Summary` section to the current pack's `04_Sources.md` and record the research-first protocol output under it.",
  "QFAI-RESEARCH-017": "Give the `sources[]` entry an `id` (`SRC-NNNN`).",
  "QFAI-RESEARCH-018":
    "Fill the entry's missing `id` / `category` / `title` / `description` / `source_id` fields.",
  "QFAI-RESEARCH-019": "Fill the reflection entry's missing `source_id` / `finding` fields.",
  "QFAI-RESEARCH-020":
    "Run `qfai discussion use <id>` to point `.qfai/state.json#discussion.currentId` at a pack that exists.",
  "QFAI-RESEARCH-021":
    "Replace every `[...]` placeholder the message names with the actual research-first protocol output.",
  "QFAI-AUTOPILOT-001":
    "Drop the entries the message names from the SKILL.md hard-required bucket, or declare one this skill really consumes for that skill. `qfai init --force` regenerates the shipped wording.",
};

/** Printed as `expected` when a code has no catalog entry. */
export const UNCATALOGUED_EXPECTED = "Rule compliance";

/** Printed as `fix` when a code has neither a `suggested_action` nor a catalog entry. */
export const UNCATALOGUED_FIX = "Follow the expected rule and rerun validate.";

function resolveIssueTarget(issue: Issue): string {
  if (issue.file && issue.refs && issue.refs.length > 0) {
    return `${issue.file} [${issue.refs.join(", ")}]`;
  }
  if (issue.file) {
    return issue.file;
  }
  if (issue.refs && issue.refs.length > 0) {
    return issue.refs.join(", ");
  }
  return "(project)";
}

/**
 * Human-readable "expected state" a report prints for an issue code. Exported so
 * the catalog entry for a code can be asserted against the single definition the
 * emitting validator uses, instead of drifting from it silently.
 *
 * `issue.rule` is deliberately not a fallback: it holds an internal rule token
 * (`bpApDb.duplicateId`), and printing it in the `expected` field made a missing
 * catalog entry look like a value rather than an omission.
 */
export function resolveIssueExpected(issue: Issue): string {
  return ISSUE_EXPECTED_BY_CODE[issue.code] ?? UNCATALOGUED_EXPECTED;
}

/** Remediation a report prints for an issue: emitter first, then catalog. */
export function resolveIssueFix(issue: Issue): string {
  return issue.suggested_action ?? ISSUE_FIX_BY_CODE[issue.code] ?? UNCATALOGUED_FIX;
}

function emitTextField(label: string, value: string): void {
  const lines = value.replace(/\r\n/g, "\n").split("\n");
  if (lines.length === 0) {
    process.stdout.write(`  ${label}: \n`);
    return;
  }
  const [first, ...rest] = lines;
  process.stdout.write(`  ${label}: ${first ?? ""}\n`);
  for (const line of rest) {
    process.stdout.write(`  ${" ".repeat(label.length)}  ${line}\n`);
  }
}

function escapeGitHubCommandValue(value: string): string {
  return value.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}

/**
 * One workflow-command PROPERTY value.
 *
 * The message escapes above plus `:` and `,`, which are the separators GitHub parses the
 * metadata block with — `%` first, or it would re-encode the escapes that follow it.
 */
function escapeGitHubCommandProperty(value: string): string {
  return escapeGitHubCommandValue(value).replace(/:/g, "%3A").replace(/,/g, "%2C");
}
