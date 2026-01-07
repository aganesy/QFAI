import { readFile } from "node:fs/promises";
import path from "node:path";

import { collectFiles } from "../../core/fs.js";

export type AnalyzeOptions = {
  root: string;
  list: boolean;
  prompt?: string;
};

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

  const resolved = await resolvePromptPath(promptName, [localDir, standardDir]);
  if (!resolved) {
    emitPromptNotFound(promptName, available);
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
  // dirs の順序が優先順位（prompts.local → prompts）。同名が存在する場合は先勝ち。
  const byName = new Map<string, string>();

  for (const dir of dirs) {
    const files = await collectFiles(dir, { extensions: [".md"] });
    for (const abs of files) {
      const base = path.basename(abs);
      if (base.toLowerCase() === "readme.md") {
        continue;
      }
      const name = base.slice(0, -3);
      if (byName.has(name)) {
        continue;
      }

      if (await isDeprecatedPrompt(abs)) {
        continue;
      }

      byName.set(name, abs);
    }
  }

  return [...byName.keys()].sort((a, b) => a.localeCompare(b));
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
): Promise<string | null> {
  const filename = `${promptName}.md`;

  for (const dir of dirs) {
    const full = path.join(dir, filename);
    try {
      await readFile(full, "utf-8");
      return full;
    } catch {
      // ignore
    }
  }
  return null;
}

async function isDeprecatedPrompt(filePath: string): Promise<boolean> {
  try {
    const content = await readFile(filePath, "utf-8");
    const firstLine = content.split(/\r?\n/, 1)[0] ?? "";
    return firstLine.trim() === "# Deprecated";
  } catch {
    return false;
  }
}

function emitPromptNotFound(promptName: string, candidates: string[]): void {
  process.stderr.write(`qfai analyze: prompt not found: ${promptName}\n`);
  if (candidates.length > 0) {
    process.stderr.write("candidates:\n");
    for (const c of candidates) {
      process.stderr.write(`- ${c}\n`);
    }
  }
}
