/**
 * Resolve the prototyping spec(s) at runtime.
 *
 * Two entry points are exported:
 *
 *  - `resolvePrimaryPrototypingSpec(root, config)` — legacy single-spec
 *    resolver retained for callers that still expect "one spec drives the
 *    invocation". Slated for removal once the multi-spec rewrite lands
 *    across `prototypingIterate` / `prototypingCertify`. Do not extend.
 *  - `resolveAllUiBearingSpecs(root, config)` — new multi-spec resolver.
 *    Returns every spec ID whose `01_Spec.md` carries a UI-bearing
 *    marker (or, as a fallback, has a matching `.qfai/contracts/ui/*.yaml`
 *    contract). Deterministic, no prompts, sorted lexicographically.
 *
 * Both helpers read from the consumer project filesystem only; neither
 * performs interactive selection.
 */

import type { Dirent } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { isEnoent } from "../fs/errno.js";
import { collectSpecEntries } from "../specLayout.js";

/**
 * Title-marker regex: matches `# … prototyping …` headings (anywhere)
 * inside an `01_Spec.md`. Shared SSOT between the legacy composite
 * `PROTOTYPING_MARKER_RE` (which OR's frontmatter + title) and the
 * multi-spec `resolveTitleMarkerSpecs` helper that the iterate
 * command's section-0 no-op gate consults.
 *
 * Exported so callers re-use the same source — DO NOT inline-redefine
 * this elsewhere; the two arms of `PROTOTYPING_MARKER_RE` are built
 * from `UI_BEARING_MARKER_RE.source` and `TITLE_MARKER_RE.source` so a
 * single edit propagates everywhere.
 */
export const TITLE_MARKER_RE = /^#\s+.*prototyping/im;

export type ResolvedSpec = {
  /** Four-digit spec ID, e.g. "0001". */
  specId: string;
  /** Absolute path to the spec directory. */
  specDir: string;
  /** Absolute path to 01_Spec.md inside the spec directory. */
  specMdPath: string;
  /**
   * How the spec was located.
   *
   * - `"config"`            — explicit `qfai.config.yaml#prototyping.primarySpecId` pin.
   * - `"marker-scan"`       — `surface_type: ui-bearing` frontmatter OR legacy
   *                           `# … prototyping …` title heading hit in `01_Spec.md`.
   * - `"contract-fallback"` — neither config nor marker matched; the spec was
   *                           located via a matching `.qfai/contracts/ui/<spec-id>*.yaml`
   *                           contract file (extends the multi-spec
   *                           `resolveAllUiBearingSpecs` fallback to the single-spec
   *                           primary resolver). 10th-wave Fix I.
   */
  source: "config" | "marker-scan" | "contract-fallback";
};

/**
 * Multi-spec strict UI-bearing marker: matches ONLY the canonical
 * frontmatter signal `surface_type: ui-bearing`. Intentionally more
 * restrictive than `PROTOTYPING_MARKER_RE`, which OR's in the legacy
 * `# … prototyping …` heading arm via `TITLE_MARKER_RE`.
 *
 * Why the asymmetry: title-marker scans must occur explicitly (via
 * the exported `resolveTitleMarkerSpecs` helper) so the
 * spec-set-membership semantics are visible at the call site. Folding
 * the title arm into `UI_BEARING_MARKER_RE` would silently widen the
 * frozen multi-spec set with heading-only matches, masking the
 * configuration shape from operators.
 */
const UI_BEARING_MARKER_RE = /surface_type:\s*ui-bearing/im;
// Legacy composite: frontmatter marker OR legacy title heading. Built
// from the two single-purpose sources so the title arm cannot drift.
const PROTOTYPING_MARKER_RE = new RegExp(
  `${UI_BEARING_MARKER_RE.source}|${TITLE_MARKER_RE.source}`,
  "im",
);

export async function resolvePrimaryPrototypingSpec(
  root: string,
  config: QfaiConfig,
): Promise<ResolvedSpec | undefined> {
  const specsRoot = path.resolve(root, config.paths.specsDir);

  // 1. Explicit config override
  const explicit = config.prototyping?.primarySpecId;
  if (explicit) {
    const entries = await collectSpecEntries(specsRoot);
    const hit = entries.find((entry) => entry.specNumber === explicit);
    if (hit) {
      return {
        specId: explicit,
        specDir: hit.dir,
        specMdPath: path.join(hit.dir, "01_Spec.md"),
        source: "config",
      };
    }
    return undefined;
  }

  // 2. Marker-based scan: smallest spec ID first
  const entries = await collectSpecEntries(specsRoot);
  const sorted = [...entries].sort((a, b) => a.specNumber.localeCompare(b.specNumber));
  for (const entry of sorted) {
    const specMdPath = path.join(entry.dir, "01_Spec.md");
    let body = "";
    try {
      body = await readFile(specMdPath, "utf-8");
    } catch {
      continue;
    }
    if (PROTOTYPING_MARKER_RE.test(body)) {
      return {
        specId: entry.specNumber,
        specDir: entry.dir,
        specMdPath,
        source: "marker-scan",
      };
    }
  }

  // 3. UI-contract fallback: a project may declare its UI surface
  //    purely via `.qfai/contracts/ui/<spec-id>.yaml` without any
  //    spec-side marker and without `prototyping.primarySpecId`. Mirror
  //    the same fallback `resolveAllUiBearingSpecs` honours so the
  //    iterate command can drive a contract-only project; the cycle-0
  //    no-op precheck already short-circuits when no surface exists at
  //    all, so reaching here with a contract-only surface should not be
  //    re-rejected by the primary resolver. Pick the lexicographically
  //    smallest spec id that has a matching contract for determinism.
  const contractsRoot = path.resolve(root, config.paths.contractsDir);
  for (const entry of sorted) {
    if (await hasMatchingUiContract(contractsRoot, entry.specNumber)) {
      return {
        specId: entry.specNumber,
        specDir: entry.dir,
        specMdPath: path.join(entry.dir, "01_Spec.md"),
        // 10th-wave Fix I: this branch locates the spec via UI contract
        // scan, not via spec-side marker scan; relabel to keep the
        // discriminant honest (architecture-reviewer r3265261917).
        source: "contract-fallback",
      };
    }
  }

  // 4. Fallback: caller decides what to do
  return undefined;
}

/**
 * Resolve every UI-bearing spec in the consumer project in one call.
 *
 * A spec is considered UI-bearing when either:
 *   1. its `01_Spec.md` contains a `surface_type: ui-bearing` marker
 *      (matches the existing `resolvePrimaryPrototypingSpec` convention),
 *      OR
 *   2. a UI contract YAML exists at
 *      `<contractsDir>/ui/<spec-id>.yaml` whose basename matches the
 *      spec id (fallback signal — covers consumer projects that author
 *      contracts without a frontmatter marker).
 *
 * Returns spec IDs sorted lexicographically and deduplicated. The function
 * never prompts; deterministic file-system query only. Zero UI-bearing
 * specs returns an empty array (caller decides the no-op exit).
 *
 * @param root absolute path to the consumer project root
 * @param config resolved `QfaiConfig` (paths.specsDir / paths.contractsDir
 *   are honoured)
 */
export async function resolveAllUiBearingSpecs(
  root: string,
  config: QfaiConfig,
): Promise<string[]> {
  const specsRoot = path.resolve(root, config.paths.specsDir);
  const contractsRoot = path.resolve(root, config.paths.contractsDir);

  const entries = await collectSpecEntries(specsRoot);
  const uiBearing = new Set<string>();

  for (const entry of entries) {
    const specId = entry.specNumber;
    if (!specId) continue;

    let markerHit = false;
    const specMdPath = path.join(entry.dir, "01_Spec.md");
    try {
      const body = await readFile(specMdPath, "utf-8");
      if (UI_BEARING_MARKER_RE.test(body)) {
        markerHit = true;
      }
    } catch (error) {
      if (!isEnoent(error)) {
        // Re-throw unexpected filesystem errors so callers fail fast
        // rather than silently classify the spec as non-UI.
        throw error;
      }
    }

    if (markerHit) {
      uiBearing.add(specId);
      continue;
    }

    // Fallback: matching UI contract file
    if (await hasMatchingUiContract(contractsRoot, specId)) {
      uiBearing.add(specId);
    }
  }

  return [...uiBearing].sort((a, b) => a.localeCompare(b));
}

/**
 * Cheap title-marker probe. Returns spec IDs (four-digit form) whose
 * `01_Spec.md` carries a `# … prototyping …` heading. Mirrors the
 * legacy `PROTOTYPING_MARKER_RE` title arm in
 * `resolvePrimaryPrototypingSpec` so the section-0 no-op gate honours
 * the same surface the legacy resolver does.
 *
 * Lex-sorted; deduped by spec id. Read failures other than ENOENT
 * propagate so a permission-denied scan does not silently no-op the
 * run.
 *
 * @param root absolute path to the consumer project root
 * @param specsDir relative path to the specs directory (e.g.
 *   `.qfai/specs`). Pass `config.paths.specsDir` for parity with
 *   `resolveAllUiBearingSpecs`.
 */
export async function resolveTitleMarkerSpecs(root: string, specsDir: string): Promise<string[]> {
  const specsRoot = path.resolve(root, specsDir);
  let entries: Awaited<ReturnType<typeof collectSpecEntries>>;
  try {
    entries = await collectSpecEntries(specsRoot);
  } catch (err) {
    if (isEnoent(err)) return [];
    throw err;
  }
  const out: string[] = [];
  for (const entry of entries) {
    const specMdPath = path.join(entry.dir, "01_Spec.md");
    let body: string;
    try {
      body = await readFile(specMdPath, "utf-8");
    } catch (err) {
      if (isEnoent(err)) continue;
      throw err;
    }
    if (TITLE_MARKER_RE.test(body)) {
      out.push(entry.specNumber);
    }
  }
  return out.sort((a, b) => a.localeCompare(b));
}

async function hasMatchingUiContract(contractsRoot: string, specId: string): Promise<boolean> {
  const uiDir = path.join(contractsRoot, "ui");
  const direct = path.join(uiDir, `${specId}.yaml`);
  // codex r3271969283 (P2, 50th-wave): use `stat().isFile()` instead of
  // `access()` so a directory (or symlink to non-file) named like
  // `<specId>.yaml` does NOT falsely classify the spec as UI-bearing.
  // Pre-fix `access()` only checked existence; a misauthored project
  // with `<contractsDir>/ui/0007.yaml/` (directory) would have made
  // `resolveSurfaceUnion` / `resolvePrimaryPrototypingSpec` report a
  // phantom UI surface and drive `prototyping iterate` / drift gates
  // against it instead of the expected no-op path. The downstream
  // entries-walk branch already filters with `entry.isFile()`; this
  // check brings the direct-match arm to the same discipline.
  try {
    const s = await stat(direct);
    if (s.isFile()) return true;
  } catch (error) {
    if (!isEnoent(error)) {
      throw error;
    }
  }

  // Also accept `spec-NNNN.yaml` / `ui-NNNN-*.yaml` shapes — consumer
  // projects sometimes prefix with `spec-` or follow the
  // `ui-XXXX-<slug>.yaml` convention documented in
  // `.qfai/contracts/ui/README.md`.
  //
  // Codex r3264487007: tightened from the prior `(?:^|[^0-9])${specId}
  // (?:[^0-9]|$)` token-anywhere regex which over-matched unrelated
  // basenames whose names happened to contain the four-digit spec id
  // (e.g. `unrelated-text-0001.yaml` would be treated as a UI contract
  // for spec 0001). The accepted shapes are now anchored explicitly:
  //
  //   - `<specId>.yaml`                  (bare 4-digit id; legacy)
  //   - `spec-<specId>.yaml`             (spec-prefixed; legacy)
  //   - `ui-<specId>.yaml`               (ui-prefixed, no slug)
  //   - `ui-<specId>-<slug>.yaml`        (ui-prefixed with non-empty
  //                                       slug, per the documented
  //                                       convention)
  //
  // Any other basename — including ones that merely *contain* the id
  // token — is rejected. The fallback is intentionally narrower than
  // the contract's "direct match" arm to avoid silent false-positives.
  //
  // 7th late-review wave (codex r3264965744 / r3264968391, LOW/MINOR):
  // tightened further to match the doc exactly. The prior
  // `^(?:spec-|ui-)?${specId}(?:-[^.]*)?\\.yaml$` regex over-accepted
  // (a) bare-slug shapes `<id>-<slug>.yaml` / `spec-<id>-<slug>.yaml`
  // that are NOT in the documented set, and (b) empty-slug
  // `ui-<id>-.yaml` (the `[^.]*` allowed zero chars between the
  // hyphen and the extension). The slug arm now requires `[^.]+`
  // (one or more) and only attaches to the `ui-` prefix.
  let entries: Dirent[];
  try {
    entries = await readdir(uiDir, { withFileTypes: true });
  } catch (error) {
    if (isEnoent(error)) {
      return false;
    }
    throw error;
  }
  const anchoredRe = new RegExp(`^(?:${specId}|spec-${specId}|ui-${specId}(?:-[^.]+)?)\\.yaml$`);
  if (entries.some((entry) => entry.isFile() && anchoredRe.test(entry.name))) {
    return true;
  }
  // 23rd-wave Fix (codex r3270307469, P1 — chatgpt-codex-connector):
  // detect the documented per-spec subdirectory layout
  // `<contractsDir>/ui/spec-<specId>/<sub>.yaml` (candidate #5 in
  // `.qfai/contracts/ui/README.md` precedence table).
  //
  // Extension policy (25th-wave clarification per codex r3270529771
  // MINOR): the subdir walk accepts arbitrary `*.yaml` basenames
  // (since the per-spec subdir IS the spec-scope signal — the
  // basename does not need to encode the spec id again), but `*.yml`
  // (single-l) is rejected for parity with the top-level anchored
  // regex which only accepts `*.yaml`. This intentional asymmetry
  // (subdir = any `.yaml`; top-level = anchored `<spec-id>.yaml`)
  // matches the README precedence table semantics. TC-0012-0423
  // pins both branches plus the empty-subdir non-match case. Pre-fix
  // `hasMatchingUiContract` only checked top-level basenames, so a
  // project that authored its UI contracts as
  // `.qfai/contracts/ui/spec-0007/home.yaml` (without a
  // `surface_type: ui-bearing` marker on the spec) would be silently
  // treated as non-UI-bearing — `resolveAllUiBearingSpecs` returned
  // empty, the cycle 0 precheck no-op'd, and the iterate command
  // silently exited without producing iter dirs. Probing for the
  // `spec-<specId>/` subdir + at least one `.yaml` underneath
  // recovers the documented fallback.
  // The subdir walk recursively descends into nested directories under
  // `<contractsDir>/ui/spec-<specId>/` because the README candidate #5
  // shape (`<spec-id>/<subpath>.yaml`) explicitly allows `<subpath>` to
  // be a multi-component path (e.g. `screens/home.yaml`). 26th-wave
  // refinement per codex r3270526761 + r3270527599 MINOR: dropped the
  // dead outer try/catch (the only throw path inside the loop is the
  // inner `readdir` — already discriminated as ENOENT / propagate) and
  // updated comments / test name to say `recursively walks the spec
  // subdirectory` instead of the misleading "one level deep" wording.
  const subdir = entries.find((entry) => entry.isDirectory() && entry.name === `spec-${specId}`);
  if (subdir) {
    const subdirAbs = path.join(uiDir, subdir.name);
    const stack: string[] = [subdirAbs];
    while (stack.length > 0) {
      const current = stack.pop();
      if (current === undefined) break;
      let subEntries: Dirent[];
      try {
        subEntries = await readdir(current, { withFileTypes: true });
      } catch (subErr) {
        if (isEnoent(subErr)) continue;
        throw subErr;
      }
      for (const sub of subEntries) {
        if (sub.isFile() && sub.name.endsWith(".yaml")) {
          return true;
        }
        if (sub.isDirectory()) {
          stack.push(path.join(current, sub.name));
        }
      }
    }
  }
  return false;
}

/**
 * Cheap existence probe for `<specsDir>/spec-NNNN`. Used by
 * {@link resolveSurfaceUnion} to honour the
 * `prototyping.primarySpecId` config escape hatch: if the marker /
 * contract scan returns zero UI-bearing specs but the operator has
 * explicitly pinned a primary spec that exists on disk, the no-op
 * short-circuit is skipped so the legacy `resolvePrimaryPrototypingSpec`
 * path can drive the loop.
 *
 * codex review r3264508578: bare `catch {}` previously swallowed
 * EACCES / EIO / ENOTDIR alike as "doesn't exist", letting a
 * permission-denied spec dir silently no-op the run. The discriminated
 * ENOENT branch preserves the genuine-absence semantic and propagates
 * every other errno.
 *
 * 19th-wave Fix (codex r3270055214, MAJOR — architecture-reviewer):
 * moved here from `cli/commands/prototypingIterate.ts` together with
 * {@link resolveSurfaceUnion} so the CLI → CLI sideways import (which
 * `prototypingCertify.ts` had to take to align with iterate's drift
 * gate) is replaced by both CLI commands importing the union resolver
 * from a single core module. The dependency DAG (CLI → core) is
 * restored.
 */
async function specDirExists(root: string, specsDir: string, specId: string): Promise<boolean> {
  const dirName = `spec-${specId}`;
  // codex r3271656121 (P1, chatgpt-codex-connector): use `path.resolve`
  // instead of `path.join` so an absolute `paths.specsDir` override in
  // `qfai.config.yaml` (e.g. `/tmp/specs`) resolves to the absolute
  // path directly. Pre-fix `path.join(root, "/tmp/specs", "spec-0001")`
  // produced `<root>/tmp/specs/spec-0001` (string concatenation, no
  // absolute-segment reset), so the probe missed the real spec dir
  // and `resolveSurfaceUnion` failed to include a valid
  // `prototyping.primarySpecId` pin — `prototyping iterate --cycle 0`
  // then hit the zero-UI short-circuit (exit 0) for explicit-primary
  // workflows relying on absolute path overrides. `path.resolve`
  // correctly resets to the latter absolute segment when one is
  // supplied (relative `specsDir` still composes against `root` the
  // same way `path.join` did).
  const abs = path.resolve(root, specsDir, dirName);
  try {
    const s = await stat(abs);
    return s.isDirectory();
  } catch (err) {
    if (isEnoent(err)) return false;
    throw err;
  }
}

/**
 * Compose the deterministic UNION of every UI-bearing surface signal
 * the project carries:
 *
 *   1. strict frontmatter marker `surface_type: ui-bearing` in
 *      `01_Spec.md` (the canonical multi-spec signal) OR a matching
 *      `.qfai/contracts/ui/<spec-id>*.yaml` contract — both via
 *      {@link resolveAllUiBearingSpecs}.
 *   2. legacy `# … prototyping …` heading in `01_Spec.md` — via
 *      {@link resolveTitleMarkerSpecs}.
 *   3. operator escape hatch `qfai.config.yaml#prototyping.primarySpecId`
 *      when the pinned spec id resolves to a directory on disk.
 *
 * Returns the union sorted lexicographically and deduplicated. Empty
 * result signals "no UI surface declared anywhere" — the caller
 * decides whether to short-circuit (the no-op gate uses this signal).
 *
 * SSOT for the live UI-bearing scope: `prototypingIterate.ts` uses
 * this resolver for the cycle ≥ 1 drift gate, and
 * `prototypingCertify.ts#runPrototypingShowSpec` uses it for
 * `liveUiBearing` so the live scope reported by show-spec is
 * apples-to-apples with what iterate actually enforces.
 *
 * 19th-wave Fix (codex r3270055214, MAJOR — architecture-reviewer):
 * moved here from `cli/commands/prototypingIterate.ts` so both CLI
 * commands import this resolver from the core layer instead of
 * `prototypingCertify.ts` taking a sideways import on
 * `prototypingIterate.ts`. The original location was a leftover from
 * the 8th-wave extraction; this wave finishes the layer cleanup.
 *
 * @internal Exported for direct unit-testing of the union composition
 * rule and so consumers across the CLI layer can re-resolve the live
 * multi-spec union. Not part of the package's public surface.
 */
export async function resolveSurfaceUnion(root: string, config: QfaiConfig): Promise<string[]> {
  const strictUiBearing = await resolveAllUiBearingSpecs(root, config);
  const titleMarkerSpecs = await resolveTitleMarkerSpecs(root, config.paths.specsDir);
  const configuredPrimarySpecId = config.prototyping?.primarySpecId;
  const configuredSpecOnDisk =
    configuredPrimarySpecId !== undefined
      ? await specDirExists(root, config.paths.specsDir, configuredPrimarySpecId)
      : false;
  const union = new Set<string>(strictUiBearing);
  if (configuredSpecOnDisk && configuredPrimarySpecId !== undefined) {
    union.add(configuredPrimarySpecId);
  }
  for (const id of titleMarkerSpecs) union.add(id);
  return [...union].sort((a, b) => a.localeCompare(b));
}
