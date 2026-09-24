import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(root, tree, rel), "utf-8");

describe.each(trees)("%s project memory scope", (tree) => {
  it("reads the story tree, discussion pack and role cards", async () => {
    const constitution = await read(tree, "assistant/rule/constitution.md");
    const article = constitution.split("## Article III")[1]?.split("## Article IV")[0];
    expect(article).toBeDefined();
    expect(article).toContain(".qfai/assistant/rule/*");
    expect(article).toContain(".qfai/assistant/agent/");
    expect(article).toContain(".qfai/discussion/");
    expect(article).toContain(".qfai/spec/02_business-flow/");
    expect(article).toContain(".qfai/spec/");
    expect(article).not.toContain(".qfai/assistant/manifest/");
    expect(article).not.toContain(".qfai/assistant/catalog/");
    expect(article).not.toContain(".qfai/specs/spec-");
  });

  it("uses the role card as the sole source of agent metadata", async () => {
    const selection = await read(tree, "assistant/rule/agent-selection.md");
    const constitution = await read(tree, "assistant/rule/constitution.md");
    const cards = await readdir(path.join(root, tree, "assistant/agent"));
    expect(cards).toContain("orchestrator.md");
    for (const field of [
      "owned_artifacts",
      "tool_profile",
      "permission_profile",
      "specialization_tags",
    ]) {
      expect(constitution).toContain(field);
    }
    expect(selection).toContain("card in `.qfai/assistant/agent/`");
    expect(selection).toContain("Do not keep another copy");
  });

  it("resolves package defaults and project overrides for routing", async () => {
    const selection = await read(tree, "assistant/rule/agent-selection.md");
    expect(selection).toContain("assets/defaults/agent-routing.yml");
    expect(selection).toContain("assets/defaults/review-profiles.yml");
    expect(selection).toContain("qfai.config.yaml");
    expect(selection).toContain("replaces the matching default entry as a whole");
    expect(selection).toContain("does not own copies of these default files");
  });

  it("composes project memory with the stage steering refresh", async () => {
    const constitution = await read(tree, "assistant/rule/constitution.md");
    const workflow = await read(tree, "assistant/rule/workflow.md");
    expect(constitution).toContain("Stage 0 — Steering refresh contract");
    expect(workflow).toContain("Article III");
  });
});
