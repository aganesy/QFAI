import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { collectSpecPackDirs } from "../discovery.js";
import {
  extractH2Sections,
  parseHeadings,
  type H2Section,
} from "../parse/markdown.js";
import type { Issue } from "../types.js";
import { isMissingFileError, issue } from "./utils.js";

const CHANGE_TYPE_PRIMARY_RE =
  /^\s*[-*]?\s*change_type_primary\s*:\s*(.+)\s*$/im;
const CHANGE_TYPE_TAGS_RE = /^\s*[-*]?\s*change_type_tags\s*:\s*(.*)\s*$/im;
const DO_NOT_RE = /^\s*[-*]?\s*do_not\s*:/im;
const TEMPTATION_RE = /^\s*[-*]?\s*temptation\s*:/im;
const ALLOWED_CHANGE_TYPE_PRIMARY = new Set([
  "initial",
  "behavior",
  "structural",
  "ops",
]);
const ALLOWED_CHANGE_TYPE_TAGS = new Set([
  "@ui",
  "@api",
  "@db",
  "@nfr",
  "@docs",
  "@test",
]);

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
      const rejectedBlocks = extractRejectedBlocks(decisionRecords.body);
      if (rejectedBlocks.length === 0) {
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
      } else {
        const hasDoNot = rejectedBlocks.some((block) => DO_NOT_RE.test(block));
        const hasTemptation = rejectedBlocks.some((block) =>
          TEMPTATION_RE.test(block),
        );
        if (!hasDoNot || !hasTemptation) {
          const missing: string[] = [];
          if (!hasDoNot) missing.push("do_not");
          if (!hasTemptation) missing.push("temptation");
          issues.push(
            issue(
              "QFAI-DELTA-204",
              `Decision Records に ${missing.join(" / ")} が見つかりません。`,
              "warning",
              deltaPath,
              "delta.rejectedDetails",
              undefined,
              "change",
              "rejected には do_not / temptation を最低1件含めてください。",
            ),
          );
        }
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

    if (changeLog) {
      const blocks = extractChangeLogBlocks(text, changeLog);
      for (const block of blocks) {
        const primary = extractChangeTypePrimary(block);
        if (!primary) {
          issues.push(
            issue(
              "QFAI-DELTA-201",
              "Change Log の CL ブロックに change_type_primary が見つかりません。",
              "warning",
              deltaPath,
              "delta.changeTypePrimary",
              undefined,
              "change",
              "change_type_primary を追加してください。",
            ),
          );
        } else if (!isAllowedChangeTypePrimary(primary)) {
          issues.push(
            issue(
              "QFAI-DELTA-202",
              `change_type_primary が不正です: ${primary}`,
              "warning",
              deltaPath,
              "delta.changeTypePrimary",
              undefined,
              "change",
              "change_type_primary は Initial | Behavior | Structural | Ops を指定してください。",
            ),
          );
        }

        const invalidTags = extractInvalidChangeTypeTags(block);
        if (invalidTags && invalidTags.length > 0) {
          issues.push(
            issue(
              "QFAI-DELTA-203",
              `change_type_tags に無効なタグがあります: ${invalidTags.join(", ")}`,
              "warning",
              deltaPath,
              "delta.changeTypeTags",
              undefined,
              "change",
              "change_type_tags は @ui @api @db @nfr @docs @test のみ指定してください。",
            ),
          );
        }
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

function extractChangeLogBlocks(text: string, changeLog: H2Section): string[] {
  const lines = text.split(/\r?\n/);
  const headings = parseHeadings(text).filter(
    (heading) =>
      heading.level === 3 &&
      heading.line >= changeLog.startLine &&
      heading.line <= changeLog.endLine,
  );

  if (headings.length === 0) {
    return [changeLog.body];
  }

  const blocks: string[] = [];
  for (let i = 0; i < headings.length; i += 1) {
    const current = headings[i];
    if (!current) continue;
    const next = headings[i + 1];
    const startLine = current.line + 1;
    const endLine = Math.min(
      changeLog.endLine,
      (next?.line ?? changeLog.endLine + 1) - 1,
    );
    if (startLine > endLine) {
      blocks.push("");
      continue;
    }
    blocks.push(lines.slice(startLine - 1, endLine).join("\n"));
  }

  return blocks;
}

function extractChangeTypePrimary(block: string): string | null {
  const match = block.match(CHANGE_TYPE_PRIMARY_RE);
  const value = match?.[1]?.trim() ?? "";
  return value.length > 0 ? value : null;
}

function extractRejectedBlocks(sectionBody: string): string[] {
  const lines = sectionBody.split(/\r?\n/);
  const blocks: string[] = [];
  let currentIndent: number | null = null;
  let buffer: string[] = [];

  const flush = (): void => {
    if (currentIndent === null) {
      return;
    }
    blocks.push(buffer.join("\n"));
    buffer = [];
    currentIndent = null;
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    const match = line.match(/^(\s*)(?:[-*]\s*)?rejected\s*:(.*)$/i);
    if (match) {
      flush();
      const inlineValue = (match[2] ?? "").trim();
      if (inlineValue.length > 0) {
        blocks.push(inlineValue);
        currentIndent = null;
      } else {
        currentIndent = (match[1] ?? "").length;
      }
      continue;
    }
    if (currentIndent === null) {
      continue;
    }
    const indentMatch = line.match(/^(\s*)/);
    const indent = (indentMatch?.[1] ?? "").length;
    if (line.trim().length > 0 && indent <= currentIndent) {
      flush();
      i -= 1;
      continue;
    }
    buffer.push(line);
  }

  flush();
  return blocks;
}

function extractInvalidChangeTypeTags(block: string): string[] | null {
  const match = block.match(CHANGE_TYPE_TAGS_RE);
  if (!match) {
    return null;
  }
  const raw = match[1]?.trim() ?? "";
  if (raw.length === 0) {
    return [];
  }
  const tags = raw
    .split(/[\s,]+/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
  const invalid = tags.filter((tag) => !isAllowedChangeTypeTag(tag));
  return invalid;
}

function isAllowedChangeTypePrimary(value: string): boolean {
  return ALLOWED_CHANGE_TYPE_PRIMARY.has(value.trim().toLowerCase());
}

function isAllowedChangeTypeTag(value: string): boolean {
  return ALLOWED_CHANGE_TYPE_TAGS.has(value.trim().toLowerCase());
}
