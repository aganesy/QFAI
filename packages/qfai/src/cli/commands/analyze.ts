import { readFile } from "node:fs/promises";
import path from "node:path";

import { collectFiles } from "../../core/fs.js";

export type AnalyzeOptions = {
  root: string;
  list: boolean;
  prompt?: string;
};

const STANDARD_PROMPT_NAMES = [
  "spec_to_scenario",
  "spec_to_contract",
  "scenario_to_test",
] as const;

export async function runAnalyze(options: AnalyzeOptions): Promise<number> {
  const root = path.resolve(options.root);

  const localDir = path.join(root, ".qfai", "prompts.local", "analyze");
  const standardDir = path.join(root, ".qfai", "prompts", "analyze");

  const available = await listPromptNames([localDir, standardDir]);

  const promptName = normalizePromptName(options.prompt);
  if (!promptName || options.list) {
    emitList(available);
    return 0;
  }

  if (!STANDARD_PROMPT_NAMES.includes(promptName as never)) {
    process.stderr.write(`qfai analyze: prompt not found: ${promptName}\n`);
    if (available.length > 0) {
      process.stderr.write("candidates:\n");
      for (const c of available) {
        process.stderr.write(`- ${c}\n`);
      }
    }
    return 1;
  }

  const resolved = await resolvePromptPath(
    promptName,
    [localDir, standardDir],
    available,
  );
  if (!resolved) {
    return 1;
  }

  const content = await readFile(resolved, "utf-8");
  process.stdout.write(content);
  if (!content.endsWith("\n")) {
    process.stdout.write("\n");
  }
  return 0;
}

function normalizePromptName(value: string | undefined): string | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.endsWith(".md") ? trimmed.slice(0, -3) : trimmed;
}

async function listPromptNames(dirs: string[]): Promise<string[]> {
  const names = new Set<string>();

  for (const dir of dirs) {
    const files = await collectFiles(dir, { extensions: [".md"] });
    for (const abs of files) {
      const base = path.basename(abs);
      if (base.toLowerCase() === "readme.md") {
        continue;
      }
      if (!base.toLowerCase().endsWith(".md")) {
        continue;
      }
      names.add(base.slice(0, -3));
    }
  }

  return [...names]
    .filter((name) => (STANDARD_PROMPT_NAMES as readonly string[]).includes(name))
    .sort((a, b) => a.localeCompare(b));
}

function emitList(names: string[]): void {
  process.stdout.write("# qfai analyze: prompts\n\n");

  if (names.length === 0) {
    process.stdout.write(
      "利用可能なプロンプトが見つかりません。まず `qfai init` を実行してください。\n",
    );
    return;
  }

  process.stdout.write("利用可能なプロンプト一覧:\n\n");
  for (const name of names) {
    process.stdout.write(`- ${name}\n`);
  }
}

async function resolvePromptPath(
  promptName: string,
  dirs: string[],
  candidates: string[],
): Promise<string | null> {
  const filename = `${promptName}.md`;

  for (const dir of dirs) {
    const full = path.join(dir, filename);
    try {
      const content = await readFile(full, "utf-8");
      // Ensure readable; then return path.
      void content;
      return full;
    } catch {
      // ignore
    }
  }

  process.stderr.write(`qfai analyze: prompt not found: ${promptName}\n`);
  if (candidates.length > 0) {
    process.stderr.write("candidates:\n");
    for (const c of candidates) {
      process.stderr.write(`- ${c}\n`);
    }
  }
  return null;
}
