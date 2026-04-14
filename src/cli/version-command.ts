import { Command } from "commander";
import { getAcpxVersion } from "../version.js";

export function registerVersionCommand(program: Command): void {
  const versionCommand = program.command("version").description("Show the current acpx version");

  versionCommand.action(() => {
    process.stdout.write(`${getAcpxVersion()}\n`);
  });
}
