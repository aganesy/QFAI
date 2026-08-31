#!/usr/bin/env node
/* global console, process, URL */
/**
 * gen-agent-catalog.mjs
 *
 * Rewrites every `agents[].developer_instructions` block in
 * `packages/qfai/assets/init/.qfai/assistant/manifest/agent-catalog.yml` from
 * the canonical agent body in
 * `packages/qfai/assets/init/.qfai/assistant/agents/<id>.md`.
 *
 * The catalog embeds a verbatim copy of every agent body — 19 of them — and had
 * no generator, so an edit to an agent markdown file left the catalog stale and
 * nothing in the repository noticed: `qfai init` then shipped two disagreeing
 * copies of the same instructions into every consuming project. The markdown
 * file is the source; the catalog block is derived.
 *
 * Only the block scalar contents are rewritten. Everything else in the YAML —
 * key order, comments, routing metadata, quoting — is copied through
 * byte-for-byte, so this is safe to run on every `sync:ssot`.
 *
 * Usage:
 *   node scripts/gen-agent-catalog.mjs          # rewrite and report
 *   node scripts/gen-agent-catalog.mjs --check  # dry-run, exit 1 if stale
 *   node scripts/gen-agent-catalog.mjs --root=<dir>   # operate on a fixture
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * `--root` exists so the tests can exercise the drift path on a throwaway
 * fixture. Editing the real assets mid-run would race the other suites that
 * read them (`sync-init-to-root --check` compares that tree against `.qfai/`).
 *
 * `fileURLToPath`, not `URL.pathname`: a checkout under a directory with a
 * space or a non-ASCII character gives a percent-encoded pathname, and joining
 * that yields a path no file lives at.
 */
function resolveRoot() {
  const flag = process.argv.find((arg) => arg.startsWith("--root="));
  if (flag !== undefined) return flag.slice("--root=".length);
  return fileURLToPath(new URL("..", import.meta.url));
}

const ROOT = resolveRoot();
const ASSISTANT = join(ROOT, "packages", "qfai", "assets", "init", ".qfai", "assistant");
const CATALOG_PATH = join(ASSISTANT, "manifest", "agent-catalog.yml");
const AGENTS_DIR = join(ASSISTANT, "agents");

/** Indentation of the `developer_instructions` block scalar contents. */
const BODY_INDENT = "      ";
/**
 * The start of an agent entry. The id itself is read by `parseEntryId`, which
 * also handles a quoted id and a trailing comment; `ANY_ENTRY_RE` catches every
 * other shape of entry line so an unreadable boundary fails loudly instead of
 * leaving `currentId` pointing at the previous agent — that would rewrite this
 * entry's block with the previous agent's body and still exit 0 on `--check`.
 */
const ENTRY_RE = /^ {2}- id:[ \t]+(.*)$/;
const ANY_ENTRY_RE = /^ {2}- /;
/**
 * A literal block scalar header, including the chomping indicator (`|-`, `|+`),
 * the one explicit indentation indicator this generator can write (`|2`, i.e.
 * `BODY_INDENT`, two columns past the `developer_instructions` key), and a
 * comment after the indicators — `| # canonical copy` is valid YAML and none of
 * it reaches the scalar, so the header line passes through untouched like every
 * other comment in the file. All of those are valid YAML for the same content,
 * and a header this regex does not recognise would be skipped silently — the
 * entry would never be compared and `--check` would call a stale catalog up to
 * date. `ANY_BLOCK_KEY_RE` turns every other spelling of the key — quoted,
 * folded, flow, an indentation indicator other than 2, which `BODY_INDENT`
 * would contradict, or trailing text YAML does not read as a comment — into a
 * hard failure for the same reason.
 */
const BLOCK_RE = /^ {4}developer_instructions: \|(?:[-+]?2?|2[-+])(?:[ \t]*|[ \t]+#.*)$/;
const ANY_BLOCK_KEY_RE = /^ {4}developer_instructions:/;
/**
 * A line YAML reads as empty inside a block scalar: nothing but spaces or tabs.
 * Such a line is part of the block whatever its width — the "at least as
 * indented as the block" rule applies to content lines only. Treating a line of
 * one to five stray spaces as the end of the block would leave the tail of the
 * old body in the file behind the regenerated one, and the next `--check` would
 * stop at the same line and call the duplicated result up to date.
 */
const BLANK_RE = /^[ \t]*$/;

const CHECK_ONLY = process.argv.includes("--check");

/**
 * The canonical body of an agent: `## Mission` onward, i.e. everything after
 * the frontmatter and the `# Title` heading. Same slice the catalog carries and
 * the same one the codex TOML generator uses, so the three copies stay
 * comparable.
 */
function canonicalBody(id) {
  const mdPath = join(AGENTS_DIR, `${id}.md`);
  if (!existsSync(mdPath)) {
    throw new Error(
      `agent-catalog.yml lists "${id}" but .qfai/assistant/agents/${id}.md does not exist`,
    );
  }
  const content = readFileSync(mdPath, "utf-8").replace(/\r\n/g, "\n");
  const missionIndex = missionHeadingIndex(content);
  if (missionIndex < 0) {
    throw new Error(`.qfai/assistant/agents/${id}.md has no "## Mission" section`);
  }
  return content.slice(missionIndex).trimEnd();
}

/**
 * Offset of the `## Mission` heading *line*, searched past the frontmatter.
 * A plain `indexOf` matches the string anywhere — a frontmatter description
 * that merely mentions `## Mission` would move the slice start into the
 * frontmatter and drag the rest of it, plus the title, into the catalog block.
 * Returns -1 when no such heading line exists.
 */
function missionHeadingIndex(content) {
  let offset = 0;
  if (content.startsWith("---\n")) {
    const close = content.indexOf("\n---", "---\n".length - 1);
    if (close >= 0) offset = close + 1;
  }
  const match = /^## Mission[ \t]*$/m.exec(content.slice(offset));
  return match === null ? -1 : offset + match.index;
}

/** Canonical body re-indented as the contents of a `|` block scalar. */
function blockLines(id) {
  return canonicalBody(id)
    .split("\n")
    .map((line) => (line.length === 0 ? "" : `${BODY_INDENT}${line}`));
}

/**
 * A block scalar's contents run until the first line that is neither blank nor
 * indented at least as far as the block. `developer_instructions` is the last
 * key of every entry, so in practice that is the next `- id:` line or EOF —
 * but the indentation rule is what YAML actually uses, and following it keeps
 * the rewrite correct if a key is ever added after the block.
 */
function blockEnd(lines, start) {
  let end = start;
  while (end < lines.length) {
    const line = lines[end];
    if (!BLANK_RE.test(line) && !line.startsWith(BODY_INDENT)) break;
    end += 1;
  }
  // Trailing blank lines belong to whatever follows the block — a separator
  // between entries, or the file's final newline. Swallowing them here would
  // delete them from the output and make the rewrite non-idempotent.
  while (end > start && BLANK_RE.test(lines[end - 1])) end -= 1;
  return end;
}

/**
 * The id of an entry line, given everything after `- id:`. Handles the two
 * scalar forms YAML allows here — plain and quoted — plus a trailing `#`
 * comment. Returns undefined when the value is anything else (empty, a
 * multi-line scalar header, an unterminated quote), so the caller can fail
 * rather than carry the previous id forward. A value that parses but names no
 * agent — an alias, a typo — fails a step later, in `canonicalBody`.
 */
function parseEntryId(raw) {
  const value = raw.trim();
  if (value.length === 0) return undefined;
  const quote = value[0];
  if (quote === '"' || quote === "'") {
    const closing = value.indexOf(quote, 1);
    if (closing < 0) return undefined;
    const trailing = value.slice(closing + 1).trim();
    if (trailing.length > 0 && !trailing.startsWith("#")) return undefined;
    const quotedId = value.slice(1, closing);
    return quotedId.length > 0 ? quotedId : undefined;
  }
  // In a plain scalar a comment starts at whitespace followed by `#`; a `#`
  // with no space before it is part of the token.
  const commentAt = value.search(/[ \t]#/);
  const plainId = (commentAt < 0 ? value : value.slice(0, commentAt)).trim();
  if (plainId.length === 0 || /\s/.test(plainId)) return undefined;
  return plainId;
}

/**
 * Every catalog entry must carry a block: the field is the whole point of the
 * catalog for a loader that reads it and nothing else. Absence is the one shape
 * this rewriter cannot repair — there is no key to write under — so it fails
 * here rather than skipping the entry, which would let a deleted block report
 * as "up to date" and defeat the very drift guard this script is.
 */
function requireBlock(currentId, blockSeen) {
  if (currentId === null || blockSeen) return;
  throw new Error(
    `agent-catalog.yml entry "${currentId}" has no developer_instructions block — every agent ` +
      "entry must embed the canonical body so a loader that reads only the catalog still gets it",
  );
}

function regenerate(source) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  const rewritten = [];
  let currentId = null;
  let blockSeen = false;
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (ANY_ENTRY_RE.test(line)) {
      requireBlock(currentId, blockSeen);
      blockSeen = false;
      const entryMatch = ENTRY_RE.exec(line);
      const entryId = entryMatch === null ? undefined : parseEntryId(entryMatch[1]);
      if (entryId === undefined) {
        throw new Error(
          `agent-catalog.yml has an entry whose id cannot be read: ${line.trim()} — every agent ` +
            "entry must open with a plain or quoted `- id: <id>`, optionally followed by a comment",
        );
      }
      currentId = entryId;
    }
    out.push(line);
    index += 1;
    if (!BLOCK_RE.test(line)) {
      if (ANY_BLOCK_KEY_RE.test(line)) {
        throw new Error(
          `agent-catalog.yml entry "${currentId ?? "?"}" writes developer_instructions as ` +
            `${line.trim()} — only a literal block scalar indented two columns past the key ` +
            "(|, |-, |+, |2), optionally followed by a comment, is generated, and any other " +
            "form — including a different explicit indentation indicator — would be left " +
            "uncompared or regenerated at the wrong depth",
        );
      }
      continue;
    }
    if (currentId === null) {
      throw new Error(`developer_instructions block at line ${index} has no enclosing "- id:"`);
    }
    const end = blockEnd(lines, index);
    out.push(...blockLines(currentId));
    rewritten.push(currentId);
    blockSeen = true;
    index = end;
  }
  requireBlock(currentId, blockSeen);
  return { text: out.join("\n"), rewritten };
}

function main() {
  if (!existsSync(CATALOG_PATH)) {
    console.error(`agent-catalog.yml not found at ${CATALOG_PATH}`);
    process.exit(1);
  }
  const source = readFileSync(CATALOG_PATH, "utf-8");
  let result;
  try {
    result = regenerate(source);
  } catch (error) {
    console.error(`gen-agent-catalog failed: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
    return;
  }
  if (result.text === source.replace(/\r\n/g, "\n")) {
    console.log(`agent-catalog.yml is up to date (${result.rewritten.length} agents).`);
    return;
  }
  if (CHECK_ONLY) {
    console.error(
      "STALE: packages/qfai/assets/init/.qfai/assistant/manifest/agent-catalog.yml " +
        "developer_instructions no longer match .qfai/assistant/agents/*.md. " +
        "Run: pnpm sync:ssot",
    );
    process.exit(1);
    return;
  }
  writeFileSync(CATALOG_PATH, result.text, "utf-8");
  console.log(`Regenerated developer_instructions for ${result.rewritten.length} agents.`);
}

main();
