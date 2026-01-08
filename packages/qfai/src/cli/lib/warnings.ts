import type { ValidationResult } from "../../core/types.js";

import { warn } from "./logger.js";

export function warnIfTruncated(
  scan: ValidationResult["traceability"]["testFiles"],
  context: string,
): void {
  if (!scan.truncated) {
    return;
  }
  warn(
    `[warn] ${context}: file scan truncated: collected ${scan.matchedFileCount} files (limit ${scan.limit})`,
  );
}
