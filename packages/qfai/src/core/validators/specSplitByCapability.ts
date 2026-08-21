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
 * `known` maps a lower-cased id to the directory `collectSpecEntries`
 * enumerated, so a `SPEC-0004/` spelling on a case-sensitive filesystem keeps
 * its real path. A missing spec has no entry and its path is synthesised: the
 * finding is then owned by a directory that does not exist yet, which is
 * precisely the spec whose run has to see it.
 */
function specDirPaths(
  specsRoot: string,
  specIds: readonly string[],
  known: ReadonlyMap<string, string>,
): string[] {
  return specIds.map((specId) => known.get(specId) ?? path.join(specsRoot, specId));
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

  const specDirById = new Map<string, string>();
  for (const entry of layeredEntries) {
    specDirById.set(path.basename(entry.dir).toLowerCase(), entry.dir);
  }
  const expectedSpecIds = capIds.map((_, index) => `spec-${to4(index + 1)}`);
  const missingSpecIds = expectedSpecIds.filter((specId) => !specDirById.has(specId));
  const extraSpecIds = Array.from(specDirById.keys()).filter(
    (specId) => !expectedSpecIds.includes(specId),
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
          relatedFiles: specDirPaths(specsRoot, [...missingSpecIds, ...extraSpecIds], specDirById),
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
        { relatedFiles: specDirPaths(specsRoot, missingSpecIds, specDirById) },
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
        { relatedFiles: specDirPaths(specsRoot, extraSpecIds, specDirById) },
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
