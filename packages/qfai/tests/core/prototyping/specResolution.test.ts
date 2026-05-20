/**
 * Tests for resolvePrimaryPrototypingSpec (v1.8.4) and
 * resolveAllUiBearingSpecs / checkSpecsCoveredDrift (spec-0012 CHG-002).
 *
 * Single-spec (legacy):
 *   1. config.prototyping.primarySpecId
 *   2. Marker scan (surface_type: ui-bearing or "prototyping" in title)
 *   3. undefined
 *
 * Multi-spec (current):
 *   - `resolveAllUiBearingSpecs` returns every UI-bearing spec via a
 *     `surface_type: ui-bearing` marker in `01_Spec.md` OR a matching
 *     `.qfai/contracts/ui/<spec-id>*.yaml` contract.
 *
 * Drift check:
 *   - `checkSpecsCoveredDrift` compares a caller-provided frozen
 *     snapshot against a caller-provided live snapshot; the FROZEN value
 *     is the baseline (mid-run filesystem mutation is ignored).
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { QfaiConfig } from "../../../src/core/config.js";
import {
  resolveAllUiBearingSpecs,
  resolvePrimaryPrototypingSpec,
} from "../../../src/core/prototyping/specResolution.js";
import { checkSpecsCoveredDrift } from "../../../src/core/prototyping/specsCovered.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-spec-res-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

function makeConfig(overrides: Partial<QfaiConfig["prototyping"]> = {}): QfaiConfig {
  return {
    paths: {
      contractsDir: ".qfai/contracts",
      specsDir: ".qfai/specs",
      discussionDir: ".qfai/discussion",
      outDir: ".qfai/out",
      skillsDir: ".qfai/assistant/skills",
      promptsDir: ".qfai/assistant/skills",
      srcDir: "src",
      testsDir: "tests",
    },
    validation: {
      failOn: "error",
      require: { specSections: [] },
      testStrategy: {
        requireLayerTags: false,
        requireSizeTags: false,
        maxE2eScenarioRatio: null,
        maxE2eScenarioCount: null,
        forbidTestTodoStubs: true,
      },
      traceability: {
        brMustHaveSc: true,
        scMustHaveTest: true,
        testFileGlobs: [],
        testFileExcludeGlobs: [],
        scNoTestSeverity: "error",
        orphanContractsPolicy: "error",
        unknownContractIdSeverity: "warning",
      },
    },
    output: { validateJsonPath: ".qfai/output/validate.json" },
    prototyping: { ...overrides },
  };
}

async function seedSpec(root: string, specNumber: string, body: string): Promise<void> {
  const specDir = path.join(root, ".qfai/specs", `spec-${specNumber}`);
  await mkdir(specDir, { recursive: true });
  await writeFile(path.join(specDir, "01_Spec.md"), body, "utf-8");
  // Also seed the second required layered file so collectSpecEntries
  // recognises it as a layered spec.
  await writeFile(path.join(specDir, "02_User-stories.md"), "# stories\n", "utf-8");
}

describe("resolvePrimaryPrototypingSpec", () => {
  it("returns undefined when no specs exist", async () => {
    const root = await newTempDir();
    await mkdir(path.join(root, ".qfai/specs"), { recursive: true });
    const result = await resolvePrimaryPrototypingSpec(root, makeConfig());
    expect(result).toBeUndefined();
  });

  it("uses config.prototyping.primarySpecId when explicit", async () => {
    const root = await newTempDir();
    await seedSpec(root, "0001", "# spec-0001\n\nNo prototyping.\n");
    await seedSpec(root, "0042", "# spec-0042\n\nAnother spec.\n");
    const result = await resolvePrimaryPrototypingSpec(root, makeConfig({ primarySpecId: "0042" }));
    expect(result).toEqual(
      expect.objectContaining({
        specId: "0042",
        source: "config",
      }),
    );
    expect(result?.specMdPath.endsWith(path.join("spec-0042", "01_Spec.md"))).toBe(true);
  });

  it("returns undefined when explicit primarySpecId references a missing spec", async () => {
    const root = await newTempDir();
    await seedSpec(root, "0001", "# spec-0001\n");
    const result = await resolvePrimaryPrototypingSpec(root, makeConfig({ primarySpecId: "9999" }));
    expect(result).toBeUndefined();
  });

  it("falls back to marker scan when no explicit override is set", async () => {
    const root = await newTempDir();
    await seedSpec(root, "0001", "# spec-0001\n\nNon-prototyping content.\n");
    await seedSpec(
      root,
      "0012",
      "---\nsurface_type: ui-bearing\n---\n\n# spec-0012\n\nPrototyping harness.\n",
    );
    const result = await resolvePrimaryPrototypingSpec(root, makeConfig());
    expect(result).toEqual(
      expect.objectContaining({
        specId: "0012",
        source: "marker-scan",
      }),
    );
  });

  it("matches title-based marker (heading containing 'prototyping')", async () => {
    const root = await newTempDir();
    await seedSpec(root, "0007", "# Prototyping Harness Spec\n\nBody.\n");
    const result = await resolvePrimaryPrototypingSpec(root, makeConfig());
    expect(result?.specId).toBe("0007");
    expect(result?.source).toBe("marker-scan");
  });

  it("picks the smallest spec ID among multiple marker matches", async () => {
    const root = await newTempDir();
    await seedSpec(root, "0099", "---\nsurface_type: ui-bearing\n---\n\n# spec-0099\n");
    await seedSpec(root, "0012", "---\nsurface_type: ui-bearing\n---\n\n# spec-0012\n");
    const result = await resolvePrimaryPrototypingSpec(root, makeConfig());
    expect(result?.specId).toBe("0012");
  });

  it("returns undefined when no spec has the marker", async () => {
    const root = await newTempDir();
    await seedSpec(root, "0001", "# spec-0001\n\nNo marker.\n");
    await seedSpec(root, "0002", "# spec-0002\n\nAlso no marker.\n");
    const result = await resolvePrimaryPrototypingSpec(root, makeConfig());
    expect(result).toBeUndefined();
  });
});

// -- resolveAllUiBearingSpecs ---------------------------------------------

async function seedUiContract(root: string, specNumber: string, filename?: string): Promise<void> {
  const uiDir = path.join(root, ".qfai/contracts/ui");
  await mkdir(uiDir, { recursive: true });
  const name = filename ?? `${specNumber}.yaml`;
  await writeFile(
    path.join(uiDir, name),
    `# QFAI-CONTRACT-ID: CON-UI-${specNumber}\nscreens: []\n`,
    "utf-8",
  );
}

describe("resolveAllUiBearingSpecs", () => {
  // TC-0012-0354 — basic: 3 UI-bearing + 2 non-UI fixture → 3 specs
  it("returns every UI-bearing spec in the consumer project in one call", async () => {
    const root = await newTempDir();
    // 3 UI-bearing: 0001 via marker, 0007 via contract fallback, 0012 via marker
    await seedSpec(root, "0001", "---\nsurface_type: ui-bearing\n---\n\n# spec-0001\n");
    await seedSpec(root, "0007", "# spec-0007\n\nNon-marker body.\n");
    await seedUiContract(root, "0007", "ui-0007-checkout.yaml");
    await seedSpec(root, "0012", "---\nsurface_type: ui-bearing\n---\n\n# spec-0012\n");
    // 2 non-UI: 0003 (no marker, no contract), 0009 (no marker, no contract)
    await seedSpec(root, "0003", "# spec-0003\n\nBackend-only spec.\n");
    await seedSpec(root, "0009", "# spec-0009\n\nAnother non-UI.\n");

    const result = await resolveAllUiBearingSpecs(root, makeConfig());
    expect(result).toEqual(["0001", "0007", "0012"]);
  });

  it("returns empty array when no UI-bearing specs exist", async () => {
    const root = await newTempDir();
    await seedSpec(root, "0001", "# spec-0001\n\nBackend.\n");
    await seedSpec(root, "0002", "# spec-0002\n\nAlso backend.\n");
    const result = await resolveAllUiBearingSpecs(root, makeConfig());
    expect(result).toEqual([]);
  });

  it("returns empty array when no specs directory exists", async () => {
    const root = await newTempDir();
    await mkdir(path.join(root, ".qfai/specs"), { recursive: true });
    const result = await resolveAllUiBearingSpecs(root, makeConfig());
    expect(result).toEqual([]);
  });

  it("accepts the contract fallback even when 01_Spec.md has no marker", async () => {
    const root = await newTempDir();
    await seedSpec(root, "0042", "# spec-0042\n\nNo marker.\n");
    await seedUiContract(root, "0042");
    const result = await resolveAllUiBearingSpecs(root, makeConfig());
    expect(result).toEqual(["0042"]);
  });

  // 23rd-wave Fix (codex r3270307469, P1 — chatgpt-codex-connector):
  // `hasMatchingUiContract` must detect the documented per-spec
  // subdirectory layout `.qfai/contracts/ui/spec-<specId>/<sub>.yaml`
  // (candidate #5 in `.qfai/contracts/ui/README.md`). Pre-fix the
  // helper only listed top-level basenames; a project that authored
  // its UI contracts as `.qfai/contracts/ui/spec-0007/home.yaml`
  // (without `surface_type: ui-bearing` on the spec) was silently
  // treated as non-UI-bearing and the iterate command no-op'd.
  //
  // QFAI:SPEC-0012:TC-0012-0423 — 25th-wave traceability stitch
  // (codex r3270527912 MAJOR) plus edge-case coverage from codex
  // r3270529771 MINOR (`.yml` single-l rejection). AC-Refs:
  // AC-0012-0037 (cycle-0 precheck input candidates) /
  // AC-0012-0049 (mid-run spec-set freeze).
  it("accepts the per-spec subdirectory contract fallback (spec-<id>/<sub>.yaml)", async () => {
    const root = await newTempDir();
    await seedSpec(root, "0007", "# spec-0007\n\nNo marker.\n");
    const subdir = path.join(root, ".qfai/contracts/ui/spec-0007");
    await mkdir(subdir, { recursive: true });
    await writeFile(
      path.join(subdir, "home.yaml"),
      "# QFAI-CONTRACT-ID: CON-UI-0007\nscreens: []\n",
      "utf-8",
    );
    const result = await resolveAllUiBearingSpecs(root, makeConfig());
    expect(result).toEqual(["0007"]);
  });

  it("recursively accepts a per-spec subdirectory contract nested in a child folder (1 level deep)", async () => {
    const root = await newTempDir();
    await seedSpec(root, "0007", "# spec-0007\n\nNo marker.\n");
    const nested = path.join(root, ".qfai/contracts/ui/spec-0007/screens");
    await mkdir(nested, { recursive: true });
    await writeFile(
      path.join(nested, "home.yaml"),
      "# QFAI-CONTRACT-ID: CON-UI-0007\nscreens: []\n",
      "utf-8",
    );
    const result = await resolveAllUiBearingSpecs(root, makeConfig());
    expect(result).toEqual(["0007"]);
  });

  // 27th-wave coverage gap fix (codex r3270624828 MINOR —
  // architecture-reviewer): the wave-23 helper is documented as
  // "recursively walks the spec subdirectory" (DFS, unbounded depth)
  // because the README candidate #5 layout (`<spec-id>/<subpath>.yaml`)
  // allows `<subpath>` to be a multi-component path. Pin the
  // unbounded-DFS contract with a 2-level-deep fixture so a future
  // "optimisation" to a single-level scan cannot land green.
  it("recursively accepts a per-spec subdirectory contract nested two levels deep", async () => {
    const root = await newTempDir();
    await seedSpec(root, "0007", "# spec-0007\n\nNo marker.\n");
    const nested = path.join(root, ".qfai/contracts/ui/spec-0007/screens/auth");
    await mkdir(nested, { recursive: true });
    await writeFile(
      path.join(nested, "login.yaml"),
      "# QFAI-CONTRACT-ID: CON-UI-0007\nscreens: []\n",
      "utf-8",
    );
    const result = await resolveAllUiBearingSpecs(root, makeConfig());
    expect(result).toEqual(["0007"]);
  });

  it("does NOT match a per-spec subdirectory that contains no .yaml files", async () => {
    const root = await newTempDir();
    await seedSpec(root, "0007", "# spec-0007\n\nNo marker.\n");
    const subdir = path.join(root, ".qfai/contracts/ui/spec-0007");
    await mkdir(subdir, { recursive: true });
    // Place a non-yaml file — must not count as a UI contract.
    await writeFile(path.join(subdir, "README.md"), "# placeholder\n", "utf-8");
    const result = await resolveAllUiBearingSpecs(root, makeConfig());
    expect(result).toEqual([]);
  });

  // 25th-wave coverage gap fix (codex r3270529771 MINOR): the subdir
  // branch's `.endsWith(".yaml")` check intentionally rejects `.yml`
  // (single-l) for parity with the top-level anchored regex which
  // only accepts `*.yaml`. Pin the boundary so a future refactor that
  // broadens the predicate to `.yml` is caught by CI.
  it("does NOT match a per-spec subdirectory whose only file uses the .yml (single-l) extension", async () => {
    const root = await newTempDir();
    await seedSpec(root, "0007", "# spec-0007\n\nNo marker.\n");
    const subdir = path.join(root, ".qfai/contracts/ui/spec-0007");
    await mkdir(subdir, { recursive: true });
    await writeFile(path.join(subdir, "home.yml"), "# CON-UI-0007\nscreens: []\n", "utf-8");
    const result = await resolveAllUiBearingSpecs(root, makeConfig());
    expect(result).toEqual([]);
  });

  // Codex r3264487007: regression — unrelated yaml basenames that
  // merely contain the four-digit spec id token must NOT be treated as
  // UI contracts. The fallback is anchored to bare `<id>.yaml`,
  // `spec-<id>.yaml`, `ui-<id>.yaml`, or `ui-<id>-<slug>.yaml`.
  //
  // 7th late-review wave (codex r3264965744 / r3264968391, LOW/MINOR):
  // extended to reject (a) bare-slug `<id>-<slug>.yaml` /
  // `spec-<id>-<slug>.yaml` shapes (NOT in the documented set) and
  // (b) empty-slug `ui-<id>-.yaml` (slug must be non-empty per the
  // tightened `(?:-[^.]+)?` slug arm).
  it("contract fallback rejects yaml basenames that merely contain the spec id token", async () => {
    const root = await newTempDir();
    await seedSpec(root, "0001", "# spec-0001\n\nNo marker.\n");
    // Distractor: a yaml whose name contains "0001" but does NOT match
    // any of the accepted anchored shapes.
    const uiDir = path.join(root, ".qfai/contracts/ui");
    await mkdir(uiDir, { recursive: true });
    await writeFile(path.join(uiDir, "unrelated-text-0001.yaml"), "screens: []\n", "utf-8");
    const result = await resolveAllUiBearingSpecs(root, makeConfig());
    expect(result).toEqual([]);
  });

  it("contract fallback rejects bare-slug and empty-slug shapes that drift from the documented 4 forms", async () => {
    // 7th late-review wave: each rejected shape lives in its own
    // fixture so a regression that re-widens any single arm is
    // distinguishable in the failure output.
    const rejectedShapes: Array<{ specId: string; filename: string }> = [
      // (a) Bare-slug (no `ui-` / `spec-` prefix) — not documented.
      { specId: "0007", filename: "0007-cart.yaml" },
      // (b) `spec-<id>-<slug>.yaml` — not documented (only `spec-<id>.yaml`).
      { specId: "0007", filename: "spec-0007-cart.yaml" },
      // (c) `ui-<id>-.yaml` — empty slug; `ui-<id>-<slug>` requires non-empty.
      { specId: "0004", filename: "ui-0004-.yaml" },
    ];
    for (const { specId, filename } of rejectedShapes) {
      const root = await newTempDir();
      await seedSpec(root, specId, `# spec-${specId}\n\nNo marker.\n`);
      await seedUiContract(root, specId, filename);
      const result = await resolveAllUiBearingSpecs(root, makeConfig());
      expect(result).toEqual([]);
    }
  });

  it("contract fallback accepts the documented anchored shapes", async () => {
    // Each shape lives in its own fixture so we can pin behaviour
    // individually rather than relying on lex-sort to identify hits.
    const shapes: Array<{ specId: string; filename: string }> = [
      { specId: "0001", filename: "0001.yaml" },
      { specId: "0002", filename: "spec-0002.yaml" },
      { specId: "0003", filename: "ui-0003.yaml" },
      { specId: "0004", filename: "ui-0004-checkout.yaml" },
    ];
    for (const { specId, filename } of shapes) {
      const root = await newTempDir();
      await seedSpec(root, specId, `# spec-${specId}\n\nNo marker.\n`);
      await seedUiContract(root, specId, filename);
      const result = await resolveAllUiBearingSpecs(root, makeConfig());
      expect(result).toEqual([specId]);
    }
  });

  it("sorts the returned spec IDs lexicographically", async () => {
    const root = await newTempDir();
    await seedSpec(root, "0099", "---\nsurface_type: ui-bearing\n---\n\n# spec-0099\n");
    await seedSpec(root, "0007", "---\nsurface_type: ui-bearing\n---\n\n# spec-0007\n");
    await seedSpec(root, "0011", "---\nsurface_type: ui-bearing\n---\n\n# spec-0011\n");
    const result = await resolveAllUiBearingSpecs(root, makeConfig());
    expect(result).toEqual(["0007", "0011", "0099"]);
  });

  it("deduplicates when both the marker and the contract are present", async () => {
    const root = await newTempDir();
    await seedSpec(root, "0005", "---\nsurface_type: ui-bearing\n---\n\n# spec-0005\n");
    await seedUiContract(root, "0005");
    const result = await resolveAllUiBearingSpecs(root, makeConfig());
    expect(result).toEqual(["0005"]);
  });

  // TC-0012-0391 — property: set equality over arbitrary fixtures
  it("property: for every fixture, result ≡ project.specs.filter(s => s.ui_bearing === true)", async () => {
    type FixtureSpec = { specNumber: string; ui_bearing: boolean; via: "marker" | "contract" };
    const fixtures: FixtureSpec[][] = [
      [
        { specNumber: "0001", ui_bearing: true, via: "marker" },
        { specNumber: "0002", ui_bearing: false, via: "marker" },
        { specNumber: "0003", ui_bearing: true, via: "contract" },
      ],
      [
        { specNumber: "0010", ui_bearing: false, via: "marker" },
        { specNumber: "0011", ui_bearing: false, via: "marker" },
      ],
      [
        { specNumber: "0050", ui_bearing: true, via: "marker" },
        { specNumber: "0060", ui_bearing: true, via: "contract" },
        { specNumber: "0070", ui_bearing: true, via: "marker" },
        { specNumber: "0080", ui_bearing: false, via: "marker" },
      ],
      [],
    ];

    for (const fixture of fixtures) {
      const root = await newTempDir();
      await mkdir(path.join(root, ".qfai/specs"), { recursive: true });
      for (const spec of fixture) {
        if (spec.ui_bearing && spec.via === "marker") {
          await seedSpec(
            root,
            spec.specNumber,
            `---\nsurface_type: ui-bearing\n---\n\n# spec-${spec.specNumber}\n`,
          );
        } else {
          await seedSpec(root, spec.specNumber, `# spec-${spec.specNumber}\n\nBody.\n`);
        }
        if (spec.ui_bearing && spec.via === "contract") {
          await seedUiContract(root, spec.specNumber);
        }
      }

      const expected = fixture
        .filter((s) => s.ui_bearing === true)
        .map((s) => s.specNumber)
        .sort((a, b) => a.localeCompare(b));
      const actual = await resolveAllUiBearingSpecs(root, makeConfig());

      // Order-insensitive set equality (helper already sorts, but the
      // property is stated in set terms).
      expect([...actual].sort((a, b) => a.localeCompare(b))).toEqual(expected);
      expect(new Set(actual)).toEqual(new Set(expected));
    }
  });

  // codex r3271969283 (P2, 50th-wave): `hasMatchingUiContract` (via
  // `resolveAllUiBearingSpecs`) previously used `access(direct)` to
  // confirm the bare `<specId>.yaml` direct-match candidate. `access`
  // does NOT distinguish file from directory — a misauthored project
  // that created `<contractsDir>/ui/0007.yaml/` (a directory) would
  // have falsely classified spec-0007 as UI-bearing, driving the
  // iterate / drift gates against a phantom UI surface instead of
  // taking the documented no-op path. Post-fix the direct-match arm
  // uses `stat().isFile()`, consistent with the entries-walk
  // branch's `entry.isFile()` filter for the spec-prefixed /
  // ui-prefixed candidates. This regression pins the discipline so
  // a future `access`-style shortcut cannot regress green.
  it("does NOT classify a spec as UI-bearing when the direct-match candidate `<id>.yaml` exists but is a directory (codex r3271969283)", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-uicontract-dir-"));
    try {
      // Author a UI-only spec (no surface_type marker, no title
      // marker, no primarySpecId pin) — its only possible UI-bearing
      // signal is `hasMatchingUiContract`.
      await mkdir(path.join(root, ".qfai/specs/spec-0007"), { recursive: true });
      await writeFile(
        path.join(root, ".qfai/specs/spec-0007/01_Spec.md"),
        "# spec-0007 — no surface marker\n",
        "utf-8",
      );
      // Create a DIRECTORY named like a UI contract file. Pre-fix
      // `access()` would have returned true and the spec would
      // appear in the union.
      await mkdir(path.join(root, ".qfai/contracts/ui/0007.yaml"), { recursive: true });

      const config = makeConfig();
      const result = await resolveAllUiBearingSpecs(root, config);
      expect(result).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

// -- checkSpecsCoveredDrift ------------------------------------------------

describe("checkSpecsCoveredDrift", () => {
  it("returns drifted=false when frozen and live sets match", () => {
    const result = checkSpecsCoveredDrift(["0001", "0007"], ["0007", "0001"]);
    expect(result).toEqual({ drifted: false, added: [], removed: [] });
  });

  it("flags additions present in live but missing from frozen", () => {
    const result = checkSpecsCoveredDrift(["0001"], ["0001", "0007", "0012"]);
    expect(result).toEqual({ drifted: true, added: ["0007", "0012"], removed: [] });
  });

  it("flags removals present in frozen but missing from live", () => {
    const result = checkSpecsCoveredDrift(["0001", "0007", "0012"], ["0007"]);
    expect(result).toEqual({ drifted: true, added: [], removed: ["0001", "0012"] });
  });

  it("flags both additions and removals", () => {
    const result = checkSpecsCoveredDrift(["0001", "0007"], ["0007", "0042"]);
    expect(result).toEqual({ drifted: true, added: ["0042"], removed: ["0001"] });
  });

  // TC-0012-0386 — drift check reads frozen set, not live filesystem.
  // The fixture mutates the live filesystem mid-test; the drift comparison
  // must still reflect only the values passed in at call time.
  it("reads the cycle-0 frozen set even when the live filesystem mutates mid-test", async () => {
    const root = await newTempDir();
    // Seed two UI-bearing specs and freeze their IDs.
    await seedSpec(root, "0001", "---\nsurface_type: ui-bearing\n---\n\n# spec-0001\n");
    await seedSpec(root, "0007", "---\nsurface_type: ui-bearing\n---\n\n# spec-0007\n");
    const frozen = await resolveAllUiBearingSpecs(root, makeConfig());
    expect(frozen).toEqual(["0001", "0007"]);

    // Mid-test mutation: add a third UI-bearing spec to the live tree.
    await seedSpec(root, "0042", "---\nsurface_type: ui-bearing\n---\n\n# spec-0042\n");
    // A subsequent live read sees the mutation.
    const live = await resolveAllUiBearingSpecs(root, makeConfig());
    expect(live).toEqual(["0001", "0007", "0042"]);

    // The drift check compares against the FROZEN value (captured before
    // the mutation), proving the helper does not re-derive a baseline
    // from disk.
    const driftAgainstFrozen = checkSpecsCoveredDrift(frozen, live);
    expect(driftAgainstFrozen).toEqual({
      drifted: true,
      added: ["0042"],
      removed: [],
    });

    // Sanity: if the caller mistakenly passed `live` as both sides,
    // the drift would vanish — proving frozen is the load-bearing input.
    const driftAgainstLive = checkSpecsCoveredDrift(live, live);
    expect(driftAgainstLive.drifted).toBe(false);
  });
});
