import type { Stats } from "node:fs";
import { lstat, readlink, realpath } from "node:fs/promises";
import path from "node:path";

import { getInitAssetsDir } from "../../shared/assets.js";
import { isEnoent } from "../fs/errno.js";
import { toRelativePath } from "../paths.js";
import type { Issue } from "../types.js";
import { linkNamesTarget, validateIntegrationSurface } from "../validators/integrationSurface.js";
import { applyWaivers } from "../waivers.js";
import { describeError, firstLinkedComponent, safeLstat } from "./fsGuards.js";
import {
  AGENT_INTEGRATION_CONFIGS,
  SKILL_INTEGRATION_DIRS,
  collectCanonicalAgentNames,
  collectCanonicalSkillIds,
} from "./integrationDirs.js";
import {
  ensureSymlink,
  isCurrentLink,
  removeRepointHold,
  repointHolds,
  sameLinkTarget,
} from "./managedLink.js";

/** One wrapper `qfai init` would write, addressed the way a finding names it. */
type PlannedWrapper = {
  readonly linkPath: string;
  readonly target: string;
  readonly legacyTarget: string;
  readonly type: "dir" | "file";
};

const WRAPPER_REPAIR_LABEL = "autoremediate: integration wrappers";

/**
 * Every wrapper the shipped roster calls for, keyed by its repository-relative
 * POSIX path.
 *
 * The roster is the shipped one, read from the same place
 * `validateIntegrationSurface` reads it. Both sides of the repair therefore
 * answer for one set of names: a wrapper the gate does not know about cannot
 * be written here, and one it names cannot be missing from this map for a
 * reason other than not being ours.
 */
async function plannedWrappers(root: string): Promise<Map<string, PlannedWrapper>> {
  const assistantAssets = path.join(getInitAssetsDir(), ".qfai", "assistant");
  const skills = await collectCanonicalSkillIds(assistantAssets);
  const agents = await collectCanonicalAgentNames(assistantAssets);
  const planned = new Map<string, PlannedWrapper>();

  for (const dir of SKILL_INTEGRATION_DIRS) {
    for (const skillId of skills) {
      planned.set(`${dir}/${skillId}`, {
        linkPath: path.join(root, dir, skillId),
        target: path.relative(
          path.join(root, dir),
          path.join(root, ".qfai", "assistant", "skill", skillId),
        ),
        legacyTarget: path.relative(
          path.join(root, dir),
          path.join(root, ".qfai", "assistant", "skills", skillId),
        ),
        type: "dir",
      });
    }
  }
  for (const { dir, suffix } of AGENT_INTEGRATION_CONFIGS) {
    for (const agentName of agents) {
      planned.set(`${dir}/${agentName}${suffix}`, {
        linkPath: path.join(root, dir, `${agentName}${suffix}`),
        target: path.relative(
          path.join(root, dir),
          path.join(root, ".qfai", "assistant", "agent", `${agentName}.md`),
        ),
        legacyTarget: path.relative(
          path.join(root, dir),
          path.join(root, ".qfai", "assistant", "agents", `${agentName}.md`),
        ),
        type: "file",
      });
    }
  }
  return planned;
}

/** Why a link rewrite is not this path's repair, read from the path itself. */
async function describeUnrewritable(linkPath: string): Promise<string> {
  const stats = await safeLstat(linkPath);
  if (stats === undefined) return "the path is not there";
  if (stats.isSymbolicLink()) return "the link already names the right target";
  if (stats.isDirectory()) return "a real directory occupies the path";
  if (stats.isFile()) return "a regular file occupies the path";
  return "a special file occupies the path";
}

/**
 * What a roster path holds, as far as a migration's link repair is concerned.
 *
 * `current` is the gate's rule ({@link linkNamesTarget}), so a link the gate
 * reports is never read as already right. `respelled` reaches the singular
 * directory by a spelling the gate rejects, and `init` rewrites it.
 */
type RosterLink =
  | { kind: "absent" }
  | { kind: "old" }
  | { kind: "current" }
  | { kind: "respelled" }
  | { kind: "foreign"; target: string }
  | { kind: "occupied" };

async function rosterLink(wrapper: PlannedWrapper): Promise<RosterLink> {
  let stats: Stats;
  try {
    stats = await lstat(wrapper.linkPath);
  } catch (err: unknown) {
    if (isEnoent(err)) return { kind: "absent" };
    throw err;
  }
  if (!stats.isSymbolicLink()) return { kind: "occupied" };
  const base = path.dirname(wrapper.linkPath);
  const target = await readlink(wrapper.linkPath);
  if (sameLinkTarget(base, target, wrapper.legacyTarget)) return { kind: "old" };
  if (linkNamesTarget(target, wrapper.target)) return { kind: "current" };
  if (sameLinkTarget(base, target, wrapper.target)) return { kind: "respelled" };
  return { kind: "foreign", target };
}

/** The wrapper paths the gate is currently reporting, waivers applied. */
async function wrappersTheGateNames(root: string): Promise<ReadonlySet<string> | null> {
  let findings: Issue[];
  try {
    findings = await validateIntegrationSurface(root);
  } catch {
    return null;
  }
  // The pass `validate` runs, so a waived wrapper is not rewritten under a
  // project that has decided to keep it.
  const waived = await applyWaivers(root, findings).catch(() => null);
  return new Set(
    (waived?.issues ?? findings)
      .filter((issue) => issue.code === "QFAI-LINK-001" && issue.suppressed !== true)
      .flatMap((issue) => issue.refs ?? []),
  );
}

/** Allow this repository's generated agent directory to resolve to its own shipped assets. */
async function isOwnShippedAgentLink(root: string, linkedParent: string): Promise<boolean> {
  const canonicalAgentDir = path.join(root, ".qfai", "assistant", "agent");
  if (path.resolve(linkedParent) !== path.resolve(canonicalAgentDir)) return false;

  const ownAssets = path.join(root, "packages", "qfai", "assets", "init");
  const shippedAgentDir = path.join(ownAssets, ".qfai", "assistant", "agent");
  if ((await firstLinkedComponent(shippedAgentDir, root)) !== null) return false;

  try {
    const [activeAssets, localAssets, linkedTarget, shippedAgents] = await Promise.all([
      realpath(getInitAssetsDir()),
      realpath(ownAssets),
      realpath(linkedParent),
      realpath(shippedAgentDir),
    ]);
    return activeAssets === localAssets && linkedTarget === shippedAgents;
  } catch {
    return false;
  }
}

/**
 * What a migration does at each roster path, read from the path itself.
 *
 * The gate reports wrappers only in a project it can tell was initialised. A
 * project still on the old layout may carry nothing that proves it, and its
 * links to the plural directories are still init's links. So the migration
 * reads each roster path, and its answer overrides the gate's where they
 * differ:
 *
 * | the path holds                               | outcome                                              |
 * | -------------------------------------------- | ---------------------------------------------------- |
 * | nothing, beside a hold of an interrupted run | restored, and the hold removed                       |
 * | nothing else                                 | left absent, even when the gate reports it missing   |
 * | a link to the plural directory               | repointed, and any hold beside it removed            |
 * | the link `init` writes, and a hold           | the hold removed; the link is already right          |
 * | the singular directory, spelled otherwise    | rewritten as `init` writes it, and any hold removed  |
 * | a link to anywhere else                      | left as it is, and reported when the gate names it   |
 * | a file, directory or other entry             | preserved and reported as occupied                   |
 *
 * A hold means a repair emptied the path and nothing has written it since,
 * because every writer that creates the link removes the holds beside it. So
 * restoring on a hold undoes the repair's own emptying, never a removal the
 * project made. Removing the hold is part of the same repoint, and is listed
 * with it.
 *
 * `named` is updated in place. The map returned holds, per roster path, the
 * holds this pass removes there.
 */
async function planMigrationRoster(
  root: string,
  planned: ReadonlyMap<string, PlannedWrapper>,
  named: Set<string>,
  selected: (relative: string) => boolean,
): Promise<{ holds: Map<string, string[]>; declined: string[] }> {
  const holds = new Map<string, string[]>();
  const declined: string[] = [];
  for (const [relative, wrapper] of planned) {
    const found = await rosterLink(wrapper);
    if (found.kind === "foreign") {
      if (named.delete(relative)) {
        declined.push(
          `${relative}: the link names ${found.target}, which is neither the old nor the new directory`,
        );
      }
      continue;
    }
    const own = await selectedHolds(root, wrapper, selected);
    if (found.kind === "absent" && own.length === 0) {
      named.delete(relative);
      continue;
    }
    if (found.kind === "current") {
      if (own.length > 0) holds.set(relative, own);
      continue;
    }
    if (!selected(relative)) continue;
    named.add(relative);
    if (own.length > 0) holds.set(relative, own);
  }
  return { holds, declined };
}

/** The holds of an interrupted repoint beside `wrapper` that this pass may remove. */
async function selectedHolds(
  root: string,
  wrapper: PlannedWrapper,
  selected: (relative: string) => boolean,
): Promise<string[]> {
  const holds = await repointHolds(wrapper.linkPath, [wrapper.legacyTarget, wrapper.target]);
  return holds.filter((hold) => selected(toRelativePath(root, hold)));
}

/**
 * The holds beside roster links that are already right, for a pass that is
 * not a migration.
 *
 * The gate does not name such a link, so the writer never visits it and never
 * removes its holds. Left there, a hold says the path was emptied and not
 * refilled, and a later migration would restore the link over a removal the
 * project made. A path the gate does name is skipped: the writer removes its
 * holds.
 */
async function holdsBesideCurrentLinks(
  root: string,
  planned: ReadonlyMap<string, PlannedWrapper>,
  named: ReadonlySet<string>,
  selected: (relative: string) => boolean,
): Promise<Map<string, string[]>> {
  const holds = new Map<string, string[]>();
  for (const [relative, wrapper] of planned) {
    if (named.has(relative)) continue;
    if (!(await isCurrentLink(wrapper.linkPath, wrapper.target))) continue;
    const own = await selectedHolds(root, wrapper, selected);
    if (own.length > 0) holds.set(relative, own);
  }
  return holds;
}

/**
 * Why a link cannot be written at this roster path, or `null` when it can.
 *
 * `holdsOnly` asks for the parent check alone: removing a hold beside a link
 * that is already right needs no canonical source.
 */
async function whyNotRelinkable(
  root: string,
  relative: string,
  wrapper: PlannedWrapper,
  holdsOnly: boolean,
): Promise<string | null> {
  const linkedAncestor = await firstLinkedComponent(path.dirname(wrapper.linkPath), root);
  if (linkedAncestor !== null) return `${relative}: a linked parent occupies ${linkedAncestor}`;
  if (holdsOnly) return null;
  const source = path.resolve(path.dirname(wrapper.linkPath), wrapper.target);
  const linkedSourceParent = await firstLinkedComponent(path.dirname(source), root);
  if (linkedSourceParent !== null && !(await isOwnShippedAgentLink(root, linkedSourceParent))) {
    return `${relative}: canonical source has a linked parent at ${linkedSourceParent}`;
  }
  let sourceKind: Stats;
  try {
    sourceKind = await lstat(source);
  } catch (err: unknown) {
    if (isEnoent(err)) return `${relative}: canonical source is missing at ${source}`;
    throw err;
  }
  if (
    sourceKind.isSymbolicLink() ||
    (wrapper.type === "dir" ? !sourceKind.isDirectory() : !sourceKind.isFile())
  ) {
    return `${relative}: canonical source has the wrong kind at ${source}`;
  }
  return null;
}

/**
 * Relinks the integration wrappers the gate is reporting. A migration also
 * repoints roster links still naming the plural directories, and restores a
 * path only where an interrupted repoint of its own emptied it
 * ({@link planMigrationRoster}). Every pass removes the holds beside a link
 * that is already right ({@link holdsBesideCurrentLinks}).
 *
 * `qfai init --force` clears the same finding, but it also regenerates
 * `.qfai/assistant/skill/**`, `assistant/agent/**` and the shipped plain
 * files, so an unattended pass cannot be allowed to reach for it: local edits
 * to any of those would be gone without the operator asking. This writes
 * symlinks and nothing else, through the same {@link ensureSymlink} `init`
 * uses. A migration's journaled path set limits the live run to paths the dry
 * run named. A hold it removes is one of those paths, reported on a relink
 * line of its own, so the dry run lists it.
 *
 * Two kinds of path are reported rather than rewritten, because a pass that
 * passed over them in silence would read as having repaired the tree:
 *
 * | path                                          | why not                                    |
 * | --------------------------------------------- | ------------------------------------------ |
 * | outside the shipped roster                     | rewriting restores what the finding is about |
 * | occupied by a real file, directory or device   | the content is somebody's, not a link      |
 *
 * A rewrite that cannot be made at all — creating a symlink needs Developer
 * Mode or elevation on Windows — is reported with what the platform said, in
 * place of a clean pass.
 */
export async function repairIntegrationWrappers(
  root: string,
  dryRun: boolean,
  report: (line: string) => void,
  options: { includeMissing?: boolean; onlyRelative?: ReadonlySet<string> } = {},
): Promise<void> {
  const gateNamed = await wrappersTheGateNames(root);
  if (gateNamed === null) {
    report(
      `${WRAPPER_REPAIR_LABEL} — skipped: the wrappers could not be inspected (check the permissions and the path)`,
    );
    return;
  }
  const selected = (relative: string): boolean => options.onlyRelative?.has(relative) ?? true;
  const named = new Set([...gateNamed].filter(selected));
  const planned = await plannedWrappers(root);
  const migration = options.includeMissing
    ? await planMigrationRoster(root, planned, named, selected)
    : { holds: await holdsBesideCurrentLinks(root, planned, named, selected), declined: [] };
  const paths = new Set([...named, ...migration.holds.keys()]);
  if (paths.size === 0 && migration.declined.length === 0) {
    report(`${WRAPPER_REPAIR_LABEL} — nothing to repair`);
    return;
  }

  const repaired: string[] = [];
  const declined: string[] = [...migration.declined];
  const failed: string[] = [];
  // The writer's own notes — a sidecar it could not remove, an original it put
  // back and where. Collected rather than printed: this caller's stdout may be
  // carrying a JSON document, and `init`'s writer sends them straight there.
  const notes: string[] = [];
  const settleHolds = async (wrapper: PlannedWrapper, holds: readonly string[]) => {
    for (const hold of holds) {
      const relative = toRelativePath(root, hold);
      const failure = dryRun
        ? null
        : await removeRepointHold(hold, path.basename(wrapper.linkPath));
      if (failure === null) repaired.push(relative);
      else failed.push(`${relative}: ${describeError(failure)}`);
    }
  };

  for (const relative of Array.from(paths).sort()) {
    const wrapper = planned.get(relative);
    if (wrapper === undefined) {
      declined.push(`${relative}: this release ships no skill or agent by that name`);
      continue;
    }
    const holds = migration.holds.get(relative) ?? [];
    const holdsOnly = !named.has(relative);
    const refusal = await whyNotRelinkable(root, relative, wrapper, holdsOnly);
    if (refusal !== null) {
      declined.push(refusal);
      continue;
    }
    if (holdsOnly) {
      await settleHolds(wrapper, holds);
      continue;
    }
    try {
      const result = await ensureSymlink(wrapper.linkPath, wrapper.target, wrapper.type, {
        force: false,
        dryRun,
        legacyTarget: wrapper.legacyTarget,
        // A migration removes the holds it planned, and only those, below.
        discardRepointHolds: !options.includeMissing,
        report: (line) => {
          for (const part of line.split("\n")) notes.push(`  ${part.trim()}`);
        },
      });
      if (result === "created") {
        repaired.push(relative);
        await settleHolds(wrapper, holds);
      } else {
        declined.push(`${relative}: ${await describeUnrewritable(wrapper.linkPath)}`);
      }
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : String(err);
      failed.push(`${relative}: ${detail.split("\n").join("\n    ")}`);
    }
  }

  report(
    dryRun
      ? `${WRAPPER_REPAIR_LABEL} — would relink=${String(repaired.length)}, left alone=${String(declined.length)}, failed=${String(failed.length)} (dry-run)`
      : `${WRAPPER_REPAIR_LABEL} — relinked=${String(repaired.length)}, left alone=${String(declined.length)}, failed=${String(failed.length)}`,
  );
  for (const relative of repaired) {
    report(dryRun ? `  would relink ${relative}` : `  relinked ${relative}`);
  }
  for (const line of declined) {
    report(`  left alone ${line}`);
  }
  for (const line of failed) {
    report(`  could not relink ${line}`);
  }
  for (const line of notes) {
    report(line);
  }
}
