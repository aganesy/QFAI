/**
 * The hook that asks a person before a release pull request merges, and only then.
 *
 * Merging a `release/` pull request is what tags a release in this repository, so the hook reads
 * the pull request's head branch instead of the command text. The cases hold the three answers:
 * ask for a release head branch, ask when the head branch cannot be read, and stay silent for
 * every other merge, which agents here run all the time.
 *
 * Nothing here calls the forge. The lookups are passed in, and the cases that run the hook
 * itself name a branch, which needs no lookup.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { HOOK_STATUS, decide, main, mergeCalls } from "../../../../scripts/release-merge-ask.mjs";
import { runReminderHook } from "../helpers/reminderHooks.js";

// tests/scripts/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/** Lookups that answer from fixed tables, recording each pull request looked up. */
function fakeEnv(
  heads: Record<string, string>,
  current: string | undefined = "claude/issue-1-work",
): {
  readonly looked: string[];
  readonly currentBranch: () => string | undefined;
  readonly originRepo: () => string | undefined;
  readonly headRefOf: (repo: string, number: string) => string | undefined;
} {
  const looked: string[] = [];
  return {
    looked,
    currentBranch: () => current,
    originRepo: () => "aganesy/QFAI",
    headRefOf: (repo, number) => {
      looked.push(`${repo}#${number}`);
      return heads[`${repo}#${number}`];
    },
  };
}

const HEADS = {
  "aganesy/QFAI#10": "claude/issue-10-fix",
  "aganesy/QFAI#20": "release/v2.2.0",
  "fork/QFAI#30": "release/v9.0.0",
};

function hookInput(command: string): string {
  return JSON.stringify({
    hook_event_name: "PreToolUse",
    tool_name: "Bash",
    tool_input: { command },
    cwd: repoRoot,
  });
}

describe("which pull request a command merges", () => {
  it.each([
    ["gh pr merge 10 --merge", "10", undefined],
    ["gh pr merge '#10'", "#10", undefined],
    ["gh pr merge #10, a comment", undefined, undefined],
    ["/usr/local/bin/gh pr merge 10", "10", undefined],
    [String.raw`'C:\Program Files\GitHub CLI\gh.exe' pr merge 10`, "10", undefined],
    ["gh pr merge --merge --body 'merge 20 now' -t \"title words\" 10", "10", undefined],
    ["gh pr merge -R fork/QFAI 30 --squash", "30", "fork/QFAI"],
    ["gh pr merge --repo=fork/QFAI 30", "30", "fork/QFAI"],
    ["gh pr merge -Rfork/QFAI 30", "30", "fork/QFAI"],
    [
      "gh pr merge https://github.com/aganesy/QFAI/pull/20",
      "https://github.com/aganesy/QFAI/pull/20",
      undefined,
    ],
    ["gh pr merge --merge -d", undefined, undefined],
  ])("`%s` merges %s", (command, selector, repo) => {
    expect(mergeCalls(command)).toEqual([{ selector, repo, dynamic: false }]);
  });

  it("reads each merge of a compound command and nothing quoted", () => {
    const command = 'echo "gh pr merge 20" && gh pr merge 10; git status | gh pr merge 30';
    expect(mergeCalls(command).map((call) => call.selector)).toEqual(["10", "30"]);
    expect(mergeCalls("gh pr view 20 && git merge main")).toEqual([]);
  });

  it("reads past a here-document body and a comment", () => {
    // An apostrophe in the body would otherwise open a quote that hides the merge after it.
    expect(mergeCalls("cat > f <<'EOF2'\ndon't\nEOF2\ngh pr merge release/v9")).toEqual([
      { selector: "release/v9", repo: undefined, dynamic: false },
    ]);
    expect(mergeCalls("cat <<-EOF\n\tgh pr merge 20\n\tEOF\ngh pr merge 10")).toEqual([
      { selector: "10", repo: undefined, dynamic: false },
    ]);
    expect(mergeCalls("git status # gh pr merge 20 it's\ngh pr merge 10")).toEqual([
      { selector: "10", repo: undefined, dynamic: false },
    ]);
  });

  it("marks an argument the shell expands", () => {
    expect(mergeCalls('gh pr merge "$PR" --merge')).toEqual([
      { selector: "$PR", repo: undefined, dynamic: true },
    ]);
    expect(mergeCalls("gh pr merge $(cat pr.txt)")[0]?.dynamic).toBe(true);
  });
});

describe("the hook's answer", () => {
  it("stays silent for a merge whose head branch is not a release branch", () => {
    const env = fakeEnv(HEADS);
    expect(decide("gh pr merge 10 --merge", env)).toBeUndefined();
    expect(decide("gh pr merge", env)).toBeUndefined();
    expect(decide("gh pr merge claude/issue-10-fix", env)).toBeUndefined();
    expect(decide("git status && npm test", env)).toBeUndefined();
    expect(env.looked).toEqual(["aganesy/QFAI#10"]);
  });

  it.each([
    ["a number", "gh pr merge 20 --merge"],
    ["a URL", "gh pr merge https://github.com/aganesy/QFAI/pull/20"],
    ["a URL with a trailing path", "gh pr merge https://github.com/fork/QFAI/pull/30/files"],
    ["another repository", "gh pr merge --repo github.com/fork/QFAI 30"],
    ["a branch name", "gh pr merge release/v2.2.0 --merge"],
    ["a fork's branch", "gh pr merge fork:release/v2.2.0"],
    ["a second merge in the command", "gh pr merge 10 && gh pr merge 20"],
  ])("asks for a release head branch named by %s", (_, command) => {
    const answer = decide(command, fakeEnv(HEADS));
    expect(answer?.reason).toMatch(/release\/v\d/);
    expect(answer?.reason).toContain("tags the release");
  });

  it("asks for a release branch after a here-document whose body holds a quote", () => {
    const probe = "cat > f <<'EOF2'\ndon't\nEOF2\ngh pr merge release/v9";
    expect(decide(probe, fakeEnv(HEADS))?.reason).toContain("release/v9");
  });

  it("names the head branch once when the argument is the head branch", () => {
    expect(decide("gh pr merge release/v2.2.0", fakeEnv(HEADS))?.reason).toBe(
      "Merging the pull request for release/v2.2.0 tags the release and starts release.yml, " +
        "so a person confirms it first.",
    );
    expect(decide("gh pr merge 20", fakeEnv(HEADS))?.reason).toContain(
      "for 20 (head branch release/v2.2.0)",
    );
  });

  it("asks when the current branch is a release branch", () => {
    expect(decide("gh pr merge --merge", fakeEnv(HEADS, "release/v2.2.0"))?.reason).toContain(
      "for the current branch (head branch release/v2.2.0)",
    );
  });

  it.each([
    ["the lookup fails", "gh pr merge 99", fakeEnv(HEADS)],
    ["the second of two lookups fails", "gh pr merge 10 && gh pr merge 99", fakeEnv(HEADS)],
    ["the argument is expanded", 'gh pr merge "$PR"', fakeEnv(HEADS)],
    ["HEAD is detached", "gh pr merge", fakeEnv(HEADS, "HEAD")],
    ["the current branch is unknown", "gh pr merge", fakeEnv(HEADS, undefined)],
    [
      "the URL is not a pull request on github.com",
      "gh pr merge https://example.com/o/r/pull/1",
      fakeEnv(HEADS),
    ],
  ])("asks when %s", (_, command, env) => {
    expect(decide(command, env)?.reason).toMatch(/^Could not read the head branch/);
  });

  it("looks up a branch name nowhere: the name is the head branch", () => {
    const env = fakeEnv(HEADS);
    decide("gh pr merge release/v2.2.0", env);
    expect(env.looked).toEqual([]);
  });
});

describe("the hook as Claude Code runs it", () => {
  it("prints an ask decision for a release branch, and nothing otherwise", () => {
    const printed = main(hookInput("gh pr merge release/v2.2.0 --merge"));
    expect(JSON.parse(printed ?? "{}")).toEqual({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "ask",
        permissionDecisionReason: expect.stringContaining("release/v2.2.0"),
      },
    });
    expect(main(hookInput("gh pr merge claude/issue-10-fix"))).toBeUndefined();
    expect(main(hookInput("git status"))).toBeUndefined();
    for (const input of ["", "{ not json", "{}", JSON.stringify({ tool_name: "Bash" })]) {
      expect(main(input)).toBeUndefined();
    }
  });

  it("is wired into this repository's settings on every shell call, and not shipped", async () => {
    const read = async (rel: string): Promise<string> =>
      await readFile(path.join(repoRoot, rel), "utf-8");
    const settings: {
      hooks: {
        PreToolUse: {
          matcher: string;
          hooks: { statusMessage?: string; command?: string; args?: string[] }[];
        }[];
      };
    } = JSON.parse(await read(path.join(".claude", "settings.json")));
    const groups = settings.hooks.PreToolUse.filter((group) =>
      group.hooks.some((hook) => hook.statusMessage === HOOK_STATUS),
    );
    // The 60-second timeout sits above the hook's own 45-second deadline: the host stopping the
    // hook would answer nothing and let the merge through.
    expect(groups).toEqual([
      {
        matcher: "Bash|PowerShell",
        hooks: [
          {
            type: "command",
            statusMessage: HOOK_STATUS,
            command: "node",
            args: ["${CLAUDE_PROJECT_DIR}/scripts/release-merge-ask.mjs"],
            timeout: 60,
          },
        ],
      },
    ]);
    const entry = groups[0]?.hooks[0];
    if (entry === undefined) throw new Error("no release-merge entry");

    const printed = await runReminderHook(entry, repoRoot, hookInput("gh pr merge release/v2.2.0"));
    expect(printed).toContain('"permissionDecision":"ask"');
    await expect(
      runReminderHook(entry, repoRoot, hookInput("gh pr merge claude/issue-10-fix")),
    ).resolves.toBe("");

    const shipped = await read(
      path.join("packages", "qfai", "assets", "init", ".claude", "settings.json"),
    );
    expect(shipped).not.toContain(HOOK_STATUS);
    expect(shipped).not.toContain("release-merge-ask");
  });
});
