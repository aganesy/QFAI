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

// QFAI:EX-0001-0308-01
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
      expect(text).toContain(
        ".agents/rules/interface-clarity.md#what-a-marketing-screen-always-has",
      );
      expect(flat(text)).toContain("The entries are kinds of section, not an order");
      expect(flat(section(text, "Every marketing page"))).toContain(
        "The page's `states` combine the states of its sections.",
      );
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
      expect(text).toContain(
        "specified commercial transactions notice where the business sells online in Japan",
      );
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

// QFAI:EX-0001-0308-02
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

    // A blocking finding needs a trace that may block, and a problem already on
    // an altered page, or a claim the user supplied, is not the change's defect.
    it(`${tree}: the screen review blocks only on a marketing floor breach the change introduces`, async () => {
      const card = flat(
        await readFile(path.join(root, "agent/product-surface-reviewer.md"), "utf-8"),
      );

      expect(card).toContain(
        "image with no recorded source and licence that the change introduces are blocking findings that trace to `.agents/rules/interface-clarity.md#what-a-marketing-screen-always-has`; one already on an altered page is `advisory`.",
      );
      expect(card).toContain(
        "follows `.qfai/assistant/skill/qfai-sdd/references/design-anti-patterns.md#claims-nobody-has-confirmed`: it is put to the user, not deleted.",
      );
      expect(card).toContain("is not the fake product dashboard of `design-anti-patterns.md`");
      expect(card).toContain("not the stock section order that list names");
      expect(card).toContain(
        "for a marketing screen, trace it to `.agents/rules/interface-clarity.md#what-a-marketing-screen-always-has` or the screen's UI contract",
      );
      expect(card).toContain("is content the page needs and is never filed as excess");
    });

    it(`${tree}: a marketing-floor gap is a traceable defect, not a demand for more work`, async () => {
      const findings = flat(
        await readFile(path.join(root, "rule/references/reviewer-findings.md"), "utf-8"),
      );

      expect(findings).toContain(
        "The same holds for a part missing from the marketing-screen floor (`.agents/rules/interface-clarity.md#what-a-marketing-screen-always-has`)",
      );
    });

    it(`${tree}: the contract step reads the marketing reference and keeps its copy`, async () => {
      const step = flat(await readFile(path.join(root, "step/sdd-contract/STEP.md"), "utf-8"));
      const reads = step.slice(step.indexOf("## Reads"), step.indexOf("## Writes"));

      expect(reads).toContain(CITATION);
      expect(reads).toContain("`## What a marketing screen always has`");
      expect(step).toContain("Its `states` combine the states of its sections.");
      expect(step).toContain(
        "is content the page needs and stays, with its reason. Fix a control that needs explaining",
      );
    });

    it(`${tree}: the business patterns and procurement scope the business floor to application screens`, async () => {
      const business = flat(
        await readFile(
          path.join(root, "skill/qfai-sdd/references/business-ui-patterns.md"),
          "utf-8",
        ),
      );
      const procurement = flat(await readFile(path.join(root, "rule/ui-procurement.md"), "utf-8"));

      expect(business).toContain(
        "It covers application screens: a screen whose UI contract declares `surface: marketing` is none of these types.",
      );
      expect(procurement).toContain(
        "lists them for an application screen and `.agents/rules/interface-clarity.md#what-a-marketing-screen-always-has` for a marketing screen.",
      );
    });
  }

  it("the interface-clarity rule limits the business-screen floor to application screens", async () => {
    const floor = flat(section(await readFile(RULE, "utf-8"), "What a business screen always has"));

    expect(floor).toContain("These parts apply to application screens");
    expect(floor).toContain("declares `surface: marketing`");
    expect(floor).toContain(CITATION);
    expect(floor).toContain("a part of this list missing from it is not a defect");
  });

  it("the interface-clarity rule holds the marketing floor and keeps marketing copy", async () => {
    const text = await readFile(RULE, "utf-8");
    const floor = flat(section(text, "What a marketing screen always has"));

    for (const part of [
      "**No invented proof.**",
      "**Examples labelled.**",
      "**Images sourced.**",
      "**States of what it sends or reads.**",
      "**Required notices.**",
    ]) {
      expect(floor, part).toContain(part);
    }
    expect(floor).toContain("a figure shows the time it was counted. An agent never writes one.");
    expect(floor).toContain("design-anti-patterns.md#claims-nobody-has-confirmed");
    expect(floor).toContain("An image with neither is not used.");
    expect(flat(section(text, "2. Do not explain the interface"))).toContain(
      "is content the page needs. It still carries its `qfai-text` or `qfai-text-file` reason.",
    );
    expect(flat(section(text, "3. Cut"))).toContain(
      "and so does a part of a marketing screen's pattern entry, including the text that fills it.",
    );
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
