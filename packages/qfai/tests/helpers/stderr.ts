import { createStreamCapture } from "./streamCapture.js";

/** Collects what `task` writes to stderr, apart from any other capture running at the same time. */
export const captureStderr = createStreamCapture(process.stderr);
