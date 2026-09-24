import path from "node:path";
import { readFile } from "node:fs/promises";

import { parse as parseYaml } from "yaml";

import type { QfaiConfig } from "../config.js";
import { hashDesignMd, isUnreplacedDesignMdSample, parseDesignMd } from "../design/designMd.js";
import type { DesignMd } from "../design/designMd.js";
import { DESIGN_MD_SHA_HEX_RE, readDesignMdLockSha } from "../design/designMdLock.js";
import { readUiContractScreenContracts } from "../contracts/screenContracts.js";
import { readUiContractInventory } from "../prototyping/specResolution.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

// Root DESIGN.md is the brand SSOT for UI-bearing projects. The lock
// yaml carries its frozen sha256 so prototyping iteration / certify can
// detect drift between cycles.
const ROOT_DESIGN_MD_REL = "DESIGN.md";
const DESIGN_MD_LOCK_REL_BASENAME = "DESIGN.md.lock.yaml";

// Prototyping post-loop produces design-system.yaml (mirror of DESIGN.md
// tokens) and prototype-handoff.yaml.
const REQUIRED_PROTOTYPING_DESIGN_FILES = ["design-system.yaml", "prototype-handoff.yaml"] as const;

const REQUIRED_DESIGN_SYSTEM_CHECKLIST_KEYS = [
  "color",
  "typography",
  "spacing",
  "border_radius",
  "shadow",
  "dos_and_donts",
  "motion_rules",
] as const;

const PLACEHOLDER_RE = /^(?:tbd|todo|n\/a|none|placeholder|example|lorem|to be defined)$/i;

// Spec files carrying `Source: discussion-<ts>#<id>` provenance, per the
// shipped `/qfai-sdd` spec templates. The 17-digit timestamp is the pack
// directory name, so the template placeholder
// (`discussion-YYYYMMDDhhmmssSSS`) deliberately does not match.

type DesignContractReadinessStage = "sdd" | "prototyping";
type SddDesignContractReadinessOptions = {
  enforceNoPrematurePrototypingContracts?: boolean;
};

function toPosixRelative(root: string, targetPath: string): string {
  return path.relative(root, targetPath).replace(/\\/g, "/");
}

type YamlReadResult =
  { kind: "missing" } | { kind: "invalid" } | { kind: "ok"; value: Record<string, unknown> };

export async function validateSddDesignContractReadiness(
  root: string,
  config: QfaiConfig,
  options: SddDesignContractReadinessOptions = {},
): Promise<Issue[]> {
  return validateDesignContractReadinessForStage(root, config, "sdd", {
    enforceNoPrematurePrototypingContracts: options.enforceNoPrematurePrototypingContracts ?? true,
  });
}

/**
 * Whether the root DESIGN.md parses — and nothing else.
 *
 * Split out so a malformed file is reported where it is read, not only where
 * it is frozen. `--profile discussion` runs validators over discussion packs,
 * mermaid, visuals, research summaries and review artifacts — none of them
 * DESIGN.md — and `QFAI-DCON-033` reached a run only through the sdd or
 * prototyping readiness gates, so a malformed file surfaced a review round
 * later, under a different skill, with the earlier gate having passed.
 *
 * The parse half only. The readiness validator also compares DESIGN.md against
 * its lock, requires UI contracts and rejects premature ones — all of which
 * belong to later stages, and the lock in particular is `/qfai-sdd` Phase 0's
 * to clear. "The file is malformed" and "the file no longer matches its frozen
 * hash" are different failures with different owners, which is why this is a
 * separate entry point rather than a flag on the existing one.
 *
 * Silent when the file is absent: `QFAI-DCON-030` owns missing-file, and
 * `/qfai-sdd` Phase 0 is where the file gets written.
 */
export async function validateRootDesignMdParse(root: string): Promise<Issue[]> {
  let text: string;
  try {
    text = await readFile(path.join(root, ROOT_DESIGN_MD_REL), "utf-8");
  } catch {
    // Absent or unreadable: `QFAI-DCON-030` owns missing-file, and a discussion
    // run happens before the file necessarily exists. Reporting either here
    // would put a second finding on one state, or a finding on a project that
    // has not reached this artifact yet.
    return [];
  }
  const parsed = parseDesignMd(text);
  return "error" in parsed ? [rootDesignMdParseIssue(parsed.error.message)] : [];
}

export async function validatePrototypingDesignContractReadiness(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  return validateDesignContractReadinessForStage(root, config, "prototyping");
}

/**
 * The `QFAI-DCON-033` finding, built in one place.
 *
 * Two callers emit it now — the readiness gate and the discussion-profile parse
 * check — and a finding whose message, rule or remedy differed between them
 * would send automated remediation down two paths for one defect.
 *
 * The parse error's own message is passed through verbatim because it already
 * names what to fix: `rejectUnknownKeys` produces
 * `Unknown '<section>' key '<k>'. Allowed: <list>.`, so the allowed set reaches
 * the operator without opening the spec.
 */
function rootDesignMdParseIssue(detail: string): Issue {
  return issue(
    "QFAI-DCON-033",
    `Root DESIGN.md failed to parse: ${detail}`,
    "error",
    ROOT_DESIGN_MD_REL,
    "designContractReadiness.rootDesignMdParse",
    undefined,
    "canonical",
    "Fix DESIGN.md front-matter so parseDesignMd succeeds (see qfai-prototyping/references/design-md-spec.md). Do NOT regenerate the template — that would discard user content.",
  );
}

async function validateDesignContractReadinessForStage(
  root: string,
  config: QfaiConfig,
  stage: DesignContractReadinessStage,
  options: SddDesignContractReadinessOptions = {},
): Promise<Issue[]> {
  const uiBearing = (await readUiContractInventory(root, config)).some((entry) => entry.hasScreens);

  // The unreplaced-sample gate runs BEFORE the UI-contract gate below.
  // Every other check in this validator presupposes design contracts that
  // only exist once prototyping has started, but the sample gate has to
  // fire earlier than that: the sample can be copied in at any point, UI
  // contracts are only authored later in SDD, and `/qfai-sdd` Phase 0
  // freezes the file's sha256 in between. Gated behind
  // `uiContracts.length === 0` the gate could only ever report a freeze
  // that already happened.
  //
  // A cli-only project skips the gate outright rather than degrading it to a
  // warning: the carve-out says root DESIGN.md is not part of its contract at
  // all, so there is nothing for the seeded sample to be the wrong version
  // OF. A warning would still fail `validation.failOn: warning` /
  // `--fail-on warning` runs and its remediation would tell the user to
  // author a brand SSOT that no reader in this project consumes.
  const sampleIssues = await validateRootDesignMdSample(root, uiBearing);
  if (!uiBearing) {
    return sampleIssues;
  }

  const designDir = path.join(root, config.paths.contractsDir, "design");
  const issues: Issue[] = [...sampleIssues];

  // A cli-only project never freezes a brand SSOT, so neither the file
  // (DCON-030/033) nor its lock (DCON-031/032) can be required of it.
  const rootResult: RootDesignMdResult = await validateRootDesignMdAndLock(root, designDir);
  issues.push(...rootResult.issues);

  if (stage === "prototyping") {
    for (const fileName of REQUIRED_PROTOTYPING_DESIGN_FILES) {
      const filePath = path.join(designDir, fileName);
      try {
        await readFile(filePath, "utf-8");
      } catch {
        issues.push(
          issue(
            "QFAI-DCON-001",
            `Missing prototyping design contract: ${fileName}.`,
            "error",
            toPosixRelative(root, filePath),
            "designContractReadiness.requiredFile",
            undefined,
            "canonical",
            `UI-bearing prototyping completion requires design-system.yaml and prototype-handoff.yaml under \`${toPosixRelative(root, designDir)}/\` (mirror of DESIGN.md tokens / handoff facts).`,
          ),
        );
      }
    }
  }

  if (stage === "prototyping") {
    issues.push(...(await validateDesignSystem(root, config, rootResult.designMd)));
    issues.push(...(await validatePrototypeHandoff(root, config, rootResult.lockSha)));
  } else if (options.enforceNoPrematurePrototypingContracts ?? true) {
    issues.push(...(await validateNoPrematurePrototypingContracts(root, config)));
  }
  return issues;
}

/**
 * Identity gate for root DESIGN.md (QFAI-DCON-034).
 *
 * DCON-030..033 are all content-agnostic: they verify that DESIGN.md
 * exists, parses and has not changed since the freeze — never that it was
 * authored by this project. So an unreplaced sample satisfies every one of
 * them, gets sha256-frozen as the project's brand contract, and from then
 * on `/qfai-prototyping` enforces a fictional identity while swapping in
 * the real brand breaks the lock until it is refrozen.
 *
 * A project holds the sample because someone put it there: copied from
 * `.qfai/assistant/skill/qfai-prototyping/templates/DESIGN.md.sample` as a
 * starting point, or
 * seeded by a release back when `qfai init` wrote one. Init writes none
 * now — `/qfai-sdd` Phase 0 authors it, and only for a
 * visual-prototyping surface — so this gate no longer reports a file the
 * tool itself had just written.
 *
 * Severity scales with how far the project has committed to a brand
 * contract:
 *   - UI-bearing -> `error`. The project is on the path that runs Phase 0
 *     and freezes this file. UI-bearing is decided by the same rule the
 *     prototyping resolver uses — a `surface_type: ui-bearing` spec OR a
 *     `contracts/ui` yaml — not by the contracts alone, because the spec
 *     marker exists at Phase 0 while the contracts do not, and a gate that
 *     only fires after the contracts land can only report a freeze that
 *     already happened.
 *   - otherwise -> `warning`. A project that ships no UI freezes nothing,
 *     so the sample costs it nothing yet; a hard failure would stop a
 *     project that never opted into the design surface at all. The warning
 *     still names the file, which is what the sample's own instructions
 *     promise a reader.
 *
 * A missing DESIGN.md is not this gate's business (DCON-030 owns it, and
 * only for UI-bearing projects), so an unreadable file is silently
 * skipped.
 */
async function validateRootDesignMdSample(root: string, uiBearing: boolean): Promise<Issue[]> {
  let designMdText: string;
  try {
    designMdText = await readFile(path.join(root, ROOT_DESIGN_MD_REL), "utf-8");
  } catch {
    return [];
  }
  if (!isUnreplacedDesignMdSample(designMdText)) {
    return [];
  }
  return [
    issue(
      "QFAI-DCON-034",
      "Root DESIGN.md is still the qfai sample brand (unreplaced sample).",
      uiBearing ? "error" : "warning",
      ROOT_DESIGN_MD_REL,
      "designContractReadiness.rootDesignMdSample",
      undefined,
      "canonical",
      "Replace root DESIGN.md with this product's brand SSOT (run /qfai-sdd, whose Phase 0 authors it from the design direction the discussion pack recorded, or author it from `.qfai/assistant/skill/qfai-prototyping/templates/DESIGN.md.sample`) and delete the sample marker comment if present. Phase 0 refuses to freeze a sample.",
    ),
  ];
}

type RootDesignMdResult = {
  issues: Issue[];
  // Parsed root DESIGN.md, when present and well-formed. Downstream
  // validators (validateDesignSystem mirror cross-check) need this.
  designMd: DesignMd | null;
  // Frozen sha256 from DESIGN.md.lock.yaml, when present and well-
  // formed. Downstream validators (validatePrototypeHandoff cross-
  // check) need this.
  lockSha: string | null;
};

async function validateRootDesignMdAndLock(
  root: string,
  designDir: string,
): Promise<RootDesignMdResult> {
  const issues: Issue[] = [];
  const designMdPath = path.join(root, ROOT_DESIGN_MD_REL);
  const lockPath = path.join(designDir, DESIGN_MD_LOCK_REL_BASENAME);

  let designMdText: string | null = null;
  try {
    designMdText = await readFile(designMdPath, "utf-8");
  } catch {
    issues.push(
      issue(
        "QFAI-DCON-030",
        "Missing root DESIGN.md (brand SSOT).",
        "error",
        ROOT_DESIGN_MD_REL,
        "designContractReadiness.rootDesignMd",
        undefined,
        "canonical",
        "Create root DESIGN.md at the project root with the canonical front-matter, or run /qfai-sdd, whose Phase 0 authors it (see the qfai-sdd skill).",
      ),
    );
  }

  let lockText: string | null = null;
  try {
    lockText = await readFile(lockPath, "utf-8");
  } catch {
    issues.push(
      issue(
        "QFAI-DCON-031",
        `Missing ${DESIGN_MD_LOCK_REL_BASENAME}.`,
        "error",
        toPosixRelative(root, lockPath),
        "designContractReadiness.designMdLock",
        undefined,
        "canonical",
        "Run /qfai-sdd Phase 0 to validate root DESIGN.md and freeze its sha256 into DESIGN.md.lock.yaml.",
      ),
    );
  }

  let lockSha: string | null = null;
  let designMd: DesignMd | null = null;

  // Parse DESIGN.md whenever it was readable, BEFORE the lock-gated
  // sha-comparison block. Pre-fix the parse was nested under
  // `designMdText !== null && lockText !== null`, so a UI-bearing
  // project in the common initial state (DESIGN.md authored but
  // malformed, lock not yet generated) saw only DCON-031 and missed
  // the DCON-033 parse error pointing at the file that needs
  // repair. DCON-030 covers missing-file; DCON-033 is the parse-
  // failure code so automated remediation can route the two failure
  // modes correctly: missing -> regenerate template, parse failure
  // -> repair existing file without losing user edits.
  if (designMdText !== null) {
    const parseResult = parseDesignMd(designMdText);
    if ("error" in parseResult) {
      issues.push(rootDesignMdParseIssue(parseResult.error.message));
    } else {
      designMd = parseResult.data;
    }
  }

  // Only attempt sha comparison when both files were readable. The
  // lock-extraction (`readDesignMdLockSha`) and the equality check
  // both require lockText, while the equality also requires
  // designMdText to compute a current sha. The DCON-031 "missing
  // designMdSha256" is a property of the lock file and is
  // independent of whether DESIGN.md parsed.
  if (lockText !== null) {
    lockSha = readDesignMdLockSha(lockText);
    if (lockSha === null) {
      issues.push(
        issue(
          "QFAI-DCON-031",
          `${DESIGN_MD_LOCK_REL_BASENAME} is missing 'designMdSha256'.`,
          "error",
          toPosixRelative(root, lockPath),
          "designContractReadiness.designMdLock",
          undefined,
          "canonical",
          "Re-run /qfai-sdd Phase 0 to regenerate DESIGN.md.lock.yaml with a current designMdSha256.",
        ),
      );
    } else if (designMdText !== null) {
      const currentSha = hashDesignMd(designMdText);
      if (currentSha !== lockSha) {
        issues.push(
          issue(
            "QFAI-DCON-032",
            "DESIGN.md sha256 does not match DESIGN.md.lock.yaml.",
            "error",
            ROOT_DESIGN_MD_REL,
            "designContractReadiness.designMdSha",
            undefined,
            "canonical",
            "DESIGN.md was edited after the freeze. Re-run /qfai-sdd Phase 0 (or restart prototyping) to refreeze.",
          ),
        );
      }
    }
  }

  return { issues, designMd, lockSha };
}

/**
 * True when `/qfai-prototyping` has demonstrably run in this project.
 *
 * `QFAI-DCON-019` guards against `/qfai-sdd` authoring prototyping outputs
 * early. Keyed on file existence alone it also fired on the same files after
 * prototyping legitimately produced them — where their *absence* is itself a
 * `QFAI-DCON-001` error — making the SDD stop condition permanently
 * unpassable for any UI-bearing project.
 */
async function hasPrototypingRun(root: string): Promise<boolean> {
  // Only artifacts /qfai-prototyping itself writes count. `DESIGN.md.lock.yaml`
  // is deliberately NOT a marker: /qfai-sdd Phase 0 freezes the lock for every
  // UI-bearing target before prototyping starts, so keying on it would make
  // this guard unreachable in exactly the runs it exists to police.
  const markers = [
    path.join(root, ".qfai", "evidence", "prototyping", "prototyping.json"),
    path.join(root, ".qfai", "evidence", "prototyping", "completion-certificate.json"),
  ];
  for (const marker of markers) {
    try {
      await readFile(marker, "utf-8");
      return true;
    } catch {
      // try the next marker
    }
  }
  return false;
}

async function validateNoPrematurePrototypingContracts(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  // Prototyping has run: these files are its required outputs, not premature.
  if (await hasPrototypingRun(root)) {
    return [];
  }

  const designDir = path.join(root, config.paths.contractsDir, "design");
  const issues: Issue[] = [];
  for (const fileName of REQUIRED_PROTOTYPING_DESIGN_FILES) {
    const filePath = path.join(designDir, fileName);
    try {
      await readFile(filePath, "utf-8");
      issues.push(
        issue(
          "QFAI-DCON-019",
          `${fileName} must be produced by /qfai-prototyping, not /qfai-sdd. No prototyping evidence was found, so this file appears to have been authored early.`,
          "warning",
          toPosixRelative(root, filePath),
          "designContractReadiness.prematurePrototypingContract",
          undefined,
          "change",
          "Run /qfai-prototyping to produce this file, or delete it if it was authored by mistake.",
        ),
      );
    } catch {
      // missing is expected before prototyping
    }
  }
  return issues;
}

async function validateDesignSystem(
  root: string,
  config: QfaiConfig,
  rootDesignMd: DesignMd | null,
): Promise<Issue[]> {
  const filePath = path.join(root, config.paths.contractsDir, "design", "design-system.yaml");
  const parsed = await readYaml(filePath);
  if (parsed.kind !== "ok") {
    return parsed.kind === "invalid"
      ? [
          issue(
            "QFAI-DCON-009",
            "design-system.yaml must parse as an object-shaped YAML document.",
            "error",
            toPosixRelative(root, filePath),
            "designContractReadiness.designSystemDocument",
          ),
        ]
      : [];
  }

  const issues: Issue[] = [];
  const filePathRel = toPosixRelative(root, filePath);

  // Post-1.8.9 design-system.yaml is a deterministic mirror of the
  // root DESIGN.md tokens (see
  // `qfai-prototyping/references/handoff.md#outputs`):
  //   visual.colors / visual.typography / visual.radius / visual.shadow
  //   (visual.spacing optional). Accept either the new mirror shape OR
  //   the legacy `checklist.{color,typography,...}` shape so projects
  //   that have not yet regenerated their design-system.yaml still
  //   pass. The mirror form takes precedence — its presence is enough.
  const visual = parsed.value.visual;
  const isMirrorShape = isRecord(visual) && isRecord(visual.colors) && isRecord(visual.typography);
  if (isMirrorShape) {
    // Shape gate: top-level mirror keys must be non-empty records.
    // visual.spacing is optional in DESIGN.md and is excluded from the
    // required list deliberately.
    const REQUIRED_MIRROR_KEYS = ["colors", "typography", "radius", "shadow"] as const;
    let shapeOk = true;
    for (const key of REQUIRED_MIRROR_KEYS) {
      const value = visual[key];
      if (!isRecord(value) || Object.keys(value).length === 0) {
        issues.push(
          issue(
            "QFAI-DCON-005",
            `design-system.yaml mirror is missing or empty 'visual.${key}'.`,
            "error",
            filePathRel,
            "designContractReadiness.designSystemMirror",
          ),
        );
        shapeOk = false;
      }
    }
    // Value gate: mirror sub-key values must equal the corresponding
    // DESIGN.md tokens. The handoff contract describes this file as a
    // "verbatim mirror" — without a value cross-check, an operator
    // could hand-author a mirror with stale or fabricated tokens that
    // disagrees with DESIGN.md, and downstream `/qfai-implement` would
    // be bound to the wrong identity. The DESIGN.md.lock sha chain
    // anchors DESIGN.md content but does not verify this mirror file
    // against it. Skip when the parsed root DesignMd is unavailable
    // (DCON-030/033 already raised) or shape failed (no point
    // surfacing a value diff on top of a shape error).
    if (shapeOk && rootDesignMd !== null) {
      issues.push(...crossCheckMirrorValues(visual, rootDesignMd, filePathRel));
    }
    return issues;
  }

  // Legacy checklist shape — kept so existing projects keep validating
  // until they regenerate their design-system.yaml from the new mirror.
  const checklist = parsed.value.checklist;
  for (const key of REQUIRED_DESIGN_SYSTEM_CHECKLIST_KEYS) {
    if (!(
      checklist &&
      typeof checklist === "object" &&
      key in (checklist as Record<string, unknown>)
    )) {
      issues.push(
        issue(
          "QFAI-DCON-005",
          `design-system.yaml is missing checklist key '${key}' (or rewrite as a DESIGN.md token mirror with visual.colors / visual.typography / visual.radius / visual.shadow).`,
          "error",
          filePathRel,
          "designContractReadiness.designSystemChecklist",
        ),
      );
    }
  }

  const hasComponentToneChecklistKey =
    checklist &&
    typeof checklist === "object" &&
    "component_tone" in (checklist as Record<string, unknown>);
  const hasComponentGuidanceAlias =
    hasMeaningfulContractContent(parsed.value.component_tone) ||
    hasMeaningfulContractContent(parsed.value.component_semantics) ||
    hasMeaningfulContractContent(parsed.value.content_tone);
  if (!hasComponentToneChecklistKey && !hasComponentGuidanceAlias) {
    issues.push(
      issue(
        "QFAI-DCON-005",
        "design-system.yaml is missing component guidance (expected checklist.component_tone, component_tone/component_semantics/content_tone, or rewrite as a DESIGN.md token mirror).",
        "error",
        filePathRel,
        "designContractReadiness.designSystemChecklist",
      ),
    );
  }

  return issues;
}

async function validatePrototypeHandoff(
  root: string,
  config: QfaiConfig,
  lockSha: string | null,
): Promise<Issue[]> {
  const filePath = path.join(root, config.paths.contractsDir, "design", "prototype-handoff.yaml");
  const parsed = await readYaml(filePath);
  if (parsed.kind !== "ok") {
    return parsed.kind === "invalid"
      ? [
          issue(
            "QFAI-DCON-012",
            "prototype-handoff.yaml must parse as an object-shaped YAML document.",
            "error",
            toPosixRelative(root, filePath),
            "designContractReadiness.prototypeHandoffDocument",
          ),
        ]
      : [];
  }

  // Required fields match the rewritten handoff contract documented in
  // `.qfai/assistant/skill/qfai-prototyping/references/handoff.md`:
  // `finalIterIndex` (number ≥ 0), plus the string fields
  // `finalArtifact`, `designMdPath`, `designMdSha256`,
  // `designSystemMirror`, `implementationNotes`. The legacy fields
  // (`sourcePrototypeRefs`, `surfaceProfiles`, `screens`, `visualDna`,
  // `implementationHandoff`) were retired together with the multi-
  // option exploration → preserve/adapt/copy split when DESIGN.md
  // became the brand SSOT and the loop became single-thread.
  const issues: Issue[] = [];
  const filePathRel = toPosixRelative(root, filePath);
  // Distinguish missing vs invalid-type/value so the operator gets a
  // diagnostic that points at the actual problem. `Principle of Least
  // Astonishment`: an operator who DID write the field should not be
  // told it is "missing".
  const hasFinalIterIndex = "finalIterIndex" in parsed.value;
  const finalIterIndex = parsed.value.finalIterIndex;
  if (!hasFinalIterIndex) {
    issues.push(
      issue(
        "QFAI-DCON-013",
        "prototype-handoff.yaml is missing required field 'finalIterIndex' (expected a non-negative integer).",
        "error",
        filePathRel,
        "designContractReadiness.prototypeHandoffField",
      ),
    );
  } else if (
    typeof finalIterIndex !== "number" ||
    !Number.isInteger(finalIterIndex) ||
    finalIterIndex < 0
  ) {
    issues.push(
      issue(
        "QFAI-DCON-013",
        `prototype-handoff.yaml field 'finalIterIndex' must be a non-negative integer (got ${describeValueForDiagnostic(finalIterIndex)}).`,
        "error",
        filePathRel,
        "designContractReadiness.prototypeHandoffField",
      ),
    );
  }
  // Require each remaining field to be a non-empty string. The earlier
  // helper `validateRequiredStringArrayKeys` accepted arrays / records
  // as "meaningful content", so a handoff that authored
  // `finalArtifact: { uri: "..." }` or
  // `designSystemMirror: ["a.yaml", "b.yaml"]` would silently pass —
  // but downstream consumers (`/qfai-implement`, certify, ref-integrity)
  // require scalar string paths. Enforce the scalar contract here.
  for (const key of [
    "finalArtifact",
    "designMdPath",
    "designMdSha256",
    "designSystemMirror",
    "implementationNotes",
  ] as const) {
    if (!(key in parsed.value)) {
      issues.push(
        issue(
          "QFAI-DCON-013",
          `prototype-handoff.yaml is missing required field '${key}'.`,
          "error",
          filePathRel,
          "designContractReadiness.prototypeHandoffField",
        ),
      );
      continue;
    }
    const value = parsed.value[key];
    if (typeof value !== "string") {
      issues.push(
        issue(
          "QFAI-DCON-013",
          `prototype-handoff.yaml field '${key}' must be a non-empty string (got ${typeof value}).`,
          "error",
          filePathRel,
          "designContractReadiness.prototypeHandoffField",
        ),
      );
      continue;
    }
    const normalized = value.trim();
    if (normalized.length === 0 || PLACEHOLDER_RE.test(normalized)) {
      issues.push(
        issue(
          "QFAI-DCON-013",
          `prototype-handoff.yaml field '${key}' must be a non-empty string.`,
          "error",
          filePathRel,
          "designContractReadiness.prototypeHandoffField",
        ),
      );
    }
  }

  // Cross-check designMdPath / designMdSha256 against the root
  // DESIGN.md identity. Without this, a handoff yaml that points at an
  // alternate file or freezes a stale sha can pass `qfai validate`
  // while silently binding downstream `/qfai-implement` to a DESIGN.md
  // identity that diverges from the frozen root lock. Skip when the
  // upstream string-field gate already reported a problem (avoid
  // double-flagging the same root cause):
  //   - missing / non-string values are caught by the string-field
  //     loop above;
  //   - `tbd` / `todo` / `n/a` / `none` / `placeholder` / `example` /
  //     `lorem` / `to be defined` placeholder values are also caught
  //     by the string-field loop's `PLACEHOLDER_RE` check, so the
  //     skip predicate explicitly excludes them here too. Without
  //     the placeholder skip, an operator who left
  //     `designMdPath: TBD` would see two DCON-013 entries for the
  //     same fix (replace TBD with the real path).
  const designMdPath = parsed.value.designMdPath;
  if (
    typeof designMdPath === "string" &&
    designMdPath.trim().length > 0 &&
    !PLACEHOLDER_RE.test(designMdPath.trim())
  ) {
    // The handoff contract pins the brand SSOT to the repo root
    // DESIGN.md. Accept either the bare basename or `./DESIGN.md`,
    // normalize separators so Windows-authored handoffs are not
    // rejected, and anchor on the basename equality.
    const normalized = designMdPath.trim().replace(/\\/g, "/").replace(/^\.\//, "");
    if (normalized !== ROOT_DESIGN_MD_REL) {
      issues.push(
        issue(
          "QFAI-DCON-013",
          `prototype-handoff.yaml field 'designMdPath' must be '${ROOT_DESIGN_MD_REL}' (the brand SSOT at repo root); got '${designMdPath}'.`,
          "error",
          filePathRel,
          "designContractReadiness.prototypeHandoffField",
          undefined,
          "canonical",
          "Set `designMdPath: DESIGN.md` so downstream `/qfai-implement` binds to the repo-root brand SSOT.",
        ),
      );
    }
  }
  const designMdSha = parsed.value.designMdSha256;
  if (
    typeof designMdSha === "string" &&
    designMdSha.trim().length > 0 &&
    !PLACEHOLDER_RE.test(designMdSha.trim())
  ) {
    const lower = designMdSha.trim().toLowerCase();
    if (!DESIGN_MD_SHA_HEX_RE.test(lower)) {
      issues.push(
        issue(
          "QFAI-DCON-013",
          `prototype-handoff.yaml field 'designMdSha256' must be a 64-char lowercase hex sha256; got '${designMdSha}'.`,
          "error",
          filePathRel,
          "designContractReadiness.prototypeHandoffField",
          undefined,
          "canonical",
          "Copy the `designMdSha256` value from `.qfai/contracts/design/DESIGN.md.lock.yaml`.",
        ),
      );
    } else if (lockSha !== null && lower !== lockSha) {
      issues.push(
        issue(
          "QFAI-DCON-013",
          `prototype-handoff.yaml field 'designMdSha256' (${lower}) does not match DESIGN.md.lock.yaml#designMdSha256 (${lockSha}).`,
          "error",
          filePathRel,
          "designContractReadiness.prototypeHandoffField",
          undefined,
          "canonical",
          "Re-run `qfai prototyping certify` (or refreeze the DESIGN.md lock) so the handoff sha matches the frozen root lock.",
        ),
      );
    }
  }

  // The screens a row may name are the ones the UI contracts declare, read
  // where the prototyping loop reads them.
  const declaredScreens = new Set(
    (await readUiContractScreenContracts(root, config.paths.contractsDir)).map(
      (screen) => screen.screenId,
    ),
  );
  issues.push(...procurementIssues(parsed.value, filePathRel, declaredScreens));

  return issues;
}

/**
 * The cells each `procurement` row carries, by list.
 *
 * `procured` says what realises a region so the implementer installs rather
 * than reconstructs. `authored` says what was written instead, and why: the
 * procurement ladder's last rung is the only one that has to explain itself,
 * and a row with no reason is what an unexplained rung looks like once it
 * reaches the handoff.
 */
const PROCUREMENT_ROW_CELLS: Readonly<Record<string, readonly string[]>> = {
  procured: ["screen", "region", "item"],
  authored: ["screen", "region", "why"],
  "drawn-from-project": ["screen"],
};

/**
 * The list that says a screen needed nothing.
 *
 * Its rows name a screen and no region, because there is no region to name:
 * the claim is about the whole screen. An empty `procured` would not say it —
 * that reads as "nothing was found", which is a different answer from "nothing
 * was needed" — and omitting the screen says least of all, which is the state
 * this list exists to remove.
 */
const DRAWN_FROM_PROJECT = "drawn-from-project";

/**
 * The values the shipped handoff example writes in a `procurement` row.
 *
 * Named literally rather than matched by shape. A cell in these columns is
 * free text — a component is named `<DataTable>` and invoked
 * `<DataTable density="compact">` — so any pattern wide enough to cover the
 * example's phrases covers a component somebody chose, and a row that was
 * written is reported.
 *
 * A test holds this set against the block the shipped file carries, so a
 * placeholder reworded there is a failing test rather than a value nothing
 * recognises.
 */
export const PROCUREMENT_PLACEHOLDERS: ReadonlySet<string> = new Set([
  "<screen id>",
  "<what part of the screen>",
  "<catalogue item, or the project component it already had>",
  "<what was looked for and did not serve>",
]);

/**
 * The words a cell carries when nobody has decided yet, beyond
 * {@link PLACEHOLDER_RE}'s. `tba` and `fixme` are the two an author reaches for
 * where `tbd` and `todo` would do, and `xxx` is the marker left where a value
 * belongs.
 */
const UNDECIDED_WORD = /^(?:tba|fixme|xxx|\?+)$/i;

/**
 * A cell's text with the decoration around it removed: a code span, a quoted
 * string, the brackets a template uses.
 *
 * A placeholder is written as often with decoration as without —
 * `` `TBD` ``, `"TODO"`, `[tbd]` — and read whole, each of those is a value
 * nothing recognises, so the row passed carrying nothing to act on.
 */
function undecorated(value: string): string {
  let text = value.trim();
  for (;;) {
    const stripped = text
      .replace(/^[`"'*_[({]+/, "")
      .replace(/[`"'*_\])}]+$/, "")
      .replace(/[.;!]+$/, "")
      .trim();
    if (stripped === text) return text;
    text = stripped;
  }
}

/**
 * Whether a cell holds something a later reader can act on.
 *
 * The decoration is removed first, and a value that opens with a placeholder
 * and a colon — `TODO: choose a component` — is one too: it names the decision
 * rather than making it, which is the state this check exists to report.
 */
function cellIsWritten(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  // Angle brackets are not stripped and no shape rule reads them: a component is
  // named that way — `<DataTable density="compact">` — so the template's own
  // phrases are the set below and nothing wider. The set is read against the
  // undecorated text as well, since a shipped phrase is quoted and punctuated
  // like any other placeholder.
  const bare = undecorated(trimmed);
  if (PLACEHOLDER_RE.test(bare) || UNDECIDED_WORD.test(bare)) return false;
  const opener = /^([^\s:]+)\s*:/.exec(bare)?.[1] ?? "";
  if (opener !== "" && (PLACEHOLDER_RE.test(opener) || UNDECIDED_WORD.test(opener))) return false;
  return ![trimmed, bare].some((form) => PROCUREMENT_PLACEHOLDERS.has(form.toLowerCase()));
}

/**
 * The finding for a screen the manifest answers nothing about.
 *
 * Separate from the shape findings because the repair is different: nothing in
 * the file is malformed, and what it owes is a row saying which of the two
 * cases the screen is in.
 */
function missingProcurement(filePathRel: string, screens: readonly string[], what: string): Issue {
  return issue(
    "QFAI-DCON-013",
    `prototype-handoff.yaml ${what}, and this target's UI contracts declare screens. An ` +
      `implementer cannot tell a screen that needed nothing from one the loop recorded nothing ` +
      `for, and reading the second as the first rebuilds by hand what the loop had procured.`,
    "error",
    filePathRel,
    "designContractReadiness.prototypeHandoffProcurement",
    undefined,
    "canonical",
    `Give ${screens.map((screen) => `'${screen}'`).join(", ")} a row in prototype-handoff.yaml's ` +
      "`procurement`: under `procured` or `authored` for a region it needed, or under " +
      "`drawn-from-project` where the screen was drawn entirely from what the project already had.",
  );
}

/**
 * Shape findings for `prototype-handoff.yaml#procurement`.
 *
 * The key itself is optional: the handoff contract lets a screen drawn
 * entirely from what the project already had omit both lists, so an absent
 * `procurement` is not reported here. What is reported is a present one a
 * reader cannot act on. `/qfai-implement` installs what this names rather than
 * rebuilding it, so a row with no `item` names nothing to install, and a row
 * with no `why` satisfies the reviewer's last-resort criterion on its face
 * while recording none of what that criterion asks for. A row's `screen` has to
 * be one a UI contract declares, or neither consumer can locate the region.
 */
function procurementIssues(
  handoff: Record<string, unknown>,
  filePathRel: string,
  declaredScreens: ReadonlySet<string>,
): Issue[] {
  // A target with no UI contract has no screen list to hold a manifest to, and
  // the readiness gate already reports that project. Everywhere else the key is
  // required: an absent `procurement` could mean every screen was drawn from
  // what the project already had, or that the loop recorded nothing, and an
  // implementer reading the second as the first rebuilds by hand what the loop
  // had procured.
  if (!("procurement" in handoff)) {
    if (declaredScreens.size === 0) return [];
    return [
      missingProcurement(filePathRel, [...declaredScreens].sort(), "field 'procurement' is absent"),
    ];
  }
  const procurement = handoff.procurement;
  const report = (message: string): Issue =>
    issue(
      "QFAI-DCON-013",
      `prototype-handoff.yaml ${message}`,
      "error",
      filePathRel,
      "designContractReadiness.prototypeHandoffProcurement",
      undefined,
      "canonical",
      "Repair `procurement` in prototype-handoff.yaml: it is a mapping of a `procured` and an " +
        "`authored` list, each row naming one screen region and what realises it — `screen`, " +
        "`region`, `item` for a procured region and `screen`, `region`, `why` for an authored " +
        "one, with one row per region across both lists.",
    );
  if (!isRecord(procurement)) {
    return [
      report(
        `field 'procurement' must be a mapping carrying 'procured' and 'authored' lists (got ${describeValueForDiagnostic(procurement)}).`,
      ),
    ];
  }

  const issues: Issue[] = [];
  /**
   * Where each screen region was realised, and the pairs realised twice.
   *
   * One realisation per region: the contract says each region names what
   * realises it, singular. Two rows for one region tell the implementer to
   * install and to author the same part, so the pairs are collected across both
   * lists rather than judged a row at a time.
   */
  const realised = new Map<string, string>();
  const duplicates: { key: string; first: string; second: string }[] = [];
  /** Screens claimed to have needed nothing, and screens with a row that needed something. */
  const drawnFromProject = new Map<string, string>();
  const needed = new Map<string, string>();
  // A closed key set, as `prototyping/handoff.ts` keeps for the schema beside
  // this one: "closed schema; protects against schema drift and typos". A
  // misspelling leaves both contract names absent, which is a manifest that
  // exposes nothing to either consumer while reading as one that does.
  const unknown = Object.keys(procurement).filter(
    (key) => !Object.hasOwn(PROCUREMENT_ROW_CELLS, key),
  );
  if (unknown.length > 0) {
    issues.push(
      report(
        `field 'procurement' carries ${unknown.map((key) => `'${key}'`).join(", ")}, which ` +
          `nothing reads. The lists are 'procured' and 'authored'.`,
      ),
    );
  }
  for (const [list, cells] of Object.entries(PROCUREMENT_ROW_CELLS)) {
    // An own key. `key in` reaches the prototype, where `constructor` and
    // `toString` answer to a name the contract never defined and hold a
    // function rather than a list.
    if (!Object.hasOwn(procurement, list)) continue;
    const rows = procurement[list];
    // A list declared and left empty is present rather than omitted: `procured:`
    // with nothing under it parses as `null`, and a declaration saying nothing
    // is the shape this reports. It is the distinction the key itself carries
    // one level up.
    if (!Array.isArray(rows)) {
      issues.push(
        report(
          `field 'procurement.${list}' must be a list (got ${describeValueForDiagnostic(rows)}).`,
        ),
      );
      continue;
    }
    rows.forEach((row: unknown, index) => {
      const where = `procurement.${list}[${index}]`;
      const missing = isRecord(row) ? cells.filter((cell) => !cellIsWritten(row[cell])) : cells;
      if (missing.length === 0 && isRecord(row)) {
        const screen = String(row.screen).trim();
        if (list === DRAWN_FROM_PROJECT) drawnFromProject.set(screen, where);
        else needed.set(screen, where);
        // A `drawn-from-project` row names the screen and nothing under it, so
        // the pair a duplicate is judged on is the screen itself.
        const key =
          list === DRAWN_FROM_PROJECT ? screen : `${screen} / ${String(row.region).trim()}`;
        const seen = realised.get(key);
        if (seen === undefined) realised.set(key, where);
        else duplicates.push({ key, first: seen, second: where });
        // With no UI contract at all there is no list to hold the row to, and
        // the readiness gate already reports that project. `region` is not
        // resolved: a screen contract names a screen, not its parts.
        if (declaredScreens.size > 0 && !declaredScreens.has(screen)) {
          issues.push(
            report(
              `row '${where}' names screen '${screen}', which no UI contract declares. ` +
                `An implementer and a reviewer locate the region through the screen, so a ` +
                `row naming one that does not exist gives neither of them anything to act on.`,
            ),
          );
        }
      }
      if (missing.length > 0) {
        issues.push(
          report(
            `row '${where}' names no ${missing.join(", ")}. Each row carries ${cells.join(", ")}, ` +
              `because an implementer reads this to install rather than to reconstruct.`,
          ),
        );
      }
    });
  }
  for (const [screen, where] of drawnFromProject) {
    const other = needed.get(screen);
    if (other === undefined) continue;
    issues.push(
      report(
        `row '${where}' says screen '${screen}' needed nothing, and '${other}' names something ` +
          `it needed. A screen is one or the other, so an implementer is told both to install ` +
          `and that there is nothing to install.`,
      ),
    );
  }
  for (const { key, first, second } of duplicates) {
    issues.push(
      report(
        `names '${key}' at both '${first}' and '${second}'. Each screen region names one ` +
          `thing that realises it, so two rows for it leave an implementer without an answer ` +
          `to what to install.`,
      ),
    );
  }
  return issues;
}

/**
 * Cross-check `design-system.yaml` mirror values against the parsed
 * root DESIGN.md tokens. Returns one DCON-005 per diverging key. The
 * mirror is contractually a verbatim copy, so any token mismatch means
 * downstream `/qfai-implement` would be bound to the wrong design
 * identity even if the lock-sha chain is internally consistent.
 *
 * Sub-keys checked:
 *   - visual.colors.{12 keys}
 *   - visual.typography.{family_sans, family_display, family_mono}
 *   - visual.radius.{sm, md, lg, full}
 *   - visual.shadow.{sm, md, lg}
 *
 * `visual.spacing` and the optional typography sub-keys (scale,
 * weight) are deliberately not cross-checked because they are
 * optional in DESIGN.md. Adding them here would require carrying
 * the raw DESIGN.md object; the canonical DesignMd type already
 * loses the raw spacing scale shape.
 */
function crossCheckMirrorValues(
  visual: Record<string, unknown>,
  rootDesignMd: DesignMd,
  filePathRel: string,
): Issue[] {
  const issues: Issue[] = [];
  const compare = (
    section: "colors" | "typography" | "radius" | "shadow",
    expected: Record<string, string>,
    // Keys handled by dedicated helpers (e.g. typography.scale /
    // typography.weight live one level deeper and have non-string
    // values; they are cross-checked by `crossCheckTypographyScale`
    // / `crossCheckTypographyWeight` separately). The reverse loop
    // skips them so they are not flagged as "fabricated keys" here.
    optionalKeys: ReadonlySet<string> = new Set(),
  ): void => {
    const mirror = visual[section];
    if (!isRecord(mirror)) return;
    // DESIGN.md -> mirror direction: every DESIGN.md token must be
    // present in the mirror with the matching value.
    for (const [key, expectedValue] of Object.entries(expected)) {
      if (!(key in mirror)) {
        issues.push(
          issue(
            "QFAI-DCON-005",
            `design-system.yaml mirror is missing 'visual.${section}.${key}' (DESIGN.md token: '${expectedValue}').`,
            "error",
            filePathRel,
            "designContractReadiness.designSystemMirror",
          ),
        );
        continue;
      }
      const actual = mirror[key];
      if (typeof actual !== "string" || actual !== expectedValue) {
        issues.push(
          issue(
            "QFAI-DCON-005",
            `design-system.yaml mirror 'visual.${section}.${key}' diverges from DESIGN.md (mirror=${JSON.stringify(actual)}, DESIGN.md='${expectedValue}').`,
            "error",
            filePathRel,
            "designContractReadiness.designSystemMirror",
            undefined,
            "canonical",
            "The mirror is contractually a verbatim copy of DESIGN.md tokens; re-run `qfai prototyping certify` (or regenerate design-system.yaml) so values match.",
          ),
        );
      }
    }
    // mirror -> DESIGN.md direction: extra keys not in DESIGN.md are
    // also a contract violation (the mirror is a verbatim copy, so
    // the key sets must be set-equal). Without this, a hand-authored
    // mirror with `visual.colors.fabricated_token: "#FF00FF"` would
    // pass certify and travel to `/qfai-implement` as validated
    // content. The handoff contract is "verbatim mirror" -> the key
    // sets must match in both directions.
    //
    // `optionalKeys` lists keys handled by a separate helper (e.g.
    // typography.scale / typography.weight) — they are legitimate
    // mirror sub-keys per `qfai-prototyping/references/handoff.md`
    // and must NOT surface as fabricated here.
    for (const key of Object.keys(mirror)) {
      if (!(key in expected) && !optionalKeys.has(key)) {
        issues.push(
          issue(
            "QFAI-DCON-005",
            `design-system.yaml mirror 'visual.${section}.${key}' is not a DESIGN.md token; the mirror must be a verbatim copy of DESIGN.md (no fabricated keys).`,
            "error",
            filePathRel,
            "designContractReadiness.designSystemMirror",
            undefined,
            "canonical",
            "Remove the fabricated key, or add it to root DESIGN.md and refreeze the lock.",
          ),
        );
      }
    }
  };
  compare("colors", rootDesignMd.visual.colors);
  compare(
    "typography",
    {
      family_sans: rootDesignMd.visual.typography.family_sans,
      family_display: rootDesignMd.visual.typography.family_display,
      family_mono: rootDesignMd.visual.typography.family_mono,
    },
    // typography.scale / typography.weight are nested optional
    // tokens with non-string values, handled by dedicated helpers
    // below. Whitelist them in the bidir-loop's reverse direction
    // so a legitimate mirror that includes them does not surface
    // as "fabricated keys".
    new Set(["scale", "weight"]),
  );
  compare("radius", rootDesignMd.visual.radius);
  compare("shadow", rootDesignMd.visual.shadow);

  // Optional DESIGN.md tokens. Per `qfai-prototyping/references/handoff.md`,
  // the mirror copies these verbatim WHEN PRESENT in DESIGN.md, and
  // omits them otherwise. The contract is two-state: "absent in
  // mirror" or "verbatim copy". A third state — "authored only in
  // mirror" — is a contract violation (it would let
  // `/qfai-implement` bind to validated mirror content that has no
  // anchor in the brand SSOT).
  //
  // For each optional section we therefore branch:
  //   - DESIGN.md authored it -> cross-check values + key-set
  //   - DESIGN.md did NOT author it -> mirror MUST also omit it,
  //     else surface DCON-005 ("not a DESIGN.md token")
  const dmTypography = rootDesignMd.visual.typography;
  if (dmTypography.scale !== undefined) {
    crossCheckTypographyScale(visual, dmTypography.scale, filePathRel, issues);
  } else {
    rejectMirrorOnlyTypographySubKey(visual, "scale", filePathRel, issues);
  }
  if (dmTypography.weight !== undefined) {
    crossCheckTypographyWeight(visual, dmTypography.weight, filePathRel, issues);
  } else {
    rejectMirrorOnlyTypographySubKey(visual, "weight", filePathRel, issues);
  }
  const dmSpacing = rootDesignMd.visual.spacing;
  if (dmSpacing !== undefined) {
    crossCheckSpacing(visual, dmSpacing, filePathRel, issues);
  } else {
    rejectMirrorOnlySpacing(visual, filePathRel, issues);
  }
  return issues;
}

/**
 * When DESIGN.md does NOT author `typography.scale` / `typography.weight`,
 * the mirror MUST also omit it. This helper enforces that
 * "DESIGN.md absent + mirror present" is rejected as DCON-005, so a
 * hand-authored mirror cannot fabricate optional sections.
 */
function rejectMirrorOnlyTypographySubKey(
  visual: Record<string, unknown>,
  subKey: "scale" | "weight",
  filePathRel: string,
  issues: Issue[],
): void {
  const typo = visual.typography;
  if (!isRecord(typo)) return;
  if (subKey in typo) {
    issues.push(
      issue(
        "QFAI-DCON-005",
        `design-system.yaml mirror authors 'visual.typography.${subKey}' but DESIGN.md does not. The mirror is contractually a verbatim copy of DESIGN.md (no fabricated sections).`,
        "error",
        filePathRel,
        "designContractReadiness.designSystemMirror",
        undefined,
        "canonical",
        `Remove 'visual.typography.${subKey}' from design-system.yaml, or author it in root DESIGN.md and refreeze the lock.`,
      ),
    );
  }
}

/**
 * When DESIGN.md does NOT author `visual.spacing`, the mirror MUST
 * also omit the entire spacing block. Symmetric counterpart of
 * `crossCheckSpacing`.
 */
function rejectMirrorOnlySpacing(
  visual: Record<string, unknown>,
  filePathRel: string,
  issues: Issue[],
): void {
  if ("spacing" in visual) {
    issues.push(
      issue(
        "QFAI-DCON-005",
        "design-system.yaml mirror authors 'visual.spacing' but DESIGN.md does not. The mirror is contractually a verbatim copy of DESIGN.md (no fabricated sections).",
        "error",
        filePathRel,
        "designContractReadiness.designSystemMirror",
        undefined,
        "canonical",
        "Remove 'visual.spacing' from design-system.yaml, or author it in root DESIGN.md and refreeze the lock.",
      ),
    );
  }
}

// `compare` above walks top-level `visual[<section>]` records and
// applies a string-equality contract. Nested optional tokens
// (`visual.typography.scale`, `visual.typography.weight`,
// `visual.spacing`) need dedicated helpers because they live one
// level deeper and `weight`/`spacing.scale` carry non-string values.

function crossCheckTypographyScale(
  visual: Record<string, unknown>,
  expected: Record<string, string>,
  filePathRel: string,
  issues: Issue[],
): void {
  const typo = visual.typography;
  if (!isRecord(typo)) return;
  const mirror = typo.scale;
  if (!isRecord(mirror)) {
    issues.push(
      issue(
        "QFAI-DCON-005",
        `design-system.yaml mirror is missing 'visual.typography.scale' (DESIGN.md authored ${Object.keys(expected).length} scale tokens).`,
        "error",
        filePathRel,
        "designContractReadiness.designSystemMirror",
      ),
    );
    return;
  }
  for (const [key, expectedValue] of Object.entries(expected)) {
    if (!(key in mirror)) {
      issues.push(
        issue(
          "QFAI-DCON-005",
          `design-system.yaml mirror is missing 'visual.typography.scale.${key}' (DESIGN.md token: '${expectedValue}').`,
          "error",
          filePathRel,
          "designContractReadiness.designSystemMirror",
        ),
      );
      continue;
    }
    const actual = mirror[key];
    if (typeof actual !== "string" || actual !== expectedValue) {
      issues.push(
        issue(
          "QFAI-DCON-005",
          `design-system.yaml mirror 'visual.typography.scale.${key}' diverges from DESIGN.md (mirror=${JSON.stringify(actual)}, DESIGN.md='${expectedValue}').`,
          "error",
          filePathRel,
          "designContractReadiness.designSystemMirror",
        ),
      );
    }
  }
  for (const key of Object.keys(mirror)) {
    if (!(key in expected)) {
      issues.push(
        issue(
          "QFAI-DCON-005",
          `design-system.yaml mirror 'visual.typography.scale.${key}' is not a DESIGN.md token; the mirror must be a verbatim copy.`,
          "error",
          filePathRel,
          "designContractReadiness.designSystemMirror",
        ),
      );
    }
  }
}

function crossCheckTypographyWeight(
  visual: Record<string, unknown>,
  expected: Record<string, number>,
  filePathRel: string,
  issues: Issue[],
): void {
  // typography.weight is Record<string, number>. The dedicated helper
  // is needed because `compare` above is typed for string values.
  const typo = visual.typography;
  if (!isRecord(typo)) return;
  const mirror = typo.weight;
  if (!isRecord(mirror)) {
    issues.push(
      issue(
        "QFAI-DCON-005",
        `design-system.yaml mirror is missing 'visual.typography.weight' (DESIGN.md authored ${Object.keys(expected).length} weight tokens).`,
        "error",
        filePathRel,
        "designContractReadiness.designSystemMirror",
      ),
    );
    return;
  }
  for (const [key, expectedValue] of Object.entries(expected)) {
    if (!(key in mirror)) {
      issues.push(
        issue(
          "QFAI-DCON-005",
          `design-system.yaml mirror is missing 'visual.typography.weight.${key}' (DESIGN.md token: ${expectedValue}).`,
          "error",
          filePathRel,
          "designContractReadiness.designSystemMirror",
        ),
      );
      continue;
    }
    const actual = mirror[key];
    if (typeof actual !== "number" || actual !== expectedValue) {
      issues.push(
        issue(
          "QFAI-DCON-005",
          `design-system.yaml mirror 'visual.typography.weight.${key}' diverges from DESIGN.md (mirror=${JSON.stringify(actual)}, DESIGN.md=${expectedValue}).`,
          "error",
          filePathRel,
          "designContractReadiness.designSystemMirror",
        ),
      );
    }
  }
  for (const key of Object.keys(mirror)) {
    if (!(key in expected)) {
      issues.push(
        issue(
          "QFAI-DCON-005",
          `design-system.yaml mirror 'visual.typography.weight.${key}' is not a DESIGN.md token; the mirror must be a verbatim copy.`,
          "error",
          filePathRel,
          "designContractReadiness.designSystemMirror",
        ),
      );
    }
  }
}

function crossCheckSpacing(
  visual: Record<string, unknown>,
  expected: NonNullable<DesignMd["visual"]["spacing"]>,
  filePathRel: string,
  issues: Issue[],
): void {
  // spacing has heterogeneous types: `base` is string, `scale` is
  // number[]. Walk each sub-key independently rather than re-using
  // `compare` (which assumes a Record-of-strings shape).
  const mirror = visual.spacing;
  if (!isRecord(mirror)) {
    // DESIGN.md authored spacing tokens but the mirror omitted the
    // entire spacing block — surface as a single missing-section
    // message rather than per-key noise.
    issues.push(
      issue(
        "QFAI-DCON-005",
        "design-system.yaml mirror is missing 'visual.spacing' (DESIGN.md authored spacing tokens that must be copied verbatim).",
        "error",
        filePathRel,
        "designContractReadiness.designSystemMirror",
      ),
    );
    return;
  }
  if (expected.base !== undefined) {
    if (!("base" in mirror)) {
      issues.push(
        issue(
          "QFAI-DCON-005",
          `design-system.yaml mirror is missing 'visual.spacing.base' (DESIGN.md token: '${expected.base}').`,
          "error",
          filePathRel,
          "designContractReadiness.designSystemMirror",
        ),
      );
    } else if (mirror.base !== expected.base) {
      issues.push(
        issue(
          "QFAI-DCON-005",
          `design-system.yaml mirror 'visual.spacing.base' diverges from DESIGN.md (mirror=${JSON.stringify(mirror.base)}, DESIGN.md='${expected.base}').`,
          "error",
          filePathRel,
          "designContractReadiness.designSystemMirror",
        ),
      );
    }
  }
  if (expected.scale !== undefined) {
    if (!("scale" in mirror)) {
      issues.push(
        issue(
          "QFAI-DCON-005",
          `design-system.yaml mirror is missing 'visual.spacing.scale' (DESIGN.md token: ${JSON.stringify(expected.scale)}).`,
          "error",
          filePathRel,
          "designContractReadiness.designSystemMirror",
        ),
      );
    } else {
      const mirrorScale = mirror.scale;
      const expectedScale = expected.scale;
      if (
        !Array.isArray(mirrorScale) ||
        mirrorScale.length !== expectedScale.length ||
        !expectedScale.every((v, i) => mirrorScale[i] === v)
      ) {
        issues.push(
          issue(
            "QFAI-DCON-005",
            `design-system.yaml mirror 'visual.spacing.scale' diverges from DESIGN.md (mirror=${JSON.stringify(mirrorScale)}, DESIGN.md=${JSON.stringify(expectedScale)}).`,
            "error",
            filePathRel,
            "designContractReadiness.designSystemMirror",
          ),
        );
      }
    }
  }
  // Reverse direction: extra mirror keys. Reject both (a) keys outside
  // the schema-defined `{base, scale}` set AND (b) schema-allowed keys
  // that DESIGN.md did not author. Without (b), an author can extend
  // `visual.spacing` in design-system.yaml with `scale` even when
  // DESIGN.md only authored `base` — a verbatim-copy violation that
  // pre-fix slipped through because the previous check only enforced
  // (a).
  const SCHEMA_SPACING_KEYS = new Set(["base", "scale"]);
  for (const key of Object.keys(mirror)) {
    if (!SCHEMA_SPACING_KEYS.has(key)) {
      issues.push(
        issue(
          "QFAI-DCON-005",
          `design-system.yaml mirror 'visual.spacing.${key}' is not a DESIGN.md token; the mirror must be a verbatim copy.`,
          "error",
          filePathRel,
          "designContractReadiness.designSystemMirror",
        ),
      );
      continue;
    }
    // Schema-allowed key: still must have been authored in DESIGN.md.
    const expectedValue = (expected as Record<string, unknown>)[key];
    if (expectedValue === undefined) {
      issues.push(
        issue(
          "QFAI-DCON-005",
          `design-system.yaml mirror authors 'visual.spacing.${key}' but DESIGN.md does not. The mirror is contractually a verbatim copy of DESIGN.md (no fabricated sub-keys).`,
          "error",
          filePathRel,
          "designContractReadiness.designSystemMirror",
        ),
      );
    }
  }
}

/**
 * Format a value for inclusion in a diagnostic message. Primitives
 * (`null`, `number`, `string`, `boolean`) are JSON-serialized for
 * literal preservation; non-primitives (arrays / objects) collapse to
 * `<typeof>` so a misnested YAML directive like `{ foo: 1 }` does not
 * spew an opaque JSON blob into the operator-facing error.
 */
function describeValueForDiagnostic(value: unknown): string {
  if (
    value === null ||
    typeof value === "number" ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return "<array>";
  return `<${typeof value}>`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasMeaningfulContractContent(value: unknown, depth = 0): boolean {
  if (depth > 8) {
    return false;
  }
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized.length > 0 && !PLACEHOLDER_RE.test(normalized);
  }
  if (Array.isArray(value)) {
    return value.some((entry) => hasMeaningfulContractContent(entry, depth + 1));
  }
  if (isRecord(value)) {
    return Object.values(value).some((entry) => hasMeaningfulContractContent(entry, depth + 1));
  }
  return false;
}

async function readYaml(filePath: string): Promise<YamlReadResult> {
  try {
    const parsed: unknown = parseYaml(await readFile(filePath, "utf-8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { kind: "invalid" };
    }
    return { kind: "ok", value: parsed as Record<string, unknown> };
  } catch {
    try {
      await readFile(filePath, "utf-8");
      return { kind: "invalid" };
    } catch {
      return { kind: "missing" };
    }
  }
}
