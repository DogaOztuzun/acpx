import { Command } from "commander";
import type { OutputFormat } from "../types.js";
import { initGlobalConfigFile, toConfigDisplay, type ResolvedAcpxConfig } from "./config.js";
import { parseOutputFormat } from "./flags.js";

function formatConfigText(payload: Record<string, unknown>, indent = ""): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(payload)) {
    if (value === null || value === undefined) {
      lines.push(`${indent}${key}: null`);
    } else if (typeof value === "object" && !Array.isArray(value)) {
      lines.push(`${indent}${key}:`);
      lines.push(formatConfigText(value as Record<string, unknown>, `${indent}  `));
    } else if (Array.isArray(value)) {
      lines.push(`${indent}${key}:`);
      for (const item of value) {
        if (typeof item === "object" && item !== null) {
          lines.push(`${indent}  -`);
          lines.push(formatConfigText(item as Record<string, unknown>, `${indent}    `));
        } else if (typeof item === "string") {
          lines.push(`${indent}  - ${item}`);
        } else {
          lines.push(`${indent}  - ${JSON.stringify(item)}`);
        }
      }
    } else if (typeof value === "string") {
      lines.push(`${indent}${key}: ${value}`);
    } else {
      lines.push(`${indent}${key}: ${JSON.stringify(value)}`);
    }
  }
  return lines.join("\n");
}

function formatConfigQuiet(payload: Record<string, unknown>, prefix = ""): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(payload)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value === null || value === undefined) {
      lines.push(`${fullKey}\tnull`);
    } else if (typeof value === "object" && !Array.isArray(value)) {
      lines.push(formatConfigQuiet(value as Record<string, unknown>, fullKey));
    } else if (Array.isArray(value)) {
      lines.push(`${fullKey}\t${JSON.stringify(value)}`);
    } else if (typeof value === "string") {
      lines.push(`${fullKey}\t${value}`);
    } else {
      lines.push(`${fullKey}\t${JSON.stringify(value)}`);
    }
  }
  return lines.join("\n");
}

async function handleConfigShow(command: Command, config: ResolvedAcpxConfig): Promise<void> {
  const opts = command.optsWithGlobals();
  const format: OutputFormat = opts.format ?? "json";
  const payload = {
    ...toConfigDisplay(config),
    paths: {
      global: config.globalPath,
      project: config.projectPath,
    },
    loaded: {
      global: config.hasGlobalConfig,
      project: config.hasProjectConfig,
    },
  };

  if (format === "json") {
    process.stdout.write(`${JSON.stringify(payload)}\n`);
    return;
  }

  if (format === "quiet") {
    process.stdout.write(`${formatConfigQuiet(payload)}\n`);
    return;
  }

  process.stdout.write(`${formatConfigText(payload)}\n`);
}

async function handleConfigInit(command: Command, config: ResolvedAcpxConfig): Promise<void> {
  const opts = command.optsWithGlobals();
  const format: OutputFormat = opts.format ?? config.format ?? "text";
  const result = await initGlobalConfigFile();
  if (format === "json") {
    process.stdout.write(
      `${JSON.stringify({
        path: result.path,
        created: result.created,
      })}\n`,
    );
    return;
  }
  if (format === "quiet") {
    process.stdout.write(`${result.path}\n`);
    return;
  }

  if (result.created) {
    process.stdout.write(`Created ${result.path}\n`);
    return;
  }
  process.stdout.write(`Config already exists: ${result.path}\n`);
}

export function registerConfigCommand(program: Command, config: ResolvedAcpxConfig): void {
  const configCommand = program
    .command("config")
    .description("Inspect and initialize acpx configuration");

  configCommand
    .command("show")
    .description("Show resolved config")
    .option("--format <fmt>", "Output format: text, json, quiet", parseOutputFormat)
    .action(async function (this: Command) {
      await handleConfigShow(this, config);
    });

  configCommand
    .command("init")
    .description("Create global config template")
    .action(async function (this: Command) {
      await handleConfigInit(this, config);
    });

  configCommand
    .option("--format <fmt>", "Output format: text, json, quiet", parseOutputFormat)
    .action(async function (this: Command) {
      await handleConfigShow(this, config);
    });
}
