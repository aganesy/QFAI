import path from "node:path";
import { fileURLToPath } from "node:url";

export function getInitAssetsDir(): string {
  const base = import.meta.url;
  const basePath = base.startsWith("file:") ? fileURLToPath(base) : base;
  return path.resolve(path.dirname(basePath), "../../assets/init");
}
