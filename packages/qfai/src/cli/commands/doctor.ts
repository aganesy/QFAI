import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { createDoctorData, type DoctorProfile } from "../../core/doctor.js";
import { info } from "../lib/logger.js";

export type DoctorCommandOptions = {
  root: string;
  rootExplicit: boolean;
  format: "text" | "json";
  outPath?: string;
  failOn?: "warning" | "error";
  profile?: DoctorProfile;
  targetUrl?: string;
};

function formatDoctorText(data: Awaited<ReturnType<typeof createDoctorData>>): string {
  const lines: string[] = [];
  lines.push(
    `qfai doctor: root=${data.root} config=${data.config.configPath} (${data.config.found ? "found" : "missing"})${data.profile ? ` profile=${data.profile}` : ""}`,
  );
  // Active-profile checks (severity=ok) are listed first so the reader still
  // sees the green signal.
  const okGroup = data.checks.filter((check) => check.severity === "ok");
  for (const check of okGroup) {
    lines.push(`[${check.severity}] ${check.id}: ${check.message}`);
  }
  // 2-group split. Errors that block the active profile go in the first
  // group; warnings + info are advisory drift. The `skills.integrity` finding
  // is always routed into the advisory group regardless of its message
  // wording (routed by `id`, not by severity, so the rule is robust against a
  // future emission that accidentally re-elevates severity).
  const errorGroup = data.checks.filter(
    (check) => check.severity === "error" && check.id !== "skills.integrity",
  );
  const advisoryGroup = data.checks.filter(
    (check) =>
      (check.severity === "warning" || check.severity === "info") &&
      check.id !== "skills.integrity",
  );
  const skillsAdvisory = data.checks.filter((check) => check.id === "skills.integrity");
  lines.push("");
  lines.push("== errors blocking the active profile ==");
  if (errorGroup.length === 0) {
    lines.push("(none)");
  } else {
    for (const check of errorGroup) {
      lines.push(`[${check.severity}] ${check.id}: ${check.message}`);
    }
  }
  lines.push("");
  lines.push("== advisory findings (drift, non-blocking by default) ==");
  const combinedAdvisory = [...advisoryGroup, ...skillsAdvisory];
  if (combinedAdvisory.length === 0) {
    lines.push("(none)");
  } else {
    for (const check of combinedAdvisory) {
      lines.push(`[${check.severity}] ${check.id}: ${check.message}`);
    }
  }
  lines.push("");
  lines.push(
    `summary: ok=${data.summary.ok} info=${data.summary.info} warning=${data.summary.warning} error=${data.summary.error}`,
  );
  return lines.join("\n");
}

function formatDoctorJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

export async function runDoctor(options: DoctorCommandOptions): Promise<number> {
  const data = await createDoctorData({
    startDir: options.root,
    rootExplicit: options.rootExplicit,
    ...(options.profile ? { profile: options.profile } : {}),
    ...(options.targetUrl ? { targetUrl: options.targetUrl } : {}),
  });

  const output = options.format === "json" ? formatDoctorJson(data) : formatDoctorText(data);
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
