/**
 * The fixtures both hygiene-lane suites plant with.
 *
 * They lived inside `workflowHygiene.test.ts` until that file reached 145 rows, each spawning
 * the lane as a child process — the heaviest file in the suite, and twice the last thing
 * `node-floor` was running when its vitest worker timed out reporting task updates with every
 * test passing. One long file is one long-running worker; splitting it gives two shorter ones,
 * and the fixtures had to come out for the second file to plant anything.
 *
 * Nothing here asserts. These are the tree, the declaration and the lane invocation; the rows
 * that use them live in `workflowHygiene.test.ts` and `workflowHygieneRequiredContext.test.ts`.
 */
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DIGESTED_LANE_INPUTS_REL } from "../../helpers/shippedWorkflowFixtures.js";
export const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  // One level deeper than the suites that use it: `tests/scripts/helpers/` rather than
  // `tests/scripts/`. Measured when the split first ran — every planted tree was built from
  // `packages/` and 139 rows failed on a missing `.github`.
  "..",
  "..",
  "..",
  "..",
  "..",
);

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const LANE = path.join(REPO_ROOT, "scripts", "check-workflow-hygiene.mjs");

/** The shipped workflows tree, relative to the repository root. */
export const SHIPPED_WORKFLOWS_REL = path.join(
  "packages",
  "qfai",
  "assets",
  "init",
  "root",
  ".github",
  "workflows",
);

/** A throwaway copy of the own `.github` tree, for planting violations into. */
export function plantedTree(mutate: (dir: string) => void): string {
  const dir = mkdtempSync(path.join(tmpdir(), "qfai-hygiene-"));
  cpSync(path.join(REPO_ROOT, ".github"), path.join(dir, ".github"), { recursive: true });
  // The shipped workflows too, because the lane scans BOTH roots. Copying only the own tree
  // would make every shipped-tree row prove nothing: the lane would find no shipped files and
  // report no shipped findings, which is indistinguishable from a passing shipped tree.
  cpSync(path.join(REPO_ROOT, SHIPPED_WORKFLOWS_REL), path.join(dir, SHIPPED_WORKFLOWS_REL), {
    recursive: true,
  });
  // And everything else the lane's body digest reads: the manifests it resolves package scripts
  // out of, and the script directories whose file contents it hashes. `run: pnpm ci:build-verify`
  // is a reference and `run: bash .../check-no-internal-version-leakage.sh` is another, and
  // review findings [36] and [42] each measured that pinning a reference pins the pointer rather
  // than the work. A planted tree without all of it is a tree where every declared body resolves
  // to nothing, so every required-context row would report a mismatch it was not planted to
  // produce.
  for (const input of DIGESTED_LANE_INPUTS_REL) {
    mkdirSync(path.dirname(path.join(dir, input)), { recursive: true });
    cpSync(path.join(REPO_ROOT, input), path.join(dir, input), { recursive: true });
  }
  mutate(dir);
  return dir;
}

export type LaneRun = { exitCode: number; output: string };

/**
 * Runs the lane against a tree and returns its exit code and combined output.
 *
 * `status` is mapped to -1 when the child was killed by a signal rather than
 * exiting, so a crashed lane stays distinguishable from a lane that reported a
 * violation. A `?? 1` here would let a crash satisfy every row that expects 1 —
 * which is exactly how a missing script would have passed these rows.
 */
export function runLane(root: string): LaneRun {
  const r = spawnSync(process.execPath, [LANE, "--root", root], { encoding: "utf-8" });
  return {
    exitCode: r.status ?? -1,
    output: `${r.stdout ?? ""}${r.stderr ?? ""}`,
  };
}

/** The same lane, asked for the reviewer artifact. */
export function runLaneWithReport(root: string, reportRel: string): LaneRun {
  const r = spawnSync(process.execPath, [LANE, "--root", root, "--report-dir", reportRel], {
    encoding: "utf-8",
  });
  return {
    exitCode: r.status ?? -1,
    output: `${r.stdout ?? ""}${r.stderr ?? ""}`,
  };
}

/** Rewrites one workflow file inside a planted tree. */
export function editWorkflow(dir: string, file: string, edit: (text: string) => string): void {
  const p = path.join(dir, ".github", "workflows", file);
  const before = readFileSync(p, "utf-8");
  const after = edit(before);
  if (after === before) {
    throw new Error(`planting into ${file} changed nothing — the needle is stale`);
  }
  writeFileSync(p, after, "utf-8");
}

export const DECLARATION_REL = path.join(".github", "required-status-contexts.json");

/** The rule id every declaration finding carries. */
export const DECLARATION_RULE = "required-context";

export interface Declaration {
  contexts: {
    workflow: string;
    job: string;
    verificationSet: string[];
    /**
     * Item name -> digest of that step's `run` / `uses` / `with`.
     *
     * Optional in the TYPE and required in the LANE, which is the distinction review finding [24]
     * turned on: a context that omits an item's digest is a declaration the lane must reject, so the
     * shape has to be expressible here in order to be planted.
     */
    verificationBodies?: Record<string, string>;
    /**
     * The pinned dependency topology: which lanes reach the verdict, which may skip and on
     * what, and how the value they skip on is wired. Optional here and required by the lane,
     * for the reason `verificationBodies` is: a declaration that omits one is a declaration
     * these rows have to be able to plant.
     */
    dependencies?: string[];
    dependencyConditions?: Record<string, string>;
    gateOutputs?: Record<string, Record<string, string>>;
    commandFiles?: string[];
    preflight?: { job?: string; step?: string; mayPrecede?: string[] };
    gatedVerifications?: Record<string, string>;
    nestedActions?: string[];
    dependencyMatrices?: Record<string, Record<string, string[]>>;
    pinnedBytes?: Record<string, string>;
    installLifecycle?: Record<string, Record<string, string>>;
    closureActions?: string[];
  }[];
  // Everything else the artifact carries — `$comment` today — travels through untouched.
  [key: string]: unknown;
}

/**
 * One declared context, narrowed without an assertion.
 *
 * A predicate rather than a shape check followed by `as`: `CLAUDE.md` forbids the assertion, and
 * `filter` over a predicate is what lets the parsed objects through unchanged.
 *
 * It verifies exactly what the type claims, which the first version did not: it admitted a MISSING
 * `verificationSet` and non-string members under a type promising `string[]`. Measured — round 6
 * finding F-4 — `declaration()` accepted `{"contexts":[{"workflow":"ci.yml","job":"build"}]}` and
 * the first read of `verificationSet[0]` then raised a TypeError, so a row planting that shape
 * would have crashed with a stack trace instead of failing its claim. `tsc` never sees this file
 * (`tsconfig.json` includes `src/**` only) and eslint does not flag it, so the predicate is the
 * only thing standing between the declared type and the parsed JSON.
 */
export function isContext(value: unknown): value is Declaration["contexts"][number] {
  return (
    isRecord(value) &&
    typeof value["workflow"] === "string" &&
    typeof value["job"] === "string" &&
    Array.isArray(value["verificationSet"]) &&
    value["verificationSet"].every((item) => typeof item === "string")
  );
}

/** The declaration as the repository ships it. */
export function declaration(dir: string): Declaration {
  const parsed: unknown = JSON.parse(readFileSync(path.join(dir, DECLARATION_REL), "utf-8"));
  if (!isRecord(parsed) || !Array.isArray(parsed["contexts"])) {
    throw new Error("the declaration does not hold a contexts array");
  }
  // VALIDATED in place, not rebuilt, and the WHOLE parsed object is returned.
  //
  // Two rounds of getting this wrong, both recorded because the second looked like a fix for the
  // first. `as Declaration` let every caller trust a shape only `contexts` had been checked for.
  // Replacing it with a REBUILD returned freshly constructed contexts carrying only the three
  // checked fields, and `editDeclaration` writes the result back — so planting stripped `why` and
  // `verificationSetNote` from each context (round 5 finding F8). Fixing that at the context level
  // left the ROOT stripped: `{ contexts }` dropped the top-level `$comment`, measured at 2692
  // bytes down to 1533, taking the eleven-line block that explains why the file exists at all
  // (round 6 finding F-3).
  //
  // A planted tree is presented as a copy of the shipped artifact. The lane reads none of these
  // fields, so nothing asserts differently and every loss was invisible — which is the reason to
  // fix it rather than the reason not to.
  const raw = parsed["contexts"];
  for (const [i, entry] of raw.entries()) {
    if (!isContext(entry)) {
      throw new Error(
        `declaration context ${i} lacks a string workflow, a string job, or a verificationSet of strings`,
      );
    }
  }
  // `filter` over the predicate rather than a rebuild or an `as`: it narrows the array type and
  // hands back the SAME objects. Spreading `parsed` keeps everything beside `contexts`.
  return { ...parsed, contexts: raw.filter(isContext) };
}

/**
 * The FIRST declared context, narrowed.
 *
 * Every row below reads the first context, and under `noUncheckedIndexedAccess` that index
 * is `Context | undefined` — so each read either needed an assertion the project rules
 * forbid, or had to stay outside the type check. Throwing here keeps the narrowing honest:
 * a declaration with an empty `contexts` array is a broken fixture, and a broken fixture
 * must fail loudly rather than read as a passing row.
 */
export function firstContext(dir: string): Declaration["contexts"][number] {
  const [first] = declaration(dir).contexts;
  if (first === undefined) {
    throw new Error("the declaration holds an empty contexts array");
  }
  return first;
}

/** The first item of the first context's verification set, narrowed the same way. */
export function firstVerificationItem(dir: string): string {
  const [item] = firstContext(dir).verificationSet;
  if (item === undefined) {
    throw new Error("the declared context holds an empty verificationSet");
  }
  return item;
}

/**
 * The first context of a declaration OBJECT being edited in place, narrowed.
 *
 * The sibling above reads a declaration off disk; this one narrows one already in hand,
 * so a planting edit mutates the real object rather than a copy. Same reason for the
 * throw: an empty `contexts` array means the fixture no longer plants what the row claims.
 */
export function onlyContext(decl: Declaration): Declaration["contexts"][number] {
  const [first] = decl.contexts;
  if (first === undefined) {
    throw new Error("the declaration holds an empty contexts array");
  }
  return first;
}

/** Rewrites the declaration inside a planted tree. */
export function editDeclaration(dir: string, edit: (d: Declaration) => Declaration): void {
  const before = declaration(dir);
  const after = edit(structuredClone(before));
  if (JSON.stringify(after) === JSON.stringify(before)) {
    throw new Error("planting into the declaration changed nothing — the edit is stale");
  }
  writeFileSync(path.join(dir, DECLARATION_REL), `${JSON.stringify(after, null, 2)}\n`, "utf-8");
}
