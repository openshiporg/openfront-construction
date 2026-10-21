import type { PrismaClient } from "@prisma/client";

import type { ClaimedOutboxMessage, OutboxDatabase } from "./worker";

type RawClient = Pick<PrismaClient, "$queryRawUnsafe" | "$executeRawUnsafe" | "$transaction">;

export function prismaOutboxDatabase(prisma: RawClient): OutboxDatabase {
  return {
    async claim(workerId, now, staleBefore) {
      return prisma.$transaction(async transaction => {
        const rows = await transaction.$queryRawUnsafe<ClaimedOutboxMessage[]>(`
          WITH candidate AS (
            SELECT id
            FROM "OutboxMessage"
            WHERE (
              status IN ('pending', 'retry')
              OR (status = 'processing' AND "lockedAt" < $3)
            )
              AND "availableAt" <= $2
            ORDER BY "availableAt" ASC, "createdAt" ASC
            FOR UPDATE SKIP LOCKED
            LIMIT 1
          )
          UPDATE "OutboxMessage" message
          SET status = 'processing',
              attempts = message.attempts + 1,
              "lockedAt" = $2,
              "lockOwner" = $1,
              "lastAttemptAt" = $2,
              "updatedAt" = $2
          FROM candidate
          WHERE message.id = candidate.id
          RETURNING message.id, message."messageKey", message."eventType",
                    message."canonicalPayload", message."payloadDigest", message.attempts
        `, workerId, now, staleBefore);
        return rows[0] ?? null;
      });
    },

    async delivered(id, workerId, deliveredAt) {
      const affected = await prisma.$executeRawUnsafe(`
        UPDATE "OutboxMessage"
        SET status = 'delivered', "deliveredAt" = $2, "lockedAt" = NULL,
            "lockOwner" = '', "lastError" = '', "updatedAt" = $2
        WHERE id = $1 AND status = 'processing' AND "lockOwner" = $3
      `, id, deliveredAt, workerId);
      return affected === 1;
    },

    async failed(id, workerId, nextStatus, availableAt, error) {
      const status = nextStatus === "dead_letter" ? "dead_letter" : "retry";
      const affected = await prisma.$executeRawUnsafe(`
        UPDATE "OutboxMessage"
        SET status = '${status}', "availableAt" = $2, "lastError" = $3,
            "lockedAt" = NULL, "lockOwner" = '', "updatedAt" = NOW()
        WHERE id = $1 AND status = 'processing' AND "lockOwner" = $4
      `, id, availableAt, error, workerId);
      return affected === 1;
    },
  };
}
