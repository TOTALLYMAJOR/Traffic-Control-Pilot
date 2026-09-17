import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import { sha256 } from "./integrity.js";
import { evaluateGovernor } from "./governor.js";
import { reduceExecutionEvents } from "./observations.js";

export function createDecisionRecord({
  decision,
  observationHash,
  contractHash,
  previousRecordHash = null,
  recordedAt,
}) {
  const record = {
    schema: "traffic-control/governor-decision-record@1",
    recordedAt,
    contractHash,
    observationHash,
    previousRecordHash,
    policyVersion: decision.policyVersion,
    decision: structuredClone(decision),
  };
  return { ...record, recordHash: sha256(record) };
}

export function verifyDecisionRecord(record) {
  const { recordHash, ...payload } = record;
  if (recordHash !== sha256(payload)) {
    throw new TypeError("Governor decision record hash is invalid");
  }
  return true;
}

export function verifyDecisionHistory(records) {
  let previousRecordHash = null;
  for (const record of records) {
    verifyDecisionRecord(record);
    if (record.previousRecordHash !== previousRecordHash) {
      throw new TypeError("Governor decision history chain is invalid");
    }
    previousRecordHash = record.recordHash;
  }
  return true;
}

export async function appendDecisionRecord(historyPath, record) {
  verifyDecisionRecord(record);
  await mkdir(dirname(historyPath), { recursive: true });
  await appendFile(historyPath, `${JSON.stringify(record)}\n`, "utf8");
}

export function replayHistory({ contract, eventBatches, policy }) {
  return eventBatches.map((batch) => {
    const selectedContract = Array.isArray(batch) ? contract : batch.contract;
    const events = Array.isArray(batch) ? batch : batch.events;
    const observation = reduceExecutionEvents(events, {
      contract: selectedContract,
    });
    return {
      observation,
      decision: evaluateGovernor({
        contract: selectedContract,
        observation,
        policy,
      }),
    };
  });
}

const ACTION_METHODS = {
  CONTINUE: "continue",
  DELEGATE_RETRY: "delegateRetry",
  REQUEST_REPAIR: "requestRepair",
  REQUEST_RECONSIDER: "requestReconsider",
  BLOCK_INTEGRATION: "blockIntegration",
  PAUSE_FOR_REVIEW: "pauseForReview",
  PROPOSE_REPLAN: "proposeReplan",
  CANCEL: "cancel",
};

export async function applyIntervention(decision, runtimeAdapter, { mode }) {
  if (mode === "REPLAY") {
    throw new Error("Historical replay cannot mutate live execution");
  }
  if (
    ["REQUEST_RECONSIDER", "PROPOSE_REPLAN"].includes(decision.action) &&
    (decision.authorityEffect !== "PROPOSAL_ONLY" ||
      decision.requiresApproval !== true)
  ) {
    throw new Error(
      "Structural interventions are proposal-only and require external approval",
    );
  }
  const method = ACTION_METHODS[decision.action];
  if (!method || typeof runtimeAdapter[method] !== "function") {
    throw new TypeError(`Runtime adapter cannot apply ${decision.action}`);
  }
  return runtimeAdapter[method](decision);
}
