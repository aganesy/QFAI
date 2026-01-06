import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, URL } from "node:url";

const root = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const pkgDir = path.join(root, "packages", "qfai");
const tmpDir = path.join(root, "tmp", "pack");
const sandboxDir = path.join(tmpDir, "sandbox");
const outputDir = path.join(sandboxDir, "out");
const reportPath = path.join(outputDir, ".qfai", "out", "report.md");

rmSync(tmpDir, { recursive: true, force: true });
mkdirSync(tmpDir, { recursive: true });

const packOutput = execFileSync("npm", ["pack"], {
  cwd: pkgDir,
  encoding: "utf-8",
}).trim();
const packLines = packOutput.split(/\r?\n/).filter(Boolean);
const tarballName = packLines[packLines.length - 1];
if (!tarballName) {
  throw new Error("npm pack failed to produce a tarball name.");
}

const tarballPath = path.join(pkgDir, tarballName);
execFileSync("tar", ["-xzf", tarballPath, "-C", tmpDir], {
  stdio: "inherit",
});

const packageRoot = path.join(tmpDir, "package");
const licensePath = path.join(packageRoot, "LICENSE");
if (!existsSync(licensePath)) {
  throw new Error("LICENSE is missing from the packed artifact.");
}
const readmePath = path.join(packageRoot, "README.md");
if (!existsSync(readmePath)) {
  throw new Error("README.md is missing from the packed artifact.");
}
const assetsDir = path.join(packageRoot, "assets", "init");
if (!existsSync(assetsDir)) {
  throw new Error("assets/init is missing from the packed artifact.");
}
const templateDir = path.join(assetsDir, ".qfai");
if (!existsSync(templateDir)) {
  throw new Error("assets/init/.qfai is missing from the packed artifact.");
}

rmSync(sandboxDir, { recursive: true, force: true });
mkdirSync(sandboxDir, { recursive: true });
execFileSync("npm", ["init", "-y"], { cwd: sandboxDir, stdio: "inherit" });
execFileSync("npm", ["install", tarballPath], {
  cwd: sandboxDir,
  stdio: "inherit",
});

rmSync(tarballPath, { force: true });
rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });

const cliPath = path.join(
  sandboxDir,
  "node_modules",
  "qfai",
  "dist",
  "cli",
  "index.mjs",
);
execFileSync("node", [cliPath, "init", "--dir", outputDir], {
  stdio: "inherit",
});

const rootConfig = path.join(outputDir, "qfai.config.yaml");
if (!existsSync(rootConfig)) {
  throw new Error("init did not generate root qfai.config.yaml.");
}

const qfaiDir = path.join(outputDir, ".qfai");
if (!existsSync(qfaiDir)) {
  throw new Error("init did not generate .qfai directory.");
}

const workflowPath = path.join(outputDir, ".github", "workflows", "qfai.yml");
if (!existsSync(workflowPath)) {
  throw new Error("init did not generate .github/workflows/qfai.yml.");
}

execFileSync(
  "node",
  [
    cliPath,
    "validate",
    "--root",
    outputDir,
    "--fail-on",
    "error",
    "--format",
    "github",
  ],
  {
    stdio: "inherit",
  },
);

execFileSync(
  "node",
  [cliPath, "report", "--root", outputDir, "--out", reportPath],
  {
    stdio: "inherit",
  },
);

if (!existsSync(reportPath)) {
  throw new Error("report did not generate .qfai/out/report.md.");
}

execFileSync(
  "node",
  [cliPath, "doctor", "--root", outputDir, "--fail-on", "error"],
  {
    stdio: "inherit",
  },
);
