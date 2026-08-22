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

interface CatalogRow {
  readonly capId: string;
  /** The declared spec directory, or `null` when the row left the cell empty. */
  readonly specId: string | null;
}

interface DeclaredCatalog {
  /** Every CAP row of the catalog table, in declaration order. */
  readonly rows: readonly CatalogRow[];
  /** The first directory each CAP declared; a CAP with only blank cells is absent. */
  readonly byCap: ReadonlyMap<string, string>;
}

/**
 * Reads the CAP catalog table as a declared CAP -> spec directory mapping.
 *
 * Declared mode is decided by the presence of the spec column, not by how many
 * cells are filled in: a catalog that adds the column and leaves every cell
 * empty declares an empty mapping (every CAP then draws `QFAI-SPLIT-106`)
 * rather than silently falling back to the positional derivation. Returns
 * `null` only when the table carries no spec column at all.
 */
function parseDeclaredCatalog(capabilityText: string): DeclaredCatalog | null {
  const rows: CatalogRow[] = [];
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
    if (!capId) {
      continue;
    }
    const specCell = cells[specColumn]?.match(SPEC_ID_CELL_RE)?.[0];
    rows.push({ capId, specId: specCell ? specCell.toLowerCase() : null });
  }
  if (capColumn < 0 || specColumn < 0) {
    return null;
  }
  const byCap = new Map<string, string>();
  for (const row of rows) {
    if (row.specId !== null && !byCap.has(row.capId)) {
      byCap.set(row.capId, row.specId);
    }
  }
  return { rows, byCap };
}

/** CAP ids whose catalog row declares no spec directory. */
function undeclaredCapIds(catalog: DeclaredCatalog, capIds: string[]): string[] {
  return capIds.filter((capId) => !catalog.byCap.has(capId));
}

/** CAP ids that occupy more than one catalog row. */
function repeatedCapIds(catalog: DeclaredCatalog): string[] {
  const seen = new Set<string>();
  const repeated: string[] = [];
  for (const row of catalog.rows) {
    if (!seen.has(row.capId)) {
      seen.add(row.capId);
      continue;
    }
    if (!repeated.includes(row.capId)) {
      repeated.push(row.capId);
    }
  }
  return repeated;
}

/** Spec directories claimed by more than one CAP, rendered for the message. */
function reusedSpecIds(catalog: DeclaredCatalog): string[] {
  const owners = new Map<string, string[]>();
  for (const [capId, specId] of catalog.byCap) {
    owners.set(specId, [...(owners.get(specId) ?? []), capId]);
  }
  return Array.from(owners.entries())
    .filter(([, caps]) => caps.length > 1)
    .map(([specId, caps]) => `${specId} (${caps.join(", ")})`);
}

/** Flags CAP rows the declared mapping cannot resolve, and spec ids it reuses. */
function declaredMappingIssues(
  catalog: DeclaredCatalog,
  capIds: string[],
  capabilitiesPath: string,
): Issue[] {
  const issues: Issue[] = [];
  const undeclared = undeclaredCapIds(catalog, capIds);
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
  const repeated = repeatedCapIds(catalog);
  if (repeated.length > 0) {
    issues.push(
      issue(
        "QFAI-SPLIT-106",
        `同じ CAP が複数の行に登場しています: ${repeated.join(", ")}`,
        "error",
        capabilitiesPath,
        "specSplitByCapability.declaredMapping",
        repeated,
      ),
    );
  }
  const duplicated = reusedSpecIds(catalog);
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
  expectedSpecIds: (string | null)[],
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
  const catalog = parseDeclaredCatalog(capabilityText);
  const undeclared = catalog ? undeclaredCapIds(catalog, capIds) : [];
  if (catalog) {
    issues.push(...declaredMappingIssues(catalog, capIds, capabilitiesPath));
  }
  // Declared mode never synthesises a directory for a blank cell: that row is
  // already reported as QFAI-SPLIT-106, and inventing `spec-<row number>` for
  // it would raise a 103 for a directory nobody asked for.
  const expectedSpecIds: (string | null)[] = capIds.map((capId, index) =>
    catalog ? (catalog.byCap.get(capId) ?? null) : `spec-${to4(index + 1)}`,
  );

  const missingSpecIds = expectedSpecIds.filter(
    (specId): specId is string => specId !== null && !actualSpecIds.has(specId),
  );
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

  // While a CAP row is still undeclared, an unnamed directory may well be the
  // one that row owns, so 104 ("no CAP owns this directory") cannot be trusted
  // until QFAI-SPLIT-106 is cleared.
  const extraSpecIds =
    undeclared.length > 0
      ? []
      : Array.from(actualSpecIds).filter((specId) => !expectedSpecIds.includes(specId));
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
