import { readdir } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { readUiContractScreenContracts } from "../contracts/screenContracts.js";
import { PROTOTYPING_EVIDENCE_REL } from "../prototyping/paths.js";
import type { Issue } from "../types.js";
import { exists, issue } from "./utils.js";

function toPosixRelative(root: string, targetPath: string): string {
  return path.relative(root, targetPath).replace(/\\/g, "/");
}

/**
 * Canonical safe-screen-id pattern. Exported so the
 * `--emit-skeletons` write boundary in
 * `core/prototyping/emitSkeletons.ts` can consume the SAME regex
 * literal — eliminating the "writer accepts a screenId the
 * validator rejects (or vice versa)" drift class.
 *
 * Allowed: leading char `[A-Za-z0-9]`; subsequent chars
 * `[A-Za-z0-9._-]`. Rejects path separators (`/`, `\`, `:`),
 * leading dot/underscore/hyphen, and any other non-ASCII-safe
 * input. See `emitSkeletons.ts` for the write-boundary guard
 * and `prototypingCertify.ts` for the certify-time validation.
 */
export const SAFE_SCREEN_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const ITERATION_DIR_PATTERN = /^iter-\d{2}$/u;

/**
 * Evidence is the file a capture pass writes into an `iter-NN` directory at the
 * top of the prototyping root. The aggregate `screenshots/` and `html/` copies
 * are a handoff output, and a copy in a nested `iter-NN` directory is one a
 * cycle-0 reset does not clear, so neither counts.
 */
async function hasEvidenceFile(prototypingRoot: string, fileName: string): Promise<boolean> {
  let entries: string[];
  try {
    entries = await readdir(prototypingRoot);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return false;
    throw error;
  }
  for (const entry of entries) {
    if (!ITERATION_DIR_PATTERN.test(entry)) continue;
    if (await exists(path.join(prototypingRoot, entry, fileName))) return true;
  }
  return false;
}

export async function validateUiEvidenceArtifacts(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const issues: Issue[] = [];
  const screens = await readUiContractScreenContracts(root, config.paths.contractsDir);

  if (screens.length === 0) {
    return issues;
  }

  // Where `qfai prototyping iterate` writes the captures, whatever
  // `paths.specsDir` says: read beside a moved specs directory, the check found
  // none of them.
  const prototypingRoot = path.join(root, PROTOTYPING_EVIDENCE_REL);
  const iterationRoot = `${toPosixRelative(root, prototypingRoot)}/iter-NN`;

  for (const screen of screens) {
    if (!SAFE_SCREEN_ID_PATTERN.test(screen.screenId)) {
      issues.push(
        issue(
          "QFAI-UIE-003",
          `Declared screen "${screen.screenId}" cannot be used as an evidence file name.`,
          "error",
          screen.sourceRef,
          "uiEvidenceArtifacts.screenIdSafeFilename",
          [screen.sourceRef],
          "canonical",
          "Use a screen id whose first character is a letter or digit and remaining characters are letters, numbers, dot, underscore, or hyphen.",
        ),
      );
      continue;
    }

    if (!(await hasEvidenceFile(prototypingRoot, `${screen.screenId}.png`))) {
      issues.push(
        issue(
          "QFAI-UIE-001",
          `Missing screenshot evidence for declared screen "${screen.screenId}".`,
          "error",
          `${iterationRoot}/${screen.screenId}.png`,
          "uiEvidenceArtifacts.screenshotRequired",
          [screen.sourceRef],
          "canonical",
          `Capture \`${iterationRoot}/<screen-id>.png\` with \`qfai prototyping iterate --capture\` for every declared screen in \`${config.paths.contractsDir}/ui/*.yaml\` before rerunning validate.`,
        ),
      );
    }

    if (!(await hasEvidenceFile(prototypingRoot, `${screen.screenId}.html`))) {
      issues.push(
        issue(
          "QFAI-UIE-002",
          `Missing HTML snapshot evidence for declared screen "${screen.screenId}".`,
          "error",
          `${iterationRoot}/${screen.screenId}.html`,
          "uiEvidenceArtifacts.htmlRequired",
          [screen.sourceRef],
          "canonical",
          `Capture \`${iterationRoot}/<screen-id>.html\` with \`qfai prototyping iterate --capture\` for every declared screen in \`${config.paths.contractsDir}/ui/*.yaml\` before rerunning validate.`,
        ),
      );
    }
  }

  return issues;
}
