import fs from "node:fs/promises";
import path from "node:path";
import { defaultLogsDir, logsDirForSession, logFilePath } from "./logs-dir.js";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_ROTATED_FILES = 5;

export interface LogWriter {
  write(sessionName: string, message: string): Promise<void>;
  close(): Promise<void>;
}

export interface LogWriterOptions {
  logsDir?: string;
  maxFileSize?: number;
  maxRotatedFiles?: number;
}

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

async function getFileSize(filePath: string): Promise<number> {
  try {
    const stat = await fs.stat(filePath);
    return stat.size;
  } catch {
    return 0;
  }
}

async function rotateLogFiles(sessionDir: string): Promise<void> {
  for (let i = MAX_ROTATED_FILES - 1; i >= 1; i -= 1) {
    const current = path.join(sessionDir, `${i}.log`);
    const next = path.join(sessionDir, `${i + 1}.log`);
    try {
      await fs.rename(current, next);
    } catch {
      // file doesn't exist, skip
    }
  }

  const currentLog = path.join(sessionDir, "session.log");
  const firstRotated = path.join(sessionDir, "1.log");
  try {
    await fs.rename(currentLog, firstRotated);
  } catch {
    // file doesn't exist, skip
  }
}

async function writeLogInternal(
  logsDir: string,
  sessionName: string,
  message: string,
  maxFileSize: number,
): Promise<void> {
  const sessionDir = logsDirForSession(logsDir, sessionName);
  await ensureDir(sessionDir);

  const filePath = logFilePath(logsDir, sessionName);
  const size = await getFileSize(filePath);

  if (size >= maxFileSize) {
    await rotateLogFiles(sessionDir);
  }

  const timestamp = new Date().toISOString();
  const logLine = `${timestamp} ${message}\n`;

  await fs.appendFile(filePath, logLine, "utf8");
}

export async function createLogWriter(options: LogWriterOptions = {}): Promise<LogWriter> {
  const logsDir = options.logsDir ?? defaultLogsDir();
  const maxFileSize = options.maxFileSize ?? MAX_FILE_SIZE_BYTES;

  await ensureDir(logsDir);

  let closed = false;

  return {
    write: async (sessionName: string, message: string): Promise<void> => {
      if (closed) {
        throw new Error("LogWriter is closed");
      }
      await writeLogInternal(logsDir, sessionName, message, maxFileSize);
    },
    close: async () => {
      closed = true;
    },
  };
}

export async function writeLog(
  logsDir: string,
  sessionName: string,
  message: string,
  maxFileSize?: number,
): Promise<void> {
  await writeLogInternal(logsDir, sessionName, message, maxFileSize ?? MAX_FILE_SIZE_BYTES);
}

export async function readLogs(
  sessionName: string | undefined,
  options: {
    logsDir?: string;
    tail?: number;
  } = {},
): Promise<string[]> {
  const logsDir = options.logsDir ?? defaultLogsDir();

  try {
    await fs.access(logsDir);
  } catch {
    return [];
  }

  const entries: Array<{ timestamp: string; text: string }> = [];

  const sessionDirs = sessionName
    ? [logsDirForSession(logsDir, sessionName)]
    : await fs
        .readdir(logsDir, { withFileTypes: true })
        .then((entries) =>
          entries
            .filter((entry) => entry.isDirectory())
            .map((entry) => path.join(logsDir, entry.name)),
        );

  for (const sessionDir of sessionDirs) {
    const logFile = path.join(sessionDir, "session.log");
    try {
      const content = await fs.readFile(logFile, "utf8");
      for (const line of content.split("\n")) {
        if (line.trim().length === 0) {
          continue;
        }
        const firstSpace = line.indexOf(" ");
        if (firstSpace > 0) {
          const timestamp = line.slice(0, firstSpace);
          const text = line.slice(firstSpace + 1);
          entries.push({ timestamp, text });
        } else {
          entries.push({ timestamp: "", text: line });
        }
      }
    } catch {
      // file doesn't exist, skip
    }
  }

  entries.sort((a, b) => {
    if (a.timestamp < b.timestamp) {
      return -1;
    }
    if (a.timestamp > b.timestamp) {
      return 1;
    }
    return 0;
  });

  const result = entries.map((e) => `${e.timestamp} ${e.text}`.trim());
  if (options.tail && options.tail > 0) {
    return result.slice(-options.tail);
  }

  return result;
}
