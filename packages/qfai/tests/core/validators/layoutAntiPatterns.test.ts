/**
 * TC-3.3.x — layout anti-pattern (lap-*) registry.
 *
 * The 8 lap entries are FIXED per the Phase 3 plan; tests pin both
 * cardinality and id ordering, plus the semantic-scope no-op contract.
 */

import { existsSync } from "node:fs";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import {
  findLayoutAntiPatterns,
  layoutAntiPatternsCandidates,
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
      expect(re.test('<a href="#">Back</a> breadcrumb')).toBe(false);
      expect(p.regex).toBe("(?!).*");
    }
  });
});

describe("findLayoutAntiPatterns (TC-3.3.5..8)", () => {
  const patterns = loadLayoutAntiPatterns();

  it("TC-3.3.5: lap-001 hits on aside + main + KPI", () => {
    const html = "<aside>nav</aside><main><div>Total KPI is 4.5</div></main>";
    expect(findLayoutAntiPatterns(html, patterns)).toContain("lap-001-saas-dashboard");
  });

  it.each<[string, string]>([
    ["lap-002-card-grid-sidebar", '<div class="grid"><aside>nav</aside></div>'],
    ["lap-003-saas-table-tabs", '<div role="tab">a</div><table><tr><td>x</td></tr></table>'],
    ["lap-004-bento-grid", '<div class="grid-cols-12 grid-rows-3">x</div>'],
    ["lap-005-centered-hero", '<section class="text-center"><h1>x</h1></section>'],
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
    const html = '<div class="grid"><aside>nav</aside><main><div>KPI sum</div></main></div>';
    const ids = findLayoutAntiPatterns(html, patterns);
    expect(ids).toContain("lap-001-saas-dashboard");
    expect(ids).toContain("lap-002-card-grid-sidebar");
  });
});

describe("the registry has one copy", () => {
  const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
  const shipped = path.join(packageRoot, "assets", "validators", "layoutAntiPatterns.json");

  /** Every `layoutAntiPatterns.json` under `dir`, as paths relative to it. */
  async function registryCopies(dir: string, prefix = ""): Promise<string[]> {
    const found: string[] = [];
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      // Neither is authored: one is installed, the other is build output, and
      // both legitimately hold a copy of the file that ships.
      if (entry.name === "node_modules" || entry.name === "dist") continue;
      const rel = path.join(prefix, entry.name);
      if (entry.isDirectory())
        found.push(...(await registryCopies(path.join(dir, entry.name), rel)));
      else if (entry.name === "layoutAntiPatterns.json") found.push(rel);
    }
    return found.sort();
  }

  // A second copy is precisely what the resolver cannot report. It takes the
  // first candidate that exists, so a copy nearer the caller wins silently,
  // and this repository and an adopting project then enforce different rules.
  // Byte-equality between two copies only reports the divergence after
  // someone has already edited one of them.
  it("holds exactly one layoutAntiPatterns.json", async () => {
    expect(await registryCopies(packageRoot)).toEqual([
      path.join("assets", "validators", "layoutAntiPatterns.json"),
    ]);
  });

  // That one copy is under `assets/`, which `package.json#files` ships, so it
  // is the file an adopter runs against as well as the one this repository
  // reads. The depths below are the three places this module is loaded from.
  it.each([
    ["src/core/validators", path.join(packageRoot, "src", "core", "validators")],
    ["dist/cli", path.join(packageRoot, "dist", "cli")],
    ["dist", path.join(packageRoot, "dist")],
  ])("resolves to it from %s", (_entryPoint, baseDir) => {
    expect(layoutAntiPatternsCandidates(baseDir).find((c) => existsSync(c))).toBe(shipped);
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
