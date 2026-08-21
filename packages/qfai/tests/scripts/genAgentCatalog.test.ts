/**
 * `agent-catalog.yml` carried a copy of all 19 agent bodies with no generator
 * anywhere in `scripts/`, so an edit to `assets/init/.qfai/assistant/agents/*.md`
 * left the catalog stale and nothing failed. `gen-agent-catalog.mjs` regenerates
 * the derived blocks and `sync:ssot` runs it, which is what makes `ci:gate`'s
 * `git diff --exit-code .qfai/` fail on a stale catalog.
 */
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/scripts/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const SCRIPT = path.join(repoRoot, "scripts", "gen-agent-catalog.mjs");
const CATALOG = path.join(
  repoRoot,
  "packages",
  "qfai",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "manifest",
  "agent-catalog.yml",
);

const AGENT_MD = `---
name: probe-agent
description: "Probe."
tools: [Read]
---

# Probe Agent

## Mission

- Probe one thing.

## Sign-off

- [ ] Probed
`;

function run(args: string[] = []): { status: number; output: string } {
  const result = spawnSync("node", [SCRIPT, ...args], { cwd: repoRoot, encoding: "utf-8" });
  return {
    status: result.status ?? 1,
    output: (result.stdout ?? "") + (result.stderr ?? ""),
  };
}

function fixtureAssistant(root: string): string {
  return path.join(root, "packages", "qfai", "assets", "init", ".qfai", "assistant");
}

function fixtureCatalog(root: string): string {
  return path.join(fixtureAssistant(root), "manifest", "agent-catalog.yml");
}

/**
 * A throwaway copy of the assets layout the script expects. The real tree is
 * never mutated: other suites read it concurrently, and a half-applied edit
 * there would look like SSOT drift to them.
 */
async function withFixture(
  catalog: string,
  agentMarkdown: string,
  body: (root: string) => Promise<void>,
): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-gen-agent-catalog-"));
  const assistant = fixtureAssistant(root);
  try {
    await mkdir(path.join(assistant, "manifest"), { recursive: true });
    await mkdir(path.join(assistant, "agents"), { recursive: true });
    await writeFile(fixtureCatalog(root), catalog, "utf-8");
    await writeFile(path.join(assistant, "agents", "probe-agent.md"), agentMarkdown, "utf-8");
    await body(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const STALE_CATALOG = `schema_version: "1.0"
agents:
  - id: probe-agent
    kind: worker
    developer_instructions: |
      ## Mission

      - Probe something else entirely.
`;

describe("gen-agent-catalog", () => {
  it("reports the committed catalog as up to date", () => {
    const { status, output } = run(["--check"]);

    expect(output).toContain("up to date");
    expect(status).toBe(0);
  });

  it("is a no-op on an already-generated catalog", async () => {
    // Byte-for-byte: the generator rewrites only the block scalar contents, so
    // running it on the committed tree must never show up as a diff.
    const before = await readFile(CATALOG, "utf-8");
    expect(run().status).toBe(0);

    expect(await readFile(CATALOG, "utf-8")).toBe(before);
  });

  it("fails --check on a catalog the agent markdown has moved past", async () => {
    await withFixture(STALE_CATALOG, AGENT_MD, async (root) => {
      const { status, output } = run(["--check", `--root=${root}`]);

      expect(status).toBe(1);
      expect(output).toContain("STALE:");
    });
  });

  it("rewrites the block from the markdown and leaves the rest alone", async () => {
    await withFixture(STALE_CATALOG, AGENT_MD, async (root) => {
      expect(run([`--root=${root}`]).status).toBe(0);

      const written = await readFile(fixtureCatalog(root), "utf-8");
      expect(written).toContain("      - Probe one thing.");
      expect(written).not.toContain("Probe something else entirely");
      // Routing metadata and the document header are copied through untouched.
      expect(written).toContain('schema_version: "1.0"');
      expect(written).toContain("    kind: worker");
      // And the result is a fixed point.
      expect(run(["--check", `--root=${root}`]).status).toBe(0);
    });
  });

  it("fails loudly when the catalog lists an agent with no markdown file", async () => {
    const orphaned = STALE_CATALOG.replace("id: probe-agent", "id: ghost-agent");
    await withFixture(orphaned, AGENT_MD, async (root) => {
      const { status, output } = run([`--root=${root}`]);

      expect(status).toBe(1);
      expect(output).toContain("ghost-agent");
    });
  });

  it("is wired into sync:ssot so ci:gate sees a stale catalog", async () => {
    // The generator alone changes nothing CI inspects. `sync:ssot` mirrors the
    // assets into the root `.qfai/` tree, and `ci:gate` diffs that tree.
    const pkg: unknown = JSON.parse(await readFile(path.join(repoRoot, "package.json"), "utf-8"));
    if (typeof pkg !== "object" || pkg === null || !("scripts" in pkg)) {
      throw new Error("root package.json has no scripts block");
    }
    const scripts: unknown = pkg.scripts;
    if (typeof scripts !== "object" || scripts === null || !("sync:ssot" in scripts)) {
      throw new Error("root package.json has no sync:ssot script");
    }
    expect(scripts["sync:ssot"]).toContain("gen-agent-catalog.mjs");
  });
});
