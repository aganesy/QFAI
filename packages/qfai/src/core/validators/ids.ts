import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { buildContractIndex } from "../contractIndex.js";
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

export async function validateDefinedIds(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
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
      await collectLayeredDefinitionIds(
        entry.userStoriesPath,
        US_DEF_RE,
        defined,
      );
      await collectLayeredDefinitionIds(
        entry.acceptanceCriteriaPath,
        AC_DEF_RE,
        defined,
      );
      await collectLayeredDefinitionIds(
        entry.businessRulesPath,
        BR_DEF_RE,
        defined,
      );
      await collectLayeredDefinitionIds(
        entry.testCasesPath,
        CASE_DEF_RE,
        defined,
      );
      await collectScenarioDefinitionIds([entry.scenarioPath], defined);
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
      ),
    );
  }

  return issues;
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

function recordId(
  out: Map<string, Set<string>>,
  id: string,
  file: string,
): void {
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
