/**
 * TC-3.3.x — layout anti-pattern (lap-*) registry.
 *
 * The 8 lap entries are FIXED per the Phase 3 plan; tests pin both
 * cardinality and id ordering, plus the semantic-scope no-op contract.
 */

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  findLayoutAntiPatterns,
  loadLayoutAntiPatterns,
  type LayoutAntiPattern,
} from "../../../src/core/validators/layoutAntiPatterns.js";

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-lap-"));
  tempDirs.push(dir);
  return dir;
}

const EXPECTED_IDS = [
  "lap-001-saas-dashboard",
  "lap-002-card-grid-sidebar",
  "lap-003-saas-table-tabs",
  "lap-004-bento-grid",
  "lap-005-centered-hero",
  "lap-006-overcrowded-sidebar",
  "lap-007-state-not-represented",
  "lap-008-no-back-affordance",
] as const;

describe("loadLayoutAntiPatterns", () => {
  it("TC-3.3.1: reads 8 entries from layoutAntiPatterns.json", () => {
    const patterns = loadLayoutAntiPatterns();
    expect(patterns).toHaveLength(8);
  });

  it("TC-3.3.2: missing JSON file → loader throws (caller swallows)", async () => {
    const dir = await newTempDir();
    expect(() => loadLayoutAntiPatterns(path.join(dir, "no-such.json"))).toThrow();
  });

  it("TC-3.3.3: each of the 8 lap-* ids is present", () => {
    const patterns = loadLayoutAntiPatterns();
    expect(patterns.map((p) => p.id).sort()).toEqual([...EXPECTED_IDS].sort());
  });

  it("TC-3.3.4: semantic-scope regex `(?!).*` matches nothing", () => {
    const patterns = loadLayoutAntiPatterns();
    const semantic = patterns.filter((p) => p.scope === "semantic");
    expect(semantic.map((p) => p.id).sort()).toEqual(
      ["lap-007-state-not-represented", "lap-008-no-back-affordance"].sort(),
    );
    for (const p of semantic) {
      const re = new RegExp(p.regex, "gi");
      expect(re.test("")).toBe(false);
      expect(re.test("<div>loading… error… empty… success…</div>")).toBe(false);
      expect(re.test("<a href=\"#\">Back</a> breadcrumb")).toBe(false);
      expect(p.regex).toBe("(?!).*");
    }
  });
});

describe("findLayoutAntiPatterns (TC-3.3.5..8)", () => {
  const patterns = loadLayoutAntiPatterns();

  it("TC-3.3.5: lap-001 hits on aside + main + KPI", () => {
    const html =
      "<aside>nav</aside><main><div>Total KPI is 4.5</div></main>";
    expect(findLayoutAntiPatterns(html, patterns)).toContain("lap-001-saas-dashboard");
  });

  it.each<[string, string]>([
    ["lap-002-card-grid-sidebar", '<div class="grid"><aside>nav</aside></div>'],
    [
      "lap-003-saas-table-tabs",
      '<div role="tab">a</div><table><tr><td>x</td></tr></table>',
    ],
    [
      "lap-004-bento-grid",
      '<div class="grid-cols-12 grid-rows-3">x</div>',
    ],
    [
      "lap-005-centered-hero",
      '<section class="text-center"><h1>x</h1></section>',
    ],
    [
      "lap-006-overcrowded-sidebar",
      `<aside>${Array.from({ length: 12 }, (_, i) => `<a href="#${i}">l${i}</a>`).join("")}</aside>`,
    ],
  ])("TC-3.3.6: %s minimal positive match", (id, html) => {
    expect(findLayoutAntiPatterns(html, patterns)).toContain(id);
  });

  it("TC-3.3.7: lap-007 / lap-008 NOT triggered by any HTML via regex", () => {
    const samples = [
      "",
      '<div role="alert">error!</div>',
      "<button>Back</button>",
      "<div class='loading-spinner' role='progressbar'></div>",
    ];
    for (const html of samples) {
      const ids = findLayoutAntiPatterns(html, patterns);
      expect(ids).not.toContain("lap-007-state-not-represented");
      expect(ids).not.toContain("lap-008-no-back-affordance");
    }
  });

  it("TC-3.3.8: multiple lap-* are returned for HTML matching several", () => {
    const html =
      '<div class="grid"><aside>nav</aside><main><div>KPI sum</div></main></div>';
    const ids = findLayoutAntiPatterns(html, patterns);
    expect(ids).toContain("lap-001-saas-dashboard");
    expect(ids).toContain("lap-002-card-grid-sidebar");
  });
});

describe("LayoutAntiPattern type contract", () => {
  it("rejects rules with unknown scope at load time", async () => {
    const dir = await newTempDir();
    const file = path.join(dir, "patterns.json");
    const malformed: Array<{ id: string; regex: string; scope: string }> = [
      { id: "lap-X", regex: ".*", scope: "bogus" },
    ];
    await writeFile(file, JSON.stringify(malformed), "utf-8");
    const out: LayoutAntiPattern[] = loadLayoutAntiPatterns(file);
    expect(out).toHaveLength(0);
  });
});
