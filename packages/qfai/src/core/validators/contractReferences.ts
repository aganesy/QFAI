import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { buildContractIndex } from "../contractIndex.js";
import { collectSpecEntries } from "../specLayout.js";
import type { Issue } from "../types.js";
import { issue, readSafe } from "./utils.js";

const FULL_CONTRACT_ID_RE = /\bCON-(API|DB|UI)-(\d+)\b/gi;
const SHORT_CONTRACT_ID_RE = /(?<!CON-)\b(API|DB|UI)-(\d{1,4})\b/gi;

export async function validateContractReferences(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const specsRoot = resolvePath(root, config, "specsDir");
  const entries = await collectSpecEntries(specsRoot);
  const contractIndex = await buildContractIndex(root, config);

  const contractIndexFiles = new Set<string>();
  for (const entry of entries) {
    if (entry.layout !== "layered" && entry.layout !== "spec-pack") {
      continue;
    }
    contractIndexFiles.add(entry.contractsIndexPath);
  }

  const issues: Issue[] = [];
  const severity = config.validation.traceability.unknownContractIdSeverity;
  for (const filePath of Array.from(contractIndexFiles).sort((a, b) =>
    a.localeCompare(b),
  )) {
    const text = await readSafe(filePath);
    if (text.trim().length === 0) {
      continue;
    }

    const referencedIds = extractContractIds(text);
    for (const contractId of referencedIds) {
      if (contractIndex.ids.has(contractId)) {
        continue;
      }
      issues.push(
        issue(
          "QFAI-CONTRACT-030",
          `契約インデックスが未定義の契約IDを参照しています: ${contractId}`,
          severity,
          filePath,
          "contracts.referenceExists",
          [contractId],
          "compatibility",
          "契約IDに対応するファイルを `.qfai/contracts/**` に追加し、`QFAI-CONTRACT-ID` 宣言を一致させてください。",
        ),
      );
    }
  }

  return issues;
}

function extractContractIds(text: string): string[] {
  const ids = new Set<string>();

  for (const match of text.matchAll(FULL_CONTRACT_ID_RE)) {
    const kind = match[1]?.toUpperCase();
    const number = match[2];
    if (!kind || !number) {
      continue;
    }
    ids.add(`CON-${kind}-${number}`);
  }

  for (const match of text.matchAll(SHORT_CONTRACT_ID_RE)) {
    const kind = match[1]?.toUpperCase();
    const number = match[2];
    if (!kind || !number) {
      continue;
    }
    ids.add(`CON-${kind}-${number.padStart(4, "0")}`);
  }

  return Array.from(ids).sort((a, b) => a.localeCompare(b));
}
