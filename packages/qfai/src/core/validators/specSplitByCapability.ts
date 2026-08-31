import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { collectSpecEntries, type SpecEntry } from "../specLayout.js";
import type { Issue } from "../types.js";
import { exists, issue, readSafe, to4, uniqueMatches } from "./utils.js";

const CAP_ID_RE = /\bCAP-\d{4}\b/g;

/**
 * Spec directories for a list of `spec-NNNN` ids, for `details.relatedFiles`.
 *
 * The three count findings are filed against `specsRoot`, which no spec owns,
 * and the ids they name travel in `refs` — a field `isFindingInSpecScope` does
 * not read. Every one of them therefore survived `--spec`, so a slice worker
 * gating on its own spec failed on a sibling agent's in-flight `spec-NNNN/`
 * from the moment that directory appeared until its CAP row landed. Listing the
 * implicated directories under `relatedFiles` lets the scope filter derive the
 * owners, the representative-plus-`relatedFiles` shape `QFAI-ID-001` uses.
 *
 * `known` maps a lower-cased id to *every* directory `collectSpecEntries`
 * enumerated under it, so a `SPEC-0004/` spelling on a case-sensitive
 * filesystem keeps its real path — and a `spec-0001/` that coexists with a
 * `SPEC-0001/` contributes both, since either one alone would name only half of
 * what the count finding is about. A missing spec has no entry and its path is
 * synthesised: the finding is then owned by a directory that does not exist
 * yet, which is precisely the spec whose run has to see it.
 */
function specDirPaths(
  specsRoot: string,
  specIds: readonly string[],
  known: ReadonlyMap<string, readonly string[]>,
): string[] {
  return specIds.flatMap((specId) => known.get(specId) ?? [path.join(specsRoot, specId)]);
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

  // `SPEC_DIR_RE` is case-insensitive, so on a case-sensitive filesystem
  // `spec-0001/` and `SPEC-0001/` are two entries under one normalised id.
  // Keeping only the last one would lose the very directory that makes
  // `layeredEntries.length` disagree with `capIds.length`.
  const specDirsById = new Map<string, string[]>();
  for (const entry of layeredEntries) {
    const specId = path.basename(entry.dir).toLowerCase();
    const dirs = specDirsById.get(specId);
    if (dirs === undefined) {
      specDirsById.set(specId, [entry.dir]);
    } else {
      dirs.push(entry.dir);
    }
  }
  const expectedSpecIds = capIds.map((_, index) => `spec-${to4(index + 1)}`);
  const missingSpecIds = expectedSpecIds.filter((specId) => !specDirsById.has(specId));
  const extraSpecIds = Array.from(specDirsById.keys()).filter(
    (specId) => !expectedSpecIds.includes(specId),
  );
  // An id held by several real directories is neither missing nor extra, yet it
  // is exactly what the count finding reports. Without it a duplicate-only
  // mismatch would leave `relatedFiles` empty, and `isFindingInSpecScope` reads
  // an unattributed finding as belonging to every `--spec` scope — the sibling
  // gate failure this attribution exists to stop.
  const duplicatedSpecIds = Array.from(specDirsById.entries())
    .filter(([, dirs]) => dirs.length > 1)
    .map(([specId]) => specId);
  const countSpecIds = Array.from(
    new Set([...missingSpecIds, ...extraSpecIds, ...duplicatedSpecIds]),
  );

  if (capIds.length !== layeredEntries.length) {
    issues.push(
      issue(
        "QFAI-SPLIT-102",
        `CAP件数と spec件数が一致しません (CAP=${capIds.length}, spec=${layeredEntries.length})`,
        "error",
        specsRoot,
        "specSplitByCapability.count",
        undefined,
        "canonical",
        undefined,
        {
          relatedFiles: specDirPaths(specsRoot, countSpecIds, specDirsById),
        },
      ),
    );
  }

  if (missingSpecIds.length > 0) {
    issues.push(
      issue(
        "QFAI-SPLIT-103",
        `CAPに対応する spec ディレクトリが不足しています: ${missingSpecIds.join(", ")}`,
        "error",
        specsRoot,
        "specSplitByCapability.specCount",
        missingSpecIds,
        "canonical",
        undefined,
        { relatedFiles: specDirPaths(specsRoot, missingSpecIds, specDirsById) },
      ),
    );
  }

  if (extraSpecIds.length > 0) {
    issues.push(
      issue(
        "QFAI-SPLIT-104",
        `CAPに対応しない spec ディレクトリがあります: ${extraSpecIds.join(", ")}`,
        "error",
        specsRoot,
        "specSplitByCapability.specCount",
        extraSpecIds,
        "canonical",
        undefined,
        { relatedFiles: specDirPaths(specsRoot, extraSpecIds, specDirsById) },
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
