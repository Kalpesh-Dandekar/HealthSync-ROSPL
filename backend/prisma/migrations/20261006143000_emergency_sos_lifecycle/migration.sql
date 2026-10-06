-- CreateEnum
CREATE TYPE "EmergencyStatus" AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateTable
CREATE TABLE "Emergency" (
    "id" SERIAL NOT NULL,
    "patientId" INTEGER NOT NULL,
    "triggeredById" INTEGER NOT NULL,
    "triggeredByRole" "UserRole" NOT NULL,
    "status" "EmergencyStatus" NOT NULL DEFAULT 'ACTIVE',
    "respondingPhysicianId" INTEGER,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedById" INTEGER,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,
    "activePatientKey" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Emergency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyCaregiverAcknowledgement" (
    "id" SERIAL NOT NULL,
    "emergencyId" INTEGER NOT NULL,
    "caregiverId" INTEGER NOT NULL,
    "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmergencyCaregiverAcknowledgement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Emergency_activePatientKey_key" ON "Emergency"("activePatientKey");
CREATE INDEX "Emergency_status_createdAt_idx" ON "Emergency"("status", "createdAt");
CREATE INDEX "Emergency_patientId_createdAt_idx" ON "Emergency"("patientId", "createdAt");
CREATE INDEX "Emergency_respondingPhysicianId_status_idx" ON "Emergency"("respondingPhysicianId", "status");
CREATE UNIQUE INDEX "EmergencyCaregiverAcknowledgement_emergencyId_caregiverId_key" ON "EmergencyCaregiverAcknowledgement"("emergencyId", "caregiverId");
CREATE INDEX "EmergencyCaregiverAcknowledgement_caregiverId_acknowledgedAt_idx" ON "EmergencyCaregiverAcknowledgement"("caregiverId", "acknowledgedAt");

ALTER TABLE "Emergency" ADD CONSTRAINT "Emergency_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Emergency" ADD CONSTRAINT "Emergency_triggeredById_fkey" FOREIGN KEY ("triggeredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Emergency" ADD CONSTRAINT "Emergency_respondingPhysicianId_fkey" FOREIGN KEY ("respondingPhysicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Emergency" ADD CONSTRAINT "Emergency_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmergencyCaregiverAcknowledgement" ADD CONSTRAINT "EmergencyCaregiverAcknowledgement_emergencyId_fkey" FOREIGN KEY ("emergencyId") REFERENCES "Emergency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmergencyCaregiverAcknowledgement" ADD CONSTRAINT "EmergencyCaregiverAcknowledgement_caregiverId_fkey" FOREIGN KEY ("caregiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
