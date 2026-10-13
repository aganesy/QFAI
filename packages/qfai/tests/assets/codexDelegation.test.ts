import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const baselinePath = path.join("assistant", "rule", "shared-skill-delegation-baseline.md");
const notesCitation = ".qfai/assistant/rule/references/codex-delegation.md";

/** The Orchestrator Protocol of the delegation baseline, with wrapping undone. */
async function readProtocol(tree: string): Promise<string> {
  const content = await readFile(path.join(repoRoot, tree, baselinePath), "utf-8");
  const start = content.indexOf("### Orchestrator Protocol");
  const end = content.indexOf("### Worker edit boundary");
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return content.slice(start, end).replace(/\s+/g, " ");
}

/** Each bullet of the Codex notes, keyed by its bold lead, with wrapping undone. */
async function readNotes(tree: string): Promise<Map<string, string>> {
  const file = path.join(repoRoot, tree, "assistant", "rule", "references", "codex-delegation.md");
  const content = await readFile(file, "utf-8");
  const bullets = new Map<string, string>();
  for (const item of content.split(/\n(?=- )/).slice(1)) {
    const lead = /^- \*\*([^*]+)\*\*/.exec(item);
    if (lead?.[1] !== undefined) bullets.set(lead[1], item.replace(/\s+/g, " "));
  }
  return bullets;
}

describe.each(trees)("%s — Codex delegation notes", (tree) => {
  // QFAI:EX-0001-0224-53
  it("sends an orchestrator on Codex to notes that exist, before it delegates", async () => {
    const protocol = await readProtocol(tree);
    expect(protocol).toContain(`- On Codex, read \`${notesCitation}\` before delegating.`);
    const target = await stat(path.join(repoRoot, tree, path.relative(".qfai", notesCitation)));
    expect(target.isFile()).toBe(true);
  });

  // QFAI:EX-0001-0224-53
  it("gives each of the four instructions its own bullet with the tool's real parameters", async () => {
    const notes = await readNotes(tree);
    expect([...notes.keys()]).toEqual([
      "Self-contained brief.",
      "One final answer, no interim messages.",
      "Long wait.",
      "No polling.",
    ]);

    const brief = notes.get("Self-contained brief.") ?? "";
    expect(brief).toContain('Call `spawn_agent` with `fork_turns: "none"` and a `message`');
    expect(brief).toContain('`fork_turns` defaults to `"all"`');
    expect(brief).toContain("`fork_context`");

    const answer = notes.get("One final answer, no interim messages.") ?? "";
    expect(answer).toContain("send no `send_message` updates");
    expect(answer).toContain("return its result once, as its final answer");

    const wait = notes.get("Long wait.") ?? "";
    expect(wait).toContain("calls `wait_agent` with a `timeout_ms` of minutes");
    expect(wait).toContain("With no work of its own left");
    expect(wait).toContain(
      "of minutes within the maximum the tool states, such as `600000`, not 10 to 60 seconds.",
    );

    const polling = notes.get("No polling.") ?? "";
    for (const forbidden of ["`sleep`", "short `wait_agent` calls", "`list_agents` calls"]) {
      expect(polling).toContain(forbidden);
    }
    expect(polling).toContain("`followup_task`");
    expect(polling).toMatch(/^- \*\*No polling\.\*\* Never wait with /);
  });
});
