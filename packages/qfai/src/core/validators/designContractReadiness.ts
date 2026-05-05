import path from "node:path";
import { readFile } from "node:fs/promises";

import fg from "fast-glob";
import { parse as parseYaml } from "yaml";

import type { QfaiConfig } from "../config.js";
import { hashDesignMd, parseDesignMd } from "../design/designMd.js";
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
    const lockSha = readLockSha256(lockText);
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
    // Optional sanity: DESIGN.md must parse (parseDesignMd already
    // validates archetype, color set, etc. — failures surface as a
    // DCON-030 with parse-error suffix so consumers can distinguish
    // missing vs malformed).
    const parseResult = parseDesignMd(designMdText);
    if ("error" in parseResult) {
      issues.push(
        issue(
          "QFAI-DCON-030",
          `Root DESIGN.md failed to parse: ${parseResult.error.message}`,
          "error",
          ROOT_DESIGN_MD_REL,
          "designContractReadiness.rootDesignMd",
          undefined,
          "canonical",
          "Fix DESIGN.md front-matter so parseDesignMd succeeds (see qfai-prototyping/references/design-md-spec.md).",
        ),
      );
    }
  }

  return issues;
}

function readLockSha256(text: string): string | null {
  try {
    const parsed: unknown = parseYaml(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const value = (parsed as Record<string, unknown>)["designMdSha256"];
    return typeof value === "string" && value.length > 0 ? value : null;
  } catch {
    return null;
  }
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

  const checklist = parsed.value.checklist;
  const issues: Issue[] = [];

  for (const key of REQUIRED_DESIGN_SYSTEM_CHECKLIST_KEYS) {
    if (
      !(checklist && typeof checklist === "object" && key in (checklist as Record<string, unknown>))
    ) {
      issues.push(
        issue(
          "QFAI-DCON-005",
          `design-system.yaml is missing checklist key '${key}'.`,
          "error",
          toPosixRelative(root, filePath),
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
        "design-system.yaml is missing component guidance (expected checklist.component_tone or a richer component_tone/component_semantics/content_tone block).",
        "error",
        toPosixRelative(root, filePath),
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

  return validateRequiredStringArrayKeys(
    filePath,
    root,
    parsed.value,
    ["sourcePrototypeRefs", "surfaceProfiles", "screens", "visualDna", "implementationHandoff"],
    "QFAI-DCON-013",
    "prototype-handoff.yaml is missing required field",
    "designContractReadiness.prototypeHandoffField",
  );
}

function validateRequiredStringArrayKeys(
  filePath: string,
  root: string,
  record: Record<string, unknown>,
  requiredKeys: string[],
  code: string,
  messagePrefix: string,
  rule: string,
): Issue[] {
  const issues: Issue[] = [];
  for (const key of requiredKeys) {
    const value = record[key];
    if (!hasMeaningfulContractContent(value)) {
      issues.push(
        issue(code, `${messagePrefix} '${key}'.`, "error", toPosixRelative(root, filePath), rule),
      );
    }
  }
  return issues;
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
