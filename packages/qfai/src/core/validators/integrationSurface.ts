import { lstat, readdir, readlink, stat } from "node:fs/promises";
import path from "node:path";

import type { Issue } from "../types.js";
import { issue } from "./utils.js";

/**
 * The directories `qfai init` builds entirely out of symlinks, and which are
 * the ONLY way an assistant loads a qfai skill or routes a qfai agent.
 *
 * Kept in step with `cli/commands/init.ts#SKILL_INTEGRATION_DIRS` /
 * `#AGENT_INTEGRATION_CONFIGS`. `tests/core/integrationSurface.test.ts` asserts
 * the two lists agree, so a new integration target cannot ship unchecked.
 */
export const INTEGRATION_SURFACE_DIRS: readonly string[] = [
  ".claude/skills",
  ".agents/skills",
  ".codex/skills",
  ".github/skills",
  ".claude/agents",
  ".github/agents",
];

/** Entries a directory legitimately holds that are not links qfai owns. */
const NON_LINK_ENTRIES = new Set(["README.md", ".gitkeep", ".gitignore"]);

type BrokenEntry = {
  /** Repo-relative path, POSIX-separated for stable messages across platforms. */
  relative: string;
  kind: "not-a-symlink" | "dangling";
  detail: string;
};

const toPosix = (value: string): string => value.split(path.sep).join("/");

/**
 * A qfai-owned entry: the skill links are `qfai-*` directories, the agent links
 * are `<agent>.md` / `<agent>.agent.md` files. Anything a project added itself
 * is left alone — this rule reports qfai's own surface being broken, never a
 * user's file being unusual.
 */
function isQfaiOwned(dir: string, name: string): boolean {
  if (NON_LINK_ENTRIES.has(name)) {
    return false;
  }
  return dir.endsWith("/skills") ? name.startsWith("qfai-") : name.endsWith(".md");
}

/**
 * Reports a qfai integration link that did not survive checkout.
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
 * existing while work continues at full speed — silently, for as long as nobody
 * happens to notice the skills missing from a menu.
 *
 * A directory that does not exist is not a finding: a project may legitimately
 * integrate with only some of the six.
 */
export async function validateIntegrationSurface(root: string): Promise<Issue[]> {
  const broken: BrokenEntry[] = [];
  let probedDirs = 0;

  for (const dir of INTEGRATION_SURFACE_DIRS) {
    const absoluteDir = path.join(root, ...dir.split("/"));
    let entries;
    try {
      entries = await readdir(absoluteDir, { withFileTypes: true });
    } catch {
      // Absent or unreadable — the project did not opt into this integration.
      continue;
    }
    probedDirs += 1;

    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      if (!isQfaiOwned(dir, entry.name)) {
        continue;
      }
      const absolute = path.join(absoluteDir, entry.name);
      const relative = `${dir}/${entry.name}`;

      // `readdir` follows nothing, but be explicit: `lstat` describes the entry
      // itself, which is the whole question here.
      const link = await lstat(absolute).catch(() => null);
      if (link === null) {
        continue;
      }

      if (!link.isSymbolicLink()) {
        // The flattened-checkout signature: a small regular file whose bytes
        // are the link target. Reported for any non-symlink, because a
        // hand-copied directory is equally outside qfai's update path.
        broken.push({
          relative,
          kind: "not-a-symlink",
          detail: link.isDirectory() ? "directory" : `regular file (${String(link.size)} bytes)`,
        });
        continue;
      }

      const target = await readlink(absolute).catch(() => null);
      const resolves = await stat(absolute).then(
        () => true,
        () => false,
      );
      if (!resolves) {
        broken.push({
          relative,
          kind: "dangling",
          detail: `-> ${toPosix(target ?? "?")}`,
        });
      }
    }
  }

  if (probedDirs === 0 || broken.length === 0) {
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
        "`qfai init` を再実行すると、qfai が所有するこれらのパスは symlink として貼り直されます（`--force` は不要）。",
        "根本原因が clone 時の平坦化である場合は、先に `git config --global core.symlinks true` を設定してください。repo-local 設定は clone に引き継がれないため、これを直さないと次の clone で同じ状態に戻ります。",
        "Windows では Developer Mode の有効化が必要な場合があります。",
      ].join("\n"),
      { relatedFiles: broken.slice(1).map((entry) => entry.relative) },
    ),
  ];
}
