import { hostname } from "node:os";

import { PrismaClient } from "@prisma/client";

import { prismaOutboxDatabase } from "./prisma-database";
import { deliverOutboxDrain, webhookAdapter } from "./worker";

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function boundedIntegerEnvironment(name: string, fallback: number, maximum: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value > 0 ? Math.min(value, maximum) : fallback;
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const result = await deliverOutboxDrain({
      database: prismaOutboxDatabase(prisma),
      adapter: webhookAdapter({
        url: requiredEnvironment("OUTBOX_WEBHOOK_URL"),
        secret: requiredEnvironment("OUTBOX_WEBHOOK_SECRET"),
      }),
      workerId: `${hostname()}:${process.pid}`,
      batchSize: boundedIntegerEnvironment("OUTBOX_BATCH_SIZE", 25, 100),
      maxAttempts: boundedIntegerEnvironment("OUTBOX_MAX_ATTEMPTS", 8, 100),
      maxMessages: boundedIntegerEnvironment("OUTBOX_MAX_MESSAGES_PER_RUN", 100, 100),
    });
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(error => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
