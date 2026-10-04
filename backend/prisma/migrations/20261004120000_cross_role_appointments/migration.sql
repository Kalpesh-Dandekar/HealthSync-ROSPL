CREATE TYPE "AppointmentStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'COMPLETED', 'REJECTED', 'CANCELLED');

ALTER TABLE "Appointment"
  ADD COLUMN "physicianId" INTEGER,
  ADD COLUMN "scheduledAt" TIMESTAMP(3),
  ADD COLUMN "durationMinutes" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN "reason" TEXT,
  ADD COLUMN "activeSlotKey" TEXT,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Appointment" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Appointment" ALTER COLUMN "status" TYPE "AppointmentStatus" USING (
  CASE
    WHEN UPPER("status") = 'COMPLETED' THEN 'COMPLETED'::"AppointmentStatus"
    WHEN UPPER("status") = 'CANCELLED' THEN 'CANCELLED'::"AppointmentStatus"
    WHEN UPPER("status") = 'REJECTED' THEN 'REJECTED'::"AppointmentStatus"
    WHEN UPPER("status") = 'CONFIRMED' THEN 'CONFIRMED'::"AppointmentStatus"
    ELSE 'REQUESTED'::"AppointmentStatus"
  END
);
ALTER TABLE "Appointment" ALTER COLUMN "status" SET DEFAULT 'REQUESTED';
UPDATE "Appointment" SET "reason" = "title" WHERE "reason" IS NULL;

CREATE TABLE "PhysicianAvailability" (
  "id" SERIAL NOT NULL,
  "physicianId" INTEGER NOT NULL,
  "dayOfWeek" INTEGER NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "slotDuration" INTEGER NOT NULL DEFAULT 30,
  CONSTRAINT "PhysicianAvailability_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PhysicianUnavailablePeriod" (
  "id" SERIAL NOT NULL,
  "physicianId" INTEGER NOT NULL,
  "startDate" TEXT NOT NULL,
  "endDate" TEXT NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PhysicianUnavailablePeriod_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Appointment_activeSlotKey_key" ON "Appointment"("activeSlotKey");
CREATE INDEX "Appointment_userId_scheduledAt_idx" ON "Appointment"("userId", "scheduledAt");
CREATE INDEX "Appointment_physicianId_scheduledAt_idx" ON "Appointment"("physicianId", "scheduledAt");
CREATE INDEX "Appointment_status_scheduledAt_idx" ON "Appointment"("status", "scheduledAt");
CREATE UNIQUE INDEX "PhysicianAvailability_physicianId_dayOfWeek_key" ON "PhysicianAvailability"("physicianId", "dayOfWeek");
CREATE INDEX "PhysicianAvailability_physicianId_idx" ON "PhysicianAvailability"("physicianId");
CREATE INDEX "PhysicianUnavailablePeriod_physicianId_startDate_endDate_idx" ON "PhysicianUnavailablePeriod"("physicianId", "startDate", "endDate");

ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_physicianId_fkey" FOREIGN KEY ("physicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PhysicianAvailability" ADD CONSTRAINT "PhysicianAvailability_physicianId_fkey" FOREIGN KEY ("physicianId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PhysicianUnavailablePeriod" ADD CONSTRAINT "PhysicianUnavailablePeriod_physicianId_fkey" FOREIGN KEY ("physicianId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
