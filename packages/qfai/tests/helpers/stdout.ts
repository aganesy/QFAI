import { createStreamCapture } from "./streamCapture.js";

/** Collects what `task` writes to stdout, apart from any other capture running at the same time. */
export const captureStdout = createStreamCapture(process.stdout);
