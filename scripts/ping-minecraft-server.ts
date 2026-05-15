#!/usr/bin/env bun
/**
 * Manual Minecraft server ping script.
 *
 * Usage:
 *   bun run scripts/ping-minecraft-server.ts <host> [port]
 *
 * Examples:
 *   bun run scripts/ping-minecraft-server.ts mc.hypixel.net
 *   bun run scripts/ping-minecraft-server.ts play.example.com 25575
 */

import { pingMinecraftServer } from "../packages/minecraft-status/src/ping";

const [host, portStr] = process.argv.slice(2);

if (!host) {
  console.error("Usage: bun run scripts/ping-minecraft-server.ts <host> [port]");
  process.exit(1);
}

const port = portStr !== undefined ? parseInt(portStr, 10) : 25565;
if (isNaN(port) || port < 1 || port > 65535) {
  console.error(`Invalid port: ${portStr}`);
  process.exit(1);
}

console.log(`Pinging ${host}:${port} ...`);
const start = Date.now();
const result = await pingMinecraftServer(host, port, 5000);
const elapsed = Date.now() - start;

if (result === null) {
  console.log(`❌  No response from ${host}:${port} (${elapsed}ms)`);
  process.exit(1);
}

console.log(`✅  ${host}:${port} responded in ${elapsed}ms`);
console.log();
console.log(`  Version   : ${result.version}`);
console.log(`  Players   : ${result.players.online} / ${result.players.max}`);
console.log(`  MOTD raw  : ${result.motd.raw}`);
console.log(`  MOTD clean: ${result.motd.colorless}`);
console.log(`  Icon      : ${result.icon ? "yes (data URI)" : "none"}`);
