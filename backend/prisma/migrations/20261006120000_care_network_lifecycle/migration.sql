CREATE TYPE "ConnectionRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

CREATE TABLE "PhysicianConnectionRequest" (
  "id" SERIAL NOT NULL,
  "patientId" INTEGER NOT NULL,
  "physicianId" INTEGER NOT NULL,
  "senderId" INTEGER NOT NULL,
  "recipientId" INTEGER NOT NULL,
  "status" "ConnectionRequestStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PhysicianConnectionRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CaregiverInvite" (
  "id" SERIAL NOT NULL,
  "patientId" INTEGER NOT NULL,
  "codeHash" TEXT NOT NULL,
  "codeHint" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "consumedAt" TIMESTAMP(3),
  CONSTRAINT "CaregiverInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CareConnection_patientId_caregiverId_key" ON "CareConnection"("patientId", "caregiverId");
CREATE UNIQUE INDEX "CareConnection_patientId_physicianId_key" ON "CareConnection"("patientId", "physicianId");
CREATE INDEX "CareConnection_caregiverId_idx" ON "CareConnection"("caregiverId");
CREATE INDEX "CareConnection_physicianId_idx" ON "CareConnection"("physicianId");
CREATE UNIQUE INDEX "PhysicianConnectionRequest_patientId_physicianId_key" ON "PhysicianConnectionRequest"("patientId", "physicianId");
CREATE INDEX "PhysicianConnectionRequest_recipientId_status_idx" ON "PhysicianConnectionRequest"("recipientId", "status");
CREATE INDEX "PhysicianConnectionRequest_senderId_status_idx" ON "PhysicianConnectionRequest"("senderId", "status");
CREATE UNIQUE INDEX "CaregiverInvite_patientId_key" ON "CaregiverInvite"("patientId");
CREATE UNIQUE INDEX "CaregiverInvite_codeHash_key" ON "CaregiverInvite"("codeHash");

ALTER TABLE "PhysicianConnectionRequest" ADD CONSTRAINT "PhysicianConnectionRequest_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PhysicianConnectionRequest" ADD CONSTRAINT "PhysicianConnectionRequest_physicianId_fkey" FOREIGN KEY ("physicianId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PhysicianConnectionRequest" ADD CONSTRAINT "PhysicianConnectionRequest_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PhysicianConnectionRequest" ADD CONSTRAINT "PhysicianConnectionRequest_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CaregiverInvite" ADD CONSTRAINT "CaregiverInvite_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
