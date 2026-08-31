/**
 * Integration: shipped GitHub Actions workflow-set topology.
 *
 * Covers the naming and topology half of the shipped-workflows contract
 * (`.qfai/contracts/cli/shipped-workflows.md`, CLI-WFSET §1, §5 dimension 9,
 * §8): the shipped `.github/` tree allows only `workflows/` as an immediate
 * child, every shipped filename matches the reserved `^qfai-[a-z0-9-]+\.yml$`
 * pattern, the set consists of two or more files, no shipped file references
 * another shipped file, and layer separation is expressed as jobs (or matrix
 * legs) inside the orchestrator file — never as one file per layer.
 *
 * This file grows row by row; each describe block is one ledger row.
 */
import { cp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import {
  isRecord,
  loadShippedWorkflows,
  shippedGithubDir,
  shippedWorkflowsDir,
  useTempDirPool,
} from "../helpers/shippedWorkflowFixtures.js";

// tests/integration/<this file> -> tests -> packages/qfai -> packages -> repo root
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const repoRoot = path.resolve(packageRoot, "..", "..");

/**
 * The adopter-facing test layers the orchestrator must separate as jobs or
 * matrix legs (spec REQ-0026's closed layer-name list). Value SSOT lives in
 * the test suite per the structural-shape philosophy (CLI-WFSET §5).
 */
const LAYER_NAMES: readonly string[] = ["unit", "component", "integration", "api", "e2e"];

const newTempDir = useTempDirPool("qfai-wftopo-");

/**
 * Collects the layer names a parsed workflow document declares, either as a
 * job id equal to the layer name or as a string matrix-leg value equal to
 * it. Returns an empty array for non-workflow-shaped documents so the
 * caller's assertion is what fails, not a crash here.
 */
function collectDeclaredLayers(doc: unknown): string[] {
  if (!isRecord(doc)) {
    return [];
  }
  const jobs = doc["jobs"];
  if (!isRecord(jobs)) {
    return [];
  }
  const declared = new Set<string>();
  for (const [jobId, job] of Object.entries(jobs)) {
    if (LAYER_NAMES.includes(jobId)) {
      declared.add(jobId);
    }
    if (!isRecord(job)) {
      continue;
    }
    const strategy = job["strategy"];
    if (!isRecord(strategy)) {
      continue;
    }
    const matrix = strategy["matrix"];
    if (!isRecord(matrix)) {
      continue;
    }
    for (const legValues of Object.values(matrix)) {
      if (!Array.isArray(legValues)) {
        continue;
      }
      for (const leg of legValues) {
        if (typeof leg === "string" && LAYER_NAMES.includes(leg)) {
          declared.add(leg);
        }
      }
    }
  }
  return [...declared];
}

describe("TC-0003-0035 (TDD-0035): zero cross-file references; layer separation is jobs inside the orchestrator", () => {
  it("no shipped file references another shipped file, including the uses: ./.github/workflows/ form", async () => {
    const files = await loadShippedWorkflows();
    const names = files.map(([name]) => name);
    const violations: string[] = [];
    for (const [name, body] of files) {
      // A mention of another shipped filename ANYWHERE in the body is the
      // violation (an absent target turns the referencing workflow into a
      // parse error with no repair path under create-only install), and the
      // local reusable-workflow path form is caught even before a second
      // file exists.
      for (const other of names) {
        if (other !== name && body.includes(other)) {
          violations.push(`${name} references sibling shipped file ${other}`);
        }
      }
      if (body.includes("./.github/workflows/")) {
        violations.push(`${name} contains a local workflow reference (./.github/workflows/ form)`);
      }
    }
    expect(violations).toEqual([]);
  });

  it("the shipped set consists of two or more workflow files", async () => {
    const names = (await readdir(shippedWorkflowsDir())).sort();
    expect(
      names.length,
      `the shipped workflow set must have two or more files, got: ${names.join(", ") || "(empty)"}`,
    ).toBeGreaterThanOrEqual(2);
  });

  it("exactly one shipped file is the orchestrator and it declares one job or matrix leg per layer", async () => {
    // Every shipped file must parse independently; layer lanes must all sit
    // inside ONE file (jobs / matrix legs), so layer separation is provably
    // not one-file-per-layer.
    const layerDeclarationsByFile = new Map<string, string[]>();
    for (const [name, body] of await loadShippedWorkflows()) {
      const declared = collectDeclaredLayers(parse(body));
      if (declared.length > 0) {
        layerDeclarationsByFile.set(name, declared);
      }
    }

    const orchestrators = [...layerDeclarationsByFile.keys()];
    expect(
      orchestrators.length,
      `exactly one shipped file must declare layer lanes; declaring files: ${
        orchestrators.join(", ") || "(none)"
      }`,
    ).toBe(1);

    const declared = layerDeclarationsByFile.get(orchestrators[0] ?? "") ?? [];
    expect([...declared].sort(), "the orchestrator must declare every layer exactly").toEqual(
      [...LAYER_NAMES].sort(),
    );
  });
});

describe("TC-0003-0034 (TDD-0034): planted actions directory and non-prefixed filename are both rejected", () => {
  // Recorded deviation (delivery-planner ruling for this row): the TC's
  // literal Action — running `pnpm verify:pack` against a planted and a
  // clean tree — is unrealizable inside the suite, because verify-pack
  // hardcodes the repository root (it packs THIS repo's tarball) and
  // triggers a full `npm pack` + sandbox install per run. The adopted
  // shape is (a) the same topology predicate implemented here and run
  // over planted TEMP COPIES of the shipped `.github/` tree (never the
  // real assets), and (b) a static backstop pinning that
  // `scripts/verify-pack.mjs` still carries its `allowedRootGithubEntries`
  // allow-list and throw path, so the pack-time rejection the TC names
  // remains wired.
  const SHIPPED_FILENAME_RE = /^qfai-[a-z0-9-]+\.yml$/;

  type TopologyViolation = { entry: string; rule: string };

  /**
   * The topology predicate under test: the `.github` tree is accepted iff
   * `workflows` is its only immediate child and every workflows entry is a
   * regular file matching the reserved filename pattern. Returns the
   * violation list (empty = accepted), naming each offending entry.
   */
  async function scanShippedGithubTopology(githubDir: string): Promise<TopologyViolation[]> {
    const violations: TopologyViolation[] = [];
    const children = await readdir(githubDir, { withFileTypes: true });
    for (const child of [...children].sort((a, b) => a.name.localeCompare(b.name))) {
      if (child.name !== "workflows") {
        violations.push({
          entry: `.github/${child.name}`,
          rule: "only workflows/ is permitted as an immediate child of the shipped .github/",
        });
      }
    }
    const workflowEntries = await readdir(path.join(githubDir, "workflows"), {
      withFileTypes: true,
    });
    for (const entry of [...workflowEntries].sort((a, b) => a.name.localeCompare(b.name))) {
      if (!entry.isFile() || !SHIPPED_FILENAME_RE.test(entry.name)) {
        violations.push({
          entry: `.github/workflows/${entry.name}`,
          rule: "every shipped workflows entry must be a regular file matching ^qfai-[a-z0-9-]+\\.yml$",
        });
      }
    }
    return violations;
  }

  /** Copies the REAL shipped `.github/` tree into a fresh temp dir. */
  async function copyShippedGithubToTemp(): Promise<string> {
    const dir = await newTempDir();
    const dest = path.join(dir, ".github");
    await cp(shippedGithubDir(), dest, { recursive: true });
    return dest;
  }

  it("a planted actions/ directory is rejected by the .github child allow-list", async () => {
    const githubCopy = await copyShippedGithubToTemp();
    await mkdir(path.join(githubCopy, "actions", "probe"), { recursive: true });
    await writeFile(
      path.join(githubCopy, "actions", "probe", "action.yml"),
      "name: probe\nruns:\n  using: composite\n  steps: []\n",
      "utf-8",
    );

    const violations = await scanShippedGithubTopology(githubCopy);
    expect(violations.map((violation) => violation.entry)).toContain(".github/actions");
  });

  it("a planted non-prefixed ci.yml is rejected by the reserved filename pattern", async () => {
    const githubCopy = await copyShippedGithubToTemp();
    await writeFile(
      path.join(githubCopy, "workflows", "ci.yml"),
      "name: ci\non: push\njobs: {}\n",
      "utf-8",
    );

    const violations = await scanShippedGithubTopology(githubCopy);
    const entries = violations.map((violation) => violation.entry);
    expect(entries).toContain(".github/workflows/ci.yml");
    // The rejection is the filename pattern, not collateral: the shipped
    // names themselves are untouched by the plant.
    expect(entries.filter((entry) => entry !== ".github/workflows/ci.yml")).toEqual([]);
  });

  it("with the plants reverted the whole shipped set passes: clean copy and real asset tree both scan clean", async () => {
    const cleanCopy = await copyShippedGithubToTemp();
    await expect(scanShippedGithubTopology(cleanCopy)).resolves.toEqual([]);
    // The real packaged tree is the shipped set the TC's "planted を戻すと
    // exit 0" bullet speaks about.
    await expect(scanShippedGithubTopology(shippedGithubDir())).resolves.toEqual([]);
  });

  it("static backstop: scripts/verify-pack.mjs retains the allowedRootGithubEntries allow-list and its throw path", async () => {
    const verifyPackSource = await readFile(path.join(repoRoot, "scripts", "verify-pack.mjs"), {
      encoding: "utf-8",
    });
    // The pack-time half of the TC: an `actions/` directory stays a hard
    // pack failure because the immediate children of the shipped .github/
    // are allow-listed to exactly `workflows` and any other entry throws.
    expect(verifyPackSource).toContain('const allowedRootGithubEntries = new Set(["workflows"]);');
    expect(verifyPackSource).toContain("must not exist (only workflows/ is permitted)");
    expect(verifyPackSource).toContain("if (!allowedRootGithubEntries.has(entry))");
  });
});
