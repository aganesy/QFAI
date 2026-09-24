import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import { parse as parseToml } from "smol-toml";

import { parseAgentFrontmatter } from "../../src/core/agentFrontmatter.js";
import { renderCodexAgentToml } from "../../src/core/codexAgentToml.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const cardsDir = join(repoRoot, ".qfai", "assistant", "agent");
const codexDir = join(repoRoot, ".codex", "agents");
const configPath = join(repoRoot, ".codex", "config.toml");

function cardNames(): string[] {
  return readdirSync(cardsDir)
    .filter((name) => name.endsWith(".md"))
    .map((name) => name.slice(0, -3))
    .sort();
}

describe("Codex agent profiles derive from cards", () => {
  it("keeps one generated profile for each card", () => {
    const cards = cardNames();
    expect(cards).toHaveLength(19);
    expect(
      readdirSync(codexDir)
        .filter((name) => name.endsWith(".toml"))
        .sort(),
    ).toEqual(cards.map((name) => `${name}.toml`));
  });

  it("keeps the card as the only agent definition", () => {
    for (const name of cardNames()) {
      const markdown = readFileSync(join(cardsDir, `${name}.md`), "utf-8");
      const parsed = parseAgentFrontmatter(markdown);
      expect(parsed.ok, `${name}: invalid card frontmatter`).toBe(true);
      if (!parsed.ok) continue;
      expect(parsed.frontmatter.name).toBe(name);
      const rendered = renderCodexAgentToml(markdown, parsed.frontmatter.kind, name);
      expect(rendered.ok, `${name}: could not render`).toBe(true);
      if (!rendered.ok) continue;
      expect(readFileSync(join(codexDir, `${name}.toml`), "utf-8").replace(/\r\n/g, "\n")).toBe(
        rendered.toml,
      );
      const toml = parseToml(rendered.toml);
      expect(toml.name).toBe(name);
      expect(toml.description).toBe(parsed.frontmatter.description);
      if (parsed.frontmatter.kind === "reviewer") {
        expect(toml.sandbox_mode).toBe("read-only");
      } else {
        expect("sandbox_mode" in toml).toBe(false);
      }
    }
  });

  it("keeps Codex subagent settings", () => {
    expect(existsSync(configPath)).toBe(true);
    const parsed = parseToml(readFileSync(configPath, "utf-8"));
    expect(parsed.agents).toEqual(expect.objectContaining({ max_threads: 20, max_depth: 1 }));
  });
});
