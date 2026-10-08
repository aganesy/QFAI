import { readFile } from "node:fs/promises";
import path from "node:path";

import { getInitAssetsDir } from "../../shared/assets.js";
import { SHIPPED_WORKFLOW_NAMES } from "../../shared/shippedWorkflowNames.js";

const WORKFLOWS_DIR = [".github", "workflows"] as const;

export type WorkflowDriftCheck = {
  id: string;
  severity: "warning";
  title: string;
  message: string;
  details: { path: string; packagedCopy: string };
};

async function readText(target: string): Promise<string | undefined> {
  try {
    return await readFile(target, "utf-8");
  } catch {
    return undefined;
  }
}

/** Line endings are not an edit: a checkout may convert them. */
function withLf(text: string): string {
  return text.replace(/\r\n?/g, "\n");
}

function packagedWorkflowsDir(): string | undefined {
  try {
    return path.join(getInitAssetsDir(), "root", ...WORKFLOWS_DIR);
  } catch {
    return undefined;
  }
}

/**
 * A warning for each shipped workflow installed in the project whose text is not the text this
 * package ships. Both copies are read and nothing is written. A workflow the project does not have
 * raises no finding here.
 */
export async function checkWorkflowDrift(root: string): Promise<WorkflowDriftCheck[]> {
  const packagedDir = packagedWorkflowsDir();
  if (packagedDir === undefined) return [];
  const findings: WorkflowDriftCheck[] = [];
  for (const name of [...SHIPPED_WORKFLOW_NAMES].sort()) {
    const installed = await readText(path.join(root, ...WORKFLOWS_DIR, name));
    const packagedCopy = path.join(packagedDir, name);
    const packaged = await readText(packagedCopy);
    if (installed === undefined || packaged === undefined) continue;
    if (withLf(installed) === withLf(packaged)) continue;
    const installedPath = [...WORKFLOWS_DIR, name].join("/");
    findings.push({
      id: `workflows.drift.${name.replace(/\.yml$/, "")}`,
      severity: "warning",
      title: `Shipped workflow differs (${installedPath})`,
      message:
        `${installedPath} differs from the copy this qfai package ships. ` +
        `Doctor changes nothing. To take the shipped text, copy ${packagedCopy} over it.`,
      details: { path: installedPath, packagedCopy },
    });
  }
  return findings;
}
