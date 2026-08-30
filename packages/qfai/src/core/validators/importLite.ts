import { readdir } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { collectFiles } from "../fs.js";
import { collectSpecEntries } from "../specLayout.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

/**
 * `import-lite-<YYYYMMDDTHHmmss>[-<n>].md`, and nothing looser.
 *
 * The run stamp is the whole point of the name: the shipped procedure derives
 * it from the wall clock and appends `-<n>` only to break a same-second
 * collision. A `.*` tail also accepted `import-lite-.md` and the literal
 * `import-lite-<ts>.md` — an unreplaced placeholder — either of which silences
 * `QFAI-IMPLITE-001` while recording no run at all.
 */
const IMPORT_LITE_EVIDENCE_RE = /^import-lite-\d{8}T\d{6}(?:-\d+)?\.md$/i;

/**
 * True when the project carries an import-lite evidence file — the input
 * source a spec set built with no discussion pack is allowed to have.
 *
 * Shared with `validateDiscussionPackReadiness`, which must not report a
 * missing pack on that route: the shipped `qfai init` CI runs
 * `--profile full --fail-on error`, so a `QFAI-DPACK-001` there fails the
 * build of every imported spec set the documented route produces.
 */
export async function hasImportLiteEvidence(root: string, config: QfaiConfig): Promise<boolean> {
  const discussionRoot = resolvePath(root, config, "discussionDir");
  return existsImportLiteEvidence(path.join(path.dirname(discussionRoot), "evidence"));
}

export async function validateImportLiteEvidencePresence(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const specsRoot = resolvePath(root, config, "specsDir");
  const specEntries = await collectSpecEntries(specsRoot);
  if (specEntries.length === 0) {
    return [];
  }

  const discussionRoot = resolvePath(root, config, "discussionDir");
  const discussionFiles = await collectFiles(discussionRoot, {
    extensions: [".md"],
  });
  const hasDiscussionIndex = discussionFiles.some(
    (filePath) => path.basename(filePath).toLowerCase() === "06_req.md",
  );
  if (hasDiscussionIndex) {
    return [];
  }

  if (await hasImportLiteEvidence(root, config)) {
    return [];
  }

  return [
    issue(
      "QFAI-IMPLITE-001",
      "specs が存在しますが、入力源（discussion pack REQ / import-lite evidence）が見つかりません。",
      "warning",
      specsRoot,
      "preflight.inputSource",
      undefined,
      "change",
      [
        "次のいずれかを実施してください:",
        "- `.qfai/discussion/discussion-*/06_REQ.md` を用意する",
        "- `.qfai/evidence/import-lite-<YYYYMMDDTHHmmss>.md` を生成する",
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
