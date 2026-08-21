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

/** A backticked, slash-bearing markdown path — how this tree cites a file. */
const CITED_MARKDOWN_PATH = /`([^`\s]+\/[^`\s]+\.md)`/g;

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
    const dangling = [...raw.matchAll(CITED_MARKDOWN_PATH)]
      .map((match) => match[1])
      .filter((cited) => !existsSync(path.join(base, cited)));

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
