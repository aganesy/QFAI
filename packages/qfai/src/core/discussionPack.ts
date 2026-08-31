import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { loadConfig } from "./config.js";
import type { UiBearingClassification } from "./detection/surfaceType.js";
import { readValidatedClassification } from "./detection/surfaceType.js";
import { findPacks, latestPack as selectLatestPack } from "./packLocator.js";
import { readDiscussionCurrentIdState } from "./state.js";

/**
 * Resolve the discussion root for `<root>` honoring
 * `config.paths.discussionDir` (which may be relative OR absolute).
 * Currently only `resolveActiveDiscussionPack` consumes this helper;
 * `inspectLatestDiscussionPack` receives the resolved
 * `discussionRoot` from its caller (which already runs
 * `resolvePath(root, config, "discussionDir")`).
 *
 * `path.resolve` (not `path.join`) preserves an absolute config
 * value verbatim — projects that relocate their discussion packs
 * outside `<root>` (e.g. shared review machines, custom CI layouts)
 * still find the same packs the CLI-side
 * `qfai discussion list --active` resolver does.
 *
 * Acknowledged DRY tech debt: this helper, the CLI-side
 * `discussion.ts#resolveDiscussionRoot`, and the public
 * `core/config.ts#resolvePath(root, config, "discussionDir")` are
 * three copies of the same single-line resolution rule. Folding all
 * three into one shared exported helper is a follow-up — for now the
 * three callsites have been verified to use identical semantics so a
 * change to ONE without the other two will introduce drift.
 */
async function resolveDiscussionRootFromConfig(root: string): Promise<string> {
  const { config } = await loadConfig(root);
  return path.resolve(root, config.paths.discussionDir);
}

export const DISCUSSION_PACK_DIR_RE = /^discussion-(\d{17})$/;

export const REQUIRED_DISCUSSION_PACK_MARKDOWN_FILES = [
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

export const REQUIRED_DISCUSSION_PACK_SIDE_ARTIFACTS = [] as const;

/** @deprecated Use REQUIRED_DISCUSSION_PACK_MARKDOWN_FILES instead */
export const REQUIRED_DISCUSSION_PACK_FILES = REQUIRED_DISCUSSION_PACK_MARKDOWN_FILES;

export type RequiredDiscussionPackMarkdownFile =
  (typeof REQUIRED_DISCUSSION_PACK_MARKDOWN_FILES)[number];
export type RequiredDiscussionPackSideArtifact =
  (typeof REQUIRED_DISCUSSION_PACK_SIDE_ARTIFACTS)[number];
export type RequiredDiscussionPackFile = RequiredDiscussionPackMarkdownFile;

type DiscussionPackOqState = {
  disposition: string | null;
};

export type DiscussionPackReadiness = {
  discussionRoot: string;
  latestPackDir: string | null;
  latestPackName: string | null;
  legacyPackNames: string[];
  dangerousPackNames: string[];
  missingFiles: RequiredDiscussionPackMarkdownFile[];
  missingSideArtifacts: RequiredDiscussionPackSideArtifact[];
  incompleteFiles: RequiredDiscussionPackMarkdownFile[];
  blockingOqIds: string[];
  deferredWithoutDetails: string[];
  prototypingRequired: boolean;
};

export function isPrototypingRequiredForDiscussionPack(
  _classification: Pick<UiBearingClassification, "ui_bearing" | "primary_surface"> | null,
): boolean {
  return false;
}

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
      missingFiles: [...REQUIRED_DISCUSSION_PACK_MARKDOWN_FILES],
      missingSideArtifacts: [],
      incompleteFiles: [],
      blockingOqIds: [],
      deferredWithoutDetails: [],
      prototypingRequired: false,
    };
  }

  const missingFiles: RequiredDiscussionPackMarkdownFile[] = [];
  const missingSideArtifacts: RequiredDiscussionPackSideArtifact[] = [];
  const incompleteFiles: RequiredDiscussionPackMarkdownFile[] = [];
  let blockingOqIds: string[] = [];
  let deferredWithoutDetails: string[] = [];
  await readValidatedClassification(latestPackDir);
  const prototypingRequired = false;

  for (const fileName of REQUIRED_DISCUSSION_PACK_MARKDOWN_FILES) {
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
    missingSideArtifacts,
    incompleteFiles,
    blockingOqIds,
    deferredWithoutDetails,
    prototypingRequired,
  };
}

export async function findLatestDiscussionPackDir(discussionRoot: string): Promise<string | null> {
  const packs = await findPacks(discussionRoot, "discussion");
  return selectLatestPack(packs)?.path ?? null;
}

/**
 * Why `resolveActiveDiscussionPack` could not name an active pack.
 *
 * The four cases are NOT interchangeable. `"unset"` is the ordinary state of
 * a project that has never run `qfai discussion use`; `"corrupt"`,
 * `"dangling"` and `"duplicate"` are broken runtime state that only a repair
 * can clear. A consumer that collapses a broken case into the ordinary one
 * silently substitutes a pack nobody selected.
 *
 * `"corrupt"` specifically covers an unreadable `.qfai/state.json`: invalid
 * JSON, a non-object document, a non-object `discussion` block, or a
 * non-string / blank `discussion.currentId`. Those used to reach the reader as
 * the same `null` an absent file produces, so a broken state file was
 * indistinguishable from a project that never pinned a pack.
 */
export type ResolveActiveDiscussionPackErrorReason = "unset" | "corrupt" | "dangling" | "duplicate";

/**
 * Error thrown by `resolveActiveDiscussionPack` when the runtime-state
 * pointer (`.qfai/state.json#discussion.currentId`) is absent OR
 * resolves to a missing/duplicate pack. The message names each
 * candidate `discussion-*` directory and the literal recovery command
 * `qfai discussion use <id>` so consumers can self-recover without
 * scanning filesystem mtimes. `reason` carries which of the three cases
 * fired, so a consumer can tell "never pinned" from "pinned at something
 * broken".
 */
export class ResolveActiveDiscussionPackError extends Error {
  readonly reason: ResolveActiveDiscussionPackErrorReason;

  constructor(message: string, reason: ResolveActiveDiscussionPackErrorReason) {
    super(message);
    this.name = "ResolveActiveDiscussionPackError";
    this.reason = reason;
  }
}

/**
 * Resolve the active discussion pack via the single runtime-state
 * SSOT `.qfai/state.json#discussion.currentId`. Returns the absolute
 * path of the pack directory. Filesystem modification-time inference
 * is NOT used.
 *
 * Throws `ResolveActiveDiscussionPackError` when:
 *   - `currentId` was never written (`reason: "unset"`), or
 *   - `.qfai/state.json` exists but cannot be read as a pointer
 *     (`reason: "corrupt"`), or
 *   - `currentId` resolves to a directory that does not exist
 *     (`reason: "dangling"`), or
 *   - `currentId` resolves to a name that matches more than one pack
 *     entry under the discussion root (`reason: "duplicate"`, a malformed
 *     filesystem).
 *
 * The thrown message lists every candidate `discussion-*` directory
 * present on disk plus the literal recovery command
 * `qfai discussion use <id>`.
 *
 * `discussionRoot` lets a caller that has ALREADY resolved
 * `paths.discussionDir` pass it in. Callers holding a config that is
 * not the one on disk — `validateProject` injecting a `configResult`,
 * or a public validator invoked with a custom config — would
 * otherwise have this helper re-read `qfai.config.yaml` and resolve
 * `currentId` against a different directory than the rest of their
 * work, reporting a present pack as missing.
 */
export async function resolveActiveDiscussionPack(
  root: string,
  discussionRoot?: string,
): Promise<string> {
  // Honor `paths.discussionDir` from qfai.config.yaml. The previous
  // hardcoded `<root>/.qfai/discussion` did not match what the CLI
  // `qfai discussion list --active` resolver (discussion.ts) reads,
  // so a project that relocates discussionDir (relative OR absolute)
  // could `qfai discussion use <id>` successfully, then have callers
  // of this active-pack resolver report the pack as missing because
  // it was scanning the wrong directory.
  const resolvedRoot = discussionRoot ?? (await resolveDiscussionRootFromConfig(root));
  const pointer = await readDiscussionCurrentIdState(root);
  const candidates = await findPacks(resolvedRoot, "discussion");
  const candidateNames = candidates
    .map((pack) => pack.name)
    .sort((left, right) => left.localeCompare(right));

  if (pointer.kind === "unset") {
    throw new ResolveActiveDiscussionPackError(buildRecoveryMessage(candidateNames, null), "unset");
  }
  // A state file that exists but cannot be read as a pointer is NOT an unset
  // pointer. Reporting it as `"unset"` would let a consumer that falls back to
  // an inferred pack (e.g. the newest one) act on a classification nothing
  // selected, because the reader collapsed "never pinned" and "pinned but
  // unreadable" into the same absent value.
  if (pointer.kind === "corrupt") {
    throw new ResolveActiveDiscussionPackError(
      buildCorruptStateMessage(candidateNames, pointer.detail),
      "corrupt",
    );
  }
  const currentId = pointer.currentId;

  const matches = candidates.filter((pack) => pack.name === currentId);
  if (matches.length === 0) {
    throw new ResolveActiveDiscussionPackError(
      buildRecoveryMessage(candidateNames, currentId),
      "dangling",
    );
  }
  if (matches.length > 1) {
    throw new ResolveActiveDiscussionPackError(
      buildDuplicateMessage(candidateNames, currentId, matches.length),
      "duplicate",
    );
  }

  const resolved = matches[0];
  if (!resolved) {
    throw new ResolveActiveDiscussionPackError(
      buildRecoveryMessage(candidateNames, currentId),
      "dangling",
    );
  }
  return resolved.path;
}

function buildRecoveryMessage(candidateNames: readonly string[], currentId: string | null): string {
  const candidateList =
    candidateNames.length > 0 ? candidateNames.join(", ") : "<none found on disk>";
  const reason =
    currentId === null
      ? "no active discussion pointer is set in .qfai/state.json#discussion.currentId"
      : `the active pointer .qfai/state.json#discussion.currentId='${currentId}' does not match any discussion pack on disk`;
  return `${reason}; candidate discussion packs: ${candidateList}; recover with: qfai discussion use <id>`;
}

function buildCorruptStateMessage(candidateNames: readonly string[], detail: string): string {
  const candidateList =
    candidateNames.length > 0 ? candidateNames.join(", ") : "<none found on disk>";
  return `the active discussion pointer cannot be read: ${detail}; candidate discussion packs: ${candidateList}; recover with: qfai discussion use <id>`;
}

function buildDuplicateMessage(
  candidateNames: readonly string[],
  currentId: string,
  count: number,
): string {
  const candidateList =
    candidateNames.length > 0 ? candidateNames.join(", ") : "<none found on disk>";
  return `the active pointer .qfai/state.json#discussion.currentId='${currentId}' resolves to ${count} duplicate pack entries; candidate discussion packs: ${candidateList}; recover with: qfai discussion use <id>`;
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
  let currentId: string | null = null;

  for (const line of lines) {
    const idMatch = /\b(OQ-\d+)\b/i.exec(line);
    if (idMatch?.[1]) {
      currentId = idMatch[1].toUpperCase();
    }

    if (currentId !== null) {
      const state = oqStates.get(currentId) ?? { disposition: null };
      const disposition = /^\s*-\s*Disposition\s*:\s*([^\s#]+)/i.exec(line)?.[1] ?? null;
      if (disposition) {
        state.disposition = disposition.toLowerCase();
      }
      oqStates.set(currentId, state);
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
