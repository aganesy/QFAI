import { readFile } from "node:fs/promises";

import fg from "fast-glob";

/** A file a Markdown glob matched, with its text, or `null` when it could not be read. */
export type MarkdownFile = { filePath: string; content: string | null };

/** Every file `globs` match, absolute and in the order the walk returns them, each read once. */
export type MarkdownFileReader = (globs: string[]) => Promise<MarkdownFile[]>;

export const readMarkdownFiles: MarkdownFileReader = async (globs) => {
  const files = await fg(globs, { absolute: true });
  return Promise.all(
    files.map(async (filePath) => ({
      filePath,
      content: await readFile(filePath, "utf-8").catch(() => null),
    })),
  );
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
  const cache = new Map<string, Promise<MarkdownFile[]>>();
  return (globs) => {
    const key = JSON.stringify(globs);
    const cached = cache.get(key);
    if (cached) return cached;
    const pending = read(globs);
    cache.set(key, pending);
    return pending;
  };
}
