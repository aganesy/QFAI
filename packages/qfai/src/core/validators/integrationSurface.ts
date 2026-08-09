import type { Dirent, Stats } from "node:fs";
import { access, lstat, readdir, readlink, stat } from "node:fs/promises";
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
 */
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
/** Alias kept for the two call sites that only ask "is it there". */
const exists = fileExists;

/** `stat`, or `null` when the path is absent. Any other error propagates. */
async function statOrNull(filePath: string): Promise<Stats | null> {
  try {
    return await stat(filePath);
  } catch (error) {
    if (isMissing(error)) return null;
    throw error;
  }
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
  const initialised =
    links.some((link) => link !== null) ||
    (await Promise.all(INIT_MARKERS.map((marker) => fileExists(path.join(root, ...marker))))).some(
      Boolean,
    );
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

  for (const [index, wrapper] of wrappers.entries()) {
    const link = links[index] ?? null;
    if (link === null) {
      // Absent is "not created yet" **only before init has run**. Once it has,
      // and the project has the canonical document, `qfai init` created this
      // wrapper too, so its absence is a deletion — and nothing else reported
      // it, because `validateSkillsIntegrity` reads the canonical tree
      // (unchanged) and runs under `full` alone.
      if (initialised && !missingDirs.has(wrapper.dir) && (await exists(wrapper.canonical))) {
        broken.push({
          relative: wrapper.relative,
          detail: `missing — ${toPosix(wrapper.dir)} exists and so does the document it wraps`,
        });
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
      if (!isMissing(error)) throw error;
      broken.push({ relative: wrapper.relative, detail: `dangling -> ${toPosix(wrapper.target)}` });
      continue;
    }

    // What it resolves *to*. A canonical agent document replaced by a directory
    // — or a skill directory by a file — leaves the link string correct, so
    // `lstat`, `readlink` and `stat` all succeed and nothing looked further.
    // The agent surface has no other check outside `prototyping` / `full`, so
    // `discussion` / `sdd` / `atdd` / `tdd` passed an agent tree the assistant
    // cannot load a single markdown file from.
    const wantsDirectory = wrapper.kind === "skill";
    if (wantsDirectory !== target.isDirectory()) {
      broken.push({
        relative: wrapper.relative,
        detail: wantsDirectory
          ? "resolves to a file, but a skill wrapper names a directory"
          : "resolves to a directory, but an agent wrapper names a file",
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
      const doc = await statOrNull(path.join(wrapper.absolute, "SKILL.md"));
      if (doc === null || !doc.isFile()) {
        broken.push({
          relative: wrapper.relative,
          detail:
            doc === null
              ? "resolves, but the directory has no SKILL.md"
              : "resolves, but its SKILL.md is not a file",
        });
      }
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
        "根本原因が clone 時の平坦化である場合は、先に `git config --global core.symlinks true` を設定してください。repo-local 設定は clone に引き継がれないため、これを直さないと次の clone で同じ状態に戻ります。",
        "Windows では Developer Mode の有効化が必要な場合があります。",
      ].join("\n"),
      { relatedFiles: broken.slice(1).map((entry) => entry.relative) },
    ),
  ];
}
