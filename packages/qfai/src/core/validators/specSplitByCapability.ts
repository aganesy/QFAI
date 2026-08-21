import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { collectSpecEntries, type SpecEntry } from "../specLayout.js";
import type { Issue } from "../types.js";
import { exists, issue, readSafe, to4, uniqueMatches } from "./utils.js";

const CAP_ID_RE = /\bCAP-\d{4}\b/g;
const CAP_ID_CELL_RE = /\bCAP-\d{4}\b/;
const SPEC_ID_CELL_RE = /\bspec-\d{4}\b/i;
const CAP_HEADER_RE = /^cap(\s*id)?$/i;
const SPEC_HEADER_RE = /^spec(\s*(id|dir|directory))?$/i;

/** Splits a markdown table row into trimmed cells; `[]` when the line is not a row. */
function tableCells(line: string): string[] {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|")) {
    return [];
  }
  return trimmed
    .slice(1)
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

/**
 * Reads the declared CAP -> spec directory mapping from the CAP catalog table.
 *
 * The mapping is only honoured when the catalog table carries an explicit spec
 * column, so a catalog that merely mentions a directory in prose keeps the
 * positional derivation. Returns `null` when no mapping is declared.
 */
function parseDeclaredSpecMap(capabilityText: string): Map<string, string> | null {
  const declared = new Map<string, string>();
  let capColumn = -1;
  let specColumn = -1;
  for (const line of capabilityText.split(/\r?\n/)) {
    const cells = tableCells(line);
    if (cells.length === 0) {
      continue;
    }
    if (capColumn < 0 || specColumn < 0) {
      const capIndex = cells.findIndex((cell) => CAP_HEADER_RE.test(cell));
      const specIndex = cells.findIndex((cell) => SPEC_HEADER_RE.test(cell));
      if (capIndex >= 0 && specIndex >= 0) {
        capColumn = capIndex;
        specColumn = specIndex;
      }
      continue;
    }
    const capId = cells[capColumn]?.match(CAP_ID_CELL_RE)?.[0];
    const specId = cells[specColumn]?.match(SPEC_ID_CELL_RE)?.[0];
    if (!capId || !specId || declared.has(capId)) {
      continue;
    }
    declared.set(capId, specId.toLowerCase());
  }
  return declared.size > 0 ? declared : null;
}

/** Flags CAP rows the declared mapping cannot resolve, and spec ids it reuses. */
function declaredMappingIssues(
  declared: Map<string, string>,
  capIds: string[],
  capabilitiesPath: string,
): Issue[] {
  const issues: Issue[] = [];
  const undeclared = capIds.filter((capId) => !declared.has(capId));
  if (undeclared.length > 0) {
    issues.push(
      issue(
        "QFAI-SPLIT-106",
        `Spec 列に spec ディレクトリが宣言されていない CAP があります: ${undeclared.join(", ")}`,
        "error",
        capabilitiesPath,
        "specSplitByCapability.declaredMapping",
        undeclared,
      ),
    );
  }
  const owners = new Map<string, string[]>();
  for (const [capId, specId] of declared) {
    owners.set(specId, [...(owners.get(specId) ?? []), capId]);
  }
  const duplicated = Array.from(owners.entries())
    .filter(([, caps]) => caps.length > 1)
    .map(([specId, caps]) => `${specId} (${caps.join(", ")})`);
  if (duplicated.length > 0) {
    issues.push(
      issue(
        "QFAI-SPLIT-106",
        `複数の CAP が同じ spec ディレクトリを宣言しています: ${duplicated.join(", ")}`,
        "error",
        capabilitiesPath,
        "specSplitByCapability.declaredMapping",
        duplicated,
      ),
    );
  }
  return issues;
}

/** Requires each spec's `01_Spec.md` to cite the CAP that owns it. */
async function capReferenceIssues(
  capIds: string[],
  expectedSpecIds: string[],
  layeredEntries: SpecEntry[],
): Promise<Issue[]> {
  const issues: Issue[] = [];
  for (let index = 0; index < capIds.length; index += 1) {
    const capId = capIds[index];
    const specId = expectedSpecIds[index];
    if (!capId || !specId) {
      continue;
    }
    const entry = layeredEntries.find((value) => path.basename(value.dir).toLowerCase() === specId);
    if (!entry) {
      continue;
    }
    const specFilePath = path.join(entry.dir, "01_Spec.md");
    const specText = await readSafe(specFilePath);
    if (specText.trim().length === 0 || !specText.includes(capId)) {
      issues.push(
        issue(
          "QFAI-SPLIT-105",
          `01_Spec.md が CAP を参照していません: ${specId} -> ${capId}`,
          "error",
          specFilePath,
          "specSplitByCapability.specParent",
          [specId, capId],
        ),
      );
    }
  }
  return issues;
}

export async function validateSpecSplitByCapability(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const specsRoot = resolvePath(root, config, "specsDir");
  const entries = await collectSpecEntries(specsRoot);
  const layeredEntries = entries
    .filter(
      (entry): entry is SpecEntry =>
        entry.layout === "layered" &&
        (entry.layeredStyle === "v1417" || entry.layeredStyle === "v1421"),
    )
    .sort((left, right) => left.specNumber.localeCompare(right.specNumber));
  if (layeredEntries.length === 0) {
    return [];
  }

  const policiesDir = layeredEntries[0]?.sharedDir ?? path.join(specsRoot, "_policies");
  const capabilitiesPath = path.join(policiesDir, "03_Capabilities.md");
  const capabilityText = await readSafe(capabilitiesPath);
  const issues: Issue[] = [];

  if (!(await exists(capabilitiesPath))) {
    issues.push(
      issue(
        "QFAI-SPLIT-100",
        "_policies/03_Capabilities.md が見つかりません。",
        "error",
        capabilitiesPath,
        "specSplitByCapability.capabilitiesFile",
      ),
    );
    return issues;
  }

  const capIds = uniqueMatches(capabilityText, CAP_ID_RE);
  if (capIds.length === 0) {
    issues.push(
      issue(
        "QFAI-SPLIT-101",
        "_policies/03_Capabilities.md に CAP ID が見つかりません。",
        "error",
        capabilitiesPath,
        "specSplitByCapability.capabilitiesIds",
      ),
    );
    return issues;
  }

  if (capIds.length !== layeredEntries.length) {
    issues.push(
      issue(
        "QFAI-SPLIT-102",
        `CAP件数と spec件数が一致しません (CAP=${capIds.length}, spec=${layeredEntries.length})`,
        "error",
        specsRoot,
        "specSplitByCapability.count",
      ),
    );
  }

  const actualSpecIds = new Set(
    layeredEntries.map((entry) => path.basename(entry.dir).toLowerCase()),
  );
  // The catalog may declare the CAP -> spec directory pairing explicitly. When
  // it does, that declaration is the SSOT and ID gaps left by an approved
  // DELETE stay legal; otherwise the pairing stays positional.
  const declaredSpecIds = parseDeclaredSpecMap(capabilityText);
  if (declaredSpecIds) {
    issues.push(...declaredMappingIssues(declaredSpecIds, capIds, capabilitiesPath));
  }
  const expectedSpecIds = capIds.map(
    (capId, index) => declaredSpecIds?.get(capId) ?? `spec-${to4(index + 1)}`,
  );

  const missingSpecIds = expectedSpecIds.filter((specId) => !actualSpecIds.has(specId));
  if (missingSpecIds.length > 0) {
    issues.push(
      issue(
        "QFAI-SPLIT-103",
        `CAPに対応する spec ディレクトリが不足しています: ${missingSpecIds.join(", ")}`,
        "error",
        specsRoot,
        "specSplitByCapability.specCount",
        missingSpecIds,
      ),
    );
  }

  const extraSpecIds = Array.from(actualSpecIds).filter(
    (specId) => !expectedSpecIds.includes(specId),
  );
  if (extraSpecIds.length > 0) {
    issues.push(
      issue(
        "QFAI-SPLIT-104",
        `CAPに対応しない spec ディレクトリがあります: ${extraSpecIds.join(", ")}`,
        "error",
        specsRoot,
        "specSplitByCapability.specCount",
        extraSpecIds,
      ),
    );
  }

  issues.push(...(await capReferenceIssues(capIds, expectedSpecIds, layeredEntries)));

  return issues;
}
