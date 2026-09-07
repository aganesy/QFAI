/**
 * The review-pack seal contract is addressable, and each consumer cites it.
 *
 * The contract has a heading of its own, so a call site can name it by anchor
 * instead of carrying a fragment. A fragment in a consumer drifts from the
 * contract silently, and a contract with no anchor leaves the consumer no
 * other way to refer to it.
 *
 * `/qfai-atdd` states the two evidence fields the seal needs in its own
 * reference and gives its evidence template a slot for them, so the stage that
 * writes them and the file that holds them agree.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const REVISION = "assistant/skills/qfai-implement/references/evidence-revision.md";
const RECORD_CONTRACT = "assistant/skills/qfai-implement/references/record-contract.md";
const ROUND_EVIDENCE = "assistant/skills/qfai-implement/references/round-evidence.md";
const REVIEW_LAYOUT = "assistant/skills/qfai-implement/references/review-artifact-layout.md";
const ATDD_SKILL = "assistant/skills/qfai-atdd/SKILL.md";
const ATDD_SEAL = "assistant/skills/qfai-atdd/references/pack-seal.md";

const ANCHOR = "evidence-revision.md#review-pack-seal";

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s*\n\s*/g, " ");

/**
 * Every `<file>#<anchor>` reference in `text`, as whole tokens.
 *
 * A containment check on an anchor passes for any longer anchor that starts
 * with it, so a rename that only appends is invisible to it. Comparing whole
 * tokens is what makes the check exact.
 */
const anchorsIn = (text: string): string[] =>
  Array.from(text.matchAll(/[\w./-]+\.md#[a-z0-9-]+/g), (m) => m[0]);

/** The body of a `## ` section, up to the next same-level heading. */
const section = (content: string, heading: string): string => {
  // A heading on the first line has no newline before it, so anchoring on one
  // would return "" for it — a silent empty section that passes every
  // `not.toContain` and fails every `toContain` for the wrong reason.
  const at = content.startsWith(`${heading}\n`) ? 0 : content.indexOf(`\n${heading}\n`) + 1;
  if (at === 0 && !content.startsWith(`${heading}\n`)) {
    return "";
  }
  const after = at + heading.length + 1;
  const next = content.indexOf("\n## ", after);
  return next < 0 ? content.slice(after) : content.slice(after, next);
};

/**
 * The logical list items of a section: each `- ` line plus every continuation
 * line up to the next bullet or heading. Measuring only the first physical line
 * would let a removed paragraph return simply by being wrapped.
 */
const bulletsOf = (body: string): string[] => {
  const items: string[] = [];
  let open = false;
  for (const line of body.split("\n")) {
    if (line.startsWith("- ")) {
      items.push(line);
      open = true;
      continue;
    }
    if (line.startsWith("#")) {
      open = false;
      continue;
    }
    if (!open || line.trim() === "") {
      continue;
    }
    items[items.length - 1] = `${items[items.length - 1]} ${line.trim()}`;
  }
  return items;
};

/** GitHub's heading -> fragment slug, enough for the ASCII headings shipped here. */
const slug = (heading: string): string =>
  heading
    .replace(/^#+\s*/, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

describe("the review pack seal has a heading of its own", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the contract is a top-level section, not prose inside step 2`, async () => {
      const revision = await read(tree, REVISION);

      expect(revision).toContain("\n## Review pack seal\n");

      // Placed after `## The field`, which is where the recipe that used to
      // hold it lives, and before the next topic.
      const field = revision.indexOf("\n## The field\n");
      const seal = revision.indexOf("\n## Review pack seal\n");
      const transient = revision.indexOf("\n## A transient observation names its own revision\n");
      expect(field).toBeGreaterThan(-1);
      expect(transient).toBeGreaterThan(-1);
      expect(seal).toBeGreaterThan(field);
      expect(seal).toBeLessThan(transient);
    });

    it(`${tree}: the section carries the whole contract`, async () => {
      const body = flat(section(await read(tree, REVISION), "## Review pack seal"));

      expect(body).toContain("What protects the pack is a **pack seal**, not the audit hash");
      expect(body).toContain("record the seal in the item's evidence entry as `Review pack seal`");
      expect(body).toContain("by the **audit-hash** procedure in");
      expect(body).toContain("**gate item 10 recomputes it from the pack** and compares");
      expect(body).toContain(
        "**Record it per round, and name the pack it seals**: `Round N: Review pack`",
      );
      expect(body).toContain("**What a seal does and does not catch");
      // The procedure it must NOT use is the one stated above it now.
      expect(body).toContain("not the working-tree one above");
    });

    it(`${tree}: step 2 keeps the exclusion and points at the section`, async () => {
      const exclude = flat(await read(tree, REVISION));

      expect(exclude).toContain(
        "What protects the pack is a pack seal, not the audit hash — see `#review-pack-seal`.",
      );
      // The seal definition moved out of the step; only the pointer stays.
      const stepTwo = exclude.slice(
        exclude.indexOf("2. **Exclude.**"),
        exclude.indexOf("3. **Serialize.**"),
      );
      expect(stepTwo).not.toContain("audit-hash");
      expect(stepTwo.length).toBeLessThan(900);
    });

    it(`${tree}: every consumer cites it by anchor instead of restating it`, async () => {
      const record = await read(tree, RECORD_CONTRACT);
      const round = await read(tree, ROUND_EVIDENCE);
      const layout = await read(tree, REVIEW_LAYOUT);

      // Gate item 10 is the consumer that recomputes the seal, and the record
      // contract carries its rule. The path is relative to `references/`,
      // where that file sits.
      expect(flat(record)).toContain(
        "directory it names (`evidence-revision.md#review-pack-seal`)",
      );
      // The per-round field list names the fields and points at the contract.
      expect(flat(round)).toContain("`Round N: Review pack` — the `review-<timestamp>/` directory");
      expect(round).toContain(ANCHOR);
      // The same file's exhaustive list of round fields has to carry the two
      // new ones too, or an agent reading that list omits them.
      expect(flat(round)).toContain("the review pack and its seal, the reviewer verdict");
      // The layout file states the per-round pack rule the seal depends on.
      expect(layout).toContain(ANCHOR);
      expect(flat(layout)).toContain(
        "that directory is sealed and the seal is recorded outside it",
      );
    });
  }
});

describe("the ATDD stage seal has a reference of its own", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the reference exists and defers to the shared contract`, async () => {
      const seal = await read(tree, ATDD_SEAL);

      expect(seal).toContain(
        "`../../qfai-implement/references/evidence-revision.md#review-pack-seal`",
      );
      expect(flat(seal)).toContain("Do not restate it here");
      expect(seal).toContain("## Seal the P8 pack");
      expect(seal).toContain("## Recompute the P8 audit hash before declaring completion");
      expect(seal).toContain("Review pack: `.qfai/review/review-<timestamp>/`");
      expect(seal).toContain("Review pack seal: <sha256>");
    });

    it(`${tree}: the DoD states the obligations as skimmable bullets`, async () => {
      const skill = await read(tree, ATDD_SKILL);
      const dod = section(skill, "## Success Criteria (Definition of Done)");
      const bullets = bulletsOf(dod);

      expect(bullets.length).toBeGreaterThan(9);
      // No bullet may be a paragraph again. The seal bullet was 2,024
      // characters — larger than the other nine put together. The cap sits
      // above the longest bullet this section already carries (1,047
      // characters, wrapped over ten lines), so it fails on a paragraph moving
      // back in — wrapped or not — and not on ordinary prose.
      for (const bullet of bullets) {
        expect(bullet.length, `DoD bullet is a paragraph: ${bullet.slice(0, 80)}…`).toBeLessThan(
          1200,
        );
      }

      // Exact, not a prefix: `#recompute-the-p8-audit-hash` is a prefix of
      // `#recompute-the-p8-audit-hash-before-declaring-completion`, so a
      // containment check passes for an anchor that was renamed or mistyped
      // into the longer one.
      expect(anchorsIn(dod)).toContain(
        "references/pack-seal.md#recompute-the-p8-audit-hash-before-declaring-completion",
      );
      // The seal bullet requires both moments, so it names both anchors:
      // `#seal-the-p8-pack` defines only the recording.
      expect(dod).toContain("references/pack-seal.md#seal-the-p8-pack");
      expect(dod).toContain(
        "references/pack-seal.md#recompute-the-seal-at-completion-against-the-recorded-value",
      );
    });

    it(`${tree}: the evidence template has a slot for both seal fields`, async () => {
      const skill = await read(tree, ATDD_SKILL);
      const template = skill.slice(
        skill.indexOf("# ATDD Evidence: <spec-id>"),
        skill.indexOf("## ATDD Work Orders"),
      );

      expect(template).toContain(
        "## Final status (PASS / PASS with cross-spec obligations / FAIL) + who confirmed",
      );
      expect(template).toContain("Review pack: `.qfai/review/review-<timestamp>/`");
      expect(template).toContain("Review pack seal: <sha256>");
    });

    it(`${tree}: every pack-seal anchor the skill cites resolves to a heading`, async () => {
      const skill = await read(tree, ATDD_SKILL);
      const seal = await read(tree, ATDD_SEAL);
      const headings = new Set(
        seal
          .split("\n")
          .filter((line) => line.startsWith("#"))
          .map(slug),
      );

      const cited = [...skill.matchAll(/references\/pack-seal\.md#([a-z0-9-]+)/g)].map((m) => m[1]);
      expect(cited.length).toBeGreaterThan(1);
      for (const fragment of cited) {
        expect(headings, `pack-seal.md has no heading for #${fragment}`).toContain(fragment);
      }
    });
  }
});
