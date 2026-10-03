/**
 * Reviewer-Gate validator for R-PROMPT-SCANNER-DRIFT: emitted when the
 * designMdViolations.ts ↔ generator-prompt.md SSOT-sync pair drifts (a
 * contract clause is present in one side but absent from the other).
 */
import path from "node:path";

import type { QfaiConfig } from "../config.js";
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
  "packages/qfai/assets/init/.qfai/assistant/skill/qfai-prototyping/references/generator-prompt.md";

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
 * The sdd-profile Reviewer-Gate finding (R-PROMPT-SCANNER-DRIFT).
 *
 * R-MOCK-HREF-DRIFT is intentionally NOT part of it: it guards a
 * prototyping-profile surface (the mock template + QFAI-MOCK-010) and is
 * invoked via detectMockHrefDrift from runPrototypingValidators instead.
 */
export async function validateReviewerGate(root: string, _config: QfaiConfig): Promise<Issue[]> {
  return detectPromptScannerDrift(root);
}
