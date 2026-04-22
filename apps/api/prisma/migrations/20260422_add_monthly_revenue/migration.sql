-- MonthlyRevenue: revenue in VND per project per month
CREATE TABLE IF NOT EXISTS "MonthlyRevenue" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "month" INTEGER NOT NULL,
  "year" INTEGER NOT NULL,
  "amount" BIGINT NOT NULL DEFAULT 0,
  "note" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MonthlyRevenue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MonthlyRevenue_projectId_month_year_key"
  ON "MonthlyRevenue"("projectId", "month", "year");

DO $$ BEGIN
  ALTER TABLE "MonthlyRevenue" ADD CONSTRAINT "MonthlyRevenue_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
