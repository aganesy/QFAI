import { access, readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { collectFiles } from "../fs.js";
import { escapeRegExp } from "../regex.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

const DRIFT_PROTOCOL_MARKER = "[DRIFT-PROTOCOL:MANDATORY]";
const REVIEWER_GATE_HEADING_PATTERN = /^###\s+Reviewer Gate\b.*$/im;
const ANY_MARKDOWN_HEADING_PATTERN = /^\s*#{1,6}\s+/m;

export async function validateAssistantAssets(root: string, config: QfaiConfig): Promise<Issue[]> {
  const skillsDir = resolvePath(root, config, "skillsDir");
  const assistantDir = path.dirname(skillsDir);

  // Post-recut: drift-protocol.md is canonically located at
  // .qfai/assistant/constitution/drift-protocol.md. Fall back to the
  // legacy instructions/ path during the compatibility window so
  // projects that have not yet run `qfai init --upgrade-assistant-tree`
  // pass for now.
  const canonicalDriftProtocolPath = path.join(assistantDir, "constitution", "drift-protocol.md");
  const legacyDriftProtocolPath = path.join(assistantDir, "instructions", "drift-protocol.md");
  const driftProtocolPath = (await exists(canonicalDriftProtocolPath))
    ? canonicalDriftProtocolPath
    : legacyDriftProtocolPath;
  // Post-recut: test-layers.md is canonically located at
  // .qfai/assistant/catalog/test-layers.md. Fall back to the legacy
  // steering/ path during the compatibility window so projects that
  // have not yet run `qfai init --upgrade-assistant-tree` are not
  // double-penalized (D-DEPRECATED-PATH + QFAI-ASSETS-002).
  const canonicalTestLayersPath = path.join(assistantDir, "catalog", "test-layers.md");
  const legacyTestLayersPath = path.join(assistantDir, "steering", "test-layers.md");
  const testLayersPath = (await exists(canonicalTestLayersPath))
    ? canonicalTestLayersPath
    : legacyTestLayersPath;

  const issues: Issue[] = [];

  if (!(await exists(driftProtocolPath))) {
    issues.push(
      issue(
        "QFAI-ASSETS-001",
        "必須ファイル .qfai/assistant/constitution/drift-protocol.md (legacy fallback: .qfai/assistant/instructions/drift-protocol.md) が見つかりません。",
        "error",
        canonicalDriftProtocolPath,
        "assistantAssets.driftProtocol",
      ),
    );
  }

  if (!(await exists(testLayersPath))) {
    issues.push(
      issue(
        "QFAI-ASSETS-002",
        "必須ファイル .qfai/assistant/catalog/test-layers.md (legacy fallback: .qfai/assistant/steering/test-layers.md) が見つかりません。",
        "error",
        canonicalTestLayersPath,
        "assistantAssets.testLayers",
      ),
    );
  }

  const skillFiles = await collectSkillFiles([skillsDir]);
  for (const skillFile of skillFiles) {
    const content = await readFile(skillFile, "utf-8");

    if (!content.includes(DRIFT_PROTOCOL_MARKER)) {
      issues.push(
        issue(
          "QFAI-SKILLS-010",
          "SKILL.md に必須 marker [DRIFT-PROTOCOL:MANDATORY] がありません。",
          "error",
          skillFile,
          "skills.driftProtocolMarker",
        ),
      );
    }

    const reviewerGateSection = extractReviewerGateSection(content);
    if (reviewerGateSection === null) {
      issues.push(
        issue(
          "QFAI-SKILLS-011",
          "SKILL.md に `### Reviewer Gate` セクションがありません。",
          "error",
          skillFile,
          "skills.reviewerGate",
        ),
      );
      continue;
    }

    const missingTerms = collectMissingReviewerGateTerms(reviewerGateSection);
    if (missingTerms.length > 0) {
      issues.push(
        issue(
          "QFAI-SKILLS-012",
          `Reviewer Gate に Drift/test-layer 観点が不足しています（不足: ${missingTerms.join(", ")}）。`,
          "warning",
          skillFile,
          "skills.reviewerGatePolicy",
        ),
      );
    }
  }

  issues.push(...(await collectReferenceGraphIssues(root, skillsDir)));

  return issues;
}

/**
 * The inverse of the citation check: a reference nothing names is never read.
 *
 * Skills load by progressive disclosure — `SKILL.md` is the entry point and a
 * reference is opened only when a document already read names it. A file under
 * `references/` with no inbound citation from a reachable document therefore
 * ships to every consuming repository and is loaded in no run at all, which is
 * a property of the graph rather than a probability. Reported as `warning`:
 * the unread guidance is soft rule text, so nothing hard is being skipped.
 */
async function collectReferenceGraphIssues(root: string, skillsDir: string): Promise<Issue[]> {
  const { documents, unreadable } = await readSkillDocuments(skillsDir);
  const reachable = collectReachableDocuments(citationContext(root, skillsDir), documents);
  const unreachable = [...documents.keys()]
    .filter((file) => isReferenceDocument(skillsDir, file) && !reachable.has(file))
    .sort((a, b) => a.localeCompare(b))
    .map((file) =>
      issue(
        "QFAI-SKILLS-013",
        "references/ 配下のファイルが SKILL.md から到達可能な文書のどこからも参照されていないため、読み込まれることがありません。必要な文書なら参照するステップから引用し、不要なら削除してください。",
        "warning",
        file,
        "skills.referenceReachability",
      ),
    );
  return [...unreadable, ...unreachable];
}

type SkillDocuments = {
  /** Skill-tree documents that can cite or be cited, keyed by absolute path. */
  documents: Map<string, string>;
  /** One issue per document whose content could not be read at all. */
  unreadable: Issue[];
};

/**
 * A document that cannot be read is reported, not dropped.
 *
 * Swallowing the failure would delete the file from the graph: it would cite
 * nothing, be scanned for nothing, and — because the checks above only read
 * the required files and every `SKILL.md` — leave the tree with no finding at
 * all. An unusable reference is a worse outcome than an uncited one, so the
 * read error becomes its own issue.
 */
async function readSkillDocuments(skillsDir: string): Promise<SkillDocuments> {
  const files = await collectFiles(skillsDir, { extensions: [".md", ".yaml", ".yml"] });
  const documents = new Map<string, string>();
  const unreadable: Issue[] = [];
  for (const file of files.sort((a, b) => a.localeCompare(b))) {
    try {
      documents.set(file, await readFile(file, "utf-8"));
    } catch (error) {
      unreadable.push(
        issue(
          "QFAI-SKILLS-014",
          `skills 配下の文書を読み込めませんでした（${describeReadError(error)}）。参照到達性を判定できないため、権限と I/O を確認してください。`,
          "error",
          file,
          "skills.documentReadable",
        ),
      );
    }
  }
  return { documents, unreadable };
}

function describeReadError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Breadth-first closure over "document A cites the path of document B". */
function collectReachableDocuments(
  context: CitationContext,
  documents: Map<string, string>,
): Set<string> {
  const files = [...documents.keys()];
  const reachable = new Set(files.filter((file) => path.basename(file) === "SKILL.md"));
  const queue = [...reachable];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) {
      break;
    }
    const content = documents.get(current) ?? "";
    for (const cited of resolveCitations(context, current, content, documents)) {
      if (reachable.has(cited)) {
        continue;
      }
      reachable.add(cited);
      queue.push(cited);
    }
  }
  return reachable;
}

/**
 * Path-ish tokens naming a skill document: `references/foo.md`, `two-hop.md`,
 * `.qfai/assistant/skills/qfai-sdd/references/rcp_footer.md`.
 *
 * The name classes are Unicode and the extension is matched case-insensitively
 * because that is how the files themselves are collected: `collectFiles`
 * lower-cases the extension before comparing and puts no constraint on the
 * stem, so `references/設計.md` and `references/Guide.MD` are documents the
 * reachability check has to be able to see cited.
 */
const DOCUMENT_CITATION_PATTERN =
  /[\p{L}\p{N}\p{M}._-]+(?:\/[\p{L}\p{N}\p{M}._-]+)*\.(?:md|ya?ml)\b/giu;

/** Everything a citation token is resolved against, derived from the config. */
type CitationContext = {
  root: string;
  skillsDir: string;
  /** `<skillsDir>` as a project-root-relative prefix, when it has one. */
  skillsDirPrefix: RegExp | null;
};

function citationContext(root: string, skillsDir: string): CitationContext {
  return { root, skillsDir, skillsDirPrefix: skillsDirPrefixPattern(root, skillsDir) };
}

/**
 * The prefix a root-relative citation carries, taken from the configured
 * `skillsDir` rather than from the default directory name — a project that
 * moved its skills to `.custom/skills` cites `.custom/skills/...`.
 */
function skillsDirPrefixPattern(root: string, skillsDir: string): RegExp | null {
  const relative = toPosixRelative(root, skillsDir);
  if (relative === "" || relative === ".." || relative.startsWith("../")) {
    return null;
  }
  return new RegExp(`(?:^|/)${escapeRegExp(relative)}/`);
}

/**
 * A citation names one file, so the edge must land on one file.
 *
 * Matching a bare basename made every same-named document reachable at once:
 * `qfai-sdd/SKILL.md` citing `references/review-cycle-playbook.md` also lit up
 * `qfai-discussion/references/review-cycle-playbook.md`, which no discussion
 * document reaches. Each token is instead resolved against the citing
 * document's own directory, its skill root, the skills root and the project
 * root — so a cross-skill edge exists only where the path spells one out.
 *
 * A second pass covers the documents no path-ish token can name — a space or a
 * bracket in the file name — by searching the prose for that document's own
 * path instead of for a pattern.
 */
function resolveCitations(
  context: CitationContext,
  citingFile: string,
  content: string,
  documents: Map<string, string>,
): string[] {
  const cited = new Set<string>();
  for (const match of content.matchAll(DOCUMENT_CITATION_PATTERN)) {
    const target = citationCandidates(context, citingFile, match[0]).find((candidate) =>
      documents.has(candidate),
    );
    if (target !== undefined) {
      cited.add(target);
    }
  }
  for (const target of documents.keys()) {
    if (cited.has(target) || target === citingFile || isTokenScannable(context, target)) {
      continue;
    }
    if (citesByExplicitPath(context, citingFile, target, content)) {
      cited.add(target);
    }
  }
  return [...cited];
}

/**
 * Whether the token scan above can span this document's path at all.
 *
 * `collectFiles` puts no constraint on a name, so a document may be called
 * `references/My Guide.md` — a space no path-ish token can cross, which would
 * leave the scanner matching `Guide.md` and resolving nothing. Such a document
 * is looked up by its own path instead of by pattern.
 */
function isTokenScannable(context: CitationContext, file: string): boolean {
  return toPosixRelative(context.root, file)
    .split("/")
    .every((segment) => SCANNABLE_SEGMENT_PATTERN.test(segment));
}

const SCANNABLE_SEGMENT_PATTERN = /^[\p{L}\p{N}\p{M}._-]+$/u;

/** Every way `target` can be spelled from `citingFile`, URI form included. */
function citationSpellings(context: CitationContext, citingFile: string, target: string): string[] {
  const skillRoot = skillRootOf(context.skillsDir, citingFile);
  const bases = [
    path.dirname(citingFile),
    ...(skillRoot === null ? [] : [skillRoot]),
    context.skillsDir,
    context.root,
  ];
  const spellings = new Set<string>();
  for (const base of bases) {
    const relative = toPosixRelative(base, target);
    if (relative === "") {
      continue;
    }
    spellings.add(relative);
    // `[Guide](references/My%20Guide.md)` names the same file.
    spellings.add(encodeURI(relative));
  }
  return [...spellings];
}

function citesByExplicitPath(
  context: CitationContext,
  citingFile: string,
  target: string,
  content: string,
): boolean {
  return citationSpellings(context, citingFile, target).some((spelling) =>
    containsPathToken(content, spelling),
  );
}

/**
 * A path appears in the prose as a whole path, not as the tail of a longer one.
 *
 * Without the boundary check `references/guide.md` would also be found inside
 * `other/references/guide.md.bak`, which is a different file — the same
 * one-citation-one-file rule the token scan follows.
 */
function containsPathToken(content: string, spelling: string): boolean {
  for (
    let index = content.indexOf(spelling);
    index !== -1;
    index = content.indexOf(spelling, index + 1)
  ) {
    if (isHeadBoundary(content, index) && isTailBoundary(content, index + spelling.length)) {
      return true;
    }
  }
  return false;
}

const PATH_CHARACTER_PATTERN = /[\p{L}\p{N}\p{M}._\-/\\]/u;
const NAME_CHARACTER_PATTERN = /[\p{L}\p{N}\p{M}_-]/u;

function isHeadBoundary(content: string, index: number): boolean {
  return index === 0 || !PATH_CHARACTER_PATTERN.test(content.charAt(index - 1));
}

function isTailBoundary(content: string, index: number): boolean {
  const next = content.charAt(index);
  if (next === "") {
    return true;
  }
  // A trailing `.` ends the sentence unless a name continues after it.
  if (next === ".") {
    return !NAME_CHARACTER_PATTERN.test(content.charAt(index + 1));
  }
  return !PATH_CHARACTER_PATTERN.test(next);
}

function citationCandidates(context: CitationContext, citingFile: string, token: string): string[] {
  const skillRoot = skillRootOf(context.skillsDir, citingFile);
  const bases = [
    path.dirname(citingFile),
    ...(skillRoot === null ? [] : [skillRoot]),
    context.skillsDir,
    context.root,
  ];
  const candidates = bases.map((base) => path.resolve(base, token));
  const prefixMatch = context.skillsDirPrefix?.exec(token) ?? null;
  if (prefixMatch !== null) {
    const withinSkills = token.slice(prefixMatch.index + prefixMatch[0].length);
    candidates.push(path.resolve(context.skillsDir, withinSkills));
  }
  return candidates;
}

/** The `<skillsDir>/<skill>` directory a document belongs to, if any. */
function skillRootOf(skillsDir: string, file: string): string | null {
  const relative = toPosixRelative(skillsDir, file);
  const [skill, ...rest] = relative.split("/");
  if (skill === undefined || skill === "" || skill === ".." || rest.length === 0) {
    return null;
  }
  return path.join(skillsDir, skill);
}

function isReferenceDocument(skillsDir: string, file: string): boolean {
  return /^[^/]+\/references\//.test(toPosixRelative(skillsDir, file));
}

function toPosixRelative(from: string, to: string): string {
  return path.relative(from, to).split(path.sep).join("/");
}

async function collectSkillFiles(dirs: string[]): Promise<string[]> {
  const files = await Promise.all(dirs.map((dir) => collectFiles(dir)));
  return files
    .flat()
    .filter((filePath) => path.basename(filePath) === "SKILL.md")
    .sort((a, b) => a.localeCompare(b));
}

function extractReviewerGateSection(content: string): string | null {
  const headingMatch = REVIEWER_GATE_HEADING_PATTERN.exec(content);
  if (!headingMatch) {
    return null;
  }
  const headingStart = headingMatch.index;
  const headingText = headingMatch[0];
  const sectionStart = headingStart + headingText.length;
  const remainder = content.slice(sectionStart);
  const nextHeadingMatch = ANY_MARKDOWN_HEADING_PATTERN.exec(remainder);
  if (!nextHeadingMatch) {
    return remainder;
  }
  return remainder.slice(0, nextHeadingMatch.index);
}

function collectMissingReviewerGateTerms(section: string): string[] {
  const missing: string[] = [];
  if (!/drift protocol/i.test(section)) {
    missing.push("Drift Protocol");
  }
  if (!/test-layers\.md/i.test(section)) {
    missing.push("test-layers.md");
  }
  const hasSignalsPhrase = /\bnot gates?\b/i.test(section) || /\bsignals?\b/i.test(section);
  if (!hasSignalsPhrase) {
    missing.push("not gates/signals");
  }
  return missing;
}

async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}
