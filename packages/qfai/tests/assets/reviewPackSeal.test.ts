/**
 * The review-pack seal contract is addressable (#693) and the ATDD stage does
 * not restate it in one unskimmable DoD bullet (#732).
 *
 * The seal contract used to sit 49 lines deep inside step 2 of the working-tree
 * revision recipe — a step whose stated job is listing paths to exclude from a
 * different hash. It had no heading, so none of the call sites that consume it
 * could cite it by anchor, and each of them carried a fragment of the contract
 * instead. `/qfai-atdd` carried the largest fragment: a 2,024-character DoD
 * bullet that was the only place in the shipped tree defining `Review pack:`
 * and `Review pack seal:` — two fields its own evidence template had no slot
 * for.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const REVISION = "assistant/skills/qfai-implement/references/evidence-revision.md";
const IMPLEMENT_SKILL = "assistant/skills/qfai-implement/SKILL.md";
const ROUND_EVIDENCE = "assistant/skills/qfai-implement/references/round-evidence.md";
const REVIEW_LAYOUT = "assistant/skills/qfai-implement/references/review-artifact-layout.md";
const ATDD_SKILL = "assistant/skills/qfai-atdd/SKILL.md";
const ATDD_SEAL = "assistant/skills/qfai-atdd/references/pack-seal.md";

const ANCHOR = "evidence-revision.md#review-pack-seal";

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s*\n\s*/g, " ");

/** The body of a `## ` section, up to the next same-level heading. */
const section = (content: string, heading: string): string => {
  const start = content.indexOf(`\n${heading}\n`);
  if (start < 0) {
    return "";
  }
  const after = start + heading.length + 2;
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
      expect(body).toContain(
        "record the seal in the item's evidence entry as `Review pack seal` — by the **audit-hash** procedure in",
      );
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
      const skill = await read(tree, IMPLEMENT_SKILL);
      const round = await read(tree, ROUND_EVIDENCE);
      const layout = await read(tree, REVIEW_LAYOUT);

      // Gate item 10 is the consumer that recomputes the seal.
      expect(flat(skill)).toContain(
        "`Review pack seal` (`references/evidence-revision.md#review-pack-seal`) is recomputed here",
      );
      // The per-round field list names the fields and points at the contract.
      expect(flat(round)).toContain("`Round N: Review pack` — the `review-<timestamp>/` directory");
      expect(round).toContain(ANCHOR);
      // The same file's exhaustive list of round fields has to carry the two
      // new ones too, or an agent reading that list omits them.
      expect(flat(round)).toContain(
        "the reviewer verdict, and the `Review pack` / `Review pack seal` pair",
      );
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
      // No bullet may be more than half the section again. The seal bullet was
      // 2,024 characters — larger than the other nine put together. The cap is
      // above the longest bullet this section already carries (531 characters,
      // wrapped over nine lines), so it fails on a paragraph moving back in —
      // wrapped or not — and not on ordinary prose.
      for (const bullet of bullets) {
        expect(bullet.length, `DoD bullet is a paragraph: ${bullet.slice(0, 80)}…`).toBeLessThan(
          700,
        );
      }

      expect(dod).toContain("references/pack-seal.md#recompute-the-p8-audit-hash");
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

      expect(template).toContain("## Final status (PASS/FAIL) + who confirmed");
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
