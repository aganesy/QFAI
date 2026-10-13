import { randomUUID } from "node:crypto";
import { link, readFile, readdir, symlink, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, it, vi } from "vitest";
import { graphEnvironmentKey } from "../../../src/core/graph/layout.js";
import type { GraphProcess } from "../../../src/core/graph/process.js";
import { codeAnalysisFixture } from "../../helpers/graphAnalysis.js";
import { graphCliResult, installedGraphHookResult } from "../../helpers/graphCli.js";

async function pendingFixture() {
  const fixture = await codeAnalysisFixture();
  await writeFile(
    path.join(fixture.root, ".qfai", "tools", "graph-enforcement.json"),
    '{"kind":"graph-enforcement","denyExploration":true}',
  );
  const event = {
    tool_name: "Bash",
    tool_input: { command: "rg legacy packages/" },
    session_id: "state-session",
    cwd: fixture.root,
  };
  const denied = await installedGraphHookResult(fixture.root, event);
  const id = /Observed attempt: ([a-f0-9-]{36})/.exec(denied.output)?.[1];
  if (!id) throw new Error("Expected a pending search attempt.");
  const directory = path.join(fixture.root, ".qfai", "tools", "state", graphEnvironmentKey());
  const file = path.join(directory, `${id}.pending.json`);
  const record: Record<string, unknown> = JSON.parse(await readFile(file, "utf8"));
  const args = [
    "fallback",
    "--attempt-id",
    id,
    "--question",
    "legacy callers",
    "--reason",
    "Missing legacy relationships.",
  ];
  return { ...fixture, event, id, directory, file, record, args };
}

// QFAI:EX-0001-0235-18
it("refuses missing malformed oversized linked or changed pending state without publishing permission", async () => {
  for (const damage of [
    "missing",
    "malformed",
    "extra-field",
    "other-worktree",
    "oversized",
    "hard-link",
    "symlink",
    "changed-during-query",
  ]) {
    const fixture = await pendingFixture();
    try {
      const retained = path.join(fixture.root, "retained.txt");
      await writeFile(retained, "Retain this file");
      if (damage === "missing") await unlink(fixture.file);
      if (damage === "malformed") await writeFile(fixture.file, "{");
      if (damage === "extra-field")
        await writeFile(fixture.file, JSON.stringify({ ...fixture.record, approved: true }));
      if (damage === "other-worktree")
        await writeFile(
          fixture.file,
          JSON.stringify({ ...fixture.record, worktree: path.resolve("other-worktree") }),
        );
      if (damage === "oversized") await writeFile(fixture.file, "x".repeat(32769));
      if (damage === "hard-link" || damage === "symlink") {
        await unlink(fixture.file);
        if (damage === "hard-link") await link(retained, fixture.file);
        else await symlink(retained, fixture.file);
      }
      const run: GraphProcess = async (command, args, options) => {
        const result = await fixture.run(command, args, options);
        if (damage === "changed-during-query" && args.includes("context"))
          await writeFile(fixture.file, JSON.stringify({ ...fixture.record, target: "private/" }));
        return result;
      };
      const failed = await graphCliResult(fixture.root, fixture.args, run);
      expect(failed.value).toMatchObject({
        status: "failed",
        permitted: false,
        recovery: expect.any(String),
      });
      expect(failed.failures).toBe(1);
      expect((await readdir(fixture.directory)).some((name) => name.endsWith(".grant.json"))).toBe(
        false,
      );
      if (damage !== "changed-during-query") expect(fixture.calls).toEqual([]);
      expect(await readFile(retained, "utf8")).toBe("Retain this file");
      expect((await installedGraphHookResult(fixture.root, fixture.event)).output).toContain(
        '"permissionDecision":"deny"',
      );
    } finally {
      await fixture.dispose();
    }
  }
});

// QFAI:EX-0001-0235-18
it("never authorizes an unpublished draft", async () => {
  const fixture = await pendingFixture();
  try {
    const draft = path.join(fixture.directory, `${fixture.id}.draft.json`);
    const createdAt = Date.now();
    const record = {
      ...fixture.record,
      kind: "grant",
      reason: "Incomplete legacy relationships.",
      createdAt,
      expiresAt: createdAt + 60000,
    };
    await writeFile(draft, JSON.stringify(record));
    expect((await installedGraphHookResult(fixture.root, fixture.event)).output).toContain(
      '"permissionDecision":"deny"',
    );
    expect(JSON.parse(await readFile(draft, "utf8"))).toEqual(record);
    expect(fixture.calls).toEqual([]);
  } finally {
    await fixture.dispose();
  }
});

// QFAI:EX-0001-0235-18
it("bounds pending draft and grant capacity and recovers only expired valid records", async () => {
  let now = 1000;
  const clock = vi.spyOn(Date, "now").mockImplementation(() => now);
  const fixture = await pendingFixture();
  try {
    await Promise.all(
      Array.from({ length: 127 }, async (_, index) => {
        const id = randomUUID();
        const phase = ["pending", "draft", "grant"][index % 3] ?? "pending";
        const record = {
          ...fixture.record,
          id,
          target: `unrelated-${index}/`,
          ...(phase === "pending"
            ? {}
            : { kind: "grant", reason: "Unresolved scope.", expiresAt: 61000 }),
        };
        await writeFile(
          path.join(fixture.directory, `${id}.${phase}.json`),
          JSON.stringify(record),
        );
      }),
    );
    expect((await readdir(fixture.directory)).length).toBe(128);
    const refused = await graphCliResult(fixture.root, fixture.args, fixture.run);
    expect(refused.value).toMatchObject({
      status: "failed",
      permitted: false,
      recovery: expect.stringContaining("Retry"),
    });
    expect((await readdir(fixture.directory)).length).toBe(128);
    const full = await installedGraphHookResult(fixture.root, fixture.event);
    expect(full.failures).toBe(1);
    expect(full.output).toContain("state is full");
    expect((await readdir(fixture.directory)).length).toBe(128);
    now = 601000;
    const next = await installedGraphHookResult(fixture.root, fixture.event);
    expect(next.failures).toBe(0);
    expect(next.output).toContain("Observed attempt:");
    expect((await readdir(fixture.directory)).length).toBe(1);
    const expired = await graphCliResult(fixture.root, fixture.args, fixture.run);
    expect(expired.value).toMatchObject({ status: "failed", permitted: false });
  } finally {
    clock.mockRestore();
    await fixture.dispose();
  }
});
