import { lstat, readdir, readlink, stat } from "node:fs/promises";
import path from "node:path";

import type { Issue } from "../types.js";
import { exists, issue } from "./utils.js";

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

type Broken = {
  /** Repo-relative wrapper path, POSIX-separated so messages match across platforms. */
  relative: string;
  detail: string;
};

const toPosix = (value: string): string => value.split(path.sep).join("/");

/**
 * The skills `qfai init` would create a wrapper for: every directory under the
 * project's canonical tree that carries a `SKILL.md`.
 *
 * Read from the project rather than assumed, and never from a name prefix. A
 * `qfai-` prefix test skipped `web-research` — a shipped canonical skill that
 * init wraps like any other — so a flattened `web-research` link passed the
 * check while the assistant could not load it.
 */
async function canonicalSkillIds(root: string): Promise<string[]> {
  const skillsDir = path.join(root, ".qfai", "assistant", "skills");
  const entries = await readdir(skillsDir, { withFileTypes: true }).catch(() => []);
  const ids: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (await exists(path.join(skillsDir, entry.name, "SKILL.md"))) {
      ids.push(entry.name);
    }
  }
  return ids.sort();
}

/**
 * The agents `qfai init` would create a wrapper for.
 *
 * Also read from the canonical tree. Treating every non-README `*.md` in
 * `.claude/agents` as qfai-owned turned a project's own agent definition into a
 * `QFAI-LINK-001` error in every profile — the opposite of the rule's stated
 * scope.
 */
async function canonicalAgentNames(root: string): Promise<string[]> {
  const agentsDir = path.join(root, ".qfai", "assistant", "agents");
  const entries = await readdir(agentsDir, { withFileTypes: true }).catch(() => []);
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md") && entry.name !== "README.md")
    .map((entry) => entry.name.slice(0, -".md".length))
    .sort();
}

/** The wrapper path and the exact link target `qfai init` writes for it. */
type Wrapper = { relative: string; absolute: string; target: string };

function wrapperSet(root: string, skills: string[], agents: string[]): Wrapper[] {
  const wrappers: Wrapper[] = [];

  const push = (dir: string, name: string, canonicalRel: string[]): void => {
    const dirAbsolute = path.join(root, ...dir.split("/"));
    wrappers.push({
      relative: `${dir}/${name}`,
      absolute: path.join(dirAbsolute, name),
      target: path.relative(dirAbsolute, path.join(root, ...canonicalRel)),
    });
  };

  for (const dir of SKILL_WRAPPER_DIRS) {
    for (const id of skills) {
      push(dir, id, [".qfai", "assistant", "skills", id]);
    }
  }
  for (const { dir, suffix } of AGENT_WRAPPER_DIRS) {
    for (const name of agents) {
      push(dir, `${name}${suffix}`, [".qfai", "assistant", "agents", `${name}.md`]);
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
  const [skills, agents] = await Promise.all([canonicalSkillIds(root), canonicalAgentNames(root)]);
  if (skills.length === 0 && agents.length === 0) {
    // No canonical tree — nothing to wrap, so nothing to be broken.
    return [];
  }

  const broken: Broken[] = [];

  for (const wrapper of wrapperSet(root, skills, agents)) {
    const link = await lstat(wrapper.absolute).catch(() => null);
    if (link === null) {
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

    const actual = await readlink(wrapper.absolute).catch(() => null);
    if (actual === null || path.normalize(actual) !== path.normalize(wrapper.target)) {
      // A link that resolves to the wrong canonical document is worse than a
      // dangling one: the assistant loads real instructions, just not these.
      broken.push({
        relative: wrapper.relative,
        detail: `points at ${toPosix(actual ?? "?")}, expected ${toPosix(wrapper.target)}`,
      });
      continue;
    }

    // The target is in the roster, so the canonical document exists and this
    // normally resolves. Kept as a guard for the cases the roster cannot see —
    // an unreadable parent, or a link created with the wrong type on Windows.
    // A wrapper whose canonical entry was *removed* is out of scope: it drops
    // out of the roster and is stale rather than broken, which is what
    // `pruneStaleQfaiWrappers` clears under `--force`.
    const resolves = await stat(wrapper.absolute).then(
      () => true,
      () => false,
    );
    if (!resolves) {
      broken.push({ relative: wrapper.relative, detail: `dangling -> ${toPosix(wrapper.target)}` });
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
