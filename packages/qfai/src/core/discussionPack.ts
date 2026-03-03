import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { findPacks, latestPack as selectLatestPack } from "./packLocator.js";

export const DISCUSSION_PACK_DIR_RE = /^discussion-(\d{17})$/;

export const REQUIRED_DISCUSSION_PACK_FILES = [
  "01_Context.md",
  "02_Inception-Deck.md",
  "03_Story-Workshop.md",
  "04_Sources.md",
  "05_Scope.md",
  "06_REQ.md",
  "07_NFR.md",
  "08_Glossary.md",
  "09_Constraints.md",
  "10_Policy.md",
  "11_OQ-Register.md",
  "12_OQ-Resolution-Log.md",
  "13_Deferred.md",
  "14_Review-Request.md",
  "99_delta.md",
] as const;

export type RequiredDiscussionPackFile = (typeof REQUIRED_DISCUSSION_PACK_FILES)[number];

type DiscussionPackOqState = {
  disposition: string | null;
};

export type DiscussionPackReadiness = {
  discussionRoot: string;
  latestPackDir: string | null;
  latestPackName: string | null;
  legacyPackNames: string[];
  dangerousPackNames: string[];
  missingFiles: RequiredDiscussionPackFile[];
  incompleteFiles: RequiredDiscussionPackFile[];
  blockingOqIds: string[];
  deferredWithoutDetails: string[];
};

const PLACEHOLDER_LINE_RE =
  /^(?:[-*]\s*)?(?:tbd|todo|none|n\/a|placeholder|\(placeholder\)|to be defined|to be updated|<[^>]+>)\.?$/i;

export async function inspectLatestDiscussionPack(
  discussionRoot: string,
): Promise<DiscussionPackReadiness> {
  const packs = await findPacks(discussionRoot, "discussion");
  const legacyPackNames = packs
    .filter((pack) => pack.isLegacy)
    .map((pack) => pack.name)
    .sort((left, right) => left.localeCompare(right));
  const dangerousPackNames = packs
    .filter((pack) => pack.isDangerous)
    .map((pack) => pack.name)
    .sort((left, right) => left.localeCompare(right));
  const latest = selectLatestPack(packs);
  const latestPackDir = latest?.path ?? null;
  const latestPackName = latest?.name ?? null;
  if (!latestPackDir) {
    return {
      discussionRoot,
      latestPackDir: null,
      latestPackName,
      legacyPackNames,
      dangerousPackNames,
      missingFiles: [...REQUIRED_DISCUSSION_PACK_FILES],
      incompleteFiles: [],
      blockingOqIds: [],
      deferredWithoutDetails: [],
    };
  }

  const missingFiles: RequiredDiscussionPackFile[] = [];
  const incompleteFiles: RequiredDiscussionPackFile[] = [];
  let blockingOqIds: string[] = [];
  let deferredWithoutDetails: string[] = [];

  for (const fileName of REQUIRED_DISCUSSION_PACK_FILES) {
    const target = path.join(latestPackDir, fileName);
    const content = await readSafe(target);
    if (content === null) {
      missingFiles.push(fileName);
      continue;
    }
    if (isDiscussionPackFileIncomplete(content)) {
      incompleteFiles.push(fileName);
    }
    if (fileName === "11_OQ-Register.md") {
      blockingOqIds = extractBlockingOqIds(content);
    }
  }

  // Check deferred coverage
  const oqRegisterContent = await readSafe(path.join(latestPackDir, "11_OQ-Register.md"));
  const deferredContent = await readSafe(path.join(latestPackDir, "13_Deferred.md"));
  if (oqRegisterContent !== null && deferredContent !== null) {
    deferredWithoutDetails = extractDeferredWithoutDetails(oqRegisterContent, deferredContent);
  }

  return {
    discussionRoot,
    latestPackDir,
    latestPackName,
    legacyPackNames,
    dangerousPackNames,
    missingFiles,
    incompleteFiles,
    blockingOqIds,
    deferredWithoutDetails,
  };
}

export async function findLatestDiscussionPackDir(discussionRoot: string): Promise<string | null> {
  const packs = await findPacks(discussionRoot, "discussion");
  return selectLatestPack(packs)?.path ?? null;
}

function isDiscussionPackFileIncomplete(text: string): boolean {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (normalized.length < 100) {
    return true;
  }

  const contentLines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !line.startsWith("#"))
    .filter((line) => !/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?$/.test(line));

  if (contentLines.length === 0) {
    return true;
  }

  if (contentLines.every((line) => isPlaceholderLine(line))) {
    return true;
  }

  return false;
}

function isPlaceholderLine(line: string): boolean {
  const plain = line
    .replace(/[`*_~]/g, "")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return PLACEHOLDER_LINE_RE.test(plain);
}

function extractBlockingOqIds(text: string): string[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const oqStates = new Map<string, DiscussionPackOqState>();
  let currentId = "(unlabeled-oq)";

  for (const line of lines) {
    const idMatch = /\b(OQ-\d+)\b/i.exec(line);
    if (idMatch?.[1]) {
      currentId = idMatch[1].toUpperCase();
    }

    const state = oqStates.get(currentId) ?? { disposition: null };
    const disposition = /(?:^|\s)(?:-\s*)?Disposition\s*:\s*([^\s#]+)/i.exec(line)?.[1] ?? null;
    if (disposition) {
      state.disposition = disposition.toLowerCase();
    }

    // Also parse table rows
    if (line.trim().startsWith("|")) {
      const cells = parseTableCells(line);
      // Try to find OQ-ID and Disposition in table columns
      for (const cell of cells) {
        const oqMatch = /\b(OQ-\d+)\b/i.exec(cell);
        if (oqMatch?.[1]) {
          currentId = oqMatch[1].toUpperCase();
          const existingState = oqStates.get(currentId) ?? { disposition: null };
          oqStates.set(currentId, existingState);
        }
      }
    }

    oqStates.set(currentId, state);
  }

  // Also try table-based parsing for Disposition column
  const tableOqs = extractOqTableRows(text);
  for (const row of tableOqs) {
    if (row.id && row.disposition) {
      const existing = oqStates.get(row.id) ?? { disposition: null };
      existing.disposition = row.disposition;
      oqStates.set(row.id, existing);
    }
  }

  const blocking = Array.from(oqStates.entries())
    .filter(([, state]) => state.disposition === "open")
    .map(([id]) => id)
    .sort((left, right) => left.localeCompare(right));

  return blocking;
}

function extractOqTableRows(text: string): Array<{ id: string; disposition: string }> {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const results: Array<{ id: string; disposition: string }> = [];

  // Find table header
  let headerIndex = -1;
  let oqIdCol = -1;
  let dispositionCol = -1;

  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i] ?? "";
    if (!line.includes("|")) continue;
    const cells = parseTableCells(line);
    const normalizedCells = cells.map((c) => c.toLowerCase().replace(/[^a-z0-9-]/g, ""));

    oqIdCol = normalizedCells.findIndex((c) => c === "oq-id" || c === "oqid");
    dispositionCol = normalizedCells.findIndex((c) => c === "disposition");

    if (oqIdCol >= 0 && dispositionCol >= 0) {
      // Verify separator
      const sepLine = lines[i + 1] ?? "";
      const sepCells = parseTableCells(sepLine);
      if (sepCells.length === cells.length && sepCells.every((c) => /^:?-{3,}:?$/.test(c.trim()))) {
        headerIndex = i;
        break;
      }
    }
  }

  if (headerIndex < 0) return results;

  for (let i = headerIndex + 2; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (!line.trim().startsWith("|")) break;
    const cells = parseTableCells(line);
    const oqIdRaw = cells[oqIdCol] ?? "";
    const dispositionRaw = cells[dispositionCol] ?? "";

    const oqMatch = /\b(OQ-\d+)\b/i.exec(oqIdRaw);
    if (oqMatch?.[1]) {
      results.push({
        id: oqMatch[1].toUpperCase(),
        disposition: dispositionRaw.trim().toLowerCase(),
      });
    }
  }

  return results;
}

function extractDeferredWithoutDetails(oqRegisterText: string, deferredText: string): string[] {
  const registerRows = extractOqTableRows(oqRegisterText);
  const deferredIds = registerRows
    .filter((row) => row.disposition === "deferred")
    .map((row) => row.id);

  if (deferredIds.length === 0) return [];

  // 13_Deferred.md may use table format (OQ-ID column without Disposition)
  // or heading format (### OQ-XXXX: ...).  Extract all OQ-ID references
  // regardless of structure so both formats are supported.
  const deferredDetailSet = extractAllOqIds(deferredText);

  return deferredIds.filter((id) => !deferredDetailSet.has(id));
}

/**
 * Extract every OQ-ID reference from arbitrary markdown text.
 * Works with tables, headings, list items, or inline mentions.
 */
function extractAllOqIds(text: string): Set<string> {
  const ids = new Set<string>();
  const re = /\b(OQ-\d+)\b/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match[1]) {
      ids.add(match[1].toUpperCase());
    }
  }
  return ids;
}

function parseTableCells(line: string): string[] {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|")) return [];
  const normalized = trimmed.replace(/^\|/, "").replace(/\|$/, "");
  return normalized.split("|").map((cell) => cell.trim());
}

async function readSafe(filePath: string): Promise<string | null> {
  try {
    const stats = await stat(filePath);
    if (!stats.isFile()) {
      return null;
    }
    return await readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}
