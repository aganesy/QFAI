import { lstat, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { parse as parseTOML } from "smol-toml";
import { parse as parseYaml } from "yaml";
import { afterEach, describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import {
  CODEX_AGENT_WRAPPER_DIR,
  CODEX_AGENT_WRAPPER_SUFFIX,
  buildCodexAgentToml,
  escapeTomlBasicString,
  parseAgentCatalogKinds,
  renderCodexAgentToml,
} from "../../src/core/codexAgentToml.js";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const templateAgentsDir = path.join(
  repoRoot,
  "packages",
  "qfai",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "agents",
);
const templateCatalogPath = path.join(
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
  "description: Reviews a change against this project's own house style.",
  "tools:",
  "  - Read",
  "  - Grep",
  "---",
  "",
  `# ${PROJECT_AGENT_ID}`,
  "",
  "## Mission",
  "",
  "- Hold the project's house style.",
  "",
].join("\n");

function projectCatalogPath(root: string): string {
  return path.join(root, ".qfai", "assistant", "manifest", "agent-catalog.yml");
}

async function readProjectCatalog(root: string): Promise<string> {
  return (await readFile(projectCatalogPath(root), "utf-8")).replace(/\r\n/g, "\n");
}

async function writeProjectCatalog(root: string, content: string): Promise<void> {
  await writeFile(projectCatalogPath(root), content, "utf-8");
}

async function addProjectAgent(root: string, kind: "worker" | "reviewer"): Promise<void> {
  await writeFile(
    path.join(root, ".qfai", "assistant", "agents", `${PROJECT_AGENT_ID}.md`),
    PROJECT_AGENT_MARKDOWN,
    "utf-8",
  );
  const catalog = await readProjectCatalog(root);
  await writeProjectCatalog(
    root,
    `${catalog.replace(/\n*$/, "\n")}  - id: ${PROJECT_AGENT_ID}\n    kind: ${kind}\n`,
  );
}

afterEach(async () => {
  while (createdRoots.length > 0) {
    const root = createdRoots.pop();
    if (root === undefined) continue;
    await rm(root, { recursive: true, force: true });
  }
});

// The defect: nothing shipped a `.codex/agents/` tree and `init` generated no
// TOML, so a project that installed qfai got Claude and GitHub agent wrappers
// and Codex got nothing — including after `qfai init --force`, the documented
// way to pull agent corrections in.
describe("qfai init generates the Codex agent profiles", { timeout: 60000 }, () => {
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
    const catalog = parseAgentCatalogKinds(await readFile(templateCatalogPath, "utf-8"));
    expect(catalog.size).toBeGreaterThan(0);

    for (const [name, kind] of catalog) {
      const raw = await readFile(codexAgentPath(root, name), "utf-8");
      const profile = parseTomlDocument(raw);
      expect(profile["name"], `${name}: name`).toBe(name);

      const canonical = await readFile(
        path.join(root, ".qfai", "assistant", "agents", `${name}.md`),
        "utf-8",
      );
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

    // `--force` regenerates `assistant/agents/**`; the Codex profile is a
    // snapshot of exactly that, so it has to come along.
    await runInit({ dir: root, force: true, dryRun: false, yes: true });
    expect(await readFile(target, "utf-8")).toBe(generated);
  });

  // A project's own agent is a supported declaration — `validateAgentDefinition`
  // accepts a catalog entry plus a canonical markdown file, and `--force` keeps
  // both. Enumerating the shipped assets alone left it with the same
  // one-integration-behind split this step exists to close.
  it("generates a profile for a project's own agent, and drops it once the catalog stops classifying it", async () => {
    const root = await initProject();
    await addProjectAgent(root, "reviewer");

    await runInit({ dir: root, force: true, dryRun: false, yes: true });
    const generated = await readFile(codexAgentPath(root, PROJECT_AGENT_ID), "utf-8");
    const profile = parseTomlDocument(generated);
    expect(profile["name"]).toBe(PROJECT_AGENT_ID);
    expect(profile["sandbox_mode"]).toBe("read-only");

    // Its classification is gone, so the profile cannot be regenerated. Leaving
    // the old one behind would keep Codex loading an agent whose write access
    // nothing can vouch for any more.
    const catalog = await readProjectCatalog(root);
    await writeProjectCatalog(
      root,
      catalog.replace(
        `  - id: ${PROJECT_AGENT_ID}\n    kind: reviewer\n`,
        `  - id: ${PROJECT_AGENT_ID}\n`,
      ),
    );
    await runInit({ dir: root, force: true, dryRun: false, yes: true });
    await expect(readFile(codexAgentPath(root, PROJECT_AGENT_ID), "utf-8")).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  // `assistant/manifest/**` is create-only, so a project initialised by an older
  // release keeps its catalog verbatim. Reading only that copy left every agent
  // a later release added permanently un-classified and its profile never written.
  it("classifies an agent the project's own catalog never heard of", async () => {
    const root = await initProject();
    const catalog = await readProjectCatalog(root);
    await writeProjectCatalog(
      root,
      catalog.replace("  - id: doc-steward\n    kind: worker\n", "  - id: doc-steward\n"),
    );
    await rm(codexAgentPath(root, "doc-steward"), { force: true });

    await runInit({ dir: root, force: true, dryRun: false, yes: true });
    const rendered = renderCodexAgentToml(
      await readFile(path.join(root, ".qfai", "assistant", "agents", "doc-steward.md"), "utf-8"),
      "worker",
    );
    expect(rendered.ok).toBe(true);
    if (!rendered.ok) return;
    const written = await readFile(codexAgentPath(root, "doc-steward"), "utf-8");
    expect(written.replace(/\r\n/g, "\n")).toBe(rendered.toml);
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
      ["---", "name: demo", 'description: "d"', "tools: [Read]", "---", "", "# Demo", ""].join(
        "\n",
      ),
      "worker",
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
        "tools: [Read]",
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
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const parsed = parseTomlDocument(result.toml);
    expect(parsed["developer_instructions"]).toBe("## Mission\n\n- Do the thing.");
    expect(parsed["description"]).toBe("Keep the ## Mission section short");
  });

  it("drops catalog entries that declare no usable kind", () => {
    const kinds = parseAgentCatalogKinds(
      ["agents:", "  - id: good", "    kind: reviewer", "  - id: bad", "    kind: helper", ""].join(
        "\n",
      ),
    );
    expect([...kinds]).toEqual([["good", "reviewer"]]);
  });
});

// The checked-in `.codex/agents/*.toml` are generator output from now on, not a
// hand-maintained tree: an edit that lands in the canonical markdown and not
// here (or the reverse) fails this.
describe("this repository's own Codex profiles", () => {
  it("match what the generator produces from the canonical agents", async () => {
    const kinds = parseAgentCatalogKinds(
      await readFile(
        path.join(repoRoot, ".qfai", "assistant", "manifest", "agent-catalog.yml"),
        "utf-8",
      ),
    );
    expect(kinds.size).toBeGreaterThan(0);

    for (const [name, kind] of kinds) {
      const canonical = await readFile(
        path.join(repoRoot, ".qfai", "assistant", "agents", `${name}.md`),
        "utf-8",
      );
      const rendered = renderCodexAgentToml(canonical, kind);
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
