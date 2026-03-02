import { readdir } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { collectFiles } from "../fs.js";
import { collectSpecEntries } from "../specLayout.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

const IMPORT_LITE_EVIDENCE_RE = /^import-lite-.*\.md$/i;

export async function validateImportLiteEvidencePresence(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const specsRoot = resolvePath(root, config, "specsDir");
  const specEntries = await collectSpecEntries(specsRoot);
  if (specEntries.length === 0) {
    return [];
  }

  const requireRoot = resolvePath(root, config, "requireDir");
  const requireFiles = await collectFiles(requireRoot, {
    extensions: [".md"],
  });
  const hasRequireIndex = requireFiles.some(
    (filePath) => path.basename(filePath).toLowerCase() === "02_requirement-index.md",
  );
  if (hasRequireIndex) {
    return [];
  }

  const evidenceRoot = path.join(path.dirname(requireRoot), "evidence");
  const hasImportLiteEvidence = await existsImportLiteEvidence(evidenceRoot);
  if (hasImportLiteEvidence) {
    return [];
  }

  return [
    issue(
      "QFAI-IMPLITE-001",
      "specs が存在しますが、入力源（require index / import-lite evidence）が見つかりません。",
      "warning",
      specsRoot,
      "preflight.inputSource",
      undefined,
      "change",
      [
        "次のいずれかを実施してください:",
        "- `.qfai/require/require-*/02_requirement-index.md` を用意する",
        "- `.qfai/evidence/import-lite-<ts>.md` を生成する",
      ].join("\n"),
    ),
  ];
}

async function existsImportLiteEvidence(evidenceRoot: string): Promise<boolean> {
  try {
    const entries = await readdir(evidenceRoot, { withFileTypes: true });
    return entries.some(
      (entry) => entry.isFile() && IMPORT_LITE_EVIDENCE_RE.test(entry.name.trim()),
    );
  } catch {
    return false;
  }
}
