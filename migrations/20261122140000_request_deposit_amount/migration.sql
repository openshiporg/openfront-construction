-- What a customer pays online to book a quoted job. Zero means the whole quote is due,
-- which is how every quote issued before this column behaves.
-- AlterTable
ALTER TABLE "ServiceRequest" ADD COLUMN     "depositMinor" BIGINT NOT NULL DEFAULT 0;
