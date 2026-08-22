import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { resolvePath, type QfaiConfig } from "../config.js";
import type { Issue } from "../types.js";
import { exists, issue } from "./utils.js";

/**
 * Anchor integrity across the assistant tree.
 *
 * The tree is held together by `file.md#anchor` citations: a SKILL delegates to
 * its `references/`, a reference cites a constitution section, an agent cites a
 * skill section. Nothing checked that the cited section still exists. A
 * vendored tree refreshed in part leaves a newer rule citing a heading the
 * older document beside it never had, and the failure is silent — not a link an
 * agent notices, but an instruction that does nothing.
 *
 * Scope is deliberately anchor integrity, not file existence. A citation whose
 * target this rule cannot place inside the assistant tree is skipped: the tree
 * also cites the consumer's own spec packs and evidence files, which are not
 * QFAI's to require.
 */

/** Heading text with the markup GitHub drops before it slugs. */
const HEADING_RE = /^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/;

/** A ``` or ~~~ run that opens a fenced block, with or without an info string. */
const FENCE_OPEN_RE = /^ {0,3}(`{3,}|~{3,})/;

/** A bare fence run — the only line shape that can close a block. */
const FENCE_CLOSE_RE = /^ {0,3}(`{3,}|~{3,})[ \t]*$/;

/**
 * A `path.md#` citation anywhere on a line — inside backticks, inside a
 * markdown link target, or bare in prose. The tree writes all three. The
 * fragment after `#` is read by {@link fragmentAt} rather than by this pattern,
 * because how far it runs depends on what encloses the citation.
 */
const ANCHOR_REFERENCE_RE = /(?<![A-Za-z0-9._/-])((?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]+\.md)#/g;

/**
 * What ends a fragment written bare in prose or inside a markdown link target.
 *
 * Inside an inline code span the span's own closing run ends it instead, so a
 * space is not a terminator there — the tree writes `` `04_Sources.md#Trend
 * Scan` `` to name a prose section, and cutting that fragment at the space
 * would leave a slug-shaped `trend` that never was the citation.
 */
const FRAGMENT_TERMINATOR_RE = /[\s`()[\]{}<>"'|\\]/;

/** Sentence punctuation that trails a bare-prose citation rather than belonging to it. */
const TRAILING_PUNCTUATION_RE = /[.,;:!?]+$/;

/**
 * The shape a GitHub heading slug can take: lowercase, digits, `-` and `_`.
 *
 * An anchor outside it is not a heading citation at all. The tree writes
 * `06_Test-Cases.md#Level` and `04_Sources.md#Trend Scan` to name a table
 * column and a prose section, and GitHub would never resolve either. Checking
 * them would report drift that does not exist.
 */
const GITHUB_SLUG_SHAPE_RE = /^[a-z0-9][a-z0-9_-]*$/;

/** One anchored citation, with the 1-based line it was written on. */
export type AnchorReference = {
  readonly line: number;
  readonly targetPath: string;
  readonly anchor: string;
};

/**
 * A heading's GitHub slug.
 *
 * Backticks and `**` come off **before** punctuation is removed — several real
 * headings carry both, and stripping punctuation first would eat the words
 * inside the code spans along with the delimiters.
 */
export function slugifyHeading(heading: string): string {
  return heading
    .replace(/`/g, "")
    .replace(/\*\*/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\- ]+/g, "")
    .replace(/ /g, "-");
}

/**
 * Every line of `body` outside a fenced code block, 1-based.
 *
 * A fence closes only on the **same marker character** at **at least the
 * opening length**, exactly as `maskFencedCodeBlocks` does it. Toggling on any
 * ``` / ~~~ line ended a ```` ```` ```` block at the ```` ``` ```` sample
 * legally quoted inside it, and every citation in the rest of that block was
 * then read as a real one — a document that only ever showed `file.md#missing`
 * as an example failed the rule.
 */
function* contentLines(body: string): Generator<{ line: number; text: string }> {
  let open: { marker: string; length: number } | null = null;
  const lines = body.split(/\r?\n/);
  for (let index = 0; index < lines.length; index++) {
    const text = lines[index] ?? "";
    if (open === null) {
      const opening = FENCE_OPEN_RE.exec(text);
      if (opening !== null) {
        const fence = opening[1] ?? "";
        open = { marker: fence.charAt(0), length: fence.length };
        continue;
      }
      yield { line: index + 1, text };
      continue;
    }
    const closing = FENCE_CLOSE_RE.exec(text);
    const fence = closing?.[1] ?? "";
    if (fence.charAt(0) === open.marker && fence.length >= open.length) open = null;
  }
}

/**
 * The slug of every heading in `body`, fenced examples excluded.
 *
 * Repeats carry GitHub's disambiguation: the first `## Entry` keeps `entry` and
 * each later one takes `entry-1`, `entry-2`, … in document order. Without it a
 * working `file.md#entry-1` citation was reported as dangling.
 */
export function collectHeadingSlugs(body: string): Set<string> {
  const occurrences = new Map<string, number>();
  const slugs = new Set<string>();
  for (const { text } of contentLines(body)) {
    const match = HEADING_RE.exec(text);
    const heading = match?.[2];
    if (heading === undefined) continue;
    const base = slugifyHeading(heading);
    if (base === "") continue;
    const seen = occurrences.get(base) ?? 0;
    occurrences.set(base, seen + 1);
    slugs.add(seen === 0 ? base : `${base}-${String(seen)}`);
  }
  return slugs;
}

/** The body of every inline code span on `text`, as `[start, end)` offsets. */
function codeSpans(text: string): Array<readonly [number, number]> {
  const spans: Array<readonly [number, number]> = [];
  let cursor = 0;
  while (cursor < text.length) {
    if (text.charAt(cursor) !== "`") {
      cursor += 1;
      continue;
    }
    const openStart = cursor;
    while (text.charAt(cursor) === "`") cursor += 1;
    const runLength = cursor - openStart;
    const bodyStart = cursor;
    let closed = false;
    while (cursor < text.length && !closed) {
      if (text.charAt(cursor) !== "`") {
        cursor += 1;
        continue;
      }
      const runStart = cursor;
      while (text.charAt(cursor) === "`") cursor += 1;
      if (cursor - runStart === runLength) {
        spans.push([bodyStart, runStart]);
        closed = true;
      }
    }
  }
  return spans;
}

/**
 * The whole fragment a citation carries, starting just after its `#`.
 *
 * Reading only the slug-shaped prefix cut `guide.md#install notes` down to
 * `install` — a prose reference this rule does not own, reported as dangling —
 * and let `guide.md#install.invalid` pass on an `install` heading it never
 * resolves to. The fragment runs to the end of the enclosing code span, or in
 * prose to the first delimiter, and the shape test then sees all of it.
 */
function fragmentAt(text: string, spans: readonly (readonly [number, number])[], start: number) {
  const span = spans.find(([from, to]) => start >= from && start <= to);
  if (span !== undefined) return text.slice(start, span[1]);
  let end = start;
  while (end < text.length && !FRAGMENT_TERMINATOR_RE.test(text.charAt(end))) end += 1;
  return text.slice(start, end).replace(TRAILING_PUNCTUATION_RE, "");
}

/** Every anchored citation in `body` that is shaped like a heading slug. */
export function collectAnchorReferences(body: string): AnchorReference[] {
  const references: AnchorReference[] = [];
  for (const { line, text } of contentLines(body)) {
    const spans = codeSpans(text);
    for (const match of text.matchAll(ANCHOR_REFERENCE_RE)) {
      const targetPath = match[1];
      if (targetPath === undefined) continue;
      const anchor = fragmentAt(text, spans, match.index + match[0].length);
      if (!GITHUB_SLUG_SHAPE_RE.test(anchor)) continue;
      references.push({ line, targetPath, anchor });
    }
  }
  return references;
}

/**
 * Structural damage under `.qfai/assistant/**` — a path component that is not a
 * directory, or a symlink cycle — plus plain absence.
 *
 * Those three belong to `QFAI-LINK-001`, which runs first in every profile and
 * names the path and the repair. Anything else — `EACCES` on a subtree, a
 * transient `EIO` — leaves the listing incomplete without saying so, and
 * swallowing it dropped the documents under it from the index, where every
 * citation into them then resolved to `null` and passed in silence.
 */
function isStructuralDamage(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException | null)?.code;
  return code === "ENOENT" || code === "ENOTDIR" || code === "ELOOP" || code === "EISDIR";
}

/**
 * Markdown files under `dir`.
 *
 * A subtree damaged in the ways `QFAI-LINK-001` reports is skipped rather than
 * thrown out of: raising `ENOTDIR` / `ELOOP` from here would reject the run and
 * take that finding with it. Every other read failure propagates — see
 * {@link isStructuralDamage}. Symlinked entries are listed but never descended
 * into, so a cycle cannot trap the walk.
 */
async function collectMarkdownFiles(dir: string, out: string[] = []): Promise<string[]> {
  let entries: Dirent[];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (isStructuralDamage(error)) return out;
    throw error;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectMarkdownFiles(full, out);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      out.push(full);
    }
  }
  return out;
}

/** One indexed document: what it cites, and what can be cited in it. */
type IndexedDocument = {
  readonly slugs: Set<string>;
  readonly references: readonly AnchorReference[];
};

type TreeIndex = {
  /** Absolute path → its headings and its citations. */
  readonly documents: Map<string, IndexedDocument>;
  /** Lowercased basename → every absolute path carrying it. */
  readonly byBasename: Map<string, string[]>;
};

async function buildTreeIndex(files: readonly string[]): Promise<TreeIndex> {
  const documents = new Map<string, IndexedDocument>();
  const byBasename = new Map<string, string[]>();
  for (const file of files) {
    let body: string;
    try {
      body = await readFile(file, "utf-8");
    } catch (error) {
      // Unreadable for the same reasons a directory is unlistable, and owned by
      // the same rule. Absent from the index, so citations to it are skipped
      // rather than reported against a document nobody could read. Only the
      // structural codes: a permission or I/O failure is not a clean answer.
      if (isStructuralDamage(error)) continue;
      throw error;
    }
    const absolute = path.resolve(file);
    documents.set(absolute, {
      slugs: collectHeadingSlugs(body),
      references: collectAnchorReferences(body),
    });
    const key = path.basename(file).toLowerCase();
    byBasename.set(key, [...(byBasename.get(key) ?? []), absolute]);
  }
  return { documents, byBasename };
}

/** The `skills/<id>/` directory owning `file`, when it sits under one. */
function owningSkillDir(skillsDir: string, file: string): string | null {
  const relative = path.relative(skillsDir, path.dirname(file));
  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) return null;
  const skillId = relative.split(path.sep)[0];
  return skillId === undefined || skillId === "" ? null : path.join(skillsDir, skillId);
}

type ResolutionRoots = {
  readonly root: string;
  readonly assistantDir: string;
  readonly skillsDir: string;
};

/**
 * Whether `absolute` is a template the tree instantiates into the consumer's
 * own artifacts.
 *
 * `templates/04_Sources.md` is copied out to become a discussion pack's
 * `04_Sources.md`, so a bare `04_Sources.md#…` citation names the consumer's
 * copy — not QFAI's. Resolving it against the template validated the citation
 * against a document the consumer never sees, and made a heading change inside
 * the template report a `QFAI-LINK-002` against a consumer-owned reference.
 */
function isTemplateDocument(assistantDir: string, absolute: string): boolean {
  const relative = path.relative(assistantDir, absolute);
  return relative.split(path.sep).includes("templates");
}

/**
 * The document a citation names, or `null` when it names none in the tree.
 *
 * The tree mixes every spelling, so each is tried in turn: relative to the
 * citing file, to its own skill directory (which is how a bare `SKILL.md`
 * resolves), to the skills root, to the assistant root, and to the repository
 * root. The basename fallback comes last, only when the name is unique — there
 * are four `SKILL.md`, and matching one of them by name alone would silently
 * validate a citation against the wrong document — and only when the match is
 * QFAI's own document rather than a template standing in for a consumer
 * artifact.
 */
function resolveTarget(
  index: TreeIndex,
  roots: ResolutionRoots,
  citingFile: string,
  targetPath: string,
): string | null {
  const skillDir = owningSkillDir(roots.skillsDir, citingFile);
  const bases = [
    path.dirname(citingFile),
    ...(skillDir === null ? [] : [skillDir]),
    roots.skillsDir,
    roots.assistantDir,
    roots.root,
  ];
  for (const base of bases) {
    const candidate = path.resolve(base, targetPath);
    if (index.documents.has(candidate)) return candidate;
  }
  if (targetPath.includes("/")) return null;
  const sameName = index.byBasename.get(targetPath.toLowerCase()) ?? [];
  const only = sameName.length === 1 ? (sameName[0] ?? null) : null;
  if (only === null || isTemplateDocument(roots.assistantDir, only)) return null;
  return only;
}

export async function validateAssistantAnchorReferences(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const skillsDir = resolvePath(root, config, "skillsDir");
  const assistantDir = path.dirname(skillsDir);
  if (!(await exists(assistantDir))) return [];

  const files = await collectMarkdownFiles(assistantDir);
  const index = await buildTreeIndex(files);
  const roots: ResolutionRoots = { root, assistantDir, skillsDir };

  const issues: Issue[] = [];
  for (const [citingFile, document] of index.documents) {
    issues.push(...danglingIssues(index, roots, citingFile, document.references));
  }
  return issues;
}

function danglingIssues(
  index: TreeIndex,
  roots: ResolutionRoots,
  citingFile: string,
  references: readonly AnchorReference[],
): Issue[] {
  const relativeCiting = toRelative(roots.root, citingFile);
  const issues: Issue[] = [];
  for (const reference of references) {
    const target = resolveTarget(index, roots, citingFile, reference.targetPath);
    if (target === null) continue;
    if (index.documents.get(target)?.slugs.has(reference.anchor) === true) continue;
    issues.push(danglingIssue(roots.root, relativeCiting, target, reference));
  }
  return issues;
}

function danglingIssue(
  root: string,
  relativeCiting: string,
  target: string,
  reference: AnchorReference,
): Issue {
  const citation = `${reference.targetPath}#${reference.anchor}`;
  const relativeTarget = toRelative(root, target);
  return issue(
    "QFAI-LINK-002",
    `${relativeCiting}:${String(reference.line)} が参照する \`${citation}\` は解決できません。参照先 ${relativeTarget} に slug が \`${reference.anchor}\` と一致する見出しがありません。エージェントはこの引用をたどった先で該当節を見つけられず、指示は黙って何も適用しません。`,
    "error",
    relativeCiting,
    "assistantAnchorReferences.dangling",
    [citation],
    "canonical",
    "引用元と参照先のどちらが古いかを確認してください。vendored tree が部分的にしか再同期されていない場合、新しい規則が古いドキュメントに存在しない節を引用します。`qfai init` を再実行して `.qfai/assistant/**` を揃えるか、引用を参照先の現在の見出しに合わせて更新してください。",
    { relatedFiles: [relativeTarget], loc: { line: reference.line } },
  );
}

function toRelative(root: string, absolute: string): string {
  return path.relative(root, absolute).split(path.sep).join("/");
}
