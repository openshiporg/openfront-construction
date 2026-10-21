-- Prisma expects these implicit many-to-many join tables to use composite
-- primary keys. The preceding generated migration replaced them with unique
-- indexes; restore the primary-key form so fresh and upgraded databases have
-- the same constraint shape as schema.prisma.
DROP INDEX IF EXISTS "_ChangeEvent_changeOrders_AB_unique";
ALTER TABLE "_ChangeEvent_changeOrders"
  ADD CONSTRAINT "_ChangeEvent_changeOrders_AB_pkey" PRIMARY KEY ("A", "B");

DROP INDEX IF EXISTS "_Document_submittals_AB_unique";
ALTER TABLE "_Document_submittals"
  ADD CONSTRAINT "_Document_submittals_AB_pkey" PRIMARY KEY ("A", "B");
