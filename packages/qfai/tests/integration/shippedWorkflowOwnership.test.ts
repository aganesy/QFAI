/**
 * Integration: shipped GitHub Actions workflow-set ownership.
 *
 * Covers the ownership boundary `qfai init` holds over an adopter's
 * `.github/workflows/` directory (contract:
 * `.qfai/contracts/cli/shipped-workflows.md`, CLI-WFSET). The reserved
 * `qfai-` filename prefix is a reservation notice, not a selector: writes
 * come from the shipped-name list and removals from the retired-name list,
 * never from globbing `qfai-*` on the adopter's disk.
 *
 * This file grows row by row; each describe block is one ledger row.
 */
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import * as initModule from "../../src/cli/commands/init.js";
import {
  readInstallProvenance,
  resolveWorkflowFileState,
} from "../../src/cli/lib/provenance.js";
import { QFAI_GITIGNORE_BLOCK } from "../../src/core/gitignore.js";
import { getInitAssetsDir } from "../../src/shared/assets.js";
import { captureStdout } from "../helpers/stdout.js";

// tests/integration/<this file> -> tests -> packages/qfai
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const INIT_MODULE_PATH = path.join(packageRoot, "src", "cli", "commands", "init.ts");

const readInitSource = (): Promise<string> => readFile(INIT_MODULE_PATH, "utf-8");

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-wfown-"));
  tempDirs.push(dir);
  return dir;
}

async function runInitQuiet(dir: string): Promise<void> {
  await captureStdout(() => initModule.runInit({ dir, force: false, dryRun: false, yes: true }));
}

const sha256 = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");

/**
 * Reads a module export expected to be a set of strings. A missing or
 * mis-typed export returns `undefined` instead of crashing module load or
 * the test body, so the caller's assertion is what fails.
 */
function readStringSetExport(name: string): ReadonlySet<string> | undefined {
  const value: unknown = Reflect.get(initModule, name);
  if (!(value instanceof Set)) {
    return undefined;
  }
  const members = [...value].filter((member): member is string => typeof member === "string");
  if (members.length !== value.size) {
    return undefined;
  }
  return new Set(members);
}

function requireStringSetExport(name: string): ReadonlySet<string> {
  const set = readStringSetExport(name);
  expect(set, `init module must export ${name} as a set of workflow file names`).toBeDefined();
  if (set === undefined) {
    // Unreachable: the expect above throws first. Present for control-flow
    // narrowing so callers get a non-optional set.
    throw new Error(`${name} is not exported as a string set`);
  }
  return set;
}

const PRUNE_CALLEE = "pruneMatchingEntries(";

/**
 * Extract the argument text of every `pruneMatchingEntries(...)` CALL site in
 * the given source. The `function pruneMatchingEntries(` definition itself is
 * excluded. Arguments are captured up to the balancing close paren by paren
 * counting; parens inside string literals are not special-cased, which is
 * acceptable because the call sites under test pass path segments and
 * predicates whose string literals contain no parentheses.
 */
function extractPruneCallSites(source: string): string[] {
  const sites: string[] = [];
  let from = 0;
  for (;;) {
    const idx = source.indexOf(PRUNE_CALLEE, from);
    if (idx === -1) {
      break;
    }
    const argStart = idx + PRUNE_CALLEE.length;
    from = argStart;
    const preceding = source.slice(Math.max(0, idx - "function ".length), idx);
    if (preceding === "function ") {
      // The definition, not a call.
      continue;
    }
    let depth = 1;
    let end = argStart;
    while (end < source.length && depth > 0) {
      const ch = source.charAt(end);
      if (ch === "(") {
        depth += 1;
      } else if (ch === ")") {
        depth -= 1;
      }
      end += 1;
    }
    sites.push(source.slice(argStart, end - 1));
  }
  return sites;
}

describe("TC-0003-0052 (TDD-0052): pruneMatchingEntries is exported and receives a retired-name predicate", () => {
  it("exports pruneMatchingEntries as a function (module-private would force a parallel re-implementation)", () => {
    // Membership is asserted via the namespace object so a missing export
    // fails THIS assertion instead of crashing module load.
    const exportNames = Object.keys(initModule);
    expect(exportNames).toContain("pruneMatchingEntries");

    const pruneExport: unknown = Reflect.get(initModule, "pruneMatchingEntries");
    expect(typeof pruneExport).toBe("function");
  });

  it("the workflows-directory prune call site uses RETIRED_WORKFLOW_NAMES membership, not a qfai- prefix glob", async () => {
    const source = await readInitSource();
    const callSites = extractPruneCallSites(source);
    const workflowsSites = callSites.filter((site) => site.includes("workflows"));

    // The reserved prefix is a reservation notice, never a deletion selector:
    // a `startsWith("qfai-")` predicate over the adopter-authored workflows
    // directory is forbidden (it would delete adopter-owned qfai-named files).
    const prefixGlobSites = workflowsSites.filter((site) => site.includes('startsWith("qfai-")'));
    expect(
      prefixGlobSites,
      "no workflows-directory pruneMatchingEntries call site may use a startsWith(\"qfai-\") prefix-glob predicate",
    ).toEqual([]);

    // The predicate must be name-set membership over the retired-name list.
    const membershipSites = workflowsSites.filter((site) =>
      site.includes("RETIRED_WORKFLOW_NAMES"),
    );
    expect(
      membershipSites.length,
      "expected a pruneMatchingEntries call site targeting the workflows directory whose predicate tests RETIRED_WORKFLOW_NAMES membership",
    ).toBeGreaterThanOrEqual(1);
  });

  it("no parallel removal helper: one pruneMatchingEntries definition and no second removal-flavoured export", async () => {
    const source = await readInitSource();

    // Exactly one definition of the removal primitive.
    const definitionCount = source.split(`function ${PRUNE_CALLEE}`).length - 1;
    expect(
      definitionCount,
      "init.ts must define pruneMatchingEntries exactly once",
    ).toBe(1);

    // The exported removal surface is exactly the one primitive: exporting a
    // second removal helper would be the parallel implementation the contract
    // forbids ("to be exported, not re-implemented").
    const removalExports = Object.keys(initModule)
      .filter((name) => /prune|remove|delete|unlink/i.test(name))
      .sort();
    expect(removalExports).toEqual(["pruneMatchingEntries"]);
  });
});

describe(
  "TC-0003-0045 (TDD-0045): write and prune sets equal the shipped and retired name lists, not a glob",
  { timeout: 60000 },
  () => {
    // A qfai-prefixed name deliberately in NEITHER list: the falsifying
    // oracle for any prefix-glob-driven write or prune. The reserved prefix
    // is a reservation notice, not a selector, so this adopter-authored file
    // must never be claimed.
    const ORPHAN_NAME = "qfai-orphan.yml";
    const ORPHAN_BODY =
      "# adopter-authored workflow that happens to use the reserved prefix\nname: orphan\n";

    it("the workflows write set equals SHIPPED_WORKFLOW_NAMES", async () => {
      const shipped = requireStringSetExport("SHIPPED_WORKFLOW_NAMES");

      const dir = await newTempDir();
      await runInitQuiet(dir);

      // On a fresh adopter tree every written workflow file is QFAI's, so
      // the directory listing IS the write set: it must equal the name list
      // exactly — nothing beyond the list, nothing from the list missing.
      const written = (await readdir(path.join(dir, ".github", "workflows"))).sort();
      expect(written).toEqual([...shipped].sort());
    });

    it("the workflows prune set equals RETIRED_WORKFLOW_NAMES (never computed from the adopter's disk)", async () => {
      const retired = requireStringSetExport("RETIRED_WORKFLOW_NAMES");

      const dir = await newTempDir();
      const workflowsDir = path.join(dir, ".github", "workflows");
      await mkdir(workflowsDir, { recursive: true });
      await writeFile(path.join(workflowsDir, ORPHAN_NAME), ORPHAN_BODY, "utf-8");
      const before = await readdir(workflowsDir);

      await runInitQuiet(dir);
      const after = new Set(await readdir(workflowsDir));

      // The selector for removal is the retired-name list and nothing else:
      // no observed removal may fall outside RETIRED_WORKFLOW_NAMES. (Whether
      // a retired NAME with no provenance entry is actually removed is the
      // provenance state machine's obligation — a later row — so this oracle
      // deliberately pins only the subset direction.)
      const pruned = before.filter((name) => !after.has(name));
      const prunedOutsideRetired = pruned.filter((name) => !retired.has(name)).sort();
      expect(prunedOutsideRetired).toEqual([]);
    });

    it("a qfai-prefixed orphan in neither list survives byte-identical", async () => {
      const dir = await newTempDir();
      const workflowsDir = path.join(dir, ".github", "workflows");
      await mkdir(workflowsDir, { recursive: true });
      const orphanPath = path.join(workflowsDir, ORPHAN_NAME);
      await writeFile(orphanPath, ORPHAN_BODY, "utf-8");
      const digestBefore = sha256(await readFile(orphanPath));

      await runInitQuiet(dir);

      const bytesAfter = await readFile(orphanPath).catch(() => undefined);
      expect(bytesAfter, `${ORPHAN_NAME} must still exist after runInit (not pruned)`).toBeDefined();
      if (bytesAfter === undefined) {
        throw new Error(`${ORPHAN_NAME} was removed by runInit`);
      }
      expect(sha256(bytesAfter)).toBe(digestBefore);

      // Name-list membership: the orphan belongs to neither set, so neither
      // the write path nor the prune path may claim it. (The source-level
      // shape of the workflows prune predicate is owned by TC-0003-0052
      // above and is not re-asserted here.)
      const shipped = requireStringSetExport("SHIPPED_WORKFLOW_NAMES");
      const retired = requireStringSetExport("RETIRED_WORKFLOW_NAMES");
      expect(shipped.has(ORPHAN_NAME)).toBe(false);
      expect(retired.has(ORPHAN_NAME)).toBe(false);
    });
  },
);

describe(
  "TC-0003-0046 (TDD-0046): adopter-authored name collision is left byte-identical across four record states",
  { timeout: 60000 },
  () => {
    // The shipped name itself: an adopter who authored a file under this
    // name BEFORE installing QFAI must keep it untouched forever.
    const COLLISION_NAME = "qfai-validate.yml";
    const ADOPTER_BODY =
      "# adopter-authored workflow that predates the QFAI install\nname: adopter-collision\n";
    // Contract-fixed record path in the adopter tree.
    const PROVENANCE_REL = ".qfai/install-provenance.json";
    // A shipped-name entry that is NOT the collision name, for state (d).
    const OTHER_NAME = "qfai-some-other.yml";

    type RecordState = "absent" | "no-workflows-key" | "malformed" | "valid-without-name";
    const ALL_RECORD_STATES: readonly RecordState[] = [
      "absent",
      "no-workflows-key",
      "malformed",
      "valid-without-name",
    ];

    async function seedProvenanceState(dir: string, state: RecordState): Promise<void> {
      if (state === "absent") {
        return;
      }
      const provenancePath = path.join(dir, PROVENANCE_REL);
      await mkdir(path.dirname(provenancePath), { recursive: true });
      if (state === "no-workflows-key") {
        await writeFile(provenancePath, JSON.stringify({ somethingElse: {} }), "utf-8");
        return;
      }
      if (state === "malformed") {
        await writeFile(provenancePath, "{ this is not json", "utf-8");
        return;
      }
      await writeFile(
        provenancePath,
        JSON.stringify({
          workflows: {
            [OTHER_NAME]: {
              sha256: "0".repeat(64),
              installedByVersion: "0.0.0",
              installedAt: "2020-01-01T00:00:00Z",
            },
          },
        }),
        "utf-8",
      );
    }

    async function plantCollision(dir: string): Promise<string> {
      const workflowsDir = path.join(dir, ".github", "workflows");
      await mkdir(workflowsDir, { recursive: true });
      const collisionPath = path.join(workflowsDir, COLLISION_NAME);
      await writeFile(collisionPath, ADOPTER_BODY, "utf-8");
      return collisionPath;
    }

    it("the collision file survives runInit byte-identical in all four record states (no overwrite, no prune)", async () => {
      for (const state of ALL_RECORD_STATES) {
        const dir = await newTempDir();
        const collisionPath = await plantCollision(dir);
        await seedProvenanceState(dir, state);
        const digestBefore = sha256(await readFile(collisionPath));

        await runInitQuiet(dir);

        const bytesAfter = await readFile(collisionPath).catch(() => undefined);
        expect(
          bytesAfter,
          `[record ${state}] ${COLLISION_NAME} must survive runInit (not pruned)`,
        ).toBeDefined();
        if (bytesAfter === undefined) {
          throw new Error(`[record ${state}] collision file was removed by runInit`);
        }
        expect(sha256(bytesAfter), `[record ${state}] byte identity`).toBe(digestBefore);
      }
    });

    it("the reader treats an absent file, a missing workflows key, and malformed JSON as empty without throwing", async () => {
      for (const state of ["absent", "no-workflows-key", "malformed"] as const) {
        const dir = await newTempDir();
        await seedProvenanceState(dir, state);
        // Fail-safe direction: an unreadable record means every file on
        // disk is adopter-owned, so QFAI leaves everything alone. A throw
        // here would fail this resolves-assertion, not crash the test.
        await expect(
          readInstallProvenance(dir),
          `[record ${state}] reader must resolve to an empty record`,
        ).resolves.toEqual({ workflows: {} });
      }
    });

    it("a valid record without the name classifies the collision as adopter-owned", async () => {
      const dir = await newTempDir();
      const collisionPath = await plantCollision(dir);
      await seedProvenanceState(dir, "valid-without-name");

      const record = await readInstallProvenance(dir);
      // The reader must surface a valid record as-is: the other name's
      // entry is visible and the collision name has none.
      expect(Object.keys(record.workflows)).toEqual([OTHER_NAME]);
      const entry = record.workflows[COLLISION_NAME];
      expect(entry).toBeUndefined();

      const diskSha = sha256(await readFile(collisionPath));
      const packagedBytes = await readFile(
        path.join(getInitAssetsDir(), "root", ".github", "workflows", COLLISION_NAME),
      );
      const state = resolveWorkflowFileState(entry, diskSha, sha256(packagedBytes));
      expect(
        state,
        "no provenance entry + present on disk must classify as adopter-owned",
      ).toBe("adopter-owned");
    });

    it("the provenance record path is not in the managed gitignore block (the record stays tracked)", () => {
      // QFAI_GITIGNORE_BLOCK is the pre-joined managed block text.
      expect(QFAI_GITIGNORE_BLOCK).not.toContain(".qfai/install-provenance.json");
      expect(QFAI_GITIGNORE_BLOCK).not.toContain("install-provenance");
    });
  },
);
