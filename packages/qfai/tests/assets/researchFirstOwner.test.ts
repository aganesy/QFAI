import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parse as parseYaml } from "yaml";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const defaults = path.join(repoRoot, "packages/qfai/assets/defaults/agent-routing.yml");

async function framingAgents(): Promise<string[]> {
  const parsed: unknown = parseYaml(await readFile(defaults, "utf8"));
  if (typeof parsed !== "object" || parsed === null || !("routing" in parsed)) return [];
  const routing = (parsed as { routing?: unknown }).routing;
  if (!Array.isArray(routing)) return [];
  const discussion = routing.find(
    (entry): entry is { skill: string; phases?: unknown } =>
      typeof entry === "object" &&
      entry !== null &&
      "skill" in entry &&
      (entry as { skill?: unknown }).skill === "qfai-discussion",
  );
  if (!Array.isArray(discussion?.phases)) return [];
  const framing = discussion.phases.find(
    (entry): entry is { id: string; mandatory_agents?: unknown } =>
      typeof entry === "object" &&
      entry !== null &&
      "id" in entry &&
      (entry as { id?: unknown }).id === "framing",
  );
  const mandatory = framing?.mandatory_agents;
  return Array.isArray(mandatory)
    ? mandatory.filter((agent): agent is string => typeof agent === "string")
    : [];
}

describe.each(trees)("%s research-first protocol owner", (tree) => {
  it("names an existing card that the default framing phase requires", async () => {
    const assistant = path.join(repoRoot, tree, "assistant");
    const protocol = await readFile(
      path.join(assistant, "rule/research-first-protocol.md"),
      "utf8",
    );
    const cards = (await readdir(path.join(assistant, "agent")))
      .filter((name) => name.endsWith(".md"))
      .map((name) => name.slice(0, -3));
    const owner = /initial research protocol for `([a-z][a-z0-9-]*)`/.exec(
      protocol.slice(0, 500),
    )?.[1];

    expect(owner).toBeDefined();
    expect(cards).toContain(owner);
    expect(await framingAgents()).toContain(owner);
    expect(protocol.replace(/\s+/g, " ")).toContain("whether or not the work includes UI");
  });
});
