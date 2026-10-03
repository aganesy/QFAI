import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import fg from "fast-glob";
import { describe, expect, it } from "vitest";

import { countLines } from "../../src/core/doctor/assetLineBudget.js";

/**
 * The mechanical half of `.agents/rules/ai-readable-markdown.md`, held against
 * the Markdown `qfai init` ships: the assistant tree and the rule masters.
 *
 * The repository's own `AGENTS.md` is left out on purpose. It is over the line
 * limit today, and bringing it under is its own change.
 */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const INIT = path.join(repoRoot, "packages", "qfai", "assets", "init");
const ASSISTANT = path.join(INIT, ".qfai", "assistant");
const RULES = path.join(INIT, "root", ".agents", "rules");

const MAX_LINES = 500;
const MAX_SKILL_CHARS = 20_000;
const CONTENTS_THRESHOLD = 100;

/** A file under a skill's `references/`, at any depth. */
const REFERENCE = /^skill\/[^/]+\/references\//;

/** How the shipped tree is addressed from a consuming project's root. */
const INSTALL_ROOT_PREFIX = ".qfai/assistant/";

/** A path-shaped run of text ending in `.md`: how every mention is written. */
const MD_MENTION = /[\w./-]*\.md\b/g;

/** Body overruns, excluding closed YAML frontmatter and counting Unicode code points. */
function skillBodyOverruns(skills: readonly (readonly [string, string])[]): string[] {
  return skills
    .map(([rel, text]) => {
      const body = text.replace(/^---\r?\n(?:[\s\S]*?\r?\n)?---(?:\r?\n|$)/, "");
      return [rel, Array.from(body).length] as const;
    })
    .filter(([, count]) => count > MAX_SKILL_CHARS)
    .map(([rel, count]) => `${rel} (${count})`);
}

async function readTree(root: string): Promise<Map<string, string>> {
  const tree = new Map<string, string>();
  for (const rel of (await fg(["**/*.md"], { cwd: root })).sort()) {
    tree.set(rel, await readFile(path.join(root, rel), "utf-8"));
  }
  return tree;
}

/**
 * The `##` headings outside fenced blocks, in order.
 *
 * A fence closes only on the same marker at no less than its opening length, so
 * a three-backtick sample quoted inside a four-backtick block does not end it.
 */
function levelTwoHeadings(markdown: string): string[] {
  const headings: string[] = [];
  let fence: string | undefined;
  for (const line of markdown.split(/\r?\n/)) {
    const marker = /^\s*(`{3,}|~{3,})/.exec(line)?.[1];
    if (fence !== undefined) {
      const closing = /^ {0,3}(`{3,}|~{3,})[ \t]*$/.exec(line)?.[1];
      if (closing !== undefined && closing[0] === fence[0] && closing.length >= fence.length) {
        fence = undefined;
      }
      continue;
    }
    if (marker !== undefined) {
      fence = marker;
      continue;
    }
    const heading = /^## (.+?)\s*$/.exec(line);
    if (heading?.[1] !== undefined) headings.push(heading[1]);
  }
  return headings;
}

/** The bullet items directly under `## Contents`, up to the next heading. */
function contentsItems(markdown: string): string[] {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => /^## Contents\s*$/.test(line));
  if (start < 0) return [];
  const items: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (/^#{1,6} /.test(line)) break;
    const item = /^- (.+?)\s*$/.exec(line);
    if (item?.[1] !== undefined) items.push(item[1]);
  }
  return items;
}

/**
 * Tree paths a written `.md` token can denote inside `from`: install-root,
 * relative to the mentioning file, relative to the owning skill, or bare. The
 * same resolution the reachability guard uses, so a mention it counts as an
 * edge is the mention this guard refuses.
 */
function resolveMention(from: string, token: string): string[] {
  const cleaned = token.replace(/^\.\//, "");
  const candidates: string[] = [];
  if (cleaned.startsWith(INSTALL_ROOT_PREFIX)) {
    candidates.push(cleaned.slice(INSTALL_ROOT_PREFIX.length));
  }
  candidates.push(path.posix.join(path.posix.dirname(from), cleaned));
  const skill = /^(skill\/[^/]+)\//.exec(from)?.[1];
  if (skill !== undefined) candidates.push(path.posix.join(skill, cleaned));
  candidates.push(cleaned);
  return candidates.map((candidate) => path.posix.normalize(candidate));
}

/** Every other reference a reference names, as `from -> to`. */
function referenceHops(tree: ReadonlyMap<string, string>): string[] {
  const hops = new Set<string>();
  for (const [from, text] of tree) {
    if (!REFERENCE.test(from)) continue;
    for (const [token] of text.matchAll(MD_MENTION)) {
      for (const candidate of resolveMention(from, token)) {
        if (candidate !== from && tree.has(candidate) && REFERENCE.test(candidate)) {
          hops.add(`${from} -> ${candidate}`);
        }
      }
    }
  }
  return [...hops].sort();
}

describe("AI-readable Markdown in the shipped tree", () => {
  it(`keeps every shipped Markdown file at or under ${MAX_LINES} lines`, async () => {
    const assistant = await readTree(ASSISTANT);
    const rules = await readTree(RULES);
    expect(assistant.size, "no shipped assistant Markdown was found").toBeGreaterThan(50);
    expect(rules.size, "no shipped rule master was found").toBeGreaterThan(0);

    const over: string[] = [];
    for (const [label, tree] of [
      ["assistant", assistant],
      ["rules", rules],
    ] as const) {
      for (const [rel, text] of tree) {
        const lines = countLines(text);
        if (lines > MAX_LINES) over.push(`${label}/${rel} (${lines})`);
      }
    }
    expect(over, `over ${MAX_LINES} lines — move a section into a reference`).toEqual([]);
  });

  it(`keeps every SKILL.md body at or under ${MAX_SKILL_CHARS} characters`, async () => {
    const tree = await readTree(ASSISTANT);
    const skills = [...tree].filter(([rel]) => /^skill\/[^/]+\/SKILL\.md$/.test(rel));
    expect(skills.length, "no shipped SKILL.md was found").toBeGreaterThan(5);

    expect(
      skillBodyOverruns(skills),
      `over ${MAX_SKILL_CHARS} characters — move a section into a reference`,
    ).toEqual([]);
  });

  it(`opens every reference over ${CONTENTS_THRESHOLD} lines with its contents`, async () => {
    const tree = await readTree(ASSISTANT);
    const long = [...tree].filter(
      ([rel, text]) => REFERENCE.test(rel) && countLines(text) > CONTENTS_THRESHOLD,
    );
    expect(long.length, "no long reference was found").toBeGreaterThan(0);

    const wrong: string[] = [];
    for (const [rel, text] of long) {
      const headings = levelTwoHeadings(text);
      if (headings[0] !== "Contents") {
        wrong.push(`${rel}: the first \`##\` heading is not \`## Contents\``);
        continue;
      }
      const listed = contentsItems(text);
      const actual = headings.slice(1);
      if (JSON.stringify(listed) !== JSON.stringify(actual)) {
        wrong.push(`${rel}: lists ${JSON.stringify(listed)}, has ${JSON.stringify(actual)}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it("keeps references one level deep: no reference names another reference", async () => {
    expect(referenceHops(await readTree(ASSISTANT))).toEqual([]);
  });
});

describe("the guard's own readers", () => {
  it("counts only the body, including non-BMP characters, at the exact limit", () => {
    const body = "\u{1F680}".repeat(MAX_SKILL_CHARS);
    const frontmatter = `---\nname: ${"x".repeat(MAX_SKILL_CHARS)}\n---\n`;
    expect(
      skillBodyOverruns([
        ["LF", frontmatter + body],
        ["CRLF", frontmatter.replace(/\n/g, "\r\n") + body],
        ["no frontmatter", body],
        ["empty frontmatter", "---\n---\n" + body],
        ["over", frontmatter + body + "x"],
      ]),
    ).toEqual([`over (${MAX_SKILL_CHARS + 1})`]);

    const unfinished = `---\nname: ${"x".repeat(MAX_SKILL_CHARS)}`;
    expect(skillBodyOverruns([["unfinished", unfinished]])).toEqual([
      `unfinished (${unfinished.length})`,
    ]);
  });

  it("skips headings inside a fence, including a longer fence around a shorter one", () => {
    const text = [
      "# T",
      "## Contents",
      "- A",
      "## A",
      "````md",
      "```",
      "## Not a heading",
      "```",
      "````",
      "~~~",
      "## Also not",
      "~~~",
    ].join("\n");
    expect(levelTwoHeadings(text)).toEqual(["Contents", "A"]);
    expect(contentsItems(text)).toEqual(["A"]);
  });

  it("keeps a fence open when its marker has an info string", () => {
    const text = ["~~~md", "~~~js", "## Not a heading", "~~~"].join("\n");
    expect(levelTwoHeadings(text)).toEqual([]);
  });

  it("finds a hop by every path form a reference can use", () => {
    const tree = new Map([
      ["skill/alpha/SKILL.md", "Read `references/one.md`."],
      ["skill/alpha/references/one.md", "Then `two.md`, and `../../beta/references/three.md`."],
      ["skill/alpha/references/two.md", "Then `.qfai/assistant/skill/alpha/references/one.md`."],
      ["skill/beta/references/three.md", "No mention."],
    ]);
    expect(referenceHops(tree)).toEqual([
      "skill/alpha/references/one.md -> skill/alpha/references/two.md",
      "skill/alpha/references/one.md -> skill/beta/references/three.md",
      "skill/alpha/references/two.md -> skill/alpha/references/one.md",
    ]);
  });

  it("does not count a SKILL.md naming a reference as a hop", () => {
    const tree = new Map([
      ["skill/alpha/SKILL.md", "Read `references/one.md`."],
      ["skill/alpha/references/one.md", "Detail."],
    ]);
    expect(referenceHops(tree)).toEqual([]);
  });
});
