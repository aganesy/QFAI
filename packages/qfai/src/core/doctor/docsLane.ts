import { constants } from "node:fs";
import { access, stat } from "node:fs/promises";
import path from "node:path";

import { getInitAssetsDir } from "../../shared/assets.js";

/** Where the document-schema lane lives in a project, root-relative. */
const DOCS_LANE = ".github/workflows/qfai-docs.yml";

export type DocsLaneCheck = {
  id: "workflows.docsLane";
  severity: "ok" | "error";
  title: string;
  message: string;
  details: { path: string; packagedCopy?: string };
};

/** Whether `target` is a regular file this process can read; a directory there is not a workflow. */
async function isReadableFile(target: string): Promise<boolean> {
  try {
    if (!(await stat(target)).isFile()) {
      return false;
    }
    await access(target, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/** The copy of the lane inside the installed package, when it can be found. */
function packagedCopy(): string | undefined {
  try {
    return path.join(getInitAssetsDir(), "root", ...DOCS_LANE.split("/"));
  } catch {
    return undefined;
  }
}

/**
 * Whether the project carries the document-schema lane.
 *
 * The lane is required: every story-tree document conforms to its schema, and
 * this workflow is what holds a pull request to that. A project that never
 * installed it and one that deleted it are reported alike.
 */
export async function checkDocsLane(root: string): Promise<DocsLaneCheck> {
  const title = `Document-schema lane (${DOCS_LANE})`;
  if (await isReadableFile(path.join(root, ...DOCS_LANE.split("/")))) {
    return {
      id: "workflows.docsLane",
      severity: "ok",
      title,
      message: "the document-schema lane is installed",
      details: { path: DOCS_LANE },
    };
  }
  const source = packagedCopy();
  return {
    id: "workflows.docsLane",
    severity: "error",
    title,
    message:
      `${DOCS_LANE} is missing, and the document-schema lane is required. ` +
      (source === undefined
        ? "Copy qfai-docs.yml from the installed qfai package into .github/workflows/."
        : `Copy ${source} into .github/workflows/.`),
    details: source === undefined ? { path: DOCS_LANE } : { path: DOCS_LANE, packagedCopy: source },
  };
}
