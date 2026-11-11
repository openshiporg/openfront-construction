-- The invented outbox is removed (owner rule: no outbox/worker machinery; external events go through Commerce webhooks).
DROP TABLE "OutboxMessage";
DROP TYPE "OutboxMessageStatusType";
