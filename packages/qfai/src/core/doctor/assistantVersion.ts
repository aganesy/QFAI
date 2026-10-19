import {
  ASSISTANT_VERSION_FILE,
  assistantVersionRepair,
  compareAssistantVersion,
  describeAssistantVersionMismatch,
} from "../assistantVersion.js";

export type AssistantVersionCheck = {
  id: "assistant.version";
  severity: "warning";
  title: string;
  message: string;
  details: { path: string; recorded: string | null; running: string };
};

/**
 * A warning when the running qfai is not the release `.qfai/assistant/VERSION`
 * records, the version file included when it records none. Nothing is written,
 * and a project with no assistant tree, or one that records the running
 * version, gets no check.
 */
export async function checkAssistantVersion(
  root: string,
  running: string,
): Promise<AssistantVersionCheck | undefined> {
  const mismatch = await compareAssistantVersion(root, running);
  if (mismatch === null) return undefined;
  return {
    id: "assistant.version",
    severity: "warning",
    title: "Assistant tree version",
    message:
      `${describeAssistantVersionMismatch(mismatch)} Doctor changes nothing. ` +
      assistantVersionRepair(mismatch),
    details: { path: ASSISTANT_VERSION_FILE, recorded: mismatch.recorded, running },
  };
}
