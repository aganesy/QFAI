/**
 * The `## Default Autopilot Policy` block ships in every `qfai-*` skill, and
 * its closing rule used to permit per-skill tailoring in one bucket only:
 * "A skill MAY narrow the auto-decide bucket". Nothing sanctioned dropping an
 * `ask-user` or `hard-required` entry a skill cannot reach — so no skill ever
 * dropped one, and all seven blocks stayed byte-identical.
 *
 * The visible cost was in `qfai-implement`: `ask-user` opened on `/qfai-sdd`'s
 * triage operations (a non-goal here) and `hard-required` demanded
 * `companyName` / brand intent (inputs of init and prototyping), while the
 * decisions an implement run genuinely gates on a user — approving the
 * `TDDLIST-001` accepted-risk waiver an `exception` row needs, and
 * Change-Request escalation — appeared in no bucket. Routing a row *to*
 * `exception` is deliberately not among them: Red phase steps 3b and 5 decide
 * that transition deterministically, so prompting on it would contradict them.
 *
 * This pins both halves: the contract permits narrowing in all three buckets,
 * and `qfai-implement` has taken it. The shipped blocks are also re-parsed
 * with the Reviewer-Gate parser, so a tailoring edit that breaks the
 * governance contract fails here rather than in `qfai validate`.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { parseAutopilotPolicy } from "../../src/core/validators/autopilotPolicy.js";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/** Source tree first, then the generated root mirror `sync:ssot` writes. */
const SOURCE_TREE = "packages/qfai/assets/init/.qfai";
const TREES = [SOURCE_TREE, ".qfai"];

/**
 * Every shipped `qfai-*` skill, read off the tree rather than listed here.
 *
 * A list would have to be edited by whoever adds a skill, and a skill left off
 * it is exactly the one whose policy nobody has checked. The Reviewer-Gate
 * validator picks its subjects the same way.
 */
const QFAI_SKILLS = (
  await readdir(path.join(repoRoot, SOURCE_TREE, "assistant", "skills"), { withFileTypes: true })
)
  .filter((entry) => entry.isDirectory() && entry.name.startsWith("qfai-"))
  .map((entry) => entry.name)
  .sort();

function skillPath(tree: string, skillId: string): string {
  return path.join(repoRoot, tree, "assistant", "skills", skillId, "SKILL.md");
}

/** Collapse markdown soft wraps so assertions pin wording, not the wrap column. */
const unwrap = (markdown: string): string => markdown.split(/\s+/).join(" ");

/** The `## Default Autopilot Policy` block, heading excluded. */
function policyBlock(content: string): string {
  const heading = /^##\s+Default Autopilot Policy\s*$/m.exec(content);
  expect(heading, "SKILL.md must carry a ## Default Autopilot Policy section").not.toBeNull();
  if (!heading) return "";
  const rest = content.slice(heading.index + heading[0].length);
  const next = /^##\s+/m.exec(rest);
  return next ? rest.slice(0, next.index) : rest;
}

/** Entries nested under one bucket header, in order. */
function bucketEntries(block: string, bucket: string): string[] {
  const lines = block.split(/\r?\n/);
  const headerRe = new RegExp(`^\\s*[-*]\\s*${bucket}\\s*:`, "i");
  const anyHeaderRe = /^\s*[-*]\s*(auto-decide|ask-user|hard-required)\s*:/i;
  const entries: string[] = [];
  let inBucket = false;
  for (const line of lines) {
    if (headerRe.test(line)) {
      inBucket = true;
      continue;
    }
    if (!inBucket) continue;
    if (anyHeaderRe.test(line)) break;
    const nested = /^\s+[-*]\s+(.+)$/.exec(line);
    if (nested?.[1]) entries.push(nested[1].trim());
  }
  return entries;
}

describe.each(TREES)("%s — Default Autopilot Policy tailoring contract", (tree) => {
  it.each(QFAI_SKILLS)("%s permits narrowing in all three buckets", async (skillId) => {
    // Soft wraps fall wherever the prose reaches the column, so the block is
    // read as one line: an assertion that also pins the wrap position fails on
    // an edit that changed nothing it is about.
    const block = unwrap(policyBlock(await readFile(skillPath(tree, skillId), "utf-8")));

    // The narrowing permission must not be scoped to auto-decide alone.
    expect(block).not.toContain("MAY narrow the auto-decide bucket");
    expect(block).toMatch(/A skill MAY narrow any of the three buckets/);
    // Widening stays prohibited in every bucket. Instantiating the ask-user
    // category with the skill's own human-authorized operations is not
    // widening — without that distinction `/qfai-implement` had no legal way
    // to name the waiver and the Change-Request escalation it does gate on.
    expect(block).toMatch(/MUST NOT introduce an entry outside the prototype's categories/);
    // `hard-required` is the exception, because the bucket is what a run cannot
    // proceed without and no prototype can enumerate that for a skill it does
    // not know. The validator checks those against a per-skill declaration, so
    // the sentence has to sanction what the validator already allows.
    expect(block).toMatch(/undefaultable inputs this skill itself consumes/);
    expect(block).toMatch(/MAY instantiate a category entry/);
    expect(block).toMatch(/approval-required governance operations/);
  });

  it.each(QFAI_SKILLS)("%s still satisfies the Reviewer-Gate parser", async (skillId) => {
    const result = parseAutopilotPolicy(await readFile(skillPath(tree, skillId), "utf-8"));

    expect(result.hasSection).toBe(true);
    expect(result.buckets).toEqual({ autoDecide: true, askUser: true, hardRequired: true });
    expect(result.widenedTokens).toEqual([]);
  });

  it("qfai-implement lists the decisions its own run gates on a user", async () => {
    const block = policyBlock(await readFile(skillPath(tree, "qfai-implement"), "utf-8"));
    const askUser = bucketEntries(block, "ask-user").join("\n");
    const hardRequired = bucketEntries(block, "hard-required");

    // Reachable here, and named as user-facing under `## User Questions` too.
    expect(askUser).toMatch(/`exception`/);
    expect(askUser).toMatch(/TDDLIST-001/);
    // The `exception` transition itself stays deterministic (Red steps 3b / 5),
    // so no bullet may make routing a row into that status a user decision.
    expect(askUser).not.toMatch(/^routing an item to/im);
    expect(askUser).toMatch(/Change[- ]Request/);
    // The Parallelization Policy gates item-level parallelism on explicit user
    // approval on top of the `delivery-planner` technical gate. This section
    // claims to classify EVERY decision into one of the three buckets, so a
    // user-gated decision missing from it is the section contradicting the body
    // it summarizes.
    expect(askUser).toMatch(/parallel/i);
    // `/qfai-sdd` owns triage; writing spec artifacts is a non-goal here.
    expect(askUser).not.toMatch(/SUPERSEDE/);
    expect(askUser).not.toMatch(/UPDATE:REMOVE/);
    // Branding inputs belong to init / prototyping, not to an implement run.
    expect(hardRequired.length).toBe(1);
    // `hard-required` means "no default is possible; supplied before
    // proceeding", so the condition is absence from inputs. Spec Auto-Discovery
    // narrows the candidates and does not supply the value, so the entry must
    // not be conditioned on it resolving nothing — that would let an ordinary
    // single-spec run proceed on a spec the user never named.
    expect(hardRequired[0]).toMatch(/`primarySpecId`/);
    expect(hardRequired[0]).toMatch(/when absent from inputs/);
    expect(hardRequired[0]).toMatch(/narrows the candidates but does not settle the value/);
    expect(hardRequired[0]).not.toMatch(/so it is not a required input/);
  });
});
