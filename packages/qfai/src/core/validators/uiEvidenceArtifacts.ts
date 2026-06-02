import path from "node:path";

import { resolvePath, type QfaiConfig } from "../config.js";
import { readUiContractScreenContracts } from "../contracts/screenContracts.js";
import { collectFiles } from "../fs.js";
import type { Issue } from "../types.js";
import { exists, issue } from "./utils.js";

function resolveEvidenceRoot(root: string, config: QfaiConfig): string {
  return path.join(path.dirname(resolvePath(root, config, "specsDir")), "evidence");
}

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

async function hasEvidenceFile(
  prototypingRoot: string,
  canonicalPath: string,
  screenId: string,
  extension: ".html" | ".png",
): Promise<boolean> {
  if (await exists(canonicalPath)) {
    return true;
  }
  const files = await collectFiles(prototypingRoot, { extensions: [extension] });
  const expectedFileName = `${screenId}${extension}`;
  return files.some(
    (file) =>
      path.basename(file) === expectedFileName &&
      ITERATION_DIR_PATTERN.test(path.basename(path.dirname(file))),
  );
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

  const evidenceRoot = resolveEvidenceRoot(root, config);
  const prototypingRoot = path.join(evidenceRoot, "prototyping");
  const screenshotRoot = path.join(prototypingRoot, "screenshots");
  const htmlRoot = path.join(prototypingRoot, "html");

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

    const screenshotPath = path.join(screenshotRoot, `${screen.screenId}.png`);
    const htmlPath = path.join(htmlRoot, `${screen.screenId}.html`);

    if (!(await hasEvidenceFile(prototypingRoot, screenshotPath, screen.screenId, ".png"))) {
      const screenshotPattern = path.posix.join(
        toPosixRelative(root, screenshotRoot),
        "<screen-id>.png",
      );
      issues.push(
        issue(
          "QFAI-UIE-001",
          `Missing screenshot evidence for declared screen "${screen.screenId}".`,
          "error",
          toPosixRelative(root, screenshotPath),
          "uiEvidenceArtifacts.screenshotRequired",
          [screen.sourceRef],
          "canonical",
          `Generate \`${screenshotPattern}\` or \`${toPosixRelative(root, prototypingRoot)}/iter-NN/<screen-id>.png\` for every declared screen in \`${config.paths.contractsDir}/ui/*.yaml\` before rerunning validate.`,
        ),
      );
    }

    if (!(await hasEvidenceFile(prototypingRoot, htmlPath, screen.screenId, ".html"))) {
      const htmlPattern = path.posix.join(toPosixRelative(root, htmlRoot), "<screen-id>.html");
      issues.push(
        issue(
          "QFAI-UIE-002",
          `Missing HTML snapshot evidence for declared screen "${screen.screenId}".`,
          "error",
          toPosixRelative(root, htmlPath),
          "uiEvidenceArtifacts.htmlRequired",
          [screen.sourceRef],
          "canonical",
          `Generate \`${htmlPattern}\` or \`${toPosixRelative(root, prototypingRoot)}/iter-NN/<screen-id>.html\` for every declared screen in \`${config.paths.contractsDir}/ui/*.yaml\` before rerunning validate.`,
        ),
      );
    }
  }

  return issues;
}
