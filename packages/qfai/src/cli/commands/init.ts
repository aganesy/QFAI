import path from "node:path";
import { access, mkdir, readdir, rm, writeFile } from "node:fs/promises";

import { copyTemplatePaths, copyTemplateTree } from "../lib/fs.js";
import { getInitAssetsDir } from "../lib/assets.js";
import { info } from "../lib/logger.js";

export type InitOptions = {
  dir: string;
  force: boolean;
  dryRun: boolean;
  yes: boolean;
};

export async function runInit(options: InitOptions): Promise<void> {
  const assetsRoot = getInitAssetsDir();
  const rootAssets = path.join(assetsRoot, "root");
  const qfaiAssets = path.join(assetsRoot, ".qfai");
  const assistantAssets = path.join(qfaiAssets, "assistant");

  const destRoot = path.resolve(options.dir);
  const destQfai = path.join(destRoot, ".qfai");

  if (options.force) {
    info(
      "NOTE: --force は .qfai/assistant/skills/** と wrapper assets（.claude/.github/.codex）を上書きし、legacy 10_workflow.md を削除します（skills.local は保護され、specs/contracts 等は上書きしません）。",
    );
  }

  // v1.3.15:
  // - root/ と .qfai/ は create-only（既存は skip）
  // - assistant/skills のみ --force で上書きする
  const rootResult = await copyTemplateTree(rootAssets, destRoot, {
    force: false,
    dryRun: options.dryRun,
    conflictPolicy: "skip",
  });
  const qfaiResult = await copyTemplateTree(qfaiAssets, destQfai, {
    force: false,
    dryRun: options.dryRun,
    conflictPolicy: "skip",
    protect: ["assistant/skills.local"],
    exclude: ["assistant/skills"],
  });
  const skillsResult = await copyTemplatePaths(
    qfaiAssets,
    destQfai,
    ["assistant/skills"],
    {
      force: options.force,
      dryRun: options.dryRun,
      conflictPolicy: "skip",
      protect: ["assistant/skills.local"],
    },
  );
  const wrappersResult = await syncIntegrationWrappers(
    assistantAssets,
    destRoot,
    {
      force: options.force,
      dryRun: options.dryRun,
    },
  );
  const removedLegacySkills = options.force
    ? await pruneLegacySkillFiles(destRoot, options.dryRun)
    : [];
  const removed = [...removedLegacySkills, ...wrappersResult.removed];

  report(
    [
      ...rootResult.copied,
      ...qfaiResult.copied,
      ...skillsResult.copied,
      ...wrappersResult.copied,
    ],
    [
      ...rootResult.skipped,
      ...qfaiResult.skipped,
      ...skillsResult.skipped,
      ...wrappersResult.skipped,
    ],
    removed,
    options.dryRun,
    "init",
    destRoot,
  );
}

function report(
  copied: string[],
  skipped: string[],
  removed: string[],
  dryRun: boolean,
  label: string,
  baseDir: string,
): void {
  info(`qfai ${label}: ${dryRun ? "dry-run" : "done"}`);
  if (copied.length > 0) {
    info(`  created: ${copied.length}`);
  }
  if (skipped.length > 0) {
    info(`  skipped: ${skipped.length}`);
    info("  skipped paths:");
    for (const skippedPath of skipped) {
      const relative = path.relative(baseDir, skippedPath);
      info(`    - ${relative}`);
    }
  }
  if (removed.length > 0) {
    info(
      `  ${dryRun ? "would remove legacy files" : "removed legacy files"}: ${removed.length}`,
    );
    info(`${dryRun ? "  would remove paths:" : "  removed paths:"}`);
    for (const removedPath of removed) {
      const relative = path.relative(baseDir, removedPath);
      info(`    - ${relative}`);
    }
  }
}

async function pruneLegacySkillFiles(
  destRoot: string,
  dryRun: boolean,
): Promise<string[]> {
  const roots = [path.join(destRoot, ".qfai", "assistant", "skills")];

  const legacyFiles: string[] = [];
  for (const root of roots) {
    const found = await collectLegacyWorkflowFiles(root);
    legacyFiles.push(...found);
  }

  if (!dryRun) {
    for (const file of legacyFiles) {
      await rm(file, { force: true });
    }
  }

  return legacyFiles;
}

async function collectLegacyWorkflowFiles(dir: string): Promise<string[]> {
  if (!(await exists(dir))) {
    return [];
  }

  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await collectLegacyWorkflowFiles(fullPath);
      files.push(...nested);
      continue;
    }
    if (entry.isFile() && entry.name === "10_workflow.md") {
      files.push(fullPath);
    }
  }

  return files;
}

async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

type WrapperSyncOptions = {
  force: boolean;
  dryRun: boolean;
};

type WrapperEntry = {
  relativePath: string;
  body: string;
};

type SyncResult = {
  copied: string[];
  skipped: string[];
  removed: string[];
};

async function syncIntegrationWrappers(
  assistantAssetsDir: string,
  destRoot: string,
  options: WrapperSyncOptions,
): Promise<SyncResult> {
  const skills = await collectCanonicalSkillIds(assistantAssetsDir);
  const agents = await collectCanonicalAgentNames(assistantAssetsDir);
  const entries = buildWrapperEntries(skills, agents);

  const copied: string[] = [];
  const skipped: string[] = [];
  const removed = options.force
    ? await pruneStaleQfaiWrappers(destRoot, skills, options.dryRun)
    : [];

  for (const entry of entries) {
    const destination = path.join(destRoot, ...entry.relativePath.split("/"));
    const alreadyExists = await exists(destination);
    if (alreadyExists && !options.force) {
      skipped.push(destination);
      continue;
    }

    copied.push(destination);
    if (options.dryRun) {
      continue;
    }

    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, entry.body, "utf-8");
  }

  return { copied, skipped, removed };
}

async function collectCanonicalSkillIds(
  assistantAssetsDir: string,
): Promise<string[]> {
  const skillsDir = path.join(assistantAssetsDir, "skills");
  if (!(await exists(skillsDir))) {
    return [];
  }

  const entries = await readdir(skillsDir, { withFileTypes: true });
  const skills: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const skillDoc = path.join(skillsDir, entry.name, "SKILL.md");
    if (await exists(skillDoc)) {
      skills.push(entry.name);
    }
  }

  return skills.sort();
}

async function collectCanonicalAgentNames(
  assistantAssetsDir: string,
): Promise<string[]> {
  const agentsDir = path.join(assistantAssetsDir, "agents");
  if (!(await exists(agentsDir))) {
    return [];
  }

  const entries = await readdir(agentsDir, { withFileTypes: true });
  const names: string[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    if (!entry.name.endsWith(".md") || entry.name === "README.md") {
      continue;
    }
    names.push(entry.name.slice(0, -".md".length));
  }

  return names.sort();
}

function buildWrapperEntries(
  skills: string[],
  agents: string[],
): WrapperEntry[] {
  const entries: WrapperEntry[] = [
    {
      relativePath: ".codex/README.md",
      body: buildCodexReadme(),
    },
    {
      relativePath: ".claude/agents/README.md",
      body: buildClaudeAgentsReadme(),
    },
    {
      relativePath: ".github/agents/README.md",
      body: buildGithubAgentsReadme(),
    },
    {
      relativePath: ".github/copilot-instructions.md",
      body: buildCopilotInstructions(),
    },
  ];

  for (const skillId of skills) {
    entries.push({
      relativePath: `.claude/commands/${skillId}.md`,
      body: buildClaudeCommandWrapper(skillId),
    });
    entries.push({
      relativePath: `.github/prompts/${skillId}.prompt.md`,
      body: buildGithubPromptWrapper(skillId),
    });
    entries.push({
      relativePath: `.codex/skills/${skillId}/SKILL.md`,
      body: buildCodexSkillWrapper(skillId),
    });
  }

  for (const agentName of agents) {
    entries.push({
      relativePath: `.claude/agents/${agentName}.md`,
      body: buildClaudeAgentWrapper(agentName),
    });
    entries.push({
      relativePath: `.github/agents/${agentName}.agent.md`,
      body: buildGithubAgentWrapper(agentName),
    });
  }

  return entries;
}

async function pruneStaleQfaiWrappers(
  destRoot: string,
  canonicalSkills: string[],
  dryRun: boolean,
): Promise<string[]> {
  const canonical = new Set(canonicalSkills);
  const removed: string[] = [];

  const claudeCommandsDir = path.join(destRoot, ".claude", "commands");
  if (await exists(claudeCommandsDir)) {
    const entries = await readdir(claudeCommandsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) {
        continue;
      }
      if (!entry.name.startsWith("qfai-") || !entry.name.endsWith(".md")) {
        continue;
      }
      const skillId = entry.name.slice(0, -".md".length);
      if (canonical.has(skillId)) {
        continue;
      }
      const target = path.join(claudeCommandsDir, entry.name);
      removed.push(target);
      if (!dryRun) {
        await rm(target, { force: true });
      }
    }
  }

  const githubPromptsDir = path.join(destRoot, ".github", "prompts");
  if (await exists(githubPromptsDir)) {
    const entries = await readdir(githubPromptsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) {
        continue;
      }
      if (
        !entry.name.startsWith("qfai-") ||
        !entry.name.endsWith(".prompt.md")
      ) {
        continue;
      }
      const skillId = entry.name.slice(0, -".prompt.md".length);
      if (canonical.has(skillId)) {
        continue;
      }
      const target = path.join(githubPromptsDir, entry.name);
      removed.push(target);
      if (!dryRun) {
        await rm(target, { force: true });
      }
    }
  }

  const codexSkillsDir = path.join(destRoot, ".codex", "skills");
  if (await exists(codexSkillsDir)) {
    const entries = await readdir(codexSkillsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      if (!entry.name.startsWith("qfai-")) {
        continue;
      }
      if (canonical.has(entry.name)) {
        continue;
      }
      const target = path.join(codexSkillsDir, entry.name);
      removed.push(target);
      if (!dryRun) {
        await rm(target, { recursive: true, force: true });
      }
    }
  }

  return removed;
}

function buildCodexReadme(): string {
  return [
    "# QFAI Codex skills",
    "",
    "This directory provides thin Codex skill wrappers for QFAI.",
    "",
    "## Canonical entrypoint",
    "",
    "Codex skill wrappers must point to QFAI's canonical skill documents under:",
    "",
    "- .qfai/assistant/skills/",
    "",
    "These canonical skill documents are the SSOT.",
    "Tool integrations must reference `.qfai/assistant/skills/`.",
    "",
    "## Usage",
    "",
    "In Codex CLI, select a skill by name (e.g., `qfai-configure`) and provide your request.",
    "All outputs must match the user's language.",
    "",
  ].join("\n");
}

function buildClaudeAgentsReadme(): string {
  return [
    "# QFAI Claude agents",
    "",
    "This directory provides thin Claude Code agent wrappers for QFAI.",
    "",
    "## Canonical entrypoint",
    "",
    "All wrappers must point to:",
    "",
    "- .qfai/assistant/agents/",
    "",
    "Use these wrappers as entrypoints and keep canonical behavior in `.qfai/assistant/agents/**`.",
    "",
  ].join("\n");
}

function buildGithubAgentsReadme(): string {
  return [
    "# QFAI GitHub agents",
    "",
    "This directory provides thin GitHub Copilot custom agent wrappers for QFAI.",
    "",
    "## Canonical entrypoint",
    "",
    "All wrappers must point to:",
    "",
    "- .qfai/assistant/agents/",
    "",
    "Use these wrappers as entrypoints and keep canonical behavior in `.qfai/assistant/agents/**`.",
    "",
  ].join("\n");
}

function buildCopilotInstructions(): string {
  return [
    "# QFAI repository instructions (Copilot)",
    "",
    "This repository uses QFAI (Quality-First AI) to improve the quality and consistency of AI-assisted development.",
    "",
    "## Golden rules",
    "",
    "- Always match the user’s language in your outputs.",
    "- Treat `.qfai/` as the canonical source of truth for the QFAI workflow:",
    "  - Skills (SSOT): `.qfai/assistant/skills/`",
    "  - Instructions: `.qfai/assistant/instructions/`",
    "  - Project steering: `.qfai/assistant/steering/`",
    "- When asked to perform QFAI workflow tasks, prefer using the QFAI prompt wrappers in `.github/prompts/`.",
    "  - These wrappers forward to `.qfai/assistant/skills/<skill-name>/SKILL.md`.",
    "- Do not invent repository structure, tools, or frameworks. Inspect the repo first and align with what is already used.",
    "- Keep changes minimal and targeted. Update tests and docs when behavior changes.",
    "",
  ].join("\n");
}

function buildClaudeCommandWrapper(skillId: string): string {
  return [
    "---",
    `description: "QFAI: ${skillId}"`,
    'argument-hint: "[optional notes]"',
    "---",
    "",
    "Follow the canonical QFAI skill document exactly:",
    `@.qfai/assistant/skills/${skillId}/SKILL.md`,
    "",
    "Follow the DoD/Checkpoints in the skill document.",
    "Use the repository as the source of truth.",
    "",
    "Additional user notes: $ARGUMENTS",
    "",
    "Critical: output must match the user's language.",
    "",
  ].join("\n");
}

function buildGithubPromptWrapper(skillId: string): string {
  return [
    "---",
    'agent: "agent"',
    `description: "QFAI: ${skillId}"`,
    "---",
    "",
    "You are operating in a repository that uses QFAI.",
    "",
    "1. Open and follow the canonical QFAI skill:",
    "",
    `- .qfai/assistant/skills/${skillId}/SKILL.md`,
    "",
    "2. Use the repository as the source of truth (tools, frameworks, directory structure).",
    "3. Ask the user for missing inputs only when necessary.",
    "4. Do not modify files not required by the canonical skill.",
    "5. All outputs must match the user's language.",
    "",
    "User notes: ${input:notes:Optional}",
    "",
  ].join("\n");
}

function buildCodexSkillWrapper(skillId: string): string {
  return [
    "---",
    `name: "${skillId}"`,
    `description: "QFAI: ${skillId} (Codex skill wrapper)"`,
    "---",
    "",
    `# ${skillId}`,
    "",
    "This skill is a thin wrapper that forwards to the canonical QFAI skill in this repository:",
    "",
    `- .qfai/assistant/skills/${skillId}/SKILL.md`,
    "",
    "How to invoke (Codex CLI):",
    "",
    `- Select the \`${skillId}\` skill, or reference it by name and provide your request.`,
    "",
    "Instructions:",
    "",
    "1. Read the skill document above and follow it precisely.",
    "2. Use the repository as the source of truth (tools, frameworks, directory structure).",
    "3. Ensure all outputs match the user's language.",
    "",
  ].join("\n");
}

function buildClaudeAgentWrapper(agentName: string): string {
  const title = formatDisplayName(agentName);
  return [
    `# ${title} (Claude Code wrapper)`,
    "",
    "## Purpose",
    "",
    `This is a thin wrapper for Claude Code agents. The canonical role card lives in .qfai/assistant/agents/${agentName}.md.`,
    "",
    "## Rules",
    "",
    "- Always follow the .qfai role card and instructions first.",
    "- If this file conflicts with .qfai, the .qfai content wins.",
    "- Do not proceed without reading the role card.",
    "",
    "## Minimal steps",
    "",
    `1. Read .qfai/assistant/agents/${agentName}.md and follow its output format.`,
    "2. Use .qfai/assistant/steering/ and .qfai/assistant/instructions/ as required context.",
    "3. List unknowns as Open Questions; do not mix them with decisions.",
    "",
  ].join("\n");
}

function buildGithubAgentWrapper(agentName: string): string {
  const title = formatDisplayName(agentName);
  return [
    `# ${title} (GitHub Copilot Custom wrapper)`,
    "",
    "## Purpose",
    "",
    `This is a thin wrapper for GitHub Copilot Custom agents. The canonical role card lives in .qfai/assistant/agents/${agentName}.md.`,
    "",
    "## Rules",
    "",
    "- Always follow the .qfai role card and instructions first.",
    "- If this file conflicts with .qfai, the .qfai content wins.",
    "- Do not proceed without reading the role card.",
    "",
    "## Minimal steps",
    "",
    `1. Read .qfai/assistant/agents/${agentName}.md and follow its output format.`,
    "2. Use .qfai/assistant/steering/ and .qfai/assistant/instructions/ as required context.",
    "3. List unknowns as Open Questions; do not mix them with decisions.",
    "",
  ].join("\n");
}

function formatDisplayName(raw: string): string {
  return raw
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
