/**
 * `- SSOT modules:` link-integrity validator for `.qfai/contracts/**`.
 *
 * Every contract may open with an `- SSOT modules:` block naming the
 * implementation files that carry the truth for the documented surface. The
 * block is a routing device: it tells whoever is about to change behaviour
 * which file to edit alongside the contract. Nothing resolved those paths, so
 * a renamed — or never written — module left the contract asserting a plausible
 * path forever, and the reader got no error, only a dead end.
 *
 * The check is deliberately narrow: it only resolves entries that *look* like
 * repository-relative paths, so parenthetical prose and symbol names inside the
 * block ("`MAX_ITERATIONS = 10`") are never mistaken for a file. Fenced code is
 * skipped as well, so a document that *illustrates* the block format cannot be
 * read as declaring one.
 */
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { collectFiles } from "../fs.js";
import type { Issue } from "../types.js";
import { exists, issue, readSafe } from "./utils.js";

/** Opening line of the block; a top-level list item, no indentation. */
const BLOCK_HEADER_RE = /^-\s+SSOT modules:\s*$/;

/** One entry inside the block: an indented list item whose first token is backticked. */
const ENTRY_RE = /^\s+-\s+`([^`]+)`/;

/** Any indented list item — used to detect an entry that carries no backtick. */
const INDENTED_ITEM_RE = /^\s+-\s+/;

/**
 * A backticked token is treated as a path only when it is slash-separated and
 * made purely of path-safe characters. `packages/qfai/src/core/doctor.ts` is a
 * path; `resolvePlaywrightLauncher` and `MAX_ITERATIONS = 10` are not.
 */
const PATH_LIKE_RE = /^[A-Za-z0-9_@.-]+(?:\/[A-Za-z0-9_@.-]+)+\/?$/;

/** An opening or closing fence: three or more backticks or tildes. */
const FENCE_RE = /^\s{0,3}(`{3,}|~{3,})\s*(.*)$/;

/**
 * Mark every line that sits inside a fenced code block (the fence lines
 * themselves included). A contract that documents the `- SSOT modules:` shape
 * by example — or a `README.md` under the contracts root that quotes one — must
 * not have its illustration mistaken for real metadata.
 *
 * A fence opened with backticks cannot be closed by tildes, and the closing
 * fence must be at least as long as the opening one and carry no info string,
 * per CommonMark. An unclosed fence swallows the rest of the file, which is
 * also what a Markdown renderer does.
 */
function markFencedLines(lines: readonly string[]): boolean[] {
  const fenced = new Array<boolean>(lines.length).fill(false);
  let openMarker: string | null = null;

  for (let index = 0; index < lines.length; index++) {
    const match = FENCE_RE.exec(lines[index] ?? "");
    if (openMarker === null) {
      if (match) {
        openMarker = match[1] ?? "";
        fenced[index] = true;
      }
      continue;
    }
    fenced[index] = true;
    const marker = match?.[1] ?? "";
    const closes =
      match !== null &&
      marker[0] === openMarker[0] &&
      marker.length >= openMarker.length &&
      (match[2] ?? "").trim().length === 0;
    if (closes) {
      openMarker = null;
    }
  }

  return fenced;
}

/**
 * Resolve a contract-declared module path against the project root, refusing
 * anything that leaves it. `PATH_LIKE_RE` admits `..` segments, so without this
 * an entry such as `../../etc/passwd` would resolve to a file that happens to
 * exist outside the project and pass as a valid SSOT module.
 */
export function resolveWithinRoot(root: string, modulePath: string): string | null {
  const rootAbs = path.resolve(root);
  const resolved = path.resolve(rootAbs, modulePath);
  const relative = path.relative(rootAbs, resolved);
  if (relative.length === 0) {
    return null; // the root itself is not a module
  }
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }
  return resolved;
}

export type SsotModuleEntry = {
  /** Path exactly as written in the contract. */
  readonly modulePath: string;
  /** 1-based line number of the entry inside the contract file. */
  readonly line: number;
};

/**
 * Extract the path-like entries of every `- SSOT modules:` block in `text`.
 *
 * The block ends at the first line that is neither an indented list item nor an
 * indented continuation of the previous entry — i.e. at the next top-level list
 * item, heading, or blank line. Continuation lines are skipped rather than
 * parsed, so a backtick in a parenthetical never becomes a phantom entry.
 */
export function extractSsotModuleEntries(text: string): SsotModuleEntry[] {
  const lines = text.split(/\r?\n/);
  const fenced = markFencedLines(lines);
  const entries: SsotModuleEntry[] = [];

  for (let index = 0; index < lines.length; index++) {
    if (fenced[index] === true || !BLOCK_HEADER_RE.test(lines[index] ?? "")) {
      continue;
    }
    let cursor = index + 1;
    for (; cursor < lines.length; cursor++) {
      const line = lines[cursor] ?? "";
      if (line.trim().length === 0 || !/^\s/.test(line)) {
        break;
      }
      if (fenced[cursor] === true || !INDENTED_ITEM_RE.test(line)) {
        continue; // continuation line of the previous entry
      }
      const modulePath = ENTRY_RE.exec(line)?.[1];
      if (modulePath !== undefined && PATH_LIKE_RE.test(modulePath)) {
        entries.push({ modulePath, line: cursor + 1 });
      }
    }
    index = cursor;
  }

  return entries;
}

/**
 * Report every `- SSOT modules:` entry under the contracts root that does not
 * resolve on disk, relative to the project root — and every entry that resolves
 * only by escaping that root.
 */
export async function validateContractSsotModules(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const contractsRoot = resolvePath(root, config, "contractsDir");
  const files = await collectFiles(contractsRoot, { extensions: [".md"] });
  const issues: Issue[] = [];

  for (const file of files.sort((a, b) => a.localeCompare(b))) {
    const text = await readSafe(file);
    if (text.trim().length === 0) {
      continue;
    }
    const relFile = path.relative(root, file).replace(/\\/g, "/");
    for (const entry of extractSsotModuleEntries(text)) {
      const resolved = resolveWithinRoot(root, entry.modulePath);
      if (resolved === null) {
        issues.push(
          issue(
            "QFAI-CONTRACT-050",
            `契約の SSOT modules がプロジェクトルート外を参照しています: ${entry.modulePath}`,
            "error",
            relFile,
            "contracts.ssotModuleExists",
            [entry.modulePath],
            "canonical",
            "SSOT modules はプロジェクトルート相対の実装経路のみを指せます。`..` で外へ出ないパスに修正してください。",
            { loc: { line: entry.line } },
          ),
        );
        continue;
      }
      if (await exists(resolved)) {
        continue;
      }
      issues.push(
        issue(
          "QFAI-CONTRACT-050",
          `契約の SSOT modules が存在しないパスを参照しています: ${entry.modulePath}`,
          "error",
          relFile,
          "contracts.ssotModuleExists",
          [entry.modulePath],
          "canonical",
          "実装の現在地に合わせてパスを修正するか、未実装の分割案であればパスではなく意図として記述してください。",
          { loc: { line: entry.line } },
        ),
      );
    }
  }

  return issues;
}
