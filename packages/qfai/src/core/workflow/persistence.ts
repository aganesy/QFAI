export type WriteFile = (filePath: string, content: string) => Promise<void>;

export interface IoRefusal {
  code: "io-error";
  message: string;
  cause: string;
}

const BUSY_OR_REFUSED = ["EBUSY", "EPERM", "EACCES"];

function systemCode(error: unknown): string | undefined {
  if (!(error instanceof Error) || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}

// A busy or refused file is reported once and never retried here: every write operation is
// idempotent, so the harness invoking it again is the retry.
// SIMPLIFIED: writes the file in place, not through a temporary name and a rename.
// Lift when: the journal and snapshot writes are implemented.
export async function writeRecord(
  filePath: string,
  content: string,
  write: WriteFile,
): Promise<IoRefusal | undefined> {
  try {
    await write(filePath, content);
    return undefined;
  } catch (error) {
    const cause = systemCode(error);
    if (!cause || !BUSY_OR_REFUSED.includes(cause)) throw error;
    const message = "A run file could not be written. Close whatever holds it and try again.";
    return { code: "io-error", message, cause };
  }
}
