import { readFile } from "node:fs/promises";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import {
  extractCaseSpecNumber,
  extractIds,
  extractInvalidIds,
  extractSpecNumber,
} from "../ids.js";
import { parseSpec } from "../parse/spec.js";
import { collectSpecEntries } from "../specLayout.js";
import type { Issue } from "../types.js";
import { isMissingFileError, issue } from "./utils.js";

export async function validateCaseCatalogues(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const specsRoot = resolvePath(root, config, "specsDir");
  const entries = await collectSpecEntries(specsRoot);

  if (entries.length === 0) {
    return [];
  }

  const issues: Issue[] = [];
  for (const entry of entries) {
    let specText = "";
    try {
      specText = await readFile(entry.specPath, "utf-8");
    } catch {
      specText = "";
    }
    const specParsed = specText ? parseSpec(specText, entry.specPath) : null;
    const specNumber = specParsed?.specId
      ? extractSpecNumber(specParsed.specId)
      : null;

    let text: string;
    try {
      text = await readFile(entry.caseCataloguePath, "utf-8");
    } catch (error) {
      if (isMissingFileError(error)) {
        issues.push(
          issue(
            "QFAI-CASE-001",
            "case-catalogue.md が見つかりません。",
            "error",
            entry.caseCataloguePath,
            "caseCatalogue.exists",
          ),
        );
        continue;
      }
      throw error;
    }

    const invalidIds = extractInvalidIds(text, ["CASE"]);
    if (invalidIds.length > 0) {
      issues.push(
        issue(
          "QFAI-ID-002",
          `ID フォーマットが不正です: ${invalidIds.join(", ")}`,
          "error",
          entry.caseCataloguePath,
          "id.format",
          invalidIds,
        ),
      );
    }

    if (specNumber) {
      const caseIds = extractIds(text, "CASE");
      const invalidCaseIds = caseIds.filter(
        (id) => extractCaseSpecNumber(id) !== specNumber,
      );
      if (invalidCaseIds.length > 0) {
        issues.push(
          issue(
            "QFAI-CASE-002",
            `CASE ID が SPEC と一致しません: ${invalidCaseIds.join(", ")}`,
            "error",
            entry.caseCataloguePath,
            "caseCatalogue.caseNamespace",
            invalidCaseIds,
          ),
        );
      }
    }
  }

  return issues;
}
