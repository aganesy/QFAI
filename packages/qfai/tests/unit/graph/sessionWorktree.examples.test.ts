import { expect, it } from "vitest";
import { mkdir, mkdtemp, readdir, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { installedGraphHookResult } from "../../helpers/graphCli.js";
import { resolveSessionWorktree } from "../../../src/core/graph/sessionWorktree.js";

async function initialise(worktree: string, git: "directory" | "file") {
  await mkdir(path.join(worktree, ".qfai", "tools"), { recursive: true });
  await writeFile(
    path.join(worktree, ".qfai", "tools", "graph-enforcement.json"),
    JSON.stringify({ kind: "graph-enforcement", denyExploration: true }),
  );
  if (git === "directory") await mkdir(path.join(worktree, ".git"));
  else await writeFile(path.join(worktree, ".git"), "gitdir: ../../../.git/worktrees/session\n");
}

function search(cwd: string) {
  return {
    tool_name: "Bash",
    tool_input: { command: "rg auth packages/" },
    session_id: "worktree-session",
    cwd,
  };
}

// QFAI:EX-0001-0236-23
// Mutation: packages/qfai/src/cli/graphHook.ts `decision = await classifyStoredGraphExploration(project, event);` -> `decision = await classifyStoredGraphExploration(root, event);` fails "treats the session's own nested worktree as the hook's project worktree"
it("treats the session's own nested worktree as the hook's project worktree", async () => {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), "qfai-session-worktree-")));
  try {
    await initialise(root, "directory");
    const nested = path.join(root, ".claude", "worktrees", "session");
    await mkdir(nested, { recursive: true });
    await mkdir(path.join(nested, "packages"));
    await writeFile(path.join(nested, ".git"), "gitdir: ../../../.git/worktrees/session\n");

    const uninitialised = await installedGraphHookResult(root, search(nested), "claude");
    expect(uninitialised.failures).toBe(0);
    // Read the parsed reason: the raw JSON escapes Windows path separators.
    const reason: unknown = JSON.parse(uninitialised.output);
    expect(reason).toMatchObject({
      hookSpecificOutput: {
        permissionDecisionReason: expect.stringContaining(
          `The session worktree ${nested} has no graph protection`,
        ),
      },
    });
    expect(uninitialised.output).toContain("Run npx qfai init in");
    expect(uninitialised.output).not.toContain("worktree differs");
    expect(uninitialised.output).not.toContain("Observed attempt:");

    await initialise(nested, "file");
    expect(await resolveSessionWorktree(root, path.join(nested, "packages"))).toBe(nested);
    const observed = await installedGraphHookResult(root, search(nested), "claude");
    expect(observed.failures).toBe(0);
    expect(observed.output).not.toContain("worktree differs");
    expect(observed.output).toMatch(/Observed attempt: [a-f0-9-]{36}/);
    const state = path.join(nested, ".qfai", "tools", "state");
    const [environment] = await readdir(state);
    expect(
      (await readdir(path.join(state, environment ?? ""))).some((name) =>
        name.endsWith(".pending.json"),
      ),
    ).toBe(true);

    expect(await resolveSessionWorktree(root, path.join(root, "packages"))).toBe(root);
    expect(await resolveSessionWorktree(root, os.tmpdir())).toBe(root);
    expect(await resolveSessionWorktree(root, undefined)).toBe(root);
    const outside = await installedGraphHookResult(root, search(path.resolve("other-worktree")));
    expect(outside.output).toContain("worktree differs");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
