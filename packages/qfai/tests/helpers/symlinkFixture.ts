import { symlink } from "node:fs/promises";

type SymlinkType = "file" | "dir" | "junction";

interface SymlinkFixtureOptions {
  platform?: NodeJS.Platform;
  createSymlink?: (target: string, linkPath: string, type: SymlinkType) => Promise<void>;
}

/**
 * Whether `error` is the refusal Windows gives to a process that may not create symlinks, which
 * is the one condition a fixture may treat as "this host cannot build the scenario". The same
 * `EPERM` elsewhere, and every other code, is a real failure of the setup.
 */
export function isUnsupportedSymlinkError(
  error: unknown,
  platform: NodeJS.Platform = process.platform,
): boolean {
  return (
    platform === "win32" &&
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "EPERM"
  );
}

/**
 * Creates a symlink fixture. Returns `false` where the host does not allow symlinks, so the
 * caller can skip the case; any other failure is rethrown unchanged, with its code, path and
 * message.
 */
export async function createSymlinkFixture(
  target: string,
  linkPath: string,
  type: SymlinkType,
  options: SymlinkFixtureOptions = {},
): Promise<boolean> {
  try {
    await (options.createSymlink ?? symlink)(target, linkPath, type);
    return true;
  } catch (error: unknown) {
    if (isUnsupportedSymlinkError(error, options.platform)) return false;
    throw error;
  }
}
