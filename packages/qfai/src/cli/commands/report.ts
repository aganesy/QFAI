import path from "node:path";

import {
  createReportData,
  formatReportJson,
  formatReportMarkdown,
} from "../../core/report.js";

export type ReportOptions = {
  root: string;
  format: "md" | "json";
};

export async function runReport(options: ReportOptions): Promise<void> {
  const root = path.resolve(options.root);
  const data = await createReportData(root);
  const output =
    options.format === "json"
      ? formatReportJson(data)
      : formatReportMarkdown(data);

  process.stdout.write(`${output}\n`);
}
