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
 *   65  STOP: latest iter index === MAX_ITERATION_INDEX (14)
 *   2   input error (--cycle out of range, missing --target-url at cycle 0,
 *       no UI-bearing specs found, DESIGN.md missing/malformed/changed,
 *       prototyping.json#designMd missing on cycle >= 1, etc.)
 *
 * Per-cycle artifact: writes `iter-NN/iterate-plan.json` so the capture
 * role and the next generator step both have a single document
 * referencing the assigned paths, target URL, and DESIGN.md tokens
 * (Tailwind config shape).
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { error, info } from "../lib/logger.js";
import { loadConfig } from "../../core/config.js";
import { hashDesignMd, parseDesignMd, type DesignMd } from "../../core/design/designMd.js";
import { readDesignMdLockSha } from "../../core/design/designMdLock.js";
import { resolvePrimaryPrototypingSpec } from "../../core/prototyping/specResolution.js";
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

const PROTOTYPING_JSON_REL = ".qfai/evidence/prototyping/prototyping.json";
const ROOT_DESIGN_MD_REL = "DESIGN.md";

type DesignMdRecord = {
  path: string;
  sha256: string;
};

type PrototypingJsonShape = {
  iterations?: unknown[];
  designMd?: DesignMdRecord;
  runId?: string;
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
  const lockSha = await readDesignMdLockGate(options.root, configResult.config.paths.contractsDir);
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
    const stop = shouldStop(asIterations(protoRecord));
    if (stop !== null) {
      return emitStop(stop);
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
  if (options.cycle === 0) {
    await writeSeedMetadata(protoJsonAbs, {
      designMd: { path: ROOT_DESIGN_MD_REL, sha256: currentSha },
      runId: buildRunId(currentSha),
    });
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

/**
 * Read the SDD-frozen sha256 from
 * `<contractsDir>/design/DESIGN.md.lock.yaml`. Returns `null` when the
 * lock file is missing or unparseable; otherwise returns the lock sha.
 *
 * Iterating without a lock is allowed for fresh projects that have not
 * yet completed /qfai-sdd Phase 0; `qfai validate` and `qfai doctor`
 * surface the SDD-precondition issue separately.
 */
async function readDesignMdLockGate(root: string, contractsDir: string): Promise<string | null> {
  const lockAbs = path.join(root, contractsDir, "design", "DESIGN.md.lock.yaml");
  let lockText: string;
  try {
    lockText = await readFile(lockAbs, "utf-8");
  } catch {
    return null;
  }
  return readDesignMdLockSha(lockText);
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

type SeedMetadata = {
  designMd: DesignMdRecord;
  runId: string;
};

async function writeSeedMetadata(protoJsonAbs: string, seed: SeedMetadata): Promise<void> {
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
  body.designMd = seed.designMd;
  // Preserve any caller-supplied runId across re-runs from cycle 0; only
  // generate a fresh one when the slot is empty.
  if (typeof body.runId !== "string" || body.runId.trim().length === 0) {
    body.runId = seed.runId;
  }
  await mkdir(path.dirname(protoJsonAbs), { recursive: true });
  await writeFile(protoJsonAbs, `${JSON.stringify(body, null, 2)}\n`, "utf-8");
}

function buildRunId(designMdSha: string): string {
  return `loop-${designMdSha.slice(0, 12)}-${Date.now().toString(36)}`;
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
