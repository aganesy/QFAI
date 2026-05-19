/**
 * `qfai prototyping iterate --cycle <n>` CLI command.
 *
 * Single-thread evolution loop driver. The skill (`/qfai-prototyping`)
 * calls this command before each iteration:
 *
 *   - At cycle 0: parses + hashes the root DESIGN.md, persists the
 *     `designMd: { path, sha256 }` record into `prototyping.json`, then
 *     assigns paths for the seed iteration. Requires `--target-url` so
 *     the capture role knows where to load the prototype HTML from.
 *   - At cycle >= 1: re-hashes the root DESIGN.md and compares it to
 *     `prototyping.json#designMd.sha256`; mismatch => exit 2. Then
 *     checks the latest iteration in `prototyping.json#iterations[]`
 *     against the deterministic stop condition (shouldStop()) and exits
 *     64 (convergence) or 65 (max-iterations) when applicable.
 *     Otherwise assigns paths for the next iteration and exits 0 to
 *     signal "continue".
 *
 * Exit codes:
 *   0   continue to this cycle
 *   64  STOP: all 4 axes exceptional + lap=0 + dmv=0 in the latest iter
 *   65  STOP: latest iter index === MAX_ITERATION_INDEX (9)
 *   2   input error (--cycle out of range, missing --target-url at cycle 0,
 *       no UI-bearing specs found, DESIGN.md missing/malformed/changed,
 *       prototyping.json#designMd missing on cycle >= 1, etc.)
 *
 * Per-cycle artifact: writes `iter-NN/iterate-plan.json` so the capture
 * role and the next generator step both have a single document
 * referencing the assigned paths, target URL, and DESIGN.md tokens
 * (Tailwind config shape).
 */

import { mkdir, readdir, readFile, rm, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { error, info } from "../lib/logger.js";
import { loadConfig } from "../../core/config.js";
import { hashDesignMd, parseDesignMd, type DesignMd } from "../../core/design/designMd.js";
import { readDesignMdLockSha } from "../../core/design/designMdLock.js";
import { isEnoent } from "../../core/fs/errno.js";
import { COMPLETION_CERTIFICATE_REL_PATH } from "../../core/prototyping/certificate.js";
import {
  findDesignMdViolations,
  type DesignMdViolation,
} from "../../core/prototyping/designMdViolations.js";
import { PROTOTYPING_EVIDENCE_REL, PROTOTYPING_JSON_REL } from "../../core/prototyping/paths.js";
import { resolvePrimaryPrototypingSpec } from "../../core/prototyping/specResolution.js";
import { readFrozenSpecsCovered } from "../../core/prototyping/specsCovered.js";
import {
  MAX_ITERATIONS,
  MAX_ITERATION_INDEX,
  iterationDir,
  iterationReviewPath,
  iterationHtmlPath,
  iterationScreenshotPath,
  shouldStop,
  type StopReason,
} from "../../core/prototyping/iteration.js";

export type RunPrototypingIterateOptions = {
  root: string;
  cycle: number;
  targetUrl?: string;
};

export type DesignTokens = {
  colors: Record<string, string>;
  fontFamily: Record<string, string>;
  borderRadius: Record<string, string>;
  boxShadow: Record<string, string>;
};

export type IteratePlan = {
  cycle: number;
  specs: string[];
  paths: {
    iterationDir: string;
    reviewJson: string;
    /**
     * Per-screen evidence path templates. Use `{screen}` as the
     * placeholder; the capture role substitutes the actual screen-id
     * from `.qfai/contracts/ui/*.yaml` before invoking playwright-cli.
     */
    htmlTemplate: string;
    screenshotTemplate: string;
  };
  targetUrl: string | null;
  designTokens: DesignTokens;
  nextActions: string[];
};

const ROOT_DESIGN_MD_REL = "DESIGN.md";

type DesignMdRecord = {
  path: string;
  sha256: string;
};

type PrototypingJsonShape = {
  iterations?: unknown[];
  designMd?: DesignMdRecord;
  runId?: string;
  specsCovered?: unknown;
  reviewerGate?: unknown;
  acceptedIterationIndex?: unknown;
  stopReason?: unknown;
  fullHarness?: unknown;
  [key: string]: unknown;
};

export async function runPrototypingIterate(
  options: RunPrototypingIterateOptions,
): Promise<number> {
  if (
    !Number.isInteger(options.cycle) ||
    options.cycle < 0 ||
    options.cycle > MAX_ITERATION_INDEX
  ) {
    error(
      `qfai prototyping iterate: --cycle must be 0..${MAX_ITERATION_INDEX} (got ${String(options.cycle)}).`,
    );
    return 2;
  }

  // 1) Read + hash root DESIGN.md FIRST (before any per-cycle plumbing).
  //    A malformed DESIGN.md is a structural project error and must
  //    fail before --target-url checks or convergence reads.
  const designMdAbs = path.join(options.root, ROOT_DESIGN_MD_REL);
  const designMdRead = await readDesignMdFile(designMdAbs);
  if (!designMdRead.ok) {
    error(designMdRead.message);
    return 2;
  }
  const currentSha = hashDesignMd(designMdRead.text);
  const designMd: DesignMd = designMdRead.data;

  const configResult = await loadConfig(options.root);

  // The SDD lock (`DESIGN.md.lock.yaml#designMdSha256`) is the single
  // source of truth for the frozen brand SSOT. Iterate consults it on
  // EVERY cycle — not just cycle 0 — so that prototyping.json acts as a
  // cache of the lock value, never as an independent SHA store.
  // A missing lock file is allowed (fresh project that has not yet run
  // /qfai-sdd Phase 0); a present-but-malformed lock is a fail-fast
  // condition because the SDD precondition is broken.
  const lockResult = await readDesignMdLockGate(
    options.root,
    configResult.config.paths.contractsDir,
  );
  if (lockResult.kind === "malformed") {
    error(
      "qfai prototyping iterate: DESIGN.md.lock.yaml exists but " +
        "designMdSha256 is missing or not a 64-character hex string. " +
        "Re-run /qfai-sdd Phase 0 to regenerate the lock.",
    );
    return 2;
  }
  if (lockResult.kind === "unreadable") {
    const cause =
      lockResult.cause instanceof Error ? lockResult.cause.message : String(lockResult.cause);
    error(
      "qfai prototyping iterate: DESIGN.md.lock.yaml exists but could not be read " +
        `(${cause}). The freeze invariant cannot be enforced when the lock is ` +
        "unreadable; fix file permissions / EIO and rerun.",
    );
    return 2;
  }
  const lockSha = lockResult.kind === "ok" ? lockResult.sha256 : null;
  if (lockSha !== null && lockSha !== currentSha) {
    error(
      "qfai prototyping iterate: root DESIGN.md sha256 differs from " +
        `DESIGN.md.lock.yaml — lock=${lockSha} current=${currentSha}. ` +
        "DESIGN.md was edited after the SDD freeze; re-run /qfai-sdd Phase 0 to refreeze.",
    );
    return 2;
  }

  const resolved = await resolvePrimaryPrototypingSpec(options.root, configResult.config);
  if (!resolved) {
    error(
      "qfai prototyping iterate: no primary UI-bearing prototyping spec found. " +
        "Set qfai.config.yaml: prototyping.primarySpecId, or add `surface_type: ui-bearing` " +
        "to one of your specs' 01_Spec.md.",
    );
    return 2;
  }
  const specs = [resolved.specId];

  const protoJsonAbs = path.join(options.root, PROTOTYPING_JSON_REL);

  // 2) Cycle >=1: enforce hash gate against the lock-anchored cache in
  //    prototyping.json. The lock equality (above) plus the cache
  //    equality (here) jointly enforce a 3-way invariant
  //    (live === lock === cache) without the cache becoming a third
  //    independent SHA SSOT.
  if (options.cycle >= 1) {
    const protoRecord = await readPrototypingJson(protoJsonAbs);
    if (!protoRecord || !protoRecord.designMd || typeof protoRecord.designMd.sha256 !== "string") {
      error(
        "qfai prototyping iterate: prototyping.json#designMd is missing. " +
          "Re-run from cycle 0 so the seed cycle records the DESIGN.md sha256.",
      );
      return 2;
    }
    if (protoRecord.designMd.sha256 !== currentSha) {
      error(
        "qfai prototyping iterate: root DESIGN.md sha256 mismatch — frozen=" +
          `${protoRecord.designMd.sha256} current=${currentSha}. ` +
          "DESIGN.md was edited mid-loop; re-run prototyping from cycle 0 to refreeze.",
      );
      return 2;
    }
    if (lockSha !== null && protoRecord.designMd.sha256 !== lockSha) {
      error(
        "qfai prototyping iterate: prototyping.json#designMd.sha256 (" +
          `${protoRecord.designMd.sha256}) differs from DESIGN.md.lock.yaml ` +
          `(${lockSha}). The lock was refrozen mid-loop; re-run prototyping from cycle 0.`,
      );
      return 2;
    }
    const recordedIterations = asIterations(protoRecord);
    const stop = shouldStop(recordedIterations);
    if (stop !== null) {
      // codex 8thM: shouldStop accepts the reviewer-recorded
      // `designMdViolations: []` at face value, but the shipped reviewer
      // prompt instructs reviewers to leave that field empty unless a
      // runtime gate injects findings — and the only runtime scanner
      // historically lived in `certify`. So a prototype with DESIGN.md
      // drift could converge here ("axes-exceptional") and only fail
      // later at certification. Re-run the runtime scanner against the
      // accepted iteration's HTML before honoring the stop, so iterate
      // continues another iteration to fix the drift instead of
      // pretending the loop converged.
      if (stop === "axes-exceptional") {
        const recomputed = await recomputeFinalIterDesignMdViolations(
          options.root,
          recordedIterations.length - 1,
          designMd,
        );
        const first = recomputed[0];
        if (first !== undefined) {
          // codex AG08r: max-budget drift edge case. If the last iter is
          // already at MAX_ITERATION_INDEX (cycle 9), there is no valid
          // next cycle (--cycle is capped at 9). Falling through to the
          // expectedNextCycle gate would then exit 2 with a cycle-mismatch
          // error, blocking the operator from completing a run that
          // exhausted the iteration budget with drift still present. In
          // that case emit the max-iterations stop instead — the loop
          // truly is over (drift or not), and the recovery is `--cycle 0`
          // restart, not another within-budget cycle.
          const lastIter = recordedIterations[recordedIterations.length - 1];
          const lastIndex =
            isRecord(lastIter) && typeof lastIter.index === "number" ? lastIter.index : -1;
          if (lastIndex >= MAX_ITERATION_INDEX) {
            info(
              "qfai prototyping iterate: review reported convergence but the " +
                `accepted iter HTML still contains ${recomputed.length} DESIGN.md violation(s) ` +
                `AND the iteration budget is exhausted (index=${lastIndex}). ` +
                `First violation: ${first.kind}=${first.found}. ` +
                "Run `qfai prototyping iterate --cycle 0 --target-url <url>` to restart the loop.",
            );
            return emitStop("max-iterations");
          }
          info(
            "qfai prototyping iterate: review reported convergence but the " +
              `accepted iter HTML still contains ${recomputed.length} DESIGN.md violation(s); ` +
              "continuing another iteration to fix drift. " +
              `First violation: ${first.kind}=${first.found}.`,
          );
          // Fall through to the next-cycle plan below (no early return).
        } else {
          return emitStop(stop);
        }
      } else {
        return emitStop(stop);
      }
    }
    // Defense-in-depth: confirm the recorded loop history is itself
    // monotonic before deriving the expected next cycle from its
    // length. A hand-edited or partially-corrupted `prototyping.json`
    // could carry e.g. `iterations.length === 3` but
    // `iterations[2].index === 5`; in that case `length` is no longer
    // the next-cycle index and the validator's per-index check would
    // reject the next iter with a delayed error. Catch the corrupt
    // history at the command boundary instead.
    const gapIndex = recordedIterations.findIndex((it, i) => {
      if (!isRecord(it)) return true;
      return it.index !== i;
    });
    if (gapIndex !== -1) {
      error(
        `qfai prototyping iterate: prototyping.json#iterations[${gapIndex}].index ` +
          `is not ${gapIndex}; the loop history is corrupted. ` +
          "Re-run with `--cycle 0 --target-url <url>` to refreeze the loop.",
      );
      return 2;
    }
    // Reject out-of-sequence cycle requests. `iterations[i].index === i`
    // is enforced by the validator (QFAI-PROT-* index-monotonicity), so
    // jumping straight to `--cycle 3` after only `iter-00` was recorded
    // would create an `iter-03/iterate-plan.json` that the validator
    // later rejects, blocking validation/certification with a
    // not-easy-to-read error. Fail up front instead. The check runs
    // AFTER `shouldStop` so a converged or max-budget loop returns its
    // stop reason cleanly even when the seed lineage is sparse.
    const expectedNextCycle = recordedIterations.length;
    if (options.cycle !== expectedNextCycle) {
      error(
        `qfai prototyping iterate: expected --cycle ${expectedNextCycle} ` +
          `(iterations.length=${recordedIterations.length}); got --cycle ${options.cycle}. ` +
          "Re-run with the expected cycle, or restart the loop with " +
          "`--cycle 0 --target-url <url>`.",
      );
      return 2;
    }
    // Cycles >= 1 must reuse the frozen `specsCovered` from cycle 0.
    // If `prototyping.primarySpecId` or a UI-bearing marker has shifted
    // mid-loop, the resolved primary spec here would differ from the
    // recorded one, and iter-plan would write the NEW spec into
    // `iterate-plan.json#specs` while certify keeps reporting the
    // FROZEN one — meaning iterations can exercise spec B while the
    // certificate still claims spec A. Fail fast at the boundary.
    const frozenSpecs = readFrozenSpecsCovered(protoRecord);
    // `null` means the frozen seed is missing or malformed (absent
    // `specsCovered`, empty array, or non-string entries). Cycle 0
    // is responsible for writing the seed; if a cycle >= 1 invocation
    // arrives without one, the file was hand-edited or partially
    // corrupted between cycles. Proceeding silently would let
    // iterate write a spec id into `iterate-plan.json` that is never
    // anchored against the cycle-0 seed — and certify (which reads
    // `specsCovered` for the certificate body) would later block on
    // the same gap. Fail fast here so the operator hits a single,
    // clear error pointing at the right remediation.
    if (frozenSpecs === null) {
      error(
        "qfai prototyping iterate: prototyping.json#specsCovered is missing or " +
          "malformed (must be a non-empty array of non-empty strings, seeded by " +
          "cycle 0). Re-run with `--cycle 0 --target-url <url>` to refreeze the loop.",
      );
      return 2;
    }
    // Compare element-wise. Today `specs` is always a single-element
    // array (resolved primary spec id), but `specsCovered` is a
    // multi-element array per the prototyping.json schema, and the
    // contract is "every covered spec must match across cycles". A
    // first-element-only check (`frozenSpecs[0] !== specs[0]`) would
    // silently let a future multi-spec loop drift on non-zero indices.
    if (!arraysShallowEqual(frozenSpecs, specs)) {
      error(
        "qfai prototyping iterate: prototyping.json#specsCovered (" +
          `${JSON.stringify(frozenSpecs)}) differs from the currently-resolved ` +
          `primary spec (${JSON.stringify(specs)}). ` +
          "The primary spec changed mid-loop; re-run with `--cycle 0 --target-url <url>` to refreeze.",
      );
      return 2;
    }
  }

  // 3) Cycle 0 requires --target-url so the seed generator knows where
  //    to write iter-00/index.html and the capture role knows where to
  //    point playwright-cli.
  if (options.cycle === 0 && !options.targetUrl) {
    error("qfai prototyping iterate --cycle 0: --target-url is required.");
    return 2;
  }

  // 4) Persist seed metadata to prototyping.json on cycle 0:
  //    - designMd { path, sha256 }: the lock-anchored cache used by
  //      cycle >= 1 hash gates and by `certify` (frozen-loop hash).
  //    - runId: the canonical loop identifier consumed by `certify`.
  //      The legacy `fullHarness.runId` shape is no longer written.
  //    - specsCovered: the spec IDs the loop will exercise, seeded
  //      from the resolved primary prototyping spec so that
  //      `validatePrototypingEvidence` (QFAI-PROT-002) does not
  //      emit a phantom missing-specsCovered error before the loop
  //      completes.
  if (options.cycle === 0) {
    await writeSeedMetadata(protoJsonAbs, {
      designMd: { path: ROOT_DESIGN_MD_REL, sha256: currentSha },
      runId: buildRunId(currentSha),
      specsCovered: specs,
    });
    // Defense-in-depth: stale `iter-NN/` directories from a prior loop
    // could otherwise survive on disk and bind certify to evidence the
    // current reviewer gate has not approved. Certify already anchors
    // its scan to prototyping.json#iterations[] (which we just reset),
    // but deleting the on-disk dirs guarantees no resolver can stumble
    // into them.
    //
    // codex AHzR5: fail closed when rm fails. Pre-fix this swallowed
    // the error and continued; the new loop reuses iter-NN/ and any
    // surviving subfile (Windows file lock / EACCES / EBUSY) gets
    // sealed into the next certificate's evidenceDigests. Surfacing
    // the failed dir + cause lets the operator clear the lock before
    // iterate writes the new plan.
    const rmResult = await deleteStaleIterDirs(path.join(options.root, PROTOTYPING_EVIDENCE_REL));
    if (!rmResult.ok) {
      const reason =
        rmResult.cause instanceof Error ? rmResult.cause.message : String(rmResult.cause);
      error(
        `qfai prototyping iterate --cycle 0: could not remove stale evidence at ${rmResult.failedDir} (${reason}). ` +
          "Clear the lock (Windows file lock / EACCES / EBUSY are common causes) and rerun. " +
          "certify is anchored to prototyping.json#iterations[]; if surviving files were sealed into a prior " +
          "completion-certificate.json the new runId will replace it on the next certify pass.",
      );
      return 2;
    }
    // Stale `completion-certificate.json` from a prior loop will be
    // overwritten on the next `qfai prototyping certify` run (the new
    // runId / digests will not match the old cert), but until then a
    // validator or AI consumer that reads the cert observes an
    // inconsistent state ("completion claimed" while iterations[] is
    // empty). Deleting the cert at cycle 0 keeps QFAI-PROT-335 / 336
    // (completion-claim integrity) honest across the reset window.
    await deleteStaleCompletionCertificate(
      path.join(options.root, COMPLETION_CERTIFICATE_REL_PATH),
    );
  }

  // 5) Assign paths and write iterate-plan.json.
  const dir = path.join(options.root, iterationDir(options.cycle));
  await mkdir(dir, { recursive: true });

  const plan: IteratePlan = {
    cycle: options.cycle,
    specs,
    paths: {
      iterationDir: iterationDir(options.cycle),
      reviewJson: iterationReviewPath(options.cycle),
      htmlTemplate: iterationHtmlPath(options.cycle, "{screen}"),
      screenshotTemplate: iterationScreenshotPath(options.cycle, "{screen}"),
    },
    targetUrl: options.targetUrl ?? null,
    designTokens: buildDesignTokens(designMd),
    nextActions: nextActionsFor(options.cycle),
  };

  await writeFile(
    path.join(dir, "iterate-plan.json"),
    `${JSON.stringify(plan, null, 2)}\n`,
    "utf-8",
  );

  info(
    `qfai prototyping iterate: iter-${String(options.cycle).padStart(2, "0")} ready ` +
      `(specs=${specs.length}, plan at ${plan.paths.iterationDir}/iterate-plan.json).`,
  );
  return 0;
}

type DesignMdReadResult =
  | { ok: true; text: string; data: DesignMd }
  | { ok: false; message: string };

type LockGateResult =
  | { kind: "ok"; sha256: string }
  | { kind: "missing" }
  | { kind: "malformed" }
  | { kind: "unreadable"; cause: unknown };

/**
 * Read the SDD-frozen sha256 from
 * `<contractsDir>/design/DESIGN.md.lock.yaml`.
 *
 * Distinguishes four outcomes so iterate can apply LSP-style
 * fail-fast on malformed / unreadable cases while still allowing
 * fresh projects (lock genuinely absent) to proceed:
 *
 *   - `ok`         — lock present and `designMdSha256` is valid
 *                    64-character hex
 *   - `missing`    — lock file does not exist on disk (ENOENT)
 *   - `malformed`  — lock file exists but does not parse as YAML, or
 *                    `designMdSha256` is missing / not 64 hex
 *   - `unreadable` — lock file exists but the read failed for a
 *                    non-ENOENT reason (e.g. EACCES / EPERM / EIO).
 *                    Fail-closed so the freeze invariant cannot be
 *                    silently bypassed by a permission flip.
 *
 * `qfai validate` and `qfai doctor` surface the SDD-precondition
 * issue (missing lock) via DCON-031.
 */
async function readDesignMdLockGate(root: string, contractsDir: string): Promise<LockGateResult> {
  const lockAbs = path.join(root, contractsDir, "design", "DESIGN.md.lock.yaml");
  let lockText: string;
  try {
    lockText = await readFile(lockAbs, "utf-8");
  } catch (err) {
    if (isEnoent(err)) return { kind: "missing" };
    return { kind: "unreadable", cause: err };
  }
  const sha = readDesignMdLockSha(lockText);
  return sha !== null ? { kind: "ok", sha256: sha } : { kind: "malformed" };
}

async function readDesignMdFile(absPath: string): Promise<DesignMdReadResult> {
  let text: string;
  try {
    text = await readFile(absPath, "utf-8");
  } catch {
    return {
      ok: false,
      message: `qfai prototyping iterate: root DESIGN.md is missing at ${ROOT_DESIGN_MD_REL}.`,
    };
  }
  const parsed = parseDesignMd(text);
  if ("error" in parsed) {
    return {
      ok: false,
      message:
        "qfai prototyping iterate: root DESIGN.md failed to parse — " +
        `${parsed.error.message} (path=${parsed.error.path || "<root>"}).`,
    };
  }
  return { ok: true, text, data: parsed.data };
}

async function readPrototypingJson(absPath: string): Promise<PrototypingJsonShape | null> {
  try {
    const raw = await readFile(absPath, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as PrototypingJsonShape;
  } catch {
    return null;
  }
}

function asIterations(record: PrototypingJsonShape): readonly unknown[] {
  // Return loose `unknown[]` and let `shouldStop()` perform per-element
  // narrowing. Avoid an array-level `as Iteration[]` cast that promises
  // a shape this loader does not actually verify.
  const iterations = record.iterations;
  return Array.isArray(iterations) ? iterations : [];
}

// User-defined type predicate so the gap-check above can read `.index`
// without a bare `as` cast (CLAUDE.md project rule: "avoid bare `as`
// type assertions; prefer type narrowing"). Equivalent to the
// `isRecord` helpers scattered across the codebase; left local here
// rather than re-exported from a SSOT module to keep the iterate
// command boundary self-contained.
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function arraysShallowEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

type SeedMetadata = {
  designMd: DesignMdRecord;
  runId: string;
  specsCovered: readonly string[];
};

async function writeSeedMetadata(protoJsonAbs: string, seed: SeedMetadata): Promise<void> {
  // Cycle 0 is a hard reset of the loop. Stale state from a prior run
  // (iterations[], reviewerGate, the prior runId) MUST NOT survive into
  // the new loop, otherwise shouldStop() can short-circuit on stale
  // exceptional scores and certify can reuse a stale reviewerGate to
  // seal a run that has no fresh evidence for the just-frozen DESIGN.md.
  // Preserve only operator-defined keys that have no per-loop semantics
  // (mode, surface, etc.); explicitly reset the per-loop state slots.
  let body: PrototypingJsonShape;
  try {
    const raw = await readFile(protoJsonAbs, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    body =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as PrototypingJsonShape)
        : {};
  } catch {
    body = {};
  }
  // Drop per-loop state — these must be re-generated by the new loop.
  // Per-loop slots: `iterations[]`, `reviewerGate`, `acceptedIterationIndex`,
  // `stopReason`, `fullHarness` (legacy pre-UX-loop block consumed by
  // QFAI-PROT-329 etc.), `completionClaimed` / `phase` / `completionCertificate`
  // (the completion-claim trio read by `validateCompletionCertificateIssues`),
  // `designMd`, `runId`, `specsCovered`. Adding a new per-loop field
  // requires updating BOTH this list AND the comment.
  body.iterations = [];
  delete body.reviewerGate;
  delete body.acceptedIterationIndex;
  delete body.stopReason;
  // Legacy `fullHarness` block (pre-UX-loop schema) is also per-loop
  // state. Pre-1.8.9 projects whose prototyping.json still carries
  // `fullHarness.{runId,status,scoringTrace,...}` must not let those
  // fields survive into a fresh loop, otherwise validate / report
  // surfaces (e.g. PROT-329) will display prior-loop completion data
  // alongside the new loop.
  delete body.fullHarness;
  // codex AGjFy: clear the completion-claim trio. Without this, restarting
  // a previously completed loop deletes `completion-certificate.json` from
  // disk but the in-memory claim fields (`completionClaimed: true`,
  // `phase: "completed"`, `completionCertificate: {...}`) survive in
  // `prototyping.json`, so `validateCompletionCertificateIssues` sees an
  // active completion claim and surfaces QFAI-PROT-335 ("certificate
  // missing") on the very first cycle of the fresh loop until the
  // operator hand-edits the state file.
  delete body.completionClaimed;
  delete body.phase;
  delete body.completionCertificate;
  // Cycle 0 always re-anchors designMd, runId, and specsCovered.
  // specsCovered is sourced from resolvePrimaryPrototypingSpec on every
  // cycle 0 — it is a per-loop slot, not an operator-defined one.
  body.designMd = seed.designMd;
  body.runId = seed.runId;
  body.specsCovered = [...seed.specsCovered];
  await mkdir(path.dirname(protoJsonAbs), { recursive: true });
  await writeFile(protoJsonAbs, `${JSON.stringify(body, null, 2)}\n`, "utf-8");
}

type DeleteStaleIterDirsResult = { ok: true } | { ok: false; failedDir: string; cause: unknown };

async function deleteStaleIterDirs(evidenceRootAbs: string): Promise<DeleteStaleIterDirsResult> {
  let entries: string[];
  try {
    entries = await readdir(evidenceRootAbs);
  } catch (err) {
    if (isEnoent(err)) return { ok: true };
    return { ok: false, failedDir: evidenceRootAbs, cause: err };
  }
  for (const name of entries) {
    if (!/^iter-\d{2,}$/.test(name)) continue;
    const abs = path.join(evidenceRootAbs, name);
    // Restrict the cleanup to actual directories: a stray `iter-NN`
    // file (e.g. an operator artifact saved without an extension)
    // would otherwise be deleted by `rm({recursive,force})` despite
    // the function name promising dir-only. Skipping non-dirs is
    // safe; the resolver does not look at non-dir entries either.
    let isDir: boolean;
    try {
      const s = await stat(abs);
      isDir = s.isDirectory();
    } catch (err) {
      if (isEnoent(err)) continue;
      return { ok: false, failedDir: abs, cause: err };
    }
    if (!isDir) continue;
    try {
      await rm(abs, { recursive: true, force: true });
    } catch (err) {
      // codex AHzR5: pre-fix this only logged and continued, but the
      // new loop reuses the same iter-NN/ dir. `certify` only treats
      // dirs whose index is >= iterations.length as stale; files that
      // survive INSIDE a reused iter-00/ (because capture writes only
      // the screens it knows about and any extra files persist) get
      // sealed into the new certificate's evidenceDigests. The fix is
      // to fail closed: surface the rm failure as a hard error so the
      // operator clears the lock (Windows file lock / EACCES / EBUSY)
      // before iterate writes the new plan. The hint at the call site
      // names the offending dir + cause so the operator can act
      // immediately.
      return { ok: false, failedDir: abs, cause: err };
    }
  }
  return { ok: true };
}

async function deleteStaleCompletionCertificate(certAbs: string): Promise<void> {
  try {
    await unlink(certAbs);
  } catch (err) {
    if (isEnoent(err)) return; // not present; nothing to clear
    // Best-effort cleanup with eventually-consistent backstop: the next
    // `qfai prototyping certify` run rewrites the cert atomically and
    // its `--check` mode re-validates digests against the evidence
    // root, so a surviving stale cert cannot pass certify with the
    // new loop's digests. The risk window we mitigate here is an AI
    // / validator that reads the cert BETWEEN cycle 0 and the next
    // certify run and reads prior-loop signoff. `info()` (not
    // `error()`) is intentional — promoting to `error()` + `return 2`
    // would block iterate on what is operationally a transient OS
    // condition (Windows file lock, EACCES, EBUSY). Operators see
    // the hint and can act before consumers read the stale cert.
    const reason = err instanceof Error ? err.message : String(err);
    info(
      `qfai prototyping iterate: could not remove stale completion-certificate.json (${reason}). ` +
        "the next `qfai prototyping certify` run will overwrite it; consumers reading the cert " +
        "during the reset window may observe the prior loop's signoff.",
    );
  }
}

function buildRunId(designMdSha: string): string {
  return `loop-${designMdSha.slice(0, 12)}-${Date.now().toString(36)}`;
}

/**
 * Re-run the runtime DESIGN.md drift scanner against every `*.html`
 * file in the accepted iteration's evidence dir.
 *
 * codex 8thM: shouldStop honors the reviewer-recorded
 * `designMdViolations: []` at face value, but the shipped reviewer
 * prompt instructs reviewers NOT to author that field directly — only
 * runtime gates inject findings. Without this re-scan, a prototype with
 * Tailwind arbitrary-value drift (or any other CSS drift the reviewer
 * cannot detect from prose) converges here, and only fails later at
 * certify. Re-scanning at the iterate-stop boundary lets the loop
 * continue another iteration to fix drift instead of pretending it
 * converged.
 */
async function recomputeFinalIterDesignMdViolations(
  root: string,
  iterationIndex: number,
  designMd: DesignMd,
): Promise<DesignMdViolation[]> {
  if (iterationIndex < 0) return [];
  const iterDirAbs = path.join(
    root,
    PROTOTYPING_EVIDENCE_REL,
    `iter-${String(iterationIndex).padStart(2, "0")}`,
  );
  let names: string[];
  try {
    names = await readdir(iterDirAbs);
  } catch (err) {
    if (isEnoent(err)) return [];
    throw err;
  }
  const out: DesignMdViolation[] = [];
  for (const name of names.sort()) {
    if (!name.toLowerCase().endsWith(".html")) continue;
    const abs = path.join(iterDirAbs, name);
    let s: Awaited<ReturnType<typeof stat>>;
    try {
      s = await stat(abs);
    } catch {
      continue;
    }
    if (!s.isFile()) continue;
    let html: string;
    try {
      html = await readFile(abs, "utf-8");
    } catch {
      continue;
    }
    out.push(...findDesignMdViolations(html, designMd));
  }
  return out;
}

function buildDesignTokens(dm: DesignMd): DesignTokens {
  return {
    colors: { ...dm.visual.colors },
    fontFamily: {
      sans: dm.visual.typography.family_sans,
      display: dm.visual.typography.family_display,
      mono: dm.visual.typography.family_mono,
    },
    borderRadius: { ...dm.visual.radius },
    boxShadow: { ...dm.visual.shadow },
  };
}

function emitStop(reason: StopReason): number {
  if (reason === "axes-exceptional") {
    info(
      "qfai prototyping iterate: convergence reached (all 4 axes exceptional, " +
        "layoutAntiPatternsDetected=[], designMdViolations=[]). " +
        "Run `qfai prototyping certify` to seal the run.",
    );
    return 64;
  }
  info(
    `qfai prototyping iterate: max iterations (${MAX_ITERATIONS}) reached. ` +
      "Run `qfai prototyping certify` to seal the run.",
  );
  return 65;
}

function nextActionsFor(cycle: number): string[] {
  if (cycle === 0) {
    return ["generator-seed", "capture", "review", "iterate --cycle 1"];
  }
  if (cycle >= MAX_ITERATION_INDEX) {
    return ["generator-iterate", "capture", "review", "handoff", "certify"];
  }
  return ["generator-iterate", "capture", "review", `iterate --cycle ${cycle + 1}`];
}
