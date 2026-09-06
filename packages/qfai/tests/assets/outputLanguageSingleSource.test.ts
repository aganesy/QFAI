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
 * assertions keep the shipped tree at one source: no assistant document may
 * bind output to a named language again.
 *
 * The tree-wide sweep does not look for the two Japanese strings that happened
 * to leak in — the defect is a *class*, and `Always respond in English` or
 * `出力は日本語とする` recreates it word-for-word differently. It delegates to
 * {@link findFixedLanguageDirectives}, which matches directive *shapes* in
 * both languages and admits exactly two ways to name a language: a clause
 * conditional on the user's own language, and an explicit disclaimer that the
 * file pins nothing. The matcher's own coverage — what it must catch, and the
 * legitimate phrasings it must leave alone — is asserted at the bottom of this
 * file.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  findFixedLanguageDirectives,
  fixedLanguageOffenders,
} from "../helpers/fixedOutputLanguage.js";

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

      // The exact block that leaked in, pinned by its literal wording so the
      // regression that started this is named, not merely covered by class.
      expect(text).not.toContain("言語指示");
      expect(text).not.toContain("厳守");
      expect(text).not.toContain("報告・出力: 日本語");
      // And the class it belongs to, whatever the wording.
      expect(fixedLanguageOffenders(AGENT_SELECTION, text)).toEqual([]);
    });

    it(`${tree}: agent-selection.md points at the Absolute Rule instead`, async () => {
      const text = flat(await read(tree, AGENT_SELECTION));

      expect(text).toContain(
        "`.qfai/assistant/constitution/constitution.md` の Absolute Rule — Output Language に従う",
      );
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

    it(`${tree}: no shipped assistant file binds output to a named language`, async () => {
      const assistantDir = path.join(repoRoot, tree, "assistant");
      const files = await collectMarkdown(assistantDir);
      expect(files.length).toBeGreaterThan(0);

      const offenders: string[] = [];
      for (const rel of files) {
        const text = await readFile(path.join(assistantDir, rel), "utf-8");
        offenders.push(...fixedLanguageOffenders(rel, text));
      }

      expect(offenders).toEqual([]);
    });
  }
});

/**
 * The sweep above is only as good as this matcher, so the matcher is pinned
 * directly: the left column is what a re-port of the defect could look like,
 * the right column is what already ships and must stay legal.
 */
describe("fixed-language directive matcher", () => {
  const CAUGHT: ReadonlyArray<readonly [string, string]> = [
    ["the original ported header", "> **言語指示（厳守）**"],
    ["the original ported bullet", "> - 報告・出力: 日本語（Plan も含む）"],
    ["an English directive", "Always respond in English."],
    ["an English directive, passive", "All reports MUST be written in Japanese."],
    ["an English exclusivity clause", "Use English only for user-facing output."],
    ["an English key/value pin", "Output language: English"],
    ["a Japanese directive", "出力は日本語とする。"],
    ["a Japanese directive, emphatic", "必ず英語で回答すること。"],
    ["a Japanese exclusivity clause", "ユーザー向けの応答は日本語に統一する。"],
    ["a directive soft-wrapped over two lines", "Every plan is\nwritten in English."],
    // A fallback wearing the user-conditional carve-out's clothes. It opens
    // with `If`, it names the user, and it forces English on every operator
    // who does not work in it — so being conditional on the user cannot be
    // what earns the exemption. What earns it is the condition naming the
    // language the directive then echoes; these name none.
    [
      "an English fallback to a fixed language",
      "If the user does not specify a language, always respond in English.",
    ],
    [
      "an English fallback, `when` and a bare verb",
      "When the user has not chosen a language, use English.",
    ],
    [
      "a Japanese fallback to a fixed language",
      "ユーザーが言語を指定しない場合は必ず英語で回答すること。",
    ],
  ];

  for (const [label, sample] of CAUGHT) {
    it(`catches ${label}`, () => {
      expect(findFixedLanguageDirectives(sample)).not.toEqual([]);
    });
  }

  const PERMITTED: ReadonlyArray<readonly [string, string]> = [
    ["the Absolute Rule itself", ABSOLUTE_RULE],
    ["the rule restated per language", "- If the user writes in Japanese, output Japanese."],
    ["the rule restated per language (en)", "- If the user writes in English, output English."],
    [
      "the mixed-language tie-break",
      "- If the user mixes languages, prefer the dominant language unless explicitly instructed otherwise.",
    ],
    [
      "a per-language literal under a user-language instruction",
      "You MUST end the output with a handoff sentence in the active user language.\n\n- Japanese output (use this exact sentence):",
    ],
    [
      "the agent-selection disclaimer",
      "> **出力言語**: `.qfai/assistant/constitution/constitution.md` の Absolute Rule — Output Language に従う。\n" +
        "> このファイルは出力言語を固定しない（本文が日本語であることは記述言語であって、\n" +
        "> エージェントの出力に対する指示ではない）。",
    ],
    [
      "prose that merely names a language",
      "| `countWords` splits on `\\s+` | prose critiques pass trivially for Japanese/Chinese copy. |",
    ],
    ["a glossary term ending in 語", "- 用語・単語・述語は言語ごとに定義する。"],
    // The Japanese restatement, kept beside the fallback it must not be
    // confused with: the condition names 日本語, so the directive echoing it is
    // the user's language and not a fixed one.
    ["the rule restated per language (ja)", "- ユーザーが日本語で書く場合は日本語で回答する。"],
  ];

  for (const [label, sample] of PERMITTED) {
    it(`leaves ${label} alone`, () => {
      expect(findFixedLanguageDirectives(sample)).toEqual([]);
    });
  }
});
