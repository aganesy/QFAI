/**
 * FS evidence writer — WS-C
 *
 * Writes render evidence artifacts to the filesystem.
 */

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

export type WriteResult = {
  path: string;
  written: boolean;
  error?: string;
};

/**
 * Write content to a file, ensuring parent directories exist.
 */
export async function writeEvidenceFile(
  filePath: string,
  content: string | Buffer,
): Promise<WriteResult> {
  try {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, content);
    return { path: filePath, written: true };
  } catch (error) {
    return {
      path: filePath,
      written: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Write a screenshot and optional HTML file for a single render target.
 */
export async function writeRenderArtifacts(
  outputDir: string,
  captureId: string,
  screenshot: Buffer | string,
  html?: string,
): Promise<{ screenshotPath: string; htmlPath?: string; filesWritten: string[] }> {
  const filesWritten: string[] = [];

  const screenshotPath = path.join(outputDir, `${captureId}.png`);
  const screenshotResult = await writeEvidenceFile(screenshotPath, screenshot);
  if (screenshotResult.written) {
    filesWritten.push(screenshotResult.path);
  } else {
    throw new Error(`Failed to write screenshot: ${screenshotResult.error}`);
  }

  let htmlPath: string | undefined;
  if (html) {
    htmlPath = path.join(outputDir, `${captureId}.html`);
    const htmlResult = await writeEvidenceFile(htmlPath, html);
    if (htmlResult.written) {
      filesWritten.push(htmlResult.path);
    } else {
      throw new Error(`Failed to write HTML: ${htmlResult.error}`);
    }
  }

  return {
    screenshotPath,
    ...(htmlPath ? { htmlPath } : {}),
    filesWritten,
  };
}
