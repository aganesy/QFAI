/**
 * The research-first protocol had no addressee that the framework could route.
 *
 * `constitution/research-first-protocol.md` named its owner in prose
 * ("UI/UX 専門家サブエージェント"), which is not one of the role ids in
 * `manifest/agent-catalog.yml`. `constitution/agent-selection.md` declares the
 * catalog + routing manifests the SSOT for selection and forbids deciding by
 * skill-body intuition, so a prose job description leaves "who runs this"
 * unanswerable — while the trigger fires on every `/qfai-discussion` run.
 *
 * The owner must therefore be a catalog role id, and it must be an agent that
 * routing actually places on the `qfai-discussion` skill.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parse as parseYaml } from "yaml";
import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const assistantFile = (tree: string, ...segments: string[]): Promise<string> =>
  readFile(path.join(repoRoot, tree, "assistant", ...segments), "utf-8");

const protocolDoc = (tree: string): Promise<string> =>
  assistantFile(tree, "constitution", "research-first-protocol.md");

async function catalogIds(tree: string): Promise<string[]> {
  const raw = await assistantFile(tree, "manifest", "agent-catalog.yml");
  const parsed: unknown = parseYaml(raw);
  const agents =
    typeof parsed === "object" && parsed !== null && "agents" in parsed
      ? (parsed as { agents?: unknown }).agents
      : undefined;
  if (!Array.isArray(agents)) return [];
  return agents.flatMap((agent) => {
    if (typeof agent !== "object" || agent === null || !("id" in agent)) return [];
    const id: unknown = (agent as { id?: unknown }).id;
    return typeof id === "string" ? [id] : [];
  });
}

async function discussionRoutedAgents(tree: string): Promise<string[]> {
  const raw = await assistantFile(tree, "manifest", "agent-routing.yml");
  const parsed: unknown = parseYaml(raw);
  const routing =
    typeof parsed === "object" && parsed !== null && "routing" in parsed
      ? (parsed as { routing?: unknown }).routing
      : undefined;
  if (!Array.isArray(routing)) return [];
  const entry = routing.find(
    (row): row is { skill: string; phases?: unknown } =>
      typeof row === "object" &&
      row !== null &&
      "skill" in row &&
      (row as { skill?: unknown }).skill === "qfai-discussion",
  );
  const phases = entry?.phases;
  if (!Array.isArray(phases)) return [];
  return phases.flatMap((phase) => {
    if (typeof phase !== "object" || phase === null) return [];
    const { mandatory_agents: mandatory, conditional_agents: conditional } = phase as {
      mandatory_agents?: unknown;
      conditional_agents?: unknown;
    };
    const collect = (value: unknown): string[] =>
      Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
    return [...collect(mandatory), ...collect(conditional)];
  });
}

function ownerIds(doc: string): string[] {
  const ownerLine = doc.split(/\r?\n/).find((line) => line.includes("サブエージェント"));
  expect(ownerLine, "no owner line in research-first-protocol.md").toBeDefined();
  return [...(ownerLine ?? "").matchAll(/`([a-z][a-z0-9-]*)`/g)]
    .map((match) => match[1])
    .filter((id): id is string => id !== undefined);
}

describe.each(TREES)("%s research-first-protocol owner", (tree) => {
  it("names its owner with a role id, not a prose job description", async () => {
    const doc = await protocolDoc(tree);
    expect(doc).not.toContain("UI/UX 専門家");
    expect(ownerIds(doc).length).toBeGreaterThan(0);
  });

  it("uses only ids that exist in agent-catalog", async () => {
    const [doc, ids] = await Promise.all([protocolDoc(tree), catalogIds(tree)]);
    expect(ids.length).toBeGreaterThan(0);
    for (const owner of ownerIds(doc)) {
      expect(ids, `${tree}: owner ${owner} is absent from agent-catalog`).toContain(owner);
    }
  });

  it("names an owner that routing places on the skill the trigger fires from", async () => {
    const [doc, routed] = await Promise.all([protocolDoc(tree), discussionRoutedAgents(tree)]);
    expect(routed.length).toBeGreaterThan(0);
    for (const owner of ownerIds(doc)) {
      expect(routed, `${tree}: owner ${owner} is not routed to qfai-discussion`).toContain(owner);
    }
  });

  it("states that the unconditional trigger is scope-independent", async () => {
    const doc = await protocolDoc(tree);
    expect(doc).toContain("UI の有無にかかわらず");
  });
});
