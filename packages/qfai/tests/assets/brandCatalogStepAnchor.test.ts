import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { readDiscussionSkill } from "../helpers/discussionSteps.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const skills = path.join(root, "packages/qfai/assets/init/.qfai/assistant/skill");
const read = (rel: string): Promise<string> => readFile(path.join(skills, rel), "utf-8");
const readStep = async (name: string): Promise<string> =>
  (await readFile(path.join(skills, "..", "step", name, "STEP.md"), "utf-8")).replace(/\s+/g, " ");

describe("brand catalog ownership", () => {
  it("gives root DESIGN.md authoring to SDD for a visual surface", async () => {
    const discussion = (await readDiscussionSkill(path.dirname(skills))).replace(/\s+/g, " ");
    const authoring = await read("qfai-sdd/references/design-md-authoring.md");
    const sdd = await readStep("sdd-contract");
    expect(discussion).toContain("root `DESIGN.md` — is authored");
    expect(discussion).toContain("/qfai-sdd");
    expect(authoring).toContain("How `/qfai-sdd` writes the root `DESIGN.md`");
    expect(sdd).toContain("root `DESIGN.md`, which `common-design-md`");
  });

  it("uses the adopted discussion direction as the brand input", async () => {
    const authoring = await read("qfai-sdd/references/design-md-authoring.md");
    const discussion = await read("qfai-discussion/references/discussion-completion-matrix.md");
    expect(authoring).toContain("01_Context.md#Design Direction");
    expect(authoring).toContain("04_Sources.md");
    expect(discussion).toContain("common-design-md` step authors root `DESIGN.md`");
  });

  it("does not invent a visual brand for a CLI-only target", async () => {
    const authoring = await read("qfai-sdd/references/design-md-authoring.md");
    const sdd = await readStep("sdd-contract");
    expect(authoring).toContain("A cli-only target has no root");
    expect(sdd).toContain("A CLI-only surface does not require one");
  });

  it("routes brand archetype and interaction into supported fields", async () => {
    const catalog = await read("qfai-sdd/references/design-md-brand-catalog.md");
    const authoring = await read("qfai-sdd/references/design-md-authoring.md");
    expect(catalog).toContain("brand.archetype");
    expect(catalog).toContain("accessibility.motion");
    expect(authoring).toContain("Brand archetype → `brand.archetype`");
    expect(authoring).toContain("`visual.interaction` key fails DESIGN.md validation");
  });

  it("uses a deterministic tie-break from recorded input", async () => {
    const catalog = await read("qfai-sdd/references/design-md-brand-catalog.md");
    expect(catalog).toContain("brand.voice");
    expect(catalog).toContain("audience.emotion");
    expect(catalog).toContain("audience.do_not_look_like");
    expect(catalog).toContain("alphabetical archetype name");
    expect(catalog).not.toContain("visual-theme weight wins");
  });
});

// A general "avoid the generic look" instruction swaps one default for another;
// only a named pattern can be checked. The list lives in one reference, and the
// surfaces that review a design point at it instead of restating it.
describe("generated-design anti-patterns", () => {
  const antiPatterns = "qfai-sdd/references/design-anti-patterns.md";
  const antiPatternsInstallPath = `.qfai/assistant/skill/${antiPatterns}`;
  const sectionOf = (doc: string, heading: string): string => {
    const start = doc.indexOf(`\n## ${heading}\n`);
    if (start < 0) {
      return "";
    }
    const end = doc.indexOf("\n## ", start + 1);
    return doc.slice(start, end < 0 ? undefined : end);
  };

  it("lists the patterns by aspect, in the reviewed order", async () => {
    const doc = await read(antiPatterns);
    const aspects = [
      "Color and background",
      "Typography",
      "Iconography and imagery",
      "Surfaces",
      "Components",
      "Layout and composition",
      "Placement",
      "Motion and transitions",
      "Copy in the UI",
      "Information architecture and flow",
      "States and accessibility",
      "Implementation defaults",
      "Displacement",
    ];
    const headings = doc
      .split("\n")
      .filter((line) => line.startsWith("## "))
      .map((line) => line.slice(3));
    expect(headings.filter((heading) => aspects.includes(heading))).toEqual(aspects);

    // One representative per aspect, most often the most-cited one, which
    // opens its section.
    const representatives: [string, RegExp][] = [
      ["Color and background", /^- The hero, background, buttons or accents use a purple/m],
      ["Typography", /^- All text is set in one default sans-serif/m],
      ["Iconography and imagery", /^- Emoji stand in for icons/m],
      ["Surfaces", /^- Every card, button and panel has the same corner radius/m],
      ["Components", /^- Features are a row of three/m],
      ["Layout and composition", /stock generated-SaaS template/],
      ["Placement", /A row of three cards sits directly beneath the hero/],
      ["Motion and transitions", /same fade-in or fade-and-slide-up/],
      ["Copy in the UI", /^- Copy leans on hollow buzzwords/m],
      ["Information architecture and flow", /Sections follow the stock order/],
      ["States and accessibility", /contrast below WCAG AA/],
      ["Implementation defaults", /default palette ships unchanged/],
    ];
    for (const [aspect, pattern] of representatives) {
      expect(sectionOf(doc, aspect), aspect).toMatch(pattern);
    }

    const expectedCounts = [14, 14, 13, 11, 15, 14, 6, 9, 20, 8, 6, 4];
    const patterns = representatives.flatMap(([aspect], index) => {
      const entries = sectionOf(doc, aspect)
        .split(/\n(?=- )/)
        .slice(1)
        .map((entry) => entry.trim().replace(/\s+/g, " "));
      expect(entries.length, aspect).toBe(expectedCounts[index]);
      expect(new Set(entries).size, aspect).toBe(entries.length);
      return entries;
    });
    expect(patterns).toHaveLength(134);

    // The shipped list carries no citation counts, source numbers or links.
    expect(doc).not.toMatch(/https?:\/\//);
    expect(doc).not.toMatch(/\b(?:en|ja|zh|ru):\d/);
    expect(doc).not.toMatch(/\b\d+ sources?\b/i);
  });

  it("pairs each banned default with the substitute a model falls back to", async () => {
    const displacement = sectionOf(await read(antiPatterns), "Displacement");
    expect(displacement).toMatch(/pattern to avoid as well/);
    const rows = displacement
      .split("\n")
      .filter((line) => line.startsWith("| ") && !/^\| (?:-|First default)/.test(line));
    for (const substitute of [
      /cream or beige ground .*terracotta/,
      /Near-black ground.*acid-green or vermilion/,
      /newspaper look: a high-contrast serif or Mincho/,
      /Zero radius everywhere, with hairline rules/,
      /tracked all-caps monospace eyebrow labels/,
      /Space Grotesk, Instrument Serif, Geist, Fraunces, Satoshi/,
    ]) {
      expect(
        rows.some((row) => substitute.test(row)),
        String(substitute),
      ).toBe(true);
    }
  });

  it("is what the catalog, the review bundle and the comparison review point at", async () => {
    const catalog = await read("qfai-sdd/references/design-md-brand-catalog.md");
    expect(sectionOf(catalog, "Patterns to avoid")).toContain("`design-anti-patterns.md`");

    const bundle = await read("qfai-discussion/templates/uiux/50_review_input_bundle.md");
    expect(bundle).not.toMatch(/AI slop/i);
    const item = sectionOf(bundle, "Trend-derived review focus").replace(/\s+/g, " ");
    expect(item).toContain(
      `- Neither a reference adopted in \`04_Sources.md\` nor the prototype carries a pattern listed in \`${antiPatternsInstallPath}\` unless the recorded brand direction asks for it. Fail this item on any such pattern, and name the pattern.`,
    );

    const comparison = await readFile(
      path.join(root, "packages/qfai/assets/uix-rev/comparison-review.md"),
      "utf-8",
    );
    expect(comparison.replace(/\s+/g, " ")).toContain(
      `- No direction shows a pattern listed in \`${antiPatternsInstallPath}\` that the recorded brand direction does not ask for. Name the pattern when flagging one.`,
    );
    expect(comparison).not.toMatch(/anti-slop pattern list/i);

    // The prototyping loop's reviewer keeps its lock on brand values and does
    // not apply the list.
    const reviewerPrompt = await read("qfai-prototyping/references/reviewer-prompt.md");
    const reviewer = reviewerPrompt.replace(/\s+/g, " ");
    expect(reviewer).toContain("Do not comment on brand colors, typefaces, radii, or shadows");
    expect(reviewer).not.toContain("design-anti-patterns.md");
  });

  it("offers typeface candidates that are not a default or its substitute", async () => {
    const catalog = await read("qfai-sdd/references/design-md-brand-catalog.md");
    const archetypeCandidates = catalog
      .split("\n")
      .filter((line) => line.startsWith("- typeface_candidates:"));
    expect(archetypeCandidates).toHaveLength(8);
    for (const archetype of [
      "Minimal",
      "Bold",
      "Corporate",
      "Playful",
      "Organic",
      "Tech",
      "Elegant",
      "Casual",
    ]) {
      const candidateLines = sectionOf(catalog, `Archetype: ${archetype}`)
        .split("\n")
        .filter((line) => line.startsWith("- typeface_candidates:"));
      expect(candidateLines, archetype).toHaveLength(1);
      const candidates = candidateLines.flatMap((line) =>
        line
          .slice("- typeface_candidates:".length)
          .split(",")
          .map((family) => family.trim()),
      );
      expect(candidates.length, archetype).toBeGreaterThanOrEqual(2);
      expect(candidates.length, archetype).toBeLessThanOrEqual(3);
      for (const family of candidates) {
        expect(family, archetype).not.toBe("");
      }
    }
    const scriptCandidates = catalog
      .split("\n")
      .filter((line) => /^- (?:Japanese|Chinese|Cyrillic): /.test(line));
    expect(scriptCandidates).toHaveLength(3);

    const excluded =
      /\b(?:Inter|Roboto|Arial|Open Sans|Lato|Poppins|system-ui|Space Grotesk|Geist|Instrument Serif|Fraunces|Satoshi)\b/;
    for (const line of [...archetypeCandidates, ...scriptCandidates]) {
      expect(line).not.toMatch(excluded);
    }
    expect(sectionOf(catalog, "Typeface candidates")).toMatch(
      /becomes the new default once it is used everywhere/,
    );
  });

  it("keeps every archetype clear of the patterns the list names", async () => {
    const catalog = await read("qfai-sdd/references/design-md-brand-catalog.md");
    const properties = catalog
      .split("\n")
      .filter((line) => /^ {2}- (?:color_tendency|typography|spacing|interaction):/.test(line));
    expect(properties).toHaveLength(32);
    const prescribed =
      /terracotta|neon|cyan|ivory|near-white|uppercase|all-caps|wide letter-spacing|monospace or|mid-range blues|3–4 accent|bouncy|fade-based|favors whitespace|ease-in-out/i;
    for (const line of properties) {
      expect(line).not.toMatch(prescribed);
    }
  });
});
