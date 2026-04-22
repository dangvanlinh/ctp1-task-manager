-- WeeklyEventData: lưu event live bars của Config Event (theo project/month/year)
CREATE TABLE IF NOT EXISTS "WeeklyEventData" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "month" INTEGER NOT NULL,
  "year" INTEGER NOT NULL,
  "data" JSONB NOT NULL DEFAULT '[]',
  "configs" JSONB NOT NULL DEFAULT '[]',
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WeeklyEventData_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WeeklyEventData_projectId_month_year_key"
  ON "WeeklyEventData"("projectId", "month", "year");

DO $$ BEGIN
  ALTER TABLE "WeeklyEventData" ADD CONSTRAINT "WeeklyEventData_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
