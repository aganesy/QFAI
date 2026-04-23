import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type CodeChangeSummary = {
  diffLines: number;
  filesChanged: number;
};

export async function analyzeCodeChange(
  root: string,
  previousCommitSha: string,
  currentCommitSha: string,
): Promise<CodeChangeSummary> {
  const { stdout } = await execFileAsync(
    "git",
    ["diff", "--numstat", `${previousCommitSha}..${currentCommitSha}`],
    {
      cwd: root,
      windowsHide: true,
    },
  );

  return parseNumstat(stdout);
}

export function parseNumstat(stdout: string): CodeChangeSummary {
  let diffLines = 0;
  let filesChanged = 0;

  for (const line of stdout.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const parts = trimmed.split("\t");
    if (parts.length < 3) {
      continue;
    }

    const added = Number(parts[0]);
    const deleted = Number(parts[1]);
    if (Number.isFinite(added) && Number.isFinite(deleted)) {
      diffLines += added + deleted;
    }
    filesChanged += 1;
  }

  return { diffLines, filesChanged };
}
