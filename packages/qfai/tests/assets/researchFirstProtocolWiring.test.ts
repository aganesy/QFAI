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
import os from "node:os";
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

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-research-wiring-"));
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
async function seedPack(template: string): Promise<string> {
  const root = await newTempDir();
  const packDir = path.join(root, ".qfai", "discussion", "discussion-20260101000000000");
  await mkdir(packDir, { recursive: true });
  await writeFile(path.join(packDir, "04_Sources.md"), template, "utf-8");
  return root;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
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
    const template = await readFile(
      path.join(discussionRoots[0] ?? "", "templates", "04_Sources.md"),
      "utf-8",
    );
    const issues = await validateResearchSummary(await seedPack(template), defaultConfig);
    const codes = issues.map((item) => item.code);

    expect(codes).not.toContain("QFAI-RESEARCH-001"); // sources[] parsed
    expect(codes).not.toContain("QFAI-RESEARCH-007"); // best_practices[] parsed
    expect(codes).not.toContain("QFAI-RESEARCH-008"); // anti_patterns[] parsed
    expect(codes).not.toContain("QFAI-RESEARCH-011"); // reflection[] parsed
    expect(codes).not.toContain("QFAI-RESEARCH-003"); // reflection carries action: apply
  });

  it("reports the unfilled slot until the protocol has actually run", async () => {
    const template = await readFile(
      path.join(discussionRoots[0] ?? "", "templates", "04_Sources.md"),
      "utf-8",
    );
    const issues = await validateResearchSummary(await seedPack(template), defaultConfig);

    // The shipped `published: YYYY-MM-DD` placeholder is the fill-me-in signal.
    expect(issues.map((item) => item.code)).toContain("QFAI-RESEARCH-006");
  });

  it("validates clean once the placeholders are filled in", async () => {
    const template = await readFile(
      path.join(discussionRoots[0] ?? "", "templates", "04_Sources.md"),
      "utf-8",
    );
    const filled = template.replaceAll("published: YYYY-MM-DD", `published: ${today()}`);
    const issues = await validateResearchSummary(await seedPack(filled), defaultConfig);

    expect(issues.map((item) => `${item.code} ${item.message}`)).toEqual([]);
  });
});
