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
const ENTRY_RE = /^ {2}- id: (\S+)\s*$/;
/**
 * A literal block scalar header, including the chomping indicator (`|-`, `|+`)
 * and an explicit indentation indicator (`|2`). All of those are valid YAML for
 * the same content, and a header this regex does not recognise would be skipped
 * silently — the entry would never be compared and `--check` would call a stale
 * catalog up to date. `UNSUPPORTED_BLOCK_RE` turns every other spelling of the
 * key (quoted, folded, flow) into a hard failure for the same reason.
 */
const BLOCK_RE = /^ {4}developer_instructions: \|[-+]?[0-9]*[-+]?[ \t]*$/;
const ANY_BLOCK_KEY_RE = /^ {4}developer_instructions:/;

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
    if (line.length > 0 && !line.startsWith(BODY_INDENT)) break;
    end += 1;
  }
  // Trailing blank lines belong to whatever follows the block — a separator
  // between entries, or the file's final newline. Swallowing them here would
  // delete them from the output and make the rewrite non-idempotent.
  while (end > start && lines[end - 1].length === 0) end -= 1;
  return end;
}

function regenerate(source) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  const rewritten = [];
  let currentId = null;
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    const entryMatch = ENTRY_RE.exec(line);
    if (entryMatch) currentId = entryMatch[1];
    out.push(line);
    index += 1;
    if (!BLOCK_RE.test(line)) {
      if (ANY_BLOCK_KEY_RE.test(line)) {
        throw new Error(
          `agent-catalog.yml entry "${currentId ?? "?"}" writes developer_instructions as ` +
            `${line.trim()} — only a literal block scalar (|, |-, |+) is generated, and any ` +
            "other form would be left uncompared",
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
    index = end;
  }
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
