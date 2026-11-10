import { readFile } from "node:fs/promises";
import path from "node:path";

import { skillFrontmatterMapping } from "../agentFrontmatter.js";
import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { ASSISTANT_MARKDOWN_MAX_LINES } from "../doctor/assetLineBudget.js";
import { collectFiles } from "../fs.js";
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

const FENCE_PATTERN = /^\s{0,3}(`{3,}|~{3,})/;
const CODE_SPAN_PATTERN = /(`+)[\s\S]*?\1/g;
const QUOTED_PATTERN = /"[^"\n]*"|“[^”\n]*”/g;

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
    // An unreadable file is the integrity checks' finding; this audit reads text.
    const content = await readFile(file, "utf8").catch(() => null);
    if (content === null) continue;
    issues.push(
      ...auditInstructionFile(path.relative(root, file).split(path.sep).join("/"), content),
    );
  }
  return issues;
}

/** Every audit finding for one file, named by its `/`-separated path from the project root. */
export function auditInstructionFile(relative: string, content: string): Issue[] {
  return [
    ...emphasisIssues(relative, content),
    ...(path.posix.basename(relative) === "SKILL.md" ? skillIssues(relative, content) : []),
    ...(relative === "AGENTS.md" ? agentsMdIssues(relative, content) : []),
  ];
}

async function instructionFiles(root: string, config: QfaiConfig): Promise<string[]> {
  const directories = new Set([
    path.join(root, ASSISTANT_DIR),
    resolvePath(root, config, "skillsDir"),
    path.join(root, ROOT_RULES_DIR),
  ]);
  const files = new Set<string>();
  for (const directory of directories) {
    const found = await collectFiles(directory, {
      extensions: [".md"],
      onUnreadableDirectory: () => undefined,
    });
    for (const file of found) files.add(path.resolve(file));
  }
  for (const entry of ENTRY_FILES) files.add(path.resolve(root, entry));
  return [...files].sort((a, b) => a.localeCompare(b));
}

/**
 * One finding per line that holds capitalised emphasis or "think hard"
 * phrasing outside fenced code, code spans and quotations. Quoted and code text
 * names a word rather than using it: a rule may cite `MUST` to forbid it.
 */
function emphasisIssues(relative: string, content: string): Issue[] {
  const issues: Issue[] = [];
  let fence: string | null = null;
  content.split(/\r?\n/).forEach((line, index) => {
    const opener = FENCE_PATTERN.exec(line)?.[1];
    if (fence !== null) {
      if (opener !== undefined && opener[0] === fence[0] && opener.length >= fence.length) {
        fence = null;
      }
      return;
    }
    if (opener !== undefined) {
      fence = opener;
      return;
    }
    if (/^\s{0,3}>/.test(line)) return;
    const prose = line.replace(CODE_SPAN_PATTERN, " ").replace(QUOTED_PATTERN, " ");
    const words = [...prose.matchAll(EMPHASIS_PATTERN)].map((match) => match[0]);
    if (words.length === 0) return;
    issues.push(
      issue(
        "QFAI-INSTR-001",
        `${relative}:${index + 1} uses emphasis an agent reads badly: ${words.join(", ")}.`,
        "warning",
        relative,
        "instructionAudit.emphasis",
        words,
        "canonical",
        "State the instruction in plain words: a lowercase imperative and its reason, without capitals or a plea to think harder.",
        { loc: { line: index + 1 } },
      ),
    );
  });
  return issues;
}

function countLines(content: string): number {
  if (content === "") return 0;
  const lines = content.split(/\r?\n/).length;
  return content.endsWith("\n") ? lines - 1 : lines;
}

function skillIssues(relative: string, content: string): Issue[] {
  const issues: Issue[] = [];
  const lines = countLines(content);
  if (lines > ASSISTANT_MARKDOWN_MAX_LINES) {
    issues.push(
      issue(
        "QFAI-INSTR-002",
        `${relative} has ${lines} lines, over the ${ASSISTANT_MARKDOWN_MAX_LINES} a SKILL.md may hold.`,
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
    .reduce((total, value) => total + value.length, 0);
  if (listed > SKILL_LISTING_MAX_CHARS) {
    issues.push(
      issue(
        "QFAI-INSTR-003",
        `${relative} has ${listed} characters in \`description\` and \`when_to_use\`, over the ${SKILL_LISTING_MAX_CHARS} a host lists.`,
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

function agentsMdIssues(relative: string, content: string): Issue[] {
  const bytes = Buffer.byteLength(content, "utf8");
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
