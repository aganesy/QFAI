import path from "node:path";

import { getInitAssetsDir } from "../../shared/assets.js";
import { collectTemplateFiles } from "../fs/templateCopy.js";
import {
  ASSISTANT_DIR,
  REFRESHED_ASSISTANT_LAYERS,
  joinAssistantAssetLayer,
} from "../paths/assistantPaths.js";
import { printable, readCopies, unreadableCopyMessage, withLf } from "./workflowDrift.js";

export type AssistantDriftCheck = {
  id: string;
  severity: "warning";
  title: string;
  message: string;
  details:
    | { path: string; packagedCopy: string }
    | { path: string; packagedCopy: string; unreadable: string; code: string };
};

function packagedAssistantDir(): string | undefined {
  try {
    return path.join(getInitAssetsDir(), ".qfai", "assistant");
  } catch {
    return undefined;
  }
}

/**
 * A warning for each file of the shipped skill, step, agent and rule trees that is installed in
 * the project and whose text is not the text this package ships: the files `qfai init --force`
 * overwrites. Both copies are read and nothing is written.
 *
 * The packaged tree is the list, so a file the package does not ship (a `rule/*.local.md`
 * overlay, anything under `skill.local/`, an agent the project added) is never compared, and a
 * shipped file the project does not have raises no finding. A shipped file whose installed or
 * packaged copy exists and cannot be read is a warning naming that copy and the cause.
 */
export async function checkAssistantDrift(root: string): Promise<AssistantDriftCheck[]> {
  const packagedDir = packagedAssistantDir();
  if (packagedDir === undefined) return [];
  const findings: AssistantDriftCheck[] = [];
  for (const layer of REFRESHED_ASSISTANT_LAYERS) {
    const packagedFiles = await collectTemplateFiles(joinAssistantAssetLayer(packagedDir, layer));
    const relatives = packagedFiles
      .map((file) => path.relative(packagedDir, file).split(path.sep).join("/"))
      .sort();
    for (const relative of relatives) {
      const packagedCopy = path.join(packagedDir, ...relative.split("/"));
      const installedPath = `${ASSISTANT_DIR}/${relative}`;
      const id = `assistant.drift.${relative}`;
      const copies = await readCopies(root, installedPath, packagedCopy);
      if (copies.kind === "absent") continue;
      if (copies.kind === "unreadable") {
        findings.push({
          id,
          severity: "warning",
          title: `Shipped assistant file cannot be read (${printable(copies.unreadable)})`,
          message: unreadableCopyMessage(copies, installedPath),
          details: {
            path: installedPath,
            packagedCopy,
            unreadable: copies.unreadable,
            code: copies.code,
          },
        });
        continue;
      }
      if (withLf(copies.installed) === withLf(copies.packaged)) continue;
      findings.push({
        id,
        severity: "warning",
        title: `Shipped assistant file differs (${installedPath})`,
        message:
          `${installedPath} differs from the copy this qfai package ships (${packagedCopy}). ` +
          "Doctor changes nothing. To take the shipped text, run 'qfai init --force', which " +
          "overwrites every shipped assistant file; keep local changes in rule/*.local.md or " +
          "skill.local/.",
        details: { path: installedPath, packagedCopy },
      });
    }
  }
  return findings;
}
