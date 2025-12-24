import { fileURLToPath } from "node:url";

export function getTemplatesDir(): string {
  return fileURLToPath(new URL("../templates", import.meta.url));
}
