/**
 * SaaS-package validate profile runner.
 *
 * Gates a SaaS-tenant package on three required conditions:
 *   1. Prototyping-profile validators PASS (no error-severity findings).
 *   2. The design-system attestation, root `DESIGN.md`, is present and
 *      parses.
 *   3. The prototyping handoff record `.qfai/prototype/final/handoff.json`
 *      is present and conforms to the canonical CLI-HANDOFF schema.
 *
 * ATDD / implement-class gates are intentionally skipped — a
 * SaaS-tenant package does not exercise those phases. Each skipped
 * gate is surfaced as a `QFAI-SAAS-003` (severity
 * info) finding naming the gate, so the consumer can see exactly
 * which surfaces were not exercised in this profile.
 */

import path from "node:path";

import { parseDesignMd } from "../design/designMd.js";
import type { Issue } from "../types.js";
import { parseHandoff, validateHandoff } from "../schemas/handoff.js";
import { issue, readPresentFile } from "../validators/utils.js";

import { SAAS_PACKAGE_SKIPPED_GATES } from "./skippedGates.js";

const DESIGN_ATTESTATION_REL = "DESIGN.md";
const HANDOFF_REL = ".qfai/prototype/final/handoff.json";

const VERIFY_SKIPPED_CODE = "QFAI-SAAS-003";
const ATTESTATION_MISSING_CODE = "QFAI-SAAS-001";
const HANDOFF_SCHEMA_CODE = "QFAI-SAAS-002";

const UNREADABLE_ACTION = (rel: string): string =>
  `Make ${rel} a regular file this process can read (check its permissions or file type), then rerun validate.`;

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

/**
 * The design system a SaaS tenant ships is the root `DESIGN.md`, read
 * through the same parser the prototyping loop uses. A file that does not
 * parse attests nothing, so it is reported the same way as a missing one. A
 * path that is there but cannot be read is reported with its cause instead,
 * since authoring the file again would not fix it.
 */
async function checkDesignAttestation(root: string): Promise<Issue[]> {
  const read = await readPresentFile(path.join(root, DESIGN_ATTESTATION_REL));
  if (read.kind === "unreadable") {
    return [
      issue(
        ATTESTATION_MISSING_CODE,
        `Design-system attestation ${DESIGN_ATTESTATION_REL} cannot be read (${read.reason}). The saas-package profile requires this attestation to PASS.`,
        "error",
        DESIGN_ATTESTATION_REL,
        "validate.saasPackage.attestationMissing",
        [DESIGN_ATTESTATION_REL],
        "canonical",
        UNREADABLE_ACTION(DESIGN_ATTESTATION_REL),
      ),
    ];
  }
  const problem =
    read.kind === "absent"
      ? "is absent"
      : "error" in parseDesignMd(read.text)
        ? "does not parse as DESIGN.md"
        : null;
  if (problem === null) {
    return [];
  }
  return [
    issue(
      ATTESTATION_MISSING_CODE,
      `Design-system attestation ${DESIGN_ATTESTATION_REL} ${problem}. The saas-package profile requires this attestation to PASS.`,
      "error",
      DESIGN_ATTESTATION_REL,
      "validate.saasPackage.attestationMissing",
      [DESIGN_ATTESTATION_REL],
      "canonical",
      `Author root ${DESIGN_ATTESTATION_REL} as this product's brand SSOT (see the qfai-prototyping design-md-spec reference), then rerun validate.`,
    ),
  ];
}

async function checkHandoffSchema(root: string): Promise<Issue[]> {
  const handoffPath = path.join(root, HANDOFF_REL);
  const read = await readPresentFile(handoffPath);
  if (read.kind === "unreadable") {
    return [
      issue(
        HANDOFF_SCHEMA_CODE,
        `The prototyping handoff record ${HANDOFF_REL} cannot be read (${read.reason}); the saas-package profile requires a conformant handoff.`,
        "error",
        HANDOFF_REL,
        "validate.saasPackage.handoffSchema",
        [HANDOFF_REL],
        "canonical",
        UNREADABLE_ACTION(HANDOFF_REL),
      ),
    ];
  }
  if (read.kind === "absent") {
    return [
      issue(
        HANDOFF_SCHEMA_CODE,
        `The prototyping handoff record ${HANDOFF_REL} is missing; the saas-package profile requires a conformant handoff.`,
        "error",
        HANDOFF_REL,
        "validate.saasPackage.handoffSchema",
        [HANDOFF_REL],
        "canonical",
        "Confirm the prototype in /qfai-prototyping, whose handoff step writes this record, then rerun validate.",
      ),
    ];
  }
  const parsed = parseHandoff(read.text);
  if (parsed === null) {
    return [
      issue(
        HANDOFF_SCHEMA_CODE,
        `The prototyping handoff record ${HANDOFF_REL} is not a parseable object; the saas-package profile requires a conformant handoff.`,
        "error",
        HANDOFF_REL,
        "validate.saasPackage.handoffSchema",
        [HANDOFF_REL],
        "canonical",
        `Write ${HANDOFF_REL} as a JSON object matching the canonical handoff schema, then rerun validate.`,
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
      `Handoff schema violation at ${HANDOFF_REL}: ${schemaIssue.message}`,
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
