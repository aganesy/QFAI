import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { findPacks, latestPack as selectLatestPack } from "./packLocator.js";

export const REQUIRE_PACK_DIR_RE = /^require-(\d{17})$/;

export const REQUIRED_REQUIRE_PACK_FILES = [
  "01_Sources.md",
  "02_Scope.md",
  "03_REQ.md",
  "04_NFR.md",
  "05_Glossary.md",
  "06_Constraints.md",
  "07_Policy.md",
  "08_OQ.md",
  "09_delta.md",
] as const;

export type RequiredRequirePackFile =
  (typeof REQUIRED_REQUIRE_PACK_FILES)[number];

type RequirePackOqState = {
  disposition: string | null;
  gate: string | null;
};

export type RequirePackReadiness = {
  requireRoot: string;
  latestPackDir: string | null;
  latestPackName: string | null;
  legacyPackNames: string[];
  dangerousPackNames: string[];
  missingFiles: RequiredRequirePackFile[];
  incompleteFiles: RequiredRequirePackFile[];
  blockingOqIds: string[];
};

const PLACEHOLDER_LINE_RE =
  /^(?:[-*]\s*)?(?:tbd|todo|none|n\/a|placeholder|\(placeholder\)|to be defined|to be updated|<[^>]+>)\.?$/i;
const BLOCKING_GATES = new Set(["discuss", "require", "sdd"]);

export async function inspectLatestRequirePack(
  requireRoot: string,
): Promise<RequirePackReadiness> {
  const packs = await findPacks(requireRoot, "require");
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
      requireRoot,
      latestPackDir: null,
      latestPackName,
      legacyPackNames,
      dangerousPackNames,
      missingFiles: [...REQUIRED_REQUIRE_PACK_FILES],
      incompleteFiles: [],
      blockingOqIds: [],
    };
  }

  const missingFiles: RequiredRequirePackFile[] = [];
  const incompleteFiles: RequiredRequirePackFile[] = [];
  let blockingOqIds: string[] = [];

  for (const fileName of REQUIRED_REQUIRE_PACK_FILES) {
    const target = path.join(latestPackDir, fileName);
    const content = await readSafe(target);
    if (content === null) {
      missingFiles.push(fileName);
      continue;
    }
    if (isRequirePackFileIncomplete(content)) {
      incompleteFiles.push(fileName);
    }
    if (fileName === "08_OQ.md") {
      blockingOqIds = extractBlockingOqIds(content);
    }
  }

  return {
    requireRoot,
    latestPackDir,
    latestPackName,
    legacyPackNames,
    dangerousPackNames,
    missingFiles,
    incompleteFiles,
    blockingOqIds,
  };
}

export async function findLatestRequirePackDir(
  requireRoot: string,
): Promise<string | null> {
  const packs = await findPacks(requireRoot, "require");
  return selectLatestPack(packs)?.path ?? null;
}

function isRequirePackFileIncomplete(text: string): boolean {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (normalized.length < 100) {
    return true;
  }

  const contentLines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !line.startsWith("#"))
    .filter(
      (line) => !/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?$/.test(line),
    );

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
  const oqStates = new Map<string, RequirePackOqState>();
  let currentId = "(unlabeled-oq)";

  for (const line of lines) {
    const idMatch = /\b(OQ-\d+)\b/i.exec(line);
    if (idMatch?.[1]) {
      currentId = idMatch[1].toUpperCase();
    }

    const state = oqStates.get(currentId) ?? { disposition: null, gate: null };
    const disposition =
      /(?:^|\s)(?:-\s*)?Disposition\s*:\s*([^\s#]+)/i.exec(line)?.[1] ?? null;
    if (disposition) {
      state.disposition = disposition.toLowerCase();
    }
    const gate =
      /(?:^|\s)(?:-\s*)?Gate\s*:\s*([^\s#]+)/i.exec(line)?.[1] ?? null;
    if (gate) {
      state.gate = gate.toLowerCase();
    }
    oqStates.set(currentId, state);
  }

  const blocking = Array.from(oqStates.entries())
    .filter(
      ([, state]) =>
        state.disposition === "open" &&
        state.gate !== null &&
        BLOCKING_GATES.has(state.gate),
    )
    .map(([id]) => id)
    .sort((left, right) => left.localeCompare(right));

  return blocking;
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
