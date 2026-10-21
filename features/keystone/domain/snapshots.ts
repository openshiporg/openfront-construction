import type { KeystoneContextLike, KeystoneQueryRecord } from "./tenancy";
import { projectTenantHooks, queryById } from "./tenancy";

type SnapshotList = "EstimateVersion" | "DrawingRevision" | "DocumentVersion" | "ProgressClaimLineItem";

type SnapshotHookArgs = {
  operation: "create" | "update" | "delete";
  item?: { id: { toString(): string } } | null;
  inputData?: Record<string, unknown>;
  context: KeystoneContextLike;
};

const snapshotQueries: Record<SnapshotList, string> = {
  EstimateVersion: "id status lockedAt",
  DrawingRevision: "id status issuedAt",
  DocumentVersion: "id issuedAt",
  ProgressClaimLineItem: "id progressClaim { id status }",
};

function isImmutable(listKey: SnapshotList, record: KeystoneQueryRecord): boolean {
  if (listKey === "EstimateVersion") {
    return Boolean(record.lockedAt) || ["issued", "superseded"].includes(String(record.status));
  }
  if (listKey === "DrawingRevision") {
    return Boolean(record.issuedAt) || ["issued", "superseded", "voided"].includes(String(record.status));
  }
  if (listKey === "DocumentVersion") return Boolean(record.issuedAt);
  const claim = record.progressClaim as { status?: string } | null | undefined;
  return Boolean(claim?.status && !["draft", "rejected"].includes(claim.status));
}

export function immutableProjectSnapshotHooks(listKey: SnapshotList) {
  const tenancy = projectTenantHooks();
  return {
    ...tenancy,
    beforeOperation: async (args: SnapshotHookArgs) => {
      if ((args.operation !== "update" && args.operation !== "delete") || !args.item?.id) return;
      const record = await queryById(
        args.context,
        listKey,
        args.item.id.toString(),
        snapshotQueries[listKey],
      );
      if (record && listKey === "DrawingRevision" && args.operation === "update" && record.status === "issued" &&
          args.inputData?.status === "superseded" && Object.keys(args.inputData).length === 1) return;
      if (record && isImmutable(listKey, record)) {
        throw new Error(`${listKey} is an immutable historical snapshot`);
      }
    },
  };
}
