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
 * The check is deliberately narrow: it only reads entries that *look* like
 * paths, so parenthetical prose and symbol names inside the block
 * ("`MAX_ITERATIONS = 10`") are never mistaken for a file. Narrow is not the
 * same as silent, though — a rooted path is still a path, so it is read and
 * then rejected for leaving the project, never dropped. Fenced code
 * and HTML comments are skipped as well, so a document that *illustrates* the
 * block format — or one that comments an obsolete route out — cannot be read as
 * declaring one.
 */
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { collectFiles } from "../fs.js";
import { RULE_PROMOTIONS, newRuleSeverity } from "../sunset.js";
import type { Issue } from "../types.js";
import { resolveToolVersion } from "../version.js";
import { exists, issue, readSafe } from "./utils.js";

/** The release `QFAI-CONTRACT-050` stops being a warning at. */
const SSOT_MODULE_PROMOTION = RULE_PROMOTIONS.contractSsotModuleUnresolved.promoteAt;

/** `（<release> リリースまでは warning、以降は error として報告されます）`, or nothing past it. */
function promotionWindowNote(severity: "warning" | "error", promoteAt: string): string {
  return severity === "warning"
    ? `（${promoteAt} リリースまでは warning、以降は error として報告されます）`
    : "";
}

/** Opening line of the block; a top-level list item, no indentation. */
const BLOCK_HEADER_RE = /^-\s+SSOT modules:\s*$/;

/** One entry inside the block: an indented list item whose first token is backticked. */
const ENTRY_RE = /^\s+-\s+`([^`]+)`/;

/** Any indented list item — used to detect an entry that carries no backtick. */
const INDENTED_ITEM_RE = /^\s+-\s+/;

/**
 * A backticked token is treated as a path only when it is separator-joined and
 * made purely of path-safe characters. `packages/qfai/src/core/doctor.ts` is a
 * path; `resolvePlaywrightLauncher` and `MAX_ITERATIONS = 10` are not.
 */
const RELATIVE_PATH_LIKE_RE = /^[A-Za-z0-9_@.-]+(?:\/[A-Za-z0-9_@.-]+)+\/?$/;

/**
 * The same shape, rooted: a POSIX absolute path (`/etc/passwd`), a
 * drive-qualified Windows one (`C:\Users\me`, `C:/Users/me`), or a UNC share
 * (`\\server\share`). None of these can name a repository-relative module, but
 * they must still be *extracted*: an entry the matcher does not recognise is
 * an entry no gate ever sees, and silently dropping one is the single outcome
 * this validator exists to prevent. `resolveWithinRoot` then reports it as
 * leaving the project root.
 */
const ABSOLUTE_PATH_LIKE_RE =
  /^(?:\/|\\\\|[A-Za-z]:[\\/])[A-Za-z0-9_@.-]+(?:[\\/][A-Za-z0-9_@.-]+)*[\\/]?$/;

/** Whether a backticked token names a filesystem path, rooted or not. */
function isPathShaped(token: string): boolean {
  return RELATIVE_PATH_LIKE_RE.test(token) || ABSOLUTE_PATH_LIKE_RE.test(token);
}

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
 * anything that leaves it. The matcher admits `..` segments, so without this an
 * entry such as `../../etc/passwd` would resolve to a file that happens to
 * exist outside the project and pass as a valid SSOT module.
 */
export function resolveWithinRoot(root: string, modulePath: string): string | null {
  // A rooted path leaves the project by construction. Both conventions are
  // refused on every host: `path.resolve` on POSIX would otherwise reinterpret
  // a Windows path as a relative name (`C:\a` becomes `<root>/C:\a`) and report
  // it as merely missing, so a contract written on Windows would be judged by a
  // different rule than the one CI applies to it.
  if (path.posix.isAbsolute(modulePath) || path.win32.isAbsolute(modulePath)) {
    return null;
  }
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
 * The block ends at the first line of *content* that is neither an indented
 * list item nor an indented continuation of the previous entry — i.e. at the
 * next top-level list item, heading, or blank line. Continuation lines are
 * skipped rather than parsed, so a backtick in a parenthetical never becomes a
 * phantom entry.
 *
 * Termination reads the masked content, not the raw line, so that the parsing
 * rule is one rule: a region the mask removed is not content and therefore
 * cannot end anything. An unindented `<!-- … -->` sitting between two entries
 * used to terminate the block on its raw text while contributing nothing to it,
 * which left every entry below it unexamined.
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
      const visible = content[cursor] ?? "";
      if (visible.trim().length === 0) {
        // Nothing visible here. A genuinely blank line closes the block; a line
        // the mask emptied — an HTML comment between two entries, or a fenced
        // sample — carries no content, so the block continues past it.
        if ((lines[cursor] ?? "").trim().length === 0) {
          break;
        }
        continue;
      }
      if (!/^\s/.test(visible)) {
        break; // the next top-level list item or heading
      }
      if (!INDENTED_ITEM_RE.test(visible)) {
        continue; // continuation line, or an entry whose text was masked away
      }
      const modulePath = ENTRY_RE.exec(visible)?.[1];
      if (modulePath !== undefined && isPathShaped(modulePath)) {
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
 *
 * Nothing resolved these paths before, so every contract written under the old
 * silence carries whatever route was true when it was authored — a rename that
 * happened releases ago surfaces here all at once. Severity therefore comes
 * from the promotion window (`RULE_PROMOTIONS.contractSsotModuleUnresolved`)
 * rather than a literal beside the call, so an upgrade reports the backlog
 * without latching a consuming repository's `--fail-on error` gate. The finding
 * names the release that ends the window while it is open.
 */
export async function validateContractSsotModules(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const contractsRoot = resolvePath(root, config, "contractsDir");
  const files = await collectFiles(contractsRoot, { extensions: [".md"] });
  const issues: Issue[] = [];
  // `resolveToolVersion` resolves rather than rejects — a read failure returns
  // `"unknown"`, which the comparator reads as inside the window, so an
  // unreadable version can never be what escalates this into a build failure.
  const ssotModuleSeverity = newRuleSeverity(await resolveToolVersion(), SSOT_MODULE_PROMOTION);
  const windowNote = promotionWindowNote(ssotModuleSeverity, SSOT_MODULE_PROMOTION);

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
            `契約の SSOT modules がプロジェクトルート外を参照しています: ${entry.modulePath}${windowNote}`,
            ssotModuleSeverity,
            relFile,
            "contracts.ssotModuleExists",
            [entry.modulePath],
            "canonical",
            "SSOT modules はプロジェクトルート相対の実装経路のみを指せます。絶対パス (`/…`, `C:\\…`, `\\\\…`) や `..` で外へ出るパスではなく、ルート相対のパスに修正してください。",
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
          `契約の SSOT modules が存在しないパスを参照しています: ${entry.modulePath}${windowNote}`,
          ssotModuleSeverity,
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
