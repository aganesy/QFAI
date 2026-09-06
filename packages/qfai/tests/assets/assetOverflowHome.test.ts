/**
 * The line ceiling is enforced over every shipped assistant asset, but the
 * authoring rule that says what to do when a file reaches it was written for
 * `skills/` only: detail moves "under the skill's own directory". `assistant/`
 * has six top-level trees, and `constitution/`, `catalog/`, `agents/` and
 * `manifest/` had no subdirectory of any kind — so the two files nearest the
 * ceiling were the two the remedy did not cover, and an author who hit it there
 * had no compliant move available. Raising the number and claiming an exemption
 * are both argued against by the framework itself; what was missing was the
 * directory convention that makes the split a legal shipped asset.
 */

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { countLines, SKILL_MD_MAX_LINES } from "../helpers/skillBudget.js";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const OPERATING = "assistant/constitution/shared-skill-operating-baseline.md";
const DELEGATION = "assistant/constitution/shared-skill-delegation-baseline.md";
const AUDIT_HASH = "assistant/constitution/references/audited-evidence-hash.md";

const flat = (s: string): string => s.replace(/\s+/g, " ");

const read = async (tree: string, rel: string): Promise<string> =>
  await readFile(path.join(repoRoot, tree, rel), "utf-8");

describe.each(TREES)("%s", (tree) => {
  it("gives every assistant tree the same overflow home, not only skills", async () => {
    // "the skill's own directory" named a location three of the four other
    // trees cannot have, so the rule could not be followed where it was needed.
    const operating = flat(await read(tree, OPERATING));
    expect(operating).toContain("These go under the owning tree's own directory");
    expect(operating).not.toContain("These go under the skill's own directory");
    expect(operating).toContain("`constitution/references/<topic>.md`");
    expect(operating).toContain("`catalog/references/<topic>.md`");
  });

  it("says the ceiling covers every shipped asset, not only SKILL.md", async () => {
    const operating = flat(await read(tree, OPERATING));
    expect(operating).toContain("applies to **every** shipped assistant asset, not only");
    // The two escapes the framework argues against stay closed — for the prose
    // assets the split remedy is actually available to.
    expect(operating).toContain(
      "For a prose asset, raising the ceiling or claiming an exemption is not the remedy",
    );
  });

  it("leaves machine-readable assets a remedy the split rule cannot give them", async () => {
    // The same ceiling is measured over `manifest/*.yml` and the shipped
    // `templates/*.yaml`, which a validator parses or a skill copies whole.
    // Sending one of their items to a Markdown sibling takes it out of the
    // parsed document, so a blanket "no exemption where a references/ home
    // exists" would leave them with no compliant move at all — and
    // `manifest/agent-catalog.yml` is exempt today for exactly that reason.
    const operating = flat(await read(tree, OPERATING));
    expect(operating).toContain("The ceiling is measured over YAML assets too");
    expect(operating).toContain("**Split it in its own format**");
    expect(operating).toContain("**Record an exemption**");
  });

  it("ships a constitution reference topic, so the rule has a worked instance", async () => {
    const filePath = path.join(repoRoot, tree, AUDIT_HASH);
    expect(existsSync(filePath), `missing overflow home instance: ${AUDIT_HASH}`).toBe(true);
    const reference = await readFile(filePath, "utf-8");
    expect(countLines(reference)).toBeLessThanOrEqual(SKILL_MD_MAX_LINES);
    expect(flat(reference)).toContain("**How to compute it, exactly.**");
  });

  it("leaves the file that states the rule no longer a counterexample to it", async () => {
    // `shared-skill-delegation-baseline.md` sat at 500/500 with zero headroom:
    // the next normative sentence added to it failed the asset test.
    const delegation = await read(tree, DELEGATION);
    expect(countLines(delegation)).toBeLessThan(SKILL_MD_MAX_LINES);
    const flattened = flat(delegation);
    expect(flattened).toContain("`references/audited-evidence-hash.md`");
    // The procedure moved rather than being duplicated: one of the two would
    // otherwise drift, and the reviewer and gate item 10 must hash one extent.
    expect(flattened).not.toContain("**Normalize.** LF line endings");
  });
});
