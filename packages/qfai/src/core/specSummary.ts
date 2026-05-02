import { readFile } from "node:fs/promises";

import { extractBulletField, parseSpec, type SpecStatus } from "./parse/spec.js";
import { collectSpecEntries, type SpecEntry } from "./specLayout.js";

export interface SpecSummary {
  specId: string;
  title: string;
  status: SpecStatus;
  capability?: string;
  scopeIn: string[];
  scopeOut: string[];
  layout: SpecEntry["layout"];
  acCount: number;
  tcCount: number;
}

/**
 * Collect a lightweight summary for every spec under the given specs root.
 * Used by Stage 1 Triage to map incoming requirements onto existing specs.
 *
 * Specs with an unparseable / missing Status default to "active" so callers
 * can still surface them to the user; the dedicated status validator is
 * responsible for flagging the missing field separately.
 */
export async function collectSpecSummaries(specsRoot: string): Promise<SpecSummary[]> {
  const entries = await collectSpecEntries(specsRoot);
  const summaries: SpecSummary[] = [];

  for (const entry of entries) {
    const specMdPath = entry.specPath;
    if (!specMdPath) {
      continue;
    }
    const text = await readSafe(specMdPath);
    if (text.length === 0) {
      continue;
    }
    const parsed = parseSpec(text, specMdPath);
    const acText = await readSafe(entry.acceptanceCriteriaPath);
    const tcText = await readSafe(entry.testCasesPath);
    const summary: SpecSummary = {
      specId: `spec-${entry.specNumber}`,
      title: extractH1Title(text) ?? "Spec",
      status: parsed.status ?? "active",
      scopeIn: extractScopeBullets(text, "In"),
      scopeOut: extractScopeBullets(text, "Out"),
      layout: entry.layout,
      acCount: countUniqueIds(acText, /\bAC-\d{4}(?:-\d{4})?\b/g),
      tcCount: countUniqueIds(tcText, /\bTC-\d{4}(?:-\d{4})?\b/g),
    };
    const capability = extractBulletField(text, "Parent");
    if (capability !== undefined) {
      summary.capability = capability;
    }
    summaries.push(summary);
  }

  return summaries.sort((a, b) => a.specId.localeCompare(b.specId));
}

function countUniqueIds(text: string, pattern: RegExp): number {
  const matches = text.match(pattern);
  if (!matches) {
    return 0;
  }
  return new Set(matches).size;
}

async function readSafe(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return "";
  }
}

function extractH1Title(md: string): string | undefined {
  const match = /^#\s+(.+?)\s*$/m.exec(md);
  if (!match?.[1]) {
    return undefined;
  }
  return match[1].trim();
}

const SCOPE_HEADING_RE = /^##\s+Scope\b/im;
const NEXT_HEADING_RE = /^##\s+/m;

export function extractScopeBullets(md: string, label: "In" | "Out"): string[] {
  const headingMatch = SCOPE_HEADING_RE.exec(md);
  if (!headingMatch) {
    return [];
  }
  const after = md.slice(headingMatch.index + headingMatch[0].length);
  const next = NEXT_HEADING_RE.exec(after);
  const section = next ? after.slice(0, next.index) : after;
  const labelRe = new RegExp(`^\\s*-\\s*${label}\\s*:\\s*(.*)$`, "im");
  const labelMatch = labelRe.exec(section);
  if (!labelMatch?.[1]) {
    return [];
  }
  // Bullet may continue on indented continuation lines; capture from match
  // start until the next non-indented bullet or blank line.
  const startIndex = labelMatch.index;
  const sectionAfter = section.slice(startIndex);
  const lines = sectionAfter.split(/\r?\n/);
  const collected: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (i === 0) {
      collected.push(labelMatch[1].trim());
      continue;
    }
    if (/^\s*-\s+/.test(line)) {
      break; // next bullet
    }
    if (/^\s*$/.test(line)) {
      break; // blank line ends the bullet
    }
    collected.push(line.trim());
  }
  const joined = collected.join(" ").trim();
  if (!joined) {
    return [];
  }
  return joined
    .split(/[、,;；]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}
