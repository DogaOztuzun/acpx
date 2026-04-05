import { statSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { SessionNotFoundError, SessionResolutionError } from "../errors.js";
import { incrementPerfCounter, measurePerf } from "../perf-metrics.js";
import { assertPersistedKeyPolicy } from "../persisted-key-policy.js";
import type { SessionRecord } from "../types.js";
import {
  loadOrRebuildSessionIndex,
  rebuildSessionIndex,
  toSessionIndexEntry,
  writeSessionIndex,
  type SessionIndexEntry,
} from "./index.js";
import { parseSessionRecord } from "./parse.js";
import { serializeSessionRecordForDisk } from "./serialize.js";

export const EXPORT_SCHEMA = "acpx.session-export.v1" as const;

export type SessionExportManifest = {
  schema: typeof EXPORT_SCHEMA;
  exportedAt: string;
  exportedBy: string;
  sessions: SessionExportEntry[];
};

export type SessionExportEntry = {
  acpxRecordId: string;
  acpSessionId: string;
  agentCommand: string;
  cwd: string;
  name?: string;
  exportedAt: string;
  record: Record<string, unknown>;
};

export type SessionImportOptions = {
  onConflict: "skip" | "overwrite" | "rename";
  generateNewIds?: boolean;
};

export const DEFAULT_HISTORY_LIMIT = 20;

type FindSessionOptions = {
  agentCommand: string;
  cwd: string;
  name?: string;
  includeClosed?: boolean;
};

type FindSessionByDirectoryWalkOptions = {
  agentCommand: string;
  cwd: string;
  name?: string;
  boundary?: string;
};

function sessionFilePath(acpxRecordId: string): string {
  const safeId = encodeURIComponent(acpxRecordId);
  return path.join(sessionBaseDir(), `${safeId}.json`);
}

function sessionBaseDir(): string {
  return path.join(os.homedir(), ".acpx", "sessions");
}

async function ensureSessionDir(): Promise<void> {
  await fs.mkdir(sessionBaseDir(), { recursive: true });
}

async function loadRecordFromIndexEntry(
  entry: SessionIndexEntry,
): Promise<SessionRecord | undefined> {
  try {
    const payload = await fs.readFile(path.join(sessionBaseDir(), entry.file), "utf8");
    return parseSessionRecord(JSON.parse(payload)) ?? undefined;
  } catch {
    return undefined;
  }
}

async function loadSessionIndexEntries(): Promise<SessionIndexEntry[]> {
  await ensureSessionDir();
  const index = await measurePerf("session.index_load", async () => {
    return await loadOrRebuildSessionIndex(sessionBaseDir());
  });
  return index.entries;
}

function matchesSessionEntry(
  session: SessionIndexEntry,
  normalizedCwd: string,
  normalizedName: string | undefined,
  includeClosed = false,
): boolean {
  if (session.cwd !== normalizedCwd) {
    return false;
  }
  if (!includeClosed && session.closed) {
    return false;
  }
  if (normalizedName == null) {
    return session.name == null;
  }
  return session.name === normalizedName;
}

export async function writeSessionRecord(record: SessionRecord): Promise<void> {
  await measurePerf("session.write_record", async () => {
    await ensureSessionDir();

    const persisted = serializeSessionRecordForDisk(record);
    assertPersistedKeyPolicy(persisted);

    const file = sessionFilePath(record.acpxRecordId);
    const tempFile = `${file}.${process.pid}.${Date.now()}.tmp`;
    const payload = JSON.stringify(persisted, null, 2);
    await fs.writeFile(tempFile, `${payload}\n`, "utf8");
    await fs.rename(tempFile, file);

    const sessionDir = sessionBaseDir();
    const index = await loadOrRebuildSessionIndex(sessionDir);
    const fileName = path.basename(file);
    const entries = index.entries.filter((entry) => entry.file !== fileName);
    entries.push(toSessionIndexEntry(record, fileName));
    const files = [...new Set([...index.files.filter((entry) => entry !== fileName), fileName])];
    await writeSessionIndex(sessionDir, { files, entries });
  });
}

export async function resolveSessionRecord(sessionId: string): Promise<SessionRecord> {
  await ensureSessionDir();

  const directPath = sessionFilePath(sessionId);
  try {
    const directPayload = await measurePerf("session.resolve_direct", async () => {
      return await fs.readFile(directPath, "utf8");
    });
    const directRecord = parseSessionRecord(JSON.parse(directPayload));
    if (directRecord) {
      return directRecord;
    }
  } catch {
    // fallback to indexed search
  }

  const entries = await loadSessionIndexEntries();
  const exactEntries = entries.filter(
    (entry) => entry.acpxRecordId === sessionId || entry.acpSessionId === sessionId,
  );
  const exactRecords = (
    await Promise.all(exactEntries.map((entry) => loadRecordFromIndexEntry(entry)))
  ).filter((entry): entry is SessionRecord => Boolean(entry));
  if (exactRecords.length === 1) {
    return exactRecords[0];
  }
  if (exactRecords.length > 1) {
    throw new SessionResolutionError(`Multiple sessions match id: ${sessionId}`);
  }

  const suffixEntries = entries.filter(
    (entry) => entry.acpxRecordId.endsWith(sessionId) || entry.acpSessionId.endsWith(sessionId),
  );
  const suffixRecords = (
    await Promise.all(suffixEntries.map((entry) => loadRecordFromIndexEntry(entry)))
  ).filter((entry): entry is SessionRecord => Boolean(entry));
  if (suffixRecords.length === 1) {
    return suffixRecords[0];
  }
  if (suffixRecords.length > 1) {
    throw new SessionResolutionError(`Session id is ambiguous: ${sessionId}`);
  }

  incrementPerfCounter("session.resolve_miss");
  throw new SessionNotFoundError(sessionId);
}

function hasGitDirectory(dir: string): boolean {
  const gitPath = path.join(dir, ".git");
  try {
    return statSync(gitPath).isDirectory();
  } catch {
    return false;
  }
}

function isWithinBoundary(boundary: string, target: string): boolean {
  const relative = path.relative(boundary, target);
  return relative.length === 0 || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function absolutePath(value: string): string {
  return path.resolve(value);
}

export function findGitRepositoryRoot(startDir: string): string | undefined {
  let current = absolutePath(startDir);
  const root = path.parse(current).root;

  for (;;) {
    if (hasGitDirectory(current)) {
      return current;
    }

    if (current === root) {
      return undefined;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return undefined;
    }
    current = parent;
  }
}

export function normalizeName(value: string | undefined): string | undefined {
  if (value == null) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function isoNow(): string {
  return new Date().toISOString();
}

export async function listSessions(): Promise<SessionRecord[]> {
  await ensureSessionDir();
  const entries = await loadSessionIndexEntries();
  const records: SessionRecord[] = [];

  for (const entry of entries) {
    const parsed = await loadRecordFromIndexEntry(entry);
    if (parsed) {
      records.push(parsed);
    }
  }

  records.sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt));
  return records;
}

export async function listSessionsForAgent(agentCommand: string): Promise<SessionRecord[]> {
  const entries = (await loadSessionIndexEntries()).filter(
    (session) => session.agentCommand === agentCommand,
  );
  const records = await Promise.all(entries.map((entry) => loadRecordFromIndexEntry(entry)));
  return records
    .filter((entry): entry is SessionRecord => Boolean(entry))
    .toSorted((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt));
}

export async function findSession(options: FindSessionOptions): Promise<SessionRecord | undefined> {
  const normalizedCwd = absolutePath(options.cwd);
  const normalizedName = normalizeName(options.name);
  const entries = await loadSessionIndexEntries();
  const match = entries.find(
    (session) =>
      session.agentCommand === options.agentCommand &&
      matchesSessionEntry(session, normalizedCwd, normalizedName, options.includeClosed),
  );
  if (!match) {
    return undefined;
  }
  return await loadRecordFromIndexEntry(match);
}

export async function findSessionByDirectoryWalk(
  options: FindSessionByDirectoryWalkOptions,
): Promise<SessionRecord | undefined> {
  const normalizedName = normalizeName(options.name);
  const normalizedStart = absolutePath(options.cwd);
  const normalizedBoundary = absolutePath(options.boundary ?? normalizedStart);
  const walkBoundary = isWithinBoundary(normalizedBoundary, normalizedStart)
    ? normalizedBoundary
    : normalizedStart;
  const sessions = (await loadSessionIndexEntries()).filter(
    (session) => session.agentCommand === options.agentCommand,
  );

  let current = normalizedStart;
  const walkRoot = path.parse(current).root;

  for (;;) {
    const match = sessions.find((session) => matchesSessionEntry(session, current, normalizedName));
    if (match) {
      return await loadRecordFromIndexEntry(match);
    }

    if (current === walkBoundary || current === walkRoot) {
      return undefined;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return undefined;
    }

    current = parent;

    if (!isWithinBoundary(walkBoundary, current)) {
      return undefined;
    }
  }
}

function killSignalCandidates(signal: NodeJS.Signals | undefined): NodeJS.Signals[] {
  if (!signal) {
    return ["SIGTERM", "SIGKILL"];
  }

  const normalized = signal.toUpperCase() as NodeJS.Signals;
  if (normalized === "SIGKILL") {
    return ["SIGKILL"];
  }

  return [normalized, "SIGKILL"];
}

export async function closeSession(id: string): Promise<SessionRecord> {
  const record = await resolveSessionRecord(id);
  const now = isoNow();

  if (record.pid) {
    for (const signal of killSignalCandidates(record.lastAgentExitSignal ?? undefined)) {
      try {
        process.kill(record.pid, signal);
      } catch {
        // ignore
      }
    }
  }

  record.closed = true;
  record.closedAt = now;
  record.pid = undefined;
  record.lastUsedAt = now;
  record.lastPromptAt = record.lastPromptAt ?? now;

  await writeSessionRecord(record);
  await rebuildSessionIndex(sessionBaseDir()).catch(() => {
    // best effort cache rebuild
  });
  return record;
}

export async function exportSessions(options?: {
  sessionId?: string;
  agentCommand?: string;
  all?: boolean;
  format?: "json" | "jsonl";
}): Promise<SessionExportManifest | AsyncIterable<SessionExportEntry>> {
  const format = options?.format ?? "json";
  const entries = await loadSessionIndexEntries();

  let filtered = entries;
  if (options?.sessionId) {
    filtered = filtered.filter(
      (e) => e.acpxRecordId === options.sessionId || e.acpSessionId === options.sessionId,
    );
  }
  if (options?.agentCommand) {
    filtered = filtered.filter((e) => e.agentCommand === options.agentCommand);
  }

  if (format === "jsonl") {
    return (async function* (): AsyncGenerator<SessionExportEntry> {
      for (const entry of filtered) {
        const record = await loadRecordFromIndexEntry(entry);
        if (record) {
          yield createExportEntry(record);
        }
      }
    })();
  }

  const manifest: SessionExportManifest = {
    schema: EXPORT_SCHEMA,
    exportedAt: isoNow(),
    exportedBy: "acpx",
    sessions: [],
  };

  for (const entry of filtered) {
    const record = await loadRecordFromIndexEntry(entry);
    if (record) {
      manifest.sessions.push(createExportEntry(record));
    }
  }

  return manifest;
}

function createExportEntry(record: SessionRecord): SessionExportEntry {
  return {
    acpxRecordId: record.acpxRecordId,
    acpSessionId: record.acpSessionId,
    agentCommand: record.agentCommand,
    cwd: record.cwd,
    name: record.name,
    exportedAt: isoNow(),
    record: serializeSessionRecordForDisk(record),
  };
}

export async function importSessions(
  data: SessionExportManifest | AsyncIterable<SessionExportEntry>,
  options: SessionImportOptions = { onConflict: "skip" },
): Promise<{ imported: number; skipped: number; renamed: number }> {
  let sessions: SessionExportEntry[];

  if (Symbol.asyncIterator in data) {
    sessions = [];
    for await (const entry of data) {
      sessions.push(entry);
    }
  } else {
    sessions = data.sessions;
  }

  let imported = 0;
  let skipped = 0;
  let renamed = 0;

  for (const entry of sessions) {
    const existing = await resolveSessionRecord(entry.acpxRecordId).catch(() => undefined);

    if (existing) {
      if (options.onConflict === "skip") {
        skipped++;
        continue;
      }
      if (options.onConflict === "rename") {
        const newId = `${entry.acpxRecordId}-${Date.now()}`;
        const renamedEntry = {
          ...entry,
          acpxRecordId: newId,
          record: {
            ...entry.record,
            acpx_record_id: newId,
          },
        };
        await writeSessionRecordFromExport(renamedEntry);
        renamed++;
        continue;
      }
    }

    await writeSessionRecordFromExport(entry);
    imported++;
  }

  return { imported, skipped, renamed };
}

async function writeSessionRecordFromExport(entry: SessionExportEntry): Promise<void> {
  const record: SessionRecord = {
    schema: "acpx.session.v1",
    acpxRecordId: entry.record.acpx_record_id as string,
    acpSessionId: entry.record.acp_session_id as string,
    agentSessionId: entry.record.agent_session_id as string | undefined,
    agentCommand: entry.record.agent_command as string,
    cwd: entry.record.cwd as string,
    name: entry.record.name as string | undefined,
    createdAt: entry.record.created_at as string,
    lastUsedAt: entry.record.last_used_at as string,
    lastSeq: entry.record.last_seq as number,
    lastRequestId: entry.record.last_request_id as string | undefined,
    eventLog: entry.record.event_log as SessionRecord["eventLog"],
    closed: entry.record.closed as boolean | undefined,
    closedAt: entry.record.closed_at as string | undefined,
    pid: entry.record.pid as number | undefined,
    agentStartedAt: entry.record.agent_started_at as string | undefined,
    lastPromptAt: entry.record.last_prompt_at as string | undefined,
    lastAgentExitCode: entry.record.last_agent_exit_code as number | null | undefined,
    lastAgentExitSignal: entry.record.last_agent_exit_signal as NodeJS.Signals | null | undefined,
    lastAgentExitAt: entry.record.last_agent_exit_at as string | undefined,
    lastAgentDisconnectReason: entry.record.last_agent_disconnect_reason as string | undefined,
    protocolVersion: entry.record.protocol_version as number | undefined,
    agentCapabilities: entry.record.agent_capabilities as SessionRecord["agentCapabilities"],
    title: entry.record.title as string | null | undefined,
    messages: entry.record.messages as SessionRecord["messages"],
    updated_at: entry.record.updated_at as string,
    cumulative_token_usage: entry.record
      .cumulative_token_usage as SessionRecord["cumulative_token_usage"],
    request_token_usage: entry.record.request_token_usage as SessionRecord["request_token_usage"],
    acpx: entry.record.acpx as SessionRecord["acpx"],
  };

  await writeSessionRecord(record);
}
