import { constants } from "node:fs";
import type { Dirent, Stats } from "node:fs";
import type { FileHandle } from "node:fs/promises";
import { access, lstat, open, readdir, readlink, realpath, stat } from "node:fs/promises";
import path from "node:path";

import { getInitAssetsDir } from "../../shared/assets.js";
import type { Issue } from "../types.js";
import { isInside, issue } from "./utils.js";

/**
 * Skill wrapper directories `qfai init` fills with symlinks, and the agent
 * wrapper directories with the filename suffix each one uses.
 *
 * Kept in step with `cli/commands/init.ts#SKILL_INTEGRATION_DIRS` /
 * `#AGENT_INTEGRATION_CONFIGS`. `tests/core/integrationSurface.test.ts` asserts
 * the lists agree, so a new integration target cannot ship unprobed.
 */
export const SKILL_WRAPPER_DIRS: readonly string[] = [
  ".claude/skills",
  ".agents/skills",
  ".codex/skills",
  ".github/skills",
];

export const AGENT_WRAPPER_DIRS: readonly { dir: string; suffix: string }[] = [
  { dir: ".claude/agents", suffix: ".md" },
  { dir: ".github/agents", suffix: ".agent.md" },
];

/** Every directory this rule looks at, for the parity test and the docs. */
export const INTEGRATION_SURFACE_DIRS: readonly string[] = [
  ...SKILL_WRAPPER_DIRS,
  ...AGENT_WRAPPER_DIRS.map((entry) => entry.dir),
];

/**
 * Directory entries, or `null` when the directory does not exist.
 *
 * Absence is the only condition this rule may treat as "nothing to check".
 * `catch(() => [])` also swallowed `EACCES` and transient I/O errors, turning
 * the roster empty and taking the early return — so the harder the filesystem
 * was failing, the more confidently `QFAI-LINK-001` reported a clean surface.
 * Everything that is not `ENOENT` propagates.
 *
 * **`ENOTDIR` is not absence.** It says a component of the path exists and is
 * not a directory — `.claude/skills` written as a regular file, say. Folding it
 * into "not created yet" skipped every wrapper under it and passed a surface the
 * assistant cannot load anything from, which is the exact failure this rule
 * exists to catch.
 */
async function readDirOrNull(dir: string): Promise<Dirent[] | null> {
  try {
    return await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (isMissing(error)) return null;
    throw error;
  }
}

function isMissing(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException | null)?.code;
  return code === "ENOENT";
}

/**
 * Files `qfai init` writes and never removes, used as proof it ran.
 *
 * Kept in step with the README set in `cli/commands/init.ts`. Any one of them
 * is enough: a project with any of the integration surfaces has run init.
 *
 * **Known gap.** These are create-only, so a project that already had a file at
 * one of those paths keeps it and init writes no marker there. If it later has
 * every wrapper deleted as well, this rule reads it as never initialised. A
 * marker init always owns would close it, which is a change to what init
 * writes rather than to what this reads.
 */
/**
 * The line every one of those READMEs carries.
 *
 * `.agents/` and `.github/agents/` are conventional directories a project can
 * have for its own reasons, and a `README.md` in one of them is not evidence of
 * anything. Requiring the sentence `qfai init` writes makes the marker QFAI's:
 * a project that never ran it is not told that all six surfaces are missing.
 */
const INIT_MARKER_SIGNATURE = ".qfai/assistant/";

/**
 * The rest of the signature: a title `qfai init` writes and the section every
 * one of these READMEs has.
 *
 * One mention of `.qfai/assistant/` is not a signature — a project documenting
 * where it keeps its own QFAI tree writes that sentence, and one of those made a
 * checkout that never ran init read as initialised, with all six surfaces then
 * reported missing. All three parts together are init's.
 */
/**
 * Ceiling on a file this rule will read looking for the init signature.
 *
 * Generous against what init writes — a few hundred bytes — and small enough
 * that a project's own document at one of these paths costs nothing to decline.
 */
const MARKER_MAX_BYTES = 64 * 1024;

/**
 * Read-only, and non-blocking where the platform defines it.
 *
 * Opening a FIFO for reading blocks until a writer appears. Windows has no
 * `O_NONBLOCK`, and no FIFOs in this sense either, so plain read-only there.
 */
const OPEN_READ_FLAGS =
  typeof constants.O_NONBLOCK === "number"
    ? constants.O_RDONLY | constants.O_NONBLOCK
    : constants.O_RDONLY;

const INIT_MARKER_TITLE = /^# QFAI /;
const INIT_MARKER_SECTION = "## Canonical entrypoint";

const INIT_MARKERS: readonly (readonly string[])[] = [
  // The one marker that cannot be pre-empted. The four below sit in
  // conventional directories, and `qfai init` writes a README there only when
  // the path is free — so a project that already had its own at all four ran
  // init and got no marker at all, and deleting every wrapper afterwards left
  // the surface reading as never initialised: nothing checked, every profile
  // passing, and the assistant loading nothing. This one is inside `.qfai/`,
  // which init owns outright and creates, so there is nothing there to preserve
  // and no project file to collide with. It also outlives every integration
  // directory, which is the state the evidence is needed for.
  [".qfai", "assistant", "README.md"],
  [".agents", "README.md"],
  [".codex", "README.md"],
  [".claude", "agents", "README.md"],
  [".github", "agents", "README.md"],
];

type Broken = {
  /** Repo-relative wrapper path, POSIX-separated so messages match across platforms. */
  relative: string;
  detail: string;
  /**
   * The canonical path a later `readdir` cannot survive, when this damage is
   * one of those. Set where the damage is found, from the errno the probe
   * actually saw — not derived afterwards from the wording, and not from
   * `relative`, which names the wrapper for damage that sits on the canonical.
   */
  unwalkable?: string | undefined;
};

const toPosix = (value: string): string => value.split(path.sep).join("/");

/**
 * A sidecar `qfai init` leaves when a repair could not finish.
 *
 * Kept in step with the name the repair claims and the prune skips. Those two
 * and this rule have to agree about it: a sidecar holds the flattened target,
 * so it reads as a wrapper, and it exists precisely because a repair could not
 * finish — sometimes making it the only surviving copy of the original. The
 * remedy printed for a retired wrapper is "delete the path".
 */
const SIDECAR_RE = /\.qfai-repair-\d+(?:-\d+)?$/;

/**
 * Whether damage in this state stops a later `readdir` over the path.
 *
 * **Only what actually breaks a walk**, which is narrower than it looks. The
 * walks over this tree list a directory with `withFileTypes` and descend only
 * into `isDirectory()` entries, and they probe the root with an `access` that
 * swallows every error — so a symlink, cycle or not, is listed and skipped, and
 * a cycle at the root answers "absent". A **regular file where a directory
 * belongs** is the one shape that gets as far as `readdir` and raises
 * `ENOTDIR`.
 *
 * Everything wider than that hid unrelated spec, contract and test defects
 * behind a link the operator had to repair first: a resolving redirect, a
 * dangling link that reads as absence, a cycle on a leaf the parent listing
 * never follows.
 */
function blocksWalk(state: PathState): boolean {
  return state.kind === "not-a-directory";
}

/**
 * Canonical paths the rest of validation cannot walk.
 *
 * A profile validator reading the same tree raises `ENOTDIR` / `ELOOP` from its
 * own `readdir`, and one rejection loses the finding already produced here —
 * the only one that names the path and how to repair it. The caller uses this
 * to stop after reporting rather than to hide the error.
 *
 * Read from the **whole** damage list, and from a flag each site sets when it
 * sees the errno. Deciding it afterwards from the issue message read a
 * 12-entry sample, so a thirteenth entry holding the only unwalkable path
 * decided nothing; deciding it from the wording matched damage on
 * `.claude/skills`, which is read here and walked by nobody afterwards, and
 * short-circuiting on that hid every spec, contract and test defect sitting
 * alongside it.
 */
function unwalkablePaths(broken: readonly Broken[]): string[] {
  return broken.flatMap((entry) => (entry.unwalkable === undefined ? [] : [entry.unwalkable]));
}

/**
 * The skills `qfai init` would create a wrapper for.
 *
 * **The shipped roster alone**, read from `assets/init` — what init actually
 * wraps. The project's own canonical tree is not the question: a user-defined
 * `.qfai/assistant/skills/my-skill/` is explicitly allowed there —
 * `skillDocReferences` permits it — and init never creates a wrapper for it, so
 * publishing it by hand as a real directory would be reported as a broken qfai
 * link in every profile.
 *
 * **Not intersected with what the project has.** That was the first fix and it
 * went one step too far: a shipped skill whose canonical `SKILL.md` was deleted
 * by mistake, wrapper still in place, dropped out of the roster and its dangling
 * wrapper passed every profile — which is precisely the state this rule exists
 * to report. The intersection was there to keep a retired skill out of scope,
 * and the shipped roster already does that (a retired skill is not shipped); a
 * skill this project has not taken yet is skipped by its wrapper being absent.
 *
 * Never a name prefix. A `qfai-` prefix test skipped `web-research` — a shipped
 * skill init wraps like any other — so a flattened `web-research` link passed
 * the check while the assistant could not load it.
 */
async function canonicalSkillIds(): Promise<string[]> {
  const shipped = await skillIdsIn(path.join(getInitAssetsDir(), ".qfai", "assistant", "skills"));
  return Array.from(shipped).sort();
}

/** Directory names under `skillsDir` that carry a `SKILL.md`. */
async function skillIdsIn(skillsDir: string): Promise<Set<string>> {
  const entries = await readDirOrNull(skillsDir);
  const ids = new Set<string>();
  for (const entry of entries ?? []) {
    if (!entry.isDirectory()) continue;
    if (await fileExists(path.join(skillsDir, entry.name, "SKILL.md"))) {
      ids.add(entry.name);
    }
  }
  return ids;
}

/**
 * `exists` with the same error honesty as {@link readDirOrNull}.
 *
 * The shared helper turns every error into `false`, which drops the skill from
 * the roster — and if it were the only canonical entry, the early return then
 * passed a broken surface with no finding. The directory read and the wrapper
 * probe both propagate a non-absence error; the probe that decides membership
 * has to as well, or the guarantee holds everywhere except where it is decided.
 */
/**
 * Whether the file can actually be read, by reading it.
 *
 * `access(R_OK)` consults the POSIX mode bits and **not** a Windows ACL, so a
 * document an ACL denies answered "readable" while the assistant's own read
 * failed — and the remedy this rule prints for that state is an `icacls`
 * command. Opening it is the only question whose answer matches what the
 * assistant will experience. One byte is enough and costs nothing on a document
 * that is fine.
 */
async function isReadable(filePath: string): Promise<boolean> {
  let handle: FileHandle | undefined;
  try {
    handle = await open(filePath, OPEN_READ_FLAGS);
    await handle.read(Buffer.alloc(1), 0, 1, 0);
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException | null)?.code;
    if (code === "EACCES" || code === "EPERM") return false;
    if (isMissing(error)) return false;
    throw error;
  } finally {
    await handle?.close();
  }
}

/**
 * Whether this entry is one `qfai init` wrote — proof it ran here.
 *
 * Two shapes, both unmistakably QFAI's: a symlink spelling the target this
 * wrapper names, and the flattened form of the same thing — a regular file
 * whose whole content is that target, which is what a checkout with
 * `core.symlinks = false` leaves behind. The flattened one has to count: it is
 * the scenario this rule exists for, and refusing it would make a wholly
 * flattened checkout read as never initialised.
 *
 * Nothing weaker. These directories are conventional and a shipped skill id can
 * be a name a project chose for itself, so "an entry exists at the path" said a
 * project that never ran init was initialised — and its own directory was then
 * reported as a broken qfai link, along with every integration directory it had
 * no reason to have.
 */
async function isInitEvidence(wrapper: Wrapper, link: Stats | null | undefined): Promise<boolean> {
  if (link === null || link === undefined) return false;
  if (link.isSymbolicLink()) {
    // A link is compared the way the per-wrapper check compares it, so a link
    // that counts as evidence is exactly a link this rule calls correct.
    const actual = await readlink(wrapper.absolute).catch((error: unknown) => {
      if (isMissing(error)) return null;
      throw error;
    });
    return actual !== null && path.normalize(actual) === path.normalize(wrapper.target);
  }
  // The flattened form is a small text file, and the ceiling has to bind the
  // entry that is read rather than the one `lstat` saw — the same reason the
  // marker probe reads through a handle.
  if (!link.isFile()) return false;
  const body = await readPinnedFile(wrapper.absolute, 4096);
  // Byte-exact, as `init.ts` compares the same signature and for the same
  // reason. `path.normalize` accepted `../../.qfai/assistant/./skills/<id>` —
  // not what git writes, but what a project's own note at that path might say —
  // and one of those made a checkout that never ran init read as initialised.
  // The only difference tolerated is the separator, and only where
  // `path.relative` produces the other one.
  return body !== null && comparableTarget(body) === comparableTarget(wrapper.target);
}

/** Separator-insensitive on Windows, byte-exact everywhere else. */
function comparableTarget(value: string): string {
  return process.platform === "win32" ? value.split("\\").join("/") : value;
}

/** `lstat`, or `null` when the path is absent or unreachable through a cycle. */
async function lstatOrNull(filePath: string): Promise<Stats | null> {
  try {
    return await lstat(filePath);
  } catch (error) {
    if (isMissing(error)) return null;
    const code = (error as NodeJS.ErrnoException | null)?.code;
    // A cycle or a non-directory component means there is nothing here to be
    // what the caller is asking about — an init marker, a wrapper. Whatever
    // damage put it there is reported by the probe that owns that path;
    // re-throwing it from this one ended `qfai validate` with a stack trace
    // while other markers and wrappers still had something to say.
    if (code === "ELOOP" || code === "ENOTDIR") return null;
    throw error;
  }
}

/**
 * What is at a canonical document path: nothing, something, or a broken link.
 *
 * `access` follows the link, so a canonical replaced by a dangling symlink
 * answered "absent" and its skill left the check altogether — no wrapper
 * reported for it in any profile, and nothing else reads the canonical tree
 * outside `full`. A cycle was worse: the `ELOOP` propagated and `qfai validate`
 * exited with a stack trace.
 */
type PathState =
  | { kind: "absent" }
  | { kind: "present"; stats: Stats }
  | { kind: "dangling" }
  | { kind: "cycle" }
  | { kind: "not-a-directory" };

async function canonicalState(filePath: string): Promise<PathState> {
  let entry: Stats;
  try {
    entry = await lstat(filePath);
  } catch (error) {
    if (isMissing(error)) return { kind: "absent" };
    const code = (error as NodeJS.ErrnoException | null)?.code;
    if (code === "ELOOP") return { kind: "cycle" };
    // A path component exists and is not a directory — `.qfai/assistant/skills`
    // written as a regular file, say. It is the same class of damage as a cycle
    // and it was the same failure: re-thrown, it ended `qfai validate` with a
    // stack trace instead of a finding naming a path to repair.
    if (code === "ENOTDIR") return { kind: "not-a-directory" };
    throw error;
  }
  if (!entry.isSymbolicLink()) return { kind: "present", stats: entry };
  const resolved = await statOrNull(filePath);
  if (resolved === "cycle") return { kind: "cycle" };
  if (resolved === "not-a-directory") return { kind: "not-a-directory" };
  return resolved === null ? { kind: "dangling" } : { kind: "present", stats: resolved };
}

/**
 * Why this canonical document cannot back its wrapper, or `null` when it can.
 *
 * The same rule the resolved-target check applies, reachable from the branch
 * where there is no wrapper to resolve through.
 */
async function canonicalKindProblem(wrapper: Wrapper, stats: Stats): Promise<string | null> {
  if (wrapper.kind === "agent") {
    return stats.isFile() ? null : `canonical document is a ${describeKind(stats)}, not a file`;
  }
  if (!stats.isDirectory()) {
    return `canonical skill is a ${describeKind(stats)}, not a directory`;
  }
  const doc = await statOrNull(path.join(wrapper.canonical, "SKILL.md"));
  if (doc === null) return "canonical skill directory has no SKILL.md";
  if (doc === "cycle") return "canonical SKILL.md is a symlink cycle";
  if (doc === "not-a-directory")
    return "a path component above canonical SKILL.md is not a directory";
  return doc.isFile() ? null : `canonical SKILL.md is a ${describeKind(doc)}`;
}

/**
 * The first component of `dir` under `root` that is a symlink, or `null`.
 *
 * Walked rather than compared: a resolved path and a built one differ for
 * reasons that are not symlinks — case on a case-insensitive filesystem, most
 * of all — and this question has an exact answer per component.
 */
async function unusableAncestor(
  root: string,
  dir: string,
): Promise<{ relative: string; detail: string } | null> {
  const parts = dir.split("/");
  for (let depth = 1; depth < parts.length; depth += 1) {
    const partial = parts.slice(0, depth);
    const relative = partial.join("/");
    const stats = await lstatOrNull(path.join(root, ...partial));
    // Nothing above exists, so nothing above is damaged — the surface is simply
    // not created, which is the caller's other branch.
    if (stats === null) return null;
    if (stats.isSymbolicLink()) return { relative, detail: `is a symlink` };
    // A regular file at `.claude` is not a link, but every path under it still
    // raises `ENOTDIR`. Reported through the leaf, the remedy named a child the
    // operator cannot reach; the component at fault is this one.
    if (!stats.isDirectory()) {
      return { relative, detail: `is a ${describeKind(stats)}, not a directory` };
    }
  }
  return null;
}

/**
 * The nearest ancestor of `relative` that exists and is damaged, or `null`.
 *
 * Walked from the top, so the outermost broken component is what gets named —
 * a dangling `.qfai/assistant` makes every path under it answer `ENOENT`, and
 * naming the leaf would send the operator at a path that is not the problem.
 */
async function brokenAncestor(
  root: string,
  relative: string,
): Promise<{ relative: string; state: PathState } | null> {
  const parts = relative.split("/");
  for (let depth = 1; depth < parts.length; depth += 1) {
    const partial = parts.slice(0, depth);
    const state = await canonicalState(path.join(root, ...partial));
    if (state.kind === "absent") return null;
    if (state.kind !== "present") return { relative: partial.join("/"), state };
  }
  return null;
}

/**
 * A canonical reachable only through a symlink — its own, an ancestor's, or its
 * `SKILL.md`'s — or `null` when every one of them is a real entry.
 *
 * `init` writes all three as real directories and real files, so a link is
 * damage wherever it points. A resolving one is the case no path comparison
 * catches: both sides follow it to the same place.
 */
async function canonicalLinkProblem(
  root: string,
  realRoot: string | null,
  wrapper: Wrapper,
): Promise<string | null> {
  const ancestor = await unusableAncestor(root, wrapper.canonicalRelative);
  if (ancestor !== null) {
    return `a canonical ancestor ${ancestor.detail}: ${toPosix(ancestor.relative)}`;
  }
  const own = await lstatOrNull(wrapper.canonical);
  if (own?.isSymbolicLink() === true) {
    const resolved = await realpathOrNull(wrapper.canonical);
    return realRoot !== null && resolved !== null && !isInside(realRoot, resolved)
      ? `canonical document is a symlink out of the project: ${toPosix(resolved)}`
      : `canonical document is a symlink: ${toPosix(resolved ?? "?")}`;
  }
  if (wrapper.kind !== "skill") return null;
  const doc = path.join(wrapper.canonical, "SKILL.md");
  const docOwn = await lstatOrNull(doc);
  if (docOwn?.isSymbolicLink() === true) return "canonical SKILL.md is a symlink";
  return null;
}

/**
 * Wrappers `qfai init` wrote for a skill or agent this package no longer ships.
 *
 * The roster is the **current** one, so a wrapper left by a shipped document
 * since removed or renamed is enumerated by nobody: it still resolves, and the
 * assistant goes on loading retired instructions while every profile reports a
 * clean surface. `pruneStaleQfaiWrappers` reaches only part of it: the agent
 * dirs are pruned under `--force` by resolved target, and only when that target
 * is a **direct child** of `.qfai/assistant/agents/`, while the skill dirs are
 * still matched by a `qfai-` prefix — and `web-research` is the standing proof
 * that a shipped name need not have one. This rule reports a target landing
 * anywhere under `.qfai/assistant/`, so a nested or cross-kind agent target is
 * reported and never pruned; the remedy names that gap rather than promising a
 * repair that will not happen.
 *
 * Identified by what init writes rather than by the name: an entry inside an
 * integration directory whose target lands under `.qfai/assistant/`. A wrapper
 * a project made by hand for a canonical of its own answers that description
 * too — init creates none for those, so it is unmanaged either way, and the
 * remedy says so rather than assuming which it is.
 */
async function retiredWrappers(
  root: string,
  wrappers: readonly Wrapper[],
  damagedDirs: ReadonlyMap<string, string>,
): Promise<Broken[]> {
  const expected = new Map<string, Set<string>>();
  for (const wrapper of wrappers) {
    // A directory already reported as damaged is not enumerated. When it is a
    // symlink that resolves, `readdir` follows the redirect and lists somebody
    // else s tree — and the remedy printed for a retired wrapper is delete the
    // path, which through that redirect deletes a file outside the project.
    if (damagedDirs.has(wrapper.dir)) continue;
    const names = expected.get(wrapper.dir) ?? new Set<string>();
    names.add(path.posix.basename(wrapper.relative));
    expected.set(wrapper.dir, names);
  }

  const assistantRoot = path.join(root, ".qfai", "assistant");
  const found: Broken[] = [];
  for (const [dir, names] of expected) {
    const dirAbsolute = path.join(root, ...dir.split("/"));
    // A directory that is itself damaged raises `ELOOP` / `ENOTDIR` here, and
    // that is already reported as damage of its own — listing what is inside it
    // is not this rule's question, and propagating the error would lose every
    // finding the run had produced. Absence is the same: nothing to enumerate.
    //
    // **Only those.** Swallowing every error let an `EACCES` — a POSIX
    // execute-only directory, where the `lstat` on each known wrapper succeeds
    // and the listing does not — pass validation with no retired wrapper
    // examined at all, while the assistant went on loading them. An error that
    // leaves the listing incomplete is not a clean answer and is re-thrown.
    const entries = await readdir(dirAbsolute, { withFileTypes: true }).catch((error: unknown) => {
      const code = (error as NodeJS.ErrnoException | null)?.code;
      if (isMissing(error) || code === "ELOOP" || code === "ENOTDIR") return null;
      throw error;
    });
    if (entries === null) continue;
    for (const entry of entries) {
      if (names.has(entry.name)) continue;
      // A repair sidecar is not a wrapper. It holds the flattened target, so it
      // reads as one — and it exists precisely because a repair could not
      // finish, which sometimes makes it the only copy of the original left.
      // The remedy printed here is "delete the path", so reporting it told the
      // operator to destroy the content the sidecar was preserving. Same name
      // test the prune uses, for the same reason.
      if (SIDECAR_RE.test(entry.name)) continue;
      const target = await wrapperTarget(path.join(dirAbsolute, entry.name), entry);
      if (target === null) continue;
      const resolved = path.resolve(dirAbsolute, target);
      // The tree itself is not a wrapper target, and a path outside it is
      // somebody else's link.
      if (resolved === assistantRoot || !isInside(assistantRoot, resolved)) continue;
      found.push({
        relative: `${dir}/${entry.name}`,
        detail: `resolves into the canonical tree but names ${toPosix(path.relative(root, resolved))}, which this version does not ship — the assistant still loads it`,
      });
    }
  }
  return found;
}

/**
 * The path a wrapper points at, whichever form the checkout left it in, or
 * `null` when the entry is not a wrapper at all.
 *
 * A flattened wrapper is a small regular file holding the target, so both forms
 * have to answer — reading only symlinks would have declared every wrapper on a
 * `core.symlinks false` checkout a non-wrapper, which is the one case this
 * whole rule exists for.
 */
async function wrapperTarget(entryPath: string, entry: Dirent): Promise<string | null> {
  // Only a race is a clean `null`. A transient `EIO`, or an ACL on this one
  // entry, says the target could not be read — and answering "not a wrapper"
  // let a retired wrapper the assistant still loads pass unexamined, which is
  // the same hole the listing error had one level up.
  const raceOrThrow = (error: unknown): null => {
    if (isMissing(error)) return null;
    throw error;
  };
  if (entry.isSymbolicLink()) {
    return readlink(entryPath).catch(raceOrThrow);
  }
  if (!entry.isFile()) return null;
  const content = await readPinnedFile(entryPath, 4096).catch(raceOrThrow);
  if (content === null) return null;
  // **Byte-exact**, the way the init-evidence check reads a flattened wrapper.
  // Git writes the target for mode `120000` with no trailing newline, so
  // trimming one off made a project's own one-line note — a path with a
  // newline after it — indistinguishable from a wrapper, and the finding told
  // the operator to delete it. No whitespace anywhere is the whole test.
  return content.length > 0 && !/\s/.test(content) ? content : null;
}

/**
 * Everything wrong with a wrapper's canonical, independent of the wrapper.
 *
 * The two states are unrelated, and `qfai init` repairs a wrapper while leaving
 * the canonical exactly as it found it — so a branch that reported the wrapper
 * and stopped had the operator re-run init, clear the finding, and end with a
 * healthy link loading the wrong instructions, or with a create-only copy that
 * cannot succeed against a type collision. Every wrapper branch asks this, and
 * asks it the same way: three branches diverging on which half they checked is
 * what produced that shape three times.
 *
 * A `not-a-directory` names the component at fault rather than the unreachable
 * leaf below it, and carries the short-circuit with it: the caller cannot
 * recover that from the detail string.
 */
/**
 * Whether the document a later validator opens would stop it.
 *
 * They read `<canonical>/SKILL.md` (or the agent file) by pathname, so a cycle
 * gives them `ELOOP`, a directory `EISDIR`, and an ACL an `EACCES` — each
 * ending the run and taking the repairable finding with it. Absence they
 * handle, and so does a link that resolves to something readable.
 */
async function documentBlocksWalk(wrapper: Wrapper): Promise<boolean> {
  const doc =
    wrapper.kind === "skill" ? path.join(wrapper.canonical, "SKILL.md") : wrapper.canonical;
  const state = await statOrNull(doc);
  if (state === null) return false;
  if (typeof state === "string") return true;
  if (!state.isFile()) return true;
  return !(await isReadable(doc));
}

async function canonicalDamage(
  root: string,
  realRoot: string | null,
  wrapper: Wrapper,
): Promise<Broken | null> {
  // The state first, so the short-circuit is decided once for every answer
  // below it. Returning on the link problem before this left a wrapper that is
  // *also* flattened reporting the ancestor without marking it unwalkable, and
  // the profile then walked into the same `ENOTDIR` that finding was about.
  const state = await canonicalState(wrapper.canonical);
  const culprit =
    state.kind === "not-a-directory"
      ? await unusableAncestor(root, wrapper.canonicalRelative)
      : null;
  const relative = culprit?.relative ?? wrapper.canonicalRelative;
  // **Per tree, because the readers differ.** The skills tree is `readdir`ed —
  // a regular file where the directory belongs raises `ENOTDIR` there and takes
  // the run with it. The agents tree is not: `validateAgentDefinition` opens
  // each document by path and its `access` probe answers "absent" for the same
  // shape, so stopping on it hid every unrelated finding for damage nothing
  // walks into. What does stop that reader is the **document** being the wrong
  // type or unreadable, which is decided below.
  const ancestorBlocks = wrapper.kind !== "agent" || culprit === null;
  const unwalkable = blocksWalk(state) && ancestorBlocks ? relative : undefined;

  // A leaf that is itself damaged is described by its state, not by the generic
  // "is a symlink" the link probe would give: a dangling canonical and a
  // resolving redirect are different repairs, and the specific wording is the
  // one an operator can act on.
  if (state.kind !== "absent" && state.kind !== "present") {
    return {
      relative,
      detail:
        culprit === null
          ? describeDamage(state, "canonical document")
          : `the canonical directory ${culprit.detail}`,
      unwalkable,
    };
  }

  // An absent leaf asks about its ancestors first. A **broken** one — dangling,
  // cycling — is both the more specific answer and the one that dedupes: the
  // link probe would report "an ancestor is a symlink" once per skill and per
  // agent under it, naming a repair for a path that is not the problem.
  if (state.kind === "absent") {
    const damaged = await brokenAncestor(root, wrapper.canonicalRelative);
    if (damaged !== null) {
      return {
        relative: damaged.relative,
        detail: describeDamage(damaged.state, "the canonical directory"),
        unwalkable: blocksWalk(damaged.state) ? damaged.relative : undefined,
      };
    }
  }

  const link = await canonicalLinkProblem(root, realRoot, wrapper);
  if (link !== null) {
    // The short-circuit above came from the **parent** state, which is healthy
    // when only the nested `SKILL.md` is a link. A cycling one gives
    // `validateSkillDocReferences` an `ELOOP` on the same pathname, so ask the
    // document itself rather than inheriting an answer about its directory.
    return {
      relative: wrapper.canonicalRelative,
      detail: link,
      unwalkable: (await documentBlocksWalk(wrapper)) ? wrapper.canonicalRelative : unwalkable,
    };
  }
  if (state.kind === "absent") return null;
  {
    const kind = await canonicalKindProblem(wrapper, state.stats);
    if (kind !== null) {
      return {
        relative: wrapper.canonicalRelative,
        detail: kind,
        // A wrong **type** on the document a later validator reads is not
        // survivable: `readFile` gives `EISDIR` on a directory, `ELOOP` on a
        // cycle, and blocks on a FIFO. Absence is: every validator handles a
        // missing file, so "has no SKILL.md" is not a reason to stop.
        unwalkable: kind.includes("has no SKILL.md") ? unwalkable : wrapper.canonicalRelative,
      };
    }
    // Readable, the same question the healthy-wrapper branch asks. A canonical
    // an ACL or a mode keeps shut is not repaired by `qfai init` — the copy is
    // create-only — so reporting the wrapper alone had the operator re-run it
    // and learn nothing about what is still broken. And an unreadable document
    // stops the profile: `validateSkillDocReferences` re-throws its own
    // `readFile` error, which would take this finding down with it.
    const doc =
      wrapper.kind === "skill" ? path.join(wrapper.canonical, "SKILL.md") : wrapper.canonical;
    if (!(await isReadable(doc))) {
      return {
        relative: wrapper.canonicalRelative,
        detail: "resolves, but the document is unreadable",
        unwalkable: wrapper.canonicalRelative,
      };
    }
    return null;
  }
  return null;
}

/** The message for a path that is damaged rather than absent or usable. */
function describeDamage(state: PathState, subject: string): string {
  switch (state.kind) {
    case "cycle":
      return `${subject} is a symlink cycle`;
    case "dangling":
      return `${subject} is a dangling symlink`;
    case "not-a-directory":
      return `a path component above ${subject} is not a directory`;
    default:
      return `${subject} is unusable`;
  }
}

/**
 * Whether any probe found proof init ran, with a read error only fatal when
 * none of them did.
 *
 * Every probe still runs — one `Promise.all` rejection used to end `qfai
 * validate` for the whole project, so an unreadable regular file at one wrapper
 * path, or an ACL on a create-only README that is not even part of the
 * integration surface, stopped every profile on a project that could be *proved*
 * initialised by the wrapper next to it. Evidence answers the question; an error
 * only means this particular probe could not.
 */
async function anyEvidence(probes: readonly (() => Promise<boolean>)[]): Promise<boolean> {
  const settled = await Promise.allSettled(probes.map((probe) => probe()));
  if (settled.some((entry) => entry.status === "fulfilled" && entry.value)) return true;
  const failure = settled.find((entry) => entry.status === "rejected");
  if (failure !== undefined) throw failure.reason;
  return false;
}

/**
 * A small file's contents, read from the handle its own size was measured on.
 *
 * `lstat` then `readFile` are two operations against a **name**, so a ceiling
 * checked on one entry did not bind the entry that was read: another process
 * can leave a huge file or a FIFO at the path in between, and the read then
 * exhausts memory or never returns. One `open`, `fstat` on that handle, and a
 * bounded read from it — all three about the same inode.
 *
 * `O_NONBLOCK` where the platform has it: opening a FIFO for reading blocks
 * until a writer appears, and the point of the size check is not to be at the
 * mercy of what is at the path.
 */
async function readPinnedFile(filePath: string, maxBytes: number): Promise<string | null> {
  let handle: FileHandle | undefined;
  try {
    handle = await open(filePath, OPEN_READ_FLAGS);
    const stats = await handle.stat();
    if (!stats.isFile() || stats.size > maxBytes) return null;
    return await readFully(handle, maxBytes);
  } catch (error) {
    if (isMissing(error)) return null;
    const code = (error as NodeJS.ErrnoException | null)?.code;
    // A FIFO with no writer answers this instead of blocking, which is the
    // trade this flag buys; it is not a readable regular file either way.
    if (code === "ENXIO" || code === "EISDIR" || code === "ENOTDIR" || code === "ELOOP")
      return null;
    throw error;
  } finally {
    await handle?.close();
  }
}

/**
 * The whole file, however many reads that takes.
 *
 * `read` may return fewer bytes than asked for — a network filesystem is the
 * usual reason — and a single call left the tail of the buffer as NUL. A
 * flattened wrapper or the one surviving marker then failed its signature
 * comparison, and an initialised project read as never initialised, so its
 * broken surface went unchecked.
 */
/**
 * The whole file, or `null` when it runs past `maxBytes`.
 *
 * Read to `maxBytes + 1`, not to the size just measured. Another process
 * holding this inode can append after the `fstat`, and stopping at the old
 * size returned a **prefix** — which, matching a canonical-shaped target, had a
 * file with its own content after it reported as a qfai wrapper, failing every
 * profile and telling the operator to delete it. One byte past the ceiling is
 * what separates "this is the whole file" from "this is as much as I asked
 * for".
 */
async function readFully(handle: FileHandle, maxBytes: number): Promise<string | null> {
  const buffer = Buffer.alloc(maxBytes + 1);
  let filled = 0;
  while (filled < buffer.length) {
    const { bytesRead } = await handle.read(buffer, filled, buffer.length - filled, filled);
    if (bytesRead === 0) break;
    filled += bytesRead;
  }
  if (filled > maxBytes) return null;
  return buffer.subarray(0, filled).toString("utf-8");
}

/** Whether a README at `filePath` is one `qfai init` wrote. */
async function hasInitSignature(filePath: string): Promise<boolean> {
  // A regular file, checked before the read — and checked with `lstat`, not
  // `stat`. These paths are create-only, so whatever the project already had at
  // one of them is still there: a directory makes `readFile` throw `EISDIR`,
  // which rejected the whole `Promise.all` and lost the `QFAI-LINK-001` the
  // other markers would have produced, and a FIFO blocks the read outright.
  // `stat` followed a link, so a project's own `.agents/README.md` pointing at
  // some other file that happens to mention `.qfai/assistant/` read as a marker
  // init wrote — and a checkout that never ran init was told all six surfaces
  // were missing. Init writes these as plain files; nothing else is one.
  // Not a symlink, which only `lstat` can answer — `open` follows one, so the
  // handle below would report the target. A project's own README pointing at a
  // file that happens to mention the canonical tree is not init's marker.
  const entry = await lstatOrNull(filePath);
  if (entry === null || entry.isSymbolicLink()) {
    return false;
  }
  // Bounded, and pinned to the entry the bound was measured on. Init writes a
  // short boilerplate README; a project's own file at that path can be any
  // size, and reading it whole to look for three substrings slowed every
  // profile in proportion to somebody else's document — or ended it on a large
  // enough one.
  const body = await readPinnedFile(filePath, MARKER_MAX_BYTES);
  return (
    body !== null &&
    INIT_MARKER_TITLE.test(body) &&
    body.includes(INIT_MARKER_SECTION) &&
    body.includes(INIT_MARKER_SIGNATURE)
  );
}

/**
 * `realpath`, or `null` when it cannot be taken.
 *
 * `null` is not a finding here: absence and a cycle are already reported by the
 * probes above, and reporting them again would name one path with two remedies.
 */
async function realpathOrNull(filePath: string): Promise<string | null> {
  try {
    return await realpath(filePath);
  } catch (error) {
    if (isMissing(error)) return null;
    if ((error as NodeJS.ErrnoException | null)?.code === "ELOOP") return null;
    throw error;
  }
}

/** `stat`, or `null` when the path is absent. Any other error propagates. */
async function statOrNull(filePath: string): Promise<Stats | null | "cycle" | "not-a-directory"> {
  try {
    return await stat(filePath);
  } catch (error) {
    if (isMissing(error)) return null;
    // `.qfai/assistant/skills` replaced by a regular file: every path under it
    // raises this, and the wrapper naming it is as broken as one whose target
    // is missing. Propagated, it ended the run instead of reporting.
    if ((error as NodeJS.ErrnoException | null)?.code === "ENOTDIR") return "not-a-directory";
    // The same rule the wrapper target follows: a symlink cycle is structural
    // damage to the thing being inspected, not a filesystem fault to propagate.
    // Re-thrown here it exited `qfai validate` with a stack trace for a
    // `SKILL.md` that points at itself.
    if ((error as NodeJS.ErrnoException | null)?.code === "ELOOP") return "cycle";
    throw error;
  }
}

/** What a target actually is, for a message that names it. */
function describeKind(stats: Stats): string {
  if (stats.isDirectory()) return "directory";
  if (stats.isFile()) return "file";
  if (stats.isFIFO()) return "FIFO";
  if (stats.isSocket()) return "socket";
  if (stats.isBlockDevice() || stats.isCharacterDevice()) return "device";
  return "special file";
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch (error) {
    if (isMissing(error)) return false;
    throw error;
  }
}

/**
 * The agents `qfai init` would create a wrapper for. Same roster, same reasons
 * as {@link canonicalSkillIds}.
 *
 * Treating every non-README `*.md` in `.claude/agents` as qfai-owned turned a
 * project's own agent definition into a `QFAI-LINK-001` error in every profile
 * — the opposite of the rule's stated scope.
 */
async function canonicalAgentNames(): Promise<string[]> {
  const shipped = await agentNamesIn(path.join(getInitAssetsDir(), ".qfai", "assistant", "agents"));
  return Array.from(shipped).sort();
}

/** Agent document basenames under `agentsDir`, `README` excluded. */
async function agentNamesIn(agentsDir: string): Promise<Set<string>> {
  const entries = await readDirOrNull(agentsDir);
  return new Set(
    (entries ?? [])
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md") && entry.name !== "README.md")
      .map((entry) => entry.name.slice(0, -".md".length)),
  );
}

/** The wrapper path, the link target `qfai init` writes, and what it wraps. */
type Wrapper = {
  relative: string;
  absolute: string;
  target: string;
  /** A skill wrapper points at a directory that must carry a `SKILL.md`. */
  kind: "skill" | "agent";
  /** The integration directory this wrapper belongs to, e.g. `.claude/skills`. */
  dir: string;
  /** Absolute path of the canonical document, for the "was it ever created" test. */
  canonical: string;
  /** The same path, repo-relative and POSIX-separated, for a message. */
  canonicalRelative: string;
};

function wrapperSet(root: string, skills: string[], agents: string[]): Wrapper[] {
  const wrappers: Wrapper[] = [];

  const push = (dir: string, name: string, kind: Wrapper["kind"], canonicalRel: string[]): void => {
    const dirAbsolute = path.join(root, ...dir.split("/"));
    const canonical = path.join(root, ...canonicalRel);
    wrappers.push({
      relative: `${dir}/${name}`,
      absolute: path.join(dirAbsolute, name),
      target: path.relative(dirAbsolute, canonical),
      kind,
      dir,
      canonical,
      canonicalRelative: canonicalRel.join("/"),
    });
  };

  for (const dir of SKILL_WRAPPER_DIRS) {
    for (const id of skills) {
      push(dir, id, "skill", [".qfai", "assistant", "skills", id]);
    }
  }
  for (const { dir, suffix } of AGENT_WRAPPER_DIRS) {
    for (const name of agents) {
      push(dir, `${name}${suffix}`, "agent", [".qfai", "assistant", "agents", `${name}.md`]);
    }
  }
  return wrappers;
}

/**
 * Reports a qfai wrapper link that did not survive checkout, or that resolves
 * to something other than the canonical document it names.
 *
 * `qfai init` writes these as real symlinks and pins `core.symlinks true` into
 * **repo-local** git config. `.git/config` is not cloned, so on any machine
 * whose system or global config says `core.symlinks = false` — the Windows
 * default — a fresh clone materialises every one of them as a small text file
 * whose content is the link target. The repository is still correct
 * (`git ls-files -s` reports mode `120000`); only the working tree is not.
 *
 * Nothing detected that. `qfai validate` never read these directories, and
 * `qfai doctor`'s `skills.integrity` / `agents.frontmatter` both read the
 * canonical `.qfai/assistant/**` tree, which is unaffected. The assistant then
 * loads no skill and routes no agent, and every gate those files define stops
 * existing while work continues at full speed.
 *
 * Scope is the wrapper set `qfai init` would create, derived from the project's
 * own canonical tree. Entries a project added itself are not qfai's to judge,
 * and a wrapper that was never created is not a finding: an older project
 * legitimately predates a newly shipped skill, and `qfai init` creates it. What
 * is reported is a wrapper that exists and cannot do its job.
 */
export type IntegrationSurfaceReport = {
  issues: Issue[];
  /**
   * Canonical paths a later `readdir` cannot survive. Non-empty means the
   * caller must stop after reporting these findings rather than walk into the
   * exception. Read from the full damage list, never from the issue message.
   */
  unwalkable: string[];
};

/** The findings alone, for callers that do not decide whether to continue. */
export async function validateIntegrationSurface(root: string): Promise<Issue[]> {
  return (await inspectIntegrationSurface(root)).issues;
}

export async function inspectIntegrationSurface(root: string): Promise<IntegrationSurfaceReport> {
  const [skills, agents] = await Promise.all([canonicalSkillIds(), canonicalAgentNames()]);
  if (skills.length === 0 && agents.length === 0) {
    // No canonical tree — nothing to wrap, so nothing to be broken.
    return { issues: [], unwalkable: [] };
  }

  const wrappers = wrapperSet(root, skills, agents);
  // An integration directory that is itself a symlink cycle. `lstat` on every
  // wrapper under it raises `ELOOP` — the final component is not followed, but
  // the path to it is — and propagating that ended `qfai validate` with a stack
  // trace instead of a `QFAI-LINK-001`. It is the same structural damage the
  // wrapper target and the nested `SKILL.md` already report, one level up, so
  // it is reported the same way: once for the directory, not once per wrapper
  // that cannot be reached through it.
  // The project root as the filesystem sees it, so a symlinked component
  // anywhere above an integration directory is visible as a difference rather
  // than as the root's own spelling.
  const realRoot = await realpathOrNull(root);
  const damagedDirs = new Map<string, string>();
  await Promise.all(
    INTEGRATION_SURFACE_DIRS.map(async (dir) => {
      const absolute = path.join(root, ...dir.split("/"));
      // `lstat` first: the wrappers under this directory carry **relative**
      // targets, so they resolve against wherever it physically is. A symlink
      // here points every one of them at an external tree — and when it is
      // empty there are no wrappers to reach the realpath check, so it read as
      // a healthy directory while `qfai init` filled the external location.
      // Ancestors first, because a dangling one makes the directory itself
      // answer "absent" — and then the remedy is "re-run `qfai init`", which
      // cannot create a directory through a broken link. The surface is not
      // missing; the path to it is.
      const ancestor = await unusableAncestor(root, dir);
      // Before anything about the directory itself: when `.claude` is a cycle
      // or points at a non-directory, the probe on `.claude/skills` answers
      // `cycle` / `not-a-directory` too, and naming the child sent the operator
      // at a path they cannot even reach — `ELOOP` / `ENOTDIR` on the way in.
      // The outermost damaged component is the one to repair.
      if (ancestor !== null) {
        damagedDirs.set(dir, `an ancestor ${ancestor.detail}: ${toPosix(ancestor.relative)}`);
        return;
      }
      const state = await canonicalState(absolute);
      if (state.kind === "absent") return;
      // A cycle or a dangling link is named for what it is before the plain
      // "it is a symlink" rule below, which would otherwise bury the more
      // specific damage under the more general one.
      if (state.kind !== "present") {
        damagedDirs.set(dir, describeDamage(state, "the integration directory"));
        return;
      }
      const own = await lstatOrNull(absolute);
      if (own?.isSymbolicLink() === true) {
        damagedDirs.set(dir, "the integration directory is a symlink");
        return;
      }
      // And an **ancestor** of it. `.claude` pointing at an external tree
      // leaves `.claude/skills` a plain directory, so the check above says
      // nothing while every relative wrapper under it still resolves against
      // the external location — reported as dangling or outside-canonical,
      // with a remedy about moving the integration directory aside that does
      // not name the path at fault.
      //
      // Each component is `lstat`ed rather than comparing the resolved path
      // with the spelling this code builds. On a case-insensitive filesystem a
      // directory created as `.Claude` resolves to that spelling while the
      // lexical path says `.claude`, and the comparison reported a sound
      // surface as a symlink — failing every profile with a remedy that could
      // not apply. Asking each component what it *is* has no such question.
      // A regular file where the directory belongs. `lstat` on every wrapper
      // under it raises `ENOTDIR`, which is the same failure the cycle was.
      if (!state.stats.isDirectory()) {
        damagedDirs.set(dir, `the integration directory is a ${describeKind(state.stats)}`);
      }
    }),
  );
  // A wrapper that exists but cannot be stat'd is a filesystem failure and must
  // not read as one that was never created.
  const links = await Promise.all(
    wrappers.map(async (wrapper) => {
      if (damagedDirs.has(wrapper.dir)) return null;
      return lstat(wrapper.absolute).catch((error: unknown) => {
        if (isMissing(error)) return null;
        throw error;
      });
    }),
  );
  // Has `qfai init` ever run here? Judged across **all** the integration
  // surfaces, not per directory. Per directory it could not see a directory
  // deleted whole: every one of its entries then read as "not created yet" and
  // every profile passed while the assistant could load nothing from it. One
  // surviving wrapper anywhere is proof init ran, and the canonical document
  // check below is what keeps a newly shipped skill this project has not taken
  // from being reported.
  // Not "some wrapper survives": delete every one of them and that test says
  // the project was never initialised, so nothing is checked at all — the state
  // where the assistant can load nothing then passes every profile most
  // confidently. `qfai init` writes these READMEs beside the wrappers and never
  // removes them, so they outlive the links they document.
  //
  // And not "some entry exists at a wrapper path" either. These directories are
  // conventional, and a shipped name can collide with one a project chose for
  // itself — a `.agents/skills/web-research` of its own made a project that
  // never ran `qfai init` read as initialised, and then every other integration
  // directory was reported missing and every profile failed. Only a link init
  // itself would have written counts: a symlink whose target is the one this
  // wrapper names.
  const initialised = await anyEvidence([
    ...wrappers.map((wrapper, index) => () => isInitEvidence(wrapper, links[index])),
    ...INIT_MARKERS.map((marker) => () => hasInitSignature(path.join(root, ...marker))),
  ]);
  // Surfaces `qfai init` creates that are not there at all. Reported once each,
  // below, instead of once per wrapper they would have held: a directory
  // deleted whole is one act, and one ref per shipped skill buries that.
  const missingDirs = new Set<string>();
  if (initialised) {
    for (const dir of INTEGRATION_SURFACE_DIRS) {
      // A damaged one is reported as damage below, not as absence: `readdir`
      // raises `ELOOP` / `ENOTDIR` on it, which this probe deliberately
      // propagates.
      if (damagedDirs.has(dir)) continue;
      if ((await readDirOrNull(path.join(root, ...dir.split("/")))) === null) {
        missingDirs.add(dir);
      }
    }
  }

  const broken: Broken[] = [];
  const damagedCanonicals = new Set<string>();
  if (initialised) {
    for (const dir of INTEGRATION_SURFACE_DIRS) {
      const detail = damagedDirs.get(dir);
      if (detail !== undefined) broken.push({ relative: dir, detail });
    }
  }

  // Nothing to say about a project that never ran init. Every wrapper path is
  // then a path it owns, and reporting one — a directory of its own under a
  // name a shipped skill happens to share — as a broken qfai link is a finding
  // it cannot act on and did not ask for.
  for (const [index, wrapper] of initialised ? wrappers.entries() : []) {
    const link = links[index] ?? null;
    if (link === null) {
      // Absent is "not created yet" **only before init has run**. Once it has,
      // and the project has the canonical document, `qfai init` created this
      // wrapper too, so its absence is a deletion — and nothing else reported
      // it, because `validateSkillsIntegrity` reads the canonical tree
      // (unchanged) and runs under `full` alone.
      // The canonical is checked whether or not its wrapper directory is
      // there. Gating the whole branch on `!missingDirs.has` meant deleting
      // all four skill directories skipped every canonical check with them —
      // and `qfai init` then recreates the wrappers around a canonical it
      // leaves as it found it, pointing them at whatever it now is. Only the
      // "this wrapper was deleted" finding depends on the directory existing.
      if (initialised) {
        // `lstat`, not `access`: `access` follows the link, so a canonical
        // replaced by a dangling symlink answered "absent" and the skill left
        // the check entirely — no wrapper reported, and nothing else looks at
        // the canonical tree outside `full`. A cycle was worse: `ELOOP` came
        // out of `access` and ended `qfai validate` with a stack trace.
        // The same helper the wrapper branches use. Four rounds of findings
        // have been "this check exists in one branch and not the other", so
        // there is one place that asks the whole question — link, ancestor,
        // kind, readability — and one place that decides the short-circuit.
        const damage = await canonicalDamage(root, realRoot, wrapper);
        if (damage === null) {
          // Nothing wrong with the canonical, so the wrapper is simply gone.
          // Absent is "not created yet" only before init has run, and it has.
          const stillAbsent = (await canonicalState(wrapper.canonical)).kind === "absent";
          if (!stillAbsent && !missingDirs.has(wrapper.dir)) {
            broken.push({
              relative: wrapper.relative,
              detail: `missing — ${toPosix(wrapper.dir)} exists and so does the document it wraps`,
            });
          }
        } else if (!damagedCanonicals.has(damage.relative)) {
          // Once per canonical, not once per wrapper: four wrappers name the
          // same document, and one damaged document is one thing to repair.
          damagedCanonicals.add(damage.relative);
          broken.push(damage);
        }
      }
      continue;
    }

    if (!link.isSymbolicLink()) {
      // The kind it actually is. A FIFO, socket or device is neither a
      // directory nor a regular file, and calling one "regular file" sent the
      // operator to a remedy about inspecting content before moving it aside —
      // which does not apply, and on a FIFO the inspection blocks.
      broken.push({
        relative: wrapper.relative,
        detail: link.isFile()
          ? `regular file (${String(link.size)} bytes), not a symlink`
          : `${describeKind(link)}, not a symlink`,
      });
      // And the canonical too, before moving on. `qfai init` repairs a
      // flattened wrapper on its own, and it leaves the canonical exactly as it
      // found it — so reporting only the wrapper had the operator re-run init,
      // clear the finding, and end with a healthy symlink loading the wrong
      // instructions. The canonical's state does not depend on the wrapper's.
      //
      // **Both checks, the pair the absent-wrapper branch uses.** A link is only
      // one of the two ways a canonical goes wrong: a skill directory replaced
      // by a regular file, or an agent document by a directory, is a type
      // collision that `canonicalLinkProblem` says nothing about — and the
      // create-only copy `qfai init` performs fails on it, so the operator was
      // sent to re-run a command that cannot succeed, with the path at fault
      // never named.
      const alsoWrong = await canonicalDamage(root, realRoot, wrapper);
      if (alsoWrong !== null && !damagedCanonicals.has(alsoWrong.relative)) {
        damagedCanonicals.add(alsoWrong.relative);
        broken.push(alsoWrong);
      }
      continue;
    }

    // Same rule as the probes around it: only an absent link is a link
    // problem. A transient `EIO` or an `EACCES` reported a healthy wrapper as
    // `points at ?`, and the remedy the finding prints — re-run `qfai init` —
    // calls the same `readlink` and fails the same way.
    const actual = await readlink(wrapper.absolute).catch((error: unknown) => {
      if (isMissing(error)) return null;
      throw error;
    });
    if (actual === null || path.normalize(actual) !== path.normalize(wrapper.target)) {
      // A link that resolves to the wrong canonical document is worse than a
      // dangling one: the assistant loads real instructions, just not these.
      broken.push({
        relative: wrapper.relative,
        detail: `points at ${toPosix(actual ?? "?")}, expected ${toPosix(wrapper.target)}`,
      });
      // And the canonical, for the same reason the flattened branch does: init
      // re-points the wrapper and leaves the canonical as it found it, so the
      // operator cleared this finding and needed a second run to learn the
      // rest.
      const alsoWrong = await canonicalDamage(root, realRoot, wrapper);
      if (alsoWrong !== null && !damagedCanonicals.has(alsoWrong.relative)) {
        damagedCanonicals.add(alsoWrong.relative);
        broken.push(alsoWrong);
      }
      continue;
    }

    // The link target is right, so what remains is whether it resolves.
    // `catch(() => false)` reported every failure as dangling, including
    // `EACCES` and a transient `EIO` — and the fix the finding prints is
    // "re-run `qfai init`", which leaves the wrapper `skipped` because the
    // target string is already correct. That is a `QFAI-LINK-001` an operator
    // cannot clear by following it. Only an absent target is dangling.
    let target: Stats;
    try {
      target = await stat(wrapper.absolute);
    } catch (error) {
      // `ELOOP` is not a filesystem fault to propagate: it says the target is a
      // symlink cycle, which is structural damage to the very thing this rule
      // inspects. Re-thrown, `qfai validate` exited with a stack trace instead
      // of a `QFAI-LINK-001` naming the path to repair.
      // `ENOTDIR` joins it: `.qfai/assistant/skills` replaced by a regular file
      // raises it for every wrapper naming a document under that path, and the
      // wrapper is as broken as one whose target is missing.
      const code = (error as NodeJS.ErrnoException | null)?.code;
      if (!isMissing(error) && code !== "ELOOP" && code !== "ENOTDIR") throw error;
      // The link failing to resolve does not mean the canonical path is
      // otherwise sound. Point `.qfai/assistant/skills` at an existing empty
      // directory and every wrapper under it is `ENOENT` — plain "dangling",
      // reported and `continue`d before anything looked at the ancestor. The
      // remedy printed for it is "re-run `qfai init`", which recreates the
      // canonical **inside the redirect** and leaves the wrapper's correct
      // target string untouched: the finding clears while the redirect stays.
      // So say the ancestor first, wherever it is found.
      const linkProblem = await canonicalLinkProblem(root, realRoot, wrapper);
      broken.push({
        relative: wrapper.relative,
        detail:
          linkProblem !== null
            ? `${linkProblem} -> ${toPosix(wrapper.target)}`
            : code === "ELOOP"
              ? `resolves through a symlink cycle -> ${toPosix(wrapper.target)}`
              : code === "ENOTDIR"
                ? `a path component of the canonical is not a directory -> ${toPosix(wrapper.target)}`
                : `dangling -> ${toPosix(wrapper.target)}`,
        // `ENOTDIR` alone, and named at the component that is not a directory
        // rather than at the leaf. That errno says a component above the leaf
        // is a regular file, which is the one shape a later `readdir` cannot
        // survive. `ELOOP` is a symlink: the walks over this tree list it with
        // `withFileTypes` and never descend into it, and one at the walk root
        // answers "absent" through their `access` probe. `ENOENT` is absence,
        // which they already handle.
        unwalkable:
          code === "ENOTDIR"
            ? ((await unusableAncestor(root, wrapper.canonicalRelative))?.relative ??
              wrapper.canonicalRelative)
            : undefined,
      });
      continue;
    }

    // What it resolves *to*. A canonical agent document replaced by a directory
    // — or a skill directory by a file — leaves the link string correct, so
    // `lstat`, `readlink` and `stat` all succeed and nothing looked further.
    // The agent surface has no other check outside `prototyping` / `full`, so
    // `discussion` / `sdd` / `atdd` / `tdd` passed an agent tree the assistant
    // cannot load a single markdown file from.
    // A skill wrapper names a directory; an agent wrapper names a **regular
    // file**, not merely something that is not a directory. A FIFO, a socket or
    // a device passes `!isDirectory()` and can pass `access(R_OK)` as well — and
    // then the assistant either fails to read it or, on a FIFO, blocks.
    // Where it *lands*, not what it spells. The target is relative, so it
    // resolves against the wrapper directory's physical location — and that
    // directory can itself be a symlink. Point `.claude/skills` at an outside
    // tree holding a `.qfai/assistant/skills/<name>/SKILL.md` at the same
    // relative offset and every check above passes, while the assistant loads
    // instructions that are not this project's. Comparing the resolved paths
    // is what makes "this wrapper names the project canonical" true, rather
    // than "some canonical-shaped path exists over there".
    const [here, canonical] = await Promise.all([
      realpathOrNull(wrapper.absolute),
      realpathOrNull(wrapper.canonical),
    ]);
    if (here !== null && canonical !== null && here !== canonical) {
      broken.push({
        relative: wrapper.relative,
        detail: `resolves to ${toPosix(here)}, outside the project canonical ${toPosix(canonical)}`,
      });
      continue;
    }
    // And the canonical itself has to be **in** the project. Replace the
    // canonical document with a symlink to a readable file of the right kind
    // outside the repository and both sides of the comparison above follow it
    // to the same external path, so they agree — while the assistant loads
    // instructions this project does not own. `skills.integrity` would say so,
    // but it runs under `full` alone, so `discussion` / `sdd` / `atdd` / `tdd`
    // reported a healthy surface. Reported against the canonical, once, because
    // one document is one thing to repair.
    // `init` writes the canonical as a real directory or a real file, so a
    // symlink there is damage whatever it points at. Outside the repository is
    // the obvious case; **inside** it is the one the resolved-path comparison
    // cannot see at all — point a canonical at another shipped skill and both
    // sides converge on that skill, `isInside` is satisfied, and every profile
    // but `full` reports a healthy surface while the assistant loads the wrong
    // instructions.
    // Its ancestors and its `SKILL.md` as well, by the one helper the absent
    // branch uses: the same check living in two places is what kept letting a
    // link through on whichever side had not been updated yet.
    const linkProblem = await canonicalLinkProblem(root, realRoot, wrapper);
    if (linkProblem !== null && !damagedCanonicals.has(wrapper.canonicalRelative)) {
      damagedCanonicals.add(wrapper.canonicalRelative);
      broken.push({ relative: wrapper.canonicalRelative, detail: linkProblem });
      continue;
    }
    if (
      realRoot !== null &&
      canonical !== null &&
      !isInside(realRoot, canonical) &&
      !damagedCanonicals.has(wrapper.canonicalRelative)
    ) {
      damagedCanonicals.add(wrapper.canonicalRelative);
      broken.push({
        relative: wrapper.canonicalRelative,
        detail: `canonical document resolves outside the project: ${toPosix(canonical)}`,
      });
      continue;
    }

    const wantsDirectory = wrapper.kind === "skill";
    const kindMatches = wantsDirectory ? target.isDirectory() : target.isFile();
    if (!kindMatches) {
      broken.push({
        relative: wrapper.relative,
        detail: `resolves to a ${describeKind(target)}, but ${
          wantsDirectory ? "a skill wrapper names a directory" : "an agent wrapper names a file"
        }`,
      });
      continue;
    }

    // A skill is loaded from its `SKILL.md`. The link can resolve to a
    // directory that still holds `references/` and `templates/` while that one
    // file is gone, and then nothing reported it: this rule saw a resolving
    // link, and `skills.integrity` — which would — runs only under `full`.
    if (wrapper.kind === "skill") {
      // `isFile`, not "exists": `access` succeeds on a directory named
      // `SKILL.md` too, and the assistant can load that no better than a
      // missing one.
      const skillDoc = path.join(wrapper.absolute, "SKILL.md");
      const doc = await statOrNull(skillDoc);
      if (doc === null || typeof doc === "string" || !doc.isFile()) {
        broken.push({
          relative: wrapper.relative,
          detail:
            doc === null
              ? "resolves, but the directory has no SKILL.md"
              : doc === "cycle"
                ? "resolves, but its SKILL.md is a symlink cycle"
                : doc === "not-a-directory"
                  ? "resolves, but a path component above its SKILL.md is not a directory"
                  : `resolves, but its SKILL.md is a ${describeKind(doc)}`,
          // `validateSkillDocReferences` and `validateAutopilotPolicy` read this
          // pathname directly, so a cycle gives them `ELOOP`, a directory
          // `EISDIR`, and a FIFO blocks — each taking this finding down with the
          // run. Absence they handle, so it is not a reason to stop.
          unwalkable: doc === null ? undefined : wrapper.canonicalRelative,
        });
        continue;
      }
      // A real file, like the directory holding it is a real directory. Init
      // writes it that way, so a symlink is damage wherever it points — and
      // pointing it at another skill's document inside the project is the case
      // no resolved-path comparison can see, since both sides land there.
      const docOwn = await lstatOrNull(skillDoc);
      if (docOwn?.isSymbolicLink() === true) {
        broken.push({
          relative: wrapper.relative,
          detail: "resolves, but its SKILL.md is a symlink",
        });
        continue;
      }
      // Inside the project, like the directory holding it. A `SKILL.md`
      // replaced by a symlink to a readable file outside the repository passes
      // `stat` and `access` — and `skills.integrity`, which would notice, runs
      // under `full` alone.
      if (realRoot !== null) {
        const docReal = await realpathOrNull(skillDoc);
        if (docReal !== null && !isInside(realRoot, docReal)) {
          broken.push({
            relative: wrapper.relative,
            detail: `resolves, but its SKILL.md resolves outside the project: ${toPosix(docReal)}`,
          });
          continue;
        }
      }
      if (!(await isReadable(skillDoc))) {
        broken.push({
          relative: wrapper.relative,
          detail: "resolves, but its SKILL.md is unreadable",
          // And stop here. `validateSkillDocReferences` re-throws its own
          // `readFile` error on the same document, which would reject the whole
          // run and take this finding — the only one that names the path — with
          // it.
          unwalkable: wrapper.canonicalRelative,
        });
      }
    } else if (!(await isReadable(wrapper.absolute))) {
      // An agent wrapper names the document itself. `stat` reads metadata, which
      // an ACL or a mode can allow while the body stays closed — and the
      // assistant loads the body.
      broken.push({
        relative: wrapper.relative,
        detail: "resolves, but the document is unreadable",
        // `validateAgentDefinition` confirms the file exists and then reads the
        // same pathname, so this ends the run under every profile that routes
        // agents — taking the repairable finding with it.
        unwalkable: wrapper.canonicalRelative,
      });
    }
  }

  for (const dir of INTEGRATION_SURFACE_DIRS) {
    if (missingDirs.has(dir)) {
      broken.push({
        relative: dir,
        detail: "integration surface missing — `qfai init` created it and it is gone",
      });
    }
  }

  // Only once init has run: before that every entry in these directories is the
  // project's own, and calling one of them retired is a finding it cannot act
  // on and did not ask for.
  if (initialised) {
    broken.push(...(await retiredWrappers(root, wrappers, damagedDirs)));
  }

  if (broken.length === 0) {
    return { issues: [], unwalkable: [] };
  }

  const sample = broken.slice(0, 12).map((entry) => `${entry.relative} (${entry.detail})`);
  const overflow =
    broken.length > sample.length ? ` (他 ${String(broken.length - sample.length)} 件)` : "";

  // The sample is what the operator reads; `unwalkable` is what the caller
  // acts on, and it is computed over every entry — including the ones the
  // sample drops.
  const unwalkable = unwalkablePaths(broken);

  const issues = [
    issue(
      "QFAI-LINK-001",
      `assistant 統合ディレクトリの symlink が壊れています（${String(broken.length)} 件）。skill / agent はこの経路でしか読み込まれないため、これらは現在まったく適用されていません: ${sample.join(", ")}${overflow}`,
      "error",
      broken[0]?.relative,
      "integrationSurface.links",
      broken.map((entry) => entry.relative),
      "change",
      [
        "`qfai init` を再実行すると、qfai が所有するこれらのパスは symlink として貼り直されます（`--force` は不要）。ただし内容が link target と一致しない通常ファイルは温存されるので、その場合は中身を確認してから退避してください。",
        "**integration directory 自体が壊れている場合（`the integration directory is …`）も init では直りません。** 外部 symlink 配下の wrapper は target 文字列が正しいので `ensureSymlink` が skip し、`--force` でも同じ外部ディレクトリの中に貼り直すだけです。cycle では親ディレクトリの作成が `ELOOP` で失敗します。該当する `.claude/skills` などのパスを退避（または削除）してから `qfai init` を実行してください。",
        "**integration directory の祖先が symlink の場合（`an ancestor is a symlink`）も同様です。** 配下の wrapper は相対 target なので、その祖先が指す先を基準に解決されます。該当する祖先（`.claude` / `.github` など）を実ディレクトリに戻してから `qfai init` を実行してください。",
        "**wrapper が symlink 以外（`directory, not a symlink` / `FIFO` / `socket` / `device`）の場合も init では直りません。** `ensureSymlink` はそれらを `skipped` として温存します。中身を確認できるもの（ディレクトリ）は退避してから `qfai init` を、特殊ファイルは削除してから `qfai init` を実行してください。`--force` は確認なしで削除するので、中身が要るかどうか分からないうちは使わないでください。",
        "**`unreadable` は権限の問題であり、init では直りません。** wrapper の target 文字列は正しいので `ensureSymlink` は skip し、canonical asset は create-only なので上書きもしません。該当ファイルの読み取り権限を戻してください（POSIX: `chmod u+r <path>`、Windows: `icacls <path> /grant <user>:R`）。CI で出た場合は、そのファイルを作成した job の umask / ACL 設定を確認してください。",
        "**canonical 側が壊れている場合（`resolves to a …, but …` / `its SKILL.md is …` / `symlink cycle`）は init では直りません。** canonical asset は create-only なので既存パスを skip し、`--force` でも `copyFile` / `mkdir` が型衝突で失敗します。該当する `.qfai/assistant/**` のパスを退避（または削除）してから `qfai init` を実行してください — 中身は失われるので、先に確認してください。",
        "**`which this version does not ship` は退役した wrapper です。** アップグレードで削除・改名された skill / agent の wrapper が残っており、解決できてしまうため assistant は今も旧命令を読み込みます。`qfai init --force` が削除するのは **解決先が `.qfai/assistant/agents/` の直下にある agent wrapper（`.claude/agents/` / `.github/agents/`）と `qfai-` で始まる skill wrapper** だけです（`--force` なしの再実行では消えません）。`web-research` のような prefix を持たない skill の wrapper、および `.qfai/assistant/agents/<sub>/…` のような下位ディレクトリや `.qfai/assistant/skills/…` を指す agent wrapper は prune 対象外なので、報告されたパスを手で削除してください。**canonical 側（`.qfai/assistant/skills/…` / `.qfai/assistant/agents/…`）は init が削除しません。** プロジェクトが独自の skill / agent をそこへ追加している場合と区別できないためで、退役した canonical を消したいときは手で削除してください。プロジェクト独自の canonical に対して手で貼った wrapper も同じ形になります — その場合も qfai の管理外なので、意図的に残すかどうかを決めてください（agent wrapper は解決先が `.qfai/assistant/agents/` 直下かつ現行 roster に無い場合にのみ `--force` で削除されます）。",
        "根本原因が clone 時の平坦化である場合は、先に `git config --global core.symlinks true` を設定してください。repo-local 設定は clone に引き継がれないため、これを直さないと次の clone で同じ状態に戻ります。",
        "Windows では Developer Mode の有効化が必要な場合があります。",
      ].join("\n"),
      { relatedFiles: broken.slice(1).map((entry) => entry.relative) },
    ),
  ];

  return { issues, unwalkable };
}
