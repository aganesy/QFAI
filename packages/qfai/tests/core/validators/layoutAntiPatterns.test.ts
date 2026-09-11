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

const EXPECTED_IDS = ["lap-007-state-not-represented", "lap-008-no-back-affordance"] as const;

describe("loadLayoutAntiPatterns", () => {
  it("TC-3.3.1: reads every entry from layoutAntiPatterns.json", () => {
    const patterns = loadLayoutAntiPatterns();
    expect(patterns).toHaveLength(EXPECTED_IDS.length);
  });

  it("TC-3.3.2: missing JSON file → loader throws (caller swallows)", async () => {
    const dir = await newTempDir();
    expect(() => loadLayoutAntiPatterns(path.join(dir, "no-such.json"))).toThrow();
  });

  it("TC-3.3.3: each declared id is present", () => {
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

  // A detection blocks convergence, so reporting a shape rather than a
  // defect stops an ordinary product finishing the loop. These five are the
  // layouts that work.
  it.each<[string, string]>([
    ["a dashboard", "<aside>nav</aside><main><div>Total KPI is 4.5</div></main>"],
    ["a card grid beside an aside", '<div class="grid"><aside>nav</aside></div>'],
    ["tabs over a table", '<div role="tab">a</div><table><tr><td>x</td></tr></table>'],
    ["a bento grid", '<div class="grid-cols-12 grid-rows-3">x</div>'],
    ["a centred hero", '<section class="text-center"><h1>x</h1></section>'],
  ])("TC-3.3.5: %s is not reported", (_name, html) => {
    expect(findLayoutAntiPatterns(html, patterns)).toEqual([]);
  });

  // Every entry is reviewer-judged today, so the static pass reports nothing
  // whatever it is handed. A layout-scope entry would be matched here.
  it("TC-3.3.6: the static pass reports nothing while no entry is layout-scoped", () => {
    const crowded = `<aside>${Array.from({ length: 12 }, (_, i) => `<a href="#${i}">l${i}</a>`).join("")}</aside>`;
    expect(patterns.some((entry) => entry.scope === "layout")).toBe(false);
    expect(findLayoutAntiPatterns(crowded, patterns)).toEqual([]);
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

  it("TC-3.3.8: multiple ids are returned for HTML matching several", () => {
    // Against a synthetic pair, so the property holds however many entries
    // the registry carries.
    const pair = [
      { id: "first", regex: "<aside", scope: "layout" },
      { id: "second", regex: "<table", scope: "layout" },
    ] as const;
    const html = "<aside>nav</aside><table><tr><td>x</td></tr></table>";
    expect(findLayoutAntiPatterns(html, [...pair])).toEqual(["first", "second"]);
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
  // An entry with no authority behind it cannot be argued with, only obeyed,
  // which is how the registry filled up with shapes somebody disliked.
  it("drops an entry that names nothing making it a defect", async () => {
    const dir = await newTempDir();
    const file = path.join(dir, "patterns.json");
    await writeFile(
      file,
      JSON.stringify([
        { id: "lap-sourced", regex: ".*", scope: "layout", source: "a published heuristic" },
        { id: "lap-unsourced", regex: ".*", scope: "layout" },
        { id: "lap-blank", regex: ".*", scope: "layout", source: "   " },
      ]),
      "utf-8",
    );
    expect(loadLayoutAntiPatterns(file).map((entry) => entry.id)).toEqual(["lap-sourced"]);
  });

  it("carries the source through to the caller", () => {
    for (const entry of loadLayoutAntiPatterns()) {
      expect(entry.source.trim().length).toBeGreaterThan(0);
    }
  });

  it("rejects rules with unknown scope at load time", async () => {
    const dir = await newTempDir();
    const file = path.join(dir, "patterns.json");
    const malformed: Array<{ id: string; regex: string; scope: string; source: string }> = [
      { id: "lap-X", regex: ".*", scope: "bogus", source: "a published heuristic" },
    ];
    await writeFile(file, JSON.stringify(malformed), "utf-8");
    const out: LayoutAntiPattern[] = loadLayoutAntiPatterns(file);
    expect(out).toHaveLength(0);
  });
});
