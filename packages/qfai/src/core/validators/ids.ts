import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { buildContractIndex } from "../contractIndex.js";
import { maskFencedCodeBlocks } from "../ids.js";
import { parseSpec } from "../parse/spec.js";
import { parseScenarioDocument } from "../scenarioModel.js";
import { collectSpecEntries } from "../specLayout.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

const SC_TAG_RE = /^SC-\d{4}-\d{4}$/;
const AC_ID_RE = /\bAC-[A-Za-z0-9_-]+\b/g;
const CASE_ID_RE = /\b(?:CASE|TC)-[A-Za-z0-9_-]+\b/g;
const CAP_DEF_RE = /^\s*\|\s*(CAP-\d{4})\s*\|/i;
const US_DEF_RE = /^\s*\|\s*(US-\d{4}-\d{4})\s*\|/i;
const AC_DEF_RE = /^\s*\|\s*(AC-\d{4}-\d{4})\s*\|/i;
const BR_DEF_RE = /^\s*\|\s*(BR-\d{4}-\d{4})\s*\|/i;
const CASE_DEF_RE = /^\s*\|\s*(CASE-\d{4}-\d{4})\s*\|/i;
/** A heading that declares a layered item: `## AC-0003-0003: Usable-Source Preflight Stop`. */
const HEADING_DEF_RE = /^#{2,6}[ \t]+((?:US|AC|BR|EX|TC)-\d{4}-\d{4})\b/;

export async function validateDefinedIds(root: string, config: QfaiConfig): Promise<Issue[]> {
  const issues: Issue[] = [];
  const specsRoot = resolvePath(root, config, "specsDir");
  const entries = await collectSpecEntries(specsRoot);

  const defined = new Map<string, Set<string>>();

  const visitedSharedCapabilities = new Set<string>();
  for (const entry of entries) {
    if (entry.layout === "layered") {
      if (!visitedSharedCapabilities.has(entry.capabilityPath)) {
        await collectLayeredSharedCapabilityIds(entry.capabilityPath, defined);
        visitedSharedCapabilities.add(entry.capabilityPath);
      }
      await collectLayeredDefinitionIds(entry.userStoriesPath, US_DEF_RE, defined);
      await collectLayeredDefinitionIds(entry.acceptanceCriteriaPath, AC_DEF_RE, defined);
      await collectLayeredDefinitionIds(entry.businessRulesPath, BR_DEF_RE, defined);
      await collectLayeredDefinitionIds(entry.testCasesPath, CASE_DEF_RE, defined);
      await collectScenarioDefinitionIds([entry.scenarioPath], defined);
      for (const file of [
        entry.userStoriesPath,
        entry.acceptanceCriteriaPath,
        entry.businessRulesPath,
        entry.examplesPath,
        entry.testCasesPath,
      ]) {
        const text = await readSafe(file);
        issues.push(...duplicateHeadingIds(file, text));
        for (const id of headingDefinedIds(text)) recordId(defined, id, file);
      }
      continue;
    }

    await collectSpecDefinitionIds([entry.specPath], defined);
    await collectCaseCatalogueDefinitionIds([entry.caseCataloguePath], defined);
    await collectScenarioDefinitionIds([entry.scenarioPath], defined);
  }

  const contractIndex = await buildContractIndex(root, config);
  for (const [id, files] of contractIndex.idToFiles.entries()) {
    for (const file of files) {
      recordId(defined, id, file);
    }
  }

  for (const [id, files] of defined.entries()) {
    if (files.size <= 1) {
      continue;
    }
    const sorted = Array.from(files).sort();
    issues.push(
      issue(
        "QFAI-ID-001",
        `ID が重複しています: ${id} (${formatFileList(sorted, root)})`,
        "error",
        sorted[0],
        "id.duplicate",
        undefined,
        "canonical",
        undefined,
        // `file` is only the lexicographically first definer. Every definer is
        // party to the duplicate, so `--spec` scoping must be able to see them
        // all — otherwise scoping to the later spec hides its own violation.
        { relatedFiles: sorted.slice(1) },
      ),
    );
  }

  return issues;
}

/**
 * One ID declared by two headings of the same file (`QFAI-ID-002`).
 *
 * `QFAI-ID-001` keys each ID on the set of files that define it, so a second
 * definition in the same file adds nothing and is never reported. Two headings
 * declaring one ID make every citation of it ambiguous, and a test case written
 * for the first heading then counts as coverage for the second as well.
 *
 * Only headings are compared. A pack routinely lists an item in a summary table
 * and defines it again under its own heading, which is one item stated twice,
 * not two.
 */
function duplicateHeadingIds(file: string, text: string): Issue[] {
  const firstHeading = new Map<string, { heading: string; line: number }>();
  const issues: Issue[] = [];
  const lines = maskFencedCodeBlocks(text).split("\n");
  for (const [index, line] of lines.entries()) {
    const id = HEADING_DEF_RE.exec(line)?.[1];
    if (!id) continue;
    const heading = line.replace(/^#{2,6}[ \t]+/, "").trim();
    const first = firstHeading.get(id);
    if (!first) {
      firstHeading.set(id, { heading, line: index + 1 });
      continue;
    }
    issues.push(
      issue(
        "QFAI-ID-002",
        `Two headings in one file declare ${id}: "${first.heading}" (line ${String(first.line)}) and "${heading}" (line ${String(index + 1)}).`,
        "error",
        file,
        "id.duplicateHeading",
        [id],
        "canonical",
        "Give each heading an ID of its own, and point every reference at the heading it means.",
        { loc: { line: index + 1 } },
      ),
    );
  }
  return issues;
}

/** Every layered ID a file declares by heading, fenced examples aside. */
function headingDefinedIds(text: string): Set<string> {
  const ids = new Set<string>();
  for (const line of maskFencedCodeBlocks(text).split("\n")) {
    const id = HEADING_DEF_RE.exec(line)?.[1];
    if (id) ids.add(id);
  }
  return ids;
}

async function collectLayeredSharedCapabilityIds(
  file: string,
  out: Map<string, Set<string>>,
): Promise<void> {
  const text = await readSafe(file);
  if (!text) {
    return;
  }
  for (const line of text.replace(/\r\n/g, "\n").split("\n")) {
    const matched = CAP_DEF_RE.exec(line)?.[1];
    if (!matched) {
      continue;
    }
    recordId(out, matched, file);
  }
}

async function collectLayeredDefinitionIds(
  file: string,
  definitionRe: RegExp,
  out: Map<string, Set<string>>,
): Promise<void> {
  const text = await readSafe(file);
  if (!text) {
    return;
  }
  for (const line of text.replace(/\r\n/g, "\n").split("\n")) {
    const matched = definitionRe.exec(line)?.[1];
    if (!matched) {
      continue;
    }
    recordId(out, matched, file);
  }
}

async function collectCaseCatalogueDefinitionIds(
  files: string[],
  out: Map<string, Set<string>>,
): Promise<void> {
  for (const file of files) {
    const text = await readSafe(file);
    if (!text) {
      continue;
    }
    const caseIds = text.match(CASE_ID_RE) ?? [];
    for (const id of caseIds) {
      recordId(out, id, file);
    }
  }
}

async function collectSpecDefinitionIds(
  files: string[],
  out: Map<string, Set<string>>,
): Promise<void> {
  for (const file of files) {
    const text = await readSafe(file);
    if (!text) {
      continue;
    }
    const parsed = parseSpec(text, file);
    if (parsed.specId) {
      recordId(out, parsed.specId, file);
    }
    parsed.brs.forEach((br) => recordId(out, br.id, file));
    const acIds = text.match(AC_ID_RE) ?? [];
    for (const id of acIds) {
      recordId(out, id, file);
    }
    const caseIds = text.match(CASE_ID_RE) ?? [];
    for (const id of caseIds) {
      recordId(out, id, file);
    }
  }
}

async function readSafe(file: string): Promise<string> {
  try {
    return await readFile(file, "utf-8");
  } catch {
    return "";
  }
}

async function collectScenarioDefinitionIds(
  files: string[],
  out: Map<string, Set<string>>,
): Promise<void> {
  for (const file of files) {
    const text = await readSafe(file);
    if (!text) {
      continue;
    }
    const { document, errors } = parseScenarioDocument(text, file);
    if (!document || errors.length > 0) {
      continue;
    }
    for (const scenario of document.scenarios) {
      for (const tag of scenario.tags) {
        if (SC_TAG_RE.test(tag)) {
          recordId(out, tag, file);
        }
      }
    }
  }
}

function recordId(out: Map<string, Set<string>>, id: string, file: string): void {
  const current = out.get(id) ?? new Set<string>();
  current.add(file);
  out.set(id, current);
}

function formatFileList(files: string[], root: string): string {
  return files
    .map((file) => {
      const relative = path.relative(root, file);
      return relative.length > 0 ? relative : file;
    })
    .join(", ");
}
