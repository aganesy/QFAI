/**
 * Shared fixtures for the installed shipped-workflow drift suites.
 *
 * The adopter tree is produced by a real `qfai init` into a pooled temp
 * directory, so `.github/workflows/` and the install-provenance record hold
 * whatever the shipped write path actually produces rather than a hand-built
 * imitation of it. On top of that the mutations the drift suites need are
 * exposed: hand-edit an installed workflow, delete one, and make one
 * unreadable. Pure test plumbing — no assertions live here.
 *
 * NOTHING IN THIS REPOSITORY TYPE-CHECKS A TEST FILE, which is why every fixture
 * here is written to fail in the SAFE DIRECTION rather than left to be caught by
 * the compiler: the `tests` tree is outside the `include` of both tsconfigs
 * (measured — `tsc -b --force --listFiles` names 0 files under it) and the ROOT
 * `eslint.config.js` — repository root, unlike the package-local tsconfigs named
 * one clause earlier — puts `disableTypeChecked` on it. A renamed or an added
 * field is a silent change here, never a build failure, so a caller's
 * precondition has to be asserted at runtime; `deleteInstallProvenanceRecord`
 * below carries the pattern.
 *
 * The temp-directory pool is handed out by `useAdopterTreePool()` rather than
 * registered at this module's top level: `useTempDirPool` calls `afterEach`,
 * and a hook registered during module evaluation belongs to whichever suite
 * imported the module first. That is only invisible while vitest's
 * `isolate: true` default holds, and neither config file pins it. Every other
 * suite in this family calls the pool factory at its own top level.
 */
import { appendFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { runDoctor } from "../../src/cli/commands/doctor.js";
import { runInit } from "../../src/cli/commands/init.js";
import { readInstallProvenance, writeInstallProvenance } from "../../src/shared/provenance.js";
import { useTempDirPool } from "./shippedWorkflowFixtures.js";
import { captureStdout } from "./stdout.js";

/** The adopter-tree-relative POSIX directory QFAI installs workflows into. */
export const ADOPTER_WORKFLOWS_DIR = ".github/workflows";

/** Absolute path of one installed shipped workflow inside an adopter tree. */
export function adopterWorkflowPath(dir: string, name: string): string {
  return path.join(dir, ".github", "workflows", name);
}

export type AdopterTreePool = {
  /** Allocates an empty pooled temp directory. */
  newTempDir: () => Promise<string>;
  /**
   * Allocates a pooled temp directory carrying a real `qfai init` install.
   *
   * `preInit` runs against the still-empty directory, before the install. It
   * exists because some adopter-tree states are only reachable BEFORE the
   * installer runs: a file the create-only copy has to SKIP must predate the
   * copy, and that is the only way to produce the `adopter-owned` state of the
   * shipped-workflows contract (a colliding name with no provenance entry).
   * Writing the file afterwards would produce a different state — the copy
   * would already have written its own bytes and recorded the name.
   *
   * A callback here rather than a `runInit` call in the calling suite: the
   * install options are this module's single decision about how the adopter
   * tree is produced ("a real `qfai init`", per the header). A suite that
   * called `runInit` itself would own a second copy of that decision, and the
   * two could drift apart silently — the tree under one suite's assertions
   * would stop being the tree under every sibling's.
   */
  seedAdopterTree: (preInit?: (dir: string) => Promise<void>) => Promise<string>;
};

/**
 * Registers an afterEach-scoped temp-directory pool for the calling suite and
 * returns its allocators. Call this at the calling test file's top level.
 */
export function useAdopterTreePool(): AdopterTreePool {
  const newTempDir = useTempDirPool("qfai-wfint-");
  return {
    newTempDir,
    seedAdopterTree: async (preInit?: (dir: string) => Promise<void>): Promise<string> => {
      const dir = await newTempDir();
      await preInit?.(dir);
      await captureStdout(() => runInit({ dir, force: false, dryRun: false, yes: true }));
      return dir;
    },
  };
}

/**
 * Appends one comment line to an installed shipped workflow — the smallest
 * edit that still changes the file's content after newline normalization.
 */
export async function editShippedWorkflow(dir: string, name: string): Promise<void> {
  await appendFile(adopterWorkflowPath(dir, name), "# adopter hand edit\n", "utf-8");
}

/** Removes an installed shipped workflow from the adopter tree. */
export async function deleteShippedWorkflow(dir: string, name: string): Promise<void> {
  await rm(adopterWorkflowPath(dir, name), { force: true });
}

/**
 * The subset of the bare-install warnings a caller may ask to LEAVE standing.
 *
 * Narrower than the full five, and not by preference. `output.validateJson`
 * resolves under `paths.outDir`, so quieting the former creates the directory the
 * latter looks for: the two cannot be varied independently, and offering
 * `paths.outDir` here would hand back a tree with a warning count the caller did
 * not ask for. These three each answer a distinct probe with no shared operand.
 *
 * A `BARE_INIT_WARNING_IDS` constant stood here listing all five, with a docblock
 * arguing that a literal list makes a sixth default warning break a caller's
 * guard. It was deleted: nothing read it, `quietUnrelatedWarnings` hard-codes its
 * five repairs, and the guard that would actually break is the callers'
 * `failingIdsOtherThanDrift(...)` assertion, which never referenced it. The
 * argument was sound and the code did not implement it, which is worse than not
 * making the argument. The measured list survives as prose below.
 */
export type LeavableWarningId = "paths.srcDir" | "paths.testsDir" | "traceability.testGlobs";

/**
 * Brings a seeded adopter tree to `summary.warning === 0`, optionally leaving
 * exactly ONE named warning standing.
 *
 * The five warnings a bare `qfai init` tree leaves at `warning`, MEASURED on a
 * freshly seeded tree rather than reasoned about: `paths.srcDir`,
 * `paths.testsDir`, `paths.outDir`, `output.validateJson` and
 * `traceability.testGlobs` — on an install that reported success. They matter
 * because `--fail-on warning` reads `summary.warning + summary.error`, a whole-run
 * total with no per-check exclusions, so a row asserting exit 0 on that flag needs
 * every OTHER warning gone. `qfai init` alone does not deliver that state, which
 * is the opposite of what "a clean tree" suggests.
 *
 * Each repair is the minimum the check's own condition asks for, read from
 * `src/core/doctor.ts` rather than guessed:
 *
 * - `paths.*` tests `exists(resolved)`, so an empty directory answers it;
 * - `output.validateJson` tests `exists(validateJsonAbs)` and nothing else, so
 *   file CONTENT is out of scope — `{}` is written rather than a synthesized
 *   report, because a fixture that fabricates a plausible-looking validate.json
 *   invites a later reader to trust its numbers;
 * - `traceability.testGlobs` warns on `globs.length === 0`; with globs present the
 *   check only warns again when scenario files exist AND none match, and a tree
 *   with no `.qfai/specs` has no scenarios. So a non-empty list suffices and it
 *   does not have to match a real file.
 *
 * The config edit asserts its needle occurs exactly once and THROWS otherwise.
 * Nothing type-checks this tree and a silent no-op here would surface as a row
 * failing for a fixture reason with the fixture reported as applied — so it fails
 * loudly at the edit instead of quietly at the assertion.
 */
export async function quietUnrelatedWarnings(
  dir: string,
  options?: { leaveWarning?: LeavableWarningId },
): Promise<void> {
  const leave = options?.leaveWarning;

  if (leave !== "paths.srcDir") {
    await mkdir(path.join(dir, "src"), { recursive: true });
  }
  if (leave !== "paths.testsDir") {
    await mkdir(path.join(dir, "tests"), { recursive: true });
  }

  // `paths.outDir` and `output.validateJson` in one step, in that order: the
  // second cannot be satisfied without the first, which is why neither is
  // `LeavableWarningId`.
  await mkdir(path.join(dir, ".qfai", "report"), { recursive: true });
  await writeFile(path.join(dir, ".qfai", "report", "validate.json"), "{}", "utf-8");

  if (leave !== "traceability.testGlobs") {
    const configPath = path.join(dir, "qfai.config.yaml");
    const config = await readFile(configPath, "utf-8");
    const needle = "    testFileGlobs: []";
    const occurrences = config.split(needle).length - 1;
    if (occurrences !== 1) {
      throw new Error(
        `quietUnrelatedWarnings: expected exactly 1 "${needle}" in ${configPath}, found ${occurrences}`,
      );
    }
    await writeFile(
      configPath,
      config.replace(needle, () => "    testFileGlobs:\n      - tests/**/*.test.ts"),
      "utf-8",
    );
  }
}

/**
 * Removes the whole install-provenance record from the adopter tree, leaving
 * every installed file on disk. This is the state of an adopter who installed
 * before the record existed: no entry for any name, so every shipped name is
 * `adopter-owned` under the shipped-workflows contract's §3 enum.
 *
 * The record path is duplicated from `src/shared/provenance.ts`, whose
 * `PROVENANCE_SEGMENTS` is module-private. The duplication is safe in the
 * direction that matters: if the record ever moves, this `rm` deletes nothing,
 * the record survives, and every caller's "the record now reads empty"
 * precondition FAILS rather than passing on an unmutated tree. Callers assert
 * that precondition through `readInstallProvenance` for exactly that reason.
 */
export async function deleteInstallProvenanceRecord(dir: string): Promise<void> {
  await rm(path.join(dir, ".qfai", "install-provenance.json"), { force: true });
}

/**
 * Removes ONE name's entry from the install-provenance record, leaving every
 * other entry — and every file on disk — untouched. Paired with
 * `deleteShippedWorkflow` it produces the `absent` state of the
 * shipped-workflows contract's §3 enum (no entry AND nothing on disk) for a
 * name the running package still ships, inside a record that stays non-empty.
 *
 * Goes through the production reader and writer instead of duplicating the
 * record path as `deleteInstallProvenanceRecord` above does, since a targeted
 * edit needs the parsed record anyway. What that route costs, at least:
 *
 * - The round trip keeps only what the reader RETURNS and drops the rest: any
 *   top-level key beside `workflows` (contract §2 anticipates a second artifact
 *   kind — make this a targeted JSON edit in the change that adds one), and any
 *   per-entry field outside the three the reader validates, an entry missing
 *   one of which the reader drops whole.
 * - A name carrying no entry to begin with is a silent no-op, so callers assert
 *   the POSTCONDITION through `readInstallProvenance` rather than trust this.
 * - Whatever the reader treats as unusable — a record MISSING, UNREADABLE,
 *   MALFORMED or carrying no valid `workflows` object — arrives here as an EMPTY
 *   record, that reader being fail-safe by contract, and the write would then
 *   replace the adopter's file with `{"workflows": {}}`: destruction shaped like
 *   a no-op, against this module's safe direction. Measured before the
 *   precondition below existed, on a record holding `{ not json`: the call
 *   SUCCEEDED and left the pretty-printed empty record in its place, with no
 *   throw anywhere on the path. Emptiness is the only observable those states
 *   share once the reader has run, so the precondition keys on it and refuses
 *   empty-and-valid along with them, where the round trip changes nothing
 *   anyway. No shipped assertion covers the throw; that measurement is its
 *   only witness.
 */
export async function removeProvenanceEntry(dir: string, name: string): Promise<void> {
  const record = await readInstallProvenance(dir);
  if (Object.keys(record.workflows).length === 0) {
    throw new Error(
      `removeProvenanceEntry: the install-provenance record at ${dir} holds no entries ` +
        `(missing, unreadable, malformed or empty) — rewriting it would destroy it`,
    );
  }
  const kept = Object.entries(record.workflows).filter(([recorded]) => recorded !== name);
  await writeInstallProvenance(dir, { workflows: Object.fromEntries(kept) });
}

/**
 * Makes every read of one installed shipped workflow fail while its NAME
 * survives in the adopter tree, by destroying the file and putting a
 * directory of the same name in its place (`EISDIR`).
 *
 * The file itself is destroyed: only the NAME survives a directory read, and
 * it now names a directory. A subsequent `qfai init` neither repairs that nor
 * fails on it (measured, not assumed): the root template copy is create-only
 * regardless of `--force` — force reaches only `assistant/skills` and the
 * integration wrappers — and its existence probe is an `access()` that a
 * directory satisfies, so the name is SKIPPED, the directory survives, and no
 * provenance entry is added for it. A caller that needs a real file back at
 * that path must allocate a fresh tree instead of re-installing over this one.
 *
 * The realistic form of this state is a transient `EPERM` / `EBUSY` from an
 * editor lock or an AV scanner on Windows, which cannot be arranged
 * reliably from a test. `EISDIR` is the portable stand-in: what the reader
 * has to distinguish is `ENOENT` from every other code, so any non-`ENOENT`
 * code exercises the same branch.
 */
export async function makeShippedWorkflowUnreadable(dir: string, name: string): Promise<void> {
  const target = adopterWorkflowPath(dir, name);
  await rm(target, { force: true });
  await mkdir(target, { recursive: true });
}

/** One `runDoctor` invocation's exit code paired with everything it wrote to stdout. */
export type DoctorTextRun = { exitCode: number; stdout: string };

/**
 * Runs `qfai doctor --format text` over an adopter tree and hands back both of
 * the surfaces the invocation produces: the exit code it returns and the text it
 * rendered.
 *
 * ## Why this is how `shouldFailDoctor` is observed
 *
 * `shouldFailDoctor` is module-private in `src/cli/commands/doctor.ts` and this
 * helper deliberately does NOT ask for it to be exported. Its verdict is already
 * observable through the exported `runDoctor`, whose returned number is
 * `shouldFailDoctor(data.summary, options.failOn) ? 1 : 0` — one call site, one
 * `const exitCode`, and `? 1 : 0` is injective on booleans, so `exitCode === 0`
 * and a `false` verdict are the same observation. Widening the production surface
 * to reach a function whose whole output is already on an exported return value
 * would buy nothing.
 *
 * Scoped rather than absolute, because `runDoctor` has THREE `return` statements
 * (measured on `c66c502a`: `:148`, `:212`, `:216`; follow the symbols, an edit
 * above any of them moves the numbers). Two of them return that one `exitCode`.
 * The third is the `--autoremediate` CI-off early return, which returns a literal
 * `0` WITHOUT consulting `shouldFailDoctor` at all — a false verdict and that
 * early return are indistinguishable from the exit code alone. This helper never
 * sets `autoremediate`, which is what keeps that path out of reach; callers that
 * depend on the distinction should also guard on `stdout` carrying the rendered
 * `summary:` line, which only the diagnostic pass emits.
 *
 * `stdout` is captured rather than left to leak into the reporter because
 * `runDoctor` renders through `cli/lib/logger`'s `info`, i.e.
 * `process.stdout.write`, which is exactly what `captureStdout` swaps out. It is
 * returned rather than discarded so the rendered text is available to the row
 * that owns 2-group placement.
 *
 * `format: "text"` is fixed here, not a parameter: it is what TC-0006-0029's
 * Action names, and a `json` run renders a different document with the same exit
 * code. Add the parameter in the row that needs the other format.
 *
 * The `-1` seed fails in the SAFE DIRECTION, which this module's header explains
 * is the only direction available in a tree nothing type-checks: `runDoctor`
 * returns `0` or `1`, so a caller asserting either value FAILS on an assignment
 * that never happened instead of passing on a stale zero.
 */
export async function runDoctorText(
  dir: string,
  failOn?: "warning" | "error",
): Promise<DoctorTextRun> {
  let exitCode = -1;
  const stdout = await captureStdout(async () => {
    exitCode = await runDoctor({
      root: dir,
      rootExplicit: true,
      format: "text",
      ...(failOn ? { failOn } : {}),
    });
  });
  return { exitCode, stdout };
}
