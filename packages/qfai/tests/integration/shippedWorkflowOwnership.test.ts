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
import { mkdir, readdir, readFile, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import * as initModule from "../../src/cli/commands/init.js";
import { copyTemplatePaths } from "../../src/cli/lib/fs.js";
import {
  readInstallProvenance,
  resolveWorkflowFileState,
  type WorkflowFileState,
  type WorkflowProvenanceEntry,
} from "../../src/shared/provenance.js";
import { QFAI_GITIGNORE_BLOCK } from "../../src/core/gitignore.js";
import { getInitAssetsDir } from "../../src/shared/assets.js";
import { shippedWorkflowPath, useTempDirPool } from "../helpers/shippedWorkflowFixtures.js";
import { captureStdout } from "../helpers/stdout.js";

// tests/integration/<this file> -> tests -> packages/qfai
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const INIT_MODULE_PATH = path.join(packageRoot, "src", "cli", "commands", "init.ts");

const readInitSource = (): Promise<string> => readFile(INIT_MODULE_PATH, "utf-8");

const newTempDir = useTempDirPool("qfai-wfown-");

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

// ── [35] ─────────────────────────────────────────
describe(
  "a workflows directory reached through a link is not this tree's to write",
  // Two guards stand behind these rows and only one of them is falsifiable here: the copy
  // exclusion, and the recorder's own re-ask. With the copy already excluded there is nothing
  // left for the recorder to refuse, so reverting IT alone leaves these green — which is what a
  // second guard looks like from a test, not a gap. The falsification plants revert the pair.
  { timeout: 60000 },
  () => {
    /**
     * The link, as a JUNCTION on Windows and an ordinary symlink elsewhere.
     *
     * `fs.symlink(..., "junction")` needs no privilege on Windows, where a plain directory
     * symlink does — and a fixture that silently skips on the platform whose default `copyFile`
     * behaviour this is about would be no fixture at all. Still guarded: a filesystem that
     * refuses either is a fixture problem, not a defect.
     */
    async function linkDir(target: string, at: string): Promise<boolean> {
      try {
        await symlink(target, at, "junction");
        return true;
      } catch {
        return false;
      }
    }

    for (const linked of [".github", ".github/workflows"] as const) {
      it(`writes no shipped workflow through a symlinked ${linked}, and records none`, async () => {
        const dir = await newTempDir();
        const outside = await newTempDir();

        // The link stands where the copy would create a directory, and points out of the tree.
        if (linked === ".github/workflows") {
          await mkdir(path.join(dir, ".github"), { recursive: true });
        }
        const at = path.join(dir, ...linked.split("/"));
        if (!(await linkDir(outside, at))) return;

        await runInitQuiet(dir);

        // Non-vacuity: `init` ran and did its other work. Without this the two assertions below
        // hold for a run that threw before writing anything at all.
        expect(
          (await readdir(path.join(dir, ".qfai"))).length,
          "init produced nothing at all, so this row proves nothing about the workflows",
        ).toBeGreaterThan(0);

        // `copyFile` follows a symlinked PARENT — `COPYFILE_EXCL` included, since exclusivity is
        // about the final component. So the shipped names would have landed out here.
        const escaped = linked === ".github" ? path.join(outside, "workflows") : outside;
        const escapedNames = await readdir(escaped).catch(() => [] as string[]);
        for (const name of requireStringSetExport("SHIPPED_WORKFLOW_NAMES")) {
          expect(
            escapedNames,
            `${name} was written outside the repository through the linked ${linked}`,
          ).not.toContain(name);
        }

        // And nothing was claimed. An entry is the durable half: it outlives the run, and it is
        // what makes doctor's drift check and the retired prune point at the escaped file too.
        const record = await readInstallProvenance(dir);
        expect(
          Object.keys(record.workflows),
          "a file this run could not safely write must not be recorded as one QFAI owns",
        ).toEqual([]);
      });
    }
  },
);

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
      'no workflows-directory pruneMatchingEntries call site may use a startsWith("qfai-") prefix-glob predicate',
    ).toEqual([]);

    // The predicate must be name-set membership over the retired-name list —
    // either the list itself, or a set DERIVED from it by the ownership
    // resolver below. What is forbidden is a predicate whose selector is
    // anything other than that list.
    const membershipSites = workflowsSites.filter(
      (site) => site.includes("RETIRED_WORKFLOW_NAMES") || site.includes("prunableRetiredNames"),
    );
    expect(
      membershipSites.length,
      "expected a pruneMatchingEntries call site targeting the workflows directory whose predicate tests retired-name membership",
    ).toBeGreaterThanOrEqual(1);
  });

  it("the retired-name selector is narrowed by provenance before anything is removed", async () => {
    const source = await readInitSource();

    // Membership in the retired list is a NECESSARY condition for removal, not
    // a sufficient one: the acceptance criteria require provenance to be
    // consulted before every overwrite and every prune, and a name the adopter
    // authored themselves carries no entry. So the set handed to the predicate
    // is resolved from the record, and the resolver has to read both halves —
    // the retired list and the recorded entry.
    const resolver = source.slice(source.indexOf("async function resolvePrunableRetiredWorkflows"));
    expect(
      resolver,
      "init.ts must resolve the prunable retired names from the provenance record",
    ).not.toBe("");
    const body = resolver.slice(0, resolver.indexOf("\n}\n") + 3);
    expect(body).toContain("RETIRED_WORKFLOW_NAMES");
    expect(body).toContain("record.workflows[name]");
  });

  it("does not prune through a workflows directory it refused to write through", async () => {
    // Review finding [68]. `workflowsDirIsOwn` excluded the COPY and nothing else, so a
    // `.github/workflows` that is a link to a shared directory or another repository was still
    // enumerated by the retired prune — and a retired workflow on the far side whose bytes
    // match a recorded digest was quarantined and deleted. The run that refused to write
    // through the link would delete through it.
    //
    // Source-level, because `RETIRED_WORKFLOW_NAMES` is empty: there is no retired name for a
    // fixture to plant, and the set being empty is itself the contract (a name enters it in
    // the same change that stops shipping it). What can be checked is that the prune's
    // selector is gated on the same answer the copy is.
    const source = await readInitSource();
    const start = source.indexOf("const removedRetiredWorkflows");
    expect(start, "runInit must resolve a retired-name set").toBeGreaterThan(-1);
    const segment = source.slice(start, source.indexOf("const removed = [", start));

    expect(
      segment,
      "the retired-name set must be gated on the same real-directory answer the copy is; a run that refused to write through a link must not delete through it",
    ).toContain("workflowsDirIsOwn");
  });

  it("the retired prune removes the file and its provenance entry in one success unit", async () => {
    const source = await readInitSource();
    const callSites = extractPruneCallSites(source);
    const workflowsSites = callSites.filter((site) => site.includes("prunableRetiredNames"));
    expect(workflowsSites.length, "expected the retired-name prune call site").toBe(1);

    // The record change is INSIDE the call, as the argument that runs while the files are still
    // recoverable. Review finding [34]: it stood after the call as its own statement, so a
    // read-only `.qfai`, a full disk or a lock the run could not take left the files gone and
    // their entries standing — and the next run reads such a name as one the adopter
    // deliberately removed, and never installs it again. That is the poisoned name this prune
    // exists to avoid, reached by the code meant to avoid it.
    expect(
      workflowsSites[0] ?? "",
      "the provenance entry removal must be the prune's commit, not a step after it",
    ).toContain("updateInstallProvenance(");

    // …and nowhere else in the workflows segment, or the unit would have a second half again.
    const start = source.indexOf("const prunableRetiredNames");
    const end = source.indexOf("const removed = [");
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const outsideTheCall = source
      .slice(start, end)
      .split(workflowsSites[0] ?? "\u0000")
      .join("");
    expect(
      outsideTheCall.includes("updateInstallProvenance("),
      "the retired-workflow segment must reach the record only through the prune's commit",
    ).toBe(false);
  });

  it("no parallel removal helper: one pruneMatchingEntries definition and no second removal-flavoured export", async () => {
    const source = await readInitSource();

    // Exactly one definition of the removal primitive.
    const definitionCount = source.split(`function ${PRUNE_CALLEE}`).length - 1;
    expect(definitionCount, "init.ts must define pruneMatchingEntries exactly once").toBe(1);

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
      expect(
        bytesAfter,
        `${ORPHAN_NAME} must still exist after runInit (not pruned)`,
      ).toBeDefined();
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
        //
        // The claim is about `workflows`, which is the field every ownership
        // decision reads, and NOT about the whole object. The reader also
        // carries unknown top-level namespaces through so that this version
        // cannot delete a later version's artifact kind on the next write —
        // the `no-workflows-key` fixture plants exactly such a key, so an
        // object-identity assertion here would forbid that round-trip.
        const record = await readInstallProvenance(dir);
        expect(
          record.workflows,
          `[record ${state}] reader must resolve to an empty workflows map`,
        ).toEqual({});
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
      const packagedBytes = await readFile(shippedWorkflowPath(COLLISION_NAME));
      const state = resolveWorkflowFileState(entry, diskSha, sha256(packagedBytes));
      expect(state, "no provenance entry + present on disk must classify as adopter-owned").toBe(
        "adopter-owned",
      );
    });

    it("the provenance record path is not in the managed gitignore block (the record stays tracked)", () => {
      // QFAI_GITIGNORE_BLOCK is the pre-joined managed block text.
      //
      // "Not in the block" was the wrong reading of the obligation, and it forbade the
      // one construct that makes the obligation TRUE. What the record needs is to survive
      // a fresh clone; silence delivers that only when the adopter's `.gitignore` has no
      // broad rule of its own. Measured with `git check-ignore -v
      // .qfai/install-provenance.json` on a tree carrying `.qfai/*` above the managed
      // block: the broad rule wins, because `!.qfai/` re-includes the DIRECTORY and not
      // this file. So the claim is checked as what it means — the block IGNORES the record
      // nowhere, and re-includes it explicitly.
      const lines = QFAI_GITIGNORE_BLOCK.split("\n");
      expect(lines).toContain("!.qfai/install-provenance.json");
      expect(
        lines.filter((line) => line.includes("install-provenance") && !line.startsWith("!")),
      ).toEqual([]);
    });
  },
);

describe(
  "TC-0003-0047 (TDD-0047): the five file states resolve and prune stays zero in all of them",
  { timeout: 60000 },
  () => {
    // Scope notes (delivery-planner ruling for this row):
    // - The TC bullet "declined is not recreated" is TDD-0051's obligation
    //   (declined-name exclusion from the copy set BEFORE the copy runs) and
    //   is deliberately NOT asserted here: today's create-only copy does
    //   recreate a declined file, and asserting it here would blur that
    //   row's RED.
    // - "declined is never reported as stale drift" is the doctor detection
    //   surface (owned by the doctor contract, not init) and is not asserted
    //   here either. The prune half of that bullet IS asserted below.
    // - Nothing here asserts that runInit WRITES a provenance entry: no
    //   writer exists yet (a later row owns it). Every record below is
    //   fixture-authored — which is exactly the shape the resolver must
    //   consume after a fresh clone, where the record predates the run.
    const WORKFLOW_NAME = "qfai-validate.yml";
    const PROVENANCE_REL = ".qfai/install-provenance.json";
    const ADOPTER_BODY =
      "# adopter-authored workflow that predates the QFAI install\nname: adopter-owned\n";
    const EDITED_BODY = "# the adopter hand-edited the installed workflow\nname: hand-edited\n";
    const OLD_TEMPLATE_BODY =
      "# an older template a previous package version shipped\nname: old-template\n";
    // A retired-shaped adopter file: qfai-prefixed, in NEITHER name list,
    // with no provenance entry (= adopter-owned). It must never be pruned.
    const RETIRED_SHAPED_NAME = "qfai-retired-legacy.yml";
    const RETIRED_SHAPED_BODY =
      "# adopter-authored file whose name looks like a retired QFAI workflow\nname: retired-shaped\n";

    // Compile-time closure at five: a sixth member added to the union fails
    // the Record constraint (missing key here), and a key outside the union
    // fails the excess-property check — both directions break `tsc --noEmit`
    // before this test even runs. The runtime sweep below is the value-level
    // half of the same closure.
    const FIVE_STATE_MEMBERS = {
      absent: true,
      "adopter-owned": true,
      installed: true,
      modified: true,
      declined: true,
    } satisfies Record<WorkflowFileState, true>;

    const ALL_FIVE_STATES = [
      "absent",
      "adopter-owned",
      "installed",
      "modified",
      "declined",
    ] as const satisfies readonly WorkflowFileState[];

    const packagedTemplatePath = (): string => shippedWorkflowPath(WORKFLOW_NAME);

    function provenanceEntry(digest: string): WorkflowProvenanceEntry {
      return { sha256: digest, installedByVersion: "0.0.0", installedAt: "2020-01-01T00:00:00Z" };
    }

    async function writeProvenanceRecord(
      dir: string,
      workflows: Record<string, WorkflowProvenanceEntry>,
    ): Promise<void> {
      const provenancePath = path.join(dir, PROVENANCE_REL);
      await mkdir(path.dirname(provenancePath), { recursive: true });
      await writeFile(provenancePath, JSON.stringify({ workflows }, null, 2), "utf-8");
    }

    /**
     * Seeds one fixture per contract state for the shipped name: the two
     * independent observations (provenance entry yes/no, on-disk bytes
     * absent/equal/differing) are authored directly on disk.
     */
    async function seedFiveStateFixture(dir: string, state: WorkflowFileState): Promise<void> {
      const workflowsDir = path.join(dir, ".github", "workflows");
      await mkdir(workflowsDir, { recursive: true });
      const filePath = path.join(workflowsDir, WORKFLOW_NAME);
      const packagedBytes = await readFile(packagedTemplatePath());
      const packagedDigest = sha256(packagedBytes);
      switch (state) {
        case "absent":
          // No entry, no file: never installed.
          return;
        case "adopter-owned":
          // No entry, file present: name collision the adopter authored.
          await writeFile(filePath, ADOPTER_BODY, "utf-8");
          return;
        case "installed":
          // Entry, file present, bytes equal the packaged template.
          await writeFile(filePath, packagedBytes);
          await writeProvenanceRecord(dir, { [WORKFLOW_NAME]: provenanceEntry(packagedDigest) });
          return;
        case "modified":
          // Entry, file present, bytes differ from the packaged template.
          await writeFile(filePath, EDITED_BODY, "utf-8");
          await writeProvenanceRecord(dir, { [WORKFLOW_NAME]: provenanceEntry(packagedDigest) });
          return;
        case "declined":
          // Entry, no file: deliberately removed by the adopter.
          await writeProvenanceRecord(dir, { [WORKFLOW_NAME]: provenanceEntry(packagedDigest) });
          return;
      }
    }

    /** Reads the fixture back through the real reader and resolver. */
    async function observeFixtureState(dir: string): Promise<WorkflowFileState> {
      const record = await readInstallProvenance(dir);
      const entry = record.workflows[WORKFLOW_NAME];
      const diskBytes = await readFile(path.join(dir, ".github", "workflows", WORKFLOW_NAME)).catch(
        () => undefined,
      );
      const diskDigest = diskBytes === undefined ? undefined : sha256(diskBytes);
      const packagedBytes = await readFile(packagedTemplatePath());
      return resolveWorkflowFileState(entry, diskDigest, sha256(packagedBytes));
    }

    /** Reads a modified-cause fixture's record entry and current disk digest. */
    async function readModifiedObservation(
      dir: string,
    ): Promise<{ entry: WorkflowProvenanceEntry; diskDigest: string }> {
      const record = await readInstallProvenance(dir);
      const entry = record.workflows[WORKFLOW_NAME];
      expect(entry, "modified-cause fixture must carry a provenance entry").toBeDefined();
      if (entry === undefined) {
        throw new Error("modified-cause fixture is missing its provenance entry");
      }
      const diskBytes = await readFile(path.join(dir, ".github", "workflows", WORKFLOW_NAME));
      return { entry, diskDigest: sha256(diskBytes) };
    }

    it("each fixture resolves to exactly its state member: absent / adopter-owned / installed / modified / declined", async () => {
      for (const state of ALL_FIVE_STATES) {
        const dir = await newTempDir();
        await seedFiveStateFixture(dir, state);
        const resolved = await observeFixtureState(dir);
        expect(
          resolved,
          `[fixture ${state}] the reader + resolver must return exactly this member`,
        ).toBe(state);
      }
    });

    it("the enum is closed at five: the full observation space yields no sixth member and reaches all five", () => {
      // The literal fixture list and the compile-time closure record must
      // name the same five members (ties the two declarations together).
      expect([...ALL_FIVE_STATES].sort()).toEqual(Object.keys(FIVE_STATE_MEMBERS).sort());

      // Value-level closure: sweep every combination of the resolver's
      // observation space — entry present/absent x disk absent/record-equal/
      // other x packaged absent/record-equal/disk-equal/other — and collect
      // the members it produces.
      const recordDigest = "a".repeat(64);
      const otherDigest = "b".repeat(64);
      const thirdDigest = "c".repeat(64);
      const entryCandidates = [undefined, provenanceEntry(recordDigest)];
      const diskCandidates = [undefined, recordDigest, otherDigest];
      const packagedCandidates = [undefined, recordDigest, otherDigest, thirdDigest];

      const observed = new Set<string>();
      for (const entry of entryCandidates) {
        for (const disk of diskCandidates) {
          for (const packaged of packagedCandidates) {
            observed.add(resolveWorkflowFileState(entry, disk, packaged));
          }
        }
      }

      const known = new Set<string>(ALL_FIVE_STATES);
      for (const member of observed) {
        expect(known.has(member), `a sixth state appeared: ${member}`).toBe(true);
      }
      // All five are reachable — the enum is not only bounded but covering.
      expect([...observed].sort()).toEqual([...known].sort());
    });

    it("absent (never-installed) and declined are distinct states under the identical disk observation", () => {
      // Both observations share the SAME disk fact (no file) and the SAME
      // packaged digest; the only discriminant is the provenance entry.
      // Never-installed is not "deleted".
      const packagedDigest = "d".repeat(64);
      const neverInstalled = resolveWorkflowFileState(undefined, undefined, packagedDigest);
      const deliberatelyRemoved = resolveWorkflowFileState(
        provenanceEntry("a".repeat(64)),
        undefined,
        packagedDigest,
      );
      expect(neverInstalled).toBe("absent");
      expect(deliberatelyRemoved).toBe("declined");
      expect(neverInstalled).not.toBe(deliberatelyRemoved);
    });

    it("prune stays zero in all five states: runInit removes no pre-existing file, including a retired-shaped adopter file", async () => {
      // Fixture validity: the retired-shaped name must sit in NEITHER name
      // list, or this fixture would be measuring the write/prune name lists
      // instead of the five states (list semantics are TDD-0045's oracle).
      const shipped = requireStringSetExport("SHIPPED_WORKFLOW_NAMES");
      const retired = requireStringSetExport("RETIRED_WORKFLOW_NAMES");
      expect(shipped.has(RETIRED_SHAPED_NAME)).toBe(false);
      expect(retired.has(RETIRED_SHAPED_NAME)).toBe(false);

      // Disclosed triviality: RETIRED_WORKFLOW_NAMES is EMPTY at this
      // revision, so the retired-name prune branch cannot fire and this
      // measurement passes without exercising it. The oracle deliberately
      // measures REMOVALS (before minus after), so it becomes discriminating
      // the moment the retired list is populated: today's prune predicate is
      // provenance-blind name membership, which would remove an
      // adopter-owned file bearing a retired name and fail this assertion.
      for (const state of ALL_FIVE_STATES) {
        const dir = await newTempDir();
        await seedFiveStateFixture(dir, state);
        const workflowsDir = path.join(dir, ".github", "workflows");
        await writeFile(path.join(workflowsDir, RETIRED_SHAPED_NAME), RETIRED_SHAPED_BODY, "utf-8");
        const beforeNames = await readdir(workflowsDir);
        const provenancePath = path.join(dir, PROVENANCE_REL);
        const provenanceBefore = await readFile(provenancePath).catch(() => undefined);

        await runInitQuiet(dir);

        const afterNames = new Set(await readdir(workflowsDir));
        const removed = beforeNames.filter((name) => !afterNames.has(name)).sort();
        expect(
          removed,
          `[fixture ${state}] prune must remove zero files from the workflows directory`,
        ).toEqual([]);

        // The record itself must also survive: removing it would collapse
        // declined into absent on the next run.
        if (provenanceBefore !== undefined) {
          const provenanceAfter = await readFile(provenancePath).catch(() => undefined);
          expect(
            provenanceAfter,
            `[fixture ${state}] the provenance record must survive runInit`,
          ).toBeDefined();
        }
      }
    });

    it("modified's two causes are distinguishable via the record sha256 (digest of the originally-written bytes, not the current file)", async () => {
      const packagedBytes = await readFile(packagedTemplatePath());
      const packagedDigest = sha256(packagedBytes);

      // Cause 1 — the adopter hand-edited: QFAI wrote the CURRENT template
      // (record = its digest); the file on disk was edited afterwards.
      const adopterEditDir = await newTempDir();
      const adopterEditWorkflows = path.join(adopterEditDir, ".github", "workflows");
      await mkdir(adopterEditWorkflows, { recursive: true });
      await writeFile(path.join(adopterEditWorkflows, WORKFLOW_NAME), EDITED_BODY, "utf-8");
      await writeProvenanceRecord(adopterEditDir, {
        [WORKFLOW_NAME]: provenanceEntry(packagedDigest),
      });

      // Cause 2 — the package moved on: QFAI wrote an OLD template (record =
      // digest of those old bytes); the adopter never touched the file; the
      // packaged template has since changed.
      const packageMovedDir = await newTempDir();
      const packageMovedWorkflows = path.join(packageMovedDir, ".github", "workflows");
      await mkdir(packageMovedWorkflows, { recursive: true });
      const oldTemplatePath = path.join(packageMovedWorkflows, WORKFLOW_NAME);
      await writeFile(oldTemplatePath, OLD_TEMPLATE_BODY, "utf-8");
      const oldTemplateBytes = await readFile(oldTemplatePath);
      await writeProvenanceRecord(packageMovedDir, {
        [WORKFLOW_NAME]: provenanceEntry(sha256(oldTemplateBytes)),
      });

      const adopterEdit = await readModifiedObservation(adopterEditDir);
      const packageMoved = await readModifiedObservation(packageMovedDir);

      // Without the record the two causes present identically: both disk
      // digests differ from the packaged digest, and the detection half
      // reports `modified` either way — the resolver compares disk bytes to
      // the PACKAGED template, never to the record.
      expect(adopterEdit.diskDigest).not.toBe(packagedDigest);
      expect(packageMoved.diskDigest).not.toBe(packagedDigest);
      expect(
        resolveWorkflowFileState(adopterEdit.entry, adopterEdit.diskDigest, packagedDigest),
      ).toBe("modified");
      expect(
        resolveWorkflowFileState(packageMoved.entry, packageMoved.diskDigest, packagedDigest),
      ).toBe("modified");

      // The record sha256 is the digest of the bytes QFAI originally wrote,
      // NOT of the current file: in the hand-edit fixture the two differ.
      expect(adopterEdit.entry.sha256).not.toBe(adopterEdit.diskDigest);

      // Cause separation a consumer can compute from the record:
      //   disk != record, record == packaged  ->  the adopter edited it
      //   disk == record, record != packaged  ->  the package moved on
      expect(adopterEdit.diskDigest === adopterEdit.entry.sha256).toBe(false);
      expect(adopterEdit.entry.sha256).toBe(packagedDigest);
      expect(packageMoved.diskDigest === packageMoved.entry.sha256).toBe(true);
      expect(packageMoved.entry.sha256).not.toBe(packagedDigest);
    });
  },
);

describe(
  "TC-0003-0054 (TDD-0054): an absent (never-installed) name is written and recorded, unlike declined",
  { timeout: 60000 },
  () => {
    // Scope notes (delivery-planner ruling for this row):
    // - This row owns the provenance WRITE path: after runInit over a fresh
    //   adopter tree (no record, no file = `absent`), the shipped file is
    //   written AND the record gains an entry whose sha256 is the digest of
    //   the bytes init wrote, with the contract's three fields.
    // - The DISK half of the declined contrast — the file must not be
    //   recreated — is TDD-0051's row (copy-set exclusion before the copy
    //   runs). Today's create-only copy DOES recreate a declined file, so
    //   file absence is deliberately NOT asserted here; only the RECORD side
    //   of the absent/declined distinction is.
    const WORKFLOW_NAME = "qfai-validate.yml";
    const PROVENANCE_REL = ".qfai/install-provenance.json";
    // A seeded declined entry with values a fresh install record could not
    // legitimately reproduce (old digest, old version, old timestamp), so
    // "retained as-is" is distinguishable from "rewritten identically".
    const DECLINED_SEED_ENTRY: WorkflowProvenanceEntry = {
      sha256: "ab".repeat(32),
      installedByVersion: "0.0.1",
      installedAt: "2021-02-03T04:05:06Z",
    };

    const packagedTemplatePath = (): string => shippedWorkflowPath(WORKFLOW_NAME);

    async function writeProvenanceRecord(
      dir: string,
      workflows: Record<string, WorkflowProvenanceEntry>,
    ): Promise<void> {
      const provenancePath = path.join(dir, PROVENANCE_REL);
      await mkdir(path.dirname(provenancePath), { recursive: true });
      await writeFile(provenancePath, JSON.stringify({ workflows }, null, 2), "utf-8");
    }

    /** Reads the canonical version the record must stamp (package.json#version). */
    async function readPackageVersion(): Promise<string> {
      const raw = await readFile(path.join(packageRoot, "package.json"), "utf-8");
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new Error("package.json did not parse to a plain object");
      }
      const version: unknown = Reflect.get(parsed, "version");
      if (typeof version !== "string" || version.length === 0) {
        throw new Error("package.json#version must be a non-empty string");
      }
      return version;
    }

    it("the absent name is included in the copy set: runInit writes the shipped file byte-equal to the packaged template", async () => {
      // Fixture: fresh adopter tree — no provenance record, no workflows
      // file. That is the `absent` (never-installed) state.
      const dir = await newTempDir();
      await runInitQuiet(dir);

      const writtenPath = path.join(dir, ".github", "workflows", WORKFLOW_NAME);
      const writtenBytes = await readFile(writtenPath).catch(() => undefined);
      expect(
        writtenBytes,
        `${WORKFLOW_NAME} must be written on a fresh tree (absent is not declined)`,
      ).toBeDefined();
      if (writtenBytes === undefined) {
        throw new Error(`${WORKFLOW_NAME} was not written by runInit`);
      }
      const packagedBytes = await readFile(packagedTemplatePath());
      expect(sha256(writtenBytes)).toBe(sha256(packagedBytes));
    });

    it("runInit records a provenance entry for the written name: sha256 of the written bytes plus the version and timestamp fields", async () => {
      const dir = await newTempDir();
      await runInitQuiet(dir);

      const writtenPath = path.join(dir, ".github", "workflows", WORKFLOW_NAME);
      const writtenBytes = await readFile(writtenPath);

      const record = await readInstallProvenance(dir);
      const entry = record.workflows[WORKFLOW_NAME];
      expect(
        entry,
        `init must record a provenance entry for ${WORKFLOW_NAME} after writing it`,
      ).toBeDefined();
      if (entry === undefined) {
        throw new Error(`no provenance entry recorded for ${WORKFLOW_NAME}`);
      }

      // Read back immediately after init: nothing else has touched the
      // file, so these bytes ARE the bytes init wrote and the record's
      // sha256 must be their digest (the record contract: digest of the
      // WRITTEN bytes, stamped once at install time).
      expect(entry.sha256).toBe(sha256(writtenBytes));
      expect(entry.installedByVersion).toBe(await readPackageVersion());
      expect(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(entry.installedAt)).toBe(true);
      expect(Number.isNaN(Date.parse(entry.installedAt))).toBe(false);
    });

    it("a declined name's entry is retained as-is: init never replaces it with a fresh install record", async () => {
      // Fixture: entry present, file absent — the `declined` state. Only
      // the record side is asserted (see the scope note above): a fresh
      // install record here (current version, new timestamp) would mark the
      // adopter's deliberate removal as a brand-new install and destroy
      // declined-state decidability on the next run.
      const dir = await newTempDir();
      await writeProvenanceRecord(dir, { [WORKFLOW_NAME]: DECLINED_SEED_ENTRY });

      await runInitQuiet(dir);

      const record = await readInstallProvenance(dir);
      const entry = record.workflows[WORKFLOW_NAME];
      expect(entry, "the declined entry must survive runInit unreplaced").toBeDefined();
      expect(entry).toEqual(DECLINED_SEED_ENTRY);
    });
  },
);

describe(
  "TC-0003-0051 (TDD-0051): declined name is excluded from the copy set before the copy runs",
  { timeout: 60000 },
  () => {
    // Scope notes:
    // - This row owns the copy-set EXCLUSION joint: a declined name must be
    //   removed from the copy set BEFORE the copy primitive runs. Create-only
    //   cannot hold the declined row on its own — the file is absent, so the
    //   create-only predicate ("write when absent") is precisely what would
    //   recreate it (it3 is that falsifying control).
    // - The record side of declined (entry retained, never restamped) is
    //   TDD-0054's describe and is not re-asserted here. The behavioral
    //   inclusion of `absent` names is TDD-0054 it1; the byte-identity of
    //   adopter-owned collisions is TDD-0046 it1 — both referenced, not
    //   duplicated; it1 here pins their COPY-SET-level counterparts.
    const WORKFLOW_NAME = "qfai-validate.yml";
    const PROVENANCE_REL = ".qfai/install-provenance.json";
    // The pre-copy copy-set joint this row demands from the init module. Its
    // signature is fixed test-first: a PURE resolver over the two pre-init
    // observations — (shippedNames, provenance record, names present on
    // disk) -> Set of names the copy may write.
    const COPY_SET_RESOLVER_EXPORT = "resolveWorkflowCopySet";
    const DECLINED_ENTRY: WorkflowProvenanceEntry = {
      sha256: "cd".repeat(32),
      installedByVersion: "0.0.1",
      installedAt: "2022-03-04T05:06:07Z",
    };

    /** Entry present + file absent on disk = the `declined` state. */
    async function seedDeclinedFixture(dir: string): Promise<void> {
      const provenancePath = path.join(dir, PROVENANCE_REL);
      await mkdir(path.dirname(provenancePath), { recursive: true });
      await writeFile(
        provenancePath,
        JSON.stringify({ workflows: { [WORKFLOW_NAME]: DECLINED_ENTRY } }, null, 2),
        "utf-8",
      );
    }

    it("the copy set is resolvable before the copy: an exported pure resolver excludes the declined name and swallows neither absent nor adopter-owned", () => {
      // The copy-set decision must exist as an observable joint BEFORE any
      // filesystem work. A missing export fails THIS assertion instead of
      // crashing module load (namespace-import pattern).
      expect(
        Object.keys(initModule),
        `init module must export ${COPY_SET_RESOLVER_EXPORT} (the pre-copy copy-set joint)`,
      ).toContain(COPY_SET_RESOLVER_EXPORT);
      const resolverExport: unknown = Reflect.get(initModule, COPY_SET_RESOLVER_EXPORT);
      expect(typeof resolverExport).toBe("function");
      if (typeof resolverExport !== "function") {
        throw new Error(`${COPY_SET_RESOLVER_EXPORT} is not exported as a function`);
      }

      const shipped = new Set([WORKFLOW_NAME]);

      // declined (entry present, not on disk): EXCLUDED from the set.
      const declinedResult: unknown = resolverExport(
        shipped,
        { workflows: { [WORKFLOW_NAME]: DECLINED_ENTRY } },
        new Set<string>(),
      );
      expect(declinedResult).toBeInstanceOf(Set);
      expect(
        declinedResult instanceof Set && declinedResult.has(WORKFLOW_NAME),
        "a declined name must not be in the copy set",
      ).toBe(false);

      // absent (no entry, not on disk): INCLUDED — the exclusion must not
      // swallow never-installed names (behavioral half: TDD-0054 it1).
      const absentResult: unknown = resolverExport(shipped, { workflows: {} }, new Set<string>());
      expect(
        absentResult instanceof Set && absentResult.has(WORKFLOW_NAME),
        "an absent (never-installed) name must stay in the copy set",
      ).toBe(true);

      // adopter-owned (no entry, present on disk): INCLUDED — the on-disk
      // file's protection is the create-only skip (behavioral half:
      // TDD-0046 it1), so the exclusion must key on the entry+absence PAIR,
      // not on disk absence alone.
      const adopterOwnedResult: unknown = resolverExport(
        shipped,
        { workflows: {} },
        new Set([WORKFLOW_NAME]),
      );
      expect(
        adopterOwnedResult instanceof Set && adopterOwnedResult.has(WORKFLOW_NAME),
        "an adopter-owned name must stay in the copy set (create-only skips it)",
      ).toBe(true);
    });

    it("a declined file stays absent on disk after runInit (never recreated)", async () => {
      const dir = await newTempDir();
      await seedDeclinedFixture(dir);

      await runInitQuiet(dir);

      const filePath = path.join(dir, ".github", "workflows", WORKFLOW_NAME);
      const stillAbsent = await readFile(filePath).then(
        () => false,
        () => true,
      );
      expect(
        stillAbsent,
        `${WORKFLOW_NAME} must not be recreated by runInit for a declined name`,
      ).toBe(true);
    });

    it("control: the unfiltered copy primitive writes the declined file — create-only cannot be the exclusion mechanism", async () => {
      const dir = await newTempDir();
      await seedDeclinedFixture(dir);

      // Invoke the copy primitive directly with the UNFILTERED shipped
      // workflows tree (no copy-set construction in front of it). The
      // declined file is absent, so create-only writes it: the falsifying
      // oracle for any claim that create-only alone satisfies the declined
      // row — which is why the exclusion must precede the copy.
      const rootAssets = path.join(getInitAssetsDir(), "root");
      await copyTemplatePaths(rootAssets, dir, [path.join(".github", "workflows")], {
        force: false,
        dryRun: false,
        conflictPolicy: "skip",
      });

      const filePath = path.join(dir, ".github", "workflows", WORKFLOW_NAME);
      const written = await readFile(filePath).then(
        () => true,
        () => false,
      );
      expect(
        written,
        `${WORKFLOW_NAME} must be written by the unfiltered create-only copy (the file was absent)`,
      ).toBe(true);
    });

    it("single state derivation: init.ts reads the provenance record exactly once (the resolver must consume the pre-init capture)", async () => {
      const source = await readInitSource();
      // The pre-init snapshot is the single provenance read; the copy-set
      // resolver must consume THAT state rather than deriving its own from
      // a second read — two reads could disagree mid-run and would make
      // the record decision and the copy decision separable.
      const readCallSites = source.split("readInstallProvenance(").length - 1;
      expect(
        readCallSites,
        "init.ts must contain exactly one readInstallProvenance call site",
      ).toBe(1);
    });
  },
);

describe(
  "TC-0003-0048 (TDD-0048): write and removal path contains no filesystem call of its own",
  { timeout: 60000 },
  () => {
    // Scope reading (disclosed): the scanned set is the workflows-directory
    // write/removal path — the three workflow-path functions plus the
    // runInit workflows segment. `pruneMatchingEntries` is NOT scanned: it
    // is the sanctioned removal primitive itself (its `rm` is the one the
    // contract routes everything through; its uniqueness is TDD-0052's
    // oracle). `writeInstallProvenance` (src/shared/provenance.ts) is not
    // scanned either: its writeFile writes the RECORD file — a different
    // artifact under .qfai/, not a workflows-directory write — and the
    // workflow path reaches the record only through that single exported
    // writer. init.ts's other writeFile/rm call sites (gitignore, wrapper,
    // memo, skills-prune helpers) belong to other artifacts' paths and are
    // outside this TC.
    const WORKFLOW_NAME = "qfai-validate.yml";
    const PROVENANCE_REL = ".qfai/install-provenance.json";
    const ADOPTER_BODY =
      "# adopter-authored workflow that predates the QFAI install\nname: adopter-collision\n";
    const EDITED_BODY = "# the adopter hand-edited the installed workflow\nname: hand-edited\n";
    const FORBIDDEN_FS_CALL_RE = /\b(?:copyFile|writeFile|rm|unlink)\s*\(/g;
    const WORKFLOW_PATH_FUNCTIONS = [
      "resolveWorkflowCopySet",
      "captureShippedWorkflowPreInitState",
      "recordInstalledWorkflows",
    ] as const;

    const packagedTemplatePath = (): string => shippedWorkflowPath(WORKFLOW_NAME);

    const forbiddenCalls = (text: string): string[] => text.match(FORBIDDEN_FS_CALL_RE) ?? [];

    /**
     * Extracts a function's body text by brace counting from the
     * `function <name>(` definition marker (call sites never match: they
     * are not preceded by `function `). Returns undefined when absent so
     * the caller's assertion is what fails.
     */
    function extractFunctionBody(source: string, name: string): string | undefined {
      const idx = source.indexOf(`function ${name}(`);
      if (idx === -1) {
        return undefined;
      }
      const braceStart = source.indexOf("{", idx);
      if (braceStart === -1) {
        return undefined;
      }
      let depth = 1;
      let end = braceStart + 1;
      while (end < source.length && depth > 0) {
        const ch = source.charAt(end);
        if (ch === "{") {
          depth += 1;
        } else if (ch === "}") {
          depth -= 1;
        }
        end += 1;
      }
      return source.slice(braceStart + 1, end - 1);
    }

    /**
     * Extracts the argument text of every CALL site of `callee(`, paren
     * counted; the `function callee(` definition itself is excluded (same
     * approach as extractPruneCallSites above, parameterized).
     */
    function extractCallSites(source: string, calleeWithParen: string): string[] {
      const sites: string[] = [];
      let from = 0;
      for (;;) {
        const idx = source.indexOf(calleeWithParen, from);
        if (idx === -1) {
          break;
        }
        const argStart = idx + calleeWithParen.length;
        from = argStart;
        const preceding = source.slice(Math.max(0, idx - "function ".length), idx);
        if (preceding === "function ") {
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

    async function seedProvenanceEntry(dir: string, sha256Hex: string): Promise<void> {
      const provenancePath = path.join(dir, PROVENANCE_REL);
      await mkdir(path.dirname(provenancePath), { recursive: true });
      await writeFile(
        provenancePath,
        JSON.stringify(
          {
            workflows: {
              [WORKFLOW_NAME]: {
                sha256: sha256Hex,
                installedByVersion: "0.0.1",
                installedAt: "2021-02-03T04:05:06Z",
              },
            },
          },
          null,
          2,
        ),
        "utf-8",
      );
    }

    async function observeFixtureState(
      dir: string,
      packagedDigest: string,
    ): Promise<WorkflowFileState> {
      const record = await readInstallProvenance(dir);
      const entry = record.workflows[WORKFLOW_NAME];
      const diskBytes = await readFile(path.join(dir, ".github", "workflows", WORKFLOW_NAME)).catch(
        () => undefined,
      );
      const diskDigest = diskBytes === undefined ? undefined : sha256(diskBytes);
      return resolveWorkflowFileState(entry, diskDigest, packagedDigest);
    }

    it("no filesystem mutation call of its own: the workflow-path functions and the runInit workflows segment use the primitives only", async () => {
      const source = await readInitSource();

      for (const fnName of WORKFLOW_PATH_FUNCTIONS) {
        const body = extractFunctionBody(source, fnName);
        expect(body, `init.ts must define ${fnName} (a workflow-path function)`).toBeDefined();
        if (body === undefined) {
          throw new Error(`workflow-path function ${fnName} not found in init.ts`);
        }
        expect(
          forbiddenCalls(body),
          `${fnName} must contain no copyFile/writeFile/rm/unlink call of its own`,
        ).toEqual([]);
      }

      // The runInit workflows segment: from the pre-init capture through
      // the retired-name prune (ending at the removals aggregation).
      const start = source.indexOf("captureShippedWorkflowPreInitState(destRoot)");
      const end = source.indexOf("const removed = [");
      expect(start, "runInit must call the pre-init capture").toBeGreaterThanOrEqual(0);
      expect(end, "runInit must aggregate removals after the workflows prune").toBeGreaterThan(
        start,
      );
      const segment = source.slice(start, end);
      expect(
        forbiddenCalls(segment),
        "the runInit workflows segment must contain no direct fs mutation call",
      ).toEqual([]);

      // Routing evidence: the segment reaches the filesystem only through
      // the named primitives (and the record through its named recorder).
      for (const callee of [
        "resolveWorkflowCopySet(",
        "copyTemplateTree(",
        "copyTemplatePaths(",
        "recordInstalledWorkflows(",
        "pruneMatchingEntries(",
      ]) {
        expect(
          segment,
          `the workflows segment must route through ${callee.slice(0, -1)}`,
        ).toContain(callee);
      }
    });

    it("the collision, declined and modified fixtures are processed through the primitives with the contract outcomes", async () => {
      // "Processed via the primitives" is established by conjunction: it1
      // proves the workflow flow has no other mutation path, and these
      // outcomes prove the primitives' create-only / exclusion / prune
      // semantics produced them (matching the TC's paired source-search +
      // fixture-run Action).
      const packagedBytes = await readFile(packagedTemplatePath());
      const packagedDigest = sha256(packagedBytes);

      // (a) name collision: file present, no entry -> untouched, adopter-owned.
      const collisionDir = await newTempDir();
      const collisionWorkflows = path.join(collisionDir, ".github", "workflows");
      await mkdir(collisionWorkflows, { recursive: true });
      const collisionPath = path.join(collisionWorkflows, WORKFLOW_NAME);
      await writeFile(collisionPath, ADOPTER_BODY, "utf-8");
      const collisionDigestBefore = sha256(await readFile(collisionPath));
      await runInitQuiet(collisionDir);
      expect(sha256(await readFile(collisionPath)), "[collision] byte identity").toBe(
        collisionDigestBefore,
      );
      await expect(observeFixtureState(collisionDir, packagedDigest)).resolves.toBe(
        "adopter-owned",
      );

      // (b) declined: entry present, file absent -> stays absent, declined.
      const declinedDir = await newTempDir();
      await seedProvenanceEntry(declinedDir, packagedDigest);
      await runInitQuiet(declinedDir);
      const declinedStillAbsent = await readFile(
        path.join(declinedDir, ".github", "workflows", WORKFLOW_NAME),
      ).then(
        () => false,
        () => true,
      );
      expect(declinedStillAbsent, "[declined] the file must stay absent").toBe(true);
      await expect(observeFixtureState(declinedDir, packagedDigest)).resolves.toBe("declined");

      // (c) modified: entry present, edited file -> bytes untouched, modified.
      const modifiedDir = await newTempDir();
      const modifiedWorkflows = path.join(modifiedDir, ".github", "workflows");
      await mkdir(modifiedWorkflows, { recursive: true });
      const modifiedPath = path.join(modifiedWorkflows, WORKFLOW_NAME);
      await writeFile(modifiedPath, EDITED_BODY, "utf-8");
      await seedProvenanceEntry(modifiedDir, packagedDigest);
      const modifiedDigestBefore = sha256(await readFile(modifiedPath));
      await runInitQuiet(modifiedDir);
      expect(sha256(await readFile(modifiedPath)), "[modified] byte identity").toBe(
        modifiedDigestBefore,
      );
      await expect(observeFixtureState(modifiedDir, packagedDigest)).resolves.toBe("modified");
    });

    it("the create-only force: false literal stays at the root-copy call site and is not lifted to options.force", async () => {
      const source = await readInitSource();
      const rootCopySites = extractCallSites(source, "copyTemplateTree(").filter((args) =>
        args.includes("rootAssets"),
      );
      expect(
        rootCopySites.length,
        "init.ts must contain exactly one root-tree copyTemplateTree call site",
      ).toBe(1);
      const site = rootCopySites[0] ?? "";
      // The literal is load-bearing for the ownership contract: lifting it
      // to options.force would let a --force run overwrite an
      // adopter-owned collision, and NO behavioral fixture in this file
      // would catch the lift (options.force is false in all of them) —
      // which is exactly why this oracle is source-level.
      expect(site).toContain("force: false");
      expect(
        site.includes("force: options.force"),
        "the root-copy create-only literal must not be lifted to options.force",
      ).toBe(false);
    });
  },
);

describe("the workflows parent is pinned across the copy, not only before it", () => {
  // Review finding [109]. `workflowAncestorsAreRealDirectories` ran ONCE, before a copy that
  // performs many asynchronous filesystem operations, and nothing held the answer still
  // afterwards. A concurrent process swapping `.github` or `.github/workflows` for a link
  // between the check and a write has the shipped workflow created outside the repository —
  // `COPYFILE_EXCL` refuses an existing destination and follows a linked PARENT without
  // complaint — and the later re-check stopped the provenance record without unwriting anything.
  //
  // Asserted on the SOURCE. The interleaving is between two processes and Node has no `openat`,
  // so the repair is an identity comparison around the copy; there is no in-process seam where
  // a fixture could swap the directory mid-`copyTemplateTree`. What a test can pin is that the
  // identity is CAPTURED before the copy and COMPARED after it, and that the answer is reported
  // rather than acted on through the parent that was just found untrustworthy.

  it("captures the ancestors' identity before the copy and compares it after", async () => {
    const source = await readInitSource();

    const captured = source.indexOf(
      "const workflowAncestorsBefore = await workflowAncestorIdentity(destRoot)",
    );
    // The copy that writes the WORKFLOWS, which review finding [123] separated from the copy of
    // the rest of the root — so this row names that one and not `rootResult`.
    const copied = source.indexOf(
      "const workflowResult = await copyTemplatePaths(rootAssets, destRoot, workflowCopyPaths",
    );
    const compared = source.indexOf(
      "await settleWorkflowAncestors(destRoot, workflowAncestorsPinned)",
    );

    expect(captured, "the identity must be captured").toBeGreaterThan(-1);
    expect(copied, "before the copy that writes the workflows").toBeGreaterThan(captured);
    expect(compared, "and settled after it").toBeGreaterThan(copied);
  });

  it("reports a swap and records nothing, rather than deleting through the new parent", async () => {
    // The direction matters. A rollback would have to remove those files THROUGH the parent just
    // found untrustworthy — following the link this command refused to follow, into a directory
    // whose other contents are not ours. This repository already ruled on that when the
    // retired-name prune was found enumerating a linked workflows directory.
    const source = await readInitSource();
    const start = source.indexOf(
      "await settleWorkflowAncestors(destRoot, workflowAncestorsPinned)",
    );
    expect(start, "the comparison must exist to be checked").toBeGreaterThan(-1);
    const block = source.slice(start, source.indexOf("recordInstalledWorkflows(", start));

    expect(block, "a detected swap must be reported to the operator").toMatch(/error\(/);
    expect(block, "and the written workflows dropped before anything records them").toMatch(
      /workflowResult\.copied = \[\]/,
    );
    expect(
      block,
      "and nothing may be removed through the parent that was just refused",
    ).not.toMatch(/\b(rm|unlink|rmdir)\(/);
  });
  it("excludes the written workflows by comparing paths, not leading path segments", () => {
    // Review finding [114], measured rather than read. `copyTemplateTree` reports ABSOLUTE
    // destinations, and the first version of this filter split one and took its first two
    // segments — `/tmp` for `/tmp/repo/.github/workflows/qfai-tests.yml` — so it excluded
    // nothing. The identity mismatch was detected, reported, and then `recordInstalledWorkflows`
    // wrote provenance for every workflow anyway. The next run reads those names as `declined`
    // and never writes them again, so the swap costs the adopter the workflows permanently.
    //
    // A predicate, so the row can hand it the absolute paths the defect was made of. Asserting
    // the lambda's shape on the source would have passed against the broken one.
    const root = path.join(path.sep === "/" ? "/tmp" : "C:\\tmp", "repo");

    expect(
      initModule.isWorkflowDestination(
        path.join(root, ".github", "workflows", "qfai-tests.yml"),
        root,
      ),
      "a shipped workflow under the workflows directory must be excluded",
    ).toBe(true);
    expect(
      initModule.isWorkflowDestination(path.join(root, ".github", "dependabot.yml"), root),
      "a sibling under .github is not a workflow and must be recorded",
    ).toBe(false);
    expect(
      initModule.isWorkflowDestination(path.join(root, "DESIGN.md"), root),
      "and neither is a root file",
    ).toBe(false);
    expect(
      initModule.isWorkflowDestination(
        path.join(root, ".github", "workflows", "nested", "deep.yml"),
        root,
      ),
      "a file one level deeper is not IN the workflows directory",
    ).toBe(false);
  });

  it("stops the retired prune too, not only the provenance record", async () => {
    // Review finding [113]. `workflowsDirIsOwn` was computed BEFORE the copy and stayed `true`
    // after a swap was detected, so `resolvePrunableRetiredWorkflows` went on to enumerate the
    // swapped directory — and a retired workflow over there whose bytes match a recorded digest
    // was quarantined and deleted. That is the removal-through-a-refused-parent this file already
    // ruled out for the copy, reached by the other route in the same run.
    //
    // Asserted on the SOURCE for the reason the rows above give: the swap is between two
    // processes and there is no in-process seam to drive it from a fixture.
    const source = await readInitSource();

    const detected = source.indexOf("const workflowsSwapped =");
    expect(detected, "the detection must be a value the run can read").toBeGreaterThan(-1);

    const pruneAt = source.indexOf("const prunableRetiredNames");
    expect(pruneAt, "the prune must exist to be gated").toBeGreaterThan(detected);
    const gate = source.slice(pruneAt, source.indexOf("resolvePrunableRetiredWorkflows", pruneAt));
    expect(gate, "the prune must be gated on the swap as well as on owning the directory").toMatch(
      /workflowsDirIsOwn\s*&&\s*!workflowsSwapped/,
    );
  });
  it("establishes the workflow directory identity rather than observing it after the copy", async () => {
    // Review finding [121]. A component absent before the copy had no identity to compare
    // against, and the comparison returned `true` for it and stopped looking — so on a first
    // `init`, where `.github` and `.github/workflows` are both created by the copy, ANY real
    // directory standing there afterwards was accepted. The record then named workflows that are
    // not where the record says they are, and the next run reads those names as `declined` and
    // never writes them again.
    //
    // Asserted on the SOURCE, for the reason the rows above give: the swap is between two
    // processes and there is no in-process seam to drive it from a fixture. What a row can pin is
    // that the absent case SETTLES on the reading it takes rather than waiving the question, and
    // that the settled value is what the record is checked against.
    const source = await readInitSource();

    // The refusal is MEASURED rather than matched. A regex over the branch was tried and a
    // plant defeated it: the lazy span reached the `return undefined` of the NEXT branch, so
    // restoring `settled.push(observed)` left the row green. Calling the function answers the
    // question the finding actually asks.
    const dir = await newTempDir();

    // A component that existed before: its identity is carried through unchanged.
    await mkdir(path.join(dir, ".github", "workflows"), { recursive: true });
    const present = await initModule.workflowAncestorIdentity(dir);
    expect(present, "the fixture must be readable").not.toBeUndefined();
    expect(
      await initModule.settleWorkflowAncestors(dir, present ?? []),
      "an unchanged tree settles on the identity it already had",
    ).toEqual(present);

    // A component that did NOT exist before — `null` in the pre-copy reading — is refused, even
    // though a perfectly good real directory is standing there now. That directory is exactly
    // what an attacker substitutes, and the post-copy reading cannot tell the two apart.
    const fresh = await newTempDir();
    const absent = await initModule.workflowAncestorIdentity(fresh);
    expect(absent, "the premise: both components are absent, so the reading is all nulls").toEqual([
      null,
      null,
    ]);
    await mkdir(path.join(fresh, ".github", "workflows"), { recursive: true });
    expect(
      await initModule.settleWorkflowAncestors(fresh, absent ?? []),
      "a component absent before the copy must be refused, not settled on what appeared",
    ).toBeUndefined();

    // …and the caller ESTABLISHES the identity rather than discovering it: the directory is
    // created before the copy and read back, so on every path that writes a workflow there is
    // no absent component for the branch above to reach.
    const created = source.indexOf('await mkdir(path.join(destRoot, ".github", "workflows")');
    const pinned = source.indexOf("const workflowAncestorsPinned =");
    expect(
      source.slice(pinned, pinned + 400),
      "the pinned identity must be READ after the creation, not carried over from before it",
    ).toMatch(/\?\s*await workflowAncestorIdentity\(destRoot\)/);
    const copyAt = source.indexOf("const workflowResult = await copyTemplatePaths(");
    expect(created, "the workflow directory must be created by this run").toBeGreaterThan(-1);
    expect(pinned, "and its identity read after that creation").toBeGreaterThan(created);
    expect(
      copyAt,
      "both before the copy, so there is no window in which the question is open",
    ).toBeGreaterThan(pinned);

    // …and the record compares against the settled value, not merely `a real directory`, which
    // every swapped-in real directory also satisfies.
    const record = source.indexOf("async function recordInstalledWorkflows(");
    const recordBody = source.slice(
      record,
      source.indexOf("const workflowsDir = path.join(destRoot", record),
    );
    expect(
      recordBody,
      "the record must check the settled identity before claiming ownership",
    ).toMatch(/workflowAncestorsMatch\(destRoot, settled\)/);
  });

  it("copies the workflows and records them before the rest of the root is touched", async () => {
    // Review finding [123]. The workflows rode along in the root copy and the record followed
    // it, so a permission, I/O or disk error anywhere else in that copy — `DESIGN.md`,
    // `qfai.config.yaml`, any of it — threw before the record ran and left the workflows on disk
    // with no entry. That state is permanent: an unrecorded shipped workflow reads as
    // `adopter-owned` on every later run, so it is never recorded, never drift-checked, and never
    // prunable.
    const source = await readInitSource();

    const workflowCopy = source.indexOf("const workflowResult = await copyTemplatePaths(");
    const record = source.indexOf("await recordInstalledWorkflows(");
    const rootCopy = source.indexOf("const rootResult = await copyTemplateTree(rootAssets");

    expect(workflowCopy, "the workflows must be copied on their own").toBeGreaterThan(-1);
    expect(record, `and recorded after that copy`).toBeGreaterThan(workflowCopy);
    expect(
      rootCopy,
      "and the rest of the root copied only once the record is written",
    ).toBeGreaterThan(record);
  });

  it("excludes every shipped workflow name from the copy of the rest of the root", async () => {
    // The other half of the split, and the one that would fail silently: if the root copy still
    // carried the workflows, a name this run DECLINED would arrive by that route — written
    // without a record, which is the state the row above is about.
    const source = await readInitSource();
    const rootCopy = source.indexOf("const rootResult = await copyTemplateTree(rootAssets");
    expect(rootCopy, "the root copy must exist").toBeGreaterThan(-1);
    const call = source.slice(rootCopy, source.indexOf("});", rootCopy));
    expect(call, "every shipped name must be excluded, whatever this run decided about it").toMatch(
      /exclude: \[\.\.\.SHIPPED_WORKFLOW_NAMES\]/,
    );
  });
});

describe("a run with nothing to copy is not a directory swap", () => {
  // Review finding [139], and a regression the identity fix introduced. On a fresh clone where
  // both shipped workflows are `declined` and `.github` does not exist, nothing is copied and
  // no directory is created — but the pre-copy reading is `[null, null]`, not `undefined`.
  // Making an absent component a refusal turned that ordinary no-op into a reported swap, and
  // the operator was told their workflows may have been written outside the repository when
  // nothing had been written at all.
  //
  // Driven through `settleWorkflowAncestors` in both shapes, since that is the function whose
  // answer the caller reads.

  it("refuses an absent component, which is what the swap check is for", async () => {
    const fresh = await newTempDir();
    const absent = await initModule.workflowAncestorIdentity(fresh);
    expect(absent, "the premise: both components are absent").toEqual([null, null]);
    await mkdir(path.join(fresh, ".github", "workflows"), { recursive: true });
    expect(
      await initModule.settleWorkflowAncestors(fresh, absent ?? []),
      "a component that appeared after the copy is still refused — that half is the point",
    ).toBeUndefined();
  });

  it("does not ask the question at all when there is no copy to ask it about", async () => {
    // The caller's half, on the source: the refusal above is correct and must stay, so what
    // changed is that it is only consulted when a copy was attempted. A row that only checked
    // the refusal would have passed throughout the regression.
    const source = await readInitSource();
    const at = source.indexOf("const attemptedWorkflowCopy");
    expect(at, "the run must know whether it tried to copy anything").toBeGreaterThan(-1);

    const settleAt = source.indexOf("const settled =", at);
    const settleBlock = source.slice(settleAt, source.indexOf(";", settleAt));
    expect(
      settleBlock,
      "settling must be skipped when nothing was copied, or an ordinary no-op run reads as a swap",
    ).toMatch(/!attemptedWorkflowCopy/);

    const swappedAt = source.indexOf("const workflowsSwapped =", at);
    const swappedBlock = source.slice(swappedAt, source.indexOf(";", swappedAt));
    expect(
      swappedBlock,
      "and the swap verdict itself must require that a copy was attempted",
    ).toMatch(/attemptedWorkflowCopy/);
  });
});

describe("moving a file aside claims something nothing else can replace", () => {
  // Two findings on one mechanism, both about a claim on a watchable PATHNAME.
  //
  // [136]: the quarantine name was claimed with `open(..., "wx")`, the handle closed, and then
  // renamed onto. Between the close and the rename anything that can write the adopter's tree
  // could replace the claim, and `rename` destroys whatever is at the destination. The comment
  // above it said the claim made the name exclusive — it made it exclusive at the moment of the
  // claim, not at the moment of use.
  //
  // [138]: restoring fell back to `exists` then `rename` on a filesystem without hard links. A
  // check is not a guarantee, and a file created between the two was destroyed by the rename.
  //
  // Asserted on the SOURCE. Both are races between processes, with no in-process seam a fixture
  // can drive; what a row can pin is that the claim is a kind of object that cannot be replaced,
  // and that the overwrite is gone rather than narrowed.

  it("claims a directory, which mkdir refuses to create over", async () => {
    const source = await readInitSource();
    const at = source.indexOf("async function quarantineEntry(");
    expect(at, "the quarantine helper must exist").toBeGreaterThan(-1);
    const body = source.slice(at, source.indexOf("\n}", at));

    expect(
      body,
      "the claim must be a directory: `mkdir` fails when the name is taken, and the move then " +
        "targets a path inside it that nothing else knows the name of",
    ).toMatch(/await mkdir\(quarantineDir\)/);
    expect(
      body,
      "and NOT recursively, which succeeds on an existing directory — exactly the case this " +
        "has to refuse",
    ).not.toMatch(/mkdir\(quarantineDir, \{[^}]*recursive/);
    expect(
      body,
      "a filename claimed with `wx` is exclusive when claimed and not when used",
    ).not.toMatch(/open\(quarantinePath/);
    expect(body, "and the move must land inside that directory").toMatch(
      /path\.join\(quarantineDir, base\)/,
    );
  });

  it("restores by link only, so a name somebody else took is never overwritten", async () => {
    const source = await readInitSource();
    const at = source.indexOf("async function restoreQuarantined(");
    expect(at, "the restore helper must exist").toBeGreaterThan(-1);
    const body = source.slice(at, source.indexOf("\n}", at));

    expect(
      body,
      "link is the mechanism: it fails when the destination exists, where rename replaces it",
    ).toMatch(/await link\(/);
    expect(
      body,
      "and there must be no rename fallback — an `exists` check is not a guarantee, and the " +
        "file created between the two is the one it destroys",
    ).not.toMatch(/rename\(/);
    expect(
      body,
      "with the outcome reported, because a refusal nobody hears is a file that quietly moved",
    ).toMatch(/return false;/);
  });

  it("stops the run when a file could not be put back, naming where it is", async () => {
    const source = await readInitSource();
    const at = source.indexOf("export async function pruneMatchingEntries(");
    const body = source.slice(at, source.indexOf("\n}", at));
    expect(body, "a failed restore must be collected rather than dropped").toMatch(
      /stranded\.push/,
    );
    expect(
      body,
      "and the run must stop naming them: they are recoverable only while somebody knows " +
        "where they are",
    ).toMatch(/stranded\.length > 0/);
  });
});
