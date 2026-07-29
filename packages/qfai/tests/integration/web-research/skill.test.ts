import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const skillPath = path.join(
  repoRoot,
  "packages",
  "qfai",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "skills",
  "web-research",
  "SKILL.md",
);

async function readSkill(): Promise<string> {
  return readFile(skillPath, "utf-8");
}

describe("web-research SKILL.md template structure", { timeout: 15_000 }, () => {
  // QFAI:SPEC-0027:TC-0027-0007 (TDD-0021)
  it("progressive disclosure - metadata-only on load, full body on task start", async () => {
    const content = await readSkill();

    // SKILL.md must describe progressive disclosure
    expect(content).toMatch(/progressive\s+disclosure/i);

    // SKILL.md must describe metadata-only loading
    expect(content).toMatch(/metadata[_\s-]?only|metadata\s+on\s+load/i);
  });

  // QFAI:SPEC-0027:TC-0027-0008 (TDD-0022)
  it("invalid SKILL.md YAML parse error reported, default behavior activated", async () => {
    const content = await readSkill();

    // SKILL.md must mention invalid / parse error / malformed
    expect(content).toMatch(/invalid|parse\s+error|malformed/i);

    // SKILL.md must mention default behavior / fallback
    expect(content).toMatch(/default\s+behavior|fallback/i);
  });
});

const baselinePath = path.join(
  repoRoot,
  "packages",
  "qfai",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "constitution",
  "shared-skill-delegation-baseline.md",
);

/** GitHub heading slug: lowercase, drop punctuation, spaces to hyphens. */
function slugify(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

describe("web-research inherits the shared delegation baseline", () => {
  // The baseline's reviewer-independence rules say "every skill", but a skill
  // that restates the delegation contract locally silently opts out: before
  // this, web-research shipped its own 6-column Work Orders table and a
  // reviewer gate with no attestation, so a self-review left no trace in the
  // research evidence.
  it("references the baseline instead of redefining the delegation contract", async () => {
    const content = await readSkill();
    expect(content).toContain("shared-skill-delegation-baseline.md");
  });

  it("carries the Agent instance column in its Work Orders Summary schema", async () => {
    const content = await readSkill();
    const header = /\|\s*Step\s*\|[^\n]*\|/.exec(content)?.[0] ?? "";
    expect(header).toContain("Agent instance");
  });

  it("requires the reviewer authorship attestation", async () => {
    const content = await readSkill();
    expect(content).toContain("Authored/edited under review");
  });

  it("links only to anchors that exist in the shipped baseline", async () => {
    const [content, baseline] = await Promise.all([readSkill(), readFile(baselinePath, "utf-8")]);
    const slugs = new Set(
      Array.from(baseline.matchAll(/^#{1,6}\s+(.+?)\s*$/gm), (m) => slugify(m[1] ?? "")),
    );
    const linked = Array.from(
      content.matchAll(/shared-skill-delegation-baseline\.md#([\w-]+)/g),
      (m) => m[1] ?? "",
    );
    expect(linked.length).toBeGreaterThan(0);
    expect(linked.filter((anchor) => !slugs.has(anchor))).toEqual([]);
  });
});
