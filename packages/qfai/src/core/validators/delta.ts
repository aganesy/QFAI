import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { collectSpecPackDirs } from "../discovery.js";
import { extractH2Sections, type H2Section } from "../parse/markdown.js";
import type { Issue } from "../types.js";
import { isMissingFileError, issue } from "./utils.js";

export async function validateDeltas(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const specsRoot = resolvePath(root, config, "specsDir");
  const packs = await collectSpecPackDirs(specsRoot);
  if (packs.length === 0) {
    return [];
  }

  const issues: Issue[] = [];
  for (const pack of packs) {
    const deltaPath = path.join(pack, "delta.md");
    let text: string;
    try {
      text = await readFile(deltaPath, "utf-8");
    } catch (error) {
      if (isMissingFileError(error)) {
        issues.push(
          issue(
            "QFAI-DELTA-001",
            "delta.md が見つかりません。",
            "error",
            deltaPath,
            "delta.exists",
            undefined,
            "change",
            "spec-xxxx/delta.md を作成してください（テンプレは init 生成物を参照してください）。",
          ),
        );
        continue;
      }
      throw error;
    }

    const sections = extractH2Sections(text);
    const changeLog = findSection(sections, "change log");
    if (!changeLog) {
      issues.push(
        issue(
          "QFAI-DELTA-002",
          "delta.md に ## Change Log が見つかりません。",
          "error",
          deltaPath,
          "delta.changeLog",
          undefined,
          "change",
          "Change Log を追加してください。",
        ),
      );
    }

    const decisionRecords = findSection(sections, "decision records");
    if (!decisionRecords) {
      issues.push(
        issue(
          "QFAI-DELTA-003",
          "delta.md に ## Decision Records が見つかりません。",
          "error",
          deltaPath,
          "delta.decisionRecords",
          undefined,
          "change",
          "Decision Records を追加してください。",
        ),
      );
    } else {
      const hasRejected = /^\s*(?:[-*]\s*)?rejected\s*:/im.test(
        decisionRecords.body,
      );
      if (!hasRejected) {
        issues.push(
          issue(
            "QFAI-DELTA-101",
            "Decision Records に rejected が見つかりません。",
            "warning",
            deltaPath,
            "delta.rejected",
            undefined,
            "change",
            "rejected を最低1件記載してください。",
          ),
        );
      }
    }

    if (changeLog && decisionRecords) {
      if (changeLog.startLine > decisionRecords.startLine) {
        issues.push(
          issue(
            "QFAI-DELTA-004",
            "Change Log は Decision Records の前に配置してください。",
            "error",
            deltaPath,
            "delta.sectionOrder",
            undefined,
            "change",
            "Change Log を Decision Records より前に移動してください。",
          ),
        );
      }
    }
  }

  return issues;
}

function findSection(
  sections: Map<string, H2Section>,
  title: string,
): H2Section | null {
  const target = title.trim().toLowerCase();
  for (const section of sections.values()) {
    if (section.title.trim().toLowerCase() === target) {
      return section;
    }
  }
  return null;
}
