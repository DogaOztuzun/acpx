import os from "node:os";
import path from "node:path";

export const LOGS_DIR_NAME = "logs";

export function defaultLogsDir(): string {
  return path.join(os.homedir(), ".acpx", LOGS_DIR_NAME);
}

export function logsDirForSession(logsDir: string, sessionName: string): string {
  const sanitized = sessionName.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(logsDir, sanitized);
}

export function logFilePath(logsDir: string, sessionName: string): string {
  return path.join(logsDirForSession(logsDir, sessionName), "session.log");
}
