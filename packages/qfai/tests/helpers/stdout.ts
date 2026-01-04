export async function captureStdout(
  task: () => Promise<void>,
): Promise<string> {
  const output: string[] = [];
  const originalWrite = process.stdout.write.bind(process.stdout);
  const mockWrite: typeof process.stdout.write = (
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
  process.stdout.write = mockWrite;

  try {
    await task();
  } finally {
    process.stdout.write = originalWrite;
  }

  return output.join("");
}
