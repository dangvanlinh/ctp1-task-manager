-- Add order column to Build for manual sorting
ALTER TABLE "Build" ADD COLUMN IF NOT EXISTS "order" INTEGER NOT NULL DEFAULT 0;
