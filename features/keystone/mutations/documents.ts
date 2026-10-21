import { randomUUID } from "node:crypto";

import { hasProjectPermission, type Session } from "../access";
import { canAccessProjectById, queryById, queryCount } from "../domain/tenancy";
import { assertObjectStorageConfigured, signObjectRequest, verifyUploadedObject, type ConstructionObjectMetadata } from "../../integrations/storage";
import {
  commandDigest,
  executeProjectCommand,
  requireCommandSession,
  requireUpdate,
  requiredText,
  type CommandContext,
} from "./construction";

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
const MAX_DOCUMENT_BYTES = 50 * 1024 * 1024;

export type DocumentVersionUploadInput = {
  projectId: string;
  documentId: string;
  versionNumber: number;
  revisionLabel?: string | null;
  title: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  checksumSha256: string;
  idempotencyKey: string;
};

function safeFileName(value: string) {
  const normalized = requiredText(value, "File name", 240).replace(/[^A-Za-z0-9._-]+/g, "-");
  if (!normalized || normalized.startsWith(".")) throw new Error("File name is invalid");
  return normalized;
}
function metadata(record: Record<string, unknown>): ConstructionObjectMetadata {
  return {
    key: String(record.storageKey),
    contentType: String(record.mimeType),
    byteSize: Number(record.byteSize),
    checksumSha256: String(record.checksumSha256),
  };
}

export async function requestDocumentVersionUpload(
  _root: unknown,
  { input }: { input: DocumentVersionUploadInput },
  context: CommandContext,
) {
  const projectId = requiredText(input.projectId, "Project id", 200);
  const documentId = requiredText(input.documentId, "Document id", 200);
  const document = await queryById(context, "Document", documentId, "id title project { id company { id } }");
  if (document?.project?.id !== projectId) throw new Error("Document not found in this project");
  if (!Number.isInteger(input.versionNumber) || input.versionNumber < 1) throw new Error("Version number must be a positive integer");
  const mimeType = requiredText(input.mimeType, "Media type", 200).toLowerCase();
  if (!allowedMimeTypes.has(mimeType)) throw new Error("This document media type is not allowed");
  if (!Number.isSafeInteger(input.byteSize) || input.byteSize < 1 || input.byteSize > MAX_DOCUMENT_BYTES) {
    throw new Error(`Document size must be between 1 and ${MAX_DOCUMENT_BYTES} bytes`);
  }
  const checksumSha256 = requiredText(input.checksumSha256, "SHA-256 checksum", 64).toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(checksumSha256)) throw new Error("SHA-256 checksum must be 64 hexadecimal characters");
  const fileName = safeFileName(input.fileName);
  const companyId = document.project?.company?.id;
  if (!companyId) throw new Error("Document company is unavailable");
  assertObjectStorageConfigured();
  const storageKey = `${companyId}/${projectId}/documents/${documentId}/${randomUUID()}/${fileName}`;
  const result = await executeProjectCommand({
    context,
    operation: "requestDocumentVersionUpload",
    permission: "canManageDocuments",
    projectId,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "DocumentVersion",
    data: {
      versionNumber: input.versionNumber,
      revisionLabel: input.revisionLabel?.trim(),
      titleSnapshot: requiredText(input.title, "Version title", 300),
      fileName,
      storageKey,
      mimeType,
      byteSize: input.byteSize,
      checksumSha256,
      uploadedBy: { connect: { id: requireCommandSession(context).itemId } },
      document: { connect: { id: documentId } },
      project: { connect: { id: projectId } },
    },
  });
  const version = await queryById(context, "DocumentVersion", result.itemId, "id fileName storageKey mimeType byteSize checksumSha256 issuedAt");
  if (!version || version.issuedAt) throw new Error("Document version is not awaiting upload");
  const signed = signObjectRequest("PUT", metadata(version));
  return {
    success: true,
    versionId: result.itemId,
    actionId: result.actionId,
    replayed: result.replayed,
    uploadUrl: signed.url,
    expiresAt: signed.expiresAt,
    headers: Object.entries(signed.headers).map(([name, value]) => ({ name, value })),
  };
}

export type DrawingRevisionUploadInput = {
  projectId: string;
  drawingId: string;
  revisionNumber: string;
  title: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  checksumSha256: string;
  idempotencyKey: string;
};

export async function requestDrawingRevisionUpload(
  _root: unknown,
  { input }: { input: DrawingRevisionUploadInput },
  context: CommandContext,
) {
  const projectId = requiredText(input.projectId, "Project id", 200);
  const drawingId = requiredText(input.drawingId, "Drawing id", 200);
  const drawing = await queryById(context, "Drawing", drawingId, "id drawingNumber project { id company { id } }");
  if (drawing?.project?.id !== projectId || !drawing.project?.company?.id) throw new Error("Drawing not found in this project");
  const mimeType = requiredText(input.mimeType, "Media type", 200).toLowerCase();
  if (!allowedMimeTypes.has(mimeType)) throw new Error("This drawing media type is not allowed");
  if (!Number.isSafeInteger(input.byteSize) || input.byteSize < 1 || input.byteSize > MAX_DOCUMENT_BYTES) throw new Error(`Drawing size must be between 1 and ${MAX_DOCUMENT_BYTES} bytes`);
  const checksumSha256 = requiredText(input.checksumSha256, "SHA-256 checksum", 64).toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(checksumSha256)) throw new Error("SHA-256 checksum must be 64 hexadecimal characters");
  const fileName = safeFileName(input.fileName);
  assertObjectStorageConfigured();
  const storageKey = `${drawing.project.company.id}/${projectId}/drawings/${drawingId}/${randomUUID()}/${fileName}`;
  const result = await executeProjectCommand({
    context, operation: "requestDrawingRevisionUpload", permission: "canManageDocuments", projectId,
    idempotencyKey: input.idempotencyKey, request: input, listKey: "DrawingRevision",
    data: {
      revisionNumber: requiredText(input.revisionNumber, "Revision number", 40),
      titleSnapshot: requiredText(input.title, "Revision title", 300), status: "draft", fileName, storageKey,
      mimeType, byteSize: input.byteSize, checksumSha256,
      uploadedBy: { connect: { id: requireCommandSession(context).itemId } },
      drawing: { connect: { id: drawingId } }, project: { connect: { id: projectId } },
    },
  });
  const revision = await queryById(context, "DrawingRevision", result.itemId, "id fileName storageKey mimeType byteSize checksumSha256 status");
  if (!revision || revision.status !== "draft") throw new Error("Drawing revision is not awaiting upload");
  const signed = signObjectRequest("PUT", metadata(revision));
  return { success: true, revisionId: result.itemId, actionId: result.actionId, replayed: result.replayed, uploadUrl: signed.url, expiresAt: signed.expiresAt, headers: Object.entries(signed.headers).map(([name, value]) => ({ name, value })) };
}

export async function completeDrawingRevisionUpload(
  _root: unknown,
  { revisionId, idempotencyKey }: { revisionId: string; idempotencyKey: string },
  context: CommandContext,
) {
  const id = requiredText(revisionId, "Drawing revision id", 200);
  const revision = await queryById(context, "DrawingRevision", id, `
    id status fileName storageKey mimeType byteSize checksumSha256
    drawing { id currentRevision { id } } project { id company { id } }
  `) as Record<string, unknown> & { drawing?: { id?: string; currentRevision?: { id?: string } | null } | null; project?: { id?: string; company?: { id?: string } | null } | null } | null;
  const projectId = revision?.project?.id;
  const companyId = revision?.project?.company?.id;
  const session = requireCommandSession(context);
  if (!revision?.id || !projectId || !companyId || !revision.drawing?.id ||
      !hasProjectPermission(session, companyId, projectId, "canManageDocuments", true) ||
      !(await canAccessProjectById(context, session.itemId, projectId, true))) throw new Error("Drawing revision not found");
  if (revision.status === "issued") return { success: true, revisionId: id, actionId: "already-issued", replayed: true };
  if (revision.status !== "draft") throw new Error("Only a draft drawing revision can be issued");
  await verifyUploadedObject(metadata(revision));
  let previousId: string | null = null;
  const issuedAt = new Date();
  const result = await executeProjectCommand({
    context, operation: "completeDrawingRevisionUpload", permission: "canManageDocuments", projectId,
    idempotencyKey: requiredText(idempotencyKey, "Idempotency key", 200), request: { revisionId: id, checksumSha256: revision.checksumSha256 },
    listKey: "DrawingRevision", updateId: id, data: { status: "issued", issuedAt },
    beforeCreate: async tx => {
      if (!tx.prisma?.$queryRawUnsafe) throw new Error("Drawing revision promotion lock is unavailable");
      const [drawing] = await tx.prisma.$queryRawUnsafe<Array<{ currentRevisionId: string | null }>>(
        `SELECT "currentRevision" AS "currentRevisionId" FROM "Drawing" WHERE id = $1 FOR UPDATE`, String(revision.drawing!.id),
      );
      const [candidate] = await tx.prisma.$queryRawUnsafe<Array<{
        drawingId: string; projectId: string; status: string; createdAt: Date;
      }>>(
        `SELECT drawing AS "drawingId", project AS "projectId", status::text AS status, "createdAt"
         FROM "DrawingRevision" WHERE id = $1 FOR UPDATE`, id,
      );
      if (!drawing || !candidate || candidate.drawingId !== revision.drawing!.id || candidate.projectId !== projectId || candidate.status !== "draft") {
        throw new Error("Only the current draft revision for this drawing can be issued");
      }
      previousId = drawing.currentRevisionId;
      if (previousId) {
        const [previous] = await tx.prisma.$queryRawUnsafe<Array<{ status: string; createdAt: Date }>>(
          `SELECT status::text AS status, "createdAt" FROM "DrawingRevision" WHERE id = $1 FOR UPDATE`, previousId,
        );
        if (!previous || previous.status !== "issued" || new Date(candidate.createdAt) <= new Date(previous.createdAt)) {
          throw new Error("Drawing revisions must be issued in their created order from the current revision");
        }
      }
      return { status: "issued", issuedAt };
    },
    afterCreate: async tx => {
      if (previousId && previousId !== id) await requireUpdate(tx.sudo(), "DrawingRevision")({ where: { id: previousId }, data: { status: "superseded" } });
      await requireUpdate(tx.sudo(), "Drawing")({ where: { id: revision.drawing!.id! }, data: { currentRevision: { connect: { id } } } });
    },
  });
  return { success: true, revisionId: id, actionId: result.actionId, replayed: result.replayed };
}

export async function completeDocumentVersionUpload(
  _root: unknown,
  { versionId, idempotencyKey }: { versionId: string; idempotencyKey: string },
  context: CommandContext,
) {
  const id = requiredText(versionId, "Document version id", 200);
  const version = await queryById(context, "DocumentVersion", id, `
    id versionNumber titleSnapshot fileName storageKey mimeType byteSize checksumSha256 issuedAt
    document { id currentVersion { id versionNumber } } project { id company { id } }
  `) as Record<string, unknown> & { document?: { id?: string; currentVersion?: { id?: string; versionNumber?: number } | null } | null; project?: { id?: string; company?: { id?: string } | null } | null } | null;
  const projectId = version?.project?.id;
  const companyId = version?.project?.company?.id;
  const session = requireCommandSession(context);
  if (!version?.id || !projectId || !companyId || !version.document?.id ||
      !hasProjectPermission(session, companyId, projectId, "canManageDocuments", true) ||
      !(await canAccessProjectById(context, session.itemId, projectId, true))) throw new Error("Document version not found");
  if (version.issuedAt) {
    return { success: true, versionId: id, actionId: "already-issued", replayed: true };
  }
  await verifyUploadedObject(metadata(version));
  const result = await executeProjectCommand({
    context,
    operation: "completeDocumentVersionUpload",
    permission: "canManageDocuments",
    projectId,
    idempotencyKey: requiredText(idempotencyKey, "Idempotency key", 200),
    request: { versionId: id, checksumSha256: version.checksumSha256 },
    listKey: "DocumentVersion",
    updateId: id,
    data: { issuedAt: new Date() },
    beforeCreate: async tx => {
      if (!tx.prisma?.$queryRawUnsafe) throw new Error("Document version promotion lock is unavailable");
      const [document] = await tx.prisma.$queryRawUnsafe<Array<{ currentVersionId: string | null }>>(
        `SELECT "currentVersion" AS "currentVersionId" FROM "Document" WHERE id = $1 FOR UPDATE`, String(version.document!.id),
      );
      const [candidate] = await tx.prisma.$queryRawUnsafe<Array<{
        documentId: string; projectId: string; versionNumber: number; issuedAt: Date | null;
      }>>(
        `SELECT document AS "documentId", project AS "projectId", "versionNumber", "issuedAt"
         FROM "DocumentVersion" WHERE id = $1 FOR UPDATE`, id,
      );
      if (!document || !candidate || candidate.documentId !== version.document!.id || candidate.projectId !== projectId || candidate.issuedAt) {
        throw new Error("Only the current unissued document version can be issued");
      }
      if (document.currentVersionId) {
        const [current] = await tx.prisma.$queryRawUnsafe<Array<{ versionNumber: number; issuedAt: Date | null }>>(
          `SELECT "versionNumber", "issuedAt" FROM "DocumentVersion" WHERE id = $1 FOR UPDATE`, document.currentVersionId,
        );
        if (!current?.issuedAt || candidate.versionNumber <= current.versionNumber) {
          throw new Error("Document versions must be issued in strictly increasing version order");
        }
      } else {
        const [prior] = await tx.prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*)::bigint AS count FROM "DocumentVersion" WHERE document = $1 AND "issuedAt" IS NOT NULL`, String(version.document!.id),
        );
        if ((prior?.count ?? BigInt(0)) > BigInt(0)) throw new Error("Issued document history has no authoritative current-version pointer");
      }
      const [higherIssued] = await tx.prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint AS count FROM "DocumentVersion"
         WHERE document = $1 AND "issuedAt" IS NOT NULL AND "versionNumber" >= $2`, String(version.document!.id), candidate.versionNumber,
      );
      if ((higherIssued?.count ?? BigInt(0)) > BigInt(0)) throw new Error("A newer document version is already issued");
      return { issuedAt: new Date() };
    },
    afterCreate: async tx => {
      await requireUpdate(tx.sudo(), "Document")({
        where: { id: version.document!.id! },
        data: { currentVersion: { connect: { id } } },
      });
    },
  });
  return { success: true, versionId: id, actionId: result.actionId, replayed: result.replayed };
}

export async function distributeDocumentVersion(
  _root: unknown,
  { input }: { input: { projectId: string; versionId: string; membershipId: string; purpose: string; expiresAt?: string | null; idempotencyKey: string } },
  context: CommandContext,
) {
  const projectId = requiredText(input.projectId, "Project id", 200);
  const versionId = requiredText(input.versionId, "Document version id", 200);
  const membershipId = requiredText(input.membershipId, "Recipient membership id", 200);
  const [version, membership] = await Promise.all([
    queryById(context, "DocumentVersion", versionId, "id issuedAt project { id }"),
    queryById(context, "ProjectMembership", membershipId, "id status project { id } user { id }"),
  ]);
  if (version?.project?.id !== projectId || !version.issuedAt) throw new Error("Only an issued project document can be distributed");
  if (membership?.project?.id !== projectId || membership.status !== "active") throw new Error("Recipient is not an active project member");
  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : undefined;
  if (expiresAt && (!Number.isFinite(expiresAt.getTime()) || expiresAt <= new Date())) throw new Error("Distribution expiry must be in the future");
  return executeProjectCommand({
    context,
    operation: "distributeDocumentVersion",
    permission: "canManageDocuments",
    projectId,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "DocumentDistribution",
    data: {
      distributionKey: commandDigest(`${versionId}\u001f${membershipId}\u001f${input.idempotencyKey}`),
      purpose: requiredText(input.purpose, "Distribution purpose", 500),
      expiresAt,
      documentVersion: { connect: { id: versionId } },
      recipient: { connect: { id: membershipId } },
      distributedBy: { connect: { id: requireCommandSession(context).itemId } },
      project: { connect: { id: projectId } },
    },
  });
}

type DownloadContext = CommandContext & { query?: Record<string, { findOne(args: Record<string, unknown>): Promise<Record<string, unknown> | null> }> };

export async function documentVersionDownload(
  _root: unknown,
  { versionId }: { versionId: string },
  context: DownloadContext,
) {
  const session = requireCommandSession(context);
  const version = await queryById(context, "DocumentVersion", requiredText(versionId, "Version id", 200), `
    id issuedAt fileName storageKey mimeType byteSize checksumSha256 project { id company { id } }
  `) as Record<string, unknown> & { project?: { id?: string; company?: { id?: string } | null } | null } | null;
  const projectId = version?.project?.id;
  const companyId = version?.project?.company?.id;
  if (!version?.id || !version.issuedAt || !projectId || !companyId) throw new Error("Issued document version not found");
  const internalGrant = session.authType === "api_key" ||
    session.data.projectMemberships?.some(entry => entry.status === "active" && entry.project?.id === projectId && entry.portalType === "internal") ||
    session.data.companyMemberships?.some(entry => entry.status === "active" && entry.company?.id === companyId && entry.canAccessAllProjects);
  const internal = Boolean(internalGrant) && hasProjectPermission(session, companyId, projectId, "canReadDocuments") &&
    await canAccessProjectById(context, session.itemId, projectId);
  let distributed = false;
  const distributionPrincipalAllowed = session.authType !== "api_key" ||
    hasProjectPermission(session, companyId, projectId, "canReadDocuments");
  if (!internal && distributionPrincipalAllowed) {
    distributed = await queryCount(context, "DocumentDistribution", {
      documentVersion: { id: { equals: String(version.id) } },
      recipient: { user: { id: { equals: session.itemId } }, status: { equals: "active" } },
      OR: [{ expiresAt: { equals: null } }, { expiresAt: { gt: new Date() } }],
    }) > 0;
  }
  if (!internal && !distributed) throw new Error("Document version is not distributed to this account");
  const signed = signObjectRequest("GET", metadata(version), 300);
  return { success: true, fileName: String(version.fileName), mimeType: String(version.mimeType), byteSize: Number(version.byteSize), downloadUrl: signed.url, expiresAt: signed.expiresAt };
}

export async function drawingRevisionDownload(
  _root: unknown,
  { revisionId }: { revisionId: string },
  context: DownloadContext,
) {
  const session = requireCommandSession(context);
  const revision = await queryById(context, "DrawingRevision", requiredText(revisionId, "Revision id", 200), `
    id status fileName storageKey mimeType byteSize checksumSha256 project { id company { id } }
  `) as Record<string, unknown> & { project?: { id?: string; company?: { id?: string } | null } | null } | null;
  const projectId = revision?.project?.id;
  const companyId = revision?.project?.company?.id;
  if (!revision?.id || revision.status !== "issued" || !projectId || !companyId) throw new Error("Issued drawing revision not found");
  if (!hasProjectPermission(session, companyId, projectId, "canReadDocuments") || !(await canAccessProjectById(context, session.itemId, projectId))) {
    throw new Error("Drawing revision is not available to this account");
  }
  const signed = signObjectRequest("GET", metadata(revision), 300);
  return { success: true, fileName: String(revision.fileName), mimeType: String(revision.mimeType), byteSize: Number(revision.byteSize), downloadUrl: signed.url, expiresAt: signed.expiresAt };
}

export async function acknowledgeDocumentDistribution(
  _root: unknown,
  { distributionId, acknowledgement }: { distributionId: string; acknowledgement: string },
  context: CommandContext,
) {
  const session: Session = requireCommandSession(context);
  if (session.authType === "api_key") throw new Error("A live participant session is required to acknowledge a document");
  const distribution = await queryById(context, "DocumentDistribution", requiredText(distributionId, "Distribution id", 200), `
    id distributionKey expiresAt project { id company { id } } recipient { id status user { id } }
  `) as Record<string, unknown> & {
    project?: { id?: string; company?: { id?: string } | null } | null;
    recipient?: { id?: string; status?: string; user?: { id?: string } | null } | null;
  } | null;
  if (!distribution?.id || distribution.recipient?.user?.id !== session.itemId || distribution.recipient.status !== "active") {
    throw new Error("Document distribution not found for this account");
  }
  if (distribution.expiresAt && new Date(String(distribution.expiresAt)) <= new Date()) throw new Error("Document distribution has expired");
  const existing = await queryCount(context, "DocumentAcknowledgement", {
    acknowledgementKey: { equals: `${distribution.id}:${session.itemId}` },
  });
  if (existing > 0) return { success: true, acknowledgementId: "existing", replayed: true };
  const projectId = distribution.project?.id;
  if (!projectId || !context.transaction) throw new Error("Transactional document acknowledgement context is required");
  try {
    return await context.transaction(async tx => {
      const record = await tx.sudo().db.DocumentAcknowledgement.createOne!({ data: {
        acknowledgementKey: `${distribution.id}:${session.itemId}`,
        acknowledgement: requiredText(acknowledgement, "Acknowledgement", 500),
        distribution: { connect: { id: String(distribution.id) } },
        acknowledgedBy: { connect: { id: session.itemId } },
        project: { connect: { id: projectId } },
      } });
      return { success: true, acknowledgementId: record.id, replayed: false };
    }, { timeout: 30_000 });
  } catch (error) {
    const replayed = await queryCount(context, "DocumentAcknowledgement", {
      acknowledgementKey: { equals: `${distribution.id}:${session.itemId}` },
    });
    if (replayed > 0) return { success: true, acknowledgementId: "existing", replayed: true };
    throw error;
  }
}
