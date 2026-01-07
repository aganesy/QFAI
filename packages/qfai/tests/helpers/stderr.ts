export async function captureStderr(
  task: () => Promise<void>,
): Promise<string> {
  const output: string[] = [];
  const originalWrite = process.stderr.write.bind(process.stderr);
  const mockWrite: typeof process.stderr.write = (
    chunk: string | Uint8Array,
    encoding?: BufferEncoding | ((err?: Error) => void),
    cb?: (err?: Error) => void,
  ): boolean => {
    output.push(
      typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf-8"),
    );
    const callback = typeof encoding === "function" ? encoding : cb;
    if (callback) {
      callback();
    }
    return true;
  };

  process.stderr.write = mockWrite;

  try {
    await task();
  } finally {
    process.stderr.write = originalWrite;
  }

  return output.join("");
}
