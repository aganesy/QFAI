/**
 * Reviewer-Gate validators for the second-wave findings:
 *   - R-CERTIFY-VERIFY-CIRCULAR: emitted when a prototyping-phase
 *     certify path reads a verify.json whose scope requires
 *     `/qfai-atdd` or `/qfai-implement` artifacts (option-B violation).
 *   - R-PROMPT-SCANNER-DRIFT: emitted when the
 *     designMdViolations.ts ↔ generator-prompt.md SSOT-sync pair
 *     drifts (a contract clause is present in one side but absent
 *     from the other).
 *
 * Both findings carry a 3-part justification embedded directly in
 * the issue `message` so downstream `qfai validate` ingestion can
 * assert against BR-0004-0028's non-empty justification contract.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { PROTOTYPING_JSON_REL } from "../prototyping/paths.js";
import { readVerifyJson } from "../prototyping/verifyJson.js";
import type { Issue } from "../types.js";
import { exists, issue, readSafe } from "./utils.js";
import { PROMPT_SCANNER_PAIRS } from "./promptScannerPairs.js";
import {
  MOCK_HREF_PAIRS,
  MOCK_HREF_TEMPLATE_REL,
  MOCK_HREF_VALIDATOR_REL,
} from "./mockHrefPairs.js";

const SCANNER_REL = "packages/qfai/src/core/prototyping/designMdViolations.ts";
const PROMPT_REL =
  "packages/qfai/assets/init/.qfai/assistant/skills/qfai-prototyping/references/generator-prompt.md";

// Verify.json scopes that pull in /qfai-atdd or /qfai-implement
// artifacts. Reading them at the prototyping phase forms the
// circular-read pattern that option-B forbids.
const NON_PROTOTYPING_SCOPES = new Set(["atdd", "full", "implement"]);

/**
 * Load a JSON file as a parsed object (`Record<string, unknown>`) or
 * return `null` when the file is missing / unreadable / not an object.
 *
 * Callers re-narrow each field they read (e.g. `typeof scope === "string"`)
 * so the loader does not need to ship a typed `T` parameter — that
 * pattern previously required a bare `as T` cast after a runtime object
 * check, which CLAUDE.md project rule prohibits.
 */
async function loadJsonObject(filePath: string): Promise<Record<string, unknown> | null> {
  if (!(await exists(filePath))) return null;
  try {
    const raw = await readFile(filePath, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object") return null;
    // `Record<string, unknown>` is the structural supertype of any parsed
    // JSON object; callers further narrow each field they read.
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Active-loop signal for the canonical prototyping state file. Returns
 * `true` only when a prototyping loop is currently iterating (i.e. has
 * NOT reached a terminal state).
 *
 * Sole criterion: `stopReason === null`.
 *
 * A completed loop sets `stopReason` to one of "axes-exceptional",
 * "max-iterations", "license-verify-fail", "input-error", etc. While
 * iterating (including cycle-0 seed where `writeSeedMetadata`
 * persists `acceptedIterationIndex = 0` even though no real
 * convergence has happened), `stopReason` stays `null`. Using
 * `acceptedIterationIndex === null` as a secondary gate was too
 * strict — it short-circuited real in-flight runs whose seed had
 * already populated that slot.
 *
 * Rationale: a presence-only check (`proto !== null`) treats any
 * parseable `prototyping.json` as an active loop, so once a file
 * exists from a previous run the gate emits
 * `R-CERTIFY-VERIFY-CIRCULAR` against every subsequent verify.json
 * with scope=atdd|full|implement — a persistent false-positive that
 * blocks the `validate` profile after the loop has already
 * completed. The pipeline deletes the legacy `phase` field on every
 * cycle-0 reset, so gating on `phase` is not viable; gating on the
 * per-loop terminal slot `stopReason` (which the pipeline writes
 * when, and only when, the loop actually finishes) is the
 * structurally correct active-loop signal.
 */
function isPrototypingLoopActive(proto: Record<string, unknown> | null): boolean {
  if (proto === null) return false;
  return proto.stopReason === null;
}

async function detectCertifyVerifyCircular(root: string): Promise<Issue[]> {
  // Canonical-first with a legacy fallback; the literal used to be pinned to
  // `.qfai/output/verify.json` here as well.
  const verifyRead = await readVerifyJson(root);
  const verify = verifyRead.json;
  // `missing` and `unreadable` both leave no `scope` to reason about, so this
  // circular-read detector has nothing to say. The broken file itself is not
  // swallowed: `prototyping certify` hard-fails on `source: "unreadable"`
  // rather than falling back to the other location.
  if (!verify) return [];
  const verifyRel = verifyRead.rel;

  const scopeField = verify.scope;
  const scopeRaw = typeof scopeField === "string" ? scopeField.trim().toLowerCase() : "";
  if (!scopeRaw) return [];
  if (!NON_PROTOTYPING_SCOPES.has(scopeRaw)) return [];

  const protoAbs = path.join(root, PROTOTYPING_JSON_REL);
  const proto = await loadJsonObject(protoAbs);
  if (!isPrototypingLoopActive(proto)) return [];

  // 3-part justification: (1) certify path / verify.json path,
  // (2) offending validator-output profile (scope),
  // (3) option-B contract clause violated.
  const message =
    `R-CERTIFY-VERIFY-CIRCULAR: certify path reads ${verifyRel} ` +
    `with scope="${scopeRaw}" while a prototyping loop is iterating ` +
    `(canonical ${PROTOTYPING_JSON_REL} has stopReason=null). ` +
    `Option-B forbids the prototyping certify gate from depending on /qfai-atdd or ` +
    `/qfai-implement validator outputs (justification: certify=${verifyRel}, ` +
    `profile=${scopeRaw}, contract=option-B phase-isolation clause).`;

  return [
    issue(
      "R-CERTIFY-VERIFY-CIRCULAR",
      message,
      "error",
      verifyRel,
      "reviewerGate.certifyVerifyCircular",
    ),
  ];
}

async function detectPromptScannerDrift(root: string): Promise<Issue[]> {
  const scannerAbs = path.join(root, SCANNER_REL);
  const promptAbs = path.join(root, PROMPT_REL);

  // Pair-sync check applies only when both files exist (consumer repos
  // installing the QFAI npm package will not have the source-side
  // scanner; in that case the contract cannot drift here).
  if (!(await exists(scannerAbs))) return [];
  if (!(await exists(promptAbs))) return [];

  const scannerText = await readSafe(scannerAbs);
  const promptText = await readSafe(promptAbs);

  const issues: Issue[] = [];
  for (const pair of PROMPT_SCANNER_PAIRS) {
    const inScanner = pair.scannerTokens.every((token) => scannerText.includes(token));
    const inPrompt = pair.promptTokens.every((token) => promptText.includes(token));

    if (inScanner === inPrompt) continue;

    const modifiedFile = inScanner ? SCANNER_REL : PROMPT_REL;
    const unpaired = inScanner ? PROMPT_REL : SCANNER_REL;
    const missingTokens = inScanner ? pair.promptTokens : pair.scannerTokens;

    const message =
      `R-PROMPT-SCANNER-DRIFT: SSOT-sync pair for clause "${pair.clause}" is asymmetric ` +
      `(justification: modified=${modifiedFile}, un-paired=${unpaired}, ` +
      `clause=${pair.clause} — missing tokens [${missingTokens.join(", ")}]).`;

    issues.push(
      issue(
        "R-PROMPT-SCANNER-DRIFT",
        message,
        "error",
        modifiedFile,
        "reviewerGate.promptScannerDrift",
      ),
    );
  }

  return issues;
}

/**
 * Detect drift across the discussion mock template ↔ QFAI-MOCK-010
 * validator SSOT-sync pair (Pair V). Fires R-MOCK-HREF-DRIFT (error)
 * when one side adopts the same-origin absolute `/path/` form without
 * the matching change on the other side.
 *
 * Like detectPromptScannerDrift, the check applies only when both
 * source files exist (consumer repos installing the QFAI npm package
 * lack the validator source, so the contract cannot drift there).
 *
 * Exported and invoked from the prototyping-profile validator set
 * (runPrototypingValidators), because the surface it guards — the mock
 * template + QFAI-MOCK-010 via validateHtmlMock — runs under the
 * prototyping (and full) profiles, not under sdd. The full profile runs
 * runPrototypingValidators exactly once, so coverage there stays single.
 */
export async function detectMockHrefDrift(root: string): Promise<Issue[]> {
  const templateAbs = path.join(root, MOCK_HREF_TEMPLATE_REL);
  const validatorAbs = path.join(root, MOCK_HREF_VALIDATOR_REL);

  if (!(await exists(templateAbs))) return [];
  if (!(await exists(validatorAbs))) return [];

  const templateText = await readSafe(templateAbs);
  const validatorText = await readSafe(validatorAbs);

  const issues: Issue[] = [];
  for (const pair of MOCK_HREF_PAIRS) {
    const templateDrifted = pair.templateDriftTokens.every((token) => templateText.includes(token));
    const validatorAccepts = pair.validatorAcceptTokens.every((token) =>
      validatorText.includes(token),
    );

    if (templateDrifted === validatorAccepts) continue;

    const modifiedFile = templateDrifted ? MOCK_HREF_TEMPLATE_REL : MOCK_HREF_VALIDATOR_REL;
    const unpaired = templateDrifted ? MOCK_HREF_VALIDATOR_REL : MOCK_HREF_TEMPLATE_REL;
    const missingTokens = templateDrifted ? pair.validatorAcceptTokens : pair.templateDriftTokens;

    const message =
      `R-MOCK-HREF-DRIFT: SSOT-sync pair for clause "${pair.clause}" is asymmetric ` +
      `(justification: modified=${modifiedFile}, un-paired=${unpaired}, ` +
      `clause=${pair.clause} — missing tokens [${missingTokens.join(", ")}]).`;

    issues.push(
      issue("R-MOCK-HREF-DRIFT", message, "error", modifiedFile, "reviewerGate.mockHrefDrift"),
    );
  }

  return issues;
}

/**
 * Composite Reviewer-Gate validator. Returns the union of the sdd-profile
 * Reviewer-Gate findings (R-CERTIFY-VERIFY-CIRCULAR +
 * R-PROMPT-SCANNER-DRIFT).
 *
 * R-MOCK-HREF-DRIFT is intentionally NOT part of this union: it guards a
 * prototyping-profile surface (the mock template + QFAI-MOCK-010) and is
 * invoked via detectMockHrefDrift from runPrototypingValidators instead.
 */
export async function validateReviewerGate(root: string, _config: QfaiConfig): Promise<Issue[]> {
  const [circular, drift] = await Promise.all([
    detectCertifyVerifyCircular(root),
    detectPromptScannerDrift(root),
  ]);
  return [...circular, ...drift];
}
