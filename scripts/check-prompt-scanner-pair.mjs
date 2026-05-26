#!/usr/bin/env node
/**
 * Pair-changed CI lane guard (REQ-0102).
 *
 * The SSOT-sync pair tracked here is:
 *   - scanner: packages/qfai/src/core/prototyping/designMdViolations.ts
 *   - prompt:  packages/qfai/assets/init/.qfai/assistant/skills/qfai-prototyping/references/generator-prompt.md
 *
 * A PR that touches exactly ONE half of the pair without the other is
 * rejected with R-PROMPT-SCANNER-DRIFT. A PR that touches BOTH halves
 * or NEITHER half passes silently.
 *
 * Invocation modes:
 *   - `--base <ref>`     compare HEAD against <ref> via `git diff
 *                        --name-only <ref>...HEAD`. Defaults to
 *                        `origin/main`. Overridable through the
 *                        `BASE_REF` environment variable.
 *   - `--changed <list>` accept a comma-separated path list directly.
 *                        Used by integration / e2e tests that build
 *                        fixtures without spinning up a git repo.
 *
 * Exit codes:
 *   0 — pair is in sync (both changed or neither changed).
 *   1 — exactly one half changed; R-PROMPT-SCANNER-DRIFT printed.
 *   2 — invalid invocation (unknown flags etc.).
 */

import { execFileSync } from "node:child_process";
import { argv, env, exit, stdout, stderr } from "node:process";

const SCANNER_REL = "packages/qfai/src/core/prototyping/designMdViolations.ts";
const PROMPT_REL =
  "packages/qfai/assets/init/.qfai/assistant/skills/qfai-prototyping/references/generator-prompt.md";

/**
 * Manifest of the contract clauses that must drift-sync together. Kept
 * in lock-step with `packages/qfai/src/core/validators/promptScannerPairs.ts`
 * (PROMPT_SCANNER_PAIRS). The script does not require the source file
 * at runtime — it just names the clauses for the operator. The pair
 * tracks every Tailwind compliance clause (color / font / radius /
 * shadow); the path-pair semantics of this guard are clause-agnostic
 * (touching either half without the other is drift regardless of
 * which clause the diff actually modifies).
 */
const TRACKED_CLAUSES = "color-literal-ban|font-family-ban|radius-literal-ban|shadow-rgba-ban";

function parseArgs(argv) {
  const out = { base: undefined, changed: undefined };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--base") {
      out.base = argv[i + 1];
      i += 1;
    } else if (a === "--changed") {
      out.changed = argv[i + 1];
      i += 1;
    } else if (a === "--help" || a === "-h") {
      out.help = true;
    } else {
      stderr.write(`check-prompt-scanner-pair: unknown argument ${JSON.stringify(a)}\n`);
      return null;
    }
  }
  return out;
}

function printHelp() {
  stdout.write(
    [
      "Usage: check-prompt-scanner-pair.mjs [--base <ref> | --changed <csv-paths>]",
      "",
      "Modes:",
      "  --base <ref>      diff HEAD against <ref> (default: $BASE_REF or origin/main)",
      "  --changed <csv>   accept a comma-separated changed-file list (test mode)",
      "",
      "Emits R-PROMPT-SCANNER-DRIFT and exits non-zero when exactly one of:",
      `  - ${SCANNER_REL}`,
      `  - ${PROMPT_REL}`,
      "is in the changed set without the other.",
      "",
    ].join("\n"),
  );
}

function isBaseRefReachable(base) {
  try {
    execFileSync("git", ["rev-parse", "--verify", `${base}^{commit}`], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function tryFetchBase(base) {
  // Best-effort fetch of `origin/<branch>` when the ref isn't already
  // present in the local clone (shallow CI checkouts). Failure is
  // tolerated; the caller will soft-pass if the ref still can't be
  // resolved after this call.
  if (!base.startsWith("origin/")) return;
  const branch = base.slice("origin/".length);
  if (branch.length === 0) return;
  try {
    execFileSync("git", ["fetch", "--no-tags", "--depth=1", "origin", branch], { stdio: "ignore" });
  } catch {
    // ignore; the rev-parse retry below decides the outcome.
  }
}

function computeChangedSetFromGit(base) {
  // `git diff --name-only <base>...HEAD` — the `...` form yields the
  // changes reachable from HEAD that are not reachable from base, which
  // is the most appropriate "what did this PR change" view.
  if (!isBaseRefReachable(base)) {
    tryFetchBase(base);
  }
  if (!isBaseRefReachable(base)) {
    // Base ref still unreachable (e.g., shallow checkout in a fork PR
    // where the runner cannot fetch origin/main). Soft-pass with a
    // warning rather than hard-failing the lint gate; the canonical
    // PR-level check on the merge target will re-run with full history.
    stderr.write(
      `check-prompt-scanner-pair: base ref '${base}' is not reachable in this clone; ` +
        "skipping pair-changed drift check (soft-pass).\n",
    );
    return [];
  }
  try {
    const out = execFileSync("git", ["diff", "--name-only", `${base}...HEAD`], {
      encoding: "utf-8",
    });
    return out
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  } catch (err) {
    stderr.write(
      `check-prompt-scanner-pair: failed to compute git diff against ${base}: ` +
        `${err && err.message ? err.message : String(err)}\n`,
    );
    return null;
  }
}

function normalizeCsvSet(csv) {
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function main() {
  const args = parseArgs(argv);
  if (args === null) {
    return 2;
  }
  if (args.help) {
    printHelp();
    return 0;
  }

  let changed;
  if (typeof args.changed === "string" && args.changed.length > 0) {
    changed = normalizeCsvSet(args.changed);
  } else {
    const base = args.base ?? env.BASE_REF ?? "origin/main";
    const computed = computeChangedSetFromGit(base);
    if (computed === null) {
      return 2;
    }
    changed = computed;
  }

  const normalized = changed.map((p) => p.replace(/\\/g, "/"));
  const scannerTouched = normalized.includes(SCANNER_REL);
  const promptTouched = normalized.includes(PROMPT_REL);

  if (scannerTouched === promptTouched) {
    // Both or neither — pair is in sync (or out-of-scope for this PR).
    return 0;
  }

  const modified = scannerTouched ? SCANNER_REL : PROMPT_REL;
  const unpaired = scannerTouched ? PROMPT_REL : SCANNER_REL;
  const message =
    `R-PROMPT-SCANNER-DRIFT: SSOT-sync pair drift detected — only ${modified} ` +
    `was modified without the matching counterpart. justification: modified=${modified}, ` +
    `un-paired=${unpaired}, clause=${TRACKED_CLAUSES} (Tailwind compliance contract; ` +
    "see packages/qfai/src/core/validators/promptScannerPairs.ts for the manifest).\n";
  stdout.write(message);
  return 1;
}

const code = main();
exit(code);
