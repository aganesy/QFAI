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

import type { Dirent } from "node:fs";
import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import { error, info, warn } from "../lib/logger.js";
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
import {
  resolvePrimaryPrototypingSpec,
  resolveSurfaceUnion,
} from "../../core/prototyping/specResolution.js";
import {
  checkSpecsCoveredDrift,
  readFrozenSpecsCovered,
} from "../../core/prototyping/specsCovered.js";
import {
  licenseVerify,
  type ImageSource,
  type LicenseCatalog,
} from "../../core/prototyping/licenseVerify.js";
import {
  MAX_ITERATIONS,
  MAX_ITERATION_INDEX,
  SEED_COMMIT_SHA,
  SEED_PROSE_CRITIQUE_PLACEHOLDER,
  SEED_REVIEWER_ID,
  iterationDir,
  iterationReviewPath,
  iterationHtmlPath,
  iterationScreenshotPath,
  isOrdinalScore,
  shouldStop,
  type OrdinalScore,
  type StopReason,
} from "../../core/prototyping/iteration.js";
import {
  applyLicensePatch,
  isLicensePatchAuditRow,
  parseLicensePatch,
  type LicensePatchAuditRow,
} from "../../core/prototyping/licensePatchAudit.js";
import {
  canonicalIterateContext,
  type IterateContext,
} from "../../core/prototyping/iterateContext.js";
import {
  buildBlockedSummary,
  type BlockedSummaryInput,
} from "../../core/prototyping/blockedSummary.js";
import {
  findMd5DuplicateCaptures,
  findMissingRoutes,
  type Lap010Input,
} from "../../core/prototyping/layoutAntiPatternsAdvisory.js";
import { parsePrimarySpecId } from "../../core/prototyping/primarySpecIdParse.js";
import { readUiContractScreenContracts } from "../../core/contracts/screenContracts.js";

/**
 * Per-screen descriptor consumed by the opt-in `--capture` flag.
 *
 * One entry per screen the operator wants captured this cycle. The
 * `htmlSourceCopy` flag, when true, instructs iterate to copy the
 * source HTML at `.qfai/prototypes/iter-NN/<id>.html` byte-for-byte
 * into the evidence iter dir (no runtime style injection from
 * `page.content()`). Default is false: HTML is produced by the
 * injected {@link CaptureScreenFn} just like the PNG.
 */
export type IterateCaptureScreen = {
  readonly id: string;
  readonly url?: string;
  readonly htmlSourceCopy?: boolean;
};

/**
 * Result returned by an injected per-screen capture runner. `ok=false`
 * with a `reason` propagates as a per-screen error context (iterate
 * does not swallow the failure silently).
 */
export type CaptureScreenResult = {
  readonly ok: boolean;
  readonly durationMs: number;
  readonly reason?: string;
};

/**
 * Capture runner injected for testability. The default runner (used
 * when this option is not provided) drives real Playwright. The test
 * suite passes a deterministic stub.
 */
export type CaptureScreenFn = (args: {
  readonly screenId: string;
  readonly url: string | null;
  readonly pngPath: string;
  readonly htmlPath: string;
}) => Promise<CaptureScreenResult>;

export type RunPrototypingIterateOptions = {
  root: string;
  cycle: number;
  targetUrl?: string;
  /**
   * Read-only peek of the canonical prototyping state file
   * (`.qfai/evidence/prototyping/prototyping.json`). When true, iterate
   * reads `stopReason` + `acceptedIterationIndex` from disk and reports
   * convergence WITHOUT invoking the iterate loop, capture, serve,
   * license-verify, or validate paths. Exit 0 when converged
   * (`stopReason === "axes-exceptional"` AND `acceptedIterationIndex`
   * is a non-null number); exit 2 otherwise (including when the state
   * file is missing).
   *
   * Defaults to the final cycle (9) when invoked from the CLI without
   * `--cycle`; orthogonal to capture / auto-serve defaults
   * (preserved unchanged).
   */
  checkConvergence?: boolean;
  /**
   * Opt-in PNG/HTML capture (default OFF; preserves the no-capture
   * default posture). When true, iterate runs the injected capture
   * path against {@link RunPrototypingIterateOptions.screens}.
   */
  capture?: boolean;
  /**
   * Per-screen descriptors consumed by the capture path. Ignored when
   * `capture` is not true.
   */
  screens?: readonly IterateCaptureScreen[];
  /**
   * Per-screen capture runner. Used only when `capture` is true. When
   * omitted, iterate dynamically loads the default Playwright runner
   * from `core/prototyping/defaultCaptureScreen.ts` so the operator
   * can drive capture from the CLI without supplying a DI hook. Test
   * fixtures pass a deterministic stub here to stay isolated from
   * Playwright.
   */
  captureScreen?: CaptureScreenFn;
  /**
   * Per-screen capture wall-clock budget in milliseconds. When a
   * runner invocation exceeds this budget iterate emits a soft warning
   * to stderr but does NOT hard-fail the run (NFR-0107). Defaults to
   * 30_000 ms (30 s).
   */
  captureBudgetMs?: number;
  /**
   * Opt-in local HTTP server (default OFF; preserves the no-server
   * default posture).
   */
  autoServe?: boolean;
  /**
   * Server runner injected for testability. When set, iterate
   * delegates spawn / teardown to this callback. When unset and
   * `autoServe` is true, iterate logs that it would have spawned and
   * returns. Test fixtures pass a deterministic stub.
   */
  serverRunner?: ServerRunnerFn;
  /**
   * Opt-in destructive re-run of `--cycle 0`. When true AND an
   * `iter-00` directory exists, iterate RENAMES it to
   * `iter-00.backup-<ISO>` BEFORE clearing evidence dirs (so the
   * backup is byte-equivalent to the prior loop's seed). Without
   * `--force` the destructive path is refused with a recovery hint.
   */
  force?: boolean;
  /**
   * Absolute or root-relative path to an add-only license-patch file.
   * When set, iterate applies the patch to the frozen license catalog
   * BEFORE the runtime license verify, then appends a
   * `licensePatchAudit[]` row to prototyping.json. Deletion /
   * modification patches are rejected.
   */
  licensePatch?: string;
  /**
   * Operator-supplied primary spec id (`--primary-spec-id`). Normalised
   * via {@link parsePrimarySpecId}; rejects unparseable / out-of-range
   * input with exit 2 + the canonical error message. Overrides config
   * + marker resolution when set.
   */
  primarySpecId?: string | number;
  /**
   * Cycle-0 placeholder HTML emission. When true and `cycle === 0`,
   * iterate renders one HTML per `screens[].id` resolved from the
   * `frozenSurfaceUnion` using DESIGN.md tokens (no per-screen LLM
   * call). Default OFF preserves prior-release bit-for-bit behavior.
   */
  emitSkeletons?: boolean;
  /**
   * Skeleton renderer mode (only meaningful with `emitSkeletons: true`).
   * Defaults to `placeholder`.
   */
  skeletonMode?: "placeholder" | "full" | "stub";
  /**
   * Resolved prototyping loop posture: `convergence` (default) or
   * `exploration` (medium gate relaxation — see
   * `core/prototyping/mode.ts`). Overrides
   * `qfai.config.yaml#prototyping.mode` when set.
   */
  mode?: "convergence" | "exploration";
};

/**
 * Auto-serve runner contract. The runner is responsible for spawning
 * the server, returning a handle the caller can later tear down, and
 * surfacing foreign-process refusals as `{ ok: false, reason }`.
 */
export type ServerRunnerFn = (args: {
  readonly root: string;
  readonly cycle: number;
  /**
   * Operator-supplied target URL. Forwarded to the runner so it can
   * derive the bind port from `new URL(targetUrl).port` instead of
   * silently falling back to a default that mismatches the URL the
   * operator typed (e.g. `--target-url http://localhost:5173/`
   * binding 5173, not 4321). Optional: the runner falls back to its
   * own documented default when missing.
   */
  readonly targetUrl?: string;
}) => Promise<ServerRunnerResult>;

export type ServerRunnerResult =
  | {
      readonly ok: true;
      /** Caller invokes teardown after the cycle completes / SIGINT. */
      readonly teardown: () => Promise<void>;
      readonly pid?: number;
    }
  | {
      readonly ok: false;
      /** Foreign-process refusal MUST surface the PID + command. */
      readonly reason: string;
      readonly foreignPid?: number;
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
  /**
   * Per-screen capture descriptors. Present only when the operator
   * passed `--capture`; absent (omitted from the JSON output) when
   * the default-OFF posture is in effect (preserving the existing
   * no-capture default).
   */
  screens?: readonly IterateCaptureScreen[];
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
  executionPlan?: unknown;
  frozenSpecsCovered?: unknown;
  frozenSurfaceUnion?: unknown;
  frozenLicenseCatalog?: unknown;
  imageSources?: unknown;
  [key: string]: unknown;
};

/**
 * SSOT default license catalog frozen at cycle 0 of every loop.
 *
 * The cycle-0 frozen catalog is the single source the run uses to
 * verify every `imageSources[]` entry. Hard-coded here as the initial
 * baseline.
 *
 * TODO (codex review — tracked as a follow-up, not blocking
 * this release; see the spec's open-questions log): expose
 * `qfai.config.yaml#prototyping.licenseCatalog` so consumer projects
 * can register additional allowlisted sources (e.g. `pixabay`)
 * without forking QFAI. Today consumers are bound to the
 * `unsplash` + `pexels` baseline. The wire-in path is (1) extend
 * `QfaiConfig` with an optional `prototyping.licenseCatalog?: { ... }`
 * field, (2) honour it in `writeSeedMetadata` (the cycle-0 frozen
 * value) and in the cycle ≥1 read path, (3) preserve the in-memory
 * default as the fallback when neither config nor on-disk frozen
 * value is present.
 */
const DEFAULT_LICENSE_CATALOG: LicenseCatalog = {
  allowedSources: ["unsplash", "pexels"],
  licenseTiers: {
    unsplash: ["unsplash-license", "free"],
    pexels: ["pexels-free"],
  },
  // 10th-wave Fix G (codex r3265260657, P1): bind each allowlisted
  // source to acceptable URL hosts so an `imageSources[]` entry that
  // claims `source: "unsplash"` while pointing at an unapproved host
  // is rejected with `license-host-mismatch` instead of being silently
  // accepted on the source-label alone. Hosts list both the canonical
  // CDN subdomain (e.g. `images.unsplash.com`) and the bare apex
  // domain (e.g. `unsplash.com`) — both are first-party origins for
  // the respective provider.
  sourceHosts: {
    unsplash: ["images.unsplash.com", "unsplash.com"],
    pexels: ["images.pexels.com", "pexels.com"],
  },
};

export const CYCLE_OUT_OF_RANGE_PEEK_HINT =
  "Hint: use --cycle 9 --check-convergence to peek the final cycle without re-running the loop.";

/**
 * Tailwind contract phase tag emitted into `iterate-context.json#priorTailwindContract`.
 *
 * Single source for the literal; reviewer subagents read the tag and
 * compare it to the current contract phase to detect drift. When a
 * future migration (Phase 5 / etc.) lands, update this
 * constant in one place — the iterate-context payload picks it up
 * automatically.
 */
const CURRENT_TAILWIND_CONTRACT_PHASE = "phase-1";

// TODO(next-minor): runPrototypingIterate body is ~674 LOC and orchestrates
// 13 distinct sections (peek, cycle range, primary-spec, zero-UI precheck,
// DESIGN.md lock, cycle-0 reset, seed write, license verify, plan write,
// auto-serve, capture, context write, blocked summary). CLAUDE.md project
// rule asks for ~50 LOC per function. Candidate extractions for the next
// minor housekeeping pass: verifyLicensesForCycle(options, protoRecord),
// runCycle0Reset(options, ...), runOptionalCaptureAndServe(options, dir),
// emitAdvisorySummaries(options, protoJsonAbs). Pure structural refactor;
// no semantic change expected.
// TODO(next-minor): split runPrototypingIterate into the extractions above.
export async function runPrototypingIterate(
  options: RunPrototypingIterateOptions,
): Promise<number> {
  // Read-only peek path. MUST precede every other gate so that:
  //   1. The cycle range gate (0..9) does NOT trip when the operator
  //      passes a deliberately out-of-range cycle to peek (though the
  //      typical hint convention pins cycle 9, which is in range).
  //   2. The DESIGN.md read, lock gate, spec resolution, license
  //      verify, capture, serve, and validate paths are bypassed —
  //      the peek is a pure read of the canonical prototyping state
  //      file, never a re-run of the loop.
  // Default cycle to 9 (final cycle of the loop, mirroring the
  // peek-mode hint) when the caller omits it.
  if (options.checkConvergence === true) {
    // Reject out-of-range --cycle even on the peek path. Pre-fix
    // `--check-convergence --cycle 99` silently coerced to cycle 9
    // and produced a misleading "converged at cycle 9" report. The
    // Phase 4 `input-error` stopReason enum was introduced to catch
    // this class; surface the same input-error diagnostic and exit 2
    // instead of masking the malformed cycle.
    //
    // The CLI surface defaults `--cycle` to 9 when the operator
    // omits it (see main.ts `prototypingCycle ?? 9`); the
    // peek-without-cycle entry path (used by integration tests that
    // bypass the CLI parser via `as unknown as ...`) is still routed
    // to the same cycle-9 default. We read `options.cycle` through
    // `unknown` so the "undefined sentinel" branch is reachable at
    // runtime without tripping `@typescript-eslint/no-unnecessary-
    // condition` on the statically-typed signature.
    const rawCycle: unknown = options.cycle;
    if (rawCycle === undefined) {
      return runCheckConvergencePeek(options.root, 9);
    }
    if (
      !Number.isInteger(options.cycle) ||
      options.cycle < 0 ||
      options.cycle > MAX_ITERATION_INDEX
    ) {
      error(
        "qfai prototyping iterate --check-convergence: --cycle accepts 0..9 " +
          `(=10 cycles total). Received --cycle ${String(options.cycle)} ` +
          "(input-error class stop). Omit --cycle to peek the default cycle 9.",
      );
      return 2;
    }
    return runCheckConvergencePeek(options.root, options.cycle);
  }
  if (
    !Number.isInteger(options.cycle) ||
    options.cycle < 0 ||
    options.cycle > MAX_ITERATION_INDEX
  ) {
    // Deterministic out-of-range error. The literal boundary phrase is
    // anchored by unit tests so any future rewording must update both
    // sides simultaneously. The peek-mode hint follows on its own line
    // so operators can see the recovery path without re-reading the
    // boundary explanation.
    error(
      "qfai prototyping iterate: --cycle accepts 0..9 (=10 cycles total). --cycle 10 would be the 11th cycle and is not supported.",
    );
    error(`Received --cycle ${String(options.cycle)}.`);
    error(CYCLE_OUT_OF_RANGE_PEEK_HINT);
    // Cycle out-of-range is an input-error class stop. The validator
    // accepts the wider 4-value enum (Phase 4); persistence happens on
    // the cycle-0 reset path so a CLI-only error before any state
    // exists has no persistence target — the diagnostic + exit code is
    // the operator-visible stopReason for this class.
    return 2;
  }

  // Converged-loop guard. MUST run before any write path — the
  // iteration directory used to be created unconditionally a few
  // hundred lines below, so `--cycle N` against an already-sealed loop
  // produced a fresh `iter-NN/` holding `iterate-plan.json` +
  // `iterate-context.json`, printed "iter-NN ready", and exited 0. That
  // debris is not inert: `certify`'s `findStaleIterDirs` guard
  // hard-fails on exactly those directories. The state needed to refuse
  // is the same `stopReason` / `acceptedIterationIndex` pair the
  // `--check-convergence` peek reads; it just has to be read here
  // rather than after the write.
  const convergedRefusal = await refuseWhenLoopConverged(options.root, options.cycle);
  if (convergedRefusal !== null) return convergedRefusal;

  // Normalise --primary-spec-id if provided. SHOULD-normalisation of
  // `1 / '1' / '01' / '0001'` to canonical `"0001"`; rejection emits the
  // canonical error message anchored by the unit ledger.
  let normalisedPrimarySpecId: string | undefined;
  if (options.primarySpecId !== undefined) {
    const parsed = parsePrimarySpecId(options.primarySpecId);
    if (!parsed.ok) {
      error(`qfai prototyping iterate: ${parsed.error}`);
      return 2;
    }
    normalisedPrimarySpecId = parsed.normalised;
  }

  // 0) Zero UI-bearing pre-check → deterministic no-op (exit 0) when
  //    no spec has a UI surface to drive. See `evaluateZeroUiBearingPrecheck`
  //    for the full contract.
  //
  // 15th-wave Fix (codex r3269453276, P1) + 17th-wave refinement
  // (codex r3270050451, MINOR) + 19th-wave polish (codex r3270092241
  // / r3270093043 / r3270095015, MINOR + NIT): the precheck
  // short-circuit MUST NOT bypass the cycle ≥ 1 drift gate. The
  // cycle ≥ 1 branch always returns `exit 2`; it never falls through
  // to `evaluateCycleGteOneGate`. Two diagnostics are surfaced based
  // on observable facts (NOT internal wave labels):
  //
  //   (a) `frozenSurfaceUnion` is non-null on disk → genuine "UI
  //       markers removed mid-loop" hard-stop. The diagnostic names
  //       the frozen union so the operator can see what scope is no
  //       longer reachable.
  //   (b) `frozenSurfaceUnion` is null / missing — either the file
  //       does not exist yet (fresh project ran `--cycle 1` first) or
  //       it is a legacy record without the field. Both share the
  //       same operator action (re-seed via `--cycle 0`), so a single
  //       diagnostic suffices.
  //
  // `readFrozenSurfaceUnionField` returns `null` whenever the field
  // is missing, malformed, or empty (see post-condition on the helper
  // at L674), so the precheck only needs `!== null` to discriminate
  // the two branches.
  const precheck = await evaluateZeroUiBearingPrecheck(options.root);
  if (precheck.shortCircuit) {
    if (options.cycle >= 1) {
      const protoJsonAbsForPrecheck = path.join(options.root, PROTOTYPING_JSON_REL);
      const protoRecordForPrecheck = await readPrototypingJson(protoJsonAbsForPrecheck);
      const frozenUnionForPrecheck =
        protoRecordForPrecheck === null
          ? null
          : readFrozenSurfaceUnionField(protoRecordForPrecheck);
      if (frozenUnionForPrecheck !== null) {
        error(
          "qfai prototyping iterate: zero UI-bearing specs resolved on cycle " +
            `${options.cycle}, but the cycle-0 frozen union recorded in ` +
            `prototyping.json#frozenSurfaceUnion (${JSON.stringify(frozenUnionForPrecheck)}) ` +
            "is non-empty. All UI markers / contracts appear to have been " +
            "removed mid-loop, which is a hard-stop drift class — the cycle-0 " +
            "frozen scope is no longer reachable. Re-run with " +
            "`--cycle 0 --target-url <url>` to refreeze the loop or restore the " +
            "removed UI signals before continuing.",
        );
      } else {
        error(
          "qfai prototyping iterate: zero UI-bearing specs resolved on cycle " +
            `${options.cycle}, and prototyping.json has no cycle-0 ` +
            "`frozenSurfaceUnion` snapshot to drift against (either the file " +
            "does not exist yet or it is a legacy record without the " +
            "`frozenSurfaceUnion` field). Seed the loop first with " +
            "`--cycle 0 --target-url <url>` and then re-invoke for cycle ≥ 1.",
        );
      }
      return 2;
    }
    return precheck.exitCode;
  }
  // The precheck returns both `earlyConfig` and `unionSpecs` on the
  // continue path. `unionSpecs` is the cycle-0 UI-bearing UNION —
  // cycle 0 persists it as `frozenSurfaceUnion` in prototyping.json and
  // the cycle ≥ 1 drift gate compares the live UNION against THAT
  // frozen UNION (apples-to-apples) instead of against the single-spec
  // `frozenSpecsCovered`. Pre-fix (10th wave) the drift gate compared a
  // single-spec frozen set with the multi-spec live union, which
  // false-positive-fired `added=[secondaries...]` for any project
  // whose baseline already carried ≥ 2 UI-bearing specs. See 11th-wave
  // Fix (codex r3265480688, MAJOR/P1).
  const { earlyConfig, unionSpecs: cycleZeroUnion } = precheck;

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

  // Reuse the config snapshot read for the zero-UI-bearing pre-check
  // above so we do not double-IO on the YAML file path. The values
  // are immutable for the duration of one invocation.
  const configResult = earlyConfig;

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

  // Operator-supplied `--primary-spec-id` overrides config + marker
  // resolution when set. The override is normalised through
  // `parsePrimarySpecId` (above), so any non-conformant input has
  // already been rejected with exit 2 + the canonical error string.
  const effectiveConfig =
    normalisedPrimarySpecId !== undefined
      ? {
          ...configResult.config,
          prototyping: {
            ...(configResult.config.prototyping ?? {}),
            primarySpecId: normalisedPrimarySpecId,
          },
        }
      : configResult.config;
  const resolved = await resolvePrimaryPrototypingSpec(options.root, effectiveConfig);
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

  // Prototyping-mode discriminator: resolve the per-loop prototyping mode
  // (cli flag overrides config; absence of both defaults to
  // `convergence`). Lazily imported so the helper module is not
  // required to load until iterate is actually invoked.
  const { resolvePrototypingMode } = await import("../../core/prototyping/mode.js");
  const resolvedMode = resolvePrototypingMode({
    cli: options.mode,
    config: configResult.config.prototyping?.mode,
    warn,
  });
  info(`qfai prototyping iterate: prototyping mode resolved to ${resolvedMode}.`);

  // 2) Cycle >=1: enforce hash gate against the lock-anchored cache in
  //    prototyping.json + convergence/budget stop + monotonicity +
  //    spec-set drift. See `evaluateCycleGteOneGate` for the full
  //    contract. The lock equality (above) plus the cache equality
  //    (in the helper) jointly enforce a 3-way invariant
  //    (live === lock === cache) without the cache becoming a third
  //    independent SHA SSOT.
  if (options.cycle >= 1) {
    const gate = await evaluateCycleGteOneGate({
      root: options.root,
      cycle: options.cycle,
      protoJsonAbs,
      currentSha,
      lockSha,
      designMd,
      specs,
      config: configResult.config,
    });
    if (gate.shortCircuit) {
      return gate.exitCode;
    }
  }

  // 3) Cycle 0 requires --target-url so the seed generator knows where
  //    to write iter-00/index.html and the capture role knows where to
  //    point playwright-cli.
  if (options.cycle === 0 && !options.targetUrl) {
    error("qfai prototyping iterate --cycle 0: --target-url is required.");
    return 2;
  }

  // 3b) Cycle 0 destructive-rerun gate.
  //     If an existing `iter-00` directory is present on disk, the
  //     fresh cycle 0 will overwrite its contents. Without `--force`
  //     refuse the run with a recovery hint; with `--force` rename the
  //     existing `iter-00` to `iter-00.backup-<ISO>` BEFORE the rest
  //     of the cycle-0 reset path so the backup is byte-equivalent to
  //     the prior loop. The rename MUST precede `clearEvidenceIterDirs`
  //     so a destructive-rerun failure cannot lose the prior loop.
  if (options.cycle === 0) {
    const evidenceRootAbs = path.join(options.root, PROTOTYPING_EVIDENCE_REL);
    const iter00Abs = path.join(evidenceRootAbs, "iter-00");
    const iter00Exists = await dirExists(iter00Abs);
    if (iter00Exists) {
      if (!options.force) {
        error(
          "qfai prototyping iterate --cycle 0: an existing iter-00 directory was found at " +
            `${PROTOTYPING_EVIDENCE_REL}/iter-00. Re-running cycle 0 will overwrite the prior loop's seed. ` +
            "Re-invoke with `--force` to back up iter-00 to iter-00.backup-<ISO> before clearing, " +
            "or delete the directory manually if the prior loop is no longer needed.",
        );
        return 2;
      }
      const backupAbs = path.join(
        evidenceRootAbs,
        `iter-00.backup-${new Date().toISOString().replace(/[:.]/g, "-")}`,
      );
      // Every destructive iter-NN mutation MUST funnel through the
      // mutation-log writer. Walk the iter-00 tree once BEFORE the
      // rename so each moved file gets one JSONL line.
      try {
        const { logEvidenceMove } = await import("../../core/prototyping/mutationLog.js");
        const movedFiles = await collectFilesRecursively(iter00Abs);
        for (const fileAbs of movedFiles) {
          const rel = path.relative(options.root, fileAbs).replace(/\\/g, "/");
          let priorSize = 0;
          try {
            priorSize = (await stat(fileAbs)).size;
          } catch {
            // best-effort: log size 0 when stat fails
          }
          await logEvidenceMove(options.root, "iterate", rel, priorSize);
        }
      } catch (logCause) {
        // Mutation-log write failure is advisory; do not abort the
        // backup itself. The reviewer-gate finding
        // R-EVIDENCE-MUTATION-UNLOGGED is the structural backstop.
        warn(
          `qfai prototyping iterate --cycle 0 --force: mutation-log write failed (${String(logCause)}); proceeding with rename.`,
        );
      }
      try {
        await rename(iter00Abs, backupAbs);
        info(
          `qfai prototyping iterate --cycle 0 --force: backed up iter-00 to ${path.relative(options.root, backupAbs).replace(/\\/g, "/")}.`,
        );
      } catch (cause) {
        // Fail closed: clearing evidence dirs MUST be skipped when the
        // backup rename fails, otherwise the prior loop's evidence is
        // silently destroyed without an operator-visible backup.
        const reason = cause instanceof Error ? cause.message : String(cause);
        error(
          `qfai prototyping iterate --cycle 0 --force: could not back up iter-00 (${reason}). ` +
            "Aborting before clearing evidence to avoid destroying the prior loop. " +
            "Resolve the filesystem error (Windows file lock / EACCES / EBUSY are common causes) and rerun.",
        );
        return 2;
      }
    }
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
      declaredScreens: (options.screens ?? []).map((s) => s.id),
      // cycle-0 SSOT for the spec set under review. Kept single-spec
      // (mirrors the legacy `specsCovered` field) until the per-spec
      // iter-NN/spec-NNNN/<screen>.review.json layout migration lands;
      // certify already hard-fails any multi-spec frozen set on the
      // flat-iter layout, so persisting the full UI-bearing union here
      // would render every normal multi-spec run uncertifiable. The
      // multi-spec UNION is still computed in
      // `evaluateZeroUiBearingPrecheck` for the no-op short-circuit
      // signal, and at the cycle ≥ 1 drift gate via `resolveSurfaceUnion`
      // re-resolution against `frozenSurfaceUnion`; we just do not
      // freeze it as the multi-spec scope here (per Fix B + 11th-wave
      // Fix below).
      frozenSpecsCovered: specs,
      // cycle-0 SSOT for the multi-spec UI-bearing UNION. The drift
      // gate at cycle ≥ 1 compares the live UNION against THIS field
      // (apples-to-apples). Without this field the drift gate would
      // compare the single-spec frozen scope against the live UNION
      // and false-positive any project whose baseline already carries
      // ≥ 2 UI-bearing specs. See 12th-wave Fix (codex r3265480688,
      // MAJOR/P1).
      frozenSurfaceUnion: [...cycleZeroUnion],
      // cycle-0 SSOT for the license-class catalog. Recording it here
      // means cycle >= 1 license-verify reads the FROZEN catalog
      // (immutable through the loop), not a mutable in-memory default
      // that could re-baseline mid-run.
      frozenLicenseCatalog: DEFAULT_LICENSE_CATALOG,
      mode: resolvedMode,
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
    const rmResult = await clearEvidenceIterDirs(
      path.join(options.root, PROTOTYPING_EVIDENCE_REL),
      options.root,
    );
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

  // 4b) License verify for stock-photo image sources. The cycle-0
  //     frozen license catalog is the SSOT; every cycle that has
  //     `imageSources[]` recorded on prototyping.json must pass the
  //     verify or the run hard-stops with exit 66. The catalog is
  //     sourced from the cycle-0 frozen value when present
  //     (cycle >= 1), falling back to the in-memory default on
  //     cycle 0 (the freshly-written catalog from writeSeedMetadata
  //     above is functionally identical).
  //
  //     Pragmatic data flow: `imageSources[]` is read from
  //     `prototyping.json#imageSources` (or skipped silently when
  //     absent). The current batch lands the verify gate; the
  //     population path (handoff yaml extraction, DESIGN.md pool) is
  //     left to a later batch. Tests that exercise this branch seed
  //     the field directly.
  const protoRecordForLicense =
    options.cycle === 0 ? null : await readPrototypingJson(protoJsonAbs);
  const collected = collectImageSources(protoRecordForLicense);
  if (!collected.ok) {
    // 10th-wave Fix H (codex r3265260665, P2): hard-stop on malformed
    // `imageSources[]`. Pre-fix the malformed entries were silently
    // dropped and an all-malformed array reduced to `[]`, which then
    // skipped the exit-66 license gate entirely. Surface each
    // offending index + field so the operator can fix the typo
    // (typically a misspelled `license` / `licence` swap) before the
    // cycle proceeds.
    error(
      "qfai prototyping iterate: prototyping.json#imageSources is malformed — " +
        `${collected.errors.length} error(s): ${collected.errors.join("; ")}. ` +
        "Each entry must be a JSON object with non-empty string fields " +
        "{url, source, license}; `attribution` is also required and a " +
        "missing/empty value is rejected by the runtime license gate " +
        "(exit 66) rather than as an input-shape error.",
    );
    return 2;
  }
  // 13th-wave Fix (codex r3265947252, P2): detect cycle ≥ 1 drift of the
  // cycle-0 frozen license catalog against the in-memory SSOT
  // (`DEFAULT_LICENSE_CATALOG`). Pre-fix the verifier used the on-disk
  // `frozenLicenseCatalog` directly (or silently fell back to
  // `DEFAULT_LICENSE_CATALOG` when the field was malformed), which let
  // an operator who added e.g. `pinterest` to `allowedSources` pass an
  // otherwise-unallowed `imageSources[]` entry with exit 0. The CLI
  // contract pins `frozenLicenseCatalog` drift to exit 2 (lock drift);
  // surface that here before invoking the runtime license gate so the
  // operator hits the precise diagnostic.
  if (protoRecordForLicense !== null && options.cycle >= 1) {
    const onDisk = readFrozenLicenseCatalog(protoRecordForLicense);
    if (onDisk === null || !licenseCatalogsEqual(onDisk, DEFAULT_LICENSE_CATALOG)) {
      error(
        "qfai prototyping iterate: prototyping.json#frozenLicenseCatalog drifted " +
          "from the cycle-0 frozen license catalog (the in-memory " +
          "DEFAULT_LICENSE_CATALOG is the SSOT; mid-loop edits — including " +
          "additions to `allowedSources` / `licenseTiers` / `sourceHosts`, " +
          "or a malformed shape — are treated as lock drift). Restore the " +
          "frozen catalog or re-run `--cycle 0 --target-url <url>` to refreeze.",
      );
      return 2;
    }
  }
  // Option A (Codex P1 wave-4): the in-memory effective catalog is
  // derived from the frozen DEFAULT baseline + accumulated audit-ledger
  // additions on every cycle. The cycle-0 frozen catalog stays equal to
  // `DEFAULT_LICENSE_CATALOG` (the drift gate above continues to enforce
  // that), and the canonical record of operator-supplied additions lives
  // in `licensePatchAudit[]` (canonical row shape: 3 required keys
  // + optional `addedLicenseTiers` for tier replay). Reading the effective
  // catalog at verify-time means a cycle-0 `--license-patch` no longer
  // self-incompatibly stamps the frozen field with the post-patch
  // catalog (which would then trip the drift gate on cycle 1).
  const priorAuditRows = readLicensePatchAuditRows(protoRecordForLicense);
  let effectiveCatalog: LicenseCatalog = effectiveLicenseCatalog(
    DEFAULT_LICENSE_CATALOG,
    priorAuditRows,
  );
  if (options.licensePatch !== undefined) {
    const patchResult = await applyLicensePatchFromFile(
      options.root,
      options.licensePatch,
      effectiveCatalog,
      protoJsonAbs,
    );
    if (!patchResult.ok) {
      error(`qfai prototyping iterate: ${patchResult.error}`);
      return 2;
    }
    effectiveCatalog = patchResult.nextCatalog;
  }

  const imageSources = collected.sources;
  if (imageSources !== null && imageSources.length > 0) {
    // Catalog drift is rejected above; the verifier authority is the
    // in-memory SSOT (mirrored at cycle 0 into prototyping.json) after
    // any add-only license-patch has been applied.
    const verifyResult = licenseVerify(imageSources, effectiveCatalog);
    if (!verifyResult.ok) {
      const offending = verifyResult.errors
        .map((e) => `${e.code} (source=${e.source}, url=${e.url})`)
        .join("; ");
      error(
        "qfai prototyping iterate: license verify failed — " +
          `${verifyResult.errors.length} offending entry/entries: ${offending}. ` +
          "Replace with allowlisted free stock-photo sources (see cycle-0 frozenLicenseCatalog) " +
          "or remove the entry.",
      );
      // Persist the stopReason so validator + downstream consumers
      // see the 4-value enum at face value (Phase 4 widening).
      await persistStopReason(protoJsonAbs, "license-verify-fail");
      return 66;
    }
  }

  // 5) Assign paths and write iterate-plan.json.
  const dir = path.join(options.root, iterationDir(options.cycle));
  await mkdir(dir, { recursive: true });

  // Emit-skeletons: cycle-0 `--emit-skeletons` placeholder
  // HTML emission. Token-driven (no per-screen LLM call). Default OFF
  // preserves bit-for-bit prior-release behavior; only fires when both
  // `cycle === 0` AND `options.emitSkeletons === true`. Screens are
  // resolved from the project-wide UI contracts under
  // `.qfai/contracts/ui/*.yaml`; each declared `screens[].id` in the
  // union (which today is project-wide because UI contracts are
  // project-wide) gets one placeholder. Best-effort write failures
  // surface as a hard error naming the offending screen.
  if (options.cycle === 0 && options.emitSkeletons === true) {
    const skeletonMode = options.skeletonMode ?? "placeholder";
    const screenContracts = await readUiContractScreenContracts(
      options.root,
      configResult.config.paths.contractsDir,
    );
    const screenIds = screenContracts.map((s) => s.screenId);
    const skeletonExit = await emitCycleZeroSkeletons({
      root: options.root,
      iterDir: dir,
      screens: screenIds,
      designMd,
      mode: skeletonMode,
    });
    if (skeletonExit !== 0) {
      return skeletonExit;
    }
    info(
      `qfai prototyping iterate --emit-skeletons: emitted ${screenIds.length} skeleton ` +
        `HTML file(s) for the frozenSurfaceUnion (mode=${skeletonMode}).`,
    );
  }

  // Screen descriptor resolution for the opt-in capture path. The DI
  // `options.screens` hook still wins (test isolation), but when the
  // operator drives `--capture` from the CLI without DI, derive the
  // screens list from the project's UI contracts via
  // `collectScreensForCapture` so both the plan emission AND the
  // capture invocation read from a single source of truth. Pre-fix
  // (Codex P1) the CLI wiring only set `capture: true` and never
  // populated `screens`, so `runCapturePath` short-circuited with a
  // warning and produced zero PNG/HTML artifacts — the operator-facing
  // flag was a silent no-op. Derivation is gated on
  // `options.capture === true` so the default-OFF posture
  // (no PNG/HTML written when --capture is absent) remains
  // byte-equivalent.
  let resolvedCaptureScreens: readonly IterateCaptureScreen[] | undefined;
  if (options.capture === true) {
    if (options.screens !== undefined) {
      resolvedCaptureScreens = options.screens;
    } else {
      resolvedCaptureScreens = await collectScreensForCapture(
        options.root,
        configResult.config.paths.contractsDir,
      );
    }
  }

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
    // `options.screens = []` is truthy under `Array && Array` so the
    // pre-fix shape would emit `screens: []` into iterate-plan.json
    // (a no-op key the downstream capture path then warns about).
    // Tighten to length > 0 so the absent-key shape stays the canonical
    // "no screens declared" representation. The resolved list above is
    // the single SSOT — both the plan field and `runCapturePath` read
    // from it so the two surfaces never diverge.
    ...(options.capture && resolvedCaptureScreens && resolvedCaptureScreens.length > 0
      ? { screens: resolvedCaptureScreens }
      : {}),
  };

  await writeFile(
    path.join(dir, "iterate-plan.json"),
    `${JSON.stringify(plan, null, 2)}\n`,
    "utf-8",
  );

  // Opt-in auto-serve (default OFF; preserves the no-server default
  // posture). The returned teardown is invoked at the end of this
  // run; foreign process refusals surface as exit 2 input errors.
  let serverTeardown: (() => Promise<void>) | null = null;
  let sigintHandler: (() => void) | null = null;
  let teardownInvoked = false;
  const teardownOnce = async (): Promise<void> => {
    if (teardownInvoked || serverTeardown === null) return;
    teardownInvoked = true;
    try {
      await serverTeardown();
    } catch (cause) {
      warn(`qfai prototyping iterate --auto-serve: teardown failed (${String(cause)})`);
    }
  };
  if (options.autoServe) {
    // DI serverRunner takes priority. When omitted, dynamically load
    // the default in-process HTTP server runner so the operator can
    // run `qfai prototyping iterate --auto-serve` without supplying a
    // runner. The default ships an in-process node:http server with a
    // <2s teardown bound; subprocess-based runners are operator-supplied
    // via the DI hook.
    let serverRunner: ServerRunnerFn;
    if (options.serverRunner) {
      serverRunner = options.serverRunner;
    } else {
      try {
        const mod = await import("../../core/prototyping/defaultServerRunner.js");
        serverRunner = mod.defaultServerRunner;
      } catch (cause) {
        // Defense-in-depth (mirrors the capture-runner catch above):
        // `defaultServerRunner.ts` uses only the Node stdlib (`node:http`,
        // `node:fs`, `node:path`); module resolution is unconditional, so
        // this branch is reachable only when the ESM bundle itself is
        // broken (missing file, typo, circular import, corrupt dist).
        error(
          `qfai prototyping iterate --auto-serve: failed to load default server runner ` +
            `(ESM bundle integrity failure). Cause: ${String(cause)}.`,
        );
        return 2;
      }
    }
    const serverResult = await serverRunner({
      root: options.root,
      cycle: options.cycle,
      // Thread the operator-supplied URL so the default runner can
      // derive its bind port from `new URL(targetUrl).port`. Tests
      // pass an explicit serverRunner and ignore this; production
      // operators get the port they typed.
      ...(options.targetUrl !== undefined ? { targetUrl: options.targetUrl } : {}),
    });
    if (!serverResult.ok) {
      error(`qfai prototyping iterate --auto-serve: ${serverResult.reason}`);
      return 2;
    }
    serverTeardown = serverResult.teardown;
    // Install a SIGINT handler that drives the teardown within the
    // NFR-0106 2s bound. The handler is removed on cycle completion
    // (or on early return) to avoid leaking listeners across
    // back-to-back invocations within the same Node process.
    sigintHandler = () => {
      void teardownOnce();
    };
    process.on("SIGINT", sigintHandler);
  }

  // Opt-in capture (default OFF; preserves the no-capture default
  // posture). Each screen is processed sequentially with a per-screen
  // soft-warning wall-clock budget. The resolved screen list (DI or
  // auto-derived from UI contracts above) is threaded down so the
  // capture invocation never silently no-ops on a missing
  // `options.screens` when the operator drove `--capture` from the CLI.
  //
  // try/finally so that synchronous throws from `runCapturePath`'s
  // `mirrorAcceptedIterToAggregateDirs` (readdir / mkdir failures
  // other than ENOENT) cannot leak the SIGINT listener or skip the
  // HTTP teardown. The previous explicit cleanup chain drained both
  // surfaces on the happy path and on `captureExit !== 0`, but the
  // throw-from-helper path skipped both.
  try {
    if (options.capture) {
      const captureExit = await runCapturePath(options, dir, resolvedCaptureScreens ?? []);
      if (captureExit !== 0) {
        return captureExit;
      }
      // Emit the `taskFidelity` template skeleton so the operator
      // sees every required keyword as a TODO placeholder in the
      // iteration dir. Best-effort: a template write failure does
      // not block the capture path; the validator (`QFAI-CRIT-009`)
      // is the user-visible gate.
      try {
        const { writeTaskFidelityTemplate } =
          await import("../../core/prototyping/captureTemplate.js");
        await writeTaskFidelityTemplate(dir);
      } catch (cause) {
        warn(
          `qfai prototyping iterate --capture: failed to emit taskFidelity template (${String(cause)}). ` +
            "Skeleton is advisory; QFAI-CRIT-009 remains the gate.",
        );
      }
    }
  } finally {
    if (sigintHandler) process.off("SIGINT", sigintHandler);
    await teardownOnce();
  }

  // Advisory `iter-NN/iterate-context.json`: structured prior-cycle
  // hint consumed by reviewer subagents. Best-effort, advisory-only;
  // certify ignores presence/absence.
  if (options.cycle >= 1) {
    const protoForCtx = await readPrototypingJson(protoJsonAbs);
    const ctx = buildIterateContextFromRecord(protoForCtx);
    if (ctx !== null) {
      await writeIterateContextFile(dir, ctx);
    }
  }

  // [BLOCKED] exit-64 summary: when the latest iteration is recorded
  // but did NOT converge (axes < exceptional OR lap[] non-empty OR
  // designMdViolations[] non-empty), emit the top-3 blockers summary so
  // the operator sees what is preventing exit-64. The literal header is
  // anchored by the unit ledger.
  if (options.cycle >= 1) {
    const protoForBlocked = await readPrototypingJson(protoJsonAbs);
    const blockedInput = buildBlockedSummaryInputFromRecord(protoForBlocked);
    if (blockedInput !== null && !isConverged(blockedInput)) {
      emitBlockedSummary(blockedInput);
    }
  }

  info(
    `qfai prototyping iterate: iter-${String(options.cycle).padStart(2, "0")} ready ` +
      `(specs=${specs.length}, plan at ${plan.paths.iterationDir}/iterate-plan.json).`,
  );
  return 0;
}

function isConverged(input: BlockedSummaryInput): boolean {
  return (
    input.designMdViolations.length === 0 &&
    input.layoutAntiPatternsDetected.length === 0 &&
    input.scores.informationArchitecture === "exceptional" &&
    input.scores.navigationFlow === "exceptional" &&
    input.scores.usability === "exceptional" &&
    input.scores.functionality === "exceptional"
  );
}

function buildBlockedSummaryInputFromRecord(
  record: PrototypingJsonShape | null,
): BlockedSummaryInput | null {
  if (!record) return null;
  const iterations = asIterations(record);
  if (iterations.length === 0) return null;
  const last = iterations[iterations.length - 1];
  if (!isRecord(last) || !isRecord(last.scores)) return null;
  const lastScores = last.scores;
  const pickScore = (key: string): OrdinalScore => {
    const v = lastScores[key];
    return isOrdinalScore(v) ? v : "weak";
  };
  const scores = {
    informationArchitecture: pickScore("informationArchitecture"),
    navigationFlow: pickScore("navigationFlow"),
    usability: pickScore("usability"),
    functionality: pickScore("functionality"),
  };
  const lap = Array.isArray(last.layoutAntiPatternsDetected)
    ? last.layoutAntiPatternsDetected.filter((v): v is string => typeof v === "string")
    : [];
  const dmvRaw = Array.isArray(last.designMdViolations) ? last.designMdViolations : [];
  const dmv: DesignMdViolation[] = [];
  for (const v of dmvRaw) {
    if (!isRecord(v)) continue;
    const kind = v.kind;
    if (kind !== "color" && kind !== "font" && kind !== "radius" && kind !== "shadow") {
      continue;
    }
    const found = typeof v.found === "string" ? v.found : "";
    dmv.push({ kind, found });
  }
  return {
    designMdViolations: dmv,
    layoutAntiPatternsDetected: lap,
    scores,
  };
}

async function runCapturePath(
  options: RunPrototypingIterateOptions,
  dir: string,
  resolvedScreens: readonly IterateCaptureScreen[],
): Promise<number> {
  const screens = resolvedScreens;
  if (screens.length === 0) {
    warn(
      "qfai prototyping iterate --capture: no screens[] declared on the iterate plan; skipping capture.",
    );
    return 0;
  }
  // DI captureScreen takes priority over the default fallback so test
  // fixtures stay isolated from Playwright. When omitted, dynamically
  // load the default Playwright runner so the operator can run
  // `qfai prototyping iterate --capture` without supplying a runner.
  let runner: CaptureScreenFn;
  if (options.captureScreen) {
    runner = options.captureScreen;
  } else {
    try {
      const mod = await import("../../core/prototyping/defaultCaptureScreen.js");
      runner = mod.defaultCaptureScreen;
    } catch (cause) {
      // Defense-in-depth: `defaultCaptureScreen.ts` has no top-level
      // Playwright import (Playwright is imported lazily inside the
      // function body), so a missing Playwright package does NOT reach
      // this branch — that surfaces via the runner's own structured
      // refusal ("playwright not installed; ..."). This catch only
      // fires when the ESM bundle itself is broken (the file is
      // missing, a typo / circular import sneaks in, or the dist tree
      // is corrupt). Production paths normally do not reach here.
      error(
        `qfai prototyping iterate --capture: failed to load default capture runner ` +
          `(ESM bundle integrity failure, NOT Playwright availability). Cause: ${String(cause)}.`,
      );
      return 2;
    }
  }
  const budgetMs = options.captureBudgetMs ?? 30_000;
  const prototypesIterDir = path.join(
    options.root,
    ".qfai",
    "prototypes",
    `iter-${String(options.cycle).padStart(2, "0")}`,
  );
  for (const screen of screens) {
    const pngPath = path.join(dir, `${screen.id}.png`);
    const htmlPath = path.join(dir, `${screen.id}.html`);
    // Capture URL composition (Codex P2 wave-8): UI contracts store
    // route-relative paths like `/orders/new`; the default Playwright
    // runner calls `page.goto(args.url)` which rejects relative paths
    // and aborts capture. Compose route-relative URLs against
    // `options.targetUrl` so the operator-facing flow works end-to-end.
    // Absolute URLs (`http://` / `https://`) pass through verbatim.
    const urlResult = composeCaptureUrl(screen.url, options.targetUrl);
    if (!urlResult.ok) {
      error(`qfai prototyping iterate --capture: screen ${screen.id} ${urlResult.reason}`);
      return 2;
    }
    const captureUrl = urlResult.url;
    // Soft-warning budget enforcement is post-hoc on the runner's
    // reported `durationMs` (NFR-0107: warn, never hard-fail). The
    // prior `startBudgetTimer` setTimeout-with-noop-handler hook was
    // dead structural placeholder — removed (YAGNI). If a future
    // requirement asks iterate to cancel the runner before completion,
    // re-introduce a real timer with an `AbortController` plumbed into
    // `CaptureScreenFn`; do not resurrect the noop placeholder.
    try {
      const result = await runner({ screenId: screen.id, url: captureUrl, pngPath, htmlPath });
      if (!result.ok) {
        error(
          `qfai prototyping iterate --capture: screen ${screen.id} failed (${result.reason ?? "no reason"}).`,
        );
        return 2;
      }
      if (result.durationMs > budgetMs) {
        warn(
          `qfai prototyping iterate --capture: screen ${screen.id} exceeded ${budgetMs}ms budget (took ${result.durationMs}ms; soft warning).`,
        );
      }
      if (screen.htmlSourceCopy) {
        const source = path.join(prototypesIterDir, `${screen.id}.html`);
        try {
          await copyFile(source, htmlPath);
        } catch (cause) {
          error(
            `qfai prototyping iterate --capture: htmlSourceCopy failed for screen ${screen.id} (${String(cause)}).`,
          );
          return 2;
        }
      }
    } catch (cause) {
      error(`qfai prototyping iterate --capture: screen ${screen.id} threw (${String(cause)}).`);
      return 2;
    }
  }
  // lap-009 md5 duplicate-capture detection: scan the just-captured
  // PNGs and surface any two distinct screens sharing the same md5
  // digest. Advisory-failing — the override path lives at the reviewer
  // boundary (justification text required); here we only emit the
  // finding so downstream consumers see it deterministically.
  const pngsByScreen = new Map<string, Buffer>();
  for (const screen of screens) {
    const pngPath = path.join(dir, `${screen.id}.png`);
    try {
      const bytes = await readFile(pngPath);
      pngsByScreen.set(screen.id, bytes);
    } catch (err) {
      // Pre-fix this bare-catch silently swallowed every readFile error
      // including non-ENOENT classes (EACCES / EBUSY / Windows file
      // lock). Surface a warning so the operator sees that lap-009
      // duplicate detection skipped this screen and can diagnose the
      // root cause — the cycle still proceeds because the upstream
      // runner already validated `!result.ok` for true capture
      // failures, but the lap-009 input set is now observably partial.
      warn(
        `qfai prototyping iterate --capture: failed to read post-capture PNG ${pngPath} ` +
          `(${String(err)}); skipping lap-009 md5 input for screen ${screen.id}.`,
      );
    }
  }
  const lap009 = findMd5DuplicateCaptures(pngsByScreen);
  for (const f of lap009) {
    warn(
      `qfai prototyping iterate --capture: ${f.code} ${f.category} — ` +
        `screens [${f.offenders.join(", ")}] share md5 ${f.md5} (advisory-failing; ` +
        "supply Reviewer justification to override).",
    );
  }
  // lap-010 missing-route detection: when a screen entry carries a
  // `url` (route), assert that the captured html contains that route
  // literally. Both `target#/<route>` and `target/<route>` forms are
  // accepted.
  const lap010Inputs: Lap010Input[] = [];
  for (const screen of screens) {
    if (!screen.url) continue;
    const htmlPath = path.join(dir, `${screen.id}.html`);
    let html: string;
    try {
      html = await readFile(htmlPath, "utf-8");
    } catch {
      continue;
    }
    lap010Inputs.push({ screenId: screen.id, route: screen.url, html });
  }
  const lap010 = findMissingRoutes(lap010Inputs);
  for (const f of lap010) {
    warn(
      `qfai prototyping iterate --capture: ${f.code} ${f.category} — ` +
        `screen ${f.screenId} did not surface route ${f.route} (advisory-failing; ` +
        "supply Reviewer justification to override).",
    );
  }
  // Mirror the accepted iteration's per-screen evidence into the
  // project-wide aggregate dirs once the capture pass completes.
  // Best-effort copy; missing files are skipped so a partial capture
  // run does not block the cycle. Screen ids are validated for
  // underscore casing at the UI contract surface (QFAI-PROT-010 in
  // `prototypingEvidence.ts`).
  await mirrorAcceptedIterToAggregateDirs(options.root, options.cycle);
  return 0;
}

/**
 * Emit-skeletons helper: emit one placeholder HTML per
 * `screens[].id` from the cycle-0 `frozenSurfaceUnion`. Token-driven
 * (consumes DESIGN.md color / font / radius / shadow tokens). Returns
 * `0` on success, `2` when any per-screen write fails (the offending
 * screen is named on stderr so the operator can act).
 */
async function emitCycleZeroSkeletons(input: {
  readonly root: string;
  readonly iterDir: string;
  readonly screens: readonly string[];
  readonly designMd: DesignMd;
  readonly mode: "placeholder" | "full" | "stub";
}): Promise<number> {
  if (input.screens.length === 0) {
    // Empty union — nothing to emit. Surface a soft warning so the
    // operator sees that the opt-in flag had no effect, without
    // failing the cycle.
    warn(
      "qfai prototyping iterate --emit-skeletons: frozenSurfaceUnion is empty; no skeletons written.",
    );
    return 0;
  }
  const { buildSkeletonsForUnion, writeSkeletons } =
    await import("../../core/prototyping/emitSkeletons.js");
  // Translate DesignMd → flat token table consumed by the renderer.
  // `visual.typography` is a structured object, not a flat
  // Record<string,string>; flatten the string-valued primary slots
  // (family_sans / family_display / family_mono) into the token map.
  const typo = input.designMd.visual.typography;
  const fonts: Record<string, string> = {
    family_sans: typo.family_sans,
    family_display: typo.family_display,
    family_mono: typo.family_mono,
  };
  const tokens = {
    colors: input.designMd.visual.colors,
    fonts,
    radius: input.designMd.visual.radius,
    shadow: input.designMd.visual.shadow,
  };
  const skeletons = buildSkeletonsForUnion({
    screens: input.screens.map((id) => ({ id })),
    tokens,
    mode: input.mode,
  });
  try {
    await writeSkeletons(input.iterDir, skeletons);
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    error(
      `qfai prototyping iterate --emit-skeletons: failed to write placeholder HTML ` +
        `(cause=${reason}). Offending screen(s): ${input.screens.join(", ")}.`,
    );
    return 2;
  }
  return 0;
}

// TODO(next-minor): extract composeCaptureUrl + collectScreensForCapture
// into core/prototyping/captureUrlCompose.ts + captureScreensResolve.ts.
// Both helpers are pure (no captured runPrototypingIterate state) and
// orthogonal to the iterate driver's primary concerns (cycle gating /
// drift detection / freeze / exit code dispatch). Extracting them lets
// the driver shrink toward the CLAUDE.md ~50 LOC guidance and removes
// the export-without-unit-test pressure on composeCaptureUrl by giving
// it a natural module home with co-located tests.

/**
 * Discriminated outcome of {@link composeCaptureUrl}. Mirrors the
 * `ok=true/false` shape used by other helpers in this module so the
 * caller can short-circuit with the structured diagnostic without
 * resorting to bare `as` casts on a string-or-null sentinel
 * (CLAUDE.md project rule).
 */
type ComposeCaptureUrlResult = { ok: true; url: string | null } | { ok: false; reason: string };

/**
 * Compose the navigation URL passed to {@link CaptureScreenFn}.
 *
 * Codex P2 wave-8 fix: UI contracts persist route-relative paths
 * (e.g. `/orders/new`); the default Playwright runner forwards the
 * value to `page.goto(args.url)`, which rejects non-absolute URLs
 * with an `ERR_INVALID_URL`-class navigation error and aborts capture
 * with exit 2. Pre-fix, `screen.url ?? options.targetUrl ?? null`
 * preferred the route verbatim and dropped the operator-supplied
 * base URL on the floor.
 *
 * Composition rules:
 *   - `screen.url` is an absolute URL (`http://` / `https://`) →
 *     forwarded verbatim. The base URL has no effect on absolute
 *     overrides (operator wins).
 *   - `screen.url` is route-relative AND `targetUrl` is set →
 *     `new URL(screen.url, targetUrl).toString()`. Leading slash is
 *     optional; `new URL` handles both `/orders/new` and `orders/new`.
 *   - `screen.url` is route-relative AND `targetUrl` is unset →
 *     `{ ok: false }` with an explanatory reason so the caller can
 *     surface a per-screen exit 2 with the operator action.
 *   - `screen.url` is undefined → fall back to `targetUrl` (verbatim)
 *     or `null` (legacy "no URL" shape for runners that infer their
 *     own target).
 */
export function composeCaptureUrl(
  screenUrl: string | undefined,
  targetUrl: string | undefined,
): ComposeCaptureUrlResult {
  if (screenUrl === undefined) {
    return { ok: true, url: targetUrl ?? null };
  }
  if (/^https?:\/\//i.test(screenUrl)) {
    return { ok: true, url: screenUrl };
  }
  if (targetUrl === undefined) {
    // Operator-facing diagnostic: name the public CLI flag
    // (`--target-url`) rather than the internal options field
    // (`options.targetUrl`). Surrounding `qfai prototyping iterate
    // --capture:` warnings already use the public flag surface for
    // consistency.
    return {
      ok: false,
      reason:
        `has route-relative URL ${JSON.stringify(screenUrl)} but no base URL is set; ` +
        "provide --target-url <base> so the route can be composed against a navigable origin.",
    };
  }
  try {
    return { ok: true, url: new URL(screenUrl, targetUrl).toString() };
  } catch (cause) {
    // Operator-facing diagnostic: name the public CLI flag
    // (`--target-url`) rather than the internal options field.
    return {
      ok: false,
      reason:
        `has unparseable URL composition (screen URL=${JSON.stringify(screenUrl)}, ` +
        `--target-url=${JSON.stringify(targetUrl)}, cause=${String(cause)}).`,
    };
  }
}

/**
 * Derive the per-screen capture descriptor list from the project's UI
 * contracts when the operator drives `--capture` from the CLI without
 * supplying a `screens[]` DI hook.
 *
 * Codex P1 wave-8 fix: pre-fix, `qfai prototyping iterate --capture`
 * silently no-op'd because the CLI wiring only sets `capture: true`
 * and never threaded the discovered UI contract screens into
 * `options.screens`. The `runCapturePath` early-return on an empty
 * screens list converted the operator-facing flag into a no-op (a
 * warning + exit 0 with zero PNG/HTML written).
 *
 * Source of truth: `readUiContractScreenContracts` (the same reader
 * used by certify's per-(spec × screen) gate). Each canonical
 * `{ screenId, route }` becomes a `{ id, url }` entry — `htmlSourceCopy`
 * is left unset (the default `false` posture; operators who need
 * byte-equivalent HTML must still pass a DI screens[] hook).
 *
 * Returns an empty list when no UI contracts are present. The caller
 * (`runCapturePath`) then surfaces the "no screens[] declared"
 * warning and exits 0, preserving the documented "no screens to
 * capture" graceful path.
 */
async function collectScreensForCapture(
  root: string,
  contractsDir: string,
): Promise<readonly IterateCaptureScreen[]> {
  const canonical = await readUiContractScreenContracts(root, contractsDir);
  return canonical.map((entry) => ({ id: entry.screenId, url: entry.route }));
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

/**
 * Structural type-predicate for the loose `PrototypingJsonShape`
 * record. The shape is intentionally permissive — every field is
 * `unknown` and individually narrowed by the field-specific readers
 * (`readFrozenSurfaceUnionField`, `readFrozenLicenseCatalog`,
 * `collectImageSources`). Accepting any non-array object suffices for
 * the wrapper; bare `as PrototypingJsonShape` casts on a verified
 * `Record<string, unknown>` would otherwise promise the per-field
 * shape this loader does not actually verify (CLAUDE.md "avoid bare
 * `as` type assertions; prefer type narrowing"). The asymmetry with
 * `asIterations` (which leaves `iterations[]` typed as `unknown[]`)
 * is preserved: per-iteration narrowing still lives in `shouldStop`.
 */
function isPrototypingJsonShape(value: unknown): value is PrototypingJsonShape {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Narrow `unknown` to `readonly unknown[]` without triggering
// `@typescript-eslint/no-unsafe-assignment`. The built-in
// `Array.isArray(x: unknown)` narrows to `any[]`, which the typed-lint
// pass treats as unsafe when spread. This user-defined predicate keeps
// the spread on the safe `unknown[]` branch.
function isUnknownArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

async function readPrototypingJson(absPath: string): Promise<PrototypingJsonShape | null> {
  try {
    const raw = await readFile(absPath, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    if (!isPrototypingJsonShape(parsed)) return null;
    return parsed;
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

/**
 * Read `frozenSurfaceUnion` from prototyping.json. Returns `null` when
 * the field is missing, malformed, **or empty** (zero-length array).
 * Post-condition: a non-null return value is always a `string[]` of
 * length ≥ 1 with non-empty string entries — callers can branch on
 * `!== null` alone without re-checking `length > 0` (codex r3270095015
 * NIT, 19th-wave).
 *
 * 13th-wave Fix (codex r3265953324, MAJOR/P1): the cycle ≥ 1 drift gate
 * no longer falls back to `frozenSpecsCovered` when this field is
 * absent — pre-12th-wave records had a single-spec `frozenSpecsCovered`
 * that, compared against the live multi-spec UNION, produced the
 * original MAJOR/P1 false-positive (TC-0012-0415 / codex r3265480688).
 * The fallback documented "the prior — buggy — baseline" silently
 * restored the bug. Callers must now hard-fail at cycle ≥ 1 when
 * `null` is returned and instruct the operator to re-seed via
 * `--cycle 0` so a fresh UNION snapshot is written.
 */
function readFrozenSurfaceUnionField(record: PrototypingJsonShape): string[] | null {
  const raw = record.frozenSurfaceUnion;
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: string[] = [];
  for (const value of raw) {
    if (typeof value !== "string" || value.length === 0) return null;
    out.push(value);
  }
  return out;
}

/**
 * Read `frozenLicenseCatalog` from prototyping.json. Returns `null`
 * when the field is missing or malformed so callers can fall back to
 * the in-memory default.
 */
/**
 * Deep-equal check for two {@link LicenseCatalog} records. Used at
 * cycle ≥ 1 to detect drift of the on-disk `frozenLicenseCatalog`
 * field against the in-memory SSOT (`DEFAULT_LICENSE_CATALOG`).
 *
 * 13th-wave Fix (codex r3265947252, P2): order-insensitive within each
 * string[] (allowedSources, licenseTiers[*], sourceHosts[*]) so a
 * legitimate cycle-0 snapshot whose JSON serialization reordered the
 * entries deterministically still compares equal.
 */
function licenseCatalogsEqual(a: LicenseCatalog, b: LicenseCatalog): boolean {
  if (!stringArraysSetEqual(a.allowedSources, b.allowedSources)) return false;
  if (!recordOfStringArraysEqual(a.licenseTiers, b.licenseTiers)) return false;
  const aHosts = a.sourceHosts;
  const bHosts = b.sourceHosts;
  if (aHosts === undefined && bHosts === undefined) return true;
  if (aHosts === undefined || bHosts === undefined) return false;
  return recordOfStringArraysEqual(aHosts, bHosts);
}

function recordOfStringArraysEqual(
  a: Record<string, readonly string[]>,
  b: Record<string, readonly string[]>,
): boolean {
  const aKeys = Object.keys(a).sort();
  const bKeys = Object.keys(b).sort();
  if (aKeys.length !== bKeys.length) return false;
  for (let i = 0; i < aKeys.length; i += 1) {
    const ak = aKeys[i];
    const bk = bKeys[i];
    if (ak === undefined || bk === undefined || ak !== bk) return false;
    const av = a[ak];
    const bv = b[bk];
    if (av === undefined || bv === undefined) return false;
    if (!stringArraysSetEqual(av, bv)) return false;
  }
  return true;
}

function stringArraysSetEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  for (let i = 0; i < sortedA.length; i += 1) {
    if (sortedA[i] !== sortedB[i]) return false;
  }
  return true;
}

/**
 * Read `licensePatchAudit[]` from prototyping.json and narrow each row
 * to {@link LicensePatchAuditRow}. Malformed rows are silently skipped
 * so a partially-corrupted audit ledger still surfaces the valid
 * additions. Returns an empty array when the field is absent or not
 * an array.
 */
function readLicensePatchAuditRows(
  record: PrototypingJsonShape | null,
): readonly LicensePatchAuditRow[] {
  if (!record) return [];
  const raw = record.licensePatchAudit;
  if (!isUnknownArray(raw)) return [];
  const out: LicensePatchAuditRow[] = [];
  for (const entry of raw) {
    if (isLicensePatchAuditRow(entry)) {
      out.push(entry);
    }
  }
  return out;
}

/**
 * Derive the runtime license catalog from a frozen baseline plus the
 * accumulated `licensePatchAudit[]` rows.
 *
 * Option A (Codex P1 wave-4): the cycle-0 frozen catalog is the
 * immutable baseline (always equal to `DEFAULT_LICENSE_CATALOG`); the
 * canonical record of mid-loop additions lives in the audit ledger.
 * Reads union the audit rows' `addedSources` into the frozen
 * `allowedSources` AND the rows' optional `addedLicenseTiers` into
 * the frozen `licenseTiers` so license-verify on cycle >= 1 accepts
 * the same sources / tier mappings the operator allow-listed via
 * `--license-patch` on cycle 0.
 *
 * `sourceHosts` is still not replayed (the audit-row schema does not
 * persist it); operators who need host pinning on subsequent cycles
 * must pass a fresh `--license-patch`. Legacy 3-key audit rows
 * (without `addedLicenseTiers`) remain backward-compatible and replay
 * source additions only.
 */
export function effectiveLicenseCatalog(
  frozen: LicenseCatalog,
  auditRows: readonly LicensePatchAuditRow[],
): LicenseCatalog {
  const seen = new Set(frozen.allowedSources);
  const merged: string[] = [...frozen.allowedSources];
  const mergedTiers: Record<string, string[]> = Object.fromEntries(
    Object.entries(frozen.licenseTiers).map(([k, v]) => [k, [...v]]),
  );
  for (const row of auditRows) {
    for (const source of row.addedSources) {
      if (!seen.has(source)) {
        seen.add(source);
        merged.push(source);
      }
    }
    if (row.addedLicenseTiers !== undefined) {
      for (const [source, tiers] of Object.entries(row.addedLicenseTiers)) {
        const existing = mergedTiers[source];
        if (existing === undefined) {
          mergedTiers[source] = [...tiers];
          continue;
        }
        for (const t of tiers) {
          if (!existing.includes(t)) existing.push(t);
        }
      }
    }
  }
  return {
    allowedSources: merged,
    licenseTiers: mergedTiers,
    ...(frozen.sourceHosts !== undefined
      ? {
          sourceHosts: Object.fromEntries(
            Object.entries(frozen.sourceHosts).map(([k, v]) => [k, [...v]]),
          ),
        }
      : {}),
  };
}

function readFrozenLicenseCatalog(record: PrototypingJsonShape | null): LicenseCatalog | null {
  if (!record) return null;
  const raw = record.frozenLicenseCatalog;
  if (!isRecord(raw)) return null;
  const allowed = raw.allowedSources;
  const tiers = raw.licenseTiers;
  if (!Array.isArray(allowed) || !isRecord(tiers)) return null;
  const allowedSources: string[] = [];
  for (const value of allowed) {
    if (typeof value !== "string" || value.length === 0) return null;
    allowedSources.push(value);
  }
  const licenseTiers: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(tiers)) {
    if (!Array.isArray(v)) return null;
    const list: string[] = [];
    for (const entry of v) {
      if (typeof entry !== "string") return null;
      list.push(entry);
    }
    licenseTiers[k] = list;
  }
  // 10th-wave Fix G: parse the optional `sourceHosts` block. Treat a
  // missing / malformed block as "host check disabled" (backward-compat
  // with pre-host-pinning catalogs). A malformed entry whose value is
  // not a string[] returns `null` from the whole reader so the caller
  // falls back to DEFAULT_LICENSE_CATALOG rather than silently
  // shipping a half-valid frozen catalog.
  let sourceHosts: Record<string, string[]> | undefined;
  const rawHosts = raw.sourceHosts;
  if (rawHosts !== undefined) {
    if (!isRecord(rawHosts)) return null;
    const parsedHosts: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(rawHosts)) {
      if (!Array.isArray(v)) return null;
      const list: string[] = [];
      for (const entry of v) {
        if (typeof entry !== "string" || entry.length === 0) return null;
        list.push(entry);
      }
      parsedHosts[k] = list;
    }
    sourceHosts = parsedHosts;
  }
  const out: LicenseCatalog = { allowedSources, licenseTiers };
  if (sourceHosts !== undefined) {
    return { ...out, sourceHosts };
  }
  return out;
}

type CollectImageSourcesResult =
  | { ok: true; sources: ImageSource[] | null }
  | { ok: false; errors: string[] };

/**
 * Read `imageSources` from prototyping.json and narrow each entry
 * to the strict `{url, license, attribution, source}` shape. Returns
 * `{ok: true, sources: null}` when the field is absent (caller skips
 * license-verify); `{ok: true, sources: []}` when the field is present
 * but empty (caller also skips); `{ok: true, sources: <non-empty>}`
 * when every entry validates.
 *
 * 10th-wave Fix H (codex r3265260665, P2): malformed entries are no
 * longer silently dropped. Pre-fix, an `imageSources[]` whose entries
 * all carried e.g. a misspelled `licence:` field reduced to an empty
 * narrowed array, and the caller skipped the exit-66 license gate
 * entirely. Now any non-record entry, missing field, or non-string
 * field returns `{ok: false, errors}` listing the offending index +
 * field; the caller surfaces a hard error and exits non-zero so the
 * operator fixes the typo before the cycle proceeds.
 */
function collectImageSources(record: PrototypingJsonShape | null): CollectImageSourcesResult {
  if (!record) return { ok: true, sources: null };
  const raw = record.imageSources;
  if (raw === undefined) return { ok: true, sources: null };
  if (!Array.isArray(raw)) {
    return {
      ok: false,
      errors: ["imageSources must be an array (got non-array value)"],
    };
  }
  const out: ImageSource[] = [];
  const errors: string[] = [];
  raw.forEach((entry, index) => {
    if (!isRecord(entry)) {
      errors.push(`imageSources[${index}]: entry is not a JSON object`);
      return;
    }
    const url = entry.url;
    const source = entry.source;
    const license = entry.license;
    const missing: string[] = [];
    const urlOk = typeof url === "string" && url.length > 0;
    const sourceOk = typeof source === "string" && source.length > 0;
    const licenseOk = typeof license === "string" && license.length > 0;
    if (!urlOk) missing.push("url");
    if (!sourceOk) missing.push("source");
    if (!licenseOk) missing.push("license");
    if (!urlOk || !sourceOk || !licenseOk) {
      errors.push(
        `imageSources[${index}]: missing or non-string required field(s): ${missing.join(", ")}`,
      );
      return;
    }
    // 12th-wave Fix (codex r3265482144, P2): promote `attribution`
    // into the runtime ImageSource. Missing / non-string attribution
    // is intentionally NOT treated as an input-shape (exit 2) error
    // — the CLI contract puts "missing attribution" under exit 66
    // (license-verify rejection), so we default to "" here and let
    // `licenseVerify` emit the structured `license-missing-attribution`
    // diagnostic. This keeps the runtime gate's exit code aligned
    // with the contract surface.
    const rawAttribution = entry.attribution;
    const attribution = typeof rawAttribution === "string" ? rawAttribution : "";
    out.push({ url, source, license, attribution });
  });
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, sources: out };
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
  frozenSpecsCovered: readonly string[];
  /**
   * Cycle-0 UI-bearing UNION snapshot. Persisted in prototyping.json
   * as `frozenSurfaceUnion` and consumed by the cycle ≥ 1 drift gate
   * as the apples-to-apples baseline for the live UNION comparison.
   * See 12th-wave Fix (codex r3265480688, MAJOR/P1).
   */
  frozenSurfaceUnion: readonly string[];
  frozenLicenseCatalog: LicenseCatalog;
  /**
   * Declared screen ids (underscore casing). When non-empty the seed
   * iteration's `evidenceRefs[]` bijects with this list. Empty /
   * absent → no `evidenceRefs[]` entries on the seed iteration
   * (legacy default-OFF capture path).
   */
  declaredScreens?: readonly string[];
  /**
   * Resolved per-loop prototyping mode (convergence default,
   * exploration enables medium gate relaxation). Persisted as
   * `prototyping.json#mode` AND copied onto the seed iteration record
   * so certify can refuse to seal a loop that produced any
   * exploration-mode iteration.
   */
  mode?: "convergence" | "exploration";
};

/**
 * Placeholder proseCritique used by the cycle-0 seed iteration so
 * `prototyping.json` is validate-conformant out of the box. The
 * validator requires 200..500 words; the orchestrator / reviewer
 * overwrites this with a real critique on the first reviewer pass.
 * The text is a single deterministic sentence repeated to land
 * inside the band.
 */
/**
 * Build the cycle-0 seed `iterations[]` array. Emits exactly one
 * iteration record whose shape passes `validatePrototypingEvidence`
 * AND `validatePrototypingArtifactRefIntegrity` out of the box.
 * Scores are intentionally all `weak` so `shouldStop` cannot
 * accidentally classify the seed as `axes-exceptional`; the reviewer
 * overwrites scores on the first review pass.
 *
 * `evidenceRefs` shape is the canonical `{ screenshot, html }` object
 * form per the {@link Iteration} type, `buildEvaluatorReview`, and the
 * ref-integrity validator (which reads `iter.evidenceRefs.screenshot`
 * / `.html` directly). When multiple screens are declared, the seed
 * uses the FIRST screen's paths as the iteration-level representative
 * — the reviewer overwrites this with the actually-reviewed surface on
 * the first review pass. When no screens are declared, the seed uses
 * the default `iter-NN/index.{png,html}` placeholder so the validator
 * has a concrete path to check.
 */
function buildSeedIterations(
  declaredScreens: readonly string[],
  mode?: "convergence" | "exploration",
): unknown[] {
  // Co-locate {screenshot, html} from the first declared screen; fall
  // back to a deterministic placeholder when no screens are present so
  // the seed always has non-empty fields. (refIntegrity treats empty
  // fields as `QFAI-PROT-009` errors.)
  //
  // Paths are FULL repo-relative (e.g. `.qfai/evidence/prototyping/
  // iter-00/<screen>.png`), matching the SSOT shape used by
  // `buildEvaluatorReview` evidenceRefs and by `validatePrototyping
  // ArtifactRefIntegrity` (which calls `path.resolve(root, value)`).
  const firstScreen = declaredScreens[0];
  const screenshotRef =
    firstScreen !== undefined
      ? iterationScreenshotPath(0, firstScreen)
      : `${iterationDir(0)}/index.png`;
  const htmlRef =
    firstScreen !== undefined ? iterationHtmlPath(0, firstScreen) : `${iterationDir(0)}/index.html`;
  return [
    {
      index: 0,
      commitSha: SEED_COMMIT_SHA,
      proseCritique: SEED_PROSE_CRITIQUE_PLACEHOLDER,
      scores: {
        informationArchitecture: "weak",
        navigationFlow: "weak",
        usability: "weak",
        functionality: "weak",
      },
      layoutAntiPatternsDetected: [],
      designMdViolations: [],
      pivotDirective: "continue",
      reviewerId: SEED_REVIEWER_ID,
      evidenceRefs: {
        screenshot: screenshotRef,
        html: htmlRef,
      },
      // Prototyping-mode discriminator: per-iteration mode slot.
      // Certify reads `prototyping.json#iterations[i].mode` to refuse
      // sealing a loop that produced any exploration-mode iteration.
      // Default `convergence` keeps legacy iterations
      // (pre-mode-slot writes) interpreted as convergence; the seed
      // here always carries the resolved mode explicitly.
      ...(mode !== undefined ? { mode } : {}),
    },
  ];
}

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
    body = isPrototypingJsonShape(parsed) ? parsed : {};
  } catch {
    body = {};
  }
  // Drop per-loop state — these must be re-generated by the new loop.
  // Per-loop slots: `iterations[]`, `reviewerGate`, `acceptedIterationIndex`,
  // `stopReason`, `fullHarness` (legacy pre-UX-loop block consumed by
  // QFAI-PROT-329 etc.), `executionPlan` (legacy pre-UX-loop plan block
  // consumed by QFAI-PROT-311), `completionClaimed` / `phase` / `completionCertificate`
  // (the completion-claim trio read by `validateCompletionCertificateIssues`),
  // `designMd`, `runId`, `specsCovered`. Adding a new per-loop field
  // requires updating BOTH this list AND the comment.
  //
  // Validate-conformance note: the iterations[] is seeded with a
  // single stub entry whose evidenceRefs[] bijects with `declaredScreens`
  // (if any) so `qfai validate --profile prototyping` is conformant
  // immediately after iterate completes. The reviewer overwrites this
  // entry on the first review pass.
  body.iterations = buildSeedIterations(seed.declaredScreens ?? [], seed.mode);
  body.acceptedIterationIndex = 0;
  body.stopReason = null;
  // Prototyping-mode discriminator: the resolved per-loop mode is
  // persisted ONLY as `iterations[i].mode` (per-iteration slot).
  // The top-level `mode` slot in prototyping.json is an
  // operator-defined object schema preserved verbatim across the
  // cycle-0 reset (see the operator-defined-keys comment above) — we
  // MUST NOT overwrite it with a string discriminator.
  delete body.reviewerGate;
  // Legacy `fullHarness` block (pre-UX-loop schema) is also per-loop
  // state. Pre-1.8.9 projects whose prototyping.json still carries
  // `fullHarness.{runId,status,scoringTrace,...}` must not let those
  // fields survive into a fresh loop, otherwise validate / report
  // surfaces (e.g. PROT-329) will display prior-loop completion data
  // alongside the new loop.
  delete body.fullHarness;
  // Legacy `executionPlan` block (pre-UX-loop schema) is per-loop state
  // too: no current writer or skill produces or updates it, yet
  // `validatePrototypingDelegationMap` reads its `delegationMap`. Left in
  // place, a prior loop's stale assignment would raise QFAI-PROT-311
  // against a fresh loop that never authored it, with no in-flow repair
  // path short of hand-editing the state file.
  delete body.executionPlan;
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
  // `imageSources` is per-loop content (image fills recorded as the
  // prototype gains them). Cycle 0 is a hard reset, so the prior
  // loop's image fills must not leak into the new run's license
  // verify. The frozen catalog is re-seeded below.
  delete body.imageSources;
  // Cycle 0 always re-anchors designMd, runId, and specsCovered.
  // specsCovered is sourced from resolvePrimaryPrototypingSpec on every
  // cycle 0 — it is a per-loop slot, not an operator-defined one.
  body.designMd = seed.designMd;
  body.runId = seed.runId;
  body.specsCovered = [...seed.specsCovered];
  // Persist the cycle-0 SSOT fields. `frozenSpecsCovered` is the
  // single-spec scope under review (mirrors `specsCovered`);
  // `frozenSurfaceUnion` is the multi-spec UI-bearing UNION that the
  // cycle ≥ 1 drift gate compares the live UNION against;
  // `frozenLicenseCatalog` is the stock-photo allowlist used by
  // `licenseVerify` in every subsequent cycle.
  body.frozenSpecsCovered = [...seed.frozenSpecsCovered];
  body.frozenSurfaceUnion = [...seed.frozenSurfaceUnion];
  body.frozenLicenseCatalog = {
    allowedSources: [...seed.frozenLicenseCatalog.allowedSources],
    licenseTiers: Object.fromEntries(
      Object.entries(seed.frozenLicenseCatalog.licenseTiers).map(([k, v]) => [k, [...v]]),
    ),
    // 10th-wave Fix G: persist the per-source host allowlist when
    // present so cycle ≥1 license-verify reads the FROZEN host
    // binding (immutable through the loop). Older catalogs without
    // sourceHosts round-trip cleanly (the field is omitted).
    ...(seed.frozenLicenseCatalog.sourceHosts !== undefined
      ? {
          sourceHosts: Object.fromEntries(
            Object.entries(seed.frozenLicenseCatalog.sourceHosts).map(([k, v]) => [k, [...v]]),
          ),
        }
      : {}),
  };
  await mkdir(path.dirname(protoJsonAbs), { recursive: true });
  await writeFile(protoJsonAbs, `${JSON.stringify(body, null, 2)}\n`, "utf-8");
}

type ClearEvidenceIterDirsResult = { ok: true } | { ok: false; failedDir: string; cause: unknown };

/**
 * Cycle-0 reset helper: removes every `iter-NN/` directory under the
 * pre-joined `<root>/.qfai/evidence/prototyping` evidence root and
 * returns a structured `{ok, failedDir, cause}` result so the caller
 * can fail-closed without exception unwinding.
 *
 * Intentionally distinct from `core/prototyping/iterationPaths.ts`'s
 * `deleteStaleIterDirs(root)`, which takes a project root, throws on
 * the first rm failure, and returns a flat `{deleted: string[]}`
 * summary for the multi-spec migration helpers. The two contracts are
 * not unified yet.
 */
/**
 * Lightweight directory-existence check that distinguishes
 * "does not exist" (returns false) from other I/O failures (re-thrown
 * so the caller fails closed). Used by the cycle-0 `--force` backup
 * gate to decide whether a destructive re-run is in play.
 */
async function dirExists(absPath: string): Promise<boolean> {
  try {
    const s = await stat(absPath);
    return s.isDirectory();
  } catch (err) {
    if (isEnoent(err)) return false;
    throw err;
  }
}

/**
 * Recursively list every file under `absDir` (post-order). Returns
 * absolute paths. Used by the mutation-log writer to emit one JSONL
 * entry per moved file under `--cycle 0 --force`.
 */
async function collectFilesRecursively(absDir: string): Promise<string[]> {
  const out: string[] = [];
  const visit = async (current: string): Promise<void> => {
    let entries: Dirent[] = [];
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch (cause) {
      if (isEnoent(cause)) return;
      throw cause;
    }
    for (const entry of entries) {
      const child = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await visit(child);
      } else if (entry.isFile()) {
        out.push(child);
      }
    }
  };
  await visit(absDir);
  return out;
}

async function clearEvidenceIterDirs(
  evidenceRootAbs: string,
  root?: string,
): Promise<ClearEvidenceIterDirsResult> {
  let entries: string[];
  try {
    entries = await readdir(evidenceRootAbs);
  } catch (err) {
    if (isEnoent(err)) return { ok: true };
    return { ok: false, failedDir: evidenceRootAbs, cause: err };
  }
  // Mutation-log wiring: every destructive iter-NN mutation
  // funnels through the mutation-log writer. Lazy import keeps the
  // helper out of the hot path when no iter-NN dirs exist.
  let logEvidenceDelete:
    | ((root: string, caller: string, relPath: string, priorSize: number) => Promise<void>)
    | null = null;
  if (root !== undefined) {
    try {
      const mod = await import("../../core/prototyping/mutationLog.js");
      logEvidenceDelete = mod.logEvidenceDelete;
    } catch {
      // Best-effort: a failed import still surfaces the SSOT-sync
      // reviewer-gate finding R-EVIDENCE-MUTATION-UNLOGGED at the
      // next validate pass; the cleanup itself proceeds.
      logEvidenceDelete = null;
    }
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
    // Walk the iter-NN/ tree BEFORE the destructive rm so each removed
    // file is recorded with its prior size. The walk is best-effort:
    // a failure here logs zero entries but still proceeds with the
    // structural mutation (the SSOT-sync pair scan is the backstop).
    if (root !== undefined && logEvidenceDelete !== null) {
      try {
        const removedFiles = await collectFilesRecursively(abs);
        for (const fileAbs of removedFiles) {
          const rel = path.relative(root, fileAbs).replace(/\\/g, "/");
          let priorSize = 0;
          try {
            priorSize = (await stat(fileAbs)).size;
          } catch {
            // best-effort size capture
          }
          await logEvidenceDelete(root, "iterate-clearEvidence", rel, priorSize);
        }
      } catch (logCause) {
        warn(
          `qfai prototyping iterate --cycle 0: mutation-log walk failed for ${name} (${String(logCause)}); proceeding with rm.`,
        );
      }
    }
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

// 19th-wave Fix (codex r3270055214, MAJOR): `specDirExists` and
// `resolveSurfaceUnion` (below) were moved to
// `core/prototyping/specResolution.ts` so the CLI → CLI sideways
// import that `prototypingCertify.ts` had to take (to align with
// iterate's drift gate) is replaced by both CLI commands importing
// the union resolver from a single core module.

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
/**
 * Mirror the accepted iteration's per-screen evidence into the project-
 * wide aggregate dirs:
 *   `.qfai/evidence/prototyping/screenshots/<screen-id>.png`
 *   `.qfai/evidence/prototyping/html/<screen-id>.html`
 *
 * Underscore-cased screen ids are used end-to-end (validator rejects
 * hyphen form via QFAI-PROT-010); this helper does NOT re-case ids
 * itself — it just byte-copies the latest iter content if present.
 * Mirroring is best-effort: missing source files are silently skipped
 * so a non-capture run (default) does not fail on an empty iter dir.
 */
async function mirrorAcceptedIterToAggregateDirs(
  root: string,
  acceptedIterIndex: number,
): Promise<void> {
  if (acceptedIterIndex < 0) return;
  const iterAbs = path.join(
    root,
    PROTOTYPING_EVIDENCE_REL,
    `iter-${String(acceptedIterIndex).padStart(2, "0")}`,
  );
  let entries: string[];
  try {
    entries = await readdir(iterAbs);
  } catch (err) {
    if (isEnoent(err)) return;
    throw err;
  }
  const pngDir = path.join(root, PROTOTYPING_EVIDENCE_REL, "screenshots");
  const htmlDir = path.join(root, PROTOTYPING_EVIDENCE_REL, "html");
  let madePngDir = false;
  let madeHtmlDir = false;
  for (const name of entries.sort()) {
    const lower = name.toLowerCase();
    const isPng = lower.endsWith(".png");
    const isHtml = lower.endsWith(".html");
    if (!isPng && !isHtml) continue;
    const sourceAbs = path.join(iterAbs, name);
    let s: Awaited<ReturnType<typeof stat>>;
    try {
      s = await stat(sourceAbs);
    } catch {
      continue;
    }
    if (!s.isFile()) continue;
    const targetDir = isPng ? pngDir : htmlDir;
    if (isPng && !madePngDir) {
      await mkdir(pngDir, { recursive: true });
      madePngDir = true;
    }
    if (isHtml && !madeHtmlDir) {
      await mkdir(htmlDir, { recursive: true });
      madeHtmlDir = true;
    }
    const targetAbs = path.join(targetDir, name);
    try {
      await copyFile(sourceAbs, targetAbs);
    } catch (cause) {
      warn(
        `qfai prototyping iterate: aggregate-mirror failed for ${name} ` +
          `(${cause instanceof Error ? cause.message : String(cause)}).`,
      );
    }
  }
}

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

/**
 * Read-only peek of the canonical prototyping state file. Reads
 * `stopReason` + `acceptedIterationIndex` (and the recorded
 * `iterations[]` count) from `.qfai/evidence/prototyping/prototyping.json`
 * and reports convergence WITHOUT invoking the iterate loop.
 *
 * Exit codes:
 *   0  converged: `stopReason === "axes-exceptional"` AND
 *      `acceptedIterationIndex` is a non-null number.
 *   2  not converged (any other state, including missing state file).
 *
 * Pure read; never writes to disk. Orthogonal to capture / auto-serve
 * (those defaults stay OFF).
 */
/**
 * Read-only peek of the canonical `prototyping.json` state.
 *
 * Cycle parameter scope: `cycle` is **informational only** — it is
 * printed in the header to anchor the operator's mental model
 * ("which cycle did I ask to peek?"), but the body reads only
 * top-level fields (`stopReason`, `acceptedIterationIndex`,
 * `iterations.length`) and never indexes into the iterations array
 * by cycle. The peek is idempotent across cycle values; the result
 * is the same for `--cycle 0 --check-convergence` and
 * `--cycle 9 --check-convergence` against the same state file. We
 * still reject out-of-range cycles upstream (in `runPrototypingIterate`)
 * to surface the same input-error class diagnostic the loop entry
 * gate uses, instead of masking a typo as "converged at cycle 99".
 */
/**
 * Refuse a cycle that would advance an already-terminal loop.
 *
 * Returns the exit code to propagate (`2`) when the recorded state says
 * the loop is done and `cycle` is past the accepted iteration; returns
 * `null` when the cycle is legal and iterate should proceed.
 *
 * Predicate — all three must hold:
 *   1. `prototyping.json` records `stopReason === "axes-exceptional"`.
 *      That is the only SEALED state: the only one
 *      `--check-convergence` reports as converged and the only one
 *      `qfai prototyping certify` will seal. The other members of the
 *      stop enum are terminal but not sealed, and every one of them is
 *      a state the operator is told to fix and retry —
 *      `license-verify-fail` ("replace with allowlisted sources"),
 *      `input-error` (a typo in the invocation), `max-iterations`
 *      (budget exhausted, no certifiable result). Refusing those made
 *      the fix un-verifiable: `acceptedIterationIndex` keeps the value
 *      it already had, so the retry of the very same cycle was rejected
 *      before the verifier ran, and the only way forward was discarding
 *      the whole loop from cycle 0.
 *   2. `acceptedIterationIndex` is an integer (an iteration was
 *      actually accepted).
 *   3. `cycle > acceptedIterationIndex`.
 *
 * Consequences of the predicate, both deliberate:
 *   - `--cycle 0` never trips it (0 is never greater than a
 *     non-negative accepted index), so the documented hard reset
 *     stays available on a converged loop.
 *   - Re-running the accepted cycle itself (`cycle ===
 *     acceptedIterationIndex`) stays available too — that is a redo of
 *     recorded work, not an extension past the seal.
 *
 * Pure read: never writes, never mutates `prototyping.json`.
 */
/**
 * The one stop reason that means the loop is SEALED rather than merely
 * finished. `--check-convergence` reports only this as converged, and only a
 * loop in this state can be sealed by `qfai prototyping certify`.
 */
const SEALED_STOP_REASON = "axes-exceptional";

async function refuseWhenLoopConverged(root: string, cycle: number): Promise<number | null> {
  // Cycle 0 is the documented escape hatch out of every terminal state and is
  // exempted before anything is read from the record. Deriving the exemption
  // from `cycle > acceptedIterationIndex` made it depend on the recorded value
  // being sane: a corrupt or legacy `-1` turned `0 > -1` true and refused the
  // one command that could repair the loop.
  if (cycle === 0) return null;
  const record = await readPrototypingJson(path.join(root, PROTOTYPING_JSON_REL));
  if (record === null) return null;
  const stopReasonRaw = record.stopReason;
  if (stopReasonRaw !== SEALED_STOP_REASON) return null;
  const acceptedRaw = record.acceptedIterationIndex;
  // A negative index is not an accepted iteration; it is a corrupt or
  // pre-format record, and the seal it would imply has no accepted work behind
  // it. Treated as "nothing accepted", which is what the JSDoc above already
  // assumes when it says "a non-negative accepted index".
  if (typeof acceptedRaw !== "number" || !Number.isInteger(acceptedRaw) || acceptedRaw < 0) {
    return null;
  }
  if (cycle <= acceptedRaw) return null;
  error(
    `qfai prototyping iterate: refusing --cycle ${String(cycle)} — the loop is already ` +
      `sealed (${PROTOTYPING_JSON_REL} records stopReason=${JSON.stringify(stopReasonRaw)}, ` +
      `acceptedIterationIndex=${String(acceptedRaw)}). Nothing was written; no iter-` +
      `${String(cycle).padStart(2, "0")} directory was created.`,
  );
  error(
    "  Creating it would leave a stale iteration directory, which the stale-iteration-directory " +
      "check in `qfai prototyping certify` rejects.",
  );
  error(
    "  Confirm the recorded state with `qfai prototyping iterate --check-convergence`, " +
      "then either run `qfai prototyping certify` to seal the run, or " +
      "`qfai prototyping iterate --cycle 0 --target-url <url> --force` to hard-reset and start " +
      "a new loop. `--force` is required: a converged loop always has an iter-00, and the " +
      "cycle-0 destructive-rerun gate refuses to overwrite it without that flag (it backs the " +
      "directory up to iter-00.backup-<ISO> first).",
  );
  return 2;
}

async function runCheckConvergencePeek(root: string, cycle: number): Promise<number> {
  const protoJsonAbs = path.join(root, PROTOTYPING_JSON_REL);
  const header = `qfai prototyping iterate --check-convergence (cycle ${cycle}):`;
  const record = await readPrototypingJson(protoJsonAbs);
  if (record === null) {
    info(header);
    info(
      "  Not converged: prototyping.json missing or unreadable at " +
        `${PROTOTYPING_JSON_REL}. Run \`qfai prototyping iterate --cycle 0 --target-url <url>\` ` +
        "to seed the loop first.",
    );
    return 2;
  }
  const stopReasonRaw = record.stopReason;
  const stopReason =
    typeof stopReasonRaw === "string" || stopReasonRaw === null ? stopReasonRaw : undefined;
  const acceptedRaw = record.acceptedIterationIndex;
  const acceptedIsInteger = typeof acceptedRaw === "number" && Number.isInteger(acceptedRaw);
  // A negative index is not an accepted iteration; it is a corrupt or
  // pre-format record, and the seal it would imply has no accepted work behind
  // it. `refuseWhenLoopConverged` already reads it that way, so this peek has
  // to agree — otherwise the peek reports "Converged" while the guard lets
  // `--cycle N` through, and the operator picks a recovery path from two
  // commands that disagree about the state.
  const acceptedIterationIndex = acceptedIsInteger && acceptedRaw >= 0 ? acceptedRaw : null;
  const iterations = asIterations(record);
  info(header);
  // Asymmetry note: `stopReason` printed as `<missing>` indicates the
  // field is absent from prototyping.json entirely (pre-cycle-0 / hand
  // -edited state); `acceptedIterationIndex` printed as `null` is the
  // canonical "pre-convergence" literal written by cycle 0. The two
  // shapes are intentionally different — do not unify on `<missing>`.
  info(`  stopReason: ${stopReason === undefined ? "<missing>" : String(stopReason)}`);
  // Printed from the raw value, not the normalized one, so a recorded `-1`
  // stays visible to the operator instead of being reported as `null`.
  info(`  acceptedIterationIndex: ${acceptedIsInteger ? String(acceptedRaw) : "null"}`);
  info(`  iterations: ${iterations.length}`);
  if (stopReason === "axes-exceptional" && acceptedIterationIndex !== null) {
    info("  Converged: axes-exceptional with accepted iteration recorded.");
    return 0;
  }
  // Build a precise diagnostic for the not-converged branch so the
  // operator can see WHY the loop did not converge.
  let reason: string;
  if (stopReason === "max-iterations") {
    reason = 'stopReason="max-iterations" (loop exhausted the 10-cycle budget).';
  } else if (stopReason === "license-verify-fail") {
    reason =
      'stopReason="license-verify-fail" (runtime license-verify gate rejected an image source).';
  } else if (stopReason === "input-error") {
    reason = 'stopReason="input-error" (input gate rejected the invocation).';
  } else if (stopReason === null || stopReason === undefined) {
    reason =
      "stopReason is null and no acceptedIterationIndex was recorded; the loop has not yet reached a terminal state.";
  } else if (stopReason === "axes-exceptional") {
    // Reachable only when the seal is present but the accepted index is not a
    // non-negative integer, which is the state the guard also refuses to treat
    // as sealed. Naming it beats falling through to "is not a converged state",
    // which would blame the stopReason the record actually carries.
    reason =
      'stopReason="axes-exceptional" but acceptedIterationIndex is ' +
      `${acceptedIsInteger ? String(acceptedRaw) : JSON.stringify(acceptedRaw)}, which records no ` +
      "accepted iteration; the seal has no accepted work behind it.";
  } else {
    reason = `stopReason=${JSON.stringify(stopReason)} is not a converged state.`;
  }
  info(`  Not converged: ${reason}`);
  return 2;
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
  if (reason === "license-verify-fail") {
    // License verify failure already emits its own diagnostic upstream;
    // this branch records the stop reason consistently with the enum.
    return 66;
  }
  if (reason === "input-error") {
    // Input-error class stops are emitted at the CLI boundary (cycle
    // out-of-range, primarySpecId malformed, etc.); this branch is
    // retained for completeness so the enum is exhaustive.
    return 2;
  }
  info(
    `qfai prototyping iterate: max iterations (${MAX_ITERATIONS}) reached. ` +
      "Run `qfai prototyping certify` to seal the run.",
  );
  return 65;
}

/**
 * Persist a stop reason to prototyping.json. Best-effort: if the file
 * does not exist yet (cycle 0 input-error before seed write, etc.), the
 * call is a no-op and the operator-visible diagnostic + exit code is
 * the canonical signal.
 */
async function persistStopReason(protoJsonAbs: string, reason: StopReason): Promise<void> {
  const body = await readPrototypingJson(protoJsonAbs);
  if (body === null) return;
  body.stopReason = reason;
  try {
    await writeFile(protoJsonAbs, `${JSON.stringify(body, null, 2)}\n`, "utf-8");
  } catch (err) {
    // Best-effort: a read-only filesystem / locked file should not
    // mask the upstream license-verify diagnostic. Surface a warning
    // so operators can see the persistence skipped (pre-fix this was
    // a bare-catch that silently dropped every write failure
    // including transient OS conditions worth flagging).
    warn(
      `qfai prototyping iterate: could not persist stopReason '${reason}' to ` +
        `prototyping.json (${String(err)}); the operator-visible exit code is the canonical signal.`,
    );
  }
}

type ApplyLicensePatchFromFileResult =
  | { ok: true; nextCatalog: LicenseCatalog }
  | { ok: false; error: string };

/**
 * Read + apply an add-only license-patch file and append the audit row
 * to prototyping.json#licensePatchAudit[]. The patch file is read as
 * raw bytes; the bytes are sha256-hashed for the audit row + parsed
 * with JSON or YAML based on file extension.
 */
async function applyLicensePatchFromFile(
  root: string,
  patchRelOrAbs: string,
  liveCatalog: LicenseCatalog,
  protoJsonAbs: string,
): Promise<ApplyLicensePatchFromFileResult> {
  const patchAbs = path.isAbsolute(patchRelOrAbs) ? patchRelOrAbs : path.join(root, patchRelOrAbs);
  let bytes: Buffer;
  try {
    bytes = await readFile(patchAbs);
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    return { ok: false, error: `license-patch read failed: ${reason}` };
  }
  const text = bytes.toString("utf-8");
  let parsed: unknown;
  try {
    if (patchAbs.toLowerCase().endsWith(".yaml") || patchAbs.toLowerCase().endsWith(".yml")) {
      const yaml = await import("yaml");
      parsed = yaml.parse(text);
    } else {
      parsed = JSON.parse(text);
    }
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    return { ok: false, error: `license-patch parse failed: ${reason}` };
  }
  const validated = parseLicensePatch(parsed);
  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }
  const nowIso = new Date().toISOString();
  const applied = applyLicensePatch(liveCatalog, validated.patch, bytes, nowIso);
  // Append the audit row to prototyping.json#licensePatchAudit[].
  const body = (await readPrototypingJson(protoJsonAbs)) ?? {};
  const existing: unknown = body.licensePatchAudit;
  const audit: unknown[] = isUnknownArray(existing) ? [...existing] : [];
  audit.push(applied.auditRow);
  body.licensePatchAudit = audit;
  // Option A (Codex P1 wave-4): `frozenLicenseCatalog` is NOT rewritten
  // here. The frozen field is the immutable cycle-0 baseline (equal to
  // `DEFAULT_LICENSE_CATALOG`); the drift gate at cycle >= 1 compares
  // it against `DEFAULT_LICENSE_CATALOG` and would exit 2 if we mutated
  // it. The runtime license catalog used by verify is reconstructed at
  // read-time via `effectiveLicenseCatalog(frozen, auditRows)` —
  // `applied.auditRow` (just appended above) is the canonical record
  // that downstream cycles replay.
  await mkdir(path.dirname(protoJsonAbs), { recursive: true });
  await writeFile(protoJsonAbs, `${JSON.stringify(body, null, 2)}\n`, "utf-8");
  return { ok: true, nextCatalog: applied.nextCatalog };
}

/**
 * Write the advisory `iter-NN/iterate-context.json` file. The file is
 * advisory-only (certify ignores its presence/absence); the call is
 * best-effort and the cycle does not hard-fail if the write fails.
 */
async function writeIterateContextFile(iterDirAbs: string, context: IterateContext): Promise<void> {
  const canonical = canonicalIterateContext(context);
  const target = path.join(iterDirAbs, "iterate-context.json");
  try {
    await mkdir(iterDirAbs, { recursive: true });
    await writeFile(target, `${JSON.stringify(canonical, null, 2)}\n`, "utf-8");
  } catch (cause) {
    warn(
      `qfai prototyping iterate: iterate-context.json write failed (${
        cause instanceof Error ? cause.message : String(cause)
      }); the file is advisory and the cycle continues.`,
    );
  }
}

/**
 * Build the iterate-context payload from the prior cycle's accepted
 * iteration (read from prototyping.json#iterations[]). Returns null
 * when no prior iteration is recorded yet (cycle 0).
 */
function buildIterateContextFromRecord(record: PrototypingJsonShape | null): IterateContext | null {
  if (!record) return null;
  const iterations = asIterations(record);
  if (iterations.length === 0) return null;
  const last = iterations[iterations.length - 1];
  if (!isRecord(last)) return null;
  if (typeof last.index !== "number") return null;
  if (!isRecord(last.scores)) return null;
  const scores = last.scores;
  const get = (k: string): OrdinalScore => {
    const v = scores[k];
    return isOrdinalScore(v) ? v : "weak";
  };
  const lap = Array.isArray(last.layoutAntiPatternsDetected)
    ? last.layoutAntiPatternsDetected.filter((v): v is string => typeof v === "string")
    : [];
  return {
    priorCycle: last.index,
    priorScores: {
      informationArchitecture: get("informationArchitecture"),
      navigationFlow: get("navigationFlow"),
      usability: get("usability"),
      functionality: get("functionality"),
    },
    openBlockers: lap,
    // Tailwind contract phase tag is informational; Phase 1 of the
    // Tailwind scanner work shipped a multi-phase contract surface
    // (preflight + var(--token) + Tailwind --*-shadow). The literal
    // tag is advisory; downstream subagents can compare it to the
    // current contract phase to detect drift. Sourced from
    // CURRENT_TAILWIND_CONTRACT_PHASE so a future Phase 5
    // migration updates the tag in a single place.
    priorTailwindContract: CURRENT_TAILWIND_CONTRACT_PHASE,
  };
}

/**
 * Emit the `[BLOCKED] exit-64 prevented by:` summary using stdout.
 * Pure passthrough to `buildBlockedSummary`; the literal header is the
 * test anchor.
 */
function emitBlockedSummary(input: BlockedSummaryInput): void {
  const text = buildBlockedSummary(input);
  // info() routes to stdout via the shared logger; the summary is a
  // single string so the literal header lives at the start of the
  // emitted payload.
  info(text);
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

type ConfigLoadResult = Awaited<ReturnType<typeof loadConfig>>;

type ZeroUiBearingPrecheckResult =
  | { shortCircuit: true; exitCode: number }
  | {
      shortCircuit: false;
      earlyConfig: ConfigLoadResult;
      /**
       * The cycle-0 UI-bearing UNION (all specs the project carries
       * with `surface_type: ui-bearing` / matching UI contract / title
       * marker / pinned primarySpecId). Exposed on the continue path
       * so the caller can persist it as `frozenSurfaceUnion` in
       * prototyping.json — the cycle ≥ 1 drift gate then compares the
       * live UNION against this frozen UNION (apples-to-apples) instead
       * of against the single-spec `frozenSpecsCovered`. See 11th-wave
       * Fix (codex r3265480688, MAJOR/P1).
       */
      unionSpecs: readonly string[];
    };

/**
 * Section 0 of `runPrototypingIterate`: zero UI-bearing spec → no-op.
 *
 * Loads config + resolves the UI-bearing spec set once and decides
 * whether the iterate command should short-circuit with exit 0 (no
 * UI surface to drive) or fall through to the DESIGN.md / cycle
 * pipeline. The pre-check intentionally runs BEFORE the DESIGN.md
 * gate so a project with no UI surface is never blocked on a missing
 * or unfrozen DESIGN.md.
 *
 * The `prototyping.primarySpecId` config escape hatch is honoured:
 * if the multi-spec resolver returns zero specs (because none carry
 * `surface_type: ui-bearing` and none ship a matching UI contract)
 * but the operator has pinned a primary spec that exists on disk,
 * the no-op short-circuit is skipped and the legacy
 * `resolvePrimaryPrototypingSpec` lineage drives the loop.
 *
 * On the continue path, the loaded config snapshot is returned so the
 * caller can reuse it without re-IO'ing the YAML file.
 */
async function evaluateZeroUiBearingPrecheck(root: string): Promise<ZeroUiBearingPrecheckResult> {
  const earlyConfig = await loadConfig(root);
  const unionSpecs = await resolveSurfaceUnion(root, earlyConfig.config);
  if (unionSpecs.length === 0) {
    info(
      "qfai prototyping iterate: no UI-bearing specs resolved — deterministic no-op " +
        "(no spec carries `surface_type: ui-bearing` and no matching `.qfai/contracts/ui/*.yaml`). " +
        "Add the marker or contract to enable the prototyping loop.",
    );
    return { shortCircuit: true, exitCode: 0 };
  }
  return {
    shortCircuit: false,
    earlyConfig,
    unionSpecs,
  };
}

/**
 * @internal Back-compat re-export only. The canonical export lives at
 * `core/prototyping/specResolution.ts` (moved there in the 19th-wave
 * architecture cleanup, codex r3270055214). New call sites MUST import
 * from the core module directly; this re-export only exists so the
 * wave-8/10/13 unit tests in `tests/cli/commands/prototypingIterate.test.ts`
 * keep resolving against the previous CLI-layer path while we let the
 * test-side import migration land in a focused follow-up wave (tracked
 * implicitly by removing this re-export once those tests update).
 * `prototypingCertify.ts` already imports from the core module
 * directly, restoring the CLI → core dependency DAG. (21st-wave
 * @internal annotation per codex r3270215675 / r3270214114 MINOR.)
 */
export { resolveSurfaceUnion };

type CycleGteOneGateInput = {
  root: string;
  cycle: number;
  protoJsonAbs: string;
  currentSha: string;
  lockSha: string | null;
  designMd: DesignMd;
  specs: readonly string[];
  config: ConfigLoadResult["config"];
};

type CycleGteOneGateResult = { shortCircuit: true; exitCode: number } | { shortCircuit: false };

/**
 * Section 2 of `runPrototypingIterate`: cycle >= 1 gates.
 *
 * Composes (in order) the hash-gate against the lock-anchored cache
 * in prototyping.json, the convergence/max-budget stop, the
 * history-monotonicity check, the expected-next-cycle check, the
 * frozen `specsCovered` equality check, and the mid-run spec-set
 * drift check. Each sub-gate either returns `{shortCircuit: true,
 * exitCode}` to abort iterate immediately or falls through.
 *
 * Falling all the way through returns `{shortCircuit: false}` and the
 * caller proceeds to cycle-0 `--target-url` validation +
 * iterate-plan.json generation.
 *
 * The lock equality enforced by the caller (DESIGN.md.lock.yaml ===
 * live DESIGN.md sha256) plus the cache equality enforced here
 * (prototyping.json#designMd.sha256 === live === lock) jointly form a
 * 3-way invariant; the cache is intentionally a cache of the lock,
 * never a third independent SHA SSOT.
 */
async function evaluateCycleGteOneGate(
  input: CycleGteOneGateInput,
): Promise<CycleGteOneGateResult> {
  const protoRecord = await readPrototypingJson(input.protoJsonAbs);
  if (!protoRecord || !protoRecord.designMd || typeof protoRecord.designMd.sha256 !== "string") {
    error(
      "qfai prototyping iterate: prototyping.json#designMd is missing. " +
        "Re-run from cycle 0 so the seed cycle records the DESIGN.md sha256.",
    );
    return { shortCircuit: true, exitCode: 2 };
  }
  if (protoRecord.designMd.sha256 !== input.currentSha) {
    // codex AHM3: phrase the error so both the legacy "sha256 mismatch"
    // text AND the canonical mid-loop-drift regex
    // /DESIGN\.md hash mismatch.*re-run from cycle 0/ match.
    // Reviewers (and the prototyping orchestrator) parse stderr for
    // the canonical phrase "DESIGN.md hash mismatch" plus
    // "re-run from cycle 0"; legacy tests still grep for
    // "sha256 mismatch" / "edited mid-loop", so both phrases coexist
    // in the same message.
    error(
      "qfai prototyping iterate: DESIGN.md hash mismatch — root DESIGN.md sha256 differs from " +
        `the cycle-0 frozen value (frozen=${protoRecord.designMd.sha256} current=${input.currentSha}). ` +
        "DESIGN.md was edited mid-loop; re-run from cycle 0 to refreeze.",
    );
    return { shortCircuit: true, exitCode: 2 };
  }
  if (input.lockSha !== null && protoRecord.designMd.sha256 !== input.lockSha) {
    error(
      "qfai prototyping iterate: prototyping.json#designMd.sha256 (" +
        `${protoRecord.designMd.sha256}) differs from DESIGN.md.lock.yaml ` +
        `(${input.lockSha}). The lock was refrozen mid-loop; re-run prototyping from cycle 0.`,
    );
    return { shortCircuit: true, exitCode: 2 };
  }
  // 30th-wave Fix (codex r3270687650, P1 — chatgpt-codex-connector):
  // run the cycle ≥ 1 lock-drift gates BEFORE `shouldStop()` so a
  // converged / max-budget loop cannot mask a `frozenSurfaceUnion`
  // missing-or-malformed record or a live-vs-frozen spec-set drift.
  // Pre-fix the drift checks lived AFTER `shouldStop`, which meant a
  // run that satisfied `shouldStop` (axes-exceptional or
  // max-iterations) exited 64/65 immediately and the drift gate
  // never fired — a mid-loop UI-marker removal or contract edit was
  // silently accepted as a successful convergence / exhaustion. The
  // ordering now mirrors the DESIGN.md hash check above: lock-drift
  // classes (designMd, frozenSurfaceUnion presence + drift) gate the
  // run first; convergence / budget signals come after.
  const recordedIterations = asIterations(protoRecord);
  const frozenUnion = readFrozenSurfaceUnionField(protoRecord);
  if (frozenUnion === null) {
    // Split the diagnostic into primary CTA + justification so the
    // recovery action is the headline and the rationale follows on a
    // visually-separated indented line. 24th-wave refinement: insert a
    // blank `error("")` between the two so narrow-terminal wrap does
    // not visually fuse the CTA's last line with the `Reason:` line.
    error(
      "qfai prototyping iterate: prototyping.json#frozenSurfaceUnion is missing or " +
        "malformed. Re-run with `--cycle 0 --target-url <url>` to refreeze " +
        "the loop with a current UNION snapshot.",
    );
    error("");
    error(
      "  Reason: the cycle ≥ 1 drift gate requires a cycle-0-frozen multi-spec " +
        "UI-bearing UNION snapshot; the gate does not fall back to the " +
        "single-spec `frozenSpecsCovered` because that fallback would compare " +
        "a single-spec frozen scope against the live multi-spec union and " +
        "false-positive-fire for any project with ≥ 2 UI-bearing specs.",
    );
    return { shortCircuit: true, exitCode: 2 };
  }
  const liveUiBearing = await resolveSurfaceUnion(input.root, input.config);
  const drift = checkSpecsCoveredDrift(frozenUnion, liveUiBearing);
  if (drift.drifted) {
    const parts: string[] = [];
    if (drift.added.length > 0) {
      parts.push(`new=[${drift.added.join(", ")}]`);
    }
    if (drift.removed.length > 0) {
      parts.push(`removed=[${drift.removed.join(", ")}]`);
    }
    error(
      "qfai prototyping iterate: spec-set drift detected mid-loop — " +
        `${parts.join(" ")}. The cycle-0 frozen UI-bearing union is ${JSON.stringify(frozenUnion)}; ` +
        `the live UI-bearing union is ${JSON.stringify(liveUiBearing)}. ` +
        "The drifted spec(s) are deferred to the next `--cycle 0` invocation. " +
        "Continue this loop with the frozen spec set, or restart with " +
        "`--cycle 0 --target-url <url>` to pick up the new spec set.",
    );
    return { shortCircuit: true, exitCode: 2 };
  }
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
        input.root,
        recordedIterations.length - 1,
        input.designMd,
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
          return { shortCircuit: true, exitCode: emitStop("max-iterations") };
        }
        info(
          "qfai prototyping iterate: review reported convergence but the " +
            `accepted iter HTML still contains ${recomputed.length} DESIGN.md violation(s); ` +
            "continuing another iteration to fix drift. " +
            `First violation: ${first.kind}=${first.found}.`,
        );
        // Fall through to the next-cycle plan below (no early return).
      } else {
        return { shortCircuit: true, exitCode: emitStop(stop) };
      }
    } else {
      return { shortCircuit: true, exitCode: emitStop(stop) };
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
    return { shortCircuit: true, exitCode: 2 };
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
  if (input.cycle !== expectedNextCycle) {
    error(
      `qfai prototyping iterate: expected --cycle ${expectedNextCycle} ` +
        `(iterations.length=${recordedIterations.length}); got --cycle ${input.cycle}. ` +
        "Re-run with the expected cycle, or restart the loop with " +
        "`--cycle 0 --target-url <url>`.",
    );
    return { shortCircuit: true, exitCode: 2 };
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
    return { shortCircuit: true, exitCode: 2 };
  }
  // Compare element-wise. Today `specs` is always a single-element
  // array (resolved primary spec id), but `specsCovered` is a
  // multi-element array per the prototyping.json schema, and the
  // contract is "every covered spec must match across cycles". A
  // first-element-only check (`frozenSpecs[0] !== specs[0]`) would
  // silently let a future multi-spec loop drift on non-zero indices.
  if (!arraysShallowEqual(frozenSpecs, input.specs)) {
    error(
      "qfai prototyping iterate: prototyping.json#specsCovered (" +
        `${JSON.stringify(frozenSpecs)}) differs from the currently-resolved ` +
        `primary spec (${JSON.stringify(input.specs)}). ` +
        "The primary spec changed mid-loop; re-run with `--cycle 0 --target-url <url>` to refreeze.",
    );
    return { shortCircuit: true, exitCode: 2 };
  }

  return { shortCircuit: false };
}
