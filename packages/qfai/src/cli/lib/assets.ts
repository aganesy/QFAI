import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function getInitAssetsDir(): string {
  const base = import.meta.url;
  const basePath = base.startsWith("file:") ? fileURLToPath(base) : base;
  const baseDir = path.dirname(basePath);
  const primary = path.resolve(baseDir, "../../assets/init");
  const fallback = path.resolve(baseDir, "../../../assets/init");
  if (existsSync(primary)) {
    return primary;
  }
  if (existsSync(fallback)) {
    return fallback;
  }
  return primary;
}
