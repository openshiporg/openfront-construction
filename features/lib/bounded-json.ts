// Reuses the construction GraphQL endpoint's streamed 1 MiB budget for every
// caller-authenticated transport. Content-Length is only an early rejection;
// actual UTF-8 bytes are always counted before JSON decoding.
export const MAX_REQUEST_BYTES = 1_048_576;
export class RequestBudgetError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}
export async function parseBoundedObjectJson(chunks: AsyncIterable<Uint8Array | string>, length?: string | null) {
  if (length && Number(length) > MAX_REQUEST_BYTES) throw new RequestBudgetError("Request body exceeds the 1 MiB limit", 413);
  const buffers: Buffer[] = []; let bytes = 0;
  for await (const chunk of chunks) {
    bytes += typeof chunk === "string" ? Buffer.byteLength(chunk) : chunk.byteLength;
    if (bytes > MAX_REQUEST_BYTES) throw new RequestBudgetError("Request body exceeds the 1 MiB limit", 413);
    buffers.push(typeof chunk === "string" ? Buffer.from(chunk) : Buffer.from(chunk));
  }
  let parsed;
  try { parsed = JSON.parse(Buffer.concat(buffers).toString("utf8")); }
  catch { throw new RequestBudgetError("Request body must be valid JSON", 400); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new RequestBudgetError("Request body must be a JSON object", 400);
  return parsed;
}
export async function readBoundedObjectJson(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new RequestBudgetError("Request must use application/json", 415);
  async function* chunks() {
    const reader = request.body?.getReader();
    if (!reader) return;
    try { while (true) { const { value, done } = await reader.read(); if (done) return; yield value; } }
    finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  }
  return parseBoundedObjectJson(chunks(), request.headers.get("content-length"));
}
