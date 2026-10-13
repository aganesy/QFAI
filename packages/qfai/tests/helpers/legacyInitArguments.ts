import { fileURLToPath, pathToFileURL } from "node:url";

export function legacyInitArguments(cli: string, args: string[]): string[] {
  if (args[0] !== "init") return [cli, ...args];
  const preload = fileURLToPath(new URL("./legacyInitProcess.mjs", import.meta.url));
  return ["--import", pathToFileURL(preload).href, cli, ...args];
}
