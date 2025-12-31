import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function getInitAssetsDir(): string {
  const base = import.meta.url;
  const basePath = base.startsWith("file:") ? fileURLToPath(base) : base;
  const baseDir = path.dirname(basePath);
  // src/cli/lib -> ../../../assets/init, dist/cli -> ../../assets/init
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
