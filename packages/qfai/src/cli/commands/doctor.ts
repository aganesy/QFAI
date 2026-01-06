import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { createDoctorData } from "../../core/doctor.js";
import { info } from "../lib/logger.js";

export type DoctorCommandOptions = {
  root: string;
  rootExplicit: boolean;
  format: "text" | "json";
  outPath?: string;
  failOn?: "warning" | "error";
};

function formatDoctorText(
  data: Awaited<ReturnType<typeof createDoctorData>>,
): string {
  const lines: string[] = [];
  lines.push(
    `qfai doctor: root=${data.root} config=${data.config.configPath} (${data.config.found ? "found" : "missing"})`,
  );
  for (const check of data.checks) {
    lines.push(`[${check.severity}] ${check.id}: ${check.message}`);
  }
  lines.push(
    `summary: ok=${data.summary.ok} info=${data.summary.info} warning=${data.summary.warning} error=${data.summary.error}`,
  );
  return lines.join("\n");
}

function formatDoctorJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

export async function runDoctor(
  options: DoctorCommandOptions,
): Promise<number> {
  const data = await createDoctorData({
    startDir: options.root,
    rootExplicit: options.rootExplicit,
  });

  const output =
    options.format === "json" ? formatDoctorJson(data) : formatDoctorText(data);
  const exitCode = shouldFailDoctor(data.summary, options.failOn) ? 1 : 0;

  if (options.outPath) {
    const outAbs = path.isAbsolute(options.outPath)
      ? options.outPath
      : path.resolve(process.cwd(), options.outPath);
    await mkdir(path.dirname(outAbs), { recursive: true });
    await writeFile(outAbs, `${output}\n`, "utf-8");
    info(`doctor: wrote ${outAbs}`);
    return exitCode;
  }

  info(output);
  return exitCode;
}

function shouldFailDoctor(
  summary: { warning: number; error: number },
  failOn?: "warning" | "error",
): boolean {
  if (!failOn) {
    return false;
  }
  if (failOn === "error") {
    return summary.error > 0;
  }
  return summary.warning + summary.error > 0;
}
