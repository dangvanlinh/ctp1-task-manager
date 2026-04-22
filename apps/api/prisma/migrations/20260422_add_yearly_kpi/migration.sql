CREATE TABLE IF NOT EXISTS "ProjectYearlyKpi" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "amount" BIGINT NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectYearlyKpi_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProjectYearlyKpi_projectId_year_key"
  ON "ProjectYearlyKpi"("projectId", "year");

DO $$ BEGIN
  ALTER TABLE "ProjectYearlyKpi" ADD CONSTRAINT "ProjectYearlyKpi_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
