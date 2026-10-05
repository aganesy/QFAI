import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import {
  inspectLatestDiscussionPack,
  REQUIRED_DISCUSSION_PACK_SECTIONS,
} from "../discussionPack.js";
import { isStoryTreeProject } from "../storyTree/layout.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

export async function validateDiscussionPackReadiness(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const discussionRoot = resolvePath(root, config, "discussionDir");
  const readiness = await inspectLatestDiscussionPack(discussionRoot);
  const issues: Issue[] = [];

  if (readiness.dangerousPackNames.length > 0) {
    issues.push(
      issue(
        "QFAI-DPACK-005",
        `Invalid discussion-* directory names under discussion: ${readiness.dangerousPackNames.join(", ")}`,
        "error",
        discussionRoot,
        "discussionPack.naming",
        readiness.dangerousPackNames,
        "change",
        [
          "Only the current canonical naming (`discussion-YYYYMMDDhhmmssSSS/`) is supported. Delete or rename the invalid directories.",
          "Only canonical naming is supported. Remove or rename the non-canonical discussion directory.",
        ].join("\n"),
      ),
    );
  }

  if (readiness.legacyPackNames.length > 0) {
    issues.push(
      issue(
        "QFAI-DPACK-006",
        `current canonical discussion-pack naming does not allow sequential pack directories: ${readiness.legacyPackNames.join(", ")}`,
        "warning",
        discussionRoot,
        "discussionPack.legacy",
        readiness.legacyPackNames,
        "change",
        [
          "Only the current canonical layout is supported. Delete or rename the invalid directories.",
          "Only canonical layout is supported. Remove or rename the non-canonical discussion directory.",
        ].join("\n"),
      ),
    );
  }

  if (!readiness.latestPackDir || !readiness.latestPackName) {
    // On the story tree a discussion pack is optional: SDD may start from an
    // explicit user requirement, and its own preflight stops when no usable
    // source exists. A pack of any other name still gets QFAI-DPACK-001 below,
    // beside DPACK-005 or DPACK-006.
    if (
      readiness.dangerousPackNames.length === 0 &&
      readiness.legacyPackNames.length === 0 &&
      (await isStoryTreeProject(root, config))
    ) {
      return issues;
    }
    issues.push(
      issue(
        "QFAI-DPACK-001",
        "No discussion-pack was found. Create `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/`.",
        "error",
        discussionRoot,
        "discussionPack.presence",
        undefined,
        "change",
        [
          "Do the following:",
          "- Run `/qfai-discussion` to generate the latest discussion-pack",
          "- Rerun `qfai validate` after it is generated",
        ].join("\n"),
      ),
    );
    return issues;
  }

  if (readiness.missingFiles.length > 0 || readiness.missingSideArtifacts.length > 0) {
    const allMissing = [...readiness.missingFiles, ...readiness.missingSideArtifacts];
    if (allMissing.length > 0) {
      issues.push(
        issue(
          "QFAI-DPACK-002",
          `Required discussion-pack files are missing: ${allMissing.join(", ")}`,
          "error",
          readiness.latestPackDir,
          "discussionPack.requiredFiles",
          allMissing,
          "change",
          `Create the missing files: ${allMissing.join(", ")}.`,
        ),
      );
    }
  }

  if (readiness.incompleteFiles.length > 0) {
    issues.push(
      issue(
        "QFAI-DPACK-003",
        `The discussion-pack content is insufficient: ${readiness.incompleteFiles.join(", ")}`,
        "error",
        readiness.latestPackDir,
        "discussionPack.minimumContent",
        readiness.incompleteFiles,
        "change",
        [
          "Make each file meet the minimum content:",
          "- At least 100 characters",
          "- Body text, not just headings",
          "- Do not end with only `TBD` / `TODO` / `(placeholder)`",
          ...Object.entries(REQUIRED_DISCUSSION_PACK_SECTIONS).map(
            ([file, sections]) =>
              `- \`${file}\` holds ${sections.map((section) => `\`## ${section}\``).join(", ")}`,
          ),
        ].join("\n"),
      ),
    );
  }

  for (const { legacy, target, move } of readiness.unmigratedFiles) {
    issues.push(
      issue(
        "QFAI-DPACK-003",
        `${legacy} still holds content that ${target} now carries`,
        "error",
        path.join(readiness.latestPackDir, legacy),
        "discussionPack.unmigratedFile",
        [legacy, target],
        "change",
        [
          `Move the content of ${legacy} into ${target}. ${move}`,
          `Then delete ${legacy} and replace its name wherever the pack still cites it. Packs other than the latest are not checked; see \`.qfai/assistant/skill/qfai-discussion/references/discussion-artifact-rules.md\`.`,
        ].join("\n"),
      ),
    );
  }

  if (readiness.blockingOqIds.length > 0) {
    const oqPath = path.join(readiness.latestPackDir, "11_OQ-Register.md");
    issues.push(
      issue(
        "QFAI-DPACK-004",
        `Blocking OQs remain (Disposition: open): ${readiness.blockingOqIds.join(", ")}`,
        "error",
        oqPath,
        "discussionPack.blockingOq",
        readiness.blockingOqIds,
        "change",
        "Update the matching OQ in 11_OQ-Register.md to one of `Disposition: deferred`, `resolved` or `rejected`.",
      ),
    );
  }

  if (readiness.incompleteDeferredOqIds.length > 0) {
    const oqPath = path.join(readiness.latestPackDir, "11_OQ-Register.md");
    issues.push(
      issue(
        "QFAI-DPACK-007",
        `Deferred OQs in 11_OQ-Register.md lack a Resolution or a Next-Decision-Point: ${readiness.incompleteDeferredOqIds.join(", ")}`,
        "error",
        oqPath,
        "discussionPack.deferredDetails",
        readiness.incompleteDeferredOqIds,
        "change",
        "For each deferred OQ, write in `Resolution` what is decided now, and in `Next-Decision-Point` the next point at which it is decided.",
      ),
    );
  }

  // Check 03_Story-Workshop.md for Mermaid diagram presence
  const storyWorkshopPath = path.join(readiness.latestPackDir, "03_Story-Workshop.md");
  const storyWorkshopText = await readSafe(storyWorkshopPath);
  if (storyWorkshopText !== null && !containsMermaidBlock(storyWorkshopText)) {
    issues.push(
      issue(
        "QFAI-DPACK-008",
        "No Mermaid diagram was found in 03_Story-Workshop.md.",
        "error",
        storyWorkshopPath,
        "discussionPack.storyWorkshopMermaid",
        undefined,
        "change",
        "Include at least one mermaid fenced block (flowchart or sequenceDiagram) in 03_Story-Workshop.md.",
      ),
    );
  }

  return issues;
}

/**
 * Whether `text` carries a mermaid fenced block.
 *
 * Exported because the `/qfai-sdd` Stage 0 preflight has to reach the same
 * verdict `QFAI-DPACK-008` reaches: `validate --profile sdd` does not run this
 * validator, so a second reading of "has a diagram" would let a pack the
 * discussion profile rejects clear Stage 0.
 */
export function containsMermaidBlock(text: string): boolean {
  // Match backtick (3+) or tilde (3+) fences with mermaid info-string,
  // aligned with MERMAID_START_RE in discussMermaid.ts.
  return /^\s*(?:`{3,}|~{3,})\s*mermaid\b/im.test(text);
}

async function readSafe(filePath: string): Promise<string | null> {
  try {
    const stats = await stat(filePath);
    if (!stats.isFile()) {
      return null;
    }
    return await readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}
