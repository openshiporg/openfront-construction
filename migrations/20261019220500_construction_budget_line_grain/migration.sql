-- Preserve existing financial rows. Ambiguous historical grains require
-- explicit reconciliation; never discard/merge line values during migration.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "BudgetLineItem"
    WHERE budget IS NOT NULL AND "budgetCode" IS NOT NULL
    GROUP BY budget, "budgetCode" HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate budget/code lines require explicit reconciliation before enforcing the financial grain';
  END IF;
END $$;

CREATE UNIQUE INDEX "BudgetLineItem_budget_budgetCode_key" ON "BudgetLineItem"("budget", "budgetCode");
