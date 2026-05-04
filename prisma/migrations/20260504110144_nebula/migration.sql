/*
  Warnings:

  - The `format` column on the `models_3d` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `tenant_id` to the `models_3d` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ModelFormat" AS ENUM ('GLTF', 'GLB', 'OBJ', 'FBX');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- AlterEnum
ALTER TYPE "SensorMode" ADD VALUE 'STREAM';

-- AlterTable
ALTER TABLE "models_3d" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "description" TEXT DEFAULT '',
ADD COLUMN     "is_latest" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "name" TEXT NOT NULL DEFAULT 'Untitled Model',
ADD COLUMN     "parent_model_id" TEXT,
ADD COLUMN     "tenant_id" TEXT NOT NULL,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
DROP COLUMN "format",
ADD COLUMN     "format" "ModelFormat" NOT NULL DEFAULT 'GLB';

-- AlterTable
ALTER TABLE "sensors" ADD COLUMN     "alert_cooldown_ms" INTEGER,
ADD COLUMN     "alert_hysteresis" DOUBLE PRECISION,
ADD COLUMN     "alert_max_threshold" DOUBLE PRECISION,
ADD COLUMN     "alert_min_threshold" DOUBLE PRECISION,
ADD COLUMN     "validation_schema" JSONB;

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "message" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "sensor_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "alerts_sensor_id_idx" ON "alerts"("sensor_id");

-- CreateIndex
CREATE INDEX "alerts_tenant_id_idx" ON "alerts"("tenant_id");

-- CreateIndex
CREATE INDEX "alerts_created_at_idx" ON "alerts"("created_at");

-- CreateIndex
CREATE INDEX "alerts_severity_idx" ON "alerts"("severity");

-- CreateIndex
CREATE INDEX "models_3d_tenant_id_twin_id_idx" ON "models_3d"("tenant_id", "twin_id");

-- CreateIndex
CREATE INDEX "models_3d_parent_model_id_idx" ON "models_3d"("parent_model_id");

-- AddForeignKey
ALTER TABLE "models_3d" ADD CONSTRAINT "models_3d_parent_model_id_fkey" FOREIGN KEY ("parent_model_id") REFERENCES "models_3d"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_sensor_id_fkey" FOREIGN KEY ("sensor_id") REFERENCES "sensors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
