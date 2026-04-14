import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const CLI_PATH = fileURLToPath(new URL("../src/cli.js", import.meta.url));

type CliRunResult = {
  code: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
};

async function runCli(args: string[], homeDir: string): Promise<CliRunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [CLI_PATH, ...args], {
      env: { ...process.env, HOME: homeDir },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });

    child.once("error", reject);
    child.once("close", (code, signal) => {
      resolve({ code, signal, stdout, stderr });
    });
  });
}

async function withTempHome(run: (homeDir: string) => Promise<void>): Promise<void> {
  const originalHome = process.env.HOME;
  const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), "acpx-config-cmd-"));
  process.env.HOME = homeDir;

  try {
    await run(homeDir);
  } finally {
    if (originalHome == null) {
      delete process.env.HOME;
    } else {
      process.env.HOME = originalHome;
    }
    await fs.rm(homeDir, { recursive: true, force: true });
  }
}

test("config show outputs JSON by default", async () => {
  await withTempHome(async (homeDir) => {
    const result = await runCli(["config", "show"], homeDir);
    assert.equal(result.code, 0, result.stderr);

    const payload = JSON.parse(result.stdout.trim()) as {
      defaultAgent?: string;
      format?: string;
      paths?: { global?: string; project?: string };
      loaded?: { global?: boolean; project?: boolean };
    };
    assert.equal(typeof payload.defaultAgent, "string");
    assert.equal(typeof payload.format, "string");
    assert.equal(typeof payload.paths?.global, "string");
    assert.equal(typeof payload.paths?.project, "string");
    assert.equal(typeof payload.loaded?.global, "boolean");
    assert.equal(typeof payload.loaded?.project, "boolean");
  });
});

test("config show --format json outputs compact JSON", async () => {
  await withTempHome(async (homeDir) => {
    const result = await runCli(["config", "show", "--format", "json"], homeDir);
    assert.equal(result.code, 0, result.stderr);

    const lines = result.stdout.trim().split("\n");
    const payload = JSON.parse(lines[0]) as {
      defaultAgent?: string;
    };
    assert.equal(typeof payload.defaultAgent, "string");
    assert.equal(lines.length, 1, "JSON should be compact (single line)");
  });
});

test("config show --format text outputs human-readable format", async () => {
  await withTempHome(async (homeDir) => {
    const result = await runCli(["config", "show", "--format", "text"], homeDir);
    assert.equal(result.code, 0, result.stderr);

    assert.match(result.stdout, /defaultAgent: codex/);
    assert.match(result.stdout, /format: text/);
    assert.match(result.stdout, /paths:/);
    assert.match(result.stdout, /global: /);
    assert.match(result.stdout, /project: /);
    assert.match(result.stdout, /loaded:/);
  });
});

test("config show --format quiet outputs key-value pairs", async () => {
  await withTempHome(async (homeDir) => {
    const result = await runCli(["config", "show", "--format", "quiet"], homeDir);
    assert.equal(result.code, 0, result.stderr);

    const lines = result.stdout.trim().split("\n");
    const keyValuePairs = lines.map((line) => {
      const [key, value] = line.split("\t");
      return { key, value };
    });

    assert(keyValuePairs.some((kv) => kv.key === "defaultAgent" && kv.value === "codex"));
    assert(keyValuePairs.some((kv) => kv.key === "format" && kv.value === "text"));
    assert(keyValuePairs.some((kv) => kv.key === "paths.global"));
    assert(keyValuePairs.some((kv) => kv.key === "paths.project"));
  });
});

test("config show displays merged global and project config", async () => {
  await withTempHome(async (homeDir) => {
    const cwd = path.join(homeDir, "workspace");
    await fs.mkdir(cwd, { recursive: true });
    await fs.mkdir(path.join(homeDir, ".acpx"), { recursive: true });

    await fs.writeFile(
      path.join(homeDir, ".acpx", "config.json"),
      `${JSON.stringify(
        {
          defaultAgent: "codex",
          defaultPermissions: "deny-all",
          format: "json",
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    await fs.writeFile(
      path.join(cwd, ".acpxrc.json"),
      `${JSON.stringify(
        {
          defaultPermissions: "approve-all",
          format: "quiet",
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const result = await runCli(["--cwd", cwd, "config", "show", "--format", "json"], homeDir);
    assert.equal(result.code, 0, result.stderr);

    const payload = JSON.parse(result.stdout.trim()) as {
      defaultAgent?: string;
      defaultPermissions?: string;
      format?: string;
      loaded?: { global?: boolean; project?: boolean };
    };
    assert.equal(payload.defaultAgent, "codex");
    assert.equal(payload.defaultPermissions, "approve-all");
    assert.equal(payload.format, "quiet");
    assert.equal(payload.loaded?.global, true);
    assert.equal(payload.loaded?.project, true);
  });
});

test("config show handles missing config files gracefully", async () => {
  await withTempHome(async (homeDir) => {
    const result = await runCli(["config", "show", "--format", "json"], homeDir);
    assert.equal(result.code, 0, result.stderr);

    const payload = JSON.parse(result.stdout.trim()) as {
      defaultAgent?: string;
      loaded?: { global?: boolean; project?: boolean };
    };
    assert.equal(payload.defaultAgent, "codex");
    assert.equal(payload.loaded?.global, false);
    assert.equal(payload.loaded?.project, false);
  });
});

test("config init creates config file", async () => {
  await withTempHome(async (homeDir) => {
    const result = await runCli(["config", "init"], homeDir);
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Created/);

    const configPath = path.join(homeDir, ".acpx", "config.json");
    const configExists = await fs
      .access(configPath)
      .then(() => true)
      .catch(() => false);
    assert.equal(configExists, true);
  });
});

test("config init reports existing config", async () => {
  await withTempHome(async (homeDir) => {
    await fs.mkdir(path.join(homeDir, ".acpx"), { recursive: true });
    await fs.writeFile(path.join(homeDir, ".acpx", "config.json"), "{}", "utf8");

    const result = await runCli(["config", "init"], homeDir);
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /already exists/);
  });
});
