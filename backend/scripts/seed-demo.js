import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient } from "../generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";

// Public demo accounts only. Never reuse these predictable credentials outside the demo database.
const DEMO_USERS = [
  { key: "aarav", name: "Aarav", email: "aarav@gmail.com", password: "aarav1234", role: "PATIENT" },
  { key: "riya", name: "Riya", email: "riya@gmail.com", password: "riya1234", role: "PATIENT" },
  { key: "neha", name: "Neha", email: "neha@gmail.com", password: "neha1234", role: "PHYSICIAN" },
  { key: "arjun", name: "Arjun", email: "arjun@gmail.com", password: "arjun1234", role: "PHYSICIAN" },
  { key: "meera", name: "Meera", email: "meera@gmail.com", password: "meera1234", role: "CAREGIVER" },
  { key: "karan", name: "Karan", email: "karan@gmail.com", password: "karan1234", role: "CAREGIVER" },
];
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required to seed demo data.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

function localDate(dayOffset = 0, hour = 0, minute = 0) { const date = new Date(); date.setHours(hour, minute, 0, 0); date.setDate(date.getDate() + dayOffset); return date; }
function dateText(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function nextWeekday() { const date = localDate(7, 10, 30); while ([0, 6].includes(date.getDay())) date.setDate(date.getDate() + 1); return date; }
async function usersByKey() { const rows = await prisma.user.findMany({ where: { email: { in: DEMO_USERS.map(user => user.email) } } }); return Object.fromEntries(DEMO_USERS.map(definition => [definition.key, rows.find(row => row.email === definition.email)])); }

async function assertNoCrossScope(users) {
  const ids = Object.values(users).filter(Boolean).map(user => user.id), patientIds = [users.aarav?.id, users.riya?.id].filter(Boolean);
  if (!ids.length) return;
  const counts = await Promise.all([
    prisma.careConnection.count({ where: { patientId: { notIn: patientIds }, OR: [{ physicianId: { in: ids } }, { caregiverId: { in: ids } }] } }),
    prisma.clinicalRecord.count({ where: { patientId: { notIn: patientIds }, physicianId: { in: ids } } }),
    prisma.appointment.count({ where: { userId: { notIn: patientIds }, physicianId: { in: ids } } }),
    prisma.emergency.count({ where: { patientId: { notIn: patientIds }, OR: [{ triggeredById: { in: ids } }, { respondingPhysicianId: { in: ids } }, { resolvedById: { in: ids } }] } }),
    prisma.vital.count({ where: { userId: { notIn: patientIds }, recordedById: { in: ids } } }),
    prisma.emergencyCaregiverAcknowledgement.count({ where: { caregiverId: { in: ids }, emergency: { patientId: { notIn: patientIds } } } }),
  ]);
  if (counts.some(Boolean)) throw new Error("Demo accounts have cross-scope data. Clean/seed aborted to protect unrelated patients.");
}

async function clearPatientBaseline(tx, patientIds) {
  const emergencyIds = (await tx.emergency.findMany({ where: { patientId: { in: patientIds } }, select: { id: true } })).map(row => row.id);
  if (emergencyIds.length) await tx.emergencyCaregiverAcknowledgement.deleteMany({ where: { emergencyId: { in: emergencyIds } } });
  await tx.emergency.deleteMany({ where: { patientId: { in: patientIds } } });
  await tx.medicationLog.deleteMany({ where: { userId: { in: patientIds } } });
  await tx.medication.deleteMany({ where: { userId: { in: patientIds } } });
  await tx.vital.deleteMany({ where: { userId: { in: patientIds } } });
  await tx.clinicalRecord.deleteMany({ where: { patientId: { in: patientIds } } });
  await tx.appointment.deleteMany({ where: { userId: { in: patientIds } } });
  await tx.alert.deleteMany({ where: { userId: { in: patientIds } } });
  await tx.physicianConnectionRequest.deleteMany({ where: { patientId: { in: patientIds } } });
  await tx.caregiverInvite.deleteMany({ where: { patientId: { in: patientIds } } });
  await tx.careConnection.deleteMany({ where: { patientId: { in: patientIds } } });
}

async function cleanDemo() {
  const users = await usersByKey(); await assertNoCrossScope(users);
  const ids = Object.values(users).filter(Boolean).map(user => user.id); if (!ids.length) return console.log("No HealthSync demo accounts found.");
  const patientIds = [users.aarav?.id, users.riya?.id].filter(Boolean);
  await prisma.$transaction(async tx => {
    await clearPatientBaseline(tx, patientIds);
    await tx.emergencyCaregiverAcknowledgement.deleteMany({ where: { caregiverId: { in: ids } } });
    await tx.physicianAvailability.deleteMany({ where: { physicianId: { in: ids } } });
    await tx.physicianUnavailablePeriod.deleteMany({ where: { physicianId: { in: ids } } });
    await tx.physicianConnectionRequest.deleteMany({ where: { OR: [{ senderId: { in: ids } }, { recipientId: { in: ids } }, { physicianId: { in: ids } }] } });
    await tx.careConnection.deleteMany({ where: { OR: [{ caregiverId: { in: ids } }, { physicianId: { in: ids } }] } });
    await tx.user.deleteMany({ where: { id: { in: ids } } });
  });
  console.log("HealthSync demo accounts and demo-owned data removed safely.");
}

async function seedDemo() {
  const demoEmails = DEMO_USERS.map(user => user.email);
  const protectedSelect = { id: true, name: true, email: true, password: true, role: true, _count: { select: { patientConnections: true, caregiverConnections: true, physicianConnections: true, vitals: true, medications: true, patientAppointments: true, patientClinicalRecords: true, alerts: true, patientEmergencies: true } } };
  const beforeProtected = await prisma.user.findMany({ where: { email: { notIn: demoEmails } }, select: protectedSelect, orderBy: { id: "asc" } });
  await assertNoCrossScope(await usersByKey());
  for (const definition of DEMO_USERS) { const password = await bcrypt.hash(definition.password, 10); await prisma.user.upsert({ where: { email: definition.email }, create: { name: definition.name, email: definition.email, password, role: definition.role }, update: { name: definition.name, password, role: definition.role } }); }
  const users = await usersByKey(), patientIds = [users.aarav.id, users.riya.id], upcoming = nextWeekday(), upcomingDate = dateText(upcoming);

  await prisma.$transaction(async tx => {
    await clearPatientBaseline(tx, patientIds);
    await tx.physicianAvailability.deleteMany({ where: { physicianId: { in: [users.neha.id, users.arjun.id] } } });
    await tx.physicianUnavailablePeriod.deleteMany({ where: { physicianId: { in: [users.neha.id, users.arjun.id] } } });
    await tx.physicianAvailability.createMany({ data: [users.neha.id, users.arjun.id].flatMap(physicianId => [1, 2, 3, 4, 5].map(dayOfWeek => ({ physicianId, dayOfWeek, startTime: "09:00", endTime: "17:00", slotDuration: 30 }))) });
    await tx.careConnection.createMany({ data: [{ patientId: users.aarav.id, physicianId: users.neha.id }, { patientId: users.riya.id, physicianId: users.arjun.id }, { patientId: users.riya.id, caregiverId: users.karan.id }] });

    const createdAt = localDate(-45, 9), aaravMeds = await Promise.all([
      tx.medication.create({ data: { userId: users.aarav.id, name: "Metformin", dosage: "500 mg", schedule: "08:00 and 20:00", stock: 36, createdAt } }),
      tx.medication.create({ data: { userId: users.aarav.id, name: "Amlodipine", dosage: "5 mg", schedule: "08:00 daily", stock: 24, createdAt } }),
      tx.medication.create({ data: { userId: users.aarav.id, name: "Vitamin D3", dosage: "1000 IU", schedule: "09:00 daily", stock: 27, createdAt } }),
      tx.medication.create({ data: { userId: users.aarav.id, name: "Atorvastatin", dosage: "10 mg", schedule: "21:00 daily", stock: 22, createdAt } }),
      tx.medication.create({ data: { userId: users.aarav.id, name: "Pantoprazole", dosage: "40 mg", schedule: "07:30 daily", stock: 19, createdAt } }),
    ]);
    const [metformin, amlodipine, vitaminD3, atorvastatin, pantoprazole] = aaravMeds;
    const dailySchedule = [[pantoprazole, 7, 30], [amlodipine, 8, 0], [vitaminD3, 9, 0], [atorvastatin, 21, 0]], logs = [];
    for (let day = -8; day <= -1; day++) for (const [medication, hour, minute] of dailySchedule) { const scheduledAt = localDate(day, hour, minute), missed = day === -3 && medication.id === atorvastatin.id; logs.push({ medicationId: medication.id, userId: users.aarav.id, status: missed ? "MISSED" : "TAKEN", scheduledAt, takenAt: missed ? null : new Date(scheduledAt.getTime() + 10 * 60000) }); }
    for (let day = -5; day <= -1; day++) for (const hour of [8, 20]) { const scheduledAt = localDate(day, hour), missed = day === -5 && hour === 20; logs.push({ medicationId: metformin.id, userId: users.aarav.id, status: missed ? "MISSED" : "TAKEN", scheduledAt, takenAt: missed ? null : new Date(scheduledAt.getTime() + 10 * 60000) }); }
    await tx.medicationLog.createMany({ data: logs });

    const riyaMeds = await Promise.all([
      tx.medication.create({ data: { userId: users.riya.id, name: "Cetirizine", dosage: "10 mg", schedule: "21:00 daily", stock: 20, createdAt: localDate(-40, 9) } }),
      tx.medication.create({ data: { userId: users.riya.id, name: "Calcium carbonate", dosage: "500 mg", schedule: "09:00 daily", stock: 26, createdAt: localDate(-40, 9, 5) } }),
    ]), riyaLogs = [];
    for (let day = -7; day <= -1; day++) for (const [index, medication] of riyaMeds.entries()) { const scheduledAt = localDate(day, index ? 9 : 21), missed = day === -4 && index === 0; riyaLogs.push({ medicationId: medication.id, userId: users.riya.id, status: missed ? "MISSED" : "TAKEN", scheduledAt, takenAt: missed ? null : new Date(scheduledAt.getTime() + 8 * 60000) }); }
    await tx.medicationLog.createMany({ data: riyaLogs });

    const av = [[128,82,76,102],[132,84,78,106],[130,83,75,101],[134,85,79,108],[127,80,74,99],[131,82,73,104],[129,81,72,98]], rv = [[118,76,70,92],[120,77,72,94],[117,75,69,90],[122,78,73,95],[119,76,71,91]];
    await tx.vital.createMany({ data: [...av.map(([systolic,diastolic,heartRate,glucose],i)=>({userId:users.aarav.id,recordedById:users.aarav.id,source:"PATIENT",systolic,diastolic,heartRate,glucose,recordedAt:localDate(-14+i*2,8,15)})), ...rv.map(([systolic,diastolic,heartRate,glucose],i)=>({userId:users.riya.id,recordedById:i===3?users.karan.id:users.riya.id,source:i===3?"CAREGIVER":"PATIENT",systolic,diastolic,heartRate,glucose,recordedAt:localDate(-10+i*2,8,30)}))] });

    await tx.clinicalRecord.createMany({ data: [
      {patientId:users.aarav.id,physicianId:users.neha.id,type:"CONSULTATION",title:"Routine wellness consultation",clinicalDate:localDate(-35),findings:"Routine review completed with home readings available for discussion.",interpretation:"Recorded observations support continued routine monitoring.",recommendations:"Continue the established monitoring plan and bring recorded readings to follow-up.",status:"NORMAL",followUpRequired:true,followUpDate:upcoming,createdAt:localDate(-35,11)},
      {patientId:users.aarav.id,physicianId:users.neha.id,type:"VITAL_ASSESSMENT",title:"Home vital-sign review",clinicalDate:localDate(-21),findings:"Recent home blood pressure, heart-rate and glucose entries are available and internally consistent.",interpretation:"No urgent concern is documented in the reviewed home readings.",recommendations:"Continue recording readings at consistent times for trend review.",status:"NORMAL",followUpRequired:false,createdAt:localDate(-21,12)},
      {patientId:users.aarav.id,physicianId:users.neha.id,type:"LAB_RESULT",title:"Routine laboratory summary",clinicalDate:localDate(-12),findings:"Routine laboratory results were reviewed during follow-up planning.",interpretation:"The record contains no critical laboratory flag.",recommendations:"Review the full laboratory report with the physician at the next scheduled visit.",status:"NORMAL",followUpRequired:true,followUpDate:upcoming,createdAt:localDate(-12,10,30)},
      {patientId:users.aarav.id,physicianId:users.neha.id,type:"FOLLOW_UP",title:"Medication adherence review",clinicalDate:localDate(-5),findings:"Most recorded doses were taken; two historical doses were missed.",interpretation:"Recorded adherence remains high with an opportunity to reinforce routine consistency.",recommendations:"Continue using scheduled reminders and review adherence at the next visit.",status:"NEEDS_ATTENTION",followUpRequired:true,followUpDate:upcoming,createdAt:localDate(-5,11,30)},
      {patientId:users.riya.id,physicianId:users.arjun.id,type:"CONSULTATION",title:"Routine health review",clinicalDate:localDate(-18),findings:"Home readings are available with generally consistent medication records.",interpretation:"The current record supports routine monitoring.",recommendations:"Maintain the current monitoring schedule until follow-up.",status:"NORMAL",followUpRequired:true,followUpDate:upcoming,createdAt:localDate(-18,11,30)},
      {patientId:users.riya.id,physicianId:users.arjun.id,type:"FOLLOW_UP",title:"Home monitoring follow-up",clinicalDate:localDate(-6),findings:"Recent readings remain consistent within the patient's recorded pattern.",interpretation:"No new urgent monitoring concern is documented.",recommendations:"Continue periodic readings and attend the scheduled review.",status:"NORMAL",followUpRequired:false,createdAt:localDate(-6,11,30)},
    ] });

    const completed = localDate(-30,11), riyaCompleted = localDate(-24,11,30);
    await tx.appointment.createMany({ data: [
      {userId:users.aarav.id,physicianId:users.neha.id,title:"Routine consultation",doctor:"Neha",date:dateText(completed),time:"11:00",scheduledAt:completed,durationMinutes:30,reason:"Routine consultation and monitoring review",status:"COMPLETED",createdAt:localDate(-38,9)},
      {userId:users.aarav.id,physicianId:users.neha.id,title:"Medication and wellness follow-up",doctor:"Neha",date:upcomingDate,time:"10:30",scheduledAt:upcoming,durationMinutes:30,reason:"Review medication adherence, home readings and follow-up plan",status:"CONFIRMED",activeSlotKey:`${users.neha.id}:${upcomingDate}:10:30`,createdAt:localDate(-4,9,15)},
      {userId:users.riya.id,physicianId:users.arjun.id,title:"Routine review",doctor:"Arjun",date:dateText(riyaCompleted),time:"11:30",scheduledAt:riyaCompleted,durationMinutes:30,reason:"Routine health review",status:"COMPLETED",createdAt:localDate(-30,9)},
      {userId:users.riya.id,physicianId:users.arjun.id,title:"Monitoring follow-up",doctor:"Arjun",date:upcomingDate,time:"14:00",scheduledAt:new Date(upcoming.getFullYear(),upcoming.getMonth(),upcoming.getDate(),14),durationMinutes:30,reason:"Home monitoring follow-up",status:"CONFIRMED",activeSlotKey:`${users.arjun.id}:${upcomingDate}:14:00`,createdAt:localDate(-3,9,30)},
    ] });

    await tx.alert.createMany({ data: [
      {userId:users.aarav.id,type:"missed_dose",message:"Metformin 500 mg was recorded as missed during the historical adherence period.",severity:"WARNING",read:true,createdAt:localDate(-5,20,3)},
      {userId:users.aarav.id,type:"missed_dose",message:"Atorvastatin 10 mg was recorded as missed during the historical adherence period.",severity:"WARNING",read:true,createdAt:localDate(-3,21,3)},
      {userId:users.aarav.id,type:"handoff_note",message:JSON.stringify({author:"Aarav",authorRole:"patient",note:"Home readings have been recorded before breakfast for the upcoming review."}),severity:"INFO",read:true,createdAt:localDate(-2,8,30)},
      {userId:users.aarav.id,type:"clinical_note",message:JSON.stringify({author:"Neha",authorRole:"doctor",note:"Continue the current monitoring routine and bring recorded readings to follow-up."}),severity:"INFO",read:true,createdAt:localDate(-1,12)},
      {userId:users.riya.id,type:"handoff_note",message:JSON.stringify({author:"Riya",authorRole:"patient",note:"Evening medication and home readings are following the planned routine."}),severity:"INFO",read:true,createdAt:localDate(-2,20,30)},
      {userId:users.riya.id,type:"care_observation",message:JSON.stringify({author:"Karan",authorRole:"caregiver",note:"Riya has maintained a consistent home monitoring schedule."}),severity:"INFO",read:true,createdAt:localDate(-1,9)},
    ] });

    const emergencyCreatedAt = localDate(-9, 18, 10);
    const resolvedEmergency = await tx.emergency.create({ data: {
      patientId: users.aarav.id,
      triggeredById: users.aarav.id,
      triggeredByRole: "PATIENT",
      status: "RESOLVED",
      respondingPhysicianId: users.neha.id,
      acknowledgedAt: new Date(emergencyCreatedAt.getTime() + 4 * 60_000),
      resolvedById: users.neha.id,
      resolvedAt: new Date(emergencyCreatedAt.getTime() + 45 * 60_000),
      resolutionNote: "Patient was contacted, the situation was reviewed, and the emergency was safely resolved with follow-up guidance.",
      activePatientKey: null,
      createdAt: emergencyCreatedAt,
    } });
    await tx.emergencyCaregiverAcknowledgement.create({ data: { emergencyId: resolvedEmergency.id, caregiverId: users.meera.id, acknowledgedAt: new Date(emergencyCreatedAt.getTime() + 8 * 60_000) } });
  });

  const afterProtected = await prisma.user.findMany({ where: { email: { notIn: demoEmails } }, select: protectedSelect, orderBy: { id: "asc" } });
  if (JSON.stringify(beforeProtected) !== JSON.stringify(afterProtected)) throw new Error("Non-demo user state changed; seed aborted.");
  const demoRows = await prisma.user.findMany({ where: { email: { in: demoEmails } }, select: { id: true, email: true, password: true, role: true } });
  if (demoRows.length !== 6) throw new Error("Expected exactly six demo accounts.");
  for (const definition of DEMO_USERS) { const row = demoRows.find(user => user.email === definition.email); if (!row || row.role !== definition.role || row.password === definition.password || !(await bcrypt.compare(definition.password, row.password))) throw new Error(`Demo account verification failed for ${definition.email}.`); }

  const connections = await prisma.careConnection.findMany({ where: { patientId: { in: patientIds } }, select: { patientId: true, physicianId: true, caregiverId: true } });
  const expected = new Set([`${users.aarav.id}:p:${users.neha.id}`, `${users.riya.id}:p:${users.arjun.id}`, `${users.riya.id}:c:${users.karan.id}`]), actual = new Set(connections.map(item => item.physicianId ? `${item.patientId}:p:${item.physicianId}` : `${item.patientId}:c:${item.caregiverId}`));
  if (actual.size !== expected.size || [...expected].some(key => !actual.has(key))) throw new Error("Demo care-circle verification failed.");
  const medications = await prisma.medication.findMany({ where: { userId: users.aarav.id }, select: { name: true, createdAt: true } }), names = ["Amlodipine","Atorvastatin","Metformin","Pantoprazole","Vitamin D3"];
  if (JSON.stringify(medications.map(item=>item.name).sort()) !== JSON.stringify(names) || medications.some(item=>item.createdAt >= localDate(0))) throw new Error("Aarav medication baseline is incorrect or not reconciliation-safe.");
  const [taken,missed,pending,vitals,records,appointments,missedAlerts,unread,resolvedEmergencies,activeEmergencies,acknowledgedEmergencies,invites,requests] = await Promise.all([
    prisma.medicationLog.count({where:{userId:users.aarav.id,status:"TAKEN"}}), prisma.medicationLog.count({where:{userId:users.aarav.id,status:"MISSED"}}), prisma.medicationLog.count({where:{userId:users.aarav.id,status:"PENDING"}}), prisma.vital.count({where:{userId:users.aarav.id}}), prisma.clinicalRecord.count({where:{patientId:users.aarav.id}}), prisma.appointment.count({where:{userId:users.aarav.id}}), prisma.alert.count({where:{userId:users.aarav.id,type:"missed_dose"}}), prisma.alert.count({where:{userId:{in:patientIds},read:false}}), prisma.emergency.count({where:{patientId:users.aarav.id,status:"RESOLVED",respondingPhysicianId:users.neha.id,resolvedById:users.neha.id,activePatientKey:null}}), prisma.emergency.count({where:{patientId:{in:patientIds},status:"ACTIVE"}}), prisma.emergency.count({where:{patientId:{in:patientIds},status:"ACKNOWLEDGED"}}), prisma.caregiverInvite.count({where:{patientId:{in:patientIds},active:true,consumedAt:null}}), prisma.physicianConnectionRequest.count({where:{patientId:{in:patientIds},status:"PENDING"}}),
  ]);
  if (taken !== 40 || missed !== 2 || pending || missedAlerts !== 2) throw new Error("Aarav adherence baseline is incorrect.");
  if (vitals !== 7 || records !== 4 || appointments !== 2) throw new Error("Aarav presentation data is incomplete.");
  if (resolvedEmergencies !== 1 || activeEmergencies || acknowledgedEmergencies || unread || invites || requests) throw new Error("Demo dynamic-state baseline is not clean.");
  console.log("HealthSync presentation demo ready.");
  console.log(`Aarav: 5 medications, 42 completed dose logs (${Math.round(taken / (taken + missed) * 100)}% adherence; 2 historical missed), 7 vitals, 4 clinical records, 2 appointments.`);
  console.log("Care Circle A: Aarav connected to Neha; Meera intentionally disconnected; no caregiver invite exists.");
  console.log("Care Circle B: Riya connected to Arjun and Karan.");
  console.log("Emergency history: 1 resolved Aarav emergency handled by Neha; 0 active or acknowledged emergencies.");
  console.log("Dynamic state: no unread alerts, pending requests, or unused invites.");
}

try { if (process.argv.includes("--clean")) await cleanDemo(); else await seedDemo(); }
catch (error) { console.error(`Demo seed failed: ${error.message}`); process.exitCode = 1; }
finally { await prisma.$disconnect(); }
