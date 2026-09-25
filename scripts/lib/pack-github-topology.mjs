import { existsSync, lstatSync, readdirSync } from "node:fs";
import path from "node:path";

/** Verify the GitHub configuration inside the packed init root. */
export function assertPackagedGithubTopology(rootGithubDir) {
  if (!existsSync(rootGithubDir)) {
    throw new Error("assets/init/root/.github must exist.");
  }
  if (!lstatSync(rootGithubDir).isDirectory()) {
    throw new Error("assets/init/root/.github must be a directory (got non-directory entry).");
  }

  const allowedRootGithubEntries = new Set(["workflows"]);
  const githubEntries = readdirSync(rootGithubDir);
  if (!githubEntries.includes("workflows")) {
    throw new Error("assets/init/root/.github must contain workflows/.");
  }
  for (const entry of githubEntries) {
    if (!allowedRootGithubEntries.has(entry)) {
      throw new Error(
        `assets/init/root/.github/${entry} must not exist (only workflows/ is permitted).`,
      );
    }
    const entryPath = path.join(rootGithubDir, entry);
    if (!lstatSync(entryPath).isDirectory()) {
      throw new Error(
        `assets/init/root/.github/${entry} must be a directory (got non-directory entry).`,
      );
    }
  }

  const workflowFile = path.join(rootGithubDir, "workflows", "qfai-validate.yml");
  if (!existsSync(workflowFile) || !lstatSync(workflowFile).isFile()) {
    throw new Error(
      "assets/init/root/.github/workflows/qfai-validate.yml must exist as a regular file.",
    );
  }
}
