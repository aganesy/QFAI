import { lstat, readFile, stat } from "node:fs/promises";
import path from "node:path";

/**
 * Canonical project-root relative path to the `/qfai-verify` gate artifact.
 *
 * `.qfai/report/` is the canonical report location (post-PR-#207); `validate.json`
 * already lives there. `verify.json` was the only certify gate file still pinned
 * to `.qfai/output/`, with no config key and no fallback — so migrating off
 * `.qfai/output/` broke certification while staying there carried a
 * `D-DEPRECATED-PATH` warning on every run.
 */
export const VERIFY_JSON_REL = ".qfai/report/verify.json" as const;

/** Legacy location, read only when the canonical one is absent. */
export const VERIFY_JSON_LEGACY_REL = ".qfai/output/verify.json" as const;

export type VerifyJsonRead = {
  /**
   * Which location the payload came from. `missing` when neither file exists;
   * `unreadable` when a file exists but could not be turned into a verify
   * result (bad JSON, non-object payload, permission or I/O error).
   */
  source: "canonical" | "legacy" | "missing" | "unreadable";
  /**
   * Project-root relative path actually read. The canonical path when nothing
   * exists; the offending path when `source` is `unreadable`.
   *
   * Narrowed to the two known locations so a caller cannot be handed — and a
   * test cannot assert — a path this reader never looks at.
   */
  rel: typeof VERIFY_JSON_REL | typeof VERIFY_JSON_LEGACY_REL;
  /** Parsed JSON object, or `null` when `missing` or `unreadable`. */
  json: Record<string, unknown> | null;
  /** Why the file at `rel` is unusable; `null` for every other source. */
  error: string | null;
};

type LoadOutcome =
  | { kind: "ok"; json: Record<string, unknown> }
  | { kind: "absent" }
  | { kind: "unreadable"; reason: string };

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasErrorCode(error: unknown): error is { code?: unknown } {
  return typeof error === "object" && error !== null && "code" in error;
}

function isFileNotFound(error: unknown): boolean {
  return hasErrorCode(error) && error.code === "ENOENT";
}

/** True when a directory entry exists at the path, even a dangling symlink. */
async function entryExists(absolutePath: string): Promise<boolean> {
  try {
    await lstat(absolutePath);
    return true;
  } catch {
    return false;
  }
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const toPosix = (value: string): string => value.replace(/\\/g, "/");

/**
 * Reason the path's directory chain is broken, or `null` when every ancestor
 * below `root` is a real, traversable directory (or simply not created yet).
 *
 * `lstat` on the full path only inspects the last component. When an
 * *ancestor* is a dangling symlink — `.qfai/report` pointing at a directory
 * that no longer exists — both `readFile` and `lstat` on the leaf report
 * ENOENT, which is indistinguishable from "the gate file was never written".
 * Walking the chain separates the two, so a broken canonical route stops the
 * lookup instead of falling through to a stale legacy `status: "PASS"`.
 */
async function describeBrokenAncestor(root: string, absolutePath: string): Promise<string | null> {
  const rootAbs = path.resolve(root);
  const relative = path.relative(rootAbs, path.dirname(absolutePath));
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    // The artifact lives outside the project root; there is no chain we own.
    return null;
  }

  let current = rootAbs;
  for (const segment of relative.split(path.sep)) {
    if (segment.length === 0 || segment === ".") continue;
    current = path.join(current, segment);
    const rel = toPosix(path.relative(rootAbs, current));

    let link;
    try {
      link = await lstat(current);
    } catch (error: unknown) {
      if (isFileNotFound(error)) {
        // Nothing here at all — the report tree simply has not been created.
        return null;
      }
      return `${rel} cannot be inspected (${describeError(error)})`;
    }

    if (!link.isSymbolicLink()) {
      // A regular file in the middle makes `readFile` fail with ENOTDIR, which
      // the non-ENOENT branch already reports; nothing to add here.
      continue;
    }

    try {
      const target = await stat(current);
      if (!target.isDirectory()) {
        return `${rel} is a symlink to a non-directory`;
      }
    } catch (error: unknown) {
      if (isFileNotFound(error)) {
        return `${rel} is a dangling symlink`;
      }
      return `${rel} cannot be resolved (${describeError(error)})`;
    }
  }
  return null;
}

function describePayload(value: unknown): string {
  if (value === null) return "null";
  return Array.isArray(value) ? "an array" : typeof value;
}

/**
 * Distinguishes "no file here" from "a file is here and it is broken".
 *
 * Only the first is a fallback trigger. Collapsing the two — as a plain
 * `try/catch -> null` does — makes a corrupt canonical `verify.json`
 * indistinguishable from an absent one, so a stale legacy file left behind by
 * a migration could hand `certify` an obsolete `status: "PASS"`.
 */
async function loadVerifyPayload(root: string, absolutePath: string): Promise<LoadOutcome> {
  let raw: string;
  try {
    raw = await readFile(absolutePath, "utf-8");
  } catch (error: unknown) {
    if (isFileNotFound(error)) {
      // ENOENT from `readFile` is ambiguous: a dangling symlink has a
      // directory entry but no target, and `readFile` reports it exactly like
      // a missing file. `lstat` sees the link itself, so an entry that exists
      // but cannot be read is `unreadable` — otherwise a broken canonical link
      // would fall through to a stale legacy `status: "PASS"`.
      if (await entryExists(absolutePath)) {
        return { kind: "unreadable", reason: "path exists but cannot be read (dangling symlink?)" };
      }
      // The leaf check only sees the last component. A dangling symlink at an
      // *ancestor* also surfaces as ENOENT on both calls, so walk the chain
      // before concluding the file was simply never written.
      const broken = await describeBrokenAncestor(root, absolutePath);
      if (broken !== null) {
        return { kind: "unreadable", reason: `path is unreachable: ${broken}` };
      }
      return { kind: "absent" };
    }
    // EACCES, EISDIR, EIO, ... — the path is occupied by something we cannot
    // read, which is a broken gate rather than a missing one.
    return { kind: "unreadable", reason: describeError(error) };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error: unknown) {
    return { kind: "unreadable", reason: `invalid JSON (${describeError(error)})` };
  }

  if (!isJsonObject(parsed)) {
    return { kind: "unreadable", reason: `expected a JSON object, got ${describePayload(parsed)}` };
  }
  return { kind: "ok", json: parsed };
}

/**
 * Reads `verify.json` canonical-first, falling back to the legacy
 * `.qfai/output/` location. Mirrors the fallback the saas-package gates signal
 * already uses in `prototypingCertify.ts`.
 *
 * The fallback is triggered by an **absent** canonical file only. A canonical
 * file that exists but cannot be used is reported as `unreadable` and stops the
 * lookup there: falling through would let a leftover legacy `status: "PASS"`
 * certify a run whose real gate result was never readable.
 */
export async function readVerifyJson(root: string): Promise<VerifyJsonRead> {
  const canonical = await loadVerifyPayload(root, path.resolve(root, VERIFY_JSON_REL));
  if (canonical.kind === "ok") {
    return { source: "canonical", rel: VERIFY_JSON_REL, json: canonical.json, error: null };
  }
  if (canonical.kind === "unreadable") {
    return { source: "unreadable", rel: VERIFY_JSON_REL, json: null, error: canonical.reason };
  }

  const legacy = await loadVerifyPayload(root, path.resolve(root, VERIFY_JSON_LEGACY_REL));
  if (legacy.kind === "ok") {
    return { source: "legacy", rel: VERIFY_JSON_LEGACY_REL, json: legacy.json, error: null };
  }
  if (legacy.kind === "unreadable") {
    // Same rule at the legacy location: a broken file is reported, never
    // silently downgraded to "no gate result exists".
    return { source: "unreadable", rel: VERIFY_JSON_LEGACY_REL, json: null, error: legacy.reason };
  }

  return { source: "missing", rel: VERIFY_JSON_REL, json: null, error: null };
}
