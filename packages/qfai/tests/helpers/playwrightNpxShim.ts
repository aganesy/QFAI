import { chmod, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/** Writes the npx fallback fixture that succeeds only with the Playwright version probe. */
export async function seedPlaywrightNpxShim(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
  if (process.platform === "win32") {
    const lines = [
      "@echo off",
      'if not "%~1"=="--no-install" exit /b 1',
      'if not "%~2"=="playwright" exit /b 1',
      'if not "%~3"=="--version" exit /b 1',
      'if not "%4"=="" exit /b 1',
      "echo 1.52.0",
    ];
    await writeFile(path.join(dir, "npx.cmd"), lines.join("\r\n") + "\r\n", "utf-8");
    return;
  }
  const target = path.join(dir, "npx");
  const lines = [
    "#!/bin/sh",
    'test "$#" -eq 3 || exit 1',
    'test "$1" = --no-install && test "$2" = playwright && test "$3" = --version || exit 1',
    "echo 1.52.0",
  ];
  await writeFile(target, lines.join("\n") + "\n", "utf-8");
  await chmod(target, 0o755);
}
