/**
 * The session agent delegates by context, never by role: the shipped rule, the shipped catalogue,
 * and what `qfai validate` does with a card an earlier release left in a project.
 */
import { cp, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { parseAgentFrontmatter } from "../../src/core/agentFrontmatter.js";
import { validateAgentDefinition } from "../../src/core/validators/agentDefinition.js";
import { getInitAssetsDir } from "../../src/shared/assets.js";
import { removeTempTree } from "../helpers/tempTree.js";

const ASSISTANT = path.join(getInitAssetsDir(), ".qfai", "assistant");
const AGENTS = path.join(ASSISTANT, "agent");
const BASELINE = path.join(ASSISTANT, "rule", "shared-skill-delegation-baseline.md");

async function flatText(file: string): Promise<string> {
  return (await readFile(file, "utf-8")).replace(/\s+/g, " ");
}

/** The text under `heading`, up to the next heading of any level. */
function section(text: string, heading: string): string {
  return text.split(`${heading} `)[1]?.split(/ #{2,3} /)[0] ?? "";
}

async function markdownUnder(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => path.join(entry.parentPath, entry.name));
}

// An agent is named by its card id; every shipped card id ends in one of these. A heading anchor
// such as `#definition-independent-reviewer` names a section, not an agent.
const AGENT_NAME =
  /(?<![#\w-])[a-z]+(?:-[a-z]+)*-(?:engineer|reviewer|analyst|architect|planner|steward|strategist|gatekeeper)\b/g;

describe("the session agent delegates for two reasons only", () => {
  // QFAI:AC-0001-0163-07
  // QFAI:EX-0001-0163-08
  it("names context size and keeping its own context small as no reason, since the host compacts", async () => {
    const intro = section(await flatText(BASELINE), "## Sub-agent Delegation (MANDATORY)");
    expect(intro).toContain("starts a sub-agent for exactly two reasons");
    expect(intro).toContain(
      "Nothing else is a reason. Context size is not: the host compacts a long run.",
    );
    expect(intro).toContain("neither is keeping the session's own context small");
  });

  // QFAI:EX-0001-0163-09
  it("holds a host's built-in agents to the same two reasons, and a single lookup is not two units", async () => {
    const text = await flatText(BASELINE);
    expect(section(text, "## Sub-agent Delegation (MANDATORY)")).toContain(
      "A host's built-in agents follow the same two reasons.",
    );
    expect(text).toContain(
      "Two or more story units or read-only lookups that pass the parallel-unit gate",
    );
  });

  // QFAI:EX-0001-0163-10
  it("counts an agent that only stands in for a missing tool as a tool call", async () => {
    expect(section(await flatText(BASELINE), "## Sub-agent Delegation (MANDATORY)")).toContain(
      "An agent that only stands in for a tool the host lacks, and returns that tool's result, is a tool call, not a delegation.",
    );
  });
});

describe("a judgement starts from a black-box brief", () => {
  // QFAI:AC-0001-0163-08
  // QFAI:EX-0001-0163-11
  it("gives the judge the artifacts and what binds them, and never the author's rationale", async () => {
    const protocol = section(await flatText(BASELINE), "### Session Agent Protocol");
    expect(protocol).toContain("**No sub-agent inherits the conversation.**");
    expect(protocol).toContain(
      "It holds the fixed revision, the request in the user's own words, the story tree and contracts that bind the work, the written decisions and the remit.",
    );
    expect(protocol).toContain(
      "It never holds the author's rationale, the options the session weighed, or the session's view of its own work.",
    );
    expect(protocol).toContain(
      "a commit, or the base commit with the exact diff of the uncommitted work saved where the judge can read it",
    );
  });

  // QFAI:EX-0001-0163-12
  it("stops the stage when the host can only fork the conversation into the judge", async () => {
    const text = await flatText(BASELINE);
    expect(section(text, "### Session Agent Protocol")).toContain(
      "A host that can only fork the conversation is `unavailable` for an independent judgement.",
    );
    expect(section(text, "### Delegation Failure (Hard Stop)")).toContain(
      "Applies when the failed delegation is an independent judgement",
    );
  });
});

describe("a skill run by name names its reviewer", () => {
  // QFAI:AC-0001-0163-09
  // QFAI:EX-0001-0163-13
  it("has the migration skill name architecture-reviewer", async () => {
    const skill = await flatText(
      path.join(ASSISTANT, "skill", "qfai-migration-v1-to-v2", "SKILL.md"),
    );
    expect(skill).toContain("The reviewer is `architecture-reviewer`.");
  });

  // QFAI:EX-0001-0163-14
  it("has the configure skill name implementation-reviewer and no gatekeeper", async () => {
    const skill = await flatText(path.join(ASSISTANT, "skill", "qfai-configure", "SKILL.md"));
    expect(skill).toContain("The reviewer is `implementation-reviewer`");
    expect(skill).not.toContain("qa-gatekeeper");
  });
});

describe("the shipped catalogue", () => {
  // QFAI:AC-0001-0161-07
  // QFAI:EX-0001-0161-10
  it("holds one worker, and every agent the shipped files name is one of its cards", async () => {
    const cards = (await readdir(AGENTS)).filter((name) => name.endsWith(".md"));
    const kinds = new Map<string, string>();
    for (const name of cards) {
      const parsed = parseAgentFrontmatter(await readFile(path.join(AGENTS, name), "utf-8"));
      if (parsed.ok) kinds.set(parsed.frontmatter.name, parsed.frontmatter.kind);
    }
    expect([...kinds].filter(([, kind]) => kind === "worker").map(([name]) => name)).toEqual([
      "fullstack-engineer",
    ]);
    const unknown = new Set<string>();
    for (const file of await markdownUnder(ASSISTANT)) {
      if (path.dirname(file) === AGENTS) continue;
      for (const name of (await readFile(file, "utf-8")).match(AGENT_NAME) ?? []) {
        if (!kinds.has(name)) unknown.add(`${path.relative(ASSISTANT, file)}: ${name}`);
      }
    }
    expect([...unknown].sort()).toEqual([]);
  });

  // QFAI:EX-0001-0161-11
  it("lets validate pass a worker card an earlier release left beside the shipped ones", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-kept-card-"));
    try {
      const agents = path.join(root, ".qfai", "assistant", "agent");
      await cp(AGENTS, agents, { recursive: true });
      const kept = (await readFile(path.join(agents, "fullstack-engineer.md"), "utf-8")).replace(
        /^name: fullstack-engineer$/m,
        "name: backend-engineer",
      );
      await writeFile(path.join(agents, "backend-engineer.md"), kept, "utf-8");
      expect(await validateAgentDefinition(root)).toEqual([]);
    } finally {
      await removeTempTree(root);
    }
  });
});
