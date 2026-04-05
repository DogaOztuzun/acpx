import { createInterface } from "node:readline";
import { createLogWriter, readLogs, writeLog } from "./log-writer.js";
import { defaultLogsDir, logsDirForSession } from "./logs-dir.js";
import type { OutputFormat } from "./types.js";

export { writeLog };

export type LogsFlags = {
  session?: string;
  tail?: number;
  follow?: boolean;
};

export async function handleLogs(flags: LogsFlags, format: OutputFormat): Promise<void> {
  const logsDir = defaultLogsDir();

  if (flags.follow) {
    await handleLogsFollow(flags.session, logsDir);
    return;
  }

  const entries = await readLogs(flags.session, {
    logsDir,
    tail: flags.tail,
  });

  if (format === "json") {
    process.stdout.write(
      JSON.stringify({
        action: "logs_list",
        session: flags.session ?? null,
        tail: flags.tail ?? null,
        count: entries.length,
        entries,
      }) + "\n",
    );
    return;
  }

  if (format === "quiet") {
    for (const entry of entries) {
      const parts = entry.split(" ", 2);
      process.stdout.write(`${parts[1] ?? parts[0]}\n`);
    }
    return;
  }

  if (entries.length === 0) {
    if (flags.session) {
      process.stdout.write(`No logs found for session "${flags.session}"\n`);
    } else {
      process.stdout.write("No logs found\n");
    }
    return;
  }

  for (const entry of entries) {
    process.stdout.write(`${entry}\n`);
  }
}

async function handleLogsFollow(sessionName: string | undefined, logsDir: string): Promise<void> {
  const targetDir = sessionName ? logsDirForSession(logsDir, sessionName) : logsDir;

  let currentSize = 0;

  async function getFileSize(): Promise<number> {
    const { stat } = await import("node:fs/promises");
    const filePath = await import("node:path").then((p) => p.join(targetDir, "session.log"));
    try {
      const st = await stat(filePath);
      return st.size;
    } catch {
      return 0;
    }
  }

  async function tail(): Promise<void> {
    const { createReadStream } = await import("node:fs");
    const { join } = await import("node:path");

    const filePath = join(targetDir, "session.log");

    const stream = createReadStream(filePath, {
      start: currentSize,
      encoding: "utf8",
    });

    const rl = createInterface({ input: stream });

    for await (const line of rl) {
      process.stdout.write(`${line}\n`);
    }

    currentSize = await getFileSize();
  }

  const interval = setInterval(async () => {
    try {
      await tail();
    } catch {
      // file might not exist yet, ignore
    }
  }, 1000);

  process.on("SIGINT", () => {
    clearInterval(interval);
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    clearInterval(interval);
    process.exit(0);
  });
}

export async function createGlobalLogWriter(): Promise<ReturnType<typeof createLogWriter>> {
  return createLogWriter({ logsDir: defaultLogsDir() });
}
