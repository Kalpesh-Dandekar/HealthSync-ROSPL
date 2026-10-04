-- CreateEnum
CREATE TYPE "ClinicalRecordType" AS ENUM ('CONSULTATION', 'VITAL_ASSESSMENT', 'LAB_RESULT', 'FOLLOW_UP', 'GENERAL_NOTE');

-- CreateEnum
CREATE TYPE "ClinicalRecordStatus" AS ENUM ('NORMAL', 'NEEDS_ATTENTION', 'CRITICAL');

-- CreateTable
CREATE TABLE "ClinicalRecord" (
    "id" SERIAL NOT NULL,
    "patientId" INTEGER NOT NULL,
    "physicianId" INTEGER NOT NULL,
    "type" "ClinicalRecordType" NOT NULL,
    "title" TEXT NOT NULL,
    "clinicalDate" DATE NOT NULL,
    "findings" TEXT NOT NULL,
    "interpretation" TEXT NOT NULL,
    "recommendations" TEXT NOT NULL,
    "status" "ClinicalRecordStatus" NOT NULL DEFAULT 'NORMAL',
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "followUpDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClinicalRecord_patientId_clinicalDate_idx" ON "ClinicalRecord"("patientId", "clinicalDate");

-- CreateIndex
CREATE INDEX "ClinicalRecord_physicianId_clinicalDate_idx" ON "ClinicalRecord"("physicianId", "clinicalDate");

-- CreateIndex
CREATE INDEX "ClinicalRecord_status_clinicalDate_idx" ON "ClinicalRecord"("status", "clinicalDate");

-- AddForeignKey
ALTER TABLE "ClinicalRecord" ADD CONSTRAINT "ClinicalRecord_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalRecord" ADD CONSTRAINT "ClinicalRecord_physicianId_fkey" FOREIGN KEY ("physicianId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
