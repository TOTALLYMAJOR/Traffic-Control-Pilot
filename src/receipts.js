import { ContractViolation, verifyContract } from "./contracts.js";
import { verifyDecisionHistory } from "./history.js";
import { sha256 } from "./integrity.js";

const COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const DIGEST_PATTERN = /^[0-9a-f]{64}$/;
const RFC3339_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export class ReceiptViolation extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "ReceiptViolation";
    this.code = code;
    this.details = details;
  }
}

function evidenceIds(evidence) {
  return new Set([
    ...(Array.isArray(evidence?.artifacts) ? evidence.artifacts : []).flatMap((artifact) =>
      typeof artifact.id === "string" && DIGEST_PATTERN.test(artifact.sha256 ?? "")
        ? [artifact.id]
        : [],
    ),
    ...(Array.isArray(evidence?.events) ? evidence.events : []).flatMap((event) =>
      typeof event.evidenceId === "string" && DIGEST_PATTERN.test(event.sha256 ?? "")
        ? [event.evidenceId]
        : [],
    ),
  ]);
}

function assertEvidence(contract, evidence) {
  const satisfied = evidenceIds(evidence);
  const missing = contract.document.proof.requiredEvidence.filter(
    (required) => !satisfied.has(required),
  );
  if (missing.length > 0) {
    throw new ReceiptViolation(
      "REQUIRED_EVIDENCE_MISSING",
      "Build receipt is missing required evidence",
      { missing },
    );
  }
}

function assertGovernorProvenance(governor, contract) {
  const action = governor?.finalDecision ?? governor?.action;
  if (
    action !== "CONTINUE" ||
    !Array.isArray(governor?.policyVersions) ||
    governor.policyVersions.length === 0 ||
    governor.policyVersions.some(
      (version) => typeof version !== "string" || version.trim().length === 0,
    ) ||
    !Array.isArray(governor?.decisionRecordHashes) ||
    governor.decisionRecordHashes.length === 0 ||
    governor.decisionRecordHashes.some((digest) => !DIGEST_PATTERN.test(digest))
  ) {
    throw new ReceiptViolation(
      "INVALID_GOVERNOR_PROVENANCE",
      "Completion requires a CONTINUE decision with policy and decision-record hashes",
    );
  }
  if (!Array.isArray(governor.decisionRecords) || governor.decisionRecords.length === 0) {
    throw new ReceiptViolation(
      "INVALID_GOVERNOR_PROVENANCE",
      "Completion requires the referenced Governor decision records",
    );
  }
  try {
    verifyDecisionHistory(governor.decisionRecords);
  } catch (error) {
    throw new ReceiptViolation(
      "INVALID_GOVERNOR_PROVENANCE",
      error instanceof Error ? error.message : "Governor decision history is invalid",
    );
  }
  const recordHashes = governor.decisionRecords.map((record) => record.recordHash);
  const recordPolicies = [...new Set(
    governor.decisionRecords.map((record) => record.policyVersion),
  )].sort();
  const declaredPolicies = [...new Set(governor.policyVersions)].sort();
  const finalRecord = governor.decisionRecords.at(-1);
  if (
    JSON.stringify(recordHashes) !== JSON.stringify(governor.decisionRecordHashes) ||
    JSON.stringify(recordPolicies) !== JSON.stringify(declaredPolicies) ||
    finalRecord.decision?.action !== "CONTINUE" ||
    finalRecord.contractHash !== contract.binding.sha256
  ) {
    throw new ReceiptViolation(
      "INVALID_GOVERNOR_PROVENANCE",
      "Governor decision records do not reconcile with the completion claim",
    );
  }
}

function verifyBoundContract(contract, authority) {
  try {
    verifyContract(contract, authority ?? {});
  } catch (error) {
    if (!(error instanceof ContractViolation)) throw error;
    throw new ReceiptViolation(error.code, error.message, error.details);
  }
}

function validTimestamp(value) {
  return (
    typeof value === "string" &&
    RFC3339_PATTERN.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

function pathAllowed(changedPath, roots) {
  return roots.some((root) => {
    const normalized = root.replace(/\/+$/, "");
    return changedPath === normalized || changedPath.startsWith(`${normalized}/`);
  });
}

function taskExecutionIsValid(task, governedTask) {
  if (
    !Array.isArray(task.changedFiles) ||
    task.changedFiles.some(
      (changedPath) =>
        typeof changedPath !== "string" ||
        !pathAllowed(changedPath, governedTask.owns),
    ) ||
    !Array.isArray(task.validation) ||
    task.validation.some((result) => result?.status !== "passed")
  ) {
    return false;
  }
  return governedTask.validate.every((command) =>
    task.validation.some(
      (result) => result.command === command && result.status === "passed",
    ),
  );
}

function assertExecutionMatchesContract({ build, tasks, issuedAt }, contract) {
  if (build?.status !== "completed") {
    throw new ReceiptViolation(
      "BUILD_NOT_INTEGRATED",
      "Only a completed build can produce a build receipt",
    );
  }
  if (build.baseCommit !== contract.document.repository.baseCommit) {
    throw new ReceiptViolation(
      "BUILD_BASE_COMMIT_MISMATCH",
      "Build base commit differs from the governed handoff",
    );
  }
  if (!COMMIT_PATTERN.test(build.integrationCommit ?? "")) {
    throw new ReceiptViolation(
      "INVALID_INTEGRATION_COMMIT",
      "A completed build requires a valid integration commit",
    );
  }

  const expectedTaskIds = new Set(contract.document.tasks.map((task) => task.id));
  const governedTasks = new Map(
    contract.document.tasks.map((task) => [task.id, task]),
  );
  const receivedTaskIds = new Set(
    Array.isArray(tasks) ? tasks.map((task) => task.id) : [],
  );
  if (
    !Array.isArray(tasks) ||
    tasks.length !== expectedTaskIds.size ||
    receivedTaskIds.size !== tasks.length ||
    tasks.some((task) => {
      const governedTask = governedTasks.get(task.id);
      return (
        !governedTask ||
        task.status !== "integrated" ||
        !COMMIT_PATTERN.test(task.resultCommit ?? "") ||
        !COMMIT_PATTERN.test(task.integrationCommit ?? "") ||
        !taskExecutionIsValid(task, governedTask)
      );
    })
  ) {
    throw new ReceiptViolation(
      "TASKS_NOT_INTEGRATED",
      "Receipt tasks must exactly match the governed integrated tasks",
    );
  }
  if (!validTimestamp(issuedAt)) {
    throw new ReceiptViolation(
      "INVALID_RECEIPT_TIMESTAMP",
      "Receipt generation time must be an ISO timestamp",
    );
  }
}

export function createBuildReceipt(input) {
  const contract = input.contract;
  verifyBoundContract(contract, input.authority);
  assertExecutionMatchesContract(input, contract);
  if (input.governor?.finalDecision !== "CONTINUE") {
    throw new ReceiptViolation(
      "GOVERNOR_NOT_ENTITLED",
      "Governor did not entitle the build to complete",
    );
  }
  assertGovernorProvenance(input.governor, contract);
  assertEvidence(contract, input.evidence);

  const document = {
    schemaVersion: "1.0.0",
    kind: "agentflow/build-receipt",
    handoff: {
      id: contract.binding.id,
      sha256: contract.binding.sha256,
    },
    build: structuredClone(input.build),
    tasks: structuredClone(input.tasks),
    evidence: {
      events: [
        ...structuredClone(input.evidence.events),
        {
          type: "governor.decision",
          action: input.governor.finalDecision,
          policyVersions: structuredClone(input.governor.policyVersions),
          decisionRecordHashes: structuredClone(
            input.governor.decisionRecordHashes,
          ),
          decisionRecords: structuredClone(input.governor.decisionRecords),
          authorityObservation: structuredClone(input.authority),
        },
      ],
      artifacts: structuredClone(input.evidence.artifacts),
      approvals: structuredClone(input.evidence.approvals),
    },
    proofBoundary: contract.document.proof.claimBoundary,
    generatedAt: input.issuedAt,
  };
  return {
    document,
    binding: { algorithm: "sha256", sha256: sha256(document) },
  };
}

export function auditBuildReceipt(receipt, contract) {
  const document = receipt.document;
  const expectedDigest = sha256(document);
  if (
    receipt.binding?.algorithm !== "sha256" ||
    receipt.binding.sha256 !== expectedDigest
  ) {
    throw new ReceiptViolation(
      "RECEIPT_HASH_DRIFT",
      "Receipt contents no longer match its digest",
    );
  }
  if (
    document.kind !== "agentflow/build-receipt" ||
    document.schemaVersion !== "1.0.0"
  ) {
    throw new ReceiptViolation(
      "UNSUPPORTED_RECEIPT_SCHEMA",
      "Receipt schema is unsupported",
    );
  }
  if (
    document.handoff.id !== contract.binding.id ||
    document.handoff.sha256 !== contract.binding.sha256
  ) {
    throw new ReceiptViolation(
      "RECEIPT_CONTRACT_MISMATCH",
      "Receipt is not bound to the supplied approved handoff",
    );
  }
  if (
    document.proofBoundary !== contract.document.proof.claimBoundary
  ) {
    throw new ReceiptViolation(
      "INVALID_PROOF_BOUNDARY",
      "Receipt proof boundary differs from the governed handoff",
    );
  }
  assertExecutionMatchesContract(
    { build: document.build, tasks: document.tasks, issuedAt: document.generatedAt },
    contract,
  );
  const governorEvents = document.evidence.events.filter(
    (event) => event.type === "governor.decision",
  );
  if (governorEvents.length !== 1) {
    throw new ReceiptViolation(
      "INVALID_GOVERNOR_PROVENANCE",
      "Receipt must contain exactly one Governor completion decision",
    );
  }
  verifyBoundContract(contract, governorEvents[0].authorityObservation);
  assertGovernorProvenance(governorEvents[0], contract);
  assertEvidence(contract, document.evidence);
  return {
    valid: true,
    receiptHash: receipt.binding.sha256,
    proofBoundary: document.proofBoundary,
  };
}
