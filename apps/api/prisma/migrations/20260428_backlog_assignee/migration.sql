ALTER TABLE "BacklogItem" ADD COLUMN IF NOT EXISTS "assigneeId" TEXT;
CREATE INDEX IF NOT EXISTS "BacklogItem_projectId_assigneeId_idx" ON "BacklogItem"("projectId", "assigneeId");
