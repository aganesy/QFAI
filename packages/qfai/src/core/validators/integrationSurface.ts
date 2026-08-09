import { constants } from "node:fs";
import type { Dirent, Stats } from "node:fs";
import { access, lstat, readFile, readdir, readlink, realpath, stat } from "node:fs/promises";
import path from "node:path";

import { getInitAssetsDir } from "../../shared/assets.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

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

const INIT_MARKERS: readonly (readonly string[])[] = [
  [".agents", "README.md"],
  [".codex", "README.md"],
  [".claude", "agents", "README.md"],
  [".github", "agents", "README.md"],
];

type Broken = {
  /** Repo-relative wrapper path, POSIX-separated so messages match across platforms. */
  relative: string;
  detail: string;
};

const toPosix = (value: string): string => value.split(path.sep).join("/");

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
/** Whether the file can actually be read, not merely stat'd. */
async function isReadable(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.R_OK);
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException | null)?.code;
    if (code === "EACCES" || code === "EPERM") return false;
    if (isMissing(error)) return false;
    throw error;
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
  // The flattened form is a small text file. The ceiling keeps the read off
  // anything that is not link-shaped, exactly as `init.ts` does.
  if (!link.isFile() || link.size > 4096) return false;
  const body = await readFile(wrapper.absolute, "utf-8").catch((error: unknown) => {
    if (isMissing(error)) return null;
    throw error;
  });
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
    if ((error as NodeJS.ErrnoException | null)?.code === "ELOOP") return null;
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
async function canonicalState(
  filePath: string,
): Promise<"absent" | "present" | "dangling" | "cycle"> {
  let entry: Stats;
  try {
    entry = await lstat(filePath);
  } catch (error) {
    if (isMissing(error)) return "absent";
    if ((error as NodeJS.ErrnoException | null)?.code === "ELOOP") return "cycle";
    throw error;
  }
  if (!entry.isSymbolicLink()) return "present";
  const resolved = await statOrNull(filePath);
  if (resolved === "cycle") return "cycle";
  return resolved === null ? "dangling" : "present";
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
  const stats = await lstatOrNull(filePath);
  if (stats === null || !stats.isFile()) {
    return false;
  }
  const body = await readFile(filePath, "utf-8").catch((error: unknown) => {
    if (isMissing(error)) return null;
    throw error;
  });
  return body !== null && body.includes(INIT_MARKER_SIGNATURE);
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
async function statOrNull(filePath: string): Promise<Stats | null | "cycle"> {
  try {
    return await stat(filePath);
  } catch (error) {
    if (isMissing(error)) return null;
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
export async function validateIntegrationSurface(root: string): Promise<Issue[]> {
  const [skills, agents] = await Promise.all([canonicalSkillIds(), canonicalAgentNames()]);
  if (skills.length === 0 && agents.length === 0) {
    // No canonical tree — nothing to wrap, so nothing to be broken.
    return [];
  }

  const wrappers = wrapperSet(root, skills, agents);
  // A wrapper that exists but cannot be stat'd is a filesystem failure and must
  // not read as one that was never created.
  const links = await Promise.all(
    wrappers.map((wrapper) =>
      lstat(wrapper.absolute).catch((error: unknown) => {
        if (isMissing(error)) return null;
        throw error;
      }),
    ),
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
  const initialised =
    (
      await Promise.all(wrappers.map((wrapper, index) => isInitEvidence(wrapper, links[index])))
    ).some(Boolean) ||
    (
      await Promise.all(INIT_MARKERS.map((marker) => hasInitSignature(path.join(root, ...marker))))
    ).some(Boolean);
  // Surfaces `qfai init` creates that are not there at all. Reported once each,
  // below, instead of once per wrapper they would have held: a directory
  // deleted whole is one act, and one ref per shipped skill buries that.
  const missingDirs = new Set<string>();
  if (initialised) {
    for (const dir of INTEGRATION_SURFACE_DIRS) {
      if ((await readDirOrNull(path.join(root, ...dir.split("/")))) === null) {
        missingDirs.add(dir);
      }
    }
  }

  const broken: Broken[] = [];
  const damagedCanonicals = new Set<string>();

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
      if (initialised && !missingDirs.has(wrapper.dir)) {
        // `lstat`, not `access`: `access` follows the link, so a canonical
        // replaced by a dangling symlink answered "absent" and the skill left
        // the check entirely — no wrapper reported, and nothing else looks at
        // the canonical tree outside `full`. A cycle was worse: `ELOOP` came
        // out of `access` and ended `qfai validate` with a stack trace.
        const canonical = await canonicalState(wrapper.canonical);
        if (canonical === "present") {
          broken.push({
            relative: wrapper.relative,
            detail: `missing — ${toPosix(wrapper.dir)} exists and so does the document it wraps`,
          });
        } else if (canonical !== "absent" && !damagedCanonicals.has(wrapper.canonicalRelative)) {
          // Once per canonical, not once per wrapper: four wrappers name the
          // same document, and one damaged document is one thing to repair.
          damagedCanonicals.add(wrapper.canonicalRelative);
          broken.push({
            relative: wrapper.canonicalRelative,
            detail:
              canonical === "cycle"
                ? "canonical document is a symlink cycle"
                : "canonical document is a dangling symlink",
          });
        }
      }
      continue;
    }

    if (!link.isSymbolicLink()) {
      broken.push({
        relative: wrapper.relative,
        detail: link.isDirectory()
          ? "directory, not a symlink"
          : `regular file (${String(link.size)} bytes)`,
      });
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
      const code = (error as NodeJS.ErrnoException | null)?.code;
      if (!isMissing(error) && code !== "ELOOP") throw error;
      broken.push({
        relative: wrapper.relative,
        detail:
          code === "ELOOP"
            ? `resolves through a symlink cycle -> ${toPosix(wrapper.target)}`
            : `dangling -> ${toPosix(wrapper.target)}`,
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
      if (doc === null || doc === "cycle" || !doc.isFile()) {
        broken.push({
          relative: wrapper.relative,
          detail:
            doc === null
              ? "resolves, but the directory has no SKILL.md"
              : doc === "cycle"
                ? "resolves, but its SKILL.md is a symlink cycle"
                : `resolves, but its SKILL.md is a ${describeKind(doc)}`,
        });
        continue;
      }
      if (!(await isReadable(skillDoc))) {
        broken.push({
          relative: wrapper.relative,
          detail: "resolves, but its SKILL.md is unreadable",
        });
      }
    } else if (!(await isReadable(wrapper.absolute))) {
      // An agent wrapper names the document itself. `stat` reads metadata, which
      // an ACL or a mode can allow while the body stays closed — and the
      // assistant loads the body.
      broken.push({
        relative: wrapper.relative,
        detail: "resolves, but the document is unreadable",
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

  if (broken.length === 0) {
    return [];
  }

  const sample = broken.slice(0, 12).map((entry) => `${entry.relative} (${entry.detail})`);
  const overflow =
    broken.length > sample.length ? ` (他 ${String(broken.length - sample.length)} 件)` : "";

  return [
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
        "**canonical 側が壊れている場合（`resolves to a …, but …` / `its SKILL.md is …` / `symlink cycle`）は init では直りません。** canonical asset は create-only なので既存パスを skip し、`--force` でも `copyFile` / `mkdir` が型衝突で失敗します。該当する `.qfai/assistant/**` のパスを退避（または削除）してから `qfai init` を実行してください — 中身は失われるので、先に確認してください。",
        "根本原因が clone 時の平坦化である場合は、先に `git config --global core.symlinks true` を設定してください。repo-local 設定は clone に引き継がれないため、これを直さないと次の clone で同じ状態に戻ります。",
        "Windows では Developer Mode の有効化が必要な場合があります。",
      ].join("\n"),
      { relatedFiles: broken.slice(1).map((entry) => entry.relative) },
    ),
  ];
}
