/**
 * `constitution/research-first-protocol.md` declares two integration points into
 * `/qfai-discussion`: it auto-triggers on the command, and it stores its
 * `research_summary` output under a `## Research Summary` heading inside the
 * current discussion pack. Both sides used to be missing — the skill tree never
 * named the protocol, and no shipped template created the heading, so the
 * storage contract was satisfied vacuously and `validateResearchSummary`
 * (which skips any file without the heading) never ran on a generated pack.
 *
 * These cases pin the wiring: the skill's Required Process runs the protocol,
 * `templates/04_Sources.md` ships the storage slot, and that slot is shaped so
 * the validator's parser can actually read it.
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { RULE_PROMOTIONS } from "../../src/core/sunset.js";
import { validateResearchSummary } from "../../src/core/validators/researchSummary.js";

/**
 * The per-entry schema rules ride one promotion window, so today they report at
 * `warning` and say which release ends that. Read from the registry rather than
 * copied: a pin moved without the message following it is the half-landed state
 * the window exists to prevent, and a literal here would agree with whichever
 * side moved.
 */
const SCHEMA_PROMOTE_AT = RULE_PROMOTIONS.researchSummarySchemaFields.promoteAt;

const repoRoot = path.resolve(process.cwd(), "..", "..");
const discussionRoots = [
  path.join(
    repoRoot,
    "packages",
    "qfai",
    "assets",
    "init",
    ".qfai",
    "assistant",
    "skills",
    "qfai-discussion",
  ),
  path.join(repoRoot, ".qfai", "assistant", "skills", "qfai-discussion"),
];
const protocolPaths = [
  path.join(
    repoRoot,
    "packages",
    "qfai",
    "assets",
    "init",
    ".qfai",
    "assistant",
    "constitution",
    "research-first-protocol.md",
  ),
  path.join(repoRoot, ".qfai", "assistant", "constitution", "research-first-protocol.md"),
];

/** The heading spelling `validateResearchSummary` keys off. */
const RESEARCH_SUMMARY_HEADING_RE = /^#{1,3}\s+Research\s+Summary/im;
/** Schema keys the validator reads out of the stored section. */
const SCHEMA_KEYS = ["sources:", "best_practices:", "anti_patterns:", "reflection:"];

const tempDirs: string[] = [];

/**
 * Scratch packs live under the repository-root `tmp/` (Article XI), so a run
 * killed before `afterEach` leaves the leftovers inside the repo's own
 * gitignored staging area instead of the machine-wide temp directory.
 */
async function newTempDir(): Promise<string> {
  const scratchRoot = path.join(repoRoot, "tmp");
  await mkdir(scratchRoot, { recursive: true });
  const dir = await mkdtemp(path.join(scratchRoot, "qfai-research-wiring-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

/** Returns the lines of `heading` up to the next `## ` heading. */
function section(content: string, heading: string): string {
  const lines = content.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start === -1) {
    return "";
  }
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith("## "));
  return (end === -1 ? rest : rest.slice(0, end)).join("\n");
}

/** Writes the shipped sources template into a throwaway discussion pack. */
async function seedPack(
  template: string,
  packName = "discussion-20260101000000000",
): Promise<string> {
  const root = await newTempDir();
  await addPack(root, packName, template);
  return root;
}

/** Adds one more pack to an existing throwaway root. */
async function addPack(root: string, packName: string, template: string): Promise<string> {
  const packDir = path.join(root, ".qfai", "discussion", packName);
  await mkdir(packDir, { recursive: true });
  await writeFile(path.join(packDir, "04_Sources.md"), template, "utf-8");
  return packDir;
}

/** Pins `.qfai/state.json#discussion.currentId` — the active-pack SSOT. */
async function usePack(root: string, packName: string): Promise<void> {
  await writeFile(
    path.join(root, ".qfai", "state.json"),
    JSON.stringify({ discussion: { currentId: packName } }, null, 2),
    "utf-8",
  );
}

/** Drops the whole `## Research Summary` section, heading included. */
function deleteStorageSlot(template: string): string {
  const lines = template.split(/\r?\n/);
  const start = lines.findIndex((line) => /^#{1,3}\s+Research\s+Summary/.test(line));
  // No heading, nothing to drop. Without this guard `start` is -1 and
  // `slice(0, -1)` silently truncates the template's last line instead,
  // so a caller would be handed a corrupted fixture rather than an
  // unchanged one.
  if (start === -1) return template;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^#{1,3}\s+\S/.test(line));
  return [...lines.slice(0, start), ...(end === -1 ? [] : rest.slice(end))].join("\n");
}

/** The `04_Sources.md` template as shipped from the assets SSOT tree. */
async function readShippedTemplate(): Promise<string> {
  return readFile(path.join(discussionRoots[0] ?? "", "templates", "04_Sources.md"), "utf-8");
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Only the `published` date replaced — the state a fake "run" would leave. */
function fillDateOnly(template: string): string {
  return template.replaceAll("published: YYYY-MM-DD", `published: ${today()}`);
}

/** Every shipped placeholder replaced with real data, as an actual run would. */
function fillEveryPlaceholder(template: string): string {
  return fillDateOnly(template).replace(
    /^(\s*(?:-\s*)?[A-Za-z0-9_]+:[ \t]*)\[[^\]]*\][ \t]*$/gm,
    (_match, head: string) => `${head}Recorded by the research-first protocol run`,
  );
}

describe("research-first protocol is wired into /qfai-discussion", () => {
  for (const discussionRoot of discussionRoots) {
    const label = path.relative(repoRoot, discussionRoot);

    it(`${label}: Required Process runs the protocol and names its storage slot`, async () => {
      const skill = await readFile(path.join(discussionRoot, "SKILL.md"), "utf-8");
      const required = section(skill, "## Required Process");

      expect(required).toContain("research-first-protocol.md");
      expect(required).toContain("## Research Summary");
      expect(required).toContain("04_Sources.md");
      // The constitution defines this as the protocol run at the start of the
      // work, so it must precede the artifacts meant to consume its findings.
      // Placed after them it degrades into a summary filled in at the end.
      expect(required.indexOf("research-first-protocol.md")).toBeLessThan(
        required.indexOf("Inception Deck"),
      );
      expect(required.indexOf("research-first-protocol.md")).toBeLessThan(
        required.indexOf("Story Workshop"),
      );
    });

    it(`${label}: completion cannot be declared without the stored summary`, async () => {
      const skill = await readFile(path.join(discussionRoot, "SKILL.md"), "utf-8");
      const completion = section(skill, "## Completion Contract (Shared)");

      expect(completion).toContain("Research Summary");
    });

    it(`${label}: 04_Sources.md ships the storage slot the validator reads`, async () => {
      const template = await readFile(
        path.join(discussionRoot, "templates", "04_Sources.md"),
        "utf-8",
      );

      expect(template).toMatch(RESEARCH_SUMMARY_HEADING_RE);
      expect(template).toContain("research_summary:");
      for (const key of SCHEMA_KEYS) {
        expect(template, `04_Sources.md storage slot is missing "${key}"`).toContain(key);
      }
    });

    it(`${label}: the completion matrix carries the condition for every pack`, async () => {
      // SKILL.md points at the matrix as the full completion logic, so a
      // condition that lives only in SKILL.md is invisible to anyone reading
      // the matrix — non-UI packs included.
      const matrix = await readFile(
        path.join(discussionRoot, "references", "discussion-completion-matrix.md"),
        "utf-8",
      );
      const allPacks = section(matrix, "## All Packs");

      expect(allPacks).toContain("Research Summary");
      expect(allPacks).toContain("research-first-protocol.md");
      expect(section(matrix, "## Non-UI Packs")).toContain("All Packs");
    });
  }

  for (const protocolPath of protocolPaths) {
    it(`${path.relative(repoRoot, protocolPath)}: Storage names the file that holds the slot`, async () => {
      const protocol = await readFile(protocolPath, "utf-8");
      expect(section(protocol, "## Storage")).toContain("04_Sources.md");
    });
  }

  it("the shipped slot is structurally complete for validateResearchSummary", async () => {
    // A heading alone is not enough: the validator parses the YAML lists under
    // it, so a slot the parser cannot read would be as vacuous as no slot.
    const template = await readShippedTemplate();
    const issues = await validateResearchSummary(await seedPack(template), defaultConfig);
    const codes = issues.map((item) => item.code);

    expect(codes).not.toContain("QFAI-RESEARCH-001"); // sources[] parsed
    expect(codes).not.toContain("QFAI-RESEARCH-007"); // best_practices[] parsed
    expect(codes).not.toContain("QFAI-RESEARCH-008"); // anti_patterns[] parsed
    expect(codes).not.toContain("QFAI-RESEARCH-011"); // reflection[] parsed
    expect(codes).not.toContain("QFAI-RESEARCH-003"); // reflection carries action: apply
  });

  it("reports the unfilled slot until the protocol has actually run", async () => {
    const template = await readShippedTemplate();
    const issues = await validateResearchSummary(await seedPack(template), defaultConfig);
    const codes = issues.map((item) => item.code);

    // Both fill-me-in signals: the date and every bracketed placeholder.
    expect(codes).toContain("QFAI-RESEARCH-006");
    expect(codes).toContain("QFAI-RESEARCH-021");
  });

  it("still fails when only the date was refreshed", async () => {
    // The gate has to demand a protocol run, not a plausible-looking date: a
    // pack whose title / url / BP / AP / finding / reason are untouched
    // template text has not researched anything.
    const template = await readShippedTemplate();
    const issues = await validateResearchSummary(
      await seedPack(fillDateOnly(template)),
      defaultConfig,
    );
    const placeholder = issues.find((item) => item.code === "QFAI-RESEARCH-021");

    expect(placeholder, "date-only edit must not pass the Research Summary gate").toBeDefined();
    for (const key of ["title", "url", "category", "description", "finding", "reason"]) {
      expect(placeholder?.message, `placeholder "${key}" is not reported`).toContain(key);
    }
  });

  it("validates clean once every placeholder is replaced with real data", async () => {
    const template = await readShippedTemplate();
    const issues = await validateResearchSummary(
      await seedPack(fillEveryPlaceholder(template)),
      defaultConfig,
    );

    expect(issues.map((item) => `${item.code} ${item.message}`)).toEqual([]);
  });

  it("rejects a reflection list that records no apply decision", async () => {
    // The prose under the slot names `action: apply` as the rule; matching it
    // there instead of in the list would make QFAI-RESEARCH-003 unreachable.
    const filled = fillEveryPlaceholder(await readShippedTemplate()).replace(
      "      action: apply",
      "      action: defer",
    );
    const issues = await validateResearchSummary(await seedPack(filled), defaultConfig);

    expect(issues.map((item) => item.code)).toContain("QFAI-RESEARCH-003");
  });

  it("rejects a source_id that resolves to no source entry", async () => {
    const filled = fillEveryPlaceholder(await readShippedTemplate()).replaceAll(
      "source_id: SRC-0001",
      "source_id: SRC-0404",
    );
    const issues = await validateResearchSummary(await seedPack(filled), defaultConfig);

    expect(issues.map((item) => item.code)).toContain("QFAI-RESEARCH-015");
  });

  it("reports a pack whose Research Summary section was deleted", async () => {
    // Shipping the heading only helps while it survives: a pack that dropped
    // the section used to be skipped by the per-file loop and passed the gate
    // with no research at all.
    const stripped = deleteStorageSlot(await readShippedTemplate());
    expect(stripped).not.toMatch(RESEARCH_SUMMARY_HEADING_RE);

    const issues = await validateResearchSummary(await seedPack(stripped), defaultConfig);
    const slotMissing = issues.find((item) => item.code === "QFAI-RESEARCH-016");

    // Windowed, not hard: this fires on every pack written before the storage
    // slot existed, which is the population the section-missing rule already
    // has a window for.
    expect(slotMissing?.severity).toBe("warning");
    expect(slotMissing?.message).toContain(SCHEMA_PROMOTE_AT);
    expect(slotMissing?.file).toContain("04_Sources.md");
  });

  it("gates the pack .qfai/state.json points at, not the newest one", async () => {
    // `qfai discussion use <id>` can pin an older pack. Validating the newest
    // one instead would pass an unfilled current pack whenever some later pack
    // happens to be complete.
    const template = await readShippedTemplate();
    const root = await seedPack(template, "discussion-20260101000000000");
    await addPack(root, "discussion-20260202000000000", fillEveryPlaceholder(template));

    await usePack(root, "discussion-20260101000000000");
    const onOlder = await validateResearchSummary(root, defaultConfig);
    expect(onOlder.map((item) => item.code)).toContain("QFAI-RESEARCH-021");

    await usePack(root, "discussion-20260202000000000");
    const onNewer = await validateResearchSummary(root, defaultConfig);
    expect(onNewer.map((item) => `${item.code} ${item.message}`)).toEqual([]);
  });

  it("reports a pinned older pack whose 04_Sources.md is gone", async () => {
    // `validateDiscussionPackReadiness` (QFAI-DPACK-002) only inspects the
    // NEWEST pack, so a pointer pinned to an older pack that lost the storage
    // file is nobody else's finding: the gate has to report it here or the
    // pinned session passes with no research file at all.
    const template = await readShippedTemplate();
    const root = await seedPack(fillEveryPlaceholder(template), "discussion-20260202000000000");
    await mkdir(path.join(root, ".qfai", "discussion", "discussion-20260101000000000"), {
      recursive: true,
    });
    await usePack(root, "discussion-20260101000000000");

    const issues = await validateResearchSummary(root, defaultConfig);
    const slotMissing = issues.find((item) => item.code === "QFAI-RESEARCH-016");

    expect(slotMissing?.severity).toBe("warning");
    expect(slotMissing?.message).toContain(SCHEMA_PROMOTE_AT);
    expect(slotMissing?.file).toContain("discussion-20260101000000000");
  });

  it("resolves source_id references by scalar value, not by quoting", async () => {
    // A YAML serializer may quote `sources[].id` and leave the references
    // bare. Both spell the same scalar, so QFAI-RESEARCH-015 must not fire.
    const filled = fillEveryPlaceholder(await readShippedTemplate()).replace(
      "    - id: SRC-0001",
      '    - id: "SRC-0001"',
    );
    const issues = await validateResearchSummary(await seedPack(filled), defaultConfig);

    expect(issues.map((item) => `${item.code} ${item.message}`)).toEqual([]);
  });

  it("rejects YAML-empty values in required fields", async () => {
    // `title: ""` / `reason: null` carry no content, so a summary that writes
    // them has not recorded a protocol run either.
    const filled = fillEveryPlaceholder(await readShippedTemplate())
      .replace(/^([ \t]+)title: Recorded by the research-first protocol run$/m, '$1title: ""')
      .replace(/^([ \t]+)reason: Recorded by the research-first protocol run$/m, "$1reason: null");
    const codes = (await validateResearchSummary(await seedPack(filled), defaultConfig)).map(
      (item) => item.code,
    );

    expect(codes).toContain("QFAI-RESEARCH-004"); // sources[].title
    expect(codes).toContain("QFAI-RESEARCH-010"); // reflection[].reason
  });

  it("rejects a placeholder that was quoted or carries a trailing comment", async () => {
    // Both are legal YAML and both are still the shipped template. Matching the
    // whole line let them through, and the required-field checks then read them
    // as filled in — so a pack that changed only the date cleared the gate.
    const filled = fillEveryPlaceholder(await readShippedTemplate())
      .replace(
        /^([ \t]+)title: Recorded by the research-first protocol run$/m,
        '$1title: "[Reference title]"',
      )
      .replace(
        /^([ \t]+)reason: Recorded by the research-first protocol run$/m,
        "$1reason: [Why this applies] # TODO",
      );
    const issues = await validateResearchSummary(await seedPack(filled), defaultConfig);
    const placeholder = issues.filter((item) => item.code === "QFAI-RESEARCH-021");

    expect(placeholder).toHaveLength(1);
    expect(placeholder[0]?.message).toContain("title");
    expect(placeholder[0]?.message).toContain("reason");
  });

  it("resolves a source_id whose id carries a trailing comment", async () => {
    // Quoting was handled before the comment was removed, so `id: "SRC-0001"
    // # primary` normalised to `"SRC-0001"` and a correct reference was
    // reported unresolved.
    const filled = fillEveryPlaceholder(await readShippedTemplate()).replace(
      /^([ \t]+)(- )?id: SRC-0001$/m,
      '$1$2id: "SRC-0001" # primary',
    );
    const codes = (await validateResearchSummary(await seedPack(filled), defaultConfig)).map(
      (item) => item.code,
    );

    expect(codes).not.toContain("QFAI-RESEARCH-015");
  });

  it("rejects an empty block scalar in a required field", async () => {
    // `description: |-` with no body is the empty string in YAML, but reading
    // the header line alone returned `|-` — a non-empty value that passed every
    // required-field check while the field held nothing.
    const filled = fillEveryPlaceholder(await readShippedTemplate()).replace(
      /^([ \t]+)description: Recorded by the research-first protocol run$/m,
      "$1description: |-",
    );
    const codes = (await validateResearchSummary(await seedPack(filled), defaultConfig)).map(
      (item) => item.code,
    );

    expect(codes).toContain("QFAI-RESEARCH-018"); // best_practices[].description
  });

  it("accepts a block scalar that actually carries a body", async () => {
    // The fix must read the body, not just reject the header: a real multi-line
    // description is a legitimate way to write the field.
    const filled = fillEveryPlaceholder(await readShippedTemplate()).replace(
      /^([ \t]+)description: Recorded by the research-first protocol run$/m,
      "$1description: |-\n$1  Recorded by the research-first protocol run\n$1  across two lines.",
    );
    const codes = (await validateResearchSummary(await seedPack(filled), defaultConfig)).map(
      (item) => item.code,
    );

    expect(codes).toEqual([]);
  });

  it("requires action and reason on every reflection entry, not just one", async () => {
    // A list whose first entry is complete must not vouch for the rest.
    const filled = fillEveryPlaceholder(await readShippedTemplate()).replace(
      "      reason: Recorded by the research-first protocol run",
      "      reason: Recorded by the research-first protocol run\n    - source_id: SRC-0001\n      finding: Second entry left unfinished",
    );
    const issues = await validateResearchSummary(await seedPack(filled), defaultConfig);
    const codes = issues.map((item) => item.code);

    expect(codes).toContain("QFAI-RESEARCH-009");
    expect(codes).toContain("QFAI-RESEARCH-010");
    expect(issues.find((item) => item.code === "QFAI-RESEARCH-009")?.message).toContain(
      "reflection[1]",
    );
  });

  it("reports a Research Summary heading left over an empty body", async () => {
    // Keeping the heading and deleting the body used to leave the section
    // unparsed and the pack unvalidated.
    const template = await readShippedTemplate();
    const emptied = template.replace(
      /(^#{1,3}\s+Research\s+Summary\s*$)[\s\S]*?(?=^## Trend Scan)/m,
      "$1\n\n",
    );
    expect(emptied).toMatch(RESEARCH_SUMMARY_HEADING_RE);
    expect(emptied).not.toContain("research_summary:");

    const issues = await validateResearchSummary(await seedPack(emptied), defaultConfig);

    expect(issues.map((item) => item.code)).toContain("QFAI-RESEARCH-016");
  });

  it("reports a current-pack pointer that resolves to nothing", async () => {
    // A broken SSOT must not silently fall through to some other pack that
    // happens to be complete.
    const template = await readShippedTemplate();
    const root = await seedPack(fillEveryPlaceholder(template), "discussion-20260202000000000");
    await usePack(root, "discussion-20250101000000000");

    const issues = await validateResearchSummary(root, defaultConfig);
    const broken = issues.find((item) => item.code === "QFAI-RESEARCH-020");

    expect(broken?.severity).toBe("warning");
    expect(broken?.message).toContain(SCHEMA_PROMOTE_AT);
    expect(broken?.message).toContain("discussion-20250101000000000");
  });

  it("validates only 04_Sources.md inside a pack", async () => {
    // The Storage contract names one file. A sibling pack file that merely
    // mentions the heading must not be held to the whole Output Schema.
    const template = await readShippedTemplate();
    const root = await seedPack(fillEveryPlaceholder(template));
    await writeFile(
      path.join(root, ".qfai", "discussion", "discussion-20260101000000000", "01_Context.md"),
      [
        "# 01 Context",
        "",
        "## Research Summary",
        "",
        "See 04_Sources.md for the stored run.",
        "",
      ].join("\n"),
      "utf-8",
    );

    const issues = await validateResearchSummary(root, defaultConfig);

    expect(issues.map((item) => `${item.code} ${item.file}`)).toEqual([]);
  });

  it("rejects a source entry that dropped its id", async () => {
    // Splitting on `- id:` absorbed such an entry into its predecessor, so the
    // missing id went unreported and the leftover fields covered for it.
    const filled = fillEveryPlaceholder(await readShippedTemplate()).replace(
      "  best_practices:",
      [
        "    - title: Second source with no id",
        "      url: https://example.com/second",
        `      published: ${today()}`,
        "  best_practices:",
      ].join("\n"),
    );
    const issues = await validateResearchSummary(await seedPack(filled), defaultConfig);
    const missingId = issues.find((item) => item.code === "QFAI-RESEARCH-017");

    expect(missingId?.message).toContain("sources[1]");
  });

  it("requires every field of each best_practices / anti_patterns entry", async () => {
    const filled = fillEveryPlaceholder(await readShippedTemplate()).replace(
      "  anti_patterns:",
      "    - id: BP-0002\n      title: Second practice with no category\n  anti_patterns:",
    );
    const issues = await validateResearchSummary(await seedPack(filled), defaultConfig);
    const incomplete = issues.find((item) => item.code === "QFAI-RESEARCH-018");

    expect(incomplete?.message).toContain("best_practices[1]");
    for (const field of ["category", "description", "source_id"]) {
      expect(incomplete?.message, `missing field "${field}" is not reported`).toContain(field);
    }
  });

  it("requires source_id and finding on every reflection entry", async () => {
    const filled = fillEveryPlaceholder(await readShippedTemplate()).replace(
      "```\n\n## Trend Scan",
      "    - action: defer\n      reason: Second entry without source_id or finding\n```\n\n- Every",
    );
    const issues = await validateResearchSummary(await seedPack(filled), defaultConfig);
    const incomplete = issues.find((item) => item.code === "QFAI-RESEARCH-019");

    expect(incomplete?.message).toContain("reflection[1]");
    expect(incomplete?.message).toContain("source_id");
    expect(incomplete?.message).toContain("finding");
  });

  it("ignores an abandoned older pack once a newer one exists", async () => {
    // Every generated pack ships the slot, so a pack the team walked away from
    // must not keep `--profile discussion` red forever.
    const template = await readShippedTemplate();
    const root = await seedPack(fillEveryPlaceholder(template), "discussion-20260202000000000");
    const stalePack = path.join(root, ".qfai", "discussion", "discussion-20260101000000000");
    await mkdir(stalePack, { recursive: true });
    await writeFile(path.join(stalePack, "04_Sources.md"), template, "utf-8");

    const issues = await validateResearchSummary(root, defaultConfig);

    expect(issues.map((item) => `${item.code} ${item.message}`)).toEqual([]);
  });

  it("rejects a non-scalar value in a required field", async () => {
    // The Output Schema types these fields as strings. Falling back to the raw
    // text for a value YAML reads as a sequence or a mapping let `title: []`
    // and `description: {}` count as filled in — and making `sources[].id` and
    // every `source_id` `[]` even satisfied the reference check, so a summary
    // whose only real values were the date and `action: apply` cleared the gate.
    const filled = fillEveryPlaceholder(await readShippedTemplate())
      .replace(/^([ \t]+)title: Recorded by the research-first protocol run$/m, "$1title: []")
      .replace(
        /^([ \t]+)description: Recorded by the research-first protocol run$/m,
        "$1description: {}",
      )
      .replaceAll("id: SRC-0001", "id: []");
    const codes = (await validateResearchSummary(await seedPack(filled), defaultConfig)).map(
      (item) => item.code,
    );

    expect(codes).toContain("QFAI-RESEARCH-004"); // sources[].title
    expect(codes).toContain("QFAI-RESEARCH-017"); // sources[].id
    expect(codes).toContain("QFAI-RESEARCH-018"); // best_practices[].description
  });

  it("does not read a source_id reference out of a block scalar body", async () => {
    // A multi-line `description` is valid input, and quoting a legacy config
    // inside one is ordinary prose. Scanning the whole section for
    // `source_id:` lines collected that quotation as a real reference and
    // reported QFAI-RESEARCH-015 against a complete summary.
    const filled = fillEveryPlaceholder(await readShippedTemplate()).replace(
      /^([ \t]+)description: Recorded by the research-first protocol run$/m,
      [
        "$1description: |-",
        "$1  Never copy the deprecated block, which reads:",
        "$1  source_id: legacy-source",
      ].join("\n"),
    );
    const issues = await validateResearchSummary(await seedPack(filled), defaultConfig);

    // Also the over-correction pin: the entry around that body is complete, so
    // narrowing the scan must not start reporting it as unfinished either.
    expect(issues.map((item) => `${item.code} ${item.message}`)).toEqual([]);
  });

  it("does not read a placeholder out of a block scalar body", async () => {
    // The same defect the `source_id` scan had, on the other payload-wide
    // regex. A `description` that quotes the template line it replaced is
    // ordinary prose in a valid multi-line value; scanning the whole payload
    // read that quotation as the entry's own unfilled `title` and reported
    // QFAI-RESEARCH-021 against a summary with nothing left to fill in.
    const filled = fillEveryPlaceholder(await readShippedTemplate()).replace(
      /^([ \t]+)description: Recorded by the research-first protocol run$/m,
      [
        "$1description: |-",
        "$1  Replaced the scaffold line, which read:",
        "$1  title: [Reference title]",
      ].join("\n"),
    );
    const issues = await validateResearchSummary(await seedPack(filled), defaultConfig);

    // Over-correction pin as well: the entry holding that body is complete, so
    // narrowing the scan must not begin reporting it as unfinished instead.
    expect(issues.map((item) => `${item.code} ${item.message}`)).toEqual([]);
  });

  it("resolves the current pack under the discussionDir the caller passed", async () => {
    // `validateProject` may hand this validator a config that differs from the
    // `qfai.config.yaml` on disk. Re-reading that file to resolve the active
    // pointer looked for the pack under a different discussion root, so a
    // present current pack was reported as an unresolvable pointer.
    const root = await newTempDir();
    const packName = "discussion-20260101000000000";
    const packDir = path.join(root, "docs", "discussion", packName);
    await mkdir(packDir, { recursive: true });
    await writeFile(
      path.join(packDir, "04_Sources.md"),
      fillEveryPlaceholder(await readShippedTemplate()),
      "utf-8",
    );
    await mkdir(path.join(root, ".qfai"), { recursive: true });
    await usePack(root, packName);
    // The on-disk config still names the default location, which holds no pack.
    await writeFile(
      path.join(root, "qfai.config.yaml"),
      "paths:\n  discussionDir: .qfai/discussion\n",
      "utf-8",
    );

    const issues = await validateResearchSummary(root, {
      ...defaultConfig,
      paths: { ...defaultConfig.paths, discussionDir: "docs/discussion" },
    });

    expect(issues.map((item) => `${item.code} ${item.message}`)).toEqual([]);
  });
});
