/**
 * Stale-reference validator for `qfai validate --report`
 * (AC-0015-0021, REQ-0173).
 *
 * After the second-wave implementation lands, the shipped reference docs
 * (`references/iteration-loop.md`, `references/generator-prompt.md`,
 * `references/handoff.md`, `references/evidence-requirements.md`) and
 * each affected `SKILL.md` MUST be rewritten to match the chosen
 * implementations. A "stale reference" is a substring in one of those
 * docs that still describes pre-implementation behavior — captured by
 * a SSOT manifest of "before-token → guidance" entries.
 *
 * Severity policy:
 *   - During the deprecation window (today < cutoff): `warning`.
 *   - At sunset (today >= cutoff): `error`.
 * Cutoff = `STALE_REFERENCE_SUNSET` (the same fail-open posture used by
 * `skillDocReferences.brokenRefSeverity` mirrors this pattern).
 */
import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { resolvePath, type QfaiConfig } from "../config.js";
import { isEnoent } from "../fs/errno.js";
import type { Issue } from "../types.js";
import { exists, issue } from "./utils.js";

const SKILLS_REL = path.join(".qfai", "assistant", "skills");

/**
 * Hard sunset cutoff in YYYY-MM-DD form. After this date, stale
 * references escalate from warning to error.
 *
 * The cutoff is intentionally far enough out to give consumers a clear
 * deprecation window; bump or pull in via a future PR when the
 * ecosystem catches up.
 */
export const STALE_REFERENCE_SUNSET = "2026-12-01" as const;

/**
 * SSOT manifest of stale-reference tokens. Each entry maps a
 * pre-implementation substring (`beforeToken`) to a guidance string
 * (`replacement`). The matcher is case-sensitive substring containment.
 *
 * Tokens are intentionally narrow and stable so the matcher does not
 * false-flag legitimate prose that merely mentions a related concept.
 */
export type StaleReferenceEntry = {
  /** Human-readable name (for emitted message). */
  readonly clause: string;
  /** Substring whose presence indicates pre-implementation prose. */
  readonly beforeToken: string;
  /** Guidance string to surface in the message. */
  readonly replacement: string;
};

export const STALE_REFERENCES: readonly StaleReferenceEntry[] = [
  {
    // Pre-implementation prose pinned `session-handoff.yaml` as the
    // canonical cross-skill handoff name. After the second wave the canonical
    // file is `.qfai/handoff.yaml`; `session-handoff.yaml` is accepted
    // only via `qfai handoff upgrade` during the deprecation window.
    // The before-token is precise (the legacy file name) and would not
    // false-flag the unrelated `.qfai/contracts/design/prototype-handoff.yaml`
    // contract artifact.
    clause: "session-handoff-legacy-name",
    beforeToken: "session-handoff.yaml",
    replacement:
      "use the canonical `.qfai/handoff.yaml`; legacy `session-handoff.yaml` accepted only via `qfai handoff upgrade` during the deprecation window",
  },
];

/**
 * Reference doc paths that must be checked. Restricted to the doc
 * surfaces that AC-0015-0021 explicitly enumerates plus every
 * `SKILL.md` under `.qfai/assistant/skills/`.
 */
const REFERENCE_DOC_NAMES = [
  "iteration-loop.md",
  "generator-prompt.md",
  "handoff.md",
  "evidence-requirements.md",
] as const;

function todayIsoDate(now: () => Date): string {
  return now().toISOString().slice(0, 10);
}

/**
 * Severity gate: warning during the window, error at sunset. Exported
 * for unit testability.
 */
export function staleReferenceSeverity(
  todayIso: string,
  sunsetIso: string = STALE_REFERENCE_SUNSET,
): "warning" | "error" {
  return todayIso >= sunsetIso ? "error" : "warning";
}

/**
 * Validate that no stale-reference tokens appear in the in-tree
 * reference docs and SKILL.md files. Returns an array of issues; empty
 * means zero stale references at HEAD.
 *
 * The `now` parameter is a test seam — callers in production pass
 * `() => new Date()` (or use the default).
 */
export async function validateStaleReferences(
  root: string,
  options: { now?: () => Date; config?: QfaiConfig } = {},
): Promise<Issue[]> {
  const issues: Issue[] = [];
  const now = options.now ?? (() => new Date());
  const todayIso = todayIsoDate(now);
  const severity = staleReferenceSeverity(todayIso);

  // Honor `config.paths.skillsDir` via the canonical `resolvePath`
  // helper (SSOT). When no config is supplied, fall back to the
  // legacy hardcoded `.qfai/assistant/skills` so older callers /
  // tests stay green. Pre-fix the scan was hardcoded to the default
  // path, so a relocated skillsDir gave a silent PASS on stale
  // `session-handoff.yaml` references under the actual location.
  const skillsDir = options.config
    ? resolvePath(root, options.config, "skillsDir")
    : path.join(root, SKILLS_REL);
  if (!(await exists(skillsDir))) return issues;

  let entries: Dirent[];
  try {
    entries = await readdir(skillsDir, { withFileTypes: true });
  } catch (err: unknown) {
    if (isEnoent(err)) return issues;
    throw err;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillDir = path.join(skillsDir, entry.name);
    await scanSkillDir(root, skillDir, severity, issues);
  }
  return issues;
}

async function scanSkillDir(
  root: string,
  skillDir: string,
  severity: "warning" | "error",
  issues: Issue[],
): Promise<void> {
  // SKILL.md
  const skillMd = path.join(skillDir, "SKILL.md");
  await scanFileForStaleRefs(root, skillMd, severity, issues);
  // references/<name>.md
  const refsDir = path.join(skillDir, "references");
  if (!(await exists(refsDir))) return;
  for (const name of REFERENCE_DOC_NAMES) {
    const full = path.join(refsDir, name);
    await scanFileForStaleRefs(root, full, severity, issues);
  }
}

async function scanFileForStaleRefs(
  root: string,
  file: string,
  severity: "warning" | "error",
  issues: Issue[],
): Promise<void> {
  let body: string;
  try {
    body = await readFile(file, "utf-8");
  } catch (err: unknown) {
    if (isEnoent(err)) return;
    throw err;
  }
  const relPath = path.relative(root, file).replace(/\\/g, "/");
  for (const entry of STALE_REFERENCES) {
    if (!body.includes(entry.beforeToken)) continue;
    const message =
      `W-STALE-REFERENCE (${entry.clause}): ${relPath} still references ` +
      `"${entry.beforeToken}". Rewrite to match the chosen implementation: ` +
      `${entry.replacement}.`;
    issues.push(
      issue("W-STALE-REFERENCE", message, severity, relPath, "staleReferences.preImplementation"),
    );
  }
}
