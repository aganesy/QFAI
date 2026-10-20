/**
 * A Claude Code `PreToolUse` hook that asks a person before a release pull request merges.
 *
 * In this repository, merging a `release/vX.Y.Z` pull request is what cuts the release: Tag
 * release commit tags the merge commit, and the tag starts `release.yml`. A permission entry such
 * as `Bash(gh pr merge:*)` cannot tell that merge from any other, and agents here merge ordinary
 * pull requests all the time, so the check reads the pull request instead of the command text.
 *
 * For each `gh pr merge` in a shell command, the hook finds the pull request's head branch:
 *
 * - a number or a pull request URL is looked up with one REST call through `gh api`;
 * - a branch name is the head branch itself;
 * - no argument means the current branch, which `gh` merges the pull request of.
 *
 * When a head branch starts with `release/`, the hook answers `ask` with the reason. When a head
 * branch cannot be read (the lookup fails or runs out of time, or the argument is a shell
 * expansion), it answers `ask` as well: this check fails closed. Otherwise it prints nothing, and
 * the call goes through the normal permission flow.
 *
 * This repository's own guard. `qfai init` does not ship it: an adopter's release flow is its own.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { argv, cwd as processCwd, stdout } from "node:process";
import { pathToFileURL } from "node:url";

import { repoSlug } from "./gh-budget.mjs";

/** The status line Claude Code shows while the hook runs, which also names its settings group. */
export const HOOK_STATUS = "Release pull request merge check";

/** The head-branch prefix of a pull request whose merge cuts a release. */
export const RELEASE_HEAD_PREFIX = "release/";

/** Tokens that end one command and start the next. */
const OPERATORS = new Set(["&&", "||", ";", "|", "&", "\n", "(", ")"]);

/** `gh pr merge` options that take a value; every other option is a switch. */
const VALUE_OPTIONS = new Set([
  "-A",
  "--author-email",
  "-b",
  "--body",
  "-F",
  "--body-file",
  "--match-head-commit",
  "-R",
  "--repo",
  "-t",
  "--subject",
]);

/**
 * The words of a shell command, with each unquoted operator as its own token.
 *
 * `dynamic` marks a word the shell would expand (an unquoted or double-quoted `$` or a
 * backtick), whose value this cannot know. A comment and the body of a here-document are not
 * words: the shell runs neither, and a quote inside them would otherwise hide what follows.
 */
export function shellWords(command) {
  const words = [];
  const heredocs = [];
  let text = "";
  let dynamic = false;
  let started = false;
  const flush = () => {
    if (started) words.push({ text, dynamic });
    text = "";
    dynamic = false;
    started = false;
  };
  for (let i = 0; i < command.length; i += 1) {
    const ch = command[i];
    if (ch === "\n" && heredocs.length > 0) {
      flush();
      words.push({ text: "\n", dynamic: false, operator: true });
      i = skipHeredocBodies(command, i + 1, heredocs.splice(0)) - 1;
    } else if (ch === "#" && !started) {
      const end = command.indexOf("\n", i);
      i = (end < 0 ? command.length : end) - 1;
    } else if (ch === "<" && command[i + 1] === "<" && command[i + 2] !== "<") {
      flush();
      const heredoc = /^<<(-?)[ \t]*(?:'([^']*)'|"([^"]*)"|\\?([^\s;&|<>()]+))/.exec(
        command.slice(i),
      );
      if (heredoc === null) {
        i += 1;
        continue;
      }
      heredocs.push({
        strip: heredoc[1] === "-",
        delimiter: heredoc[2] ?? heredoc[3] ?? heredoc[4],
      });
      i += heredoc[0].length - 1;
    } else if (ch === "'") {
      const end = command.indexOf("'", i + 1);
      const stop = end < 0 ? command.length : end;
      text += command.slice(i + 1, stop);
      started = true;
      i = stop;
    } else if (ch === '"') {
      started = true;
      for (i += 1; i < command.length && command[i] !== '"'; i += 1) {
        if (command[i] === "\\" && i + 1 < command.length) {
          i += 1;
        } else if (command[i] === "$" || command[i] === "`") {
          dynamic = true;
        }
        text += command[i];
      }
    } else if (ch === "\\" && i + 1 < command.length) {
      i += 1;
      if (command[i] !== "\n") {
        text += command[i];
        started = true;
      }
    } else if (ch === " " || ch === "\t" || ch === "\r") {
      flush();
    } else if (OPERATORS.has(ch)) {
      flush();
      const pair = command.slice(i, i + 2);
      const op = pair === "&&" || pair === "||" ? pair : ch;
      words.push({ text: op, dynamic: false, operator: true });
      i += op.length - 1;
    } else {
      if (ch === "$" || ch === "`") dynamic = true;
      text += ch;
      started = true;
    }
  }
  flush();
  return words;
}

/**
 * The index just past the here-document bodies that start at `start`, read in order; each runs
 * up to its delimiter line, which `<<-` lets carry leading tabs.
 */
function skipHeredocBodies(command, start, heredocs) {
  let pos = start;
  for (const { strip, delimiter } of heredocs) {
    while (pos < command.length) {
      const end = command.indexOf("\n", pos);
      const line = command.slice(pos, end < 0 ? command.length : end).replace(/\r$/, "");
      pos = end < 0 ? command.length : end + 1;
      if ((strip ? line.replace(/^\t+/, "") : line) === delimiter) break;
    }
  }
  return pos;
}

/** True for a word that runs the GitHub CLI: `gh`, or `gh.exe`, by any path. */
function isGh(word) {
  return word.operator !== true && /(?:^|[\\/])gh(?:\.exe)?$/i.test(word.text);
}

/**
 * Each `gh pr merge` the command runs: its pull request argument, if any, and its `--repo`.
 *
 * `selector` is undefined when no argument is given; `dynamic` is true when the argument or the
 * repository is a shell expansion.
 */
export function mergeCalls(command) {
  const words = shellWords(command);
  const calls = [];
  for (let i = 0; i + 2 < words.length; i += 1) {
    const [gh, pr, merge] = words.slice(i, i + 3);
    if (!isGh(gh) || pr.text !== "pr" || merge.text !== "merge") continue;
    const call = { selector: undefined, repo: undefined, dynamic: false };
    for (let j = i + 3; j < words.length && words[j].operator !== true; j += 1) {
      const word = words[j];
      // `--name=value`, and a short option with its value attached: `-Rowner/repo`.
      const [name, inline] = word.text.startsWith("--")
        ? word.text.split(/=(.*)/s, 2)
        : VALUE_OPTIONS.has(word.text.slice(0, 2)) && word.text.length > 2
          ? [word.text.slice(0, 2), word.text.slice(2)]
          : [word.text, undefined];
      if (name.startsWith("-") && name.length > 1) {
        if (!VALUE_OPTIONS.has(name) || inline !== undefined) {
          if (name === "--repo" || name === "-R") {
            call.repo = inline;
            if (word.dynamic) call.dynamic = true;
          }
          continue;
        }
        const value = words[j + 1];
        if (value === undefined || value.operator === true) break;
        if (name === "-R" || name === "--repo") {
          call.repo = value.text;
          if (value.dynamic) call.dynamic = true;
        }
        j += 1;
      } else if (call.selector === undefined) {
        call.selector = word.text;
        if (word.dynamic) call.dynamic = true;
      }
    }
    calls.push(call);
  }
  return calls;
}

/** `OWNER/REPO` from a `--repo` value, which may also carry a host: `HOST/OWNER/REPO`. */
function repoOf(value) {
  const parts = value.split("/").filter((part) => part !== "");
  return parts.length >= 2 ? parts.slice(-2).join("/") : undefined;
}

/**
 * The head branch of the pull request one `gh pr merge` call merges, or undefined when it cannot
 * be read.
 *
 * `env` supplies what lives outside the command: `currentBranch()`, `originRepo()` and
 * `headRefOf(repo, number)`, each returning undefined when it fails.
 */
export function headBranch(call, env) {
  if (call.dynamic) return undefined;
  const { selector } = call;
  if (selector === undefined) {
    const branch = env.currentBranch();
    return branch === "HEAD" ? undefined : branch;
  }
  const url = /^https?:\/\/github\.com\/([^/]+\/[^/]+)\/pull\/(\d+)(?:[/?#].*)?$/.exec(selector);
  const number = /^#?(\d+)$/.exec(selector);
  if (url === null && number === null) {
    // A URL this cannot read is not a branch name.
    if (selector.includes("://")) return undefined;
    // `OWNER:BRANCH` names a branch of a fork.
    return selector.replace(/^[^:/]+:/, "");
  }
  const repo = url?.[1] ?? (call.repo === undefined ? env.originRepo() : repoOf(call.repo));
  if (repo === undefined) return undefined;
  return env.headRefOf(repo, url?.[2] ?? number?.[1]);
}

/**
 * The hook's answer for one shell command: `{ reason }` to ask, or undefined to stay silent.
 */
export function decide(command, env) {
  const reasons = [];
  for (const call of mergeCalls(command)) {
    const head = headBranch(call, env);
    const target = call.selector ?? "the current branch";
    if (head === undefined) {
      reasons.push(
        `Could not read the head branch of the pull request for ${target}. Merging a ` +
          "release/ pull request cuts the release, so confirm this merge is not one.",
      );
    } else if (head.startsWith(RELEASE_HEAD_PREFIX)) {
      const named = target === head ? head : `${target} (head branch ${head})`;
      reasons.push(
        `Merging the pull request for ${named} tags the release and starts release.yml, ` +
          "so a person confirms it first.",
      );
    }
  }
  return reasons.length === 0 ? undefined : { reason: reasons.join(" ") };
}

/** The longest one lookup may take. */
const CALL_TIMEOUT_MS = 15_000;

/**
 * The longest all lookups together may take. It stays under the 60-second hook timeout in
 * `.claude/settings.json`: a hook the host stops answers nothing, which lets the merge through,
 * while a lookup this deadline cuts short answers `ask`.
 */
const DEADLINE_MS = 45_000;

/** What the hook reads outside the command, from the directory the command runs in. */
function liveEnv(cwd) {
  const deadline = Date.now() + DEADLINE_MS;
  // The trimmed output of a command, or undefined when it fails, times out, or the deadline
  // has passed, so that a lookup it skips counts as unread.
  const output = (file, args) => {
    const timeout = Math.min(CALL_TIMEOUT_MS, deadline - Date.now());
    if (timeout <= 0) return undefined;
    try {
      const text = execFileSync(file, args, {
        cwd,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "ignore"],
        timeout,
      }).trim();
      return text === "" ? undefined : text;
    } catch {
      return undefined;
    }
  };
  return {
    currentBranch: () => output("git", ["rev-parse", "--abbrev-ref", "HEAD"]),
    originRepo: () => {
      const remote = output("git", ["remote", "get-url", "origin"]);
      return remote === undefined ? undefined : repoSlug(remote);
    },
    headRefOf: (repo, number) =>
      output("gh", ["api", `repos/${repo}/pulls/${number}`, "--jq", ".head.ref"]),
  };
}

/** Reads the hook input from stdin and prints the answer Claude Code reads. */
export function main(stdin) {
  let input;
  try {
    input = JSON.parse(stdin);
  } catch {
    return undefined;
  }
  const command = input?.tool_input?.command;
  if (typeof command !== "string" || !/\bmerge\b/.test(command)) return undefined;
  const answer = decide(command, liveEnv(typeof input.cwd === "string" ? input.cwd : processCwd()));
  if (answer === undefined) return undefined;
  return JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "ask",
      permissionDecisionReason: answer.reason,
    },
  });
}

// `pathToFileURL`, not `file://` + the path: on Windows `process.argv[1]` is a drive-letter
// path, which concatenation turns into a string no `import.meta.url` ever equals.
if (argv[1] !== undefined && import.meta.url === pathToFileURL(argv[1]).href) {
  let stdin = "";
  try {
    stdin = readFileSync(0, "utf-8");
  } catch {
    // No input: nothing to check.
  }
  const printed = main(stdin);
  if (printed !== undefined) stdout.write(`${printed}\n`);
}
