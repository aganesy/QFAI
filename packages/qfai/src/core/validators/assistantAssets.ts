import { access, readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { collectFiles } from "../fs.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

const DRIFT_PROTOCOL_MARKER = "[DRIFT-PROTOCOL:MANDATORY]";
const REVIEWER_GATE_HEADING_PATTERN = /^###\s+Reviewer Gate\b.*$/im;
const ANY_MARKDOWN_HEADING_PATTERN = /^\s*#{1,6}\s+/m;

export async function validateAssistantAssets(root: string, config: QfaiConfig): Promise<Issue[]> {
  const skillsDir = resolvePath(root, config, "skillsDir");
  const assistantDir = path.dirname(skillsDir);

  // Post-recut: drift-protocol.md is canonically located at
  // .qfai/assistant/constitution/drift-protocol.md. Fall back to the
  // legacy instructions/ path during the compatibility window so
  // projects that have not yet run `qfai init --upgrade-assistant-tree`
  // pass for now.
  const canonicalDriftProtocolPath = path.join(assistantDir, "constitution", "drift-protocol.md");
  const legacyDriftProtocolPath = path.join(assistantDir, "instructions", "drift-protocol.md");
  const driftProtocolPath = (await exists(canonicalDriftProtocolPath))
    ? canonicalDriftProtocolPath
    : legacyDriftProtocolPath;
  // Post-recut: test-layers.md is canonically located at
  // .qfai/assistant/catalog/test-layers.md. Fall back to the legacy
  // steering/ path during the compatibility window so projects that
  // have not yet run `qfai init --upgrade-assistant-tree` are not
  // double-penalized (D-DEPRECATED-PATH + QFAI-ASSETS-002).
  const canonicalTestLayersPath = path.join(assistantDir, "catalog", "test-layers.md");
  const legacyTestLayersPath = path.join(assistantDir, "steering", "test-layers.md");
  const testLayersPath = (await exists(canonicalTestLayersPath))
    ? canonicalTestLayersPath
    : legacyTestLayersPath;

  const issues: Issue[] = [];

  if (!(await exists(driftProtocolPath))) {
    issues.push(
      issue(
        "QFAI-ASSETS-001",
        "必須ファイル .qfai/assistant/constitution/drift-protocol.md (legacy fallback: .qfai/assistant/instructions/drift-protocol.md) が見つかりません。",
        "error",
        canonicalDriftProtocolPath,
        "assistantAssets.driftProtocol",
      ),
    );
  }

  if (!(await exists(testLayersPath))) {
    issues.push(
      issue(
        "QFAI-ASSETS-002",
        "必須ファイル .qfai/assistant/catalog/test-layers.md (legacy fallback: .qfai/assistant/steering/test-layers.md) が見つかりません。",
        "error",
        canonicalTestLayersPath,
        "assistantAssets.testLayers",
      ),
    );
  }

  const skillFiles = await collectSkillFiles([skillsDir]);
  for (const skillFile of skillFiles) {
    const content = await readFile(skillFile, "utf-8");

    if (!content.includes(DRIFT_PROTOCOL_MARKER)) {
      issues.push(
        issue(
          "QFAI-SKILLS-010",
          "SKILL.md に必須 marker [DRIFT-PROTOCOL:MANDATORY] がありません。",
          "error",
          skillFile,
          "skills.driftProtocolMarker",
        ),
      );
    }

    const reviewerGateSection = extractReviewerGateSection(content);
    if (reviewerGateSection === null) {
      issues.push(
        issue(
          "QFAI-SKILLS-011",
          "SKILL.md に `### Reviewer Gate` セクションがありません。",
          "error",
          skillFile,
          "skills.reviewerGate",
        ),
      );
      continue;
    }

    const missingTerms = collectMissingReviewerGateTerms(reviewerGateSection);
    if (missingTerms.length > 0) {
      issues.push(
        issue(
          "QFAI-SKILLS-012",
          `Reviewer Gate に Drift/test-layer 観点が不足しています（不足: ${missingTerms.join(", ")}）。`,
          "warning",
          skillFile,
          "skills.reviewerGatePolicy",
        ),
      );
    }
  }

  issues.push(...(await collectUnreachableReferences(skillsDir)));

  return issues;
}

/**
 * The inverse of the citation check: a reference nothing names is never read.
 *
 * Skills load by progressive disclosure — `SKILL.md` is the entry point and a
 * reference is opened only when a document already read names it. A file under
 * `references/` with no inbound citation from a reachable document therefore
 * ships to every consuming repository and is loaded in no run at all, which is
 * a property of the graph rather than a probability. Reported as `warning`:
 * the unread guidance is soft rule text, so nothing hard is being skipped.
 */
async function collectUnreachableReferences(skillsDir: string): Promise<Issue[]> {
  const documents = await readSkillDocuments(skillsDir);
  const reachable = collectReachableDocuments(documents);
  return [...documents.keys()]
    .filter((file) => isReferenceDocument(skillsDir, file) && !reachable.has(file))
    .sort((a, b) => a.localeCompare(b))
    .map((file) =>
      issue(
        "QFAI-SKILLS-013",
        "references/ 配下のファイルが SKILL.md から到達可能な文書のどこからも参照されていないため、読み込まれることがありません。必要な文書なら参照するステップから引用し、不要なら削除してください。",
        "warning",
        file,
        "skills.referenceReachability",
      ),
    );
}

/** Skill-tree documents that can cite or be cited, keyed by absolute path. */
async function readSkillDocuments(skillsDir: string): Promise<Map<string, string>> {
  const files = await collectFiles(skillsDir, { extensions: [".md", ".yaml", ".yml"] });
  const documents = new Map<string, string>();
  for (const file of files.sort((a, b) => a.localeCompare(b))) {
    try {
      documents.set(file, await readFile(file, "utf-8"));
    } catch {
      // An unreadable document cites nothing and is not the subject of this
      // check; the file-level validators above own reporting it.
      continue;
    }
  }
  return documents;
}

/** Breadth-first closure over "document A names document B's filename". */
function collectReachableDocuments(documents: Map<string, string>): Set<string> {
  const files = [...documents.keys()];
  const reachable = new Set(files.filter((file) => path.basename(file) === "SKILL.md"));
  const queue = [...reachable];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) {
      break;
    }
    const content = documents.get(current) ?? "";
    for (const file of files) {
      if (reachable.has(file) || !content.includes(path.basename(file))) {
        continue;
      }
      reachable.add(file);
      queue.push(file);
    }
  }
  return reachable;
}

function isReferenceDocument(skillsDir: string, file: string): boolean {
  const relative = path.relative(skillsDir, file).split(path.sep).join("/");
  return /^[^/]+\/references\//.test(relative);
}

async function collectSkillFiles(dirs: string[]): Promise<string[]> {
  const files = await Promise.all(dirs.map((dir) => collectFiles(dir)));
  return files
    .flat()
    .filter((filePath) => path.basename(filePath) === "SKILL.md")
    .sort((a, b) => a.localeCompare(b));
}

function extractReviewerGateSection(content: string): string | null {
  const headingMatch = REVIEWER_GATE_HEADING_PATTERN.exec(content);
  if (!headingMatch) {
    return null;
  }
  const headingStart = headingMatch.index;
  const headingText = headingMatch[0];
  const sectionStart = headingStart + headingText.length;
  const remainder = content.slice(sectionStart);
  const nextHeadingMatch = ANY_MARKDOWN_HEADING_PATTERN.exec(remainder);
  if (!nextHeadingMatch) {
    return remainder;
  }
  return remainder.slice(0, nextHeadingMatch.index);
}

function collectMissingReviewerGateTerms(section: string): string[] {
  const missing: string[] = [];
  if (!/drift protocol/i.test(section)) {
    missing.push("Drift Protocol");
  }
  if (!/test-layers\.md/i.test(section)) {
    missing.push("test-layers.md");
  }
  const hasSignalsPhrase = /\bnot gates?\b/i.test(section) || /\bsignals?\b/i.test(section);
  if (!hasSignalsPhrase) {
    missing.push("not gates/signals");
  }
  return missing;
}

async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}
