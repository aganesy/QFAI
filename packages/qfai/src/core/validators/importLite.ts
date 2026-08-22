import { stat } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { findPacks } from "../packLocator.js";
import { findImportLiteEvidence } from "../preflight/importLiteEvidence.js";
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
        "- `.qfai/discussion/discussion-*/06_REQ.md` を用意する",
        "- `.qfai/evidence/import-lite-<ts>.md` を生成する",
      ].join("\n"),
    ),
  ];
}

/**
 * The catalogue requires the REQ index at `discussion-<ts>/06_REQ.md`, so the
 * input source must be a `06_REQ.md` sitting directly inside a discussion pack
 * directory. Matching on the basename anywhere under `discussionDir`
 * accepted a parked copy (`archive/06_REQ.md`) or a loose file at the
 * discussion root, both of which cleared the warning without the project
 * having the input source the catalogue asks for.
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
