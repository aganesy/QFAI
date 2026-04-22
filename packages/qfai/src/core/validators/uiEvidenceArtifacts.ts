import path from "node:path";

import { resolvePath, type QfaiConfig } from "../config.js";
import { readUiContractScreenContracts } from "../contracts/screenContracts.js";
import type { Issue } from "../types.js";
import { exists, issue } from "./utils.js";

function resolveEvidenceRoot(root: string, config: QfaiConfig): string {
  return path.join(path.dirname(resolvePath(root, config, "specsDir")), "evidence");
}

const SAFE_SCREEN_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;

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
  const screenshotRoot = path.join(evidenceRoot, "prototyping", "screenshots");
  const htmlRoot = path.join(evidenceRoot, "prototyping", "html");

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
          "Use a screen id containing only letters, numbers, dot, underscore, and hyphen.",
        ),
      );
      continue;
    }

    const screenshotPath = path.join(screenshotRoot, `${screen.screenId}.png`);
    const htmlPath = path.join(htmlRoot, `${screen.screenId}.html`);

    if (!(await exists(screenshotPath))) {
      issues.push(
        issue(
          "QFAI-UIE-001",
          `Missing screenshot evidence for declared screen "${screen.screenId}".`,
          "error",
          path.relative(root, screenshotPath).replace(/\\/g, "/"),
          "uiEvidenceArtifacts.screenshotRequired",
          [screen.sourceRef],
          "canonical",
          "Generate `.qfai/evidence/prototyping/screenshots/<screen-id>.png` for every declared screen in `.qfai/contracts/ui/*.yaml` before rerunning validate.",
        ),
      );
    }

    if (!(await exists(htmlPath))) {
      issues.push(
        issue(
          "QFAI-UIE-002",
          `Missing HTML snapshot evidence for declared screen "${screen.screenId}".`,
          "error",
          path.relative(root, htmlPath).replace(/\\/g, "/"),
          "uiEvidenceArtifacts.htmlRequired",
          [screen.sourceRef],
          "canonical",
          "Generate `.qfai/evidence/prototyping/html/<screen-id>.html` for every declared screen in `.qfai/contracts/ui/*.yaml` before rerunning validate.",
        ),
      );
    }
  }

  return issues;
}
