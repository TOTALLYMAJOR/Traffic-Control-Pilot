#!/usr/bin/env node

import { readFile } from "node:fs/promises";

import { bindContract } from "./contracts.js";
import { runDemo } from "./demo.js";
import { resolveGovernorPolicy } from "./governor.js";
import { replayHistory } from "./history.js";

function option(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

function printDemo(result, json) {
  if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  process.stdout.write("Traffic Control Pilot\n\n");
  for (const [index, stage] of result.stages.entries()) {
    process.stdout.write(
      `${index + 1}. ${stage.decision.action} (${stage.decision.ruleId})\n`,
    );
  }
  process.stdout.write(
    `\nSupersession: ${result.supersession.from} -> ${result.supersession.to}\n`,
  );
  process.stdout.write(
    `Receipt: ${result.receiptAudit.valid ? "verified" : "failed"} ` +
      `(${result.receiptAudit.proofBoundary})\n`,
  );
  process.stdout.write(
    `Replay: ${result.replay.matchesOriginalDecisions ? "deterministic" : "mismatch"}\n`,
  );
}

async function replayFromFile(inputPath) {
  const input = JSON.parse(await readFile(inputPath, "utf8"));
  const contract = bindContract(input.handoff);
  const policy = resolveGovernorPolicy(input.policyVersion);
  return replayHistory({
    contract,
    eventBatches: input.eventBatches,
    policy,
  });
}

async function main() {
  const command = process.argv[2] ?? "demo";
  const json = process.argv.includes("--json");

  if (command === "demo") {
    printDemo(runDemo(), json);
    return;
  }
  if (command === "replay") {
    const inputPath = option("--input");
    if (!inputPath) {
      throw new Error("replay requires --input <normalized-history.json>");
    }
    const result = await replayFromFile(inputPath);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
