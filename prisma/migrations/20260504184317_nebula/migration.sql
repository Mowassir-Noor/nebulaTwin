-- AlterTable
ALTER TABLE "model_parts" ADD COLUMN     "index" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "position_offset" JSONB,
ADD COLUMN     "rotation_offset" JSONB;
