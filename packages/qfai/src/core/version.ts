import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export async function resolveToolVersion(): Promise<string> {
  try {
    const packagePath = fileURLToPath(
      new URL("../../package.json", import.meta.url),
    );
    const raw = await readFile(packagePath, "utf-8");
    const parsed = JSON.parse(raw) as { version?: string };
    return parsed.version ?? "unknown";
  } catch {
    return "unknown";
  }
}
