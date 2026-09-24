import { spawnSync } from "node:child_process";
import { lstat, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { parse as parseTOML } from "smol-toml";
import { parse as parseYaml } from "yaml";
import { afterEach, describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import {
  CODEX_AGENT_WRAPPER_DIR,
  CODEX_AGENT_WRAPPER_SUFFIX,
  CODEX_AGENT_GENERATED_MARKER,
  buildCodexAgentToml,
  escapeTomlBasicString,
  isGeneratedCodexAgentToml,
  parseAgentCardKind,
  renderCodexAgentToml,
} from "../../src/core/codexAgentToml.js";
import { captureStdout } from "../helpers/stdout.js";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const templateAgentsDir = path.join(
  repoRoot,
  "packages",
  "qfai",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "agent",
);

const createdRoots: string[] = [];

async function initProject(options?: { force?: boolean }): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-codex-agents-"));
  createdRoots.push(root);
  await runInit({ dir: root, force: options?.force ?? false, dryRun: false, yes: true });
  return root;
}

function codexAgentPath(root: string, name: string): string {
  return path.join(
    root,
    ...CODEX_AGENT_WRAPPER_DIR.split("/"),
    `${name}${CODEX_AGENT_WRAPPER_SUFFIX}`,
  );
}

function parseTomlDocument(raw: string): Record<string, unknown> {
  const parsed = parseTOML(raw);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("expected the Codex profile to parse as a TOML table");
  }
  return parsed;
}

async function canonicalAgentNames(): Promise<string[]> {
  const entries = await readdir(templateAgentsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md") && entry.name !== "README.md")
    .map((entry) => entry.name.slice(0, -".md".length))
    .sort();
}

/** An agent a project declared for itself — not part of the shipped roster. */
const PROJECT_AGENT_ID = "house-style-reviewer";

const PROJECT_AGENT_MARKDOWN = [
  "---",
  `name: ${PROJECT_AGENT_ID}`,
  "kind: reviewer",
  "description: Reviews a change against this project's own house style.",
  "tools:",
  "  - Read",
  "  - Grep",
  "domain: test",
  "mission: test",
  "replaces: []",
  "owned_artifacts: []",
  "tool_profile: standard",
  "permission_profile: default",
  "specialization_tags: []",
  "---",
  "",
  `# ${PROJECT_AGENT_ID}`,
  "",
  "## Mission",
  "",
  "- Hold the project's house style.",
  "",
].join("\n");

async function addProjectAgent(root: string, kind: "worker" | "reviewer"): Promise<void> {
  await writeFile(
    path.join(root, ".qfai", "assistant", "agent", `${PROJECT_AGENT_ID}.md`),
    PROJECT_AGENT_MARKDOWN.replace("kind: reviewer", `kind: ${kind}`),
    "utf-8",
  );
}

afterEach(async () => {
  while (createdRoots.length > 0) {
    const root = createdRoots.pop();
    if (root === undefined) continue;
    await rm(root, { recursive: true, force: true });
  }
});

// QFAI:EX-0001-0025-03
// The defect: nothing shipped a `.codex/agents/` tree and `init` generated no
// TOML, so a project that installed qfai got Claude and GitHub agent wrappers
// and Codex got nothing — including after `qfai init --force`, the documented
// way to pull agent corrections in.
describe("qfai init generates the Codex agent profiles", () => {
  it("writes one TOML per canonical agent", async () => {
    const root = await initProject();
    const expected = await canonicalAgentNames();
    expect(expected.length).toBeGreaterThan(0);

    const written = (await readdir(path.join(root, ...CODEX_AGENT_WRAPPER_DIR.split("/"))))
      .filter((name) => name.endsWith(CODEX_AGENT_WRAPPER_SUFFIX))
      .sort();
    expect(written).toEqual(expected.map((name) => `${name}${CODEX_AGENT_WRAPPER_SUFFIX}`));
  });

  it("carries the canonical body, frontmatter metadata and the reviewer sandbox", async () => {
    const root = await initProject();
    for (const name of await canonicalAgentNames()) {
      const raw = await readFile(codexAgentPath(root, name), "utf-8");
      const profile = parseTomlDocument(raw);
      expect(profile["name"], `${name}: name`).toBe(name);

      const canonical = await readFile(
        path.join(root, ".qfai", "assistant", "agent", `${name}.md`),
        "utf-8",
      );
      const kind = parseAgentCardKind(canonical, name);
      expect(kind, `${name}: kind`).not.toBeNull();
      const frontmatter = canonical.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1] ?? "";
      const parsedFrontmatter: unknown = parseYaml(frontmatter);
      const description =
        typeof parsedFrontmatter === "object" && parsedFrontmatter !== null
          ? Reflect.get(parsedFrontmatter, "description")
          : undefined;
      expect(profile["description"], `${name}: description`).toBe(description);

      const body = canonical.slice(canonical.indexOf("## Mission")).replace(/\r\n/g, "\n").trim();
      expect(profile["developer_instructions"], `${name}: developer_instructions`).toBe(body);

      if (kind === "reviewer") {
        expect(profile["sandbox_mode"], `${name}: reviewer sandbox`).toBe("read-only");
      } else {
        expect("sandbox_mode" in profile, `${name}: worker must not pin a sandbox`).toBe(false);
      }
    }
  });

  it("leaves an existing profile alone, and --force regenerates the stale one", async () => {
    const root = await initProject();
    const target = codexAgentPath(root, "qa-gatekeeper");
    const generated = await readFile(target, "utf-8");

    // A profile written by an older release: `init` alone must not clobber it,
    // because a generated wrapper and a project's own edit are the same bytes
    // to the filesystem.
    await writeFile(target, 'name = "qa-gatekeeper"\ndescription = "stale"\n', "utf-8");
    await runInit({ dir: root, force: false, dryRun: false, yes: true });
    expect(await readFile(target, "utf-8")).toContain('description = "stale"');

    // `--force` regenerates `assistant/agent/**`; the Codex profile is a
    // snapshot of exactly that, so it has to come along.
    await runInit({ dir: root, force: true, dryRun: false, yes: true });
    expect(await readFile(target, "utf-8")).toBe(generated);
  });

  it("uses a project's agent card and refuses one with an invalid kind", async () => {
    const root = await initProject();
    await addProjectAgent(root, "reviewer");
    await runInit({ dir: root, force: true, dryRun: false, yes: true });
    const profile = parseTomlDocument(
      await readFile(codexAgentPath(root, PROJECT_AGENT_ID), "utf-8"),
    );
    expect(profile["sandbox_mode"]).toBe("read-only");

    const card = path.join(root, ".qfai", "assistant", "agent", PROJECT_AGENT_ID + ".md");
    await writeFile(
      card,
      PROJECT_AGENT_MARKDOWN.replace("kind: reviewer", "kind: helper"),
      "utf-8",
    );
    const output = await captureStdout(async () => {
      await runInit({ dir: root, force: true, dryRun: false, yes: true });
    });
    expect(output).toContain("has no valid kind");
    await expect(readFile(codexAgentPath(root, PROJECT_AGENT_ID), "utf-8")).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  // The generated profile is a self-contained snapshot, not a symlink that goes
  // dangling with its referent, so an agent deleted from `assistant/agent/`
  // kept working in Codex — and only in Codex.
  it("--force prunes the profile of an agent that left the roster, keeping hand-written ones", async () => {
    const root = await initProject();
    await addProjectAgent(root, "worker");
    await runInit({ dir: root, force: true, dryRun: false, yes: true });
    expect(await readFile(codexAgentPath(root, PROJECT_AGENT_ID), "utf-8")).toContain(
      PROJECT_AGENT_ID,
    );

    // `.codex/agents/` is not qfai's alone: a project may keep its own Codex
    // profiles beside the generated ones. This one is written the way anybody
    // would write a minimal worker — `name`, `description`,
    // `developer_instructions`, three single-line basic strings — which is
    // exactly the shape the generator emits, so shape alone could not tell them
    // apart and `--force` deleted it.
    const handWritten = codexAgentPath(root, "team-scribe");
    await writeFile(
      handWritten,
      'name = "team-scribe"\ndescription = "ours"\ndeveloper_instructions = "Write it down."\n',
      "utf-8",
    );

    await rm(path.join(root, ".qfai", "assistant", "agent", `${PROJECT_AGENT_ID}.md`), {
      force: true,
    });

    await runInit({ dir: root, force: true, dryRun: false, yes: true });
    await expect(readFile(codexAgentPath(root, PROJECT_AGENT_ID), "utf-8")).rejects.toMatchObject({
      code: "ENOENT",
    });
    expect(await readFile(handWritten, "utf-8")).toContain('description = "ours"');
  });

  // `.codex/agents` is a path the repository controls, and a directory
  // component of it can be a symlink out of the tree. `removeSymlinkAt` only
  // ever looked at the leaf `<name>.toml`, so `mkdir` and `writeFile` followed
  // the parent link and a plain run wrote every profile into somebody else's
  // directory — with `--force` free to prune files there as well.
  it("refuses to write through a symlinked wrapper directory", async () => {
    const root = await initProject();
    const wrapperDir = path.join(root, ...CODEX_AGENT_WRAPPER_DIR.split("/"));
    const outside = path.join(root, "outside-tree");
    await mkdir(outside, { recursive: true });
    const bystander = path.join(outside, "qa-gatekeeper.toml");
    await writeFile(bystander, "untouched\n", "utf-8");

    await rm(wrapperDir, { recursive: true, force: true });
    await symlink(outside, wrapperDir, "dir");

    const output = await captureStdout(async () => {
      await runInit({ dir: root, force: true, dryRun: false, yes: true });
    });
    expect(output).toContain("symlink");
    expect(await readFile(bystander, "utf-8")).toBe("untouched\n");
    expect(await readdir(outside)).toEqual(["qa-gatekeeper.toml"]);
  });

  // `removeSymlinkAt` leaves a real directory alone and the write then failed
  // `EISDIR`, aborting `--force` with the agents sorted before this one already
  // rewritten — the one command for repairing a checkout left a mixed tree.
  it("skips a destination occupied by a directory instead of aborting the run", async () => {
    const root = await initProject();
    const target = codexAgentPath(root, "doc-steward");
    const neighbour = codexAgentPath(root, "qa-gatekeeper");
    await rm(target, { force: true });
    await mkdir(target, { recursive: true });
    await writeFile(neighbour, 'name = "qa-gatekeeper"\ndescription = "stale"\n', "utf-8");

    const output = await captureStdout(async () => {
      await runInit({ dir: root, force: true, dryRun: false, yes: true });
    });
    expect(output).toContain("a directory is in the way");
    expect((await lstat(target)).isDirectory()).toBe(true);
    // The run went on: the agent sorted after the conflict was regenerated.
    expect(await readFile(neighbour, "utf-8")).not.toContain('description = "stale"');
  });

  // A FIFO is the destination that does not fail — `writeFile` on one blocks
  // until a reader appears, so `qfai init --force` stops with no diagnostic
  // and no exit. A socket or a device node fails the way the directory does,
  // mid-run. None of them is generator output.
  it("skips a destination occupied by a FIFO instead of hanging on it", async () => {
    if (process.platform === "win32") {
      return;
    }
    const root = await initProject();
    const target = codexAgentPath(root, "doc-steward");
    const neighbour = codexAgentPath(root, "qa-gatekeeper");
    await rm(target, { force: true });
    const made = spawnSync("mkfifo", [target]);
    if (made.status !== 0) {
      // No `mkfifo` here — nothing for this case to assert.
      return;
    }
    await writeFile(neighbour, 'name = "qa-gatekeeper"\ndescription = "stale"\n', "utf-8");

    const output = await captureStdout(async () => {
      await runInit({ dir: root, force: true, dryRun: false, yes: true });
    });

    expect(output).toContain("a non-regular entry");
    expect((await lstat(target)).isFIFO()).toBe(true);
    // The run went on: the agent sorted after the conflict was regenerated.
    expect(await readFile(neighbour, "utf-8")).not.toContain('description = "stale"');
  });

  // The roster accepts whatever `.qfai/assistant/agent/` holds, symlinks
  // included, so an unbounded `readFile` there was a hang (a FIFO) or an OOM
  // (`/dev/zero`) away.
  it("refuses a canonical document that is not a bounded regular file", async () => {
    const root = await initProject();
    await addProjectAgent(root, "reviewer");
    await runInit({ dir: root, force: true, dryRun: false, yes: true });

    const canonical = path.join(root, ".qfai", "assistant", "agent", `${PROJECT_AGENT_ID}.md`);
    await rm(canonical, { force: true });
    await symlink(path.join(root, ".qfai", "assistant"), canonical, "dir");

    const output = await captureStdout(async () => {
      await runInit({ dir: root, force: true, dryRun: false, yes: true });
    });
    expect(output).toContain("regular file");
    await expect(readFile(codexAgentPath(root, PROJECT_AGENT_ID), "utf-8")).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  // The ceiling is measured on the bytes actually read, not on the size
  // `fstat` reports: a procfs file is a regular file that claims size 0 and
  // then yields as much as it is asked for, so the reported size alone let an
  // unbounded read back in.
  it("refuses a canonical document larger than the read ceiling", async () => {
    const root = await initProject();
    await addProjectAgent(root, "reviewer");

    await writeFile(
      path.join(root, ".qfai", "assistant", "agent", `${PROJECT_AGENT_ID}.md`),
      `${PROJECT_AGENT_MARKDOWN}\n${"x".repeat(5 * 1024 * 1024)}\n`,
      "utf-8",
    );

    const output = await captureStdout(async () => {
      await runInit({ dir: root, force: true, dryRun: false, yes: true });
    });
    expect(output).toContain("byte ceiling");
    await expect(readFile(codexAgentPath(root, PROJECT_AGENT_ID), "utf-8")).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  // `--force` overwrites `assistant/agent/**` from the assets one step before
  // this generator runs — but `--dry-run` only announces that copy. Reading the
  // destination made the preview describe a state the real run replaces.
  it("--force --dry-run previews the profile the real --force writes", async () => {
    const root = await initProject();
    const target = codexAgentPath(root, "qa-gatekeeper");
    const generated = await readFile(target, "utf-8");

    // A stale copy from an older release, missing the heading the renderer
    // needs. `--force` replaces it before the profile is rendered.
    const canonical = path.join(root, ".qfai", "assistant", "agent", "qa-gatekeeper.md");
    const stale = (await readFile(canonical, "utf-8")).replace(/^## Mission\b/m, "## Purpose");
    await writeFile(canonical, stale, "utf-8");

    const preview = await captureStdout(async () => {
      await runInit({ dir: root, force: true, dryRun: true, yes: true });
    });
    expect(preview).not.toContain(`skip: ${target}`);
    expect(await readFile(target, "utf-8")).toBe(generated);

    await runInit({ dir: root, force: true, dryRun: false, yes: true });
    expect(await readFile(target, "utf-8")).toBe(generated);
  });

  // `writeFile` follows a symlink and truncates its referent, so a profile
  // committed as a link turned the documented `--force` refresh into an
  // overwrite of whatever the link pointed at.
  it("--force replaces a symlinked profile instead of writing through it", async () => {
    const root = await initProject();
    const outside = path.join(root, "outside-the-wrapper-tree.txt");
    await writeFile(outside, "untouched\n", "utf-8");

    const target = codexAgentPath(root, "qa-gatekeeper");
    const generated = await readFile(target, "utf-8");
    await rm(target, { force: true });
    await symlink(outside, target, "file");

    await runInit({ dir: root, force: true, dryRun: false, yes: true });
    expect(await readFile(outside, "utf-8")).toBe("untouched\n");
    expect((await lstat(target)).isSymbolicLink()).toBe(false);
    expect(await readFile(target, "utf-8")).toBe(generated);
  });

  it("writes nothing under --dry-run", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-codex-agents-"));
    createdRoots.push(root);
    await runInit({ dir: root, force: false, dryRun: true, yes: true });
    await expect(
      readdir(path.join(root, ...CODEX_AGENT_WRAPPER_DIR.split("/"))),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });
});

describe("the TOML renderer", () => {
  it("escapes the characters that would truncate a basic string", () => {
    expect(escapeTomlBasicString('a "b" \\c\nd\te')).toBe('"a \\"b\\" \\\\c\\nd\\te"');
    expect(escapeTomlBasicString("\u0001")).toBe('"\\u0001"');
  });

  it("round-trips a body containing quotes and backslashes", () => {
    const body = '## Mission\n\n- Read `.qfai/**` and quote "this" \\ that.';
    const toml = buildCodexAgentToml({
      name: "demo",
      description: 'A "demo" agent',
      body,
      kind: "worker",
    });
    const parsed = parseTomlDocument(toml);
    expect(parsed["developer_instructions"]).toBe(body);
    expect(parsed["description"]).toBe('A "demo" agent');
    expect("sandbox_mode" in parsed).toBe(false);
  });

  it("reports a canonical document with no Mission section instead of emitting one", () => {
    const result = renderCodexAgentToml(
      [
        "---",
        "name: demo",
        'description: "d"',
        "kind: worker",
        "tools: [Read]",
        "domain: test",
        "mission: test",
        "replaces: []",
        "owned_artifacts: []",
        "tool_profile: standard",
        "permission_profile: default",
        "specialization_tags: []",
        "---",
        "",
        "# Demo",
        "",
      ].join("\n"),
      "worker",
      "demo",
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("## Mission");
  });

  // `indexOf` matched the first `## Mission` anywhere, and a frontmatter value
  // is allowed to mention one. The body then opened above the closing `---`,
  // and the document still parsed as TOML, so nothing downstream noticed.
  it("starts the body at the heading, not at a frontmatter mention of it", () => {
    const result = renderCodexAgentToml(
      [
        "---",
        "name: demo",
        'description: "Keep the ## Mission section short"',
        "kind: worker",
        "tools: [Read]",
        "domain: test",
        "mission: test",
        "replaces: []",
        "owned_artifacts: []",
        "tool_profile: standard",
        "permission_profile: default",
        "specialization_tags: []",
        "---",
        "",
        "# Demo",
        "",
        "## Mission",
        "",
        "- Do the thing.",
        "",
      ].join("\n"),
      "worker",
      "demo",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const parsed = parseTomlDocument(result.toml);
    expect(parsed["developer_instructions"]).toBe("## Mission\n\n- Do the thing.");
    expect(parsed["description"]).toBe("Keep the ## Mission section short");
  });

  // The slice handed to Codex starts at the `## Mission` heading itself, so it
  // is never empty and the emptiness guard was unreachable: a document that was
  // nothing but its required headings rendered into a valid TOML with no
  // instructions in it.
  it("rejects a Mission section with nothing under the heading", () => {
    const headingsOnly = [
      "---",
      "name: demo",
      'description: "d"',
      "kind: worker",
      "tools: [Read]",
      "domain: test",
      "mission: test",
      "replaces: []",
      "owned_artifacts: []",
      "tool_profile: standard",
      "permission_profile: default",
      "specialization_tags: []",
      "---",
      "",
      "# Demo",
      "",
      "## Mission",
      "",
      "## Operating Rules",
      "",
      "- Something else entirely.",
      "",
    ].join("\n");
    const result = renderCodexAgentToml(headingsOnly, "worker", "demo");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("empty");
  });

  // `foo.md` carrying `name: bar` produced `foo.toml` with `name = "bar"`:
  // Codex reads that as a different agent, and `isGeneratedCodexAgentToml`
  // stops recognising it, so the file could never be pruned either.
  it("refuses a document whose frontmatter name is not the filename", () => {
    const mismatched = [
      "---",
      "name: bar",
      'description: "d"',
      "kind: worker",
      "tools: [Read]",
      "domain: test",
      "mission: test",
      "replaces: []",
      "owned_artifacts: []",
      "tool_profile: standard",
      "permission_profile: default",
      "specialization_tags: []",
      "---",
      "",
      "# Bar",
      "",
      "## Mission",
      "",
      "- Do it.",
      "",
    ].join("\n");
    const result = renderCodexAgentToml(mismatched, "worker", "foo");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("foo");
    expect(renderCodexAgentToml(mismatched, "worker", "bar").ok).toBe(true);
  });

  it("reads the kind from the card frontmatter", () => {
    expect(parseAgentCardKind(PROJECT_AGENT_MARKDOWN, PROJECT_AGENT_ID)).toBe("reviewer");
    expect(
      parseAgentCardKind(
        PROJECT_AGENT_MARKDOWN.replace("kind: reviewer", "kind: helper"),
        PROJECT_AGENT_ID,
      ),
    ).toBeNull();
  });

  it("recognises its own output, and only its own", () => {
    const worker = buildCodexAgentToml({
      name: "demo",
      description: "d",
      body: "## Mission\n\n- Do it.",
      kind: "worker",
    });
    const reviewer = buildCodexAgentToml({
      name: "demo",
      description: "d",
      body: "## Mission\n\n- Read it.",
      kind: "reviewer",
    });
    expect(worker.startsWith(`${CODEX_AGENT_GENERATED_MARKER}\n`)).toBe(true);
    expect(isGeneratedCodexAgentToml(worker, "demo")).toBe(true);
    expect(isGeneratedCodexAgentToml(reviewer, "demo")).toBe(true);
    // A profile whose name disagrees with its filename is not this generator's.
    expect(isGeneratedCodexAgentToml(worker, "other")).toBe(false);
    // The licence to delete is the marker, not the shape: a project's own
    // minimal worker is the same three single-line basic strings.
    expect(
      isGeneratedCodexAgentToml(
        'name = "demo"\ndescription = "d"\ndeveloper_instructions = "x"\n',
        "demo",
      ),
    ).toBe(false);
    expect(
      isGeneratedCodexAgentToml(
        `${CODEX_AGENT_GENERATED_MARKER}\nname = "demo"\nmodel = "o3"\ndescription = "d"\ndeveloper_instructions = "x"\n`,
        "demo",
      ),
    ).toBe(false);
    expect(
      isGeneratedCodexAgentToml(
        `${CODEX_AGENT_GENERATED_MARKER}\nname = "demo"\ndescription = "d"\ndeveloper_instructions = """\nx\n"""\n`,
        "demo",
      ),
    ).toBe(false);
  });
});

// The checked-in `.codex/agents/*.toml` are generator output from now on, not a
// hand-maintained tree: an edit that lands in the canonical markdown and not
// here (or the reverse) fails this.
describe("this repository's own Codex profiles", () => {
  it("preserves first-rung scope and repository-first reuse across all agent copies", async () => {
    const firstRungRoles = [
      "architecture-reviewer",
      "delivery-planner",
      "discovery-analyst",
      "product-experience-architect",
      "orchestrator",
      "requirements-analyst",
      "solution-architect",
    ];
    const reuseRoles = ["backend-engineer", "frontend-engineer", "devops-ci-engineer"];
    const firstRungMeaning =
      /the first rung is this stage's — whether the thing needs to exist\.\s+After a spec row is agreed, that question is a Change Request\./;
    const reuseMeaning =
      /check this codebase before the\s+standard library, native platform features and installed dependencies\.\s+Mark\s+a deliberate shortcut with its ceiling and the condition that lifts it\./;
    for (const [roles, meaning] of [
      [firstRungRoles, firstRungMeaning],
      [reuseRoles, reuseMeaning],
    ] as const) {
      for (const role of roles) {
        for (const directory of [
          templateAgentsDir,
          path.join(repoRoot, ".qfai", "assistant", "agent"),
        ]) {
          expect(await readFile(path.join(directory, `${role}.md`), "utf-8"), role).toMatch(
            meaning,
          );
        }
        const profile = parseTomlDocument(await readFile(codexAgentPath(repoRoot, role), "utf-8"));
        expect(profile["developer_instructions"], `${role}.toml`).toEqual(
          expect.stringMatching(meaning),
        );
      }
    }
  });

  it("match what the generator produces from the canonical agents", async () => {
    const names = await canonicalAgentNames();
    expect(names.length).toBeGreaterThan(0);

    for (const name of names) {
      const canonical = await readFile(
        path.join(repoRoot, ".qfai", "assistant", "agent", `${name}.md`),
        "utf-8",
      );
      const kind = parseAgentCardKind(canonical, name);
      expect(kind, `${name}: kind`).not.toBeNull();
      if (kind === null) continue;
      const rendered = renderCodexAgentToml(canonical, kind, name);
      expect(rendered.ok, `${name}: canonical markdown did not render`).toBe(true);
      if (!rendered.ok) continue;
      const checkedIn = await readFile(
        path.join(repoRoot, ".codex", "agents", `${name}.toml`),
        "utf-8",
      );
      expect(checkedIn.replace(/\r\n/g, "\n"), `${name}.toml is not generator output`).toBe(
        rendered.toml,
      );
    }
  });
});
