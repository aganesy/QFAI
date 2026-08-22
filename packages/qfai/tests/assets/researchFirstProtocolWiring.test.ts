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
import { validateResearchSummary } from "../../src/core/validators/researchSummary.js";

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
    expect(codes).toContain("QFAI-RESEARCH-012");
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
    const placeholder = issues.find((item) => item.code === "QFAI-RESEARCH-012");

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

    expect(issues.map((item) => item.code)).toContain("QFAI-RESEARCH-013");
  });

  it("reports a pack whose Research Summary section was deleted", async () => {
    // Shipping the heading only helps while it survives: a pack that dropped
    // the section used to be skipped by the per-file loop and passed the gate
    // with no research at all.
    const stripped = deleteStorageSlot(await readShippedTemplate());
    expect(stripped).not.toMatch(RESEARCH_SUMMARY_HEADING_RE);

    const issues = await validateResearchSummary(await seedPack(stripped), defaultConfig);
    const slotMissing = issues.find((item) => item.code === "QFAI-RESEARCH-014");

    expect(slotMissing?.severity).toBe("error");
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
    expect(onOlder.map((item) => item.code)).toContain("QFAI-RESEARCH-012");

    await usePack(root, "discussion-20260202000000000");
    const onNewer = await validateResearchSummary(root, defaultConfig);
    expect(onNewer.map((item) => `${item.code} ${item.message}`)).toEqual([]);
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
});
