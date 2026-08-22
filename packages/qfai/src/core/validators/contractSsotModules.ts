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
 * block ("`MAX_ITERATIONS = 10`") are never mistaken for a file. Fenced code
 * and HTML comments are skipped as well, so a document that *illustrates* the
 * block format — or one that comments an obsolete route out — cannot be read as
 * declaring one.
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
 * Strip the HTML-comment regions of a single line, returning the visible
 * remainder plus whether a comment is still open at the end of it so the caller
 * can carry the state across lines.
 */
function maskLineComments(line: string, inComment: boolean): { text: string; open: boolean } {
  let visible = "";
  let index = 0;
  let open = inComment;

  while (index < line.length) {
    if (open) {
      const close = line.indexOf("-->", index);
      if (close === -1) {
        return { text: visible, open: true };
      }
      index = close + 3;
      open = false;
      continue;
    }
    const start = line.indexOf("<!--", index);
    if (start === -1) {
      visible += line.slice(index);
      break;
    }
    visible += line.slice(index, start);
    index = start + 4;
    open = true;
  }

  return { text: visible, open };
}

/**
 * Return the *content* of each line: everything that is neither fenced code
 * (the fence lines themselves included) nor inside an HTML comment is kept
 * verbatim, and every masked region becomes empty text.
 *
 * A contract that documents the `- SSOT modules:` shape by example — or a
 * `README.md` under the contracts root that quotes one — must not have its
 * illustration mistaken for real metadata; neither must a stale route the
 * author commented out with `<!--` / `-->` rather than deleting, which would
 * otherwise be resolved on disk and fail the contract for a path it no longer
 * claims. Every other Markdown extractor in this package masks comments the
 * same way (`specPackParsers.ts#maskNonSpecRegions`).
 *
 * A fence opened with backticks cannot be closed by tildes, and the closing
 * fence must be at least as long as the opening one and carry no info string,
 * per CommonMark. An unclosed fence swallows the rest of the file, which is
 * also what a Markdown renderer does. Fence state wins over comment state: a
 * `<!--` inside a fenced sample is sample text, not a comment opener, so it
 * cannot swallow the rest of the document either.
 */
function maskedContent(lines: readonly string[]): string[] {
  const content = new Array<string>(lines.length).fill("");
  let openMarker: string | null = null;
  let inComment = false;

  for (let index = 0; index < lines.length; index++) {
    const raw = lines[index] ?? "";
    if (openMarker !== null) {
      const match = FENCE_RE.exec(raw);
      const marker = match?.[1] ?? "";
      const closes =
        match !== null &&
        marker[0] === openMarker[0] &&
        marker.length >= openMarker.length &&
        (match[2] ?? "").trim().length === 0;
      if (closes) {
        openMarker = null;
      }
      continue;
    }
    const masked = maskLineComments(raw, inComment);
    inComment = masked.open;
    const fence = FENCE_RE.exec(masked.text);
    if (fence !== null) {
      openMarker = fence[1] ?? "";
      continue;
    }
    content[index] = masked.text;
  }

  return content;
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
  const firstSegment = relative.split(/[\\/]/)[0];
  if (firstSegment === ".." || path.isAbsolute(relative)) {
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
 *
 * The line that *ends* a block is handed back to the outer scan rather than
 * consumed, so a contract that documents two targets with two adjacent
 * `- SSOT modules:` blocks — no blank line between them — still has its second
 * header read. Consuming it made every entry below it invisible.
 */
export function extractSsotModuleEntries(text: string): SsotModuleEntry[] {
  const lines = text.split(/\r?\n/);
  const content = maskedContent(lines);
  const entries: SsotModuleEntry[] = [];

  for (let index = 0; index < lines.length; index++) {
    if (!BLOCK_HEADER_RE.test(content[index] ?? "")) {
      continue;
    }
    let cursor = index + 1;
    for (; cursor < lines.length; cursor++) {
      const line = lines[cursor] ?? "";
      if (line.trim().length === 0 || !/^\s/.test(line)) {
        break;
      }
      const visible = content[cursor] ?? "";
      if (!INDENTED_ITEM_RE.test(visible)) {
        continue; // continuation line, fenced sample, or commented-out entry
      }
      const modulePath = ENTRY_RE.exec(visible)?.[1];
      if (modulePath !== undefined && PATH_LIKE_RE.test(modulePath)) {
        entries.push({ modulePath, line: cursor + 1 });
      }
    }
    // `cursor` is the terminator, not part of this block: step back one so the
    // outer increment lands on it. `cursor > index` always, so the scan still
    // advances.
    index = cursor - 1;
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
