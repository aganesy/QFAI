/**
 * Doc vocabulary scan validator — spec-0037
 *
 * Scans documentation files for allowed/prohibited maturity terms
 * and detects contradictions across documents.
 *
 * BR-0037-0011, BR-0037-0012
 */
import path from "node:path";

import type { Issue } from "../../types.js";
import { readSafe } from "../utils.js";

const ALLOWED_TERMS = new Set(["complete", "foundation-only", "preview", "correction target"]);

const PROHIBITED_TERMS = new Set([
  "done",
  "finished",
  "deferred",
  "planned",
  "pending",
  "wip",
  "in progress",
  "todo",
  "tbd",
]);

export type VocabularyScanResult = {
  issues: Issue[];
  prohibitedFindings: Array<{ term: string; file: string; line: number }>;
  contradictions: Array<{
    subsystem: string;
    file1: string;
    term1: string;
    file2: string;
    term2: string;
  }>;
};

/**
 * Scan document content for prohibited maturity terms.
 */
export function scanProhibitedTerms(
  content: string,
  fileName: string,
): Array<{ term: string; file: string; line: number }> {
  const findings: Array<{ term: string; file: string; line: number }> = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const lower = line.toLowerCase();
    for (const term of PROHIBITED_TERMS) {
      // Match whole word
      const pattern = new RegExp(`\\b${term}\\b`, "i");
      if (pattern.test(lower)) {
        findings.push({ term, file: fileName, line: i + 1 });
      }
    }
  }

  return findings;
}

/**
 * Extract maturity terms from document content by subsystem.
 */
function extractMaturityTerms(
  content: string,
  fileName: string,
): Array<{ subsystem: string; term: string; file: string }> {
  const results: Array<{ subsystem: string; term: string; file: string }> = [];
  const lines = content.split("\n");
  let currentSubsystem = "";

  for (const line of lines) {
    // Track subsystem headings
    const headingMatch = /^#+\s+(.+)/.exec(line);
    if (headingMatch?.[1]) {
      currentSubsystem = headingMatch[1].trim().toLowerCase();
      continue;
    }

    // Look for maturity terms
    const lower = line.toLowerCase();
    for (const term of ALLOWED_TERMS) {
      if (lower.includes(term) && currentSubsystem) {
        results.push({ subsystem: currentSubsystem, term, file: fileName });
      }
    }
  }

  return results;
}

/**
 * Detect contradictions between documents.
 */
export function detectContradictions(
  docs: Array<{ fileName: string; content: string }>,
): Array<{ subsystem: string; file1: string; term1: string; file2: string; term2: string }> {
  const termsBySubsystem = new Map<string, Array<{ term: string; file: string }>>();

  for (const doc of docs) {
    const terms = extractMaturityTerms(doc.content, doc.fileName);
    for (const t of terms) {
      const existing = termsBySubsystem.get(t.subsystem) ?? [];
      existing.push({ term: t.term, file: t.file });
      termsBySubsystem.set(t.subsystem, existing);
    }
  }

  const contradictions: Array<{
    subsystem: string;
    file1: string;
    term1: string;
    file2: string;
    term2: string;
  }> = [];

  for (const [subsystem, terms] of termsBySubsystem) {
    const uniqueTerms = new Map<string, string>();
    for (const t of terms) {
      const existing = uniqueTerms.get(t.term);
      if (existing && existing !== t.file) continue;
      uniqueTerms.set(t.term, t.file);
    }

    const termEntries = [...uniqueTerms.entries()];
    for (let i = 0; i < termEntries.length; i++) {
      for (let j = i + 1; j < termEntries.length; j++) {
        const entry1 = termEntries[i];
        const entry2 = termEntries[j];
        if (!entry1 || !entry2) continue;
        const [term1, file1] = entry1;
        const [term2, file2] = entry2;
        if (term1 !== term2) {
          contradictions.push({ subsystem, file1, term1, file2, term2 });
        }
      }
    }
  }

  return contradictions;
}

/**
 * Run full vocabulary scan.
 */
export async function runVocabularyScan(
  root: string,
  fileNames: string[] = ["README.md", "CHANGELOG.md"],
): Promise<VocabularyScanResult> {
  const issues: Issue[] = [];
  const prohibitedFindings: Array<{ term: string; file: string; line: number }> = [];
  const docs: Array<{ fileName: string; content: string }> = [];

  for (const fileName of fileNames) {
    const content = await readSafe(path.join(root, fileName));
    if (!content) continue;

    docs.push({ fileName, content });
    const findings = scanProhibitedTerms(content, fileName);
    prohibitedFindings.push(...findings);
  }

  for (const finding of prohibitedFindings) {
    issues.push({
      code: "QFAI-DOC-VOCABULARY-PROHIBITED",
      severity: "error",
      category: "compatibility",
      message: `Prohibited maturity term "${finding.term}" found in ${finding.file} at line ${finding.line}`,
      file: finding.file,
      suggested_action: `Replace "${finding.term}" with an allowed term: ${[...ALLOWED_TERMS].join(", ")}`,
    });
  }

  const contradictions = detectContradictions(docs);
  for (const c of contradictions) {
    issues.push({
      code: "QFAI-DOC-VOCABULARY-CONTRADICTION",
      severity: "error",
      category: "compatibility",
      message: `Contradiction: subsystem "${c.subsystem}" has "${c.term1}" in ${c.file1} but "${c.term2}" in ${c.file2}`,
      file: `${c.file1}, ${c.file2}`,
      suggested_action:
        "Reconcile maturity terms across documents to use a single consistent term.",
    });
  }

  return { issues, prohibitedFindings, contradictions };
}
