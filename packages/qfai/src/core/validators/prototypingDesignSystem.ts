/**
 * Canonical prototyping design-system compliance validator (PROT-DS01)
 *
 * Verifies that the latest prototyping evidence records a
 * `scoringTrace.designSystemCompliance` score. The severity is
 * condition-sensitive:
 *
 * | UI-bearing | 12_design_system.md | mode           | absent ds score -> |
 * | ---------- | ------------------- | -------------- | ------------------ |
 * | false      | any                 | any            | zero fires (skip)  |
 * | true       | present             | full-harness   | ERROR              |
 * | true       | present             | not-full       | WARNING            |
 * | true       | missing             | any            | WARNING            |
 *
 * Presence of `scoringTrace.designSystemCompliance` (any value, including
 * `null`) causes zero fires.
 *
 * Spec: spec-0014 v1.7.16 (REQ-0016, AC-0014-0021)
 */
import { access, readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import type { Issue, IssueSeverity } from "../types.js";
import { readUiContractScreenContracts } from "../contracts/screenContracts.js";

const RULE_CODE = "PROT-DS01";
const RULE_NAME = "prototyping.designSystemCompliance";
const MESSAGE = "prototyping.json scoringTrace is missing required `designSystemCompliance` score.";
const SUGGESTED_ACTION =
  "Add `scoringTrace.designSystemCompliance` (numeric score 0..100 or null with rationale) to prototyping.json.";

type PrototypingMode = "full-harness" | "other";

type PrototypingArtifactShape = {
  source: "json" | "none";
  fileName: string;
  mode: PrototypingMode;
  designSystemCompliancePresent: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function detectMode(raw: unknown): PrototypingMode {
  if (!isRecord(raw)) {
    return "other";
  }
  const topLevel = raw.mode;
  if (isRecord(topLevel) && topLevel.effective === "full-harness") {
    return "full-harness";
  }
  return "other";
}

function detectScorePresence(raw: unknown): boolean {
  if (!isRecord(raw)) {
    return false;
  }
  const trace = raw.scoringTrace;
  if (!isRecord(trace)) {
    return false;
  }
  return Object.prototype.hasOwnProperty.call(trace, "designSystemCompliance");
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return false;
    }
    // For EACCES or other filesystem errors, treat as "not present"
    // for the purposes of this validator (system errors are surfaced
    // elsewhere by DS01/DS02 style permission validators).
    return false;
  }
}

async function readFileSafe(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, "utf-8");
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return null;
    }
    return null;
  }
}

async function loadPrototypingArtifact(evidenceDir: string): Promise<PrototypingArtifactShape> {
  const jsonPath = path.join(evidenceDir, "prototyping.json");

  const jsonRaw = await readFileSafe(jsonPath);
  if (jsonRaw !== null) {
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(jsonRaw);
    } catch {
      parsed = null;
    }
    return {
      source: "json",
      fileName: "prototyping.json",
      mode: detectMode(parsed),
      designSystemCompliancePresent: detectScorePresence(parsed),
    };
  }

  return {
    source: "none",
    fileName: "prototyping.json",
    mode: "other",
    designSystemCompliancePresent: false,
  };
}

function toIssue(severity: IssueSeverity, file: string): Issue {
  return {
    code: RULE_CODE,
    severity,
    category: "canonical",
    message: MESSAGE,
    file,
    rule: RULE_NAME,
    suggested_action: SUGGESTED_ACTION,
  };
}

/**
 * Run the PROT-DS01 validator against the latest discussion pack under
 * the given root. Returns zero issues on non-UI packs.
 */
export async function validatePrototypingDesignSystem(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const screens = await readUiContractScreenContracts(root, config.paths.contractsDir);
  if (screens.length === 0) {
    return [];
  }

  const evidenceDir = path.join(path.dirname(resolvePath(root, config, "specsDir")), "evidence");
  const artifact = await loadPrototypingArtifact(evidenceDir);
  if (artifact.designSystemCompliancePresent) {
    return [];
  }

  const designSystemPath = path.join(
    root,
    config.paths.contractsDir,
    "design",
    "design-system.yaml",
  );
  const designSystemPresent = await fileExists(designSystemPath);

  const severity: IssueSeverity =
    designSystemPresent && artifact.mode === "full-harness" ? "error" : "warning";

  return [toIssue(severity, artifact.fileName)];
}
