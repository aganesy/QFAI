/**
 * The commands that tag or publish stop for a person's approval in both tools
 * this repository is worked with.
 *
 * Release text no longer sits in the entry files every task reads, so the
 * guard against an agent tagging or publishing on its own cannot be prose. The
 * two tools each hold it where they enforce it: Claude Code asks through the
 * `permissions.ask` list of `.claude/settings.json`, and Codex through the
 * `prompt` rules of `.codex/rules/release.rules`.
 *
 * The lists match command text, so each command is pinned in both tools: a
 * command added to one and not the other is a gap, not a choice.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/integration/<this file> -> tests -> packages/qfai -> packages -> repo root
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/**
 * Each command that tags a release, publishes a package or starts a release
 * workflow, with the Claude Code entries that ask before it. A trailing-wildcard
 * entry also matches the bare command; a wildcard in the middle stands for the
 * remote name.
 */
const COMMANDS: readonly { readonly command: string; readonly claude: readonly string[] }[] = [
  { command: "git tag", claude: ["Bash(git tag:*)"] },
  { command: "git push --tags", claude: ["Bash(git push --tags:*)"] },
  { command: "git push --follow-tags", claude: ["Bash(git push --follow-tags:*)"] },
  {
    command: "git push origin --tags",
    claude: ["Bash(git push * --tags)", "Bash(git push * --tags *)"],
  },
  {
    command: "git push origin --follow-tags",
    claude: ["Bash(git push * --follow-tags)", "Bash(git push * --follow-tags *)"],
  },
  { command: "npm publish", claude: ["Bash(npm publish:*)"] },
  { command: "pnpm publish", claude: ["Bash(pnpm publish:*)"] },
  { command: "yarn npm publish", claude: ["Bash(yarn npm publish:*)"] },
  { command: "gh release create", claude: ["Bash(gh release create:*)"] },
  {
    command: "gh workflow run prepare-release.yml",
    claude: ["Bash(gh workflow run prepare-release.yml:*)"],
  },
  {
    command: "gh workflow run tag-release.yml",
    claude: ["Bash(gh workflow run tag-release.yml:*)"],
  },
  { command: "gh workflow run release.yml", claude: ["Bash(gh workflow run release.yml:*)"] },
];

async function askList(): Promise<string[]> {
  const parsed: unknown = JSON.parse(
    await readFile(path.join(ROOT, ".claude", "settings.json"), "utf-8"),
  );
  const permissions: unknown =
    typeof parsed === "object" && parsed !== null ? Reflect.get(parsed, "permissions") : undefined;
  const ask: unknown =
    typeof permissions === "object" && permissions !== null
      ? Reflect.get(permissions, "ask")
      : undefined;
  if (!Array.isArray(ask)) throw new Error("permissions.ask is not an array");
  return ask.filter((entry): entry is string => typeof entry === "string");
}

/** The pattern and decision of each `prefix_rule` in the Codex rules file. */
async function codexRules(): Promise<{ pattern: string; decision: string }[]> {
  const text = await readFile(path.join(ROOT, ".codex", "rules", "release.rules"), "utf-8");
  const rules = [
    ...text.matchAll(/prefix_rule\(\s*pattern\s*=\s*\[([^\]]*)\]\s*,\s*decision\s*=\s*"(\w+)"/g),
  ];
  return rules.map((match) => ({
    pattern: [...(match[1] ?? "").matchAll(/"([^"]+)"/g)].map((token) => token[1]).join(" "),
    decision: match[2] ?? "",
  }));
}

describe("tag and publish commands stop for approval", () => {
  it.each(COMMANDS)("Claude Code asks before `$command`", async ({ claude }) => {
    const ask = await askList();
    for (const entry of claude) expect(ask).toContain(entry);
  });

  it.each(COMMANDS)("Codex prompts before `$command`", async ({ command }) => {
    const rules = await codexRules();
    expect(rules.find((rule) => rule.pattern === command)?.decision).toBe("prompt");
  });

  it("the Codex file holds no rule outside the table, and none that allows", async () => {
    const rules = await codexRules();
    expect(rules.map((rule) => rule.pattern).sort()).toEqual(
      COMMANDS.map(({ command }) => command).sort(),
    );
    expect(rules.every((rule) => rule.decision === "prompt")).toBe(true);
  });
});
