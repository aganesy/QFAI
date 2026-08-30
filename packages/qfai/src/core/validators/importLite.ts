import { stat } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { findPacks } from "../packLocator.js";
import { toRelativePath } from "../paths.js";
import {
  IMPORT_LITE_EVIDENCE_DIR_REL,
  findImportLiteEvidence,
} from "../preflight/importLiteEvidence.js";
import { collectSpecEntries } from "../specLayout.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

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
  if (await hasDiscussionPackReq(discussionRoot)) {
    return [];
  }

  if ((await findImportLiteEvidence(root)) !== null) {
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
        // The discussion root is configurable (`paths.discussionDir`), and the
        // check above inspects the configured one. Naming the default here sent
        // a relocated project to a path the validator never looks at, so
        // following the remedy left the warning standing. Evidence, by
        // contrast, is canonical by design — see IMPORT_LITE_EVIDENCE_DIR_REL.
        `- \`${toRelativePath(root, discussionRoot)}/discussion-*/06_REQ.md\` を用意する`,
        // `<ts>` alone sent an operator to `import-lite-draft.md`, which the
        // name check rejects: the hyphenated form has to carry the canonical
        // 17-digit stamp (`import-lite.md` without one is still accepted).
        `- \`${IMPORT_LITE_EVIDENCE_DIR_REL}/import-lite-<17桁timestamp>.md\` を生成する（\`generated_at\` は ISO8601 の実在日時。\`entrypoint: import-lite\` を埋め、\`Sources\` か user excerpt に実在の入力源を最低 1 件記録する。テンプレートのプレースホルダのままのファイルは入力源として扱われません）`,
      ].join("\n"),
    ),
  ];
}

/**
 * The input source must be a `06_REQ.md` sitting directly inside a discussion
 * pack directory. Matching on the basename anywhere under `discussionDir`
 * accepted a parked copy (`archive/06_REQ.md`) or a loose file at the
 * discussion root, both of which cleared the warning without the project
 * having the input source the catalogue asks for.
 *
 * Every directory `findPacks` recognises counts, canonical or not. This rule
 * asks whether the specs can be traced back to something, and a REQ index
 * inside a legacy (`discussion-NNNN`) or misnamed pack is such a thing — it is
 * an input source that has to be REPAIRED, which is what `QFAI-DPACK-005` /
 * `QFAI-DPACK-006` are for. Firing this warning as well would report "no input
 * source" about a project that has one, and its remedies (author a REQ,
 * write evidence) are not the rename those rules actually want.
 */
async function hasDiscussionPackReq(discussionRoot: string): Promise<boolean> {
  const packs = await findPacks(discussionRoot, "discussion");
  for (const pack of packs) {
    if (await isFile(path.join(pack.path, "06_REQ.md"))) {
      return true;
    }
  }
  return false;
}

async function isFile(filePath: string): Promise<boolean> {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    // ENOENT / EACCES: an unreadable candidate is not an input source.
    return false;
  }
}
