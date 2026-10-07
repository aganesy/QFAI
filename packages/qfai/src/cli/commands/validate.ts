import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { FailOn, OutputFormat } from "../../core/config.js";
import { loadConfig } from "../../core/config.js";
import { normalizeValidationResult } from "../../core/normalize.js";
import { isStoryTreeId } from "../../core/storyTree/ids.js";
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
  // rest of the toolchain uses (so the source-of-truth is single).
  const effectiveToolVersion = options.toolVersionOverride ?? (await resolveToolVersion());
  await emitProvenance(effectiveToolVersion);
  const configuredValidateJsonPath = configResult.config.output.validateJsonPath;
  const scopedFlowIds = options.flowIds ?? [];
  const normalized = normalizeValidationResult(root, rawResult);
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
    // `validate-<profile>.json` would let parallel Slice workers
    // race on the same files, leaving the last finisher's single flow looking
    // like a repo-wide PASS to every downstream reader.
    if (
      scopedReportRel !== null &&
      !normalized.issues.some((issue) => issue.code === "QFAI-FLOW-005")
    ) {
      await emitJson(normalized, root, scopedReportRel);
    }
  } else {
    // Always-latest report + profile-suffixed report.
    await emitJson(normalized, root, configuredValidateJsonPath);
    const profileLabel = normalized.profile ?? options.profile ?? "full";
    const profileSuffixedRel = profileSuffixedReportPath(configuredValidateJsonPath, profileLabel);
    await emitJson(normalized, root, profileSuffixedRel);
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

/**
 * Compute the `.qfai/report/validate-<profile>.json` path that mirrors
 * the configured always-latest path. Splits at the basename so a custom
 * `validateJsonPath` of `.qfai/output/foo.json` still produces
 * `.qfai/output/foo-<profile>.json` — keeps backward compatibility with
 * non-default configurations.
 *
 */
export function profileSuffixedReportPath(configured: string, profile: string): string {
  const dir = path.posix.dirname(configured.replace(/\\/g, "/"));
  const base = path.posix.basename(configured.replace(/\\/g, "/"));
  const ext = path.posix.extname(base);
  const stem = ext.length > 0 ? base.slice(0, -ext.length) : base;
  return path.posix.join(dir, `${stem}-${profile}${ext}`);
}

/** Finding families grouped by the validators the current profiles run. */
export const GATE_GROUP_FAMILIES = {
  hygiene: ["QFAI-HYG-*"],
  "skills-integrity": ["QFAI-SKILLS-*"],
  "assistant-assets": ["QFAI-ASSETS-*"],
  discussion: ["QFAI-DPACK-*", "QFAI-VIS-*"],
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
    "QFAI-STORY-012",
    "QFAI-STORY-013",
    "QFAI-STORY-015",
    "QFAI-STORY-016",
    "QFAI-STORY-017",
    "QFAI-SPACK-102",
  ],
  "story-contract-index": ["QFAI-CONTRACT-034"],
  "document-schema": ["QFAI-DOCSCHEMA-*"],
  "story-test-obligations": [
    "QFAI-STORY-006",
    "QFAI-STORY-007",
    "QFAI-STORY-008",
    "QFAI-STORY-009",
    "QFAI-STORY-014",
  ],
  "story-test-scan": ["QFAI-SCAN-002"],
  sdd: [
    "QFAI-AUTOPILOT-*",
    "W-ASSISTANT-LAYOUT",
    "W-SKILL-PROJECT-MEMORY",
    "W-STALE-REFERENCE",
    "I-ASSISTANT-LAYER-UNSEEDED",
    "D-DEPRECATED-PATH",
  ],
  "reviewer-gate-sdd": ["R-AUTOPILOT-POLICY-*"],
  "reviewer-gate-shared": ["R-MOCK-HREF-DRIFT"],
  contracts: [
    "QFAI-CONTRACT-000",
    "QFAI-CONTRACT-010",
    "QFAI-CONTRACT-011",
    "QFAI-CONTRACT-012",
    "QFAI-CONTRACT-013",
    "QFAI-CONTRACT-014",
    "QFAI-CONTRACT-015",
    "QFAI-CONTRACT-020",
    "QFAI-CONTRACT-036",
    "QFAI-CONTRACT-037",
    "QFAI-CONTRACT-038",
    "QFAI-CONTRACT-040",
    "QFAI-CONTRACT-041",
    "QFAI-DB-*",
  ],
  "ui-screen-entries": ["QFAI-CONTRACT-042"],
  "contract-parse": ["QFAI-CONTRACT-021"],
  "design-contract-readiness": ["QFAI-DCON-030", "QFAI-DCON-034"],
  "root-design-md-parse": ["QFAI-DCON-033"],
  "package-self-governance": PACKAGE_SELF_GOVERNANCE_FAMILIES,
  prototyping: [
    "QFAI-DT-*",
    "QFAI-MOCK-*",
    "QFAI-FLOW-001",
    "QFAI-FLOW-002",
    "QFAI-FLOW-004",
    "QFAI-CONSISTENCY-*",
    "QFAI-AGENT-*",
    "QFAI-AUD-*",
    "QFAI-PLATFORM-*",
    "QFAI-CFG-LINK-*",
  ],
  "prototyping-skill": ["UIX-VAL-SKILL-*"],
  "test-stubs": ["QFAI-TEST-*"],
  drift: ["QFAI-DRIFT-*", "QFAI-STORY-010"],
  "saas-package-profile": [ATTESTATION_MISSING_CODE, HANDOFF_SCHEMA_CODE],
} as const satisfies Record<string, readonly string[]>;

type GateGroup = keyof typeof GATE_GROUP_FAMILIES;
const ALL_GATE_GROUPS = Object.keys(GATE_GROUP_FAMILIES) as GateGroup[];

const STAGE_ONLY_GATE_GROUPS: Partial<Record<GateGroup, ValidationProfile>> = {
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
  "root-design-md-parse",
  "research-summary",
  "canonical-uix",
];

const PROFILE_GATE_GROUPS: Record<ValidationProfile, readonly GateGroup[]> = {
  full: FULL_GATE_GROUPS,
  verify: FULL_GATE_GROUPS,
  discussion: ["discussion", "research-summary", "canonical-uix", "root-design-md-parse"],
  sdd: [
    "story-structure",
    "document-schema",
    "story-contract-index",
    "design-contract-readiness",
    "sdd",
    "reviewer-gate-sdd",
    "contracts",
    "ui-screen-entries",
    "contract-parse",
    "package-self-governance",
  ],
  prototyping: PROTOTYPING_GATE_GROUPS,
  atdd: ["story-test-obligations", "story-test-scan", "test-stubs"],
  tdd: [
    "story-test-obligations",
    "story-test-scan",
    "test-stubs",
    "drift",
    "contracts",
    "ui-screen-entries",
    "contract-parse",
  ],
  "saas-package": [...PROTOTYPING_GATE_GROUPS, "saas-package-profile"],
  drift: ["drift", "story-test-scan"],
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

/** The most issues of one code that `--format text` prints before it counts the rest. */
const TEXT_ISSUES_PER_GROUP = 5;

interface TextIssueGroup {
  head: Issue;
  items: Issue[];
}

/**
 * Issues of one code, severity and suppression state, in the order the first of
 * each group appeared. A rule that fails in a hundred places is one group, not
 * a hundred records.
 */
function groupIssues(issues: readonly Issue[]): TextIssueGroup[] {
  const groups = new Map<string, TextIssueGroup>();
  for (const item of issues) {
    const key = `${item.severity}|${item.code}|${item.suppressed === true}`;
    const group = groups.get(key);
    if (group) {
      group.items.push(item);
    } else {
      groups.set(key, { head: item, items: [item] });
    }
  }
  return [...groups.values()];
}

function formatTextIssueLine(item: Issue): string {
  const location = item.file ? ` (${item.file})` : "";
  const refs = item.refs && item.refs.length > 0 ? ` refs=${item.refs.join(",")}` : "";
  const suppressed = item.suppressed ? " suppressed=true" : "";
  return `[${item.severity}] ${item.code} ${item.message}${location}${refs}${suppressed}`;
}

/**
 * Renders the default `--format text` output.
 *
 * The emitted line grammar is the validate contract's text output grammar;
 * both must be changed together.
 */
export function emitText(result: ValidationResult, failOn: FailOn): void {
  for (const group of groupIssues(result.issues)) {
    const shown = group.items.slice(0, TEXT_ISSUES_PER_GROUP);
    for (const item of shown) {
      process.stdout.write(`${formatTextIssueLine(item)}\n`);
    }
    const hidden = group.items.length - shown.length;
    if (hidden > 0) {
      const suppressed = group.head.suppressed ? " suppressed=true" : "";
      process.stdout.write(
        `[${group.head.severity}] ${group.head.code} and ${hidden} more${suppressed}\n`,
      );
    }
    if (shouldEmitIssueDetail(group.head, failOn)) {
      for (const fix of new Set(shown.map(resolveIssueFix))) {
        emitTextField("fix", fix);
      }
    }
  }
  process.stdout.write(
    `counts: info=${result.counts.info} warning=${result.counts.warning} error=${result.counts.error}\n`,
  );
  // The effective failOn appeared only in the `--format github` summary line,
  // so a reviewer reading the default text output could not see why the exit
  // code is what it is.
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
 * Whether a group of issues prints its `fix` lines: every error, and a warning
 * when warnings fail the run. Tied to `severity === "error"` alone, the
 * remedy of every warning-severity code would be unreachable, although under
 * `--strict` / `--fail-on warning` the warning is exactly what fails the run.
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

/** One issue as a GitHub workflow command on stdout. */
export function emitGitHub(issue: Issue, failOn: FailOn): void {
  const level = gitHubLevel(issue);
  // The location metadata is ESCAPED, and by the property rules rather than the message
  // ones. `issue.file` can name a path a pull request chose — so a
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
  "QFAI-STORY-003":
    "The decisions and open-questions tables have valid records, and every decision or question a contract rule or a superseded row cites is declared by a row.",
  "QFAI-STORY-004": "Each story has acceptance criteria and examples with valid references.",
  "QFAI-STORY-005":
    "Every business rule and contract reference resolves, and a rule numbered BR-NNNN-NNNN carries the number of the contract that declares it.",
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
  "QFAI-STORY-011":
    "The one Mermaid block in each business-flow file's `## Flow` section is a flowchart or sequence diagram.",
  "QFAI-STORY-012":
    "Each section of `01_policy/constraint.md` numbers its IDs from 01 in table order, with the section's prefix: TC, OC or BC.",
  "QFAI-STORY-013":
    "The `## Architecture` section of the contract-layer tech.md draws exactly the layers and dependencies its table lists, and each row depends only on layers in rows below it.",
  "QFAI-STORY-014":
    "A test file records its trace only as `QFAI:BF-`, `QFAI:AC-` or `QFAI:EX-` annotations, the shapes a check reads.",
  "QFAI-STORY-015":
    "Story-tree documents name no file outside `.qfai` by a repository path, so a spec does not depend on a file that changes without a spec review.",
  "QFAI-STORY-016":
    "No spec document states a term `validation.staleTerms` lists, apart from the decision and open-question registers.",
  "QFAI-STORY-017":
    "A decisions.md row recorded after the Approach form began to be checked holds Evidence, Grounds, Residual risk and Rollback in that order, none empty, with every Evidence entry a file: or command: item.",
  "QFAI-DOCSCHEMA-001":
    "Exactly one shipped schema covers each story-tree Markdown file, and the file has the sections, order and content that schema declares and carries no opt-out marker.",
  "QFAI-DOCSCHEMA-002": "The document-schema check runs over the story tree.",
  "QFAI-SPACK-102": "No open question is a decision the user was asked for and never took.",
  "QFAI-PROFILE-001":
    "A partial profile does not evaluate every hard gate; a PASS on it is not full-scan coverage.",
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
    "Every deferred OQ row in `11_OQ-Register.md` records its `Resolution` and a `Next-Decision-Point` naming the next point at which it is decided.",
  "QFAI-DPACK-008": "`03_Story-Workshop.md` must include at least one Mermaid block.",
  "QFAI-DPACK-009":
    "`03_Story-Workshop.md` Mermaid content should include `flowchart` or `sequenceDiagram`.",
  "QFAI-DPACK-010":
    "Legacy discussion naming is deprecated; canonical naming should be used for new outputs.",
  "QFAI-DPACK-011":
    "On a visual surface, every `DESIGN.md` key and archetype a discussion pack proposes is one the front-matter schema accepts.",
  "QFAI-HYG-001": "Legacy directory aliases are forbidden and must be migrated to canonical names.",
  "QFAI-HYG-002": "Template/sample artifacts should not remain under `paths.specsDir`.",
  "QFAI-HYG-003":
    "The root `.gitignore` carries every recommended QFAI ignore entry, the root `tmp/` included.",
  "QFAI-VIS-001": "`01_Context.md` should include at least one Mermaid diagram.",
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
  "QFAI-CFG-LINK-001":
    "qfai.config.yaml: prototyping.primaryUiContract names a UI-NNNN contract declared under `<paths.contractsDir>/ui/`.",
  "QFAI-CFG-LINK-002":
    "qfai.config.yaml: paths.* points to a directory that does not exist on disk.",
  "QFAI-DCON-030":
    "Root DESIGN.md is required as the brand SSOT for UI-bearing projects (file missing).",
  "QFAI-DCON-033":
    "Root DESIGN.md exists but failed to parse per design-md-spec (front-matter is malformed).",
  "QFAI-DCON-034":
    "Root DESIGN.md must be the project's own brand SSOT, not the unreplaced qfai sample seeded by `qfai init`.",
  "QFAI-AGENT-015":
    "Every role a step or skill declares is dispatchable: some routing phase or its review profile selects it.",
  "QFAI-AGENT-016":
    "Every routed step's `STEP.md` and routed skill's `SKILL.md` frontmatter parses, and its `roles:` and `routing-profile:` are usable, so the routing cross-check has something to read.",
  "QFAI-AGENT-017":
    "Every step or skill that declares a `routing-profile:` is routed at least one dispatchable phase by the routing manifest.",
  "QFAI-AGENT-018":
    "Each routed step or skill has exactly one review gate, named by both sides and defined in the review-profile manifest.",
  "QFAI-AGENT-019":
    "A step's or skill's `roles:` is a superset of every agent the routing manifest binds to it, including the reviewers its review profile selects.",
  "QFAI-RESEARCH-012":
    "The latest discussion pack carries a `## Research Summary` section, so the research-first protocol has something to check.",
  // The apply-order family. Each of these reads a column or a declaration that
  // nothing read before them, so a project meeting one of them for the first
  // time has a backlog to work through rather than a single edit.
  "QFAI-CONTRACT-015":
    "Every contract file states its apply order (`-- Depends on:` for SQL, `x-qfai-depends-on` for YAML/JSON), writing `-` when nothing has to be applied before it.",
  "QFAI-CONTRACT-034":
    "Every contract under a kind directory declares one ID of that kind, is named `<kind>-NNNN-<slug>` after it, and has a contracts.md row that agrees with its ID and file. Every row names a contract file, and no two contracts share a number.",
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
  // The layered spec ladder: US->CAP, AC->US, BR->AC, EX->AC|BR, TC->EX. Each
  // rung raises an even code when the `Parent` is absent and the odd one above
  // it when the `Parent` is there but names nothing the level above defines —
  // the same two states at five different heights.
  "QFAI-ASSETS-003":
    "The contract-layer tech.md holds project values rather than shipped `<...>` slots and TODO/TBD placeholders. qfai-implement reads gate commands from <paths.contractsDir>/tech.md#standard-commands-copy-paste.",
  // Both state the graph, not a path: `paths.skillsDir` is configurable, and
  // the file actually judged is on the finding's `target:` line.
  "QFAI-SKILLS-013":
    "Every file under a skill's `references/` is cited by some document reachable from that skill's `SKILL.md`, so progressive disclosure can reach it.",
  "QFAI-SKILLS-014":
    "Every document under the skills tree can be read, so reference reachability is decided over the whole graph rather than over the part that happened to open.",
  "QFAI-SKILLS-015":
    "Every skill carries both fields a host registers it by: a `name:` that is its own directory, in lowercase letters, digits and single hyphens to 64 characters, and a `description:` with text in it, to 1024 characters and with no `<` or `>` — a skill that should not be offered to the model declares `disable-model-invocation: true` and keeps the description, rather than dropping the field and losing the registration with it.",
  "QFAI-SKILLS-016":
    "The step layer holds only `STEP.md` steps named after their directories; each is owned by `common` or by a skill whose `steps:` lists it, `requires:` names only installed `common-*` steps, every step a skill or a workflow plan names is installed and used, and a skill that lists steps declares `orchestrator` and every role those steps declare.",
  "D-SAAS-PACKAGE-ATTESTATION-MISSING":
    "The saas-package profile finds a design-system attestation at its configured path.",
  "D-SAAS-PACKAGE-HANDOFF-SCHEMA":
    "A cross-skill handoff, when present, parses as an object and conforms to the handoff schema.",
  "QFAI-DRIFT-001":
    "Upstream SSOT files are unchanged relative to the base branch, or the change carries an approved Change Request.",
  "QFAI-DRIFT-002":
    "An example whose row changed since the base branch has a test annotating it that changed too.",
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
  "D-DEPRECATED-PATH": "The retired `.qfai/assistant/instructions/` layer is absent.",
  "W-ASSISTANT-LAYOUT": "Every directory under `.qfai/assistant/` is one of the canonical layers.",
  "W-SKILL-PROJECT-MEMORY":
    "A `project_memory:` block in a SKILL.md is the last thing in the file.",
  "W-STALE-REFERENCE":
    "No skill document still names a token that its implementation has since replaced.",
  "I-ASSISTANT-LAYER-UNSEEDED": "Every canonical `.qfai/assistant/` layer directory is seeded.",
  QFAI_CONFIG_INVALID: "Every value in qfai.config.yaml has the type and range its key declares.",
  "QFAI-AGENT-005": "Every agent definition file has each required section heading.",
  "QFAI-AGENT-007":
    "The agent routing manifest and its defaults file can be read and parse to the shape the routing check expects.",
  "QFAI-AGENT-008": "Every agent a routing phase names is a defined agent.",
  "QFAI-AGENT-009":
    "`review-profiles.yml` can be parsed, is an object holding a `profiles` object, and each profile field is a list of reviewer ids.",
  "QFAI-AGENT-010":
    "Every id a review profile lists in its `_required` fields is a reviewer agent.",
  "QFAI-AGENT-011": "Every agent definition file carries front matter that parses.",
  "QFAI-AGENT-012": "An agent definition's front-matter `name` equals its file's agent id.",
  "QFAI-AGENT-013":
    "Every routing phase declares an `iteration`, `rerun_policy`, `review_profile` and agent fields drawn from the values the routing check allows.",
  "QFAI-ASSETS-001": "The drift-protocol rule file exists under the assistant tree.",
  "QFAI-ASSETS-002": "The test-layers rule file exists under the assistant tree.",
  "QFAI-AUD-001": "Every screen in a UI contract lists at least one `primary_tasks` entry.",
  "QFAI-AUD-004":
    "Source files use design tokens, with raw color literals no more numerous than the configured threshold.",
  "QFAI-AUD-020": "No screen lists more primary tasks than the recommended maximum.",
  "QFAI-AUD-021":
    "Every `primary_tasks` entry has exactly the `id`, `label` and `acceptance` keys.",
  "QFAI-CONSISTENCY-001":
    "A fallback value written beside a design-token reference equals the value the token resolves to.",
  "QFAI-CONSISTENCY-002":
    "Every screen a UI contract defines has an HTML mock; a missing one is optional supplemental evidence.",
  "QFAI-CONTRACT-000":
    "Each of the UI, API and DB contract directories holds at least one contract file.",
  "QFAI-CONTRACT-010": "Every contract file declares a `QFAI-CONTRACT-ID`.",
  "QFAI-CONTRACT-011": "Every contract file declares exactly one `QFAI-CONTRACT-ID`.",
  "QFAI-CONTRACT-012":
    "A contract file's ID starts with the prefix of the kind directory the file sits in.",
  "QFAI-CONTRACT-013": "No two contract files declare the same contract ID.",
  "QFAI-CONTRACT-014":
    "Every contract ID a file lists as a dependency is declared by some contract file.",
  "QFAI-CONTRACT-020": "An API contract file defines an OpenAPI document.",
  "QFAI-CONTRACT-021": "Every UI, API and DB contract file parses.",
  "QFAI-DB-001":
    "No DB contract file holds a destructive SQL operation such as dropping or truncating a table.",
  "QFAI-DB-002":
    "Each table, view or index appears once per DB contract file, so the file reads the same as it is applied.",
  "QFAI-DT-001": "Every design-token file can be read.",
  "QFAI-DT-002": "Every design-token file parses as YAML.",
  "QFAI-DT-003":
    "A design-token file holds at least one token layer: primitive, semantic or component.",
  "QFAI-DT-004": "No design token has an empty value.",
  "QFAI-DT-005": "Every design token has a `$type` the token format defines.",
  "QFAI-DT-006": "Every `platform` a design-token file or token names is a known platform.",
  "QFAI-DT-007": "A design-token file's root is a YAML object.",
  "QFAI-DT-008": "A design-token file's root has a non-empty `version`.",
  "QFAI-DT-009": "A design-token file's root has a non-empty `platform`.",
  "QFAI-DT-010": "A design-token file's root has a non-empty `primitive` object.",
  "QFAI-FLOW-001": "Every Mermaid state diagram in the story tree is declared `stateDiagram-v2`.",
  "QFAI-FLOW-002": "Every transition in a Mermaid state diagram carries a label.",
  "QFAI-FLOW-004": "Every Mermaid flowchart declares its direction: TD, LR, TB, RL or BT.",
  "QFAI-MOCK-001": "An HTML mock is well-formed HTML.",
  "QFAI-MOCK-002": "An HTML mock loads nothing from an external URL.",
  "QFAI-MOCK-003": "An HTML mock holds no script tag.",
  "QFAI-MOCK-004": "Every CSS `var()` in an HTML mock has a fallback value.",
  "QFAI-MOCK-005":
    "An HTML mock that uses CSS custom properties annotates them with token comments.",
  "QFAI-MOCK-006": "An HTML mock that shows state variants includes the default state.",
  "QFAI-MOCK-007": "An HTML mock that shows state variants includes the error state.",
  "QFAI-MOCK-008": "Text and background colors in an HTML mock meet the WCAG AA contrast ratio.",
  "QFAI-MOCK-009": "Touch targets in an HTML mock meet the minimum size for mobile.",
  "QFAI-MOCK-010": "An HTML mock references no local file.",
  "QFAI-MOCK-011": "Every URL in an HTML mock uses a safe scheme.",
  "QFAI-MOCK-012": "An HTML mock has no inline event handler attribute.",
  "QFAI-PLATFORM-001":
    "The platform named on the command line or in qfai.config.yaml is one the platform rules know, so the platform-specific rules apply.",
  "QFAI-PLATFORM-002":
    "A project is detected as a single platform; a cross-platform one such as Electron gets the cross-platform rules.",
  "QFAI-RESEARCH-001": "A Research Summary lists at least one source.",
  "QFAI-RESEARCH-002":
    "At least 80% of a Research Summary's sources are no more than two years old.",
  "QFAI-RESEARCH-003":
    "A Research Summary with reflection entries has at least one entry whose action is `apply`.",
  "QFAI-RESEARCH-004": "Every Research Summary source has a `title`.",
  "QFAI-RESEARCH-005": "Every Research Summary source has a `url`.",
  "QFAI-RESEARCH-006": "Every Research Summary source has a `published` date written YYYY-MM-DD.",
  "QFAI-RESEARCH-007": "A Research Summary has a non-empty `best_practices` list.",
  "QFAI-RESEARCH-008": "A Research Summary has a non-empty `anti_patterns` list.",
  "QFAI-RESEARCH-009": "Every reflection entry has an `action` of apply, reject or defer.",
  "QFAI-RESEARCH-010": "Every reflection entry has a non-empty `reason`.",
  "QFAI-RESEARCH-011": "A Research Summary has a non-empty `reflection` list.",
  "QFAI-SKILLS-010": "Every SKILL.md carries the `[DRIFT-PROTOCOL:REQUIRED]` marker.",
  "QFAI-SKILLS-011":
    "The shared delegation baseline has a `## Reviewer Gate Baseline` section, so every skill inherits a reviewer gate.",
  "QFAI-SKILLS-012": "The Reviewer Gate Baseline states every obligation a skill inherits.",
  "QFAI-TEST-002":
    "The stub scan reads every test file the configured globs select, so a clean result shows that no stub exists.",
  "QFAI-TRACE-118": "The scenario document in a spec's examples parses.",
  "QFAI-TRACE-119": "A spec's examples feature carries exactly one `@SPEC` tag, naming the spec.",
  "QFAI-TRACE-120": "Every scenario's `@SPEC` tag names the spec.",
  "QFAI-TRACE-121": "Every scenario has exactly one `@SC-XXXX-YYYY` tag.",
  "QFAI-TRACE-122": "A scenario's SC ID uses the namespace of its spec number.",
  "QFAI-TRACE-123": "Every scenario names the AC it covers in a comment.",
  "QFAI-VALIDATE-017":
    "A CI run uses a full-scan profile before it declares completion; a stage-gate profile is valid but proves no completion.",
  "QFAI-WAIVER-001":
    "`.qfai/waivers.yml` can be read and parses, and every waiver in it is a well-formed record.",
  "QFAI-WAIVER-002": "No waiver targets a finding that is an error.",
  "QFAI-WAIVER-003": "No waiver in `.qfai/waivers.yml` has passed its `expires` date.",
  "QFAI-WAIVER-004":
    "Every waiver's `rule` names a finding code this run emits and a waiver can suppress.",
  "R-AUTOPILOT-POLICY-MISSING":
    "The shared autopilot policy has its three buckets (auto-decide, ask-user, hard-required), and each skill's own policy lists the hard-required inputs declared for it.",
  "R-AUTOPILOT-POLICY-WIDENED":
    "No skill's auto-decide bucket lists an entry outside the shared allowed set.",
  "R-HANDOFF-SCHEMA-DRIFT":
    "The handoff schema's field list and each file that writes a handoff name the same fields.",
  "R-MOCK-HREF-DRIFT":
    "The HTML mock template and the validator rule for mock links agree on which hrefs are allowed.",
  "R-SKILL-MANIFEST-DRIFT":
    "The skill manifest schema and the probe that reads it name the same tokens.",
  "UIX-VAL-3LAYER-FORBIDDEN-FILE": "The `uiux/` directory holds none of the retired sidecar files.",
  "UIX-VAL-3LAYER-INCOMPLETE-FAMILY":
    "The `uiux/` directory holds every file of the canonical sidecar family.",
  "UIX-VAL-3LAYER-LEGACY-FORMAT": "No sidecar file uses the retired evaluation headings.",
  "UIX-VAL-3LAYER-MIXED-FORMAT":
    "A sidecar file uses either the exploration-first headings or the retired evaluation headings, never both.",
  "UIX-VAL-CLASSIFICATION-CONTRADICTION":
    "The `ui_bearing`, `primary_surface` and `secondary_surfaces` fields of a classification agree with each other.",
  "UIX-VAL-CLASSIFICATION-DUPLICATE-SECONDARY-SURFACE":
    "`secondary_surfaces` lists no surface twice.",
  "UIX-VAL-CLASSIFICATION-INVALID-BOOLEAN": "`ui_bearing` is `true` or `false`.",
  "UIX-VAL-CLASSIFICATION-INVALID-SECONDARY-SURFACE":
    "Every `secondary_surfaces` value is a surface the classification accepts.",
  "UIX-VAL-CLASSIFICATION-INVALID-SURFACE":
    "`primary_surface` is a surface the classification accepts.",
  "UIX-VAL-CLASSIFICATION-MISSING": "`01_Context.md` has the UI-bearing classification block.",
  "UIX-VAL-CLASSIFICATION-RATIONALE-PLACEHOLDER":
    "`classification_rationale` holds project-specific reasoning, not placeholder text.",
  "UIX-VAL-CLASSIFICATION-REQUIRED-FIELD":
    "The classification block has `ui_bearing`, `primary_surface`, `secondary_surfaces` and `classification_rationale`.",
  "UIX-VAL-CLASSIFICATION-SECONDARY-ARRAY":
    "`secondary_surfaces` is present, as a list or an explicit empty list.",
  "UIX-VAL-CLASSIFICATION-SECONDARY-DUPLICATE":
    "`secondary_surfaces` does not repeat the `primary_surface`.",
  "UIX-VAL-DIRECTION-HISTORY-MISSING":
    "`50_review_input_bundle.md` states that the latest iteration is the accepted one and no earlier iteration is restored.",
  "UIX-VAL-OQ-OPEN-CRITICAL": "No critical open question remains open in the OQ register.",
  "UIX-VAL-SCREEN-CONTRACT-DUPLICATE-ID":
    "Every screen in the screen contract has a unique `screen_id`.",
  "UIX-VAL-SCREEN-CONTRACT-LEGACY-FORMAT":
    "Every screen in the screen contract writes its nested fields as nested canonical bullets.",
  "UIX-VAL-SCREEN-CONTRACT-SCHEMA-INCOMPLETE":
    "Every screen in the screen contract has all the required fields.",
  "UIX-VAL-SCREEN-CONTRACT-STATE-COVERAGE":
    "Every screen's `required_states` includes the mandatory states.",
  "UIX-VAL-SIDECAR-MISSING": "A spec that is UI-bearing has a `uiux/` sidecar directory.",
  "UIX-VAL-SKILL-ASPIRATIONAL":
    "The prototyping skill claims no capability that is not implemented.",
  "UIX-VAL-SKILL-BANNED-PHRASE":
    "The prototyping skill uses none of the banned runtime-heavy default wording.",
  "UIX-VAL-SKILL-CANONICAL-SURFACE":
    "The prototyping skill documents the supported UI surfaces: web, mobile, desktop and mixed.",
  "UIX-VAL-SKILL-CLI-SURFACE":
    "The prototyping skill states that the cli surface is rejected from prototyping execution.",
  "UIX-VAL-SKILL-DELEGATION":
    "The prototyping skill has the delegation scope table for the generation, evaluation and build roles.",
  "UIX-VAL-SKILL-ENV-PRECONDITIONS":
    "The prototyping skill separates contract preconditions from environment preconditions.",
  "UIX-VAL-SKILL-PLAYWRIGHT-FALLBACK":
    "The prototyping skill documents a Playwright invocation that installs nothing, such as `npx --no-install playwright`.",
  "UIX-VAL-SKILL-PREFLIGHT":
    "The prototyping skill documents `qfai doctor --profile prototyping` as its preflight.",
  "UIX-VAL-SKILL-SECTION-MISSING": "The prototyping skill has every required section.",
  "UIX-VAL-SKILL-STATIC-FIRST":
    "The prototyping skill states the static-first, file-based default.",
  "UIX-VAL-SKILL-UI-BEARING-FALSE":
    "The prototyping skill limits execution to UI contracts that have a full UI ID and a non-empty `screens[]`.",
  "UIX-VAL-T05":
    "A UI-bearing pack's `04_Sources.md` has at least one concrete `design_guideline_research` entry before trend-derived axes are fixed.",
  "UIX-VAL-TREND-CATEGORY-MISSING": "The `## Trend Scan` section has every required category.",
  "UIX-VAL-TREND-ENTRY-MISSING": "Every trend-scan category has at least one complete entry.",
  "UIX-VAL-TREND-FIELD-MISSING":
    "Every trend-scan entry fills each required field with project-specific content.",
  "UIX-VAL-TREND-SCAN-MISSING":
    "A UI-bearing pack has `04_Sources.md` with a `## Trend Scan` section.",
  "D-SAAS-PACKAGE-VERIFY-SKIPPED":
    "Every gate the SaaS-package profile skips is named, so a pass on that profile is not read as a full DONE.",
};

/**
 * Human-readable remediation per issue code, for codes whose emitters cannot
 * say more at the call site than the message already does. An emitter that
 * passes `suggested_action` always wins over this catalog: it knows the concrete
 * values that failed the check.
 */
export const ISSUE_FIX_BY_CODE: Record<string, string> = {
  "QFAI-CONTRACT-034":
    "Correct the named contract's ID, file name or index row, give a contract that shares a number the next free one, or remove a row that names no contract file, then rerun validate.",
  "QFAI-DRIFT-001":
    "Restore the protected file or record an in-force change request authorizing the named change.",
  "QFAI-DRIFT-002":
    "Update the tests annotating the named example to its new row, or confirm they already assert it.",
  "QFAI-FLOW-005": "Use an existing BF-NNNN ID for --flow, or create the flow before selecting it.",
  "QFAI-LAYOUT-001":
    "Invoke the `/qfai-migration-v1-to-v2` skill in your AI assistant to move the old spec packs to the story tree, then rerun validate.",
  "QFAI-SCAN-002":
    "Fix the unreadable test path or reduce the configured test globs so the selected tests can all be scanned.",
  "QFAI-SPACK-102":
    "Record the user's decision in the open-question row, or leave it open until the decision is made.",
  "QFAI-STORY-001": "Create the required policy or contract file named in the finding.",
  "QFAI-STORY-002": "Correct the named story-tree ID or directory so the ID and path agree.",
  "QFAI-STORY-003":
    "Repair the named decisions or open-questions row and its required fields, or add the cited decision or question, or correct the citation.",
  "QFAI-STORY-004": "Add the missing AC or EX record and repair the cited story reference.",
  "QFAI-STORY-005":
    "Define the missing business rule or contract, correct the cited reference, or renumber the rule after the contract that declares it.",
  "QFAI-STORY-006":
    "Add a real test in the required layer with a QFAI annotation for the named BF, AC, or EX.",
  "QFAI-STORY-007":
    "Move the named test annotation to its required E2E, integration, API, or unit layer.",
  "QFAI-STORY-008":
    "Correct the annotation to a declared BF, AC, or EX ID, or remove a stale annotation.",
  "QFAI-STORY-010":
    "Restore the protected row or record an in-force change request for the named file change.",
  "QFAI-STORY-011":
    "Make the `## Flow` section of the named business-flow file exactly one Mermaid flowchart or sequence diagram.",
  "QFAI-STORY-012":
    "Renumber the named section of `constraint.md` from 01 in table order. A constraint ID is positional and is not meant to be cited; where another document cites the old ID, state the limit there in words instead.",
  "QFAI-STORY-013":
    "Order the Architecture rows from the uppermost layer down, so each Depends on names only rows below it, and give the diagram one node per layer and one Upper --> Lower edge per Depends on entry, nothing more.",
  "QFAI-STORY-014":
    "Replace the named mark with the `QFAI:BF-`, `QFAI:AC-` or `QFAI:EX-` annotation the test proves, or delete it.",
  "QFAI-STORY-015":
    "State the fact in the document in words, or cite a document under `.qfai` instead of the outside file.",
  "QFAI-STORY-016":
    "Rewrite the named line to match the decision that replaced the term, or remove the term from `validation.staleTerms` if the line is right.",
  "QFAI-STORY-017":
    "Rewrite the named row's Approach cell in the form the qfai-sdd decisions template shows.",
  "QFAI-DOCSCHEMA-001":
    "Rewrite the named section in the shape its qfai-sdd template shows, and remove the opt-out marker if the finding names it. Move a document no schema covers out of the spec tree.",
  "QFAI-DOCSCHEMA-002":
    "Install the qfai package with its dependencies, so @jackchuka/mdschema is present, then rerun validate.",
  // The finding already names the offending key and the release the window
  // closes at; this is the catalog half, which `qfai report` renders for
  // codes whose `issue(...)` sites carry no `suggested_action` of their own.
  "QFAI-CFG-001":
    "Delete the named key from qfai.config.yaml. It changes no behaviour, so removing it is not a settings change — every validator already runs as if it were absent.",
  // All four declared-mapping paths (blank cell, several directories, a CAP on
  // two rows, two CAPs on one directory) pass no `suggested_action`, and one
  // repair covers them: the `Spec` cell is the mapping, so the fix is always to
  // make each row name exactly one directory that no other row names.
  "QFAI-AGENT-015":
    "Remove the role from the skill's `roles:`, or bind it in the package defaults (the owner's file under `packages/qfai/assets/defaults/agent-routing/`, or `review-profiles.yml`). For a project-specific binding, override the complete route or profile in `qfai.config.yaml`.",
  "QFAI-AGENT-016":
    "Repair the `SKILL.md` frontmatter the message names: close the `---` block, and give `roles:` a list of strings and `routing-profile:` a non-empty profile name.",
  "QFAI-AGENT-017":
    "Add a route with a dispatching phase to the owner's file under `packages/qfai/assets/defaults/agent-routing/`, or add a complete project-specific route under `qfai.config.yaml#routing`. Drop the skill's `routing-profile:` if it is deliberately un-routed.",
  "QFAI-AGENT-018":
    "Make the skill's `routing-profile:` and the route's `review_profile:` name the same profile. Define package defaults in `packages/qfai/assets/defaults/review-profiles.yml`; use `qfai.config.yaml#routing` and `#reviewProfiles` for complete project-specific overrides.",
  "QFAI-AGENT-019":
    "Add the agent to the skill's `roles:`, or remove its binding from the owner's file under `packages/qfai/assets/defaults/agent-routing/`, or from `review-profiles.yml`. For a project-specific binding, override the complete route or profile in `qfai.config.yaml`.",
  "QFAI-SKILLS-016":
    "Run `qfai init --force` to restore the shipped step tree. For a step of the project's own, fix the `STEP.md` or the skill's `steps:` or `requires:` the message names: rename a `SKILL.md` under the step layer to `STEP.md`, match `name:` to the directory, set `owner:` to `common` or to the skill that lists the step, keep a step's or a skill's `requires:` to a list of installed `common-*` steps, list a common step a skill's body runs in that skill's `requires:`, and add the roles the message names to the skill's `roles:`.",
  // The orphan-prohibition emitter passes no `suggested_action` on any path, so
  // every rung of the ladder depends on this catalog for its `fix:` line. The
  // even codes are repaired by writing a `Parent`, the odd ones by pointing an
  // existing `Parent` at something the level above actually defines.
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

/**
 * Human-readable "expected state" a report prints for an issue code. Exported so
 * the catalog entry for a code can be asserted against the single definition the
 * emitting validator uses, instead of drifting from it silently.
 *
 * `issue.rule` is deliberately not a fallback: it holds an internal rule token
 * (`htmlMock.externalUrl`), and printing it in the `expected` field made a missing
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
