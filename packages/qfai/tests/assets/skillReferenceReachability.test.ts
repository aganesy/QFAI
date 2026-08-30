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
 *
 * It also has to resolve by path, never by basename. Two skills ship a
 * `references/review-cycle-playbook.md` and a `references/rcp_footer.md` with
 * different content; a basename match would let `qfai-sdd/SKILL.md` naming its
 * own copies mark `qfai-discussion`'s copies reached.
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

/** How the shipped tree is addressed from a consuming project's root. */
const INSTALL_ROOT_PREFIX = ".qfai/assistant/";

/** A path-shaped run of text ending in `.md` — how every mention is written. */
const MD_MENTION = /[\w./-]*\.md\b/g;

/** Every markdown file in the shipped assistant tree, keyed by posix relpath. */
async function readAssistantTree(root: string): Promise<Map<string, string>> {
  const relPaths = await fg(["**/*.md"], { cwd: root });
  const entries = new Map<string, string>();
  for (const rel of relPaths.sort()) {
    entries.set(rel, await readFile(path.join(root, rel), "utf-8"));
  }
  return entries;
}

/** `skills/<name>` for a file inside a skill, `undefined` for anything else. */
function owningSkill(rel: string): string | undefined {
  const match = /^(skills\/[^/]+)\//.exec(rel);
  return match?.[1];
}

/**
 * Tree paths a written `.md` token can denote when it appears inside `from`.
 * Mentions in this tree use three conventions: install-root
 * (`.qfai/assistant/skills/…`), relative to the mentioning file (`rcp_footer.md`,
 * `../../qfai-implement/references/evidence-revision.md`), and relative to the
 * owning skill root (`references/sdd-triage.md` inside a `SKILL.md`). Each one
 * resolves to a single path, so a same-named file in another skill is never a
 * candidate.
 */
function resolveMention(from: string, token: string): string[] {
  const cleaned = token.replace(/^\.\//, "");
  const candidates: string[] = [];
  if (cleaned.startsWith(INSTALL_ROOT_PREFIX)) {
    candidates.push(cleaned.slice(INSTALL_ROOT_PREFIX.length));
  }
  candidates.push(path.posix.join(path.posix.dirname(from), cleaned));
  const skill = owningSkill(from);
  if (skill !== undefined) candidates.push(path.posix.join(skill, cleaned));
  candidates.push(cleaned);
  return candidates.map((candidate) => path.posix.normalize(candidate));
}

/** Files that `from` names, resolved against the tree it lives in. */
function namedBy(from: string, tree: Map<string, string>): Set<string> {
  const named = new Set<string>();
  for (const [token] of (tree.get(from) ?? "").matchAll(MD_MENTION)) {
    for (const candidate of resolveMention(from, token)) {
      if (candidate !== from && tree.has(candidate)) named.add(candidate);
    }
  }
  return named;
}

/**
 * Breadth-first walk of the "names" graph, starting from every skill's
 * `SKILL.md`. An edge exists when one file's text names another file by a path
 * that resolves to it — the same signal an agent follows when it decides which
 * file to open next.
 */
function reachableFrom(tree: Map<string, string>): Set<string> {
  const queue = [...tree.keys()].filter((rel) => SKILL_ENTRYPOINT.test(rel));
  const reached = new Set(queue);
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) continue;
    for (const target of namedBy(current, tree)) {
      if (reached.has(target)) continue;
      reached.add(target);
      queue.push(target);
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

  it("qfai-discussion routes its own review-cycle playbook, not qfai-sdd's", async () => {
    // Both skills ship `references/review-cycle-playbook.md` and
    // `references/rcp_footer.md`. `qfai-sdd/SKILL.md` names its pair, so a
    // basename-keyed graph scored the discussion pair as reached while
    // `qfai-discussion/SKILL.md` never named them.
    const tree = await readAssistantTree(assistantRoot);
    const reached = reachableFrom(tree);
    expect(reached.has("skills/qfai-discussion/references/review-cycle-playbook.md")).toBe(true);
    expect(reached.has("skills/qfai-discussion/references/rcp_footer.md")).toBe(true);
  });

  it("a same-named reference in another skill is not counted as reached", () => {
    const tree = new Map([
      ["skills/alpha/SKILL.md", "Follow `references/shared.md`."],
      ["skills/alpha/references/shared.md", "alpha detail"],
      ["skills/beta/SKILL.md", "Beta names no reference."],
      ["skills/beta/references/shared.md", "beta detail, different content"],
    ]);

    const reached = reachableFrom(tree);
    expect(reached.has("skills/alpha/references/shared.md")).toBe(true);
    expect(reached.has("skills/beta/references/shared.md")).toBe(false);
  });

  it("install-root, sibling and cross-skill relative mentions still resolve", () => {
    // Over-correction pin: tightening basename matching must not drop the
    // three conventions the shipped tree actually uses.
    const tree = new Map([
      [
        "skills/alpha/SKILL.md",
        "See `.qfai/assistant/skills/beta/references/cross.md` and `references/local.md`.",
      ],
      [
        "skills/alpha/references/local.md",
        "Sibling `sibling.md`; upward `../../beta/references/deep.md`.",
      ],
      ["skills/alpha/references/sibling.md", "sibling detail"],
      ["skills/beta/SKILL.md", "Beta names no reference."],
      ["skills/beta/references/cross.md", "cross detail"],
      ["skills/beta/references/deep.md", "deep detail"],
    ]);

    const reached = reachableFrom(tree);
    for (const rel of [
      "skills/alpha/references/local.md",
      "skills/alpha/references/sibling.md",
      "skills/beta/references/cross.md",
      "skills/beta/references/deep.md",
    ]) {
      expect(reached.has(rel)).toBe(true);
    }
  });
});
