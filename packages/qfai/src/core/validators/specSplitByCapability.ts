import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { collectSpecEntries, type SpecEntry } from "../specLayout.js";
import type { Issue } from "../types.js";
import { exists, issue, readSafe, to4, uniqueMatches } from "./utils.js";

const CAP_ID_RE = /\bCAP-\d{4}\b/g;
const CAP_CELL_RE = /^CAP-\d{4}$/;
const SPEC_ID_RE = /\bspec-\d{4}\b/i;
const HEADER_CAP_CELL_RE = /cap\s*id/i;
const HEADER_SPEC_CELL_RE = /(^|[^a-z])spec([^a-z]|$)/i;
const DELIMITER_CELL_RE = /^:?-{3,}:?$/;

type CapSpecMismatch = {
  capId: string;
  declaredSpecId: string;
  derivedSpecId: string;
};

function splitTableRow(line: string): string[] {
  return line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

/**
 * Reads the optional Spec column of the CAP catalogue table.
 *
 * The column is advisory: row position stays the truth the spec directory
 * names are derived from. Declaring it makes that truth visible and diffable,
 * so a row that moves can be named instead of the specs it re-points.
 */
function parseDeclaredSpecIds(markdown: string): Map<string, string> {
  const declared = new Map<string, string>();
  let specColumn = -1;

  for (const line of markdown.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) {
      continue;
    }
    const cells = splitTableRow(trimmed);
    if (cells.every((cell) => DELIMITER_CELL_RE.test(cell))) {
      continue;
    }

    const capCell = cells.find((cell) => CAP_CELL_RE.test(cell));
    if (!capCell) {
      if (cells.some((cell) => HEADER_CAP_CELL_RE.test(cell))) {
        specColumn = cells.findIndex((cell) => HEADER_SPEC_CELL_RE.test(cell));
      }
      continue;
    }
    if (specColumn < 0) {
      continue;
    }
    const specMatch = SPEC_ID_RE.exec(cells[specColumn] ?? "");
    if (specMatch) {
      declared.set(capCell, specMatch[0].toLowerCase());
    }
  }

  return declared;
}

function collectCapSpecMismatches(capIds: string[], markdown: string): CapSpecMismatch[] {
  const declared = parseDeclaredSpecIds(markdown);
  if (declared.size === 0) {
    return [];
  }

  const mismatches: CapSpecMismatch[] = [];
  capIds.forEach((capId, index) => {
    const declaredSpecId = declared.get(capId);
    const derivedSpecId = `spec-${to4(index + 1)}`;
    if (declaredSpecId !== undefined && declaredSpecId !== derivedSpecId) {
      mismatches.push({ capId, declaredSpecId, derivedSpecId });
    }
  });
  return mismatches;
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

  const mismatches = collectCapSpecMismatches(capIds, capabilityText);
  if (mismatches.length > 0) {
    for (const mismatch of mismatches) {
      issues.push(
        issue(
          "QFAI-SPLIT-106",
          `03_Capabilities.md の Spec 列が行位置と一致しません: ${mismatch.capId} (宣言=${mismatch.declaredSpecId}, 行位置=${mismatch.derivedSpecId})`,
          "error",
          capabilitiesPath,
          "specSplitByCapability.declaredSpec",
          [mismatch.capId, mismatch.declaredSpecId, mismatch.derivedSpecId],
        ),
      );
    }
    // 行が動いた時点で以降の spec 単位エラー (103/104/105) は移動の派生でしか
    // なく、原因である行を隠してしまうため、ここで打ち切る。
    return issues;
  }

  const actualSpecIds = new Set(
    layeredEntries.map((entry) => path.basename(entry.dir).toLowerCase()),
  );
  const expectedSpecIds = capIds.map((_, index) => `spec-${to4(index + 1)}`);

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

  for (let index = 0; index < capIds.length; index += 1) {
    const capId = capIds[index];
    if (!capId) {
      continue;
    }
    const specId = `spec-${to4(index + 1)}`;
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
