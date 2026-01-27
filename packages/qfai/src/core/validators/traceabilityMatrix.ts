import { readFile } from "node:fs/promises";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import {
  extractAcSpecNumber,
  extractAllIds,
  extractBrSpecNumber,
  extractCaseSpecNumber,
  extractIds,
  extractInvalidIds,
  extractScSpecNumber,
  extractSpecNumber,
} from "../ids.js";
import { parseSpec } from "../parse/spec.js";
import { parseScenarioDocument } from "../scenarioModel.js";
import { collectSpecEntries } from "../specLayout.js";
import type { Issue } from "../types.js";
import { isMissingFileError, issue } from "./utils.js";

const SC_TAG_RE = /^SC-\d{4}-\d{4}$/;

export async function validateTraceabilityMatrices(
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
    let matrixText: string;
    try {
      matrixText = await readFile(entry.traceabilityMatrixPath, "utf-8");
    } catch (error) {
      if (isMissingFileError(error)) {
        issues.push(
          issue(
            "QFAI-RTM-001",
            "traceability-matrix.md が見つかりません。",
            "error",
            entry.traceabilityMatrixPath,
            "traceabilityMatrix.exists",
          ),
        );
        continue;
      }
      throw error;
    }

    const invalidIds = extractInvalidIds(matrixText, [
      "SPEC",
      "BR",
      "AC",
      "CASE",
      "SC",
    ]);
    if (invalidIds.length > 0) {
      issues.push(
        issue(
          "QFAI-ID-002",
          `ID フォーマットが不正です: ${invalidIds.join(", ")}`,
          "error",
          entry.traceabilityMatrixPath,
          "id.format",
          invalidIds,
        ),
      );
    }

    let specText = "";
    try {
      specText = await readFile(entry.specPath, "utf-8");
    } catch {
      specText = "";
    }
    const specParsed = specText ? parseSpec(specText, entry.specPath) : null;
    const specId = specParsed?.specId ?? "";
    const specNumber = specId ? extractSpecNumber(specId) : null;
    const brIds = new Set(specParsed?.brs.map((br) => br.id) ?? []);
    const acIds = new Set(specText ? extractIds(specText, "AC") : []);
    const caseIds = new Set(specText ? extractIds(specText, "CASE") : []);

    try {
      const caseText = await readFile(entry.caseCataloguePath, "utf-8");
      extractIds(caseText, "CASE").forEach((id) => caseIds.add(id));
    } catch {
      // missing handled by case-catalogue validator
    }

    let scenarioText = "";
    try {
      scenarioText = await readFile(entry.scenarioPath, "utf-8");
    } catch {
      scenarioText = "";
    }
    const { document, errors } = scenarioText
      ? parseScenarioDocument(scenarioText, entry.scenarioPath)
      : { document: null, errors: ["missing"] };
    const scIds = new Set<string>();
    if (document && errors.length === 0) {
      for (const scenario of document.scenarios) {
        for (const tag of scenario.tags) {
          if (SC_TAG_RE.test(tag)) {
            scIds.add(tag);
          }
        }
      }
    }

    const matrixIds = extractAllIds(matrixText);
    const matrixSpecIds = matrixIds.filter((id) => id.startsWith("SPEC-"));
    const matrixBrIds = matrixIds.filter((id) => id.startsWith("BR-"));
    const matrixAcIds = matrixIds.filter((id) => id.startsWith("AC-"));
    const matrixCaseIds = matrixIds.filter((id) => id.startsWith("CASE-"));
    const matrixScIds = matrixIds.filter((id) => id.startsWith("SC-"));

    if (specNumber) {
      const invalidNamespaces = [
        ...matrixSpecIds.filter((id) => extractSpecNumber(id) !== specNumber),
        ...matrixBrIds.filter((id) => extractBrSpecNumber(id) !== specNumber),
        ...matrixAcIds.filter((id) => extractAcSpecNumber(id) !== specNumber),
        ...matrixCaseIds.filter(
          (id) => extractCaseSpecNumber(id) !== specNumber,
        ),
        ...matrixScIds.filter((id) => extractScSpecNumber(id) !== specNumber),
      ];
      if (invalidNamespaces.length > 0) {
        issues.push(
          issue(
            "QFAI-RTM-002",
            `traceability-matrix の ID が SPEC と一致しません: ${invalidNamespaces.join(
              ", ",
            )}`,
            "error",
            entry.traceabilityMatrixPath,
            "traceabilityMatrix.idNamespace",
            invalidNamespaces,
          ),
        );
      }
    }

    const unknownIds = [
      ...matrixBrIds.filter((id) => !brIds.has(id)),
      ...matrixAcIds.filter((id) => !acIds.has(id)),
      ...matrixCaseIds.filter((id) => !caseIds.has(id)),
      ...matrixScIds.filter((id) => !scIds.has(id)),
    ];
    if (unknownIds.length > 0) {
      issues.push(
        issue(
          "QFAI-RTM-003",
          `traceability-matrix が未知の ID を参照しています: ${unknownIds.join(
            ", ",
          )}`,
          "error",
          entry.traceabilityMatrixPath,
          "traceabilityMatrix.idExists",
          unknownIds,
        ),
      );
    }
  }

  return issues;
}
