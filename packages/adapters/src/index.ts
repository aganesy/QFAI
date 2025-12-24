import { fileURLToPath } from "node:url";

export function getAdaptersDir(): string {
  return fileURLToPath(new URL("../templates", import.meta.url));
}
