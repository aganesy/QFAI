import type { Stats } from "node:fs";
import { readdir, readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";

import { skillFrontmatterMapping } from "../agentFrontmatter.js";
import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { ASSISTANT_MARKDOWN_MAX_LINES, countLines } from "../doctor/assetLineBudget.js";
import { DEFAULT_IGNORE_DIRS } from "../fs.js";
import { ASSISTANT_DIR } from "../paths/assistantPaths.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

/**
 * Capitalised emphasis and "think hard" phrasing. Capitals and pleas for effort
 * make a model act on an instruction before it has understood it, so the
 * instructions an agent reads state each obligation in plain words.
 */
const EMPHASIS_PATTERN =
  /\b(?:MUST|MANDATORY|REQUIRED|CRITICAL|IMPORTANT|NEVER|ALWAYS)\b|\b[Tt]hink [Hh]ard(?:er)?\b/g;

/** The characters a host shows of a skill's `description` and `when_to_use` together. */
export const SKILL_LISTING_MAX_CHARS = 1536;

/** The bytes of `AGENTS.md` a host loads before it stops reading. */
export const AGENTS_MD_MAX_BYTES = 32 * 1024;

/** The entry files an agent reads at the start of every session, at the project root. */
const ENTRY_FILES = ["AGENTS.md", "CLAUDE.md"];

/** The shipped root rules, beside the assistant tree. */
const ROOT_RULES_DIR = path.join(".agents", "rules");

/**
 * A fence opens at any indentation, so a fence inside a list item counts. A
 * backtick fence's info string holds no backtick, as CommonMark requires.
 */
const FENCE_PATTERN = /^\s*(?:(`{3,})[^`]*|(~{3,}).*)$/;
/** A closing fence carries no info string. */
const CLOSING_FENCE_PATTERN = /^\s*(`{3,}|~{3,})\s*$/;
const CODE_SPAN_PATTERN = /(`+)[\s\S]*?\1/g;
/**
 * Quoted text opens at the line start or after whitespace or an opening
 * bracket, so the inch mark in `5"` hides nothing after it.
 */
const QUOTED_PATTERN = /(^|[\s([{])(?:"[^"\n]*"|“[^”\n]*”)/g;

/** What a finding on the generated assistant tree adds: the file is not edited in place. */
const GENERATED_NOTE =
  " It is written by `qfai init`: update qfai and run `qfai init --force` instead of editing it.";

/**
 * Reports instruction text an agent reads badly: capitalised emphasis and
 * "think hard" phrasing in the assistant tree, the root rules and the entry
 * files, a `SKILL.md` over the Markdown line ceiling, a skill whose listing text
 * a host truncates, and an `AGENTS.md` a host stops reading part-way.
 */
export async function validateInstructionAudit(root: string, config: QfaiConfig): Promise<Issue[]> {
  const files = await instructionFiles(root, config);
  const issues: Issue[] = [];
  for (const file of files) {
    const content = await readOrNull(file);
    if (content === null) continue;
    issues.push(
      ...auditInstructionFile(path.relative(root, file).split(path.sep).join("/"), content),
    );
  }
  return issues;
}

/**
 * Every audit finding for one file, named by its `/`-separated path from the
 * project root, from the bytes the file stores.
 */
export function auditInstructionFile(relative: string, stored: Buffer): Issue[] {
  const content = stored.toString("utf8");
  const note = relative.startsWith(`${ASSISTANT_DIR}/`) ? GENERATED_NOTE : "";
  return [
    ...emphasisIssues(relative, content, note),
    ...(path.posix.basename(relative) === "SKILL.md" ? skillIssues(relative, content, note) : []),
    ...(relative === "AGENTS.md" ? agentsMdIssues(relative, stored.length) : []),
  ];
}

/**
 * The Markdown files the audit reads, each once, by the path under the project
 * root that reaches it. Symbolic links are followed: a project may link its
 * assistant layers or rule files to a shared copy, and an agent reads the
 * linked text all the same. A path the audit cannot stat, resolve or list is
 * skipped as an absent one is, so one damaged entry does not stop the run.
 * A dot-prefixed directory directly under the skills directory is a skill no
 * host lists, and is skipped as the skill walk skips it.
 */
async function instructionFiles(root: string, config: QfaiConfig): Promise<string[]> {
  const seen = new Set<string>();
  const files: string[] = [];
  const skillsDir = resolvePath(root, config, "skillsDir");
  const walk: Walk = { seen, out: files, skillsDir: path.resolve(skillsDir) };
  const directories = [path.join(root, ASSISTANT_DIR), skillsDir, path.join(root, ROOT_RULES_DIR)];
  for (const directory of directories) await walkMarkdown(directory, walk);
  for (const entry of ENTRY_FILES) {
    const file = path.join(root, entry);
    if ((await statOrNull(file))?.isFile() === true && (await claim(file, seen))) {
      files.push(file);
    }
  }
  return files.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

type Walk = { seen: Set<string>; out: string[]; skillsDir: string };

async function walkMarkdown(directory: string, walk: Walk): Promise<void> {
  const stats = await statOrNull(directory);
  if (stats?.isDirectory() !== true || !(await claim(directory, walk.seen))) return;
  const names = await readdir(directory).catch(() => []);
  const underSkills = path.resolve(directory) === walk.skillsDir;
  for (const name of names) {
    const entry = path.join(directory, name);
    const entryStats = await statOrNull(entry);
    if (entryStats?.isDirectory() === true) {
      if (DEFAULT_IGNORE_DIRS.has(name) || (underSkills && name.startsWith("."))) continue;
      await walkMarkdown(entry, walk);
    } else if (
      entryStats?.isFile() === true &&
      path.extname(name).toLowerCase() === ".md" &&
      (await claim(entry, walk.seen))
    ) {
      walk.out.push(entry);
    }
  }
}

/**
 * Records the real path behind `entry`; false when another path reached it
 * first or the path does not resolve.
 */
async function claim(entry: string, seen: Set<string>): Promise<boolean> {
  const real = await realpath(entry).catch(() => null);
  if (real === null || seen.has(real)) return false;
  seen.add(real);
  return true;
}

/**
 * `stat` that follows links, with an entry it cannot stat read as nothing: an
 * absent entry, a dangling link, a link loop or one the process may not reach.
 */
async function statOrNull(entry: string): Promise<Stats | null> {
  return stat(entry).catch(() => null);
}

/** The bytes of `file`, or null when it cannot be read: a lost race, a mode, a lock. */
async function readOrNull(file: string): Promise<Buffer | null> {
  return readFile(file).catch(() => null);
}

/**
 * One finding per line that holds capitalised emphasis or "think hard"
 * phrasing outside fenced code, code spans and quotations. Quoted and code text
 * names a word rather than using it: a rule may cite `MUST` to forbid it.
 */
function emphasisIssues(relative: string, content: string, note: string): Issue[] {
  const issues: Issue[] = [];
  let fence: string | null = null;
  content.split(/\r?\n/).forEach((line, index) => {
    if (fence !== null) {
      const closer = CLOSING_FENCE_PATTERN.exec(line)?.[1];
      if (closer !== undefined && closer[0] === fence[0] && closer.length >= fence.length) {
        fence = null;
      }
      return;
    }
    const fenceMatch = FENCE_PATTERN.exec(line);
    const opener = fenceMatch?.[1] ?? fenceMatch?.[2];
    if (opener !== undefined) {
      fence = opener;
      return;
    }
    if (/^\s{0,3}>/.test(line)) return;
    const prose = line.replace(CODE_SPAN_PATTERN, " ").replace(QUOTED_PATTERN, "$1 ");
    const words = [...prose.matchAll(EMPHASIS_PATTERN)].map((match) => match[0]);
    if (words.length === 0) return;
    issues.push(
      issue(
        "QFAI-INSTR-001",
        `${relative}:${index + 1} uses emphasis an agent reads badly: ${words.join(", ")}.${note}`,
        "warning",
        relative,
        "instructionAudit.emphasis",
        undefined,
        "canonical",
        "State the instruction in plain words: a lowercase imperative and its reason, without capitals or a plea to think harder.",
        { loc: { line: index + 1 } },
      ),
    );
  });
  return issues;
}

function skillIssues(relative: string, content: string, note: string): Issue[] {
  const issues: Issue[] = [];
  const lines = countLines(content);
  if (lines > ASSISTANT_MARKDOWN_MAX_LINES) {
    issues.push(
      issue(
        "QFAI-INSTR-002",
        `${relative} has ${lines} lines, over the ${ASSISTANT_MARKDOWN_MAX_LINES} a SKILL.md may hold.${note}`,
        "warning",
        relative,
        "instructionAudit.skillLines",
        undefined,
        "canonical",
        "Move a section the skill does not need at the start into a file under its `references/` and cite that file where the section was.",
      ),
    );
  }
  const frontmatter = skillFrontmatterMapping(content);
  const listed = ["description", "when_to_use"]
    .map((key) => frontmatter?.[key])
    .filter((value): value is string => typeof value === "string")
    // A character is one Unicode code point, as `ai-readable-markdown.md` counts.
    .reduce((total, value) => total + Array.from(value).length, 0);
  if (listed > SKILL_LISTING_MAX_CHARS) {
    issues.push(
      issue(
        "QFAI-INSTR-003",
        `${relative} has ${listed} characters in \`description\` and \`when_to_use\`, over the ${SKILL_LISTING_MAX_CHARS} a host lists.${note}`,
        "warning",
        relative,
        "instructionAudit.skillListing",
        undefined,
        "canonical",
        "Shorten `description` and `when_to_use` to when the skill applies, and move the rest into the skill's body.",
      ),
    );
  }
  return issues;
}

function agentsMdIssues(relative: string, bytes: number): Issue[] {
  if (bytes <= AGENTS_MD_MAX_BYTES) return [];
  return [
    issue(
      "QFAI-INSTR-004",
      `${relative} is ${bytes} bytes, over the ${AGENTS_MD_MAX_BYTES} a host reads.`,
      "warning",
      relative,
      "instructionAudit.agentsMdSize",
      undefined,
      "canonical",
      "Move guidance a task needs only sometimes into a file AGENTS.md names, with when to read it.",
    ),
  ];
}
