'use server';

import { randomUUID } from "node:crypto";

import { keystoneClient } from "@/features/dashboard/lib/keystoneClient";

type UploadRequest = {
  projectId: string;
  parentId: string;
  sequence: string;
  title: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  checksumSha256: string;
  kind: "document" | "drawing";
  idempotencyKey?: string;
};
export type UploadAuthorization = {
  itemId: string;
  uploadUrl: string;
  expiresAt: string;
  headers: Array<{ name: string; value: string }>;
  completionKey: string;
};

export async function requestControlledUpload(input: UploadRequest): Promise<{ success: true; authorization: UploadAuthorization } | { success: false; error: string }> {
  const idempotencyKey = input.idempotencyKey ?? randomUUID();
  if (input.kind === "drawing") {
    const response = await keystoneClient<{ requestDrawingRevisionUpload: { revisionId: string; uploadUrl: string; expiresAt: string; headers: Array<{ name: string; value: string }> } }>(`
      mutation RequestDrawingUpload($input: DrawingRevisionUploadInput!) {
        requestDrawingRevisionUpload(input: $input) { success revisionId actionId replayed uploadUrl expiresAt headers { name value } }
      }
    `, { input: {
      projectId: input.projectId, drawingId: input.parentId, revisionNumber: input.sequence, title: input.title,
      fileName: input.fileName, mimeType: input.mimeType, byteSize: input.byteSize, checksumSha256: input.checksumSha256, idempotencyKey,
    } });
    if (!response.success) return { success: false, error: response.error };
    const result = response.data.requestDrawingRevisionUpload;
    return { success: true, authorization: { itemId: result.revisionId, uploadUrl: result.uploadUrl, expiresAt: result.expiresAt, headers: result.headers, completionKey: randomUUID() } };
  }
  const versionNumber = Number(input.sequence);
  if (!Number.isInteger(versionNumber) || versionNumber < 1) return { success: false, error: "Document version must be a positive integer" };
  const response = await keystoneClient<{ requestDocumentVersionUpload: { versionId: string; uploadUrl: string; expiresAt: string; headers: Array<{ name: string; value: string }> } }>(`
    mutation RequestDocumentUpload($input: DocumentVersionUploadInput!) {
      requestDocumentVersionUpload(input: $input) { success versionId actionId replayed uploadUrl expiresAt headers { name value } }
    }
  `, { input: {
    projectId: input.projectId, documentId: input.parentId, versionNumber, revisionLabel: null, title: input.title,
    fileName: input.fileName, mimeType: input.mimeType, byteSize: input.byteSize, checksumSha256: input.checksumSha256, idempotencyKey,
  } });
  if (!response.success) return { success: false, error: response.error };
  const result = response.data.requestDocumentVersionUpload;
  return { success: true, authorization: { itemId: result.versionId, uploadUrl: result.uploadUrl, expiresAt: result.expiresAt, headers: result.headers, completionKey: randomUUID() } };
}

export async function completeControlledUpload(input: { kind: "document" | "drawing"; itemId: string; idempotencyKey: string }) {
  if (input.kind === "drawing") {
    const response = await keystoneClient<{ completeDrawingRevisionUpload: { success: boolean } }>(`
      mutation CompleteDrawingUpload($revisionId: ID!, $idempotencyKey: String!) {
        completeDrawingRevisionUpload(revisionId: $revisionId, idempotencyKey: $idempotencyKey) { success revisionId actionId replayed }
      }
    `, { revisionId: input.itemId, idempotencyKey: input.idempotencyKey });
    return response.success ? { success: true as const } : { success: false as const, error: response.error };
  }
  const response = await keystoneClient<{ completeDocumentVersionUpload: { success: boolean } }>(`
    mutation CompleteDocumentUpload($versionId: ID!, $idempotencyKey: String!) {
      completeDocumentVersionUpload(versionId: $versionId, idempotencyKey: $idempotencyKey) { success versionId actionId replayed }
    }
  `, { versionId: input.itemId, idempotencyKey: input.idempotencyKey });
  return response.success ? { success: true as const } : { success: false as const, error: response.error };
}

export async function getControlledDownload(kind: "document" | "drawing", itemId: string) {
  const field = kind === "drawing" ? "drawingRevisionDownload" : "documentVersionDownload";
  const argument = kind === "drawing" ? "revisionId" : "versionId";
  const response = await keystoneClient<Record<string, { downloadUrl: string; fileName: string }>>(`
    query ControlledDownload($itemId: ID!) {
      ${field}(${argument}: $itemId) { success fileName mimeType byteSize downloadUrl expiresAt }
    }
  `, { itemId });
  return response.success
    ? { success: true as const, url: response.data[field].downloadUrl, fileName: response.data[field].fileName }
    : { success: false as const, error: response.error };
}

export async function distributeControlledDocument(input: { projectId: string; versionId: string; membershipId: string; purpose: string; expiresAt?: string | null }) {
  const response = await keystoneClient<{ distributeDocumentVersion: { replayed: boolean } }>(`
    mutation DistributeDocument($input: DocumentDistributionInput!) {
      distributeDocumentVersion(input: $input) { success operation itemId actionId replayed }
    }
  `, { input: { ...input, idempotencyKey: randomUUID() } });
  return response.success
    ? { success: true as const, replayed: response.data.distributeDocumentVersion.replayed }
    : { success: false as const, error: response.error };
}
