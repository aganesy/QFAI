import { readFile } from "node:fs/promises";

import { collectFiles } from "./fs.js";
import { parseScenarioDocument } from "./scenarioModel.js";

export const SC_TAG_RE = /^SC-\d{4}$/;
export const SC_TEST_ANNOTATION_RE = /\bQFAI:SC-(\d{4})\b/g;

export type ScCoverage = {
  total: number;
  covered: number;
  missing: number;
  missingIds: string[];
  refs: Record<string, string[]>;
};

export function extractAnnotatedScIds(text: string): string[] {
  const ids = new Set<string>();
  for (const match of text.matchAll(SC_TEST_ANNOTATION_RE)) {
    const suffix = match[1];
    if (suffix) {
      ids.add(`SC-${suffix}`);
    }
  }
  return Array.from(ids);
}

export async function collectScIdsFromScenarioFiles(
  scenarioFiles: string[],
): Promise<Set<string>> {
  const scIds = new Set<string>();
  for (const file of scenarioFiles) {
    const text = await readFile(file, "utf-8");
    const { document, errors } = parseScenarioDocument(text, file);
    if (!document || errors.length > 0) {
      continue;
    }

    for (const scenario of document.scenarios) {
      for (const tag of scenario.tags) {
        if (SC_TAG_RE.test(tag)) {
          scIds.add(tag);
        }
      }
    }
  }
  return scIds;
}

export async function collectScIdSourcesFromScenarioFiles(
  scenarioFiles: string[],
): Promise<Map<string, Set<string>>> {
  const sources = new Map<string, Set<string>>();
  for (const file of scenarioFiles) {
    const text = await readFile(file, "utf-8");
    const { document, errors } = parseScenarioDocument(text, file);
    if (!document || errors.length > 0) {
      continue;
    }

    for (const scenario of document.scenarios) {
      for (const tag of scenario.tags) {
        if (!SC_TAG_RE.test(tag)) {
          continue;
        }
        const current = sources.get(tag) ?? new Set<string>();
        current.add(file);
        sources.set(tag, current);
      }
    }
  }
  return sources;
}

export async function collectScTestReferences(
  roots: string[] | string,
): Promise<Map<string, Set<string>>> {
  const refs = new Map<string, Set<string>>();
  const rootList = Array.isArray(roots) ? roots : [roots];
  const files = new Set<string>();
  for (const root of rootList) {
    const collected = await collectFiles(root, {
      extensions: [".ts", ".tsx", ".js", ".jsx"],
    });
    collected.forEach((file) => files.add(file));
  }

  for (const file of files) {
    const text = await readFile(file, "utf-8");
    const scIds = extractAnnotatedScIds(text);
    if (scIds.length === 0) {
      continue;
    }
    for (const scId of scIds) {
      const current = refs.get(scId) ?? new Set<string>();
      current.add(file);
      refs.set(scId, current);
    }
  }

  return refs;
}

export function buildScCoverage(
  scIds: Iterable<string>,
  refs: Map<string, Set<string>>,
): ScCoverage {
  const sortedScIds = toSortedArray(scIds);
  const refsRecord: Record<string, string[]> = {};
  const missingIds: string[] = [];
  let covered = 0;

  for (const scId of sortedScIds) {
    const files = refs.get(scId);
    const sortedFiles = files ? toSortedArray(files) : [];
    refsRecord[scId] = sortedFiles;
    if (sortedFiles.length === 0) {
      missingIds.push(scId);
    } else {
      covered += 1;
    }
  }

  return {
    total: sortedScIds.length,
    covered,
    missing: missingIds.length,
    missingIds,
    refs: refsRecord,
  };
}

function toSortedArray(values: Iterable<string>): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}
