import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

/**
 * A shared skill baseline together with the reference files it points to.
 *
 * The baselines keep what every run needs and send the rest to
 * `rule/references/`. A test that pins the wording of a moved section reads
 * the baseline through this function, so it follows the text to where it now
 * lives. Any other file is returned as it is.
 */
export async function readRule(file: string): Promise<string> {
  const text = await readFile(file, "utf-8");
  if (!path.basename(file).startsWith("shared-skill-")) return text;
  const references = path.resolve(path.dirname(file), "references");
  let names: string[];
  try {
    names = (await readdir(references)).filter((name) => name.endsWith(".md")).sort();
  } catch (cause) {
    if (cause instanceof Error && "code" in cause && cause.code === "ENOENT") return text;
    throw new Error(`Cannot read rule references: ${references}`, { cause });
  }
  const bodies = await Promise.all(
    names.map((name) => readFile(path.join(references, name), "utf-8")),
  );
  return [text, ...bodies].join("\n");
}
