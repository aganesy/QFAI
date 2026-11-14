import { readFile } from "node:fs/promises";

import fg from "fast-glob";

/** A file a Markdown glob matched, with its text, or `null` when it could not be read. */
export type MarkdownFile = { filePath: string; content: string | null };

/**
 * Every file `globs` match, absolute and in the order the walk returns them, each read once.
 * Read-only, because one reading is shared by several checks and none may change what the others see.
 */
export type MarkdownFileReader = (globs: string[]) => Promise<readonly Readonly<MarkdownFile>[]>;

/**
 * How many files are open at once. Opening every file together can hit the open-file limit, and
 * a failed open reads as an unreadable file, which is skipped without a message.
 */
const READ_BATCH = 64;

export const readMarkdownFiles: MarkdownFileReader = async (globs) => {
  const files = await fg(globs, { absolute: true });
  const read: MarkdownFile[] = [];
  for (let start = 0; start < files.length; start += READ_BATCH) {
    const batch = files.slice(start, start + READ_BATCH);
    read.push(
      ...(await Promise.all(
        batch.map(async (filePath) => ({
          filePath,
          content: await readFile(filePath, "utf-8").catch(() => null),
        })),
      )),
    );
  }
  return read;
};

/**
 * A reader that walks and reads each distinct set of globs once, however many callers ask.
 *
 * The UI/UX group runs three checks over the Markdown under `paths.specsDir`: the HTML mocks, the
 * screen alignment of the UI definition and the Mermaid screen flows. Each walked and read the
 * whole tree for itself, so a large story tree was read three times in one run.
 */
export function sharedMarkdownFileReader(
  read: MarkdownFileReader = readMarkdownFiles,
): MarkdownFileReader {
  const cache = new Map<string, Promise<readonly Readonly<MarkdownFile>[]>>();
  return (globs) => {
    const key = JSON.stringify(globs);
    const cached = cache.get(key);
    if (cached) return cached;
    const pending = read(globs);
    cache.set(key, pending);
    return pending;
  };
}
