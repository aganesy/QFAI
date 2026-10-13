import { spawnSync } from "node:child_process";
import { lstatSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function hasBlockingAncestor(relative) {
  const parts = relative.split("/");
  for (let end = 1; end < parts.length; end++) {
    try {
      if (!statSync(path.join(root, ...parts.slice(0, end))).isDirectory()) return true;
    } catch (error) {
      return error?.code !== "ENOENT";
    }
  }
  return false;
}

function bootstrap() {
  const cli = process.env.npm_execpath;
  const userAgent = process.env.npm_config_user_agent ?? "";
  if (
    !cli ||
    !path.isAbsolute(cli) ||
    !/^pnpm(?:\.(?:cjs|mjs|js))?$/i.test(path.basename(cli)) ||
    !/^pnpm\/\d+\.\d+\.\d+(?:[-+][^\s]+)?(?:\s|$)/.test(userAgent)
  ) {
    process.stderr.write("Run `corepack pnpm bootstrap` from the repository root.\n");
    return 1;
  }

  for (const relative of ["node_modules", "packages/qfai/node_modules"]) {
    // A missing leaf does not prove its existing parents are directories.
    let parent = root;
    for (const component of relative.split("/").slice(0, -1)) {
      parent = path.join(parent, component);
      let parentStats;
      try {
        parentStats = statSync(parent);
      } catch (error) {
        if (error?.code === "ENOENT") break;
        process.stderr.write(`Cannot inspect dependency path ${relative}.\n`);
        return 1;
      }
      if (!parentStats.isDirectory()) {
        process.stderr.write(`Cannot inspect dependency path ${relative}.\n`);
        return 1;
      }
    }
    let stats;
    try {
      stats = lstatSync(path.join(root, ...relative.split("/")));
    } catch (error) {
      // Windows reports a child below a file as ENOENT, so inspect its parents first.
      if (error?.code === "ENOENT" && !hasBlockingAncestor(relative)) continue;
      process.stderr.write(`Cannot inspect dependency path ${relative}.\n`);
      return 1;
    }
    if (stats.isSymbolicLink() || !stats.isDirectory()) {
      process.stderr.write(`Dependency path ${relative} must be a real directory.\n`);
      return 1;
    }
  }

  for (const args of [
    ["install", "--frozen-lockfile"],
    ["-C", "packages/qfai", "build"],
    ["install", "--frozen-lockfile"],
  ]) {
    const result = spawnSync(process.execPath, [cli, ...args], { cwd: root, stdio: "inherit" });
    if (result.error) {
      process.stderr.write("Could not start pnpm.\n");
      return 1;
    }
    if (result.signal) {
      process.stderr.write(`pnpm stopped on signal ${result.signal}.\n`);
      return 1;
    }
    if (result.status !== 0) return result.status ?? 1;
  }
  return 0;
}

process.exitCode = bootstrap();
