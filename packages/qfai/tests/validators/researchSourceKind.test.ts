/**
 * The date a source entry owes, and the kind that decides it.
 *
 * A discussion pack built on first-hand evidence — a screenshot of the system
 * the project is replacing, a file the customer supplied, a conversation log —
 * cites sources that are real and were never published. Asking every entry for
 * `published` gets the observation date written into that field, which states
 * something untrue about the source and, because freshness reads the field,
 * puts an invented figure beside it.
 *
 * The reading these cases hold: `type` decides the field, an entry with no
 * `type` is judged exactly as it was before the field existed, and freshness
 * counts published sources only.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { RULE_PROMOTIONS, newRuleSeverity } from "../../src/core/sunset.js";
import { validateResearchSummary } from "../../src/core/validators/researchSummary.js";
import { resolveToolVersion } from "../../src/core/version.js";

const tempDirs: string[] = [];

async function newRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-research-kind-"));
  tempDirs.push(root);
  return root;
}

/** Writes one discussion document holding the given `sources[]` lines. */
async function packWithSources(root: string, sourceLines: string[]): Promise<void> {
  const discussionDir = path.join(root, ".qfai", "discussion");
  await mkdir(discussionDir, { recursive: true });
  await writeFile(
    path.join(discussionDir, "04_Sources.md"),
    [
      "# Sources",
      "",
      "## Research Summary",
      "sources:",
      ...sourceLines,
      "best_practices:",
      "  - practice",
      "anti_patterns:",
      "  - anti",
      "reflection:",
      "  - action: apply",
      "    reason: relevant",
      "",
    ].join("\n"),
    "utf-8",
  );
}

/** Every code the run reported, in order. */
async function codesFor(root: string): Promise<string[]> {
  return (await validateResearchSummary(root, defaultConfig)).map((item) => item.code);
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

describe("a source that was never published", () => {
  it("records its observation date and is asked for nothing else", async () => {
    const root = await newRoot();
    await packWithSources(root, [
      "  - id: SRC-0001",
      "    title: The order list as it stands today",
      "    url: app/admin/orders",
      "    type: primary",
      "    retrieved: 2026-09-01",
    ]);

    const codes = await codesFor(root);

    expect(codes).not.toContain("QFAI-RESEARCH-006");
    expect(codes).not.toContain("QFAI-RESEARCH-022");
    expect(codes).not.toContain("QFAI-RESEARCH-023");
  });

  it("is reported when it dates itself by nothing", async () => {
    const root = await newRoot();
    await packWithSources(root, [
      "  - id: SRC-0001",
      "    title: The order list as it stands today",
      "    url: app/admin/orders",
      "    type: primary",
    ]);

    const codes = await codesFor(root);

    expect(codes).toContain("QFAI-RESEARCH-022");
    expect(codes).not.toContain("QFAI-RESEARCH-006");
  });

  it("is reported when its date is not a full one", async () => {
    const root = await newRoot();
    await packWithSources(root, [
      "  - id: SRC-0001",
      "    title: A supplied export",
      "    url: data/orders.csv",
      "    type: secondary",
      "    retrieved: 2026-09",
    ]);

    expect(await codesFor(root)).toContain("QFAI-RESEARCH-022");
  });

  it("is still asked for a locator", async () => {
    const root = await newRoot();
    await packWithSources(root, [
      "  - id: SRC-0001",
      "    title: A conversation log",
      "    type: primary",
      "    retrieved: 2026-09-01",
    ]);

    expect(await codesFor(root)).toContain("QFAI-RESEARCH-005");
  });
});

describe("a published source", () => {
  it("still owes its publication date", async () => {
    const root = await newRoot();
    await packWithSources(root, [
      "  - id: SRC-0001",
      "    title: A vendor page",
      "    url: https://example.com/reference",
      "    type: external",
    ]);

    const codes = await codesFor(root);

    expect(codes).toContain("QFAI-RESEARCH-006");
    expect(codes).not.toContain("QFAI-RESEARCH-022");
  });

  it("is satisfied by one", async () => {
    const root = await newRoot();
    await packWithSources(root, [
      "  - id: SRC-0001",
      "    title: A vendor page",
      "    url: https://example.com/reference",
      "    type: external",
      "    published: 2026-01-01",
    ]);

    const codes = await codesFor(root);

    expect(codes).not.toContain("QFAI-RESEARCH-006");
    expect(codes).not.toContain("QFAI-RESEARCH-022");
  });
});

describe("an entry that declares no kind", () => {
  it("is judged as a published source, the way it was before the field existed", async () => {
    const root = await newRoot();
    await packWithSources(root, [
      "  - id: SRC-0001",
      "    title: A vendor page",
      "    url: https://example.com/reference",
    ]);

    const codes = await codesFor(root);

    expect(codes).toContain("QFAI-RESEARCH-006");
    expect(codes).not.toContain("QFAI-RESEARCH-023");
  });
});

describe("a kind the registry does not define", () => {
  it("is reported for itself, not as a missing date", async () => {
    const root = await newRoot();
    await packWithSources(root, [
      "  - id: SRC-0001",
      "    title: An observation",
      "    url: app/admin/orders",
      "    type: firsthand",
      "    retrieved: 2026-09-01",
    ]);

    const codes = await codesFor(root);

    expect(codes).toContain("QFAI-RESEARCH-023");
    expect(codes).not.toContain("QFAI-RESEARCH-006");
    expect(codes).not.toContain("QFAI-RESEARCH-022");
  });

  it("names the three the registry does define", async () => {
    const root = await newRoot();
    await packWithSources(root, [
      "  - id: SRC-0001",
      "    title: An observation",
      "    url: app/admin/orders",
      "    type: firsthand",
    ]);

    const finding = (await validateResearchSummary(root, defaultConfig)).find(
      (item) => item.code === "QFAI-RESEARCH-023",
    );

    expect(finding?.message).toContain("primary");
    expect(finding?.message).toContain("secondary");
    expect(finding?.message).toContain("external");
  });
});

describe("the window the two rules ride", () => {
  it("decides their severity, and the message names the release that ends it", async () => {
    const root = await newRoot();
    await packWithSources(root, [
      "  - id: SRC-0001",
      "    title: The order list as it stands today",
      "    url: app/admin/orders",
      "    type: primary",
    ]);

    const promotion = RULE_PROMOTIONS.researchSummarySourceType.promoteAt;
    const expected = newRuleSeverity(await resolveToolVersion(), promotion);
    const finding = (await validateResearchSummary(root, defaultConfig)).find(
      (item) => item.code === "QFAI-RESEARCH-022",
    );

    expect(finding?.severity).toBe(expected);
    if (expected === "warning") {
      expect(finding?.message).toContain(promotion);
    }
  });
});

describe("freshness", () => {
  it("is read over published sources only", async () => {
    const root = await newRoot();
    // One published source, current. Four unpublished ones observed on the same
    // day: counted as publications they would each be recent too, so the figure
    // only differs from the old reading when the dates disagree — which is why
    // the unpublished dates here are old.
    await packWithSources(root, [
      "  - id: SRC-0001",
      "    title: A vendor page",
      "    url: https://example.com/reference",
      "    type: external",
      "    published: 2026-09-01",
      "  - id: SRC-0002",
      "    title: A screenshot",
      "    url: app/admin/orders",
      "    type: primary",
      "    retrieved: 2010-01-01",
      "    published: 2010-01-01",
      "  - id: SRC-0003",
      "    title: Another screenshot",
      "    url: app/admin/products",
      "    type: primary",
      "    retrieved: 2010-01-01",
      "    published: 2010-01-01",
    ]);

    expect(await codesFor(root)).not.toContain("QFAI-RESEARCH-002");
  });

  it("still reports a pack whose published sources are old", async () => {
    const root = await newRoot();
    await packWithSources(root, [
      "  - id: SRC-0001",
      "    title: A vendor page",
      "    url: https://example.com/reference",
      "    type: external",
      "    published: 2010-01-01",
    ]);

    expect(await codesFor(root)).toContain("QFAI-RESEARCH-002");
  });
});
