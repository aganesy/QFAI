import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { collectSpecEntries, type SpecEntry } from "../specLayout.js";
import {
  maskNonSpecRegions,
  type MarkdownTable,
  parseAllMarkdownTables,
} from "../specPackParsers.js";
import type { Issue } from "../types.js";
import { exists, issue, readSafe, to4, uniqueMatches } from "./utils.js";

const CAP_ID_RE = /\bCAP-\d{4}\b/g;
const CAP_ID_HEADER_RE = /^cap\s*id$/i;

/**
 * Matches the template heading `## CAP Catalog` (and a single parenthesised
 * qualifier such as `## CAP Catalog (required)` / `（必須）`), and nothing
 * else. `## CAP Catalog Notes` documents the catalog — it is not the catalog.
 */
const CAP_CATALOG_HEADING = /^ {0,3}(#{1,6})\s*cap\s*catalog\s*(?:\([^)]*\)|（[^）]*）)?\s*$/i;

/** Any ATX heading, with the 0-3 leading spaces CommonMark permits. */
const ANY_HEADING = /^ {0,3}(#{1,6})\s+\S/;

/**
 * Body of the `## CAP Catalog` section, or `null` when the document has no
 * such heading. The section ends at the next heading of the same or a higher
 * level, mirroring `extractTestCaseTableSection`.
 */
function extractCapCatalogSection(text: string): string | null {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const start = lines.findIndex((line) => CAP_CATALOG_HEADING.test(line));
  if (start === -1) {
    return null;
  }
  const level = (CAP_CATALOG_HEADING.exec(lines[start] ?? "")?.[1] ?? "#").length;

  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const match = ANY_HEADING.exec(lines[index] ?? "");
    if (match && (match[1] ?? "").length <= level) {
      end = index;
      break;
    }
  }
  return lines.slice(start + 1, end).join("\n");
}

function hasCapIdColumn(table: MarkdownTable): boolean {
  return table.headers.some((header) => CAP_ID_HEADER_RE.test(header));
}

/**
 * The one table whose row order defines the CAP -> spec-NNNN assignment.
 *
 * Section-first: when `## CAP Catalog` exists only that section is searched,
 * so a second table elsewhere in the document (a reference matrix, an owner
 * list) cannot contribute rows. Without the heading — older policy files — the
 * first `CAP ID`-bearing table anywhere in the document is used, and failing
 * that the first table at all, which is what the column-0 default assumes.
 *
 * Takes text already passed through `maskNonSpecRegions`, so an illustrative
 * heading or table cannot win either resolution step.
 */
function resolveCatalogTable(maskedText: string): MarkdownTable | null {
  const section = extractCapCatalogSection(maskedText);
  const tables = parseAllMarkdownTables(section ?? maskedText);
  return tables.find(hasCapIdColumn) ?? tables[0] ?? null;
}

/** CAP Catalog テーブルの `CAP ID` 列位置。見出しが無ければ先頭列とみなす。 */
function findCapIdColumn(headers: string[]): number {
  const index = headers.findIndex((header) => CAP_ID_HEADER_RE.test(header));
  return index >= 0 ? index : 0;
}

/**
 * CAP Catalog テーブルの各行から `CAP ID` セルの CAP を行順に取り出す。
 * 表の外の地の文、`Notes` セルの CAP 参照、CAP Catalog 節の外にある別の表は
 * spec-NNNN の割り当て順に参加させない。行の分割は `splitMarkdownRow`
 * (`parseAllMarkdownTables` 経由) に任せるので、セル内のエスケープ済み `\|`
 * で列位置がずれることはない。テーブルから 1 件も取れない場合のみ、旧挙動である
 * ファイル全体走査に落とす (箇条書きだけで CAP を並べた既存プロジェクト用)。
 *
 * 見出し探索・表の解析・全体走査フォールバックはいずれも、fenced code block /
 * HTML コメント / インデントコードを `maskNonSpecRegions` で伏せた同一のテキスト
 * に対して行う (`resolveTestCaseTable` と同じ手順)。この文書は自分自身の書式を
 * 例示することがあり、伏せずに探すと実カタログより前に置かれた例示の見出しが
 * 節の開始点に選ばれ、直後の実見出しでその節が閉じてしまう。旧実装の全体走査は
 * 重複を除いたので例示は実カタログの前置きとして吸収されたが、節ベースの解決では
 * 例示がカタログそのものを置き換え、CAP 件数と割り当て順が壊れる。
 */
function extractCatalogCapIds(rawText: string): string[] {
  const text = maskNonSpecRegions(rawText);
  const table = resolveCatalogTable(text);
  const capIds: string[] = [];
  if (table) {
    const capIdColumn = findCapIdColumn(table.headers);
    for (const cells of table.rows) {
      const [capId] = uniqueMatches(cells[capIdColumn] ?? "", CAP_ID_RE);
      if (!capId || capIds.includes(capId)) {
        continue;
      }
      capIds.push(capId);
    }
  }
  return capIds.length > 0 ? capIds : uniqueMatches(text, CAP_ID_RE);
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

  const capIds = extractCatalogCapIds(capabilityText);
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
