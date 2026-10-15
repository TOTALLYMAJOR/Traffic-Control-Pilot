import { canonicalJson, sha256 } from "../src/integrity.js";

export function approveHandoff(input) {
  const proposed = structuredClone(input);
  proposed.schemaVersion = "2.1.0";
  proposed.authority.status = "PROPOSED";
  delete proposed.authority.approvedBy;
  delete proposed.authority.approvedAt;
  delete proposed.authority.approvalReceipt;
  const issuedAt = new Date(Date.now() - 60_000).toISOString();
  const validUntil = new Date(Date.now() + 60 * 60_000).toISOString();
  const paths = [...new Set(proposed.tasks.flatMap((task) => task.owns))];
  const receiptWithoutId = {
    schemaVersion: 1,
    kind: "proofloom/execution-approval-receipt",
    receiptType: "EXECUTION_APPROVAL",
    policyVersion: "human-authority/v1",
    decision: "APPROVED",
    sessionId: "traffic-control-test",
    authority: {
      actorId: "human:repository-owner",
      role: "repository-owner",
      basis: "test approval",
    },
    repositoryRevision: proposed.repository.baseCommit,
    artifact: {
      kind: "design-intelligence/governed-task-handoff-scope",
      id: proposed.handoffId,
      sha256: sha256(canonicalJson(proposed)),
    },
    scope: {
      repository: ".",
      paths,
      actions: ["execute-governed-handoff", "repair.apply"],
    },
    governingSources: proposed.authority.sources,
    issuedAt,
    validUntil,
    supersedes: null,
    transition: { handoffId: proposed.handoffId },
    constraints: {
      allowedActions: ["execute-governed-handoff", "repair.apply"],
      requiredEvidence: proposed.proof.requiredEvidence,
      escalationConditions: ["authority drift"],
      resourceCeilings: { wallClockMinutes: 60 },
      iterationCeiling: 1,
      revocationAuthorityRoles: ["repository-owner"],
    },
    mutationPerformed: false,
  };
  const approvalReceipt = {
    ...receiptWithoutId,
    receiptId: `HAR-${sha256(canonicalJson(receiptWithoutId)).slice(0, 20).toUpperCase()}`,
  };
  return {
    ...proposed,
    authority: {
      ...proposed.authority,
      status: "APPROVED",
      approvedBy: "human:repository-owner",
      approvedAt: issuedAt,
      approvalReceipt,
    },
  };
}
