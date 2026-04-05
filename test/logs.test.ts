import assert from "node:assert";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it, beforeEach, afterEach } from "node:test";
import { createLogWriter, readLogs, writeLog } from "../src/log-writer.js";
import { defaultLogsDir, logsDirForSession, logFilePath } from "../src/logs-dir.js";

describe("logs-dir", () => {
  it("defaultLogsDir returns correct path", () => {
    const expected = path.join(os.homedir(), ".acpx", "logs");
    assert.strictEqual(defaultLogsDir(), expected);
  });

  it("logsDirForSession sanitizes session name", () => {
    const logsDir = "/tmp/test-logs";
    const result = logsDirForSession(logsDir, "my session/name");
    assert.strictEqual(result, "/tmp/test-logs/my_session_name");
  });

  it("logsDirForSession keeps valid names", () => {
    const logsDir = "/tmp/test-logs";
    const result = logsDirForSession(logsDir, "valid-name_123");
    assert.strictEqual(result, "/tmp/test-logs/valid-name_123");
  });

  it("logFilePath returns correct path", () => {
    const logsDir = "/tmp/test-logs";
    const result = logFilePath(logsDir, "mysession");
    assert.strictEqual(result, "/tmp/test-logs/mysession/session.log");
  });
});

describe("log-writer", () => {
  const testDir = path.join(os.tmpdir(), `acpx-logs-test-${Date.now()}`);

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it("writeLog creates log file with timestamp and message", async () => {
    await writeLog(testDir, "testsession", "test message");

    const filePath = logFilePath(testDir, "testsession");
    const content = await fs.readFile(filePath, "utf8");
    const lines = content.split("\n").filter((l) => l.trim());

    assert.strictEqual(lines.length, 1);
    const firstSpace = lines[0].indexOf(" ");
    assert.ok(firstSpace > 0, "should have space separator");
    const timestamp = lines[0].slice(0, firstSpace);
    const message = lines[0].slice(firstSpace + 1);
    assert.ok(
      timestamp.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
      "timestamp should be ISO format",
    );
    assert.strictEqual(message, "test message");
  });

  it("writeLog creates session directory", async () => {
    await writeLog(testDir, "othersession", "hello");

    const sessionDir = logsDirForSession(testDir, "othersession");
    const stat = await fs.stat(sessionDir);
    assert.ok(stat.isDirectory());
  });

  it("readLogs returns empty array when no logs", async () => {
    const logsDir = path.join(testDir, "nonexistent");
    const entries = await readLogs(undefined, { logsDir });
    assert.deepStrictEqual(entries, []);
  });

  it("readLogs returns all entries across sessions", async () => {
    await writeLog(testDir, "session1", "message 1");
    await writeLog(testDir, "session2", "message 2");

    const entries = await readLogs(undefined, { logsDir: testDir });
    assert.strictEqual(entries.length, 2);
  });

  it("readLogs filters by session name", async () => {
    await writeLog(testDir, "session1", "message 1");
    await writeLog(testDir, "session2", "message 2");

    const entries = await readLogs("session1", { logsDir: testDir });
    assert.strictEqual(entries.length, 1);
    assert.ok(entries[0].includes("message 1"));
  });

  it("readLogs respects tail option", async () => {
    for (let i = 0; i < 10; i += 1) {
      await writeLog(testDir, "testsession", `message ${i}`);
    }

    const entries = await readLogs("testsession", { logsDir: testDir, tail: 3 });
    assert.strictEqual(entries.length, 3);
    assert.ok(entries[0].includes("message 7"));
    assert.ok(entries[1].includes("message 8"));
    assert.ok(entries[2].includes("message 9"));
  });

  it("createLogWriter returns working writer", async () => {
    const writer = await createLogWriter({ logsDir: testDir });

    await writer.write("newsession", "writer test");
    await writer.close();

    const entries = await readLogs("newsession", { logsDir: testDir });
    assert.strictEqual(entries.length, 1);
    assert.ok(entries[0].includes("writer test"));
  });

  it("writer throws after close", async () => {
    const writer = await createLogWriter({ logsDir: testDir });
    await writer.close();

    await assert.rejects(writer.write("test", "msg"), {
      message: "LogWriter is closed",
    });
  });
});
