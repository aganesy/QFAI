import { readFile } from "node:fs/promises";
import path from "node:path";

import fg from "fast-glob";
import { describe, expect, it } from "vitest";

/**
 * A `references/*.md` file is reached by being named, not by being present:
 * `qfai-discussion/SKILL.md` states the contract itself ("Keep this `SKILL.md`
 * compact; put detailed interview prompts and examples in the reference file").
 * `qfai init` copies the assistant tree wholesale, so a reference nobody names
 * still ships — it is simply never opened, and the guidance in it silently
 * stops applying.
 *
 * Reachability has to be transitive: a reference whose only inbound mention
 * comes from another unreachable reference is still unreachable. The
 * `ui_ux/` appendices were exactly that shape — named only by
 * `ui_ux_best_practices.md`, which nothing named.
 */
const ASSISTANT_ROOT = ["packages", "qfai", "assets", "init", ".qfai", "assistant"];

/**
 * References that are still unrouted and are not owned by this guard. The
 * assertion is a subset check, so removing an entry's defect elsewhere does
 * not break this test — but adding a newly unrouted file does.
 */
const KNOWN_UNROUTED = new Set(["skills/qfai-sdd/references/ui-contract-guide.md"]);

const SKILL_ENTRYPOINT = /^skills\/[^/]+\/SKILL\.md$/;
const SKILL_REFERENCE = /^skills\/[^/]+\/references\//;

/** Every markdown file in the shipped assistant tree, keyed by posix relpath. */
async function readAssistantTree(root: string): Promise<Map<string, string>> {
  const relPaths = await fg(["**/*.md"], { cwd: root });
  const entries = new Map<string, string>();
  for (const rel of relPaths.sort()) {
    entries.set(rel, await readFile(path.join(root, rel), "utf-8"));
  }
  return entries;
}

/**
 * Breadth-first walk of the "names" graph, starting from every skill's
 * `SKILL.md`. An edge exists when one file's text contains another file's
 * basename — the same signal an agent follows when it decides which file to
 * open next.
 */
function reachableFrom(tree: Map<string, string>): Set<string> {
  const byBasename = new Map<string, string[]>();
  for (const rel of tree.keys()) {
    const base = path.posix.basename(rel);
    const bucket = byBasename.get(base);
    if (bucket) bucket.push(rel);
    else byBasename.set(base, [rel]);
  }

  const queue = [...tree.keys()].filter((rel) => SKILL_ENTRYPOINT.test(rel));
  const reached = new Set(queue);
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) continue;
    const text = tree.get(current) ?? "";
    for (const [base, targets] of byBasename) {
      if (!text.includes(base)) continue;
      for (const target of targets) {
        if (target === current || reached.has(target)) continue;
        reached.add(target);
        queue.push(target);
      }
    }
  }
  return reached;
}

describe("shipped skill reference reachability", { timeout: 15000 }, () => {
  const assistantRoot = path.resolve(process.cwd(), "..", "..", ...ASSISTANT_ROOT);

  it("every shipped `references/*.md` is reachable from some SKILL.md", async () => {
    const tree = await readAssistantTree(assistantRoot);
    expect(tree.size).toBeGreaterThan(0);

    const reached = reachableFrom(tree);
    const unrouted = [...tree.keys()]
      .filter((rel) => SKILL_REFERENCE.test(rel))
      .filter((rel) => !reached.has(rel))
      .filter((rel) => !KNOWN_UNROUTED.has(rel));

    expect(unrouted).toEqual([]);
  });

  it("qfai-discussion routes the UI-bearing classification rule", async () => {
    // The mandatory output set branches on "UI-bearing" in a dozen places and
    // the only written surface mapping lives in the playbook. Losing the
    // naming line makes the predicate depend on the agent happening to list
    // `references/`.
    const skillMd = path.join(assistantRoot, "skills", "qfai-discussion", "SKILL.md");
    const text = await readFile(skillMd, "utf-8");
    expect(text).toContain("references/ui-bearing-playbook.md");
  });
});
