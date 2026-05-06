import path from "node:path";
import { readFile } from "node:fs/promises";

import fg from "fast-glob";
import { parse as parseYaml } from "yaml";

import type { QfaiConfig } from "../config.js";
import { hashDesignMd, parseDesignMd } from "../design/designMd.js";
import { readDesignMdLockSha } from "../design/designMdLock.js";
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

type DesignContractReadinessStage = "sdd" | "prototyping";
type SddDesignContractReadinessOptions = {
  enforceNoPrematurePrototypingContracts?: boolean;
};

function toPosixRelative(root: string, targetPath: string): string {
  return path.relative(root, targetPath).replace(/\\/g, "/");
}

type YamlReadResult =
  | { kind: "missing" }
  | { kind: "invalid" }
  | { kind: "ok"; value: Record<string, unknown> };

export async function validateSddDesignContractReadiness(
  root: string,
  config: QfaiConfig,
  options: SddDesignContractReadinessOptions = {},
): Promise<Issue[]> {
  return validateDesignContractReadinessForStage(root, config, "sdd", {
    enforceNoPrematurePrototypingContracts: options.enforceNoPrematurePrototypingContracts ?? true,
  });
}

export async function validatePrototypingDesignContractReadiness(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  return validateDesignContractReadinessForStage(root, config, "prototyping");
}

async function validateDesignContractReadinessForStage(
  root: string,
  config: QfaiConfig,
  stage: DesignContractReadinessStage,
  options: SddDesignContractReadinessOptions = {},
): Promise<Issue[]> {
  const uiPattern = path.posix.join(
    path.join(root, config.paths.contractsDir, "ui").replace(/\\/g, "/"),
    "**/*.yaml",
  );
  const uiContracts = await fg(uiPattern, { absolute: true });
  if (uiContracts.length === 0) {
    return [];
  }

  const designDir = path.join(root, config.paths.contractsDir, "design");
  const issues: Issue[] = [];

  issues.push(...(await validateRootDesignMdAndLock(root, designDir)));

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
    issues.push(...(await validateDesignSystem(root, config)));
    issues.push(...(await validatePrototypeHandoff(root, config)));
  } else if (options.enforceNoPrematurePrototypingContracts ?? true) {
    issues.push(...(await validateNoPrematurePrototypingContracts(root, config)));
  }
  return issues;
}

async function validateRootDesignMdAndLock(root: string, designDir: string): Promise<Issue[]> {
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
        "Create root DESIGN.md from the project root with the canonical front-matter (see qfai-discussion / qfai-sdd skills).",
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

  // Only attempt sha comparison when both files were readable.
  if (designMdText !== null && lockText !== null) {
    const lockSha = readDesignMdLockSha(lockText);
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
    } else {
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
    // DCON-030 covers missing-file; parse failures get their own
    // distinct code (DCON-033) so automated remediation can route the
    // two failure modes correctly: missing -> regenerate template,
    // parse failure -> repair existing file without losing user edits.
    const parseResult = parseDesignMd(designMdText);
    if ("error" in parseResult) {
      issues.push(
        issue(
          "QFAI-DCON-033",
          `Root DESIGN.md failed to parse: ${parseResult.error.message}`,
          "error",
          ROOT_DESIGN_MD_REL,
          "designContractReadiness.rootDesignMdParse",
          undefined,
          "canonical",
          "Fix DESIGN.md front-matter so parseDesignMd succeeds (see qfai-prototyping/references/design-md-spec.md). Do NOT regenerate the template — that would discard user content.",
        ),
      );
    }
  }

  return issues;
}

async function validateNoPrematurePrototypingContracts(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const designDir = path.join(root, config.paths.contractsDir, "design");
  const issues: Issue[] = [];
  for (const fileName of REQUIRED_PROTOTYPING_DESIGN_FILES) {
    const filePath = path.join(designDir, fileName);
    try {
      await readFile(filePath, "utf-8");
      issues.push(
        issue(
          "QFAI-DCON-019",
          `${fileName} must be produced by /qfai-prototyping, not /qfai-sdd.`,
          "error",
          toPosixRelative(root, filePath),
          "designContractReadiness.prematurePrototypingContract",
        ),
      );
    } catch {
      // missing is expected before prototyping
    }
  }
  return issues;
}

async function validateDesignSystem(root: string, config: QfaiConfig): Promise<Issue[]> {
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
    // Shape-only check by design. The mirror is byte-deterministic
    // (`qfai-prototyping/references/handoff.md` describes it as a
    // verbatim DESIGN.md token copy), and sub-key fidelity (12
    // colors / 4 radii / 3 shadows / typography family triple) is
    // already anchored by `designMdSha256` in the handoff yaml +
    // the `DESIGN.md.lock.yaml` sha contract. Adding sub-key
    // requirements here would duplicate that contract and produce
    // confusing double-failures (DCON-005 + DCON-032) for the same
    // root cause. visual.spacing remains optional in DESIGN.md and
    // is excluded from the required list deliberately.
    const REQUIRED_MIRROR_KEYS = ["colors", "typography", "radius", "shadow"] as const;
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
      }
    }
    return issues;
  }

  // Legacy checklist shape — kept so existing projects keep validating
  // until they regenerate their design-system.yaml from the new mirror.
  const checklist = parsed.value.checklist;
  for (const key of REQUIRED_DESIGN_SYSTEM_CHECKLIST_KEYS) {
    if (
      !(checklist && typeof checklist === "object" && key in (checklist as Record<string, unknown>))
    ) {
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

async function validatePrototypeHandoff(root: string, config: QfaiConfig): Promise<Issue[]> {
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
  // `.qfai/assistant/skills/qfai-prototyping/references/handoff.md`:
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
  return issues;
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
