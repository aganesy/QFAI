import path from "node:path";

import type { Issue } from "../types.js";
import { exists, issue, readSafe } from "./utils.js";
import {
  MOCK_HREF_PAIRS,
  MOCK_HREF_TEMPLATE_REL,
  MOCK_HREF_VALIDATOR_REL,
} from "./mockHrefPairs.js";

/**
 * Detect drift across the discussion mock template ↔ QFAI-MOCK-010
 * validator SSOT-sync pair (Pair V). Fires QFAI-MOCKHREF-001 (error)
 * when one side adopts the same-origin absolute `/path/` form without
 * the matching change on the other side.
 *
 * The check applies only when both
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
      `QFAI-MOCKHREF-001: SSOT-sync pair for clause "${pair.clause}" is asymmetric ` +
      `(justification: modified=${modifiedFile}, un-paired=${unpaired}, ` +
      `clause=${pair.clause} — missing tokens [${missingTokens.join(", ")}]).`;

    issues.push(
      issue("QFAI-MOCKHREF-001", message, "error", modifiedFile, "reviewerGate.mockHrefDrift"),
    );
  }

  return issues;
}
