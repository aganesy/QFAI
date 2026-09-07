/**
 * A constitution file may only point at files `qfai init` actually writes.
 *
 * `assistant/constitution/agent-selection.md` was ported verbatim out of this
 * repository's own `.instruction/` tree, so it kept citing
 * `.instruction/00_universal/development-principles-checklist.md` and
 * `.instruction/02_project/mcp.md` — plus two rootless front-matter
 * `dependencies` entries relative to that same tree. `qfai init` ships no
 * `.instruction/` directory, so in every consuming project those pointers
 * resolved to nothing. Line 57 was the worst shape: one sentence naming a path
 * that resolves and a path that does not, leaving an implementation agent to
 * either invent the missing checklist or silently apply half the rule.
 *
 * Nothing detected it — the citations are prose, and no validator walks the
 * shipped assistant tree looking for the files it names. This does.
 */

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import fg from "fast-glob";
import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/**
 * The two roots a shipped citation has to resolve against: the init payload as
 * it is copied into a consumer, and this repository's mirror of it. A path
 * written from the consumer's root (`.qfai/...`, `.github/...`) must exist
 * under both.
 */
const CONSUMER_ROOTS = ["packages/qfai/assets/init", "."];

const AGENT_SELECTION = ".qfai/assistant/constitution/agent-selection.md";

/**
 * The file `agent-selection.md` now sends MCP questions to. A pointer is only
 * honest if what it lands on is itself reachable: this skill's "MCP
 * Integration" section names a configuration-template directory per server,
 * and those directories used to sit in `packages/qfai/assets/mcp-templates`,
 * outside the init payload — shipped in the tarball, copied into no project.
 * Following the constitution therefore ran straight into a second unresolvable
 * reference, which is the defect this file exists to keep out.
 */
const MCP_GUIDANCE = ".qfai/assistant/skills/web-research/SKILL.md";

/** A backticked, slash-bearing markdown path — how this tree cites a file. */
const CITED_MARKDOWN_PATH = /`([^`\s]+\/[^`\s]+\.md)`/g;

/**
 * A "Configuration templates: `<dir>`" line in the MCP guidance. Only the
 * template directories are asserted: the same section also names runtime
 * output roots (`.qfai/evidence/...`, `.qfai/cache/...`) that the skill
 * creates when it runs and that no payload is expected to contain.
 */
const CITED_TEMPLATE_DIR = /^Configuration templates:\s+`([^`\s]+)`\s*$/gm;

/**
 * Whether a cited path lands on something the payload ships.
 *
 * A `<placeholder>` segment names a family of files rather than one file —
 * `.qfai/assistant/agents/<id>.md` is the naming rule for the per-agent bodies,
 * not a filename — so `existsSync` on the literal string is false for a
 * citation that is perfectly honest. Skipping those outright would let a typo
 * in the concrete half through, so the directory that holds the family is
 * asserted instead: `.qfai/assistant/agent/<id>.md` still fails. A placeholder
 * with no concrete directory ahead of it stays a failure, because there is then
 * nothing left to verify.
 */
function resolvesUnder(base: string, cited: string): boolean {
  const placeholder = cited.indexOf("<");
  if (placeholder === -1) {
    return existsSync(path.join(base, cited));
  }
  const concrete = cited.slice(0, placeholder);
  const lastSlash = concrete.lastIndexOf("/");
  if (lastSlash <= 0) {
    return false;
  }
  return existsSync(path.join(base, concrete.slice(0, lastSlash)));
}

async function assistantMarkdown(consumerRoot: string): Promise<string[]> {
  const cwd = path.join(repoRoot, consumerRoot, ".qfai");
  return (await fg("assistant/**/*.md", { cwd, dot: true })).sort();
}

describe.each(CONSUMER_ROOTS)("%s", (consumerRoot) => {
  it("cites no file under the framework-only .instruction/ tree", async () => {
    const base = path.join(repoRoot, consumerRoot, ".qfai");
    const offenders: string[] = [];

    for (const file of await assistantMarkdown(consumerRoot)) {
      const raw = await readFile(path.join(base, file), "utf-8");
      raw.split(/\r?\n/).forEach((line, index) => {
        if (line.includes(".instruction/")) {
          offenders.push(`${file}:${index + 1}: ${line.trim()}`);
        }
      });
    }

    expect(offenders).toEqual([]);
  });

  it("resolves every markdown path agent-selection.md names", async () => {
    const base = path.join(repoRoot, consumerRoot);
    const raw = await readFile(path.join(base, AGENT_SELECTION), "utf-8");
    const cited = [...raw.matchAll(CITED_MARKDOWN_PATH)]
      .map((match) => match[1])
      .filter((entry): entry is string => entry !== undefined);

    // Guard the regex and the placeholder arm together: this file names
    // concrete paths as well as patterns, and a zero match — or an arm that
    // waved every citation through — would leave the assertion checking
    // nothing.
    expect(cited.filter((entry) => !entry.includes("<")).length).toBeGreaterThan(0);

    const dangling = cited.filter((entry) => !resolvesUnder(base, entry));

    expect([...new Set(dangling)].sort()).toEqual([]);
  });

  it("ships every MCP template directory the guidance it points at names", async () => {
    const base = path.join(repoRoot, consumerRoot);
    const raw = await readFile(path.join(base, MCP_GUIDANCE), "utf-8");
    const cited = [...raw.matchAll(CITED_TEMPLATE_DIR)]
      .map((match) => match[1])
      .filter((entry): entry is string => entry !== undefined);

    // Guard the regex itself: three servers are documented, and a silent zero
    // match would make the assertion below pass without checking anything.
    expect(cited.length).toBeGreaterThanOrEqual(3);

    const dangling = cited.filter(
      (entry) => !existsSync(path.join(base, entry.replace(/\/+$/, ""))),
    );
    expect([...new Set(dangling)].sort()).toEqual([]);
  });

  it("declares no front-matter dependency that ships nowhere", async () => {
    const base = path.join(repoRoot, consumerRoot);
    const raw = await readFile(path.join(base, AGENT_SELECTION), "utf-8");
    const frontMatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw)?.[1] ?? "";
    // Rootless `NN_section/file.md` entries are relative to the framework's own
    // `.instruction/` tree and resolve against no root a consumer has.
    const rootless = frontMatter
      .split(/\r?\n/)
      .map((line) => /^\s*-\s+(\S+\.md)\s*$/.exec(line)?.[1])
      .filter((entry): entry is string => entry !== undefined)
      .filter((entry) => !existsSync(path.join(base, entry)));

    expect(rootless).toEqual([]);
  });
});
