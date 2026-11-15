/**
 * The marketing UI pattern reference.
 *
 * Marketing pages were designed from inspiration and taste, and reviewed
 * against application rules they do not have: no app shell, no list
 * behaviour. A screen declaring `surface: marketing` is read against its own
 * entries instead, and the three stages that decide a screen read the same
 * file: the contract step, the implementation step and the screen review.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");

const ASSISTANT_ROOTS = [
  path.join(repoRoot, "packages/qfai/assets/init/.qfai/assistant"),
  path.join(repoRoot, ".qfai/assistant"),
];

const REFERENCE = "skill/qfai-sdd/references/marketing-ui-patterns.md";
const CITATION = `.qfai/assistant/${REFERENCE}`;
const RULE = path.join(
  repoRoot,
  "packages/qfai/assets/init/root/.agents/rules/interface-clarity.md",
);

const ENTRIES = [
  "Every marketing page",
  "Hero",
  "Proof",
  "Audience page",
  "Feature section",
  "How it works",
  "Pricing table",
  "FAQ",
  "Final call to action",
  "Contact form",
  "Legal pages",
];

const CITERS = [
  "step/sdd-contract/STEP.md",
  "step/implement-tdd/STEP.md",
  "agent/product-surface-reviewer.md",
];

const flat = (text: string): string => text.replace(/\s+/g, " ");

/** The body of the `## <heading>` section, up to the next `##` heading. */
function section(text: string, heading: string): string {
  const start = text.indexOf(`\n## ${heading}\n`);
  if (start === -1) return "";
  const rest = text.slice(start + heading.length + 5);
  const end = rest.search(/^## /m);
  return end === -1 ? rest : rest.slice(0, end);
}

// QFAI:EX-0001-0305-04
describe("marketing UI pattern reference", () => {
  for (const root of ASSISTANT_ROOTS) {
    const tree = path.relative(repoRoot, root);

    it(`${tree}: covers each section with its purpose, parts, states and anti-patterns`, async () => {
      const text = await readFile(path.join(root, REFERENCE), "utf-8");
      const headings = Array.from(text.matchAll(/^## (.+)$/gm), (match) => match[1]);

      expect(headings).toEqual(["Contents", ...ENTRIES, "Images", "Using this reference"]);
      for (const entry of ENTRIES) {
        const body = section(text, entry);
        expect(body, entry).toContain("**Purpose.**");
        expect(body, entry).toContain("**Standard parts.**");
        expect(body, entry).toContain("**States.**");
        expect(body, entry).toContain("Anti-patterns:");
      }
      expect(text).toContain("`surface: marketing`");
      expect(text).toContain(
        ".agents/rules/interface-clarity.md#what-a-business-screen-always-has",
      );
      expect(text).toContain(".qfai/assistant/rule/drift-protocol.md");
    });

    it(`${tree}: names the anti-patterns a marketing page is reviewed for`, async () => {
      const raw = await readFile(path.join(root, REFERENCE), "utf-8");
      const text = flat(raw);

      expect(flat(section(raw, "Proof"))).toContain("each with the time it was counted");
      expect(text).toContain("a fake testimonial");
      expect(text).toContain("an invented or rounded-up number");
      expect(text).toContain("an unlabelled product mock-up");
      expect(text).toContain("a claim nobody verified");
      expect(text).toContain("dark patterns, such as");
      expect(text).toContain("specified commercial transactions notice in Japan");
      expect(text).toContain("a privacy policy and the terms of service");
    });

    it(`${tree}: records each image's source and licence and labels examples`, async () => {
      const images = flat(section(await readFile(path.join(root, REFERENCE), "utf-8"), "Images"));

      expect(images).toContain(
        "Each image records where it came from and the licence it is used under",
      );
      expect(images).toContain("An image with neither is not used.");
      expect(images).toContain("is labelled as an example where it is shown");
    });
  }
});

// QFAI:EX-0001-0305-05
describe("a marketing screen is read against its own entries", () => {
  for (const root of ASSISTANT_ROOTS) {
    const tree = path.relative(repoRoot, root);

    it(`${tree}: the contract step, the implementation and the screen review cite it`, async () => {
      const missing: string[] = [];
      for (const citer of CITERS) {
        const text = flat(await readFile(path.join(root, citer), "utf-8"));
        if (!text.includes(CITATION) || !text.includes("`surface: marketing`")) {
          missing.push(citer);
        }
      }
      expect(missing).toEqual([]);
    });

    it(`${tree}: the screen review walks the business-screen list for application screens only`, async () => {
      const card = flat(
        await readFile(path.join(root, "agent/product-surface-reviewer.md"), "utf-8"),
      );

      expect(card).toContain("Check that each application screen is complete");
      expect(card).toContain("Check each application screen against its type");
      expect(card).toContain("not against the business-screen list or the business types");
    });
  }

  it("the interface-clarity rule limits the business-screen floor to application screens", async () => {
    const floor = flat(section(await readFile(RULE, "utf-8"), "What a business screen always has"));

    expect(floor).toContain("These parts apply to application screens");
    expect(floor).toContain("declares `surface: marketing`");
    expect(floor).toContain(CITATION);
    expect(floor).toContain("a part of this list missing from it is not a defect");
  });

  it("the UI contract template declares the surface of its screen", async () => {
    const template = await readFile(
      path.join(
        repoRoot,
        "packages/qfai/assets/init/.qfai/assistant/skill/qfai-sdd/templates/contracts/ui-contract.sample.yaml",
      ),
      "utf-8",
    );

    expect(template).toContain("    surface: application\n");
    expect(template).toContain("QFAI-CONTRACT-051");
  });
});
