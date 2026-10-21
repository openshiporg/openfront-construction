import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export type ClaimedOutboxMessage = {
  id: string;
  messageKey: string;
  eventType: string;
  canonicalPayload: string;
  payloadDigest: string;
  attempts: number;
};

export type OutboxDatabase = {
  claim(workerId: string, now: Date, staleBefore: Date): Promise<ClaimedOutboxMessage | null>;
  delivered(id: string, workerId: string, deliveredAt: Date): Promise<boolean>;
  failed(id: string, workerId: string, nextStatus: "retry" | "dead_letter", availableAt: Date, error: string): Promise<boolean>;
};

export type OutboxDeliveryAdapter = {
  deliver(message: ClaimedOutboxMessage): Promise<void>;
};

type OutboxBatchOptions = {
  database: OutboxDatabase;
  adapter: OutboxDeliveryAdapter;
  workerId: string;
  batchSize?: number;
  maxAttempts?: number;
  leaseMilliseconds?: number;
  now?: () => Date;
};

function boundedInteger(value: number | undefined, fallback: number, maximum: number): number {
  if (value === undefined || !Number.isSafeInteger(value)) return fallback;
  return Math.max(1, Math.min(value, maximum));
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function verifyOutboxDigest(message: ClaimedOutboxMessage): void {
  const actual = Buffer.from(digest(message.canonicalPayload), "hex");
  const expected = Buffer.from(message.payloadDigest, "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new Error("Outbox payload digest mismatch");
  }
}

export function retryDelayMilliseconds(attempt: number): number {
  return Math.min(15 * 60_000, 1_000 * 2 ** Math.max(0, attempt - 1));
}

function boundedError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/[\r\n]+/g, " ").slice(0, 2_000) || "Unknown delivery error";
}

export async function deliverOutboxBatch(options: OutboxBatchOptions): Promise<{ claimed: number; delivered: number; retried: number; deadLettered: number }> {
  const batchSize = boundedInteger(options.batchSize, 25, 100);
  const maxAttempts = boundedInteger(options.maxAttempts, 8, 100);
  const leaseMilliseconds = Math.max(10_000, options.leaseMilliseconds ?? 120_000);
  const result = { claimed: 0, delivered: 0, retried: 0, deadLettered: 0 };

  for (let index = 0; index < batchSize; index += 1) {
    const now = options.now?.() ?? new Date();
    const message = await options.database.claim(
      options.workerId,
      now,
      new Date(now.getTime() - leaseMilliseconds),
    );
    if (!message) break;
    result.claimed += 1;
    try {
      verifyOutboxDigest(message);
      await options.adapter.deliver(message);
      const acknowledged = await options.database.delivered(message.id, options.workerId, options.now?.() ?? new Date());
      if (acknowledged) result.delivered += 1;
    } catch (error) {
      const deadLetter = message.attempts >= maxAttempts;
      const status = deadLetter ? "dead_letter" : "retry";
      const failedAt = options.now?.() ?? new Date();
      const acknowledged = await options.database.failed(
        message.id,
        options.workerId,
        status,
        deadLetter ? failedAt : new Date(failedAt.getTime() + retryDelayMilliseconds(message.attempts)),
        boundedError(error),
      );
      if (acknowledged) {
        if (deadLetter) result.deadLettered += 1;
        else result.retried += 1;
      }
    }
  }
  return result;
}

export async function deliverOutboxDrain(options: OutboxBatchOptions & { maxMessages?: number }): Promise<{
  claimed: number;
  delivered: number;
  retried: number;
  deadLettered: number;
  batches: number;
  workLimitReached: boolean;
}> {
  const { maxMessages: requestedMaxMessages, ...batchOptions } = options;
  const maxMessages = boundedInteger(requestedMaxMessages, 100, 100);
  const batchSize = boundedInteger(options.batchSize, 25, 100);
  const result = { claimed: 0, delivered: 0, retried: 0, deadLettered: 0, batches: 0, workLimitReached: false };

  while (result.claimed < maxMessages) {
    const remaining = maxMessages - result.claimed;
    const currentBatchSize = Math.min(batchSize, remaining);
    const batch = await deliverOutboxBatch({ ...batchOptions, batchSize: currentBatchSize });
    result.batches += 1;
    result.claimed += batch.claimed;
    result.delivered += batch.delivered;
    result.retried += batch.retried;
    result.deadLettered += batch.deadLettered;
    if (batch.claimed < currentBatchSize) return result;
  }

  result.workLimitReached = true;
  return result;
}

export function webhookAdapter(options: {
  url: string;
  secret: string;
  fetchImplementation?: typeof fetch;
}): OutboxDeliveryAdapter {
  const endpoint = new URL(options.url);
  if (endpoint.protocol !== "https:" && endpoint.hostname !== "127.0.0.1" && endpoint.hostname !== "localhost") {
    throw new Error("Outbox webhook must use HTTPS outside loopback development");
  }
  if (options.secret.length < 32) throw new Error("OUTBOX_WEBHOOK_SECRET must be at least 32 characters");
  const request = options.fetchImplementation ?? fetch;
  return {
    async deliver(message) {
      const signature = createHmac("sha256", options.secret).update(message.canonicalPayload).digest("hex");
      const response = await request(endpoint, {
        method: "POST",
        redirect: "error",
        headers: {
          "content-type": "application/json",
          "idempotency-key": message.messageKey,
          "x-openfront-event": message.eventType,
          "x-openfront-signature-sha256": signature,
        },
        body: message.canonicalPayload,
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) throw new Error(`Outbox webhook returned HTTP ${response.status}`);
    },
  };
}
