import path from "node:path";

import { canonicalJson, sha256 } from "./integrity.js";

const SUPPORTED_VERSION = "2.0.0";
const HANDOFF_KIND = "design-intelligence/governed-task-handoff";
const COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const DIGEST_PATTERN = /^[0-9a-f]{64}$/;
const TASK_ID_PATTERN = /^[A-Z0-9][A-Z0-9._-]*$/;
const RFC3339_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export class ContractViolation extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "ContractViolation";
    this.code = code;
    this.details = details;
  }
}

function validateShape(document) {
  if (
    document.schemaVersion !== SUPPORTED_VERSION ||
    document.kind !== HANDOFF_KIND
  ) {
    throw new ContractViolation(
      "UNSUPPORTED_CONTRACT_SCHEMA",
      `Unsupported handoff ${document.kind ?? "missing"}@${document.schemaVersion ?? "missing"}`,
    );
  }
  if (
    typeof document.handoffId !== "string" ||
    document.handoffId.trim().length === 0 ||
    typeof document.objective !== "string" ||
    document.objective.trim().length === 0 ||
    !validTimestamp(document.createdAt)
  ) {
    throw new ContractViolation(
      "INVALID_CONTRACT_IDENTITY",
      "Handoff identity and objective are required",
    );
  }
    if (
      !COMMIT_PATTERN.test(document.repository?.baseCommit ?? "") ||
      !DIGEST_PATTERN.test(document.repository?.snapshotSha256 ?? "") ||
      document.repository?.worktreeState !== "clean"
    ) {
      throw new ContractViolation(
        "INVALID_REPOSITORY_BINDING",
        "Repository base commit, clean worktree state, and snapshot digest are required",
      );
  }
  if (!(["PROPOSED", "APPROVED"].includes(document.authority?.status))) {
    throw new ContractViolation(
      "INVALID_APPROVAL",
      "Authority status must be PROPOSED or APPROVED",
    );
  }
    if (
      document.authority.status === "APPROVED" &&
    (typeof document.authority.approvedBy !== "string" ||
      document.authority.approvedBy.trim().length === 0 ||
      !validTimestamp(document.authority.approvedAt))
  ) {
    throw new ContractViolation(
      "INVALID_APPROVAL",
      "Approved handoffs require an approver and approval timestamp",
    );
  }
  if (!Array.isArray(document.authority?.sources) || document.authority.sources.length === 0) {
    throw new ContractViolation(
      "INVALID_AUTHORITY_SOURCES",
      "At least one authority source is required",
    );
  }
  if (
    document.authority.sources.some(
      (source) =>
        typeof source?.path !== "string" ||
        source.path.trim().length === 0 ||
        !DIGEST_PATTERN.test(source.sha256 ?? ""),
    )
  ) {
    throw new ContractViolation(
      "INVALID_AUTHORITY_SOURCES",
      "Every authority source requires a path and SHA-256 digest",
    );
  }
  if (!Array.isArray(document.tasks) || document.tasks.length === 0) {
    throw new ContractViolation(
      "INVALID_TASKS",
      "At least one governed task is required",
    );
  }
  const taskIds = new Set(document.tasks.map((task) => task.id));
  if (
    taskIds.size !== document.tasks.length ||
    document.tasks.some((task) => !TASK_ID_PATTERN.test(task.id ?? ""))
  ) {
    throw new ContractViolation(
      "INVALID_TASK_IDENTITY",
      "Governed task ids must be unique",
    );
  }
  for (const task of document.tasks) {
    if (
      typeof task.title !== "string" ||
      task.title.trim().length === 0 ||
      typeof task.description !== "string" ||
      task.description.trim().length === 0 ||
      !Number.isFinite(task.estimateHours) ||
      task.estimateHours <= 0 ||
      !validStringList(task.acceptanceCriteria) ||
      !validStringList(task.validate)
    ) {
      throw new ContractViolation(
        "INVALID_TASKS",
        `Task ${task.id ?? "unknown"} is incomplete`,
      );
    }
    if (
      !DIGEST_PATTERN.test(document.authority?.stateSha256 ?? "") ||
      !DIGEST_PATTERN.test(document.authority?.governanceReportSha256 ?? "")
    ) {
      throw new ContractViolation(
        "INVALID_APPROVAL",
        "Authority state and governance report digests are required",
      );
    }
    if (
      !Array.isArray(task.dependsOn) ||
      task.dependsOn.some(
        (dependency) => dependency === task.id || !taskIds.has(dependency),
      )
    ) {
      throw new ContractViolation(
        "INVALID_TASK_DEPENDENCY",
        `Task ${task.id ?? "unknown"} has an invalid dependency`,
      );
    }
    if (
      !Array.isArray(task.owns) ||
      task.owns.length === 0 ||
      task.owns.some((ownedPath) => !validOwnershipRoot(ownedPath))
    ) {
      throw new ContractViolation(
        "INVALID_OWNERSHIP",
        `Task ${task.id ?? "unknown"} has an invalid ownership root`,
      );
    }
  }
  if (
    !validStringList(document.proof?.requiredEvidence) ||
    typeof document.proof?.claimBoundary !== "string" ||
    document.proof.claimBoundary.trim().length === 0
  ) {
    throw new ContractViolation(
      "INVALID_REQUIRED_EVIDENCE",
      "Proof requirements must be an array",
    );
  }
}

function validTimestamp(value) {
  return (
    typeof value === "string" &&
    RFC3339_PATTERN.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

function validStringList(value) {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => typeof item === "string" && item.trim().length > 0)
  );
}

function validOwnershipRoot(value) {
  if (typeof value !== "string") return false;
  const candidate = value.trim().replaceAll("\\", "/");
  if (
    candidate.length === 0 ||
    candidate === "." ||
    candidate.includes("\0") ||
    candidate.includes("*") ||
    path.posix.isAbsolute(candidate) ||
    path.win32.isAbsolute(value.trim())
  ) {
    return false;
  }
  const segments = candidate.split("/").filter((segment) => segment && segment !== ".");
  return (
    segments.length > 0 &&
    !segments.includes("..") &&
    !segments.some((segment) => [".git", ".agentflow"].includes(segment.toLowerCase()))
  );
}

function normalizeSources(sources) {
  if (
    !Array.isArray(sources) ||
    sources.some(
      (source) =>
        typeof source?.path !== "string" ||
        !DIGEST_PATTERN.test(source?.sha256 ?? ""),
    )
  ) {
    return null;
  }
  return sources
    .map(({ path, sha256: digest }) => ({ path, sha256: digest }))
    .sort((left, right) => left.path.localeCompare(right.path));
}

export function bindContract(input) {
  const document = structuredClone(input);
  validateShape(document);
  return {
    document,
    binding: {
      algorithm: "sha256",
      id: document.handoffId,
        sha256: sha256(canonicalJson(document)),
        baseCommit: document.repository.baseCommit,
        snapshotSha256: document.repository.snapshotSha256,
        proofBoundary: document.proof.claimBoundary,
      repositoryId: document.repository.remote ?? null,
    },
  };
}

export function verifyContract(contract, observedAuthority) {
  const document = contract.document;
  validateShape(document);

  if (document.authority.status !== "APPROVED") {
    throw new ContractViolation(
      "CONTRACT_NOT_APPROVED",
      `Handoff authority must be APPROVED, received ${document.authority.status ?? "missing"}`,
    );
  }
  if (observedAuthority.approvalAuthority !== "HUMAN_OR_REPOSITORY") {
    throw new ContractViolation(
      "INVALID_APPROVAL_AUTHORITY",
      "Approval provenance must resolve to human or repository authority",
    );
  }

  const expectedDigest = sha256(canonicalJson(document));
  if (
    contract.binding?.algorithm !== "sha256" ||
    contract.binding?.sha256 !== expectedDigest
  ) {
    throw new ContractViolation(
      "CONTRACT_HASH_DRIFT",
      "Handoff contents no longer match the bound digest",
      { expectedDigest, observedDigest: contract.binding?.sha256 ?? null },
    );
  }
  if (
    observedAuthority.handoffId !== document.handoffId ||
    observedAuthority.handoffSha256 !== contract.binding.sha256
  ) {
    throw new ContractViolation(
      "CONTRACT_BINDING_DRIFT",
      "Observed execution is not bound to the approved handoff",
    );
  }
  if (
    document.repository.remote &&
    observedAuthority.repositoryId !== document.repository.remote
  ) {
    throw new ContractViolation(
      "REPOSITORY_IDENTITY_DRIFT",
      "Observed repository identity differs from approved authority",
    );
  }
    if (observedAuthority.baseCommit !== document.repository.baseCommit) {
    throw new ContractViolation(
      "BASE_COMMIT_DRIFT",
      "Observed base commit differs from approved authority",
      );
    }
    if (
      observedAuthority.snapshotSha256 !== document.repository.snapshotSha256 ||
      observedAuthority.worktreeState !== document.repository.worktreeState
    ) {
      throw new ContractViolation(
        "SNAPSHOT_DRIFT",
        "Observed repository snapshot differs from approved authority",
      );
    }
    if (observedAuthority.authorityStateSha256 !== document.authority.stateSha256) {
      throw new ContractViolation(
        "AUTHORITY_STATE_DRIFT",
        "Observed critical authority state differs from approved authority",
      );
    }
    if (
      observedAuthority.governanceReportSha256 !==
      document.authority.governanceReportSha256
    ) {
      throw new ContractViolation(
        "GOVERNANCE_REPORT_DRIFT",
        "Observed governance report differs from approved authority",
      );
    }
  const observedSources = normalizeSources(observedAuthority.authoritySources);
  if (
    observedSources === null ||
    canonicalJson(observedSources) !==
      canonicalJson(normalizeSources(document.authority.sources))
  ) {
    throw new ContractViolation(
      "AUTHORITY_SOURCE_DRIFT",
      "Observed authority-source hashes differ from approved authority",
    );
  }
  return { valid: true, contractHash: contract.binding.sha256 };
}
