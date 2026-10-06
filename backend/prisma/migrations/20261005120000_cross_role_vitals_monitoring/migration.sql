-- Preserve legacy readings while adding nullable provenance for new entries.
CREATE TYPE "VitalSource" AS ENUM ('PATIENT', 'PHYSICIAN', 'CAREGIVER');

ALTER TABLE "Vital"
ADD COLUMN "recordedById" INTEGER,
ADD COLUMN "source" "VitalSource";

CREATE INDEX "Vital_userId_recordedAt_idx" ON "Vital"("userId", "recordedAt");
CREATE INDEX "Vital_recordedById_idx" ON "Vital"("recordedById");

ALTER TABLE "Vital"
ADD CONSTRAINT "Vital_recordedById_fkey"
FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
