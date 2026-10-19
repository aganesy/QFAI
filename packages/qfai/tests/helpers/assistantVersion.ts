/**
 * `.qfai/assistant/VERSION` for a fixture that builds its assistant tree by hand.
 *
 * `qfai init` records the release that wrote the tree, and `qfai validate` and `qfai doctor` warn
 * when the running qfai differs from it or the file is missing. A fixture that skips init and
 * asserts the findings about something else calls this, so that warning is not among them.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { assistantVersionPath, assistantVersionText } from "../../src/core/assistantVersion.js";
import { resolveToolVersion } from "../../src/core/version.js";

/** Writes the version file recording the running qfai, creating `.qfai/assistant/` if needed. */
export async function recordAssistantVersion(root: string): Promise<void> {
  const file = assistantVersionPath(root);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, assistantVersionText(await resolveToolVersion()), "utf-8");
}
