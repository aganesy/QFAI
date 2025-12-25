import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

declare const __QFAI_TOOL_VERSION__: string | undefined;

export async function resolveToolVersion(): Promise<string> {
  if (
    typeof __QFAI_TOOL_VERSION__ === "string" &&
    __QFAI_TOOL_VERSION__.length > 0
  ) {
    return __QFAI_TOOL_VERSION__;
  }

  try {
    const packagePath = resolvePackageJsonPath();
    const raw = await readFile(packagePath, "utf-8");
    const parsed = JSON.parse(raw) as { version?: unknown };
    const version = typeof parsed.version === "string" ? parsed.version : "";
    return version.length > 0 ? version : "unknown";
  } catch {
    return "unknown";
  }
}

function resolvePackageJsonPath(): string {
  const base = import.meta.url;
  const basePath = base.startsWith("file:") ? fileURLToPath(base) : base;
  return path.resolve(path.dirname(basePath), "../../package.json");
}
