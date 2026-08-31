import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { resolvePath, type QfaiConfig } from "../config.js";
import { newRuleSeverity, RULE_PROMOTIONS } from "../sunset.js";
import type { Issue } from "../types.js";
import { resolveToolVersion } from "../version.js";
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
 * Scope is what the tree owns. A citation whose target this rule cannot place
 * inside the assistant tree is skipped: the tree also cites the consumer's own
 * spec packs and evidence files, which are not QFAI's to require. A citation
 * that does name a document inside the tree is held to both halves — the file
 * is there, and the heading is in it.
 *
 * Citations are read out of the tree's Markdown and out of the YAML manifests
 * that carry Markdown bodies. `manifest/agent-catalog.yml` holds every agent's
 * `developer_instructions`, an installed project may let it drift from the
 * canonical agent document, and its citations are runtime instructions like any
 * other.
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

/** An inline image — its `alt` never reaches the rendered heading text. */
const INLINE_IMAGE_RE = /!\[[^\]]*\]\([^()]*\)/g;

/** An inline link: the target is markup, the label is the heading's text. */
const INLINE_LINK_RE = /\[([^\]]*)\]\([^()]*\)/g;

/** A reference link — same story, with the target held in a label. */
const REFERENCE_LINK_RE = /\[([^\]]*)\]\[[^\]]*\]/g;

/**
 * A heading's GitHub slug.
 *
 * GitHub slugs the heading's **rendered text**, so inline markup is unwrapped
 * to what it renders as before anything else: `## [Install](setup.md)` is the
 * anchor `install`, not the `installsetupmd` that survives stripping the
 * punctuation out of the source line — which both reported a working
 * `guide.md#install` as dangling and let a `#installsetupmd` that exists
 * nowhere pass.
 *
 * Backticks and `**` come off **before** punctuation is removed — several real
 * headings carry both, and stripping punctuation first would eat the words
 * inside the code spans along with the delimiters.
 */
export function slugifyHeading(heading: string): string {
  return heading
    .replace(INLINE_IMAGE_RE, "")
    .replace(INLINE_LINK_RE, "$1")
    .replace(REFERENCE_LINK_RE, "$1")
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
 *
 * The suffix advances until the slug is free across the **whole document**, not
 * just across that base's own repeats. `## Entry-1` before two `## Entry`
 * headings already owns `entry-1`, so the second `## Entry` takes `entry-2` —
 * counting the base alone re-issued `entry-1` and left the citation that does
 * resolve, `file.md#entry-2`, reported as dangling.
 */
export function collectHeadingSlugs(body: string): Set<string> {
  const taken = new Map<string, number>();
  for (const { text } of contentLines(body)) {
    const match = HEADING_RE.exec(text);
    const heading = match?.[2];
    if (heading === undefined) continue;
    const base = slugifyHeading(heading);
    if (base === "") continue;
    let slug = base;
    while (taken.has(slug)) {
      const next = (taken.get(base) ?? 0) + 1;
      taken.set(base, next);
      slug = `${base}-${String(next)}`;
    }
    taken.set(slug, 0);
  }
  return new Set(taken.keys());
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
 * The extensions that can hold a citation.
 *
 * `.yml` / `.yaml` is here because `manifest/agent-catalog.yml` carries whole
 * agent bodies in `developer_instructions`, complete with the runtime citations
 * those bodies make. `qfai-configure` edits the manifest, and an installed
 * project is allowed to let it drift from the canonical agent Markdown, so a
 * citation added or changed on the manifest side alone existed in no `.md` file
 * and was checked by nothing.
 */
const CITING_EXTENSIONS = new Set([".yml", ".yaml"]);

/** What the walk found: the documents, the citing manifests, and the shape of the tree. */
type TreeFiles = {
  readonly markdown: string[];
  readonly yaml: string[];
  /**
   * Every directory the walk listed.
   *
   * A relative citation is told apart from a consumer-relative one by whether
   * the directory it names is part of the tree — see {@link resolveTarget}.
   */
  readonly directories: Set<string>;
};

function emptyTreeFiles(): TreeFiles {
  return { markdown: [], yaml: [], directories: new Set() };
}

/**
 * Every file under `dir` this rule reads, and every directory it listed.
 *
 * A subtree damaged in the ways `QFAI-LINK-001` reports is skipped rather than
 * thrown out of: raising `ENOTDIR` / `ELOOP` from here would reject the run and
 * take that finding with it. Every other read failure propagates — see
 * {@link isStructuralDamage}. Symlinked entries are listed but never descended
 * into, so a cycle cannot trap the walk.
 */
async function collectTreeFiles(
  dir: string,
  out: TreeFiles = emptyTreeFiles(),
): Promise<TreeFiles> {
  let entries: Dirent[];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (isStructuralDamage(error)) return out;
    throw error;
  }
  out.directories.add(path.resolve(dir));
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectTreeFiles(full, out);
      continue;
    }
    if (!entry.isFile()) continue;
    const extension = path.extname(entry.name).toLowerCase();
    if (extension === ".md") {
      out.markdown.push(full);
    } else if (CITING_EXTENSIONS.has(extension)) {
      out.yaml.push(full);
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
  /**
   * Lowercased basename → every absolute path carrying it.
   *
   * The key is folded only so that names differing in case are grouped and
   * weighed for ambiguity together; the fallback still compares the basename
   * exactly before it binds one. See {@link resolveTarget}.
   */
  readonly byBasename: Map<string, string[]>;
  /** Every directory the walk listed — see {@link TreeFiles.directories}. */
  readonly directories: ReadonlySet<string>;
};

/**
 * Read a file the walk listed, or `null` when it is damaged the way
 * `QFAI-LINK-001` reports.
 *
 * Absent from the index, so citations to it are skipped rather than reported
 * against a document nobody could read. Only the structural codes: a permission
 * or I/O failure is not a clean answer.
 */
async function readIndexed(file: string): Promise<string | null> {
  try {
    return await readFile(file, "utf-8");
  } catch (error) {
    if (isStructuralDamage(error)) return null;
    throw error;
  }
}

/**
 * Index the tree: Markdown documents both cite and are cited, YAML manifests
 * only cite.
 *
 * A manifest is indexed with no slugs and is left out of `byBasename`, because
 * nothing can name one: {@link ANCHOR_REFERENCE_RE} only matches a `.md`
 * target. It is in `documents` so that the citation pass, which walks that map,
 * reads it — the manifest is a citing file, never a cited one.
 *
 * Scanning the manifest's raw text rather than its parsed fields is deliberate:
 * a `foo.md#slug` in it is a citation whichever field carries it, and the line
 * the finding reports is then the line of the file the operator opens.
 */
async function buildTreeIndex(files: TreeFiles): Promise<TreeIndex> {
  const documents = new Map<string, IndexedDocument>();
  const byBasename = new Map<string, string[]>();
  for (const file of files.markdown) {
    const body = await readIndexed(file);
    if (body === null) continue;
    const absolute = path.resolve(file);
    documents.set(absolute, {
      slugs: collectHeadingSlugs(body),
      references: collectAnchorReferences(body),
    });
    const key = path.basename(file).toLowerCase();
    byBasename.set(key, [...(byBasename.get(key) ?? []), absolute]);
  }
  for (const file of files.yaml) {
    const body = await readIndexed(file);
    if (body === null) continue;
    documents.set(path.resolve(file), {
      slugs: new Set(),
      references: collectAnchorReferences(body),
    });
  }
  return { documents, byBasename, directories: files.directories };
}

/** Whether `candidate` sits strictly under `dir`. */
function isUnder(dir: string, candidate: string): boolean {
  const relative = path.relative(dir, candidate);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

/** The `skills/<id>/` directory owning `file`, when it sits under one. */
function owningSkillDir(skillsDir: string, file: string): string | null {
  const dirname = path.dirname(file);
  if (!isUnder(skillsDir, dirname)) return null;
  const skillId = path.relative(skillsDir, dirname).split(path.sep)[0];
  return skillId === undefined || skillId === "" ? null : path.join(skillsDir, skillId);
}

/**
 * The directory this rule walks.
 *
 * `paths.skillsDir` is configurable, and the canonical `.qfai/assistant/skills`
 * puts the rest of the tree — constitution, catalog, agents — one level above
 * it. Taking that parent unconditionally handed the walk the repository root
 * for a project that relocates skills to `skills/`, and the directory *above*
 * the repository for `skillsDir: "."`: every spec, README and user document
 * then counted as assistant tree, and a `README.md#missing` that is nobody's
 * business here became a `QFAI-LINK-002` in every profile. The parent is the
 * tree only when it is the `assistant` directory the layout names; anywhere
 * else the configured skills root is the whole of it.
 */
function resolveAssistantDir(skillsDir: string): string {
  const parent = path.dirname(skillsDir);
  return path.basename(parent) === "assistant" ? parent : skillsDir;
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
 * What a citation names.
 *
 * `outside` covers everything this rule declines to own: the consumer's spec
 * packs, its evidence files, and any bare name that could be either.
 */
type Resolution =
  | { readonly kind: "document"; readonly path: string }
  | { readonly kind: "missing"; readonly path: string }
  | { readonly kind: "outside" };

const OUTSIDE: Resolution = { kind: "outside" };

/**
 * The document a citation names, when the tree holds one.
 *
 * The tree mixes every spelling, so each is tried in turn: relative to the
 * citing file, to its own skill directory (which is how a bare `SKILL.md`
 * resolves), to the skills root, to the assistant root, and to the repository
 * root. The basename fallback comes last, only when the name is unique — there
 * are four `SKILL.md`, and matching one of them by name alone would silently
 * validate a citation against the wrong document — and only when the match is
 * QFAI's own document rather than a template standing in for a consumer
 * artifact.
 *
 * A path spelled from the repository root **into** the assistant tree is not
 * ambiguous the way a bare name is: `.qfai/assistant/constitution/missing.md`
 * can only be QFAI's own document, so an absent one is reported rather than
 * skipped. Nothing else guarantees it exists — `QFAI-LINK-001` covers the
 * symlinked entrypoints, not every document the tree cites.
 *
 * A **relative** path is the same claim written the short way, and it needs the
 * same answer: `skills/qfai-sdd/SKILL.md` citing `references/missing.md#rule`
 * names a document the tree owns, and re-reading it from the repository root
 * alone placed it outside and let a deleted or renamed reference file pass in
 * silence. It is told apart from a consumer-relative citation — `tdd/…`,
 * `.qfai/evidence/…`, which the tree also writes — by whether the directory it
 * names is one the walk listed. `references/` under that skill is; `tdd/` is
 * not, from any base.
 *
 * The basename comparison is case-exact even though the index is keyed folded:
 * a unique `workflow.md` cited as `Workflow.md#entry` does not resolve in a
 * case-sensitive checkout, and binding it here passed a citation that is
 * dangling everywhere the tree is actually consumed.
 */
function resolveTarget(
  index: TreeIndex,
  roots: ResolutionRoots,
  citingFile: string,
  targetPath: string,
): Resolution {
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
    if (index.documents.has(candidate)) return { kind: "document", path: candidate };
  }
  if (targetPath.includes("/")) {
    return missingInTree(index, roots, bases, targetPath);
  }
  const sameName = index.byBasename.get(targetPath.toLowerCase()) ?? [];
  const exact = sameName.filter((candidate) => path.basename(candidate) === targetPath);
  const only = exact.length === 1 ? (exact[0] ?? null) : null;
  if (only === null || isTemplateDocument(roots.assistantDir, only)) return OUTSIDE;
  return { kind: "document", path: only };
}

/**
 * The tree-owned document an unresolved multi-segment citation names, if any.
 *
 * The repository-root spelling is checked first and on its own terms: a path
 * written `.qfai/assistant/<anything>/missing.md` is QFAI's whether or not the
 * directory survives, so a whole deleted directory is still reported. Every
 * other base needs the directory to be part of the tree before the citation
 * counts as one this rule owns.
 */
function missingInTree(
  index: TreeIndex,
  roots: ResolutionRoots,
  bases: readonly string[],
  targetPath: string,
): Resolution {
  const fromRoot = path.resolve(roots.root, targetPath);
  if (isUnder(roots.assistantDir, fromRoot)) return { kind: "missing", path: fromRoot };
  for (const base of bases) {
    const candidate = path.resolve(base, targetPath);
    if (!isUnder(roots.assistantDir, candidate)) continue;
    if (index.directories.has(path.dirname(candidate))) return { kind: "missing", path: candidate };
  }
  return OUTSIDE;
}

export async function validateAssistantAnchorReferences(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const skillsDir = resolvePath(root, config, "skillsDir");
  const assistantDir = resolveAssistantDir(skillsDir);
  if (!(await exists(assistantDir))) return [];

  const files = await collectTreeFiles(assistantDir);
  const index = await buildTreeIndex(files);
  const roots: ResolutionRoots = { root, assistantDir, skillsDir };

  // The rule is right, but nothing resolved these citations before it, so a
  // vendored tree refreshed in part meets its whole backlog of drifted anchors
  // in one run — and every one of them is an edit to a document the consumer
  // did not write. Shipping it straight at `error` would turn an upgrade into
  // a latched gate. It is a `warning` until the pinned release, an `error`
  // from that release onwards.
  //
  // `resolveToolVersion` resolves rather than rejects — its own read failures
  // return `"unknown"`, which the comparator reads as inside the window, so an
  // unreadable version can never be what escalates this into a build failure.
  const promotion = RULE_PROMOTIONS.assistantAnchorDangling.promoteAt;
  const severity = newRuleSeverity(await resolveToolVersion(), promotion);
  const windowNote =
    severity === "warning"
      ? ` ${promotion} リリースまでは warning、以降は error として報告されます。`
      : "";

  const issues: Issue[] = [];
  for (const [citingFile, document] of index.documents) {
    issues.push(
      ...danglingIssues(index, roots, citingFile, document.references, severity, windowNote),
    );
  }
  return issues;
}

function danglingIssues(
  index: TreeIndex,
  roots: ResolutionRoots,
  citingFile: string,
  references: readonly AnchorReference[],
  severity: "warning" | "error",
  windowNote: string,
): Issue[] {
  const relativeCiting = toRelative(roots.root, citingFile);
  const issues: Issue[] = [];
  for (const reference of references) {
    const target = resolveTarget(index, roots, citingFile, reference.targetPath);
    if (target.kind === "outside") continue;
    if (target.kind === "missing") {
      issues.push(
        missingTargetIssue(
          roots.root,
          relativeCiting,
          target.path,
          reference,
          severity,
          windowNote,
        ),
      );
      continue;
    }
    if (index.documents.get(target.path)?.slugs.has(reference.anchor) === true) continue;
    issues.push(
      danglingIssue(roots.root, relativeCiting, target.path, reference, severity, windowNote),
    );
  }
  return issues;
}

/** A citation into the assistant tree whose document is not there at all. */
function missingTargetIssue(
  root: string,
  relativeCiting: string,
  target: string,
  reference: AnchorReference,
  severity: "warning" | "error",
  windowNote: string,
): Issue {
  const citation = `${reference.targetPath}#${reference.anchor}`;
  const relativeTarget = toRelative(root, target);
  return issue(
    "QFAI-LINK-002",
    `${relativeCiting}:${String(reference.line)} が参照する \`${citation}\` は解決できません。参照先 ${relativeTarget} が assistant tree に存在しません。エージェントはこの引用をたどれず、指示は黙って何も適用しません。${windowNote}`,
    severity,
    relativeCiting,
    "assistantAnchorReferences.missingTarget",
    [citation],
    "canonical",
    "引用パスの綴りを確認してください。ドキュメントが移動または改名されている場合は引用を現在のパスに更新し、vendored tree が部分的にしか再同期されていない場合は `qfai init` を再実行して `.qfai/assistant/**` を揃えてください。",
    { relatedFiles: [relativeTarget], loc: { line: reference.line } },
  );
}

function danglingIssue(
  root: string,
  relativeCiting: string,
  target: string,
  reference: AnchorReference,
  severity: "warning" | "error",
  windowNote: string,
): Issue {
  const citation = `${reference.targetPath}#${reference.anchor}`;
  const relativeTarget = toRelative(root, target);
  return issue(
    "QFAI-LINK-002",
    `${relativeCiting}:${String(reference.line)} が参照する \`${citation}\` は解決できません。参照先 ${relativeTarget} に slug が \`${reference.anchor}\` と一致する見出しがありません。エージェントはこの引用をたどった先で該当節を見つけられず、指示は黙って何も適用しません。${windowNote}`,
    severity,
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
