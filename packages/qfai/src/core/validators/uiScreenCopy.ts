/**
 * The words a UI contract screen says it shows.
 *
 * Each screen states its `supplements` (every displayed text beyond the title,
 * the group headings and the labels) and, optionally, its `structure` (the
 * groups it is read in, with the tasks each serves). Implementation reads them
 * before adding copy and surface review compares the rendered screen with them,
 * so a screen that leaves `supplements` out, writes either key in a shape
 * nobody reads, points at an id the screen does not declare, or shows one text
 * twice gives both nothing to compare against.
 *
 * `QFAI-CONTRACT-043` reports a key that is absent or malformed,
 * `QFAI-CONTRACT-044` a reference to an id the screen does not declare, and
 * `QFAI-CONTRACT-045` a text shown twice. The first two are errors and the
 * third a warning: an exact repeat can be intended. None judges wording; the
 * check on repetition is equality after case, spacing and closing punctuation
 * are set aside.
 */

import type { QfaiConfig } from "../config.js";
import { findUiScreenCopyFindings } from "../contracts/screenContracts.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

const RULE = "contracts.ui.screenCopy";

export async function validateUiScreenCopy(root: string, config: QfaiConfig): Promise<Issue[]> {
  const findings = await findUiScreenCopyFindings(root, config.paths.contractsDir);
  return findings.map((finding) => {
    const where = `\`screens[${String(finding.index)}]\` in ${finding.file}`;
    const message = `Screen \`${finding.screenId}\` (${where}): ${finding.message}`;
    const { severity, file, remedy } = finding;
    const refs = [finding.screenId];
    switch (finding.kind) {
      case "shape":
        return issue("QFAI-CONTRACT-043", message, severity, file, RULE, refs, "canonical", remedy);
      case "reference":
        return issue("QFAI-CONTRACT-044", message, severity, file, RULE, refs, "canonical", remedy);
      case "repeat":
        return issue("QFAI-CONTRACT-045", message, severity, file, RULE, refs, "canonical", remedy);
    }
  });
}
