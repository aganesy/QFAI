import { fileURLToPath } from "node:url";

export function getInitAssetsDir(): string {
  return fileURLToPath(new URL("../../assets/init", import.meta.url));
}
