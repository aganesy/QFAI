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

  it("compares a block written with a chomping indicator", async () => {
    // `|-` and `|+` are valid YAML for the same block. A generator that only
    // recognises a bare `|` would skip the entry outright and then report a
    // stale catalog as up to date.
    const chomped = STALE_CATALOG.replace(
      "developer_instructions: |",
      "developer_instructions: |-",
    );
    await withFixture(chomped, AGENT_MD, async (root) => {
      expect(run(["--check", `--root=${root}`]).status).toBe(1);
      expect(run([`--root=${root}`]).status).toBe(0);

      const written = await readFile(fixtureCatalog(root), "utf-8");
      expect(written).toContain("      - Probe one thing.");
      expect(written).not.toContain("Probe something else entirely");
    });
  });

  it("fails on a developer_instructions form it cannot generate", async () => {
    // Silently skipping a quoted or folded value would leave that entry
    // uncompared forever; the drift guard must not have a quiet blind spot.
    const folded = STALE_CATALOG.replace(
      /developer_instructions: \|[\s\S]*$/,
      'developer_instructions: "## Mission"\n',
    );
    await withFixture(folded, AGENT_MD, async (root) => {
      const { status, output } = run([`--root=${root}`]);

      expect(status).toBe(1);
      expect(output).toContain("developer_instructions");
    });
  });

  it("accepts the one explicit indentation indicator it can write", async () => {
    // `|2` is exactly BODY_INDENT — two columns past the key — so the
    // regenerated block is valid YAML for the same content.
    const indented = STALE_CATALOG.replace(
      "developer_instructions: |",
      "developer_instructions: |2",
    );
    await withFixture(indented, AGENT_MD, async (root) => {
      expect(run([`--root=${root}`]).status).toBe(0);

      const written = await readFile(fixtureCatalog(root), "utf-8");
      expect(written).toContain("      - Probe one thing.");
      expect(run(["--check", `--root=${root}`]).status).toBe(0);
    });
  });

  it("fails on an indentation indicator the generated body would contradict", async () => {
    // The body is always written at six columns. `|1` would give every line a
    // stray leading space and `|3` an outright invalid block, and both used to
    // sail through a re-run of `--check`.
    for (const indicator of ["|1", "|3"]) {
      const mismatched = STALE_CATALOG.replace(
        "developer_instructions: |",
        `developer_instructions: ${indicator}`,
      );
      await withFixture(mismatched, AGENT_MD, async (root) => {
        const { status, output } = run([`--root=${root}`]);

        expect(status, `${indicator} must not be rewritten`).toBe(1);
        expect(output).toContain("developer_instructions");
      });
    }
  });

  it("reads the entry id from a line carrying a comment", async () => {
    // An unrecognised `- id:` line used to leave currentId on the previous
    // agent, overwriting this entry's block with that agent's body.
    const commented = STALE_CATALOG.replace(
      "- id: probe-agent",
      "- id: probe-agent # the only agent",
    );
    await withFixture(commented, AGENT_MD, async (root) => {
      expect(run([`--root=${root}`]).status).toBe(0);

      const written = await readFile(fixtureCatalog(root), "utf-8");
      expect(written).toContain("- id: probe-agent # the only agent");
      expect(written).toContain("      - Probe one thing.");
      expect(written).not.toContain("Probe something else entirely");
    });
  });

  it("fails on an entry boundary whose id it cannot read", async () => {
    const unreadable = STALE_CATALOG.replace("- id: probe-agent", "- name: probe-agent");
    await withFixture(unreadable, AGENT_MD, async (root) => {
      const { status, output } = run([`--root=${root}`]);

      expect(status).toBe(1);
      expect(output).toContain("id");
    });
  });

  it("slices at the ## Mission heading line, not at any mention of it", async () => {
    // A frontmatter description that names the section used to win the
    // `indexOf`, dragging the frontmatter and the title into the block.
    const chatty = AGENT_MD.replace('"Probe."', '"See ## Mission below."');
    await withFixture(STALE_CATALOG, chatty, async (root) => {
      expect(run([`--root=${root}`]).status).toBe(0);

      const written = await readFile(fixtureCatalog(root), "utf-8");
      expect(written).toContain("      ## Mission");
      expect(written).not.toContain("name: probe-agent");
      expect(written).not.toContain("# Probe Agent");
    });
  });

  it("resolves its own repository root through a path that needs URL encoding", async () => {
    // `new URL(...).pathname` percent-encodes a space, so a checkout under
    // "review path/" pointed the script at a directory that does not exist.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-gen agent-"));
    try {
      const assistant = fixtureAssistant(root);
      await mkdir(path.join(assistant, "manifest"), { recursive: true });
      await mkdir(path.join(assistant, "agents"), { recursive: true });
      await mkdir(path.join(root, "scripts"), { recursive: true });
      await writeFile(fixtureCatalog(root), STALE_CATALOG, "utf-8");
      await writeFile(path.join(assistant, "agents", "probe-agent.md"), AGENT_MD, "utf-8");
      const relocated = path.join(root, "scripts", "gen-agent-catalog.mjs");
      await writeFile(relocated, await readFile(SCRIPT, "utf-8"), "utf-8");

      // No --root: the script must find the fixture from its own location.
      const result = spawnSync("node", [relocated, "--check"], { cwd: root, encoding: "utf-8" });

      expect((result.stdout ?? "") + (result.stderr ?? "")).toContain("STALE:");
      expect(result.status).toBe(1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
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
