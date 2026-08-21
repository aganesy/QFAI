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

/** ``` or ~~~ opening or closing a fenced block. */
const FENCE_RE = /^\s{0,3}(?:```|~~~)/;

/**
 * A `path.md#anchor` citation anywhere on a line — inside backticks, inside a
 * markdown link target, or bare in prose. The tree writes all three.
 */
const ANCHOR_REFERENCE_RE =
  /(?<![A-Za-z0-9._/-])((?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]+\.md)#([A-Za-z0-9_-]+)/g;

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

/** Every line of `body` outside a fenced code block, 1-based. */
function* contentLines(body: string): Generator<{ line: number; text: string }> {
  let fenced = false;
  const lines = body.split(/\r?\n/);
  for (let index = 0; index < lines.length; index++) {
    const text = lines[index] ?? "";
    if (FENCE_RE.test(text)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    yield { line: index + 1, text };
  }
}

/** The slug of every heading in `body`, fenced examples excluded. */
export function collectHeadingSlugs(body: string): Set<string> {
  const slugs = new Set<string>();
  for (const { text } of contentLines(body)) {
    const match = HEADING_RE.exec(text);
    const heading = match?.[2];
    if (heading === undefined) continue;
    const slug = slugifyHeading(heading);
    if (slug !== "") slugs.add(slug);
  }
  return slugs;
}

/** Every anchored citation in `body` that is shaped like a heading slug. */
export function collectAnchorReferences(body: string): AnchorReference[] {
  const references: AnchorReference[] = [];
  for (const { line, text } of contentLines(body)) {
    for (const match of text.matchAll(ANCHOR_REFERENCE_RE)) {
      const targetPath = match[1];
      const anchor = match[2];
      if (targetPath === undefined || anchor === undefined) continue;
      if (!GITHUB_SLUG_SHAPE_RE.test(anchor)) continue;
      references.push({ line, targetPath, anchor });
    }
  }
  return references;
}

/**
 * Markdown files under `dir`.
 *
 * A subtree this cannot list is skipped rather than thrown out of. Structural
 * damage under `.qfai/assistant/**` belongs to `QFAI-LINK-001`, which runs
 * first in every profile and names the path and the repair; raising `ENOTDIR` /
 * `ELOOP` from here would reject the run and take that finding with it.
 * Symlinked entries are listed but never descended into, so a cycle cannot trap
 * the walk.
 */
async function collectMarkdownFiles(dir: string, out: string[] = []): Promise<string[]> {
  let entries: Dirent[];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
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
    } catch {
      // Unreadable for the same reasons a directory is unlistable, and owned by
      // the same rule. Absent from the index, so citations to it are skipped
      // rather than reported against a document nobody could read.
      continue;
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
 * The document a citation names, or `null` when it names none in the tree.
 *
 * The tree mixes every spelling, so each is tried in turn: relative to the
 * citing file, to its own skill directory (which is how a bare `SKILL.md`
 * resolves), to the skills root, to the assistant root, and to the repository
 * root. The basename fallback comes last and only when the name is unique —
 * there are four `SKILL.md`, and matching one of them by name alone would
 * silently validate a citation against the wrong document.
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
  return sameName.length === 1 ? (sameName[0] ?? null) : null;
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
