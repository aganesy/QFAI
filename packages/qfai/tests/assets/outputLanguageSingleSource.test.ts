/**
 * Output language has exactly one normative source (#683, #772).
 *
 * `constitution/constitution.md` declares an Absolute Rule — output in the
 * user's working language — and says it "overrides all other stylistic
 * preferences". `constitution/workflow.md` restates it. But
 * `constitution/agent-selection.md` opened with a ported-in block that pinned
 * a language unconditionally:
 *
 *     > **言語指示（厳守）**
 *     >
 *     > - 報告・出力: 日本語（Plan も含む）
 *
 * Nothing in `constitution/` establishes precedence between its files, all 19
 * shipped agent definitions declare the whole directory as a mandatory input,
 * and `qfai init` routes `agent-selection` into that layer unconditionally —
 * so an English-working operator got Japanese Plans from a toolkit whose own
 * constitution promised English, with no opt-out.
 *
 * The block is gone; what remains is a pointer at the one rule. These
 * assertions keep the shipped tree at one source: no constitution file may
 * hard-code an output language again.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const CONSTITUTION_DIR = "assistant/constitution";
const AGENT_SELECTION = `${CONSTITUTION_DIR}/agent-selection.md`;
const CONSTITUTION = `${CONSTITUTION_DIR}/constitution.md`;
const WORKFLOW = `${CONSTITUTION_DIR}/workflow.md`;

const ABSOLUTE_RULE =
  "**All outputs MUST be written in the user’s working language for this session.**";

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s*\n\s*/g, " ");

/** Every `.md` file under `dir`, as paths relative to `dir`, `/`-separated. */
async function collectMarkdown(dir: string, base: string = dir): Promise<string[]> {
  const collected: string[] = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return collected;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collected.push(...(await collectMarkdown(full, base)));
    } else if (entry.name.endsWith(".md")) {
      collected.push(path.relative(base, full).replace(/\\/g, "/"));
    }
  }
  return collected;
}

describe("output language is stated in one place only", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: agent-selection.md pins no language`, async () => {
      const text = await read(tree, AGENT_SELECTION);

      expect(text).not.toContain("言語指示");
      expect(text).not.toContain("厳守");
      expect(text).not.toContain("報告・出力: 日本語");
    });

    it(`${tree}: agent-selection.md points at the Absolute Rule instead`, async () => {
      const text = flat(await read(tree, AGENT_SELECTION));

      expect(text).toContain("`constitution.md` の Absolute Rule — Output Language に従う");
      // Naming the removal is what stops it being re-ported as a "missing"
      // header block the next time the file is synced from `.instruction/`.
      expect(text).toContain("このファイルは出力言語を固定しない");
    });

    it(`${tree}: the Absolute Rule itself still ships`, async () => {
      expect(flat(await read(tree, CONSTITUTION))).toContain(flat(ABSOLUTE_RULE));
      expect(flat(await read(tree, WORKFLOW))).toContain(flat(ABSOLUTE_RULE));
      expect(flat(await read(tree, CONSTITUTION))).toContain(
        "This rule overrides all other stylistic preferences.",
      );
    });

    it(`${tree}: no shipped assistant file hard-codes an output language`, async () => {
      const assistantDir = path.join(repoRoot, tree, "assistant");
      const files = await collectMarkdown(assistantDir);
      expect(files.length).toBeGreaterThan(0);

      const offenders: string[] = [];
      for (const rel of files) {
        const text = await readFile(path.join(assistantDir, rel), "utf-8");
        if (text.includes("言語指示") || text.includes("報告・出力: 日本語")) {
          offenders.push(rel);
        }
      }

      expect(offenders).toEqual([]);
    });
  }
});
