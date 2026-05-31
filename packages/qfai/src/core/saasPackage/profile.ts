/**
 * SaaS-package validate profile runner.
 *
 * Gates a SaaS-tenant package on three required conditions:
 *   1. Prototyping-profile validators PASS (no error-severity findings).
 *   2. The design-system attestation is present at
 *      `.qfai/contracts/design/design-system.yaml`.
 *   3. The cross-skill handoff file (when present at
 *      `.qfai/handoff.yaml`) conforms to the canonical schema.
 *
 * ATDD / implement-class gates are intentionally skipped — a
 * SaaS-tenant package does not exercise those phases. Each skipped
 * gate is surfaced as a `D-SAAS-PACKAGE-VERIFY-SKIPPED` (severity
 * info) finding naming the gate, so the consumer can see exactly
 * which surfaces were not exercised in this profile.
 */

import { access, readFile } from "node:fs/promises";
import path from "node:path";

import type { ConfigLoadResult } from "../config.js";
import type { Issue } from "../types.js";
import { parseHandoffJson, validateHandoff } from "../schemas/handoff.js";
import { issue } from "../validators/utils.js";

import { SAAS_PACKAGE_SKIPPED_GATES } from "./skippedGates.js";

const DESIGN_ATTESTATION_REL = ".qfai/contracts/design/design-system.yaml";
const HANDOFF_REL = ".qfai/handoff.yaml";

const VERIFY_SKIPPED_CODE = "D-SAAS-PACKAGE-VERIFY-SKIPPED";
const ATTESTATION_MISSING_CODE = "D-SAAS-PACKAGE-ATTESTATION-MISSING";
const HANDOFF_SCHEMA_CODE = "D-SAAS-PACKAGE-HANDOFF-SCHEMA";

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function readTextOrNull(p: string): Promise<string | null> {
  try {
    return await readFile(p, "utf-8");
  } catch {
    return null;
  }
}

function buildSkipFindings(): Issue[] {
  return SAAS_PACKAGE_SKIPPED_GATES.map((gate) =>
    issue(
      VERIFY_SKIPPED_CODE,
      `SaaS-package profile skipped ${gate}; full DONE not claimed for this profile.`,
      "info",
      undefined,
      "validate.saasPackage.verifySkipped",
      [gate],
      "canonical",
      `If the ${gate} gate is required for this surface, run validate under the full or verify profile instead.`,
    ),
  );
}

async function checkDesignAttestation(root: string): Promise<Issue[]> {
  const attestationPath = path.join(root, DESIGN_ATTESTATION_REL);
  if (await pathExists(attestationPath)) {
    return [];
  }
  return [
    issue(
      ATTESTATION_MISSING_CODE,
      `Design-system attestation is absent: ${DESIGN_ATTESTATION_REL}. The saas-package profile requires this attestation to PASS.`,
      "error",
      DESIGN_ATTESTATION_REL,
      "validate.saasPackage.attestationMissing",
      [DESIGN_ATTESTATION_REL],
      "canonical",
      `Author the design-system attestation at ${DESIGN_ATTESTATION_REL} (one screen-system mapping per shipped surface), then rerun validate.`,
    ),
  ];
}

async function checkHandoffSchema(root: string): Promise<Issue[]> {
  const handoffPath = path.join(root, HANDOFF_REL);
  const text = await readTextOrNull(handoffPath);
  if (text === null) {
    // Absence is not a saas-package failure on its own — the schema
    // check applies only when a handoff file is present (consistent
    // with the AC: "CLI-HANDOFF handoff conforms").
    return [];
  }
  const parsed = parseHandoffJson(text);
  if (parsed === null) {
    return [
      issue(
        HANDOFF_SCHEMA_CODE,
        `Cross-skill handoff at ${HANDOFF_REL} is not a parseable object; the saas-package profile requires a conformant handoff.`,
        "error",
        HANDOFF_REL,
        "validate.saasPackage.handoffSchema",
        [HANDOFF_REL],
        "canonical",
        `Author ${HANDOFF_REL} as a JSON / YAML object matching the canonical handoff schema, then rerun validate.`,
      ),
    ];
  }
  const schemaIssues = validateHandoff(parsed);
  if (schemaIssues.length === 0) {
    return [];
  }
  return schemaIssues.map((schemaIssue) =>
    issue(
      HANDOFF_SCHEMA_CODE,
      `Cross-skill handoff schema violation at ${HANDOFF_REL}: ${schemaIssue.message}`,
      "error",
      HANDOFF_REL,
      "validate.saasPackage.handoffSchema",
      schemaIssue.field ? [HANDOFF_REL, schemaIssue.field] : [HANDOFF_REL],
      "canonical",
      `Fix the handoff field reported by ${schemaIssue.code} and rerun validate.`,
    ),
  );
}

/**
 * Run the saas-package validate profile.
 *
 * The prototyping-profile findings are reused as-is (no severity
 * remapping). The attestation / handoff checks add their own
 * findings. The skip-set is surfaced unconditionally so consumers
 * always see which gates were not exercised.
 *
 * `prototypingIssues` is supplied by the caller (typically
 * `runProfileValidators` in `validate.ts`) so we do not re-load the
 * prototyping pipeline from scratch and so the saas-package profile
 * can be tested in isolation by passing a prebuilt issue list.
 */
export async function runSaasPackageProfile(
  root: string,
  _config: ConfigLoadResult["config"],
  prototypingIssues: Issue[],
): Promise<Issue[]> {
  const attestation = await checkDesignAttestation(root);
  const handoff = await checkHandoffSchema(root);
  return [...prototypingIssues, ...attestation, ...handoff, ...buildSkipFindings()];
}

export {
  VERIFY_SKIPPED_CODE,
  ATTESTATION_MISSING_CODE,
  HANDOFF_SCHEMA_CODE,
  DESIGN_ATTESTATION_REL,
  HANDOFF_REL,
};
