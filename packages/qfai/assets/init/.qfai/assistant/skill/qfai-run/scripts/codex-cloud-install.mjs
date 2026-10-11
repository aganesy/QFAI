import { spawnSync } from "node:child_process";
import { accessSync, constants, readFileSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";

function failure(label, error) {
  const reason = error?.code ?? error?.name ?? "unavailable";
  process.stderr.write(`${label}: ${reason}.\n`);
  return 1;
}

function run(command, args, cwd, label) {
  const result = spawnSync(command, args, { cwd, shell: false, stdio: "inherit" });
  if (result.error) return failure(`${label} could not start`, result.error);
  if (result.signal) {
    process.stderr.write(`${label} ended on signal ${result.signal}.\n`);
    return 1;
  }
  if (result.status !== 0) {
    process.stderr.write(`${label} exited ${result.status ?? "without an exit code"}.\n`);
    return result.status ?? 1;
  }
  return 0;
}

function filePresent(file) {
  try {
    return statSync(file).isFile();
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

function prepare() {
  const args = process.argv.slice(2);
  if (args.length < 4 || args[0] !== "--cwd" || args[2] !== "--" || !args[3]) {
    process.stderr.write("Supply --cwd <absolute-checkout> -- <executable> [argument...].\n");
    return 1;
  }
  const cwd = args[1];
  if (!path.isAbsolute(cwd)) {
    process.stderr.write("The cwd must be an absolute project directory.\n");
    return 1;
  }
  try {
    if (!statSync(cwd).isDirectory()) {
      process.stderr.write("The cwd must be a readable project directory.\n");
      return 1;
    }
    accessSync(cwd, constants.R_OK);
  } catch (error) {
    return failure("Cannot read the cwd directory", error);
  }

  const installed = run(args[3], args.slice(4), cwd, "Installation");
  if (installed !== 0) return installed;

  let proof = "local binary";
  try {
    if (!filePresent(path.join(cwd, "node_modules", ".bin", "qfai"))) {
      const marker = [".pnp.cjs", ".pnp.loader.mjs"].some((name) =>
        filePresent(path.join(cwd, name)),
      );
      if (!marker) {
        process.stderr.write("The target checkout has no canonical qfai launcher.\n");
        return 1;
      }
      const manifest = JSON.parse(readFileSync(path.join(cwd, "package.json"), "utf8"));
      if (!manifest?.dependencies?.qfai && !manifest?.devDependencies?.qfai) {
        process.stderr.write("The target PnP project must declare qfai as a dependency.\n");
        return 1;
      }
      const confirmed = run(
        "yarn",
        ["exec", "qfai", "--help"],
        cwd,
        "Canonical launcher confirmation",
      );
      if (confirmed !== 0) return confirmed;
      proof = "Plug'n'Play";
    }
  } catch (error) {
    return failure("Canonical qfai launcher proof failed", error);
  }
  process.stdout.write(`Dependency preparation succeeded in ${cwd} (${proof}).\n`);
  return 0;
}

try {
  process.exitCode = prepare();
} catch (error) {
  process.exitCode = failure("Dependency preparation failed", error);
}
