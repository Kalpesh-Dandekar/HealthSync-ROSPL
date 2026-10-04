import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { PrismaClient } from "./generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";
import { Server } from "socket.io";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is missing in backend/.env");

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });
const app = express();
const httpServer = http.createServer(app);
const PORT = Number(process.env.PORT || 5000);
const JWT_SECRET = process.env.JWT_SECRET?.trim();
if (!JWT_SECRET) throw new Error("JWT_SECRET is required in backend/.env");
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5175";
const allowedOrigins = new Set([
  CLIENT_ORIGIN,
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
]);

const io = new Server(httpServer, {
  cors: { origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)), methods: ["GET", "POST", "PATCH", "DELETE"] },
});

app.use(cors({ origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)) }));
app.use(express.json());


function toMinutes(hhmm) { const [h,m]=hhmm.split(":").map(Number); return h*60+m; }

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role === "PHYSICIAN" ? "doctor" : user.role.toLowerCase(),
  };
}

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: "12h" });
}

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Authentication required" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, service: "HealthSync backend", database: "connected" });
  } catch (error) {
    console.error(error);
    res.status(503).json({ success: false, service: "HealthSync backend", database: "offline" });
  }
});

app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password, role } = req.body || {};
    const cleanName = String(name || "").trim();
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanPassword = String(password || "");
    const selectedRole = String(role || "PATIENT").toUpperCase();
    const allowedRoles = ["PATIENT", "CAREGIVER", "PHYSICIAN"];

    if (!cleanName || !cleanEmail || cleanPassword.length < 6) {
      return res.status(400).json({ message: "Name, email and a password of at least 6 characters are required." });
    }
    if (!allowedRoles.includes(selectedRole)) return res.status(400).json({ message: "Invalid role selected." });

    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) return res.status(409).json({ message: "An account with this email already exists." });

    const passwordHash = await bcrypt.hash(cleanPassword, 10);
    const user = await prisma.user.create({
      data: { name: cleanName, email: cleanEmail, password: passwordHash, role: selectedRole },
    });

    const token = signToken(user);
    res.status(201).json({ token, user: publicUser(user) });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Unable to create the account." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password, role } = req.body || {};
    const requestedRole = String(role || "").trim().toUpperCase();
    const allowedRoles = ["PATIENT", "CAREGIVER", "PHYSICIAN"];

    if (!allowedRoles.includes(requestedRole)) {
      return res.status(400).json({ message: "Please select a valid workspace role." });
    }

    const user = await prisma.user.findUnique({
      where: { email: String(email || "").trim().toLowerCase() },
    });

    if (!user || !(await bcrypt.compare(String(password || ""), user.password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (user.role !== requestedRole) {
      return res.status(403).json({
        message: `This account is registered as ${user.role === "PHYSICIAN" ? "Physician" : user.role === "CAREGIVER" ? "Caregiver" : "Patient"}. Please select the correct workspace role.`,
      });
    }

    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Unable to log in." });
  }
});

app.get("/api/auth/me", auth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: Number(req.user.id) } });
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json({ user: publicUser(user) });
});



// ---------------- Shared role helpers ----------------
function roleName(role) {
  return role === "PHYSICIAN" ? "doctor" : role === "CAREGIVER" ? "caregiver" : "patient";
}

function clinicalRecordView(record) {
  return {
    id: record.id, patientId: record.patientId, physicianId: record.physicianId,
    patientName: record.patient?.name, physicianName: record.physician?.name,
    type: record.type, title: record.title,
    clinicalDate: record.clinicalDate.toISOString().slice(0, 10),
    findings: record.findings, interpretation: record.interpretation,
    recommendations: record.recommendations, status: record.status,
    followUpRequired: record.followUpRequired,
    followUpDate: record.followUpDate?.toISOString().slice(0, 10) || null,
    createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString(),
  };
}

async function getAssignedPatientIds(userId, role) {
  const where = role === "PHYSICIAN" ? { physicianId: userId } : { caregiverId: userId };
  const connections = await prisma.careConnection.findMany({ where, select: { patientId: true } });
  return [...new Set(connections.map(c => c.patientId))];
}

async function getPatientBundle(patientId) {
  const patient = await prisma.user.findUnique({
    where: { id: patientId },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  if (!patient || patient.role !== "PATIENT") return null;
  const [medications, vitals, alerts, appointments, connections, clinicalRecords] = await Promise.all([
    prisma.medication.findMany({ where: { userId: patientId }, include: { logs: { orderBy: { scheduledAt: "desc" }, take: 20 } }, orderBy: { createdAt: "desc" } }),
    prisma.vital.findMany({ where: { userId: patientId }, orderBy: { recordedAt: "desc" }, take: 20 }),
    prisma.alert.findMany({ where: { userId: patientId }, orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.appointment.findMany({ where: { userId: patientId }, orderBy: { id: "desc" } }),
    prisma.careConnection.findMany({ where: { patientId }, include: { caregiver: true, physician: true } }),
    prisma.clinicalRecord.findMany({ where: { patientId }, include: { patient: { select: { name: true } }, physician: { select: { name: true } } }, orderBy: [{ clinicalDate: "desc" }, { createdAt: "desc" }] }),
  ]);
  const caregiver = connections.find(c => c.caregiver)?.caregiver;
  const physician = connections.find(c => c.physician)?.physician;
  const careTeam = [];
  const seenCareTeam = new Set();
  for (const connection of connections) {
    for (const member of [connection.caregiver, connection.physician]) {
      if (member && !seenCareTeam.has(member.id)) {
        seenCareTeam.add(member.id);
        careTeam.push({ id: member.id, name: member.name, email: member.email, role: roleName(member.role) });
      }
    }
  }
  const taken = medications.flatMap(m => m.logs).filter(l => l.status === "TAKEN").length;
  const completed = medications.flatMap(m => m.logs).filter(l => l.status !== "PENDING").length;
  return {
    patient: { ...publicUser(patient), patientCode: `#${patient.id}`, age: 0, primaryCaregiver: caregiver?.name || "Not connected", physician: physician?.name || "Not connected" },
    medications, vitals, alerts, appointments, clinicalRecords: clinicalRecords.map(clinicalRecordView), careTeam,
    adherenceRate: completed ? Math.round((taken / completed) * 100) : 0,
  };
}

async function requireAssigned(req, res, patientId) {
  const role = req.user.role;
  if (role === "PATIENT") return Number(req.user.id) === Number(patientId);
  if (!["CAREGIVER", "PHYSICIAN"].includes(role)) return false;
  const ids = await getAssignedPatientIds(Number(req.user.id), role);
  return ids.includes(Number(patientId));
}

function emitToUser(userId, event, payload) {
  io.sockets.sockets.forEach(socket => {
    if (Number(socket.user?.id) === Number(userId)) socket.emit(event, payload);
  });
}

const APPOINTMENT_ACTIVE = ["REQUESTED", "CONFIRMED"];
const APPOINTMENT_TRANSITIONS = {
  REQUESTED: ["CONFIRMED", "REJECTED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "CANCELLED"],
};
function validDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")); }
function validTime(value) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || "")); }
// Appointment date/time fields are local clinic wall-clock values (Asia/Kolkata);
// scheduledAt stores the corresponding absolute instant for consistent querying.
function schedulingInstant(date, time) { return new Date(`${date}T${time}:00+05:30`); }
function schedulingNowKey() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date()).filter(part => part.type !== "literal").map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}|${parts.hour}:${parts.minute}`;
}
function activeSlotKey(physicianId, date, time) { return `${physicianId}:${date}:${time}`; }
function appointmentView(a) {
  return { ...a, reason: a.reason || a.title, patientName: a.user?.name, physicianName: a.physician?.name || a.doctor };
}
async function slotResult(physicianId, date) {
  const physician = await prisma.user.findFirst({ where: { id: physicianId, role: "PHYSICIAN" }, select: { id: true, name: true } });
  if (!physician) return { error: "Physician not found." };
  if (!validDate(date)) return { error: "A valid date is required." };
  const today = schedulingNowKey().slice(0, 10);
  if (date < today) return { physician, slots: [], message: "Past dates cannot be booked." };
  const leave = await prisma.physicianUnavailablePeriod.findFirst({ where: { physicianId, startDate: { lte: date }, endDate: { gte: date } }, orderBy: { startDate: "asc" } });
  if (leave) return { physician, slots: [], unavailable: leave, message: `${physician.name} is unavailable from ${leave.startDate} to ${leave.endDate}.` };
  const dayOfWeek = schedulingInstant(date, "12:00").getUTCDay();
  const availability = await prisma.physicianAvailability.findUnique({ where: { physicianId_dayOfWeek: { physicianId, dayOfWeek } } });
  if (!availability) return { physician, slots: [], message: "This physician has not published availability for this day." };
  const occupied = await prisma.appointment.findMany({ where: { physicianId, date, status: { in: APPOINTMENT_ACTIVE } }, select: { time: true } });
  const occupiedTimes = new Set(occupied.map(a => a.time));
  const start = toMinutes(availability.startTime), end = toMinutes(availability.endTime), nowKey = schedulingNowKey();
  const slots = [];
  for (let minute = start; minute + availability.slotDuration <= end; minute += availability.slotDuration) {
    const time = `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
    if (occupiedTimes.has(time)) continue;
    if (`${date}|${time}` <= nowKey) continue;
    slots.push(time);
  }
  return { physician, availability, slots, message: slots.length ? null : "No slots are available on this date." };
}


// ---------------- Caregiver / Physician views ----------------
app.get("/api/caregiver/patients", auth, async (req, res) => {
  if (req.user.role !== "CAREGIVER") return res.status(403).json({ message: "Caregiver access required." });
  const ids = await getAssignedPatientIds(Number(req.user.id), "CAREGIVER");
  const patients = (await Promise.all(ids.map(getPatientBundle))).filter(Boolean);
  res.json({ patients });
});

app.get("/api/caregiver/patients/:id", auth, async (req, res) => {
  if (req.user.role !== "CAREGIVER") return res.status(403).json({ message: "Caregiver access required." });
  const allowed = await requireAssigned(req, res, Number(req.params.id));
  if (!allowed) return res.status(403).json({ message: "You are not connected to this patient." });
  const bundle = await getPatientBundle(Number(req.params.id));
  if (!bundle) return res.status(404).json({ message: "Patient not found." });
  res.json(bundle);
});

app.get("/api/doctor/patients", auth, async (req, res) => {
  if (req.user.role !== "PHYSICIAN") return res.status(403).json({ message: "Physician access required." });
  const ids = await getAssignedPatientIds(Number(req.user.id), "PHYSICIAN");
  const patients = (await Promise.all(ids.map(getPatientBundle))).filter(Boolean);
  res.json({ patients });
});

app.get("/api/doctor/patients/:id", auth, async (req, res) => {
  if (req.user.role !== "PHYSICIAN") return res.status(403).json({ message: "Physician access required." });
  const allowed = await requireAssigned(req, res, Number(req.params.id));
  if (!allowed) return res.status(403).json({ message: "You are not connected to this patient." });
  const bundle = await getPatientBundle(Number(req.params.id));
  if (!bundle) return res.status(404).json({ message: "Patient not found." });
  res.json(bundle);
});

app.get("/api/role/appointments", auth, async (req, res) => {
  let appointments = [];
  if (req.user.role === "PATIENT") {
    appointments = await prisma.appointment.findMany({ where: { userId: Number(req.user.id) }, include: { user: { select: { name: true } }, physician: { select: { name: true } } }, orderBy: { id: "desc" } });
  } else if (req.user.role === "PHYSICIAN") {
    appointments = await prisma.appointment.findMany({ where: { physicianId: Number(req.user.id) }, include: { user: { select: { name: true } }, physician: { select: { name: true } } }, orderBy: { id: "desc" } });
  } else {
    const ids = await getAssignedPatientIds(Number(req.user.id), "CAREGIVER");
    appointments = await prisma.appointment.findMany({ where: { userId: { in: ids } }, include: { user: { select: { name: true } }, physician: { select: { name: true } } }, orderBy: { id: "desc" } });
  }
  res.json({ appointments: appointments.map(appointmentView) });
});

app.get("/api/handoff-notes", auth, async (req, res) => {
  let patientIds = [];
  if (req.user.role === "PATIENT") patientIds = [Number(req.user.id)];
  else patientIds = await getAssignedPatientIds(Number(req.user.id), req.user.role);
  const requestedPatientId = Number(req.query.patientId || 0);
  if (requestedPatientId) {
    if (!(await requireAssigned(req, res, requestedPatientId))) return res.status(403).json({ message: "You are not connected to this patient." });
    patientIds = [requestedPatientId];
  }
  const alerts = await prisma.alert.findMany({ where: { userId: { in: patientIds }, type: { in: ["handoff_note", "clinical_note", "care_observation"] } }, orderBy: { createdAt: "desc" }, take: 50 });
  const notes = alerts.map(a => {
    let meta = {};
    try { meta = JSON.parse(a.message); } catch { meta = { note: a.message }; }
    return { id: String(a.id), author: meta.author || "Care team", authorRole: meta.authorRole || "patient", note: meta.note || a.message, timestamp: a.createdAt.toISOString() };
  });
  res.json({ notes });
});

app.post("/api/handoff-notes", auth, async (req, res) => {
  const note = String(req.body?.note || "").trim();
  if (!note) return res.status(400).json({ message: "Note is required." });
  let patientIds = [];
  if (req.user.role === "PATIENT") patientIds = [Number(req.user.id)];
  else patientIds = await getAssignedPatientIds(Number(req.user.id), req.user.role);
  const requestedPatientId = Number(req.body?.patientId || 0);
  if (requestedPatientId) {
    if (!(await requireAssigned(req, res, requestedPatientId))) return res.status(403).json({ message: "You are not connected to this patient." });
    patientIds = [requestedPatientId];
  }
  if (!patientIds.length) return res.status(403).json({ message: "No connected patient." });
  const authorRole = roleName(req.user.role);
  const payload = JSON.stringify({ author: req.user.name, authorRole, note });
  const created = await prisma.alert.create({ data: { userId: patientIds[0], type: "handoff_note", message: payload, severity: "INFO" } });
  const result = { id: String(created.id), author: req.user.name, authorRole, note, timestamp: created.createdAt.toISOString() };
  for (const patientId of patientIds) emitToUser(patientId, "handoff:created", result);
  res.status(201).json(result);
});

app.post("/api/sos", auth, async (req, res) => {
  const active = Boolean(req.body?.active);
  if (req.user.role === "PATIENT") {
    if (!active) return res.json({ active: false });
    const caregiverConnections = await prisma.careConnection.findMany({ where: { patientId: Number(req.user.id), caregiverId: { not: null } }, select: { caregiverId: true } });
    const doctorConnections = await prisma.careConnection.findMany({ where: { patientId: Number(req.user.id), physicianId: { not: null } }, select: { physicianId: true } });
    const recipients = [...new Set([...caregiverConnections.map(x => x.caregiverId).filter(Boolean), ...doctorConnections.map(x => x.physicianId).filter(Boolean)])];
    const alert = await prisma.alert.create({ data: { userId: Number(req.user.id), type: "emergency", message: `Emergency SOS triggered by ${req.user.name}.`, severity: "HIGH" } });
    for (const id of recipients) emitToUser(id, "sos:updated", { active: true, patientId: Number(req.user.id), patientName: req.user.name, alertId: alert.id });
    return res.json({ active: true });
  }
  if (!active && ["CAREGIVER", "PHYSICIAN"].includes(req.user.role)) {
    const ids = await getAssignedPatientIds(Number(req.user.id), req.user.role);
    if (!ids.length) return res.status(403).json({ message: "No connected patient." });
    const requestedAlertId = Number(req.body?.alertId || 0);
    let emergency = requestedAlertId ? await prisma.alert.findUnique({ where: { id: requestedAlertId } }) : null;
    if (emergency && (!ids.includes(emergency.userId) || emergency.type !== "emergency")) return res.status(403).json({ message: "You cannot resolve this emergency." });
    if (!emergency) emergency = await prisma.alert.findFirst({ where: { userId: { in: ids }, type: "emergency", read: false }, orderBy: { createdAt: "desc" } });
    if (emergency) {
      await prisma.alert.update({ where: { id: emergency.id }, data: { read: true } });
      emitToUser(emergency.userId, "alert:updated", { id: emergency.id, read: true });
    }
    return res.json({ active: false });
  }
  return res.status(403).json({ message: "Only patients can trigger SOS." });
});

// ---------------- Caregiver patient actions ----------------
app.post("/api/caregiver/patients/:id/medications/:medicationId/log", auth, async (req, res) => {
  if (req.user.role !== "CAREGIVER") return res.status(403).json({ message: "Caregiver access required." });
  const patientId = Number(req.params.id);
  const medicationId = Number(req.params.medicationId);
  if (!(await requireAssigned(req, res, patientId))) return res.status(403).json({ message: "You are not connected to this patient." });
  const medication = await prisma.medication.findFirst({ where: { id: medicationId, userId: patientId } });
  if (!medication) return res.status(404).json({ message: "Medication not found for this patient." });
  const status = String(req.body?.status || "").toUpperCase();
  if (!["TAKEN", "MISSED", "PENDING"].includes(status)) return res.status(400).json({ message: "Invalid medication status." });
  const scheduledAt = req.body?.scheduledAt ? new Date(req.body.scheduledAt) : new Date();
  if (Number.isNaN(scheduledAt.getTime())) return res.status(400).json({ message: "Invalid scheduled time." });
  const log = await prisma.medicationLog.create({
    data: {
      medicationId,
      userId: patientId,
      status,
      scheduledAt,
      takenAt: status === "TAKEN" ? new Date() : null,
    },
  });
  if (status === "MISSED") {
    await prisma.alert.create({ data: { userId: patientId, type: "missed_dose", message: `${medication.name} was marked missed by caregiver ${req.user.name}.`, severity: "WARNING" } });
  }
  emitToUser(patientId, "medication:updated", { patientId, medicationId, log });
  res.status(201).json({ log });
});

app.post("/api/caregiver/patients/:id/vitals", auth, async (req, res) => {
  if (req.user.role !== "CAREGIVER") return res.status(403).json({ message: "Caregiver access required." });
  const patientId = Number(req.params.id);
  if (!(await requireAssigned(req, res, patientId))) return res.status(403).json({ message: "You are not connected to this patient." });
  const values = {
    heartRate: req.body?.heartRate === "" || req.body?.heartRate == null ? null : Number(req.body.heartRate),
    systolic: req.body?.systolic === "" || req.body?.systolic == null ? null : Number(req.body.systolic),
    diastolic: req.body?.diastolic === "" || req.body?.diastolic == null ? null : Number(req.body.diastolic),
    glucose: req.body?.glucose === "" || req.body?.glucose == null ? null : Number(req.body.glucose),
  };
  if (Object.values(values).every(v => v == null)) return res.status(400).json({ message: "Enter at least one vital reading." });
  if (Object.values(values).some(v => v != null && !Number.isFinite(v))) return res.status(400).json({ message: "Vital readings must be valid numbers." });
  const vital = await prisma.vital.create({ data: { userId: patientId, ...values } });
  await prisma.alert.create({ data: { userId: patientId, type: "vitals", message: `New vital reading recorded by caregiver ${req.user.name}.`, severity: "INFO" } });
  emitToUser(patientId, "vitals:updated", { patientId, vital });
  res.status(201).json({ vital });
});

// ---------------- Clinical updates / caregiver observations ----------------
app.post("/api/doctor/patients/:id/medications", auth, async (req, res) => {
  if (req.user.role !== "PHYSICIAN") return res.status(403).json({ message: "Physician access required." });
  const patientId = Number(req.params.id);
  if (!(await requireAssigned(req, res, patientId))) return res.status(403).json({ message: "You are not connected to this patient." });
  const { name, dosage, schedule, stock } = req.body || {};
  if (!String(name || "").trim() || !String(dosage || "").trim() || !String(schedule || "").trim()) return res.status(400).json({ message: "Medicine name, dosage and schedule are required." });
  const medication = await prisma.medication.create({ data: { userId: patientId, name:String(name).trim(), dosage:String(dosage).trim(), schedule:String(schedule).trim(), stock:Number(stock || 0) } });
  emitToUser(patientId, "medication:updated", { patientId, medication });
  res.status(201).json({ medication });
});

app.post("/api/doctor/patients/:id/clinical-note", auth, async (req, res) => {
  if (req.user.role !== "PHYSICIAN") return res.status(403).json({ message: "Physician access required." });
  const patientId = Number(req.params.id);
  if (!(await requireAssigned(req, res, patientId))) return res.status(403).json({ message: "You are not connected to this patient." });
  const note = String(req.body?.note || "").trim();
  if (!note) return res.status(400).json({ message: "Clinical note is required." });
  const alert = await prisma.alert.create({ data: { userId: patientId, type:"clinical_note", message: JSON.stringify({ author:req.user.name, authorRole:"doctor", note }), severity:"INFO" } });
  emitToUser(patientId, "clinical:updated", { patientId, note });
  res.status(201).json({ id:String(alert.id), author:req.user.name, authorRole:"doctor", note, timestamp:alert.createdAt.toISOString() });
});

app.get("/api/clinical-records", auth, async (req, res) => {
  try {
    let patientIds = req.user.role === "PATIENT" ? [Number(req.user.id)] : await getAssignedPatientIds(Number(req.user.id), req.user.role);
    const requestedPatientId = Number(req.query.patientId || 0);
    if (requestedPatientId) {
      if (!(await requireAssigned(req, res, requestedPatientId))) return res.status(403).json({ message: "You are not authorized to view this patient's clinical records." });
      patientIds = [requestedPatientId];
    }
    if (!patientIds.length) return res.json({ records: [] });
    const records = await prisma.clinicalRecord.findMany({
      where: { patientId: { in: patientIds } },
      include: { patient: { select: { name: true } }, physician: { select: { name: true } } },
      orderBy: [{ clinicalDate: "desc" }, { createdAt: "desc" }],
    });
    res.json({ records: records.map(clinicalRecordView) });
  } catch (error) {
    console.error("Get clinical records error:", error);
    res.status(500).json({ message: "Unable to load clinical records." });
  }
});

app.post("/api/doctor/patients/:id/clinical-records", auth, async (req, res) => {
  if (req.user.role !== "PHYSICIAN") return res.status(403).json({ message: "Physician access required." });
  try {
    const patientId = Number(req.params.id);
    if (!(await requireAssigned(req, res, patientId))) return res.status(403).json({ message: "You are not authorized to create records for this patient." });
    const type = String(req.body?.type || "").toUpperCase();
    const title = String(req.body?.title || "").trim();
    const clinicalDate = String(req.body?.clinicalDate || "");
    const findings = String(req.body?.findings || "").trim();
    const interpretation = String(req.body?.interpretation || "").trim();
    const recommendations = String(req.body?.recommendations || "").trim();
    const status = String(req.body?.status || "").toUpperCase();
    const followUpRequired = Boolean(req.body?.followUpRequired);
    const followUpDate = String(req.body?.followUpDate || "");
    const validTypes = ["CONSULTATION", "VITAL_ASSESSMENT", "LAB_RESULT", "FOLLOW_UP", "GENERAL_NOTE"];
    const validStatuses = ["NORMAL", "NEEDS_ATTENTION", "CRITICAL"];
    if (!validTypes.includes(type) || !validStatuses.includes(status)) return res.status(400).json({ message: "Select a valid record type and overall status." });
    if (!title || title.length > 160 || !validDate(clinicalDate) || !findings || !interpretation || !recommendations) return res.status(400).json({ message: "Title, clinical date, findings, physician interpretation and recommendations are required." });
    if ([findings, interpretation, recommendations].some(value => value.length > 5000)) return res.status(400).json({ message: "Clinical record text must be 5,000 characters or fewer per section." });
    if (followUpRequired && (!validDate(followUpDate) || followUpDate < clinicalDate)) return res.status(400).json({ message: "Select a valid follow-up date on or after the clinical date." });
    const created = await prisma.clinicalRecord.create({
      data: { patientId, physicianId: Number(req.user.id), type, title, clinicalDate: new Date(`${clinicalDate}T00:00:00.000Z`), findings, interpretation, recommendations, status, followUpRequired, followUpDate: followUpRequired ? new Date(`${followUpDate}T00:00:00.000Z`) : null },
      include: { patient: { select: { name: true } }, physician: { select: { name: true } } },
    });
    const record = clinicalRecordView(created);
    emitToUser(patientId, "clinical-record:created", record);
    res.status(201).json({ record });
  } catch (error) {
    console.error("Create clinical record error:", error);
    res.status(500).json({ message: "Unable to create clinical record." });
  }
});

app.post("/api/caregiver/patients/:id/observation", auth, async (req, res) => {
  if (req.user.role !== "CAREGIVER") return res.status(403).json({ message: "Caregiver access required." });
  const patientId = Number(req.params.id);
  if (!(await requireAssigned(req, res, patientId))) return res.status(403).json({ message: "You are not connected to this patient." });
  const note = String(req.body?.note || "").trim();
  if (!note) return res.status(400).json({ message: "Observation is required." });
  const alert = await prisma.alert.create({ data: { userId: patientId, type:"care_observation", message: JSON.stringify({ author:req.user.name, authorRole:"caregiver", note }), severity:"INFO" } });
  emitToUser(patientId, "care:updated", { patientId, note });
  res.status(201).json({ id:String(alert.id), author:req.user.name, authorRole:"caregiver", note, timestamp:alert.createdAt.toISOString() });
});


// ---------------- Physician appointment scheduling ----------------
app.post("/api/doctor/patients/:id/appointments", auth, async (req, res) => {
  if (req.user.role !== "PHYSICIAN") return res.status(403).json({ message: "Physician access required." });
  const patientId = Number(req.params.id);
  if (!(await requireAssigned(req, res, patientId))) return res.status(403).json({ message: "You are not connected to this patient." });
  const title = String(req.body?.title || "Follow-up consultation").trim();
  const date = String(req.body?.date || "").trim();
  const time = String(req.body?.time || "").trim();
  if (!date || !time) return res.status(400).json({ message: "Date and time are required." });
  const slots = await slotResult(Number(req.user.id), date);
  if (!slots.slots?.includes(time)) return res.status(409).json({ message: "This time slot is not available in your published schedule." });
  let appointment;
  try {
    appointment = await prisma.appointment.create({ data: { userId: patientId, physicianId: Number(req.user.id), title, reason: title, doctor: req.user.name, date, time, scheduledAt: schedulingInstant(date, time), durationMinutes: slots.availability.slotDuration, status: "CONFIRMED", activeSlotKey: activeSlotKey(Number(req.user.id), date, time) } });
  } catch (error) {
    if (error?.code === "P2002") return res.status(409).json({ message: "This time slot is no longer available." });
    throw error;
  }
  const alert = await prisma.alert.create({ data: { userId: patientId, type: "appointment", message: `Appointment scheduled by Dr. ${req.user.name} for ${date} at ${time}.`, severity: "INFO" } });
  emitToUser(patientId, "appointment:created", appointment);
  emitToUser(patientId, "alert:created", alert);
  res.status(201).json({ appointment });
});

// ---------------- Reports / emergency views ----------------
app.get("/api/reports", auth, async (req, res) => {
  try {
    let patientIds = [];
    if (req.user.role === "PATIENT") patientIds = [Number(req.user.id)];
    else patientIds = await getAssignedPatientIds(Number(req.user.id), req.user.role);

    if (!patientIds.length) return res.json({ reports: [] });

    const [medications, logs, vitals, appointments, alerts, clinicalRecords, patients] = await Promise.all([
      prisma.medication.findMany({ where: { userId: { in: patientIds } }, include: { logs: true }, orderBy: { createdAt: "desc" } }),
      prisma.medicationLog.findMany({ where: { userId: { in: patientIds } }, orderBy: { scheduledAt: "desc" }, take: 100 }),
      prisma.vital.findMany({ where: { userId: { in: patientIds } }, orderBy: { recordedAt: "desc" }, take: 100 }),
      prisma.appointment.findMany({ where: { userId: { in: patientIds } }, orderBy: { id: "desc" }, take: 100 }),
      prisma.alert.findMany({ where: { userId: { in: patientIds } }, orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.clinicalRecord.findMany({ where: { patientId: { in: patientIds } }, include: { physician: { select: { name: true } } }, orderBy: [{ clinicalDate: "desc" }, { createdAt: "desc" }] }),
      prisma.user.findMany({ where: { id: { in: patientIds }, role: "PATIENT" }, select: { id: true, name: true } }),
    ]);

    const reports = [];
    for (const patientId of patientIds) {
      const patient = patients.find(item => item.id === patientId);
      if (!patient) continue;
      const pm = medications.filter(m => m.userId === patientId);
      const pl = logs.filter(l => l.userId === patientId);
      const pv = vitals.filter(v => v.userId === patientId);
      const pa = appointments.filter(a => a.userId === patientId);
      const pr = alerts.filter(a => a.userId === patientId);
      const pc = clinicalRecords.filter(record => record.patientId === patientId);
      const taken = pl.filter(l => l.status === "TAKEN").length;
      const completed = pl.filter(l => l.status !== "PENDING").length;
      const adherence = completed ? Math.round((taken / completed) * 100) : 0;
      const latest = pv[0];
      const upcoming = pa.filter(a => !["Cancelled", "Completed"].includes(a.status)).length;
      const openAlerts = pr.filter(a => !a.read).length;

      reports.push({
        id: `adherence-${patientId}`,
        patientId,
        patientName: patient.name,
        title: "Medication adherence summary",
        category: "adherence",
        generatedOn: new Date().toLocaleDateString(),
        authoredBy: "HealthSync system",
        summary: `${patient.name} has ${pm.length} active medication(s). Recorded adherence is ${adherence}% based on ${completed} completed dose log(s), with ${pl.filter(l => l.status === "MISSED").length} missed dose(s).`,
      });
      reports.push({
        id: `vitals-${patientId}`,
        patientId,
        patientName: patient.name,
        title: "Latest vital-sign summary",
        category: "vitals",
        generatedOn: latest ? latest.recordedAt.toLocaleDateString() : new Date().toLocaleDateString(),
        authoredBy: "HealthSync system",
        summary: latest ? `Latest reading: heart rate ${latest.heartRate ?? "not recorded"} bpm, blood pressure ${latest.systolic != null && latest.diastolic != null ? `${latest.systolic}/${latest.diastolic}` : "not recorded"}, glucose ${latest.glucose ?? "not recorded"}.` : "No vital readings have been recorded yet.",
      });
      reports.push({
        id: `care-${patientId}`,
        patientId,
        patientName: patient.name,
        title: "Care coordination summary",
        category: "consultation",
        generatedOn: new Date().toLocaleDateString(),
        authoredBy: "HealthSync system",
        summary: `${patient.name} has ${upcoming} upcoming appointment(s) and ${openAlerts} unresolved alert(s) in the current record.`,
      });
      const latestClinical = pc[0];
      if (latestClinical) reports.push({
        id: `clinical-${patientId}`,
        patientId,
        patientName: patient.name,
        title: "Clinical record summary",
        category: "clinical",
        generatedOn: latestClinical.clinicalDate.toLocaleDateString(),
        authoredBy: latestClinical.physician?.name || "Connected physician",
        summary: `Latest ${latestClinical.type.toLowerCase().replaceAll("_", " ")} record: ${latestClinical.title}. Status: ${latestClinical.status.toLowerCase().replaceAll("_", " ")}. Physician recommendation: ${latestClinical.recommendations}${latestClinical.followUpRequired ? ` Follow-up is recorded for ${latestClinical.followUpDate?.toLocaleDateString() || "a date to be confirmed"}.` : ""}`,
      });
    }
    res.json({ reports });
  } catch (error) {
    console.error("Reports error:", error);
    res.status(500).json({ message: "Unable to generate reports." });
  }
});

app.get("/api/emergencies", auth, async (req, res) => {
  try {
    const patientIds = req.user.role === "PATIENT"
      ? [Number(req.user.id)]
      : await getAssignedPatientIds(Number(req.user.id), req.user.role);
    if (!patientIds.length) return res.json({ emergencies: [] });
    const alerts = await prisma.alert.findMany({
      where: { userId: { in: patientIds }, type: "emergency" },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const users = await prisma.user.findMany({ where: { id: { in: patientIds } }, select: { id: true, name: true } });
    const names = new Map(users.map(u => [u.id, u.name]));
    res.json({ emergencies: alerts.map(a => ({ id: a.id, patientId: a.userId, patientName: names.get(a.userId) || "Patient", message: a.message, active: !a.read, createdAt: a.createdAt })) });
  } catch (error) {
    console.error("Emergency log error:", error);
    res.status(500).json({ message: "Unable to load emergency history." });
  }
});

// ---------------- AI Health Assistant ----------------
app.get("/api/ai/status", auth, async (_req, res) => {
  const model = await getOllamaModel();
  res.json({
    backend: true,
    ollama: Boolean(model),
    model,
    configuredModel: process.env.OLLAMA_MODEL || "llama3.2:3b",
    message: model ? `Ollama is connected (${model}).` : "Ollama is not running or no local model is installed. HealthSync will use its safe local fallback responses until Ollama is available.",
  });
});
app.get("/api/ai/context", auth, async (req, res) => {
  try {
    const patientIds = req.user.role === "PATIENT"
      ? [Number(req.user.id)]
      : await getAssignedPatientIds(Number(req.user.id), req.user.role);
    if (!patientIds.length) return res.json({ role: roleName(req.user.role), patients: [] });
    const patients = (await Promise.all(patientIds.slice(0, 20).map(getPatientBundle))).filter(Boolean);
    res.json({ role: roleName(req.user.role), patients });
  } catch (error) {
    console.error("AI context error:", error);
    res.status(500).json({ message: "Unable to load authorized AI context." });
  }
});

app.post("/api/ai/chat", auth, async (req, res) => {
  const question = String(req.body?.message || "").trim();
  if (!question) return res.status(400).json({ message: "Please enter a question." });
  let patientIds = [];
  if (req.user.role === "PATIENT") patientIds = [Number(req.user.id)];
  else patientIds = await getAssignedPatientIds(Number(req.user.id), req.user.role);
  if (!patientIds.length) return res.json({ answer: "No connected patient data is available yet. Connect a patient first." });

  const bundles = (await Promise.all(patientIds.slice(0, 10).map(getPatientBundle))).filter(Boolean);
  if (!bundles.length) return res.json({ answer: "No authorized HealthSync patient record is available yet." });

  const context = bundles.map(b => ({
    patient: b.patient,
    medications: b.medications.map(m => ({ name:m.name, dosage:m.dosage, schedule:m.schedule, stock:m.stock, recentLogs:m.logs?.slice(0,8) })),
    vitals:b.vitals.slice(0,10),
    appointments:b.appointments.slice(0,10),
    alerts:b.alerts.slice(0,10),
    adherenceRate:b.adherenceRate,
  }));
  const b = context[0];
  const lower = question.toLowerCase();

  // Record lookup questions are answered from the database first. This prevents
  // a local LLM from refusing to reveal data that the authenticated user is
  // explicitly authorized to view, and prevents hallucinated health records.
  const wantsMedication = /\b(medication|medications|medicine|medicines|drug|drugs|tablet|tablets|pill|pills)\b/.test(lower);
  const wantsVital = /\b(vital|vitals|heart rate|blood pressure|bp|glucose|sugar)\b/.test(lower);
  const wantsAppointment = /\b(appointment|appointments|doctor visit|visit)\b/.test(lower);
  const wantsAlert = /\b(alert|alerts|warning|warnings|care alert)\b/.test(lower);
  const wantsAdherence = /\b(adherence|missed dose|missed doses|dose history)\b/.test(lower);

  if (wantsMedication && !wantsVital && !wantsAppointment) {
    const meds = b.medications;
    const answer = meds.length
      ? `Here are the medication details recorded in HealthSync for ${b.patient.name}:\n\n${meds.map((m,i)=>`${i+1}. ${m.name} — ${m.dosage}\n   Schedule: ${m.schedule}\n   Stock: ${m.stock}`).join("\n\n")}\n\nThese details come directly from the authorized HealthSync record. Do not change a medicine or dose without the treating clinician's advice.`
      : `No medications are currently recorded in HealthSync for ${b.patient.name}.`;
    return res.json({ answer, ai: { provider: "HealthSync record + Ollama-ready", model: process.env.OLLAMA_MODEL || "llama3.2:3b", live: false, grounded: true } });
  }

  if (wantsVital && !wantsMedication && !wantsAppointment) {
    const vitals = b.vitals;
    const answer = vitals.length
      ? `Recent recorded vitals for ${b.patient.name}:\n\n${vitals.slice(0,5).map((v,i)=>`${i+1}. ${new Date(v.recordedAt).toLocaleString()} — HR ${v.heartRate ?? "—"} bpm, BP ${v.systolic ?? "—"}/${v.diastolic ?? "—"}, glucose ${v.glucose ?? "—"}`).join("\n")}\n\nThese are recorded values, not a diagnosis. A clinician should interpret abnormal or persistent readings.`
      : `No vital readings are currently recorded for ${b.patient.name}.`;
    return res.json({ answer, ai: { provider: "HealthSync record + Ollama-ready", model: process.env.OLLAMA_MODEL || "llama3.2:3b", live: false, grounded: true } });
  }

  if (wantsAppointment) {
    const answer = b.appointments.length
      ? `Upcoming and recorded appointments for ${b.patient.name}:\n\n${b.appointments.slice(0,5).map((a,i)=>`${i+1}. ${a.title} with ${a.doctor} — ${a.date} at ${a.time} (${a.status})`).join("\n")}`
      : `There are no appointments recorded for ${b.patient.name}.`;
    return res.json({ answer, ai: { provider: "HealthSync record + Ollama-ready", model: process.env.OLLAMA_MODEL || "llama3.2:3b", live: false, grounded: true } });
  }

  if (wantsAdherence) {
    return res.json({ answer: `${b.patient.name}'s recorded medication adherence is ${b.adherenceRate}%. Review individual medication logs for taken, missed, and pending doses.`, ai: { provider: "HealthSync record", model: process.env.OLLAMA_MODEL || "llama3.2:3b", live: false, grounded: true } });
  }

  if (wantsAlert) {
    const alerts = b.alerts.slice(0,8);
    const answer = alerts.length
      ? `Recent HealthSync alerts for ${b.patient.name}:\n\n${alerts.map((a,i)=>`${i+1}. [${a.severity}] ${a.message} — ${new Date(a.createdAt).toLocaleString()}`).join("\n")}`
      : `There are no recent alerts recorded for ${b.patient.name}.`;
    return res.json({ answer, ai: { provider: "HealthSync record", model: process.env.OLLAMA_MODEL || "llama3.2:3b", live: false, grounded: true } });
  }

  const system = `You are the HealthSync Health Assistant. You answer using ONLY the supplied authorized HealthSync data. Never say you cannot provide a patient's own record when that record is supplied. Never invent a medication, vital, appointment, alert, diagnosis, or measurement. For general health questions, give concise informational guidance. Do not diagnose, prescribe, or recommend prescription changes. If the user asks for a treatment decision, direct them to a qualified clinician. Current role: ${roleName(req.user.role)}.`;
  const prompt = `${system}\n\nAUTHORIZED DATA:\n${JSON.stringify(context)}\n\nUSER QUESTION:\n${question}`;
  const fallback = `I can answer questions about the authorized HealthSync record. Try asking about medications, vitals, appointments, adherence, or alerts.`;
  const aiResult = await runOllama(prompt, fallback);
  return res.json({ answer: aiResult.answer, ai: { provider: aiResult.live ? "Ollama" : "Local fallback", model: aiResult.model, live: aiResult.live, grounded: true } });
});


// ---------------- AI Clinical Support Tools ----------------
async function ollamaRequest(pathname, options = {}, timeoutMs = 45000) {
  const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${ollamaUrl}${pathname}`, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function getOllamaModel() {
  const configured = process.env.OLLAMA_MODEL || "llama3.2:3b";
  try {
    const response = await ollamaRequest("/api/tags", { method: "GET" }, 5000);
    if (!response.ok) return null;
    const data = await response.json();
    const models = Array.isArray(data.models) ? data.models : [];
    if (!models.length) return null;
    const exact = models.find(m => m.name === configured);
    if (exact) return exact.name;
    const family = configured.split(":")[0];
    const sameFamily = models.find(m => String(m.name || "").startsWith(`${family}:`));
    return sameFamily?.name || models[0]?.name || null;
  } catch (_) {
    return null;
  }
}

async function runOllama(prompt, fallback) {
  const model = await getOllamaModel();
  if (!model) return { answer: fallback, live: false, model: null };
  try {
    const response = await ollamaRequest("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt, stream: false, options: { temperature: 0.2 } }),
    }, 90000);
    if (response.ok) {
      const data = await response.json();
      if (String(data.response || "").trim()) return { answer: data.response.trim(), live: true, model };
    }
  } catch (_) {}
  return { answer: fallback, live: false, model };
}

async function getAuthorizedAIContext(req) {
  const patientIds = req.user.role === "PATIENT"
    ? [Number(req.user.id)]
    : await getAssignedPatientIds(Number(req.user.id), req.user.role);
  if (!patientIds.length) return null;
  const bundles = (await Promise.all(patientIds.slice(0, 10).map(getPatientBundle))).filter(Boolean);
  if (!bundles.length) return null;
  return bundles.map(b => ({
    patient: b.patient,
    medications: b.medications.map(m => ({ name: m.name, dosage: m.dosage, schedule: m.schedule, stock: m.stock, recentLogs: m.logs?.slice(0, 14) })),
    vitals: b.vitals.slice(0, 14),
    appointments: b.appointments.slice(0, 10),
    alerts: b.alerts.slice(0, 10),
    adherenceRate: b.adherenceRate,
  }));
}

app.post("/api/ai/insights", auth, async (req, res) => {
  try {
    const context = await getAuthorizedAIContext(req);
    if (!context) return res.json({ insights: [], message: "No authorized patient data is available yet." });
    const prompt = `You are an AI health-record analyst inside HealthSync. Analyze ONLY the supplied authorized data. Do not diagnose or prescribe. Return exactly 4 concise bullet insights: medication adherence, vital-sign trends, upcoming care/appointments, and one actionable follow-up. Flag possible concerns as "Review" rather than diagnosing.\nDATA:\n${JSON.stringify(context)}`;
    const fallback = context.map(b => `${b.patient.name}: adherence ${b.adherenceRate}%; ${b.medications.length} medication(s), ${b.vitals.length} recent vital record(s), ${b.appointments.length} appointment(s). Review missed doses and recent vitals with the care team.`).join("\n");
    const result = await runOllama(prompt, fallback);
    res.json({ insights: result.answer.split("\n").map(x => x.replace(/^[-*•]\s*/, "").trim()).filter(Boolean).slice(0, 8), ai: { provider: result.live ? "Ollama" : "Local fallback", model: result.model, live: result.live } });
  } catch (error) { console.error("AI insights error:", error); res.status(500).json({ message: "Unable to generate AI insights." }); }
});

app.post("/api/ai/medication-coach", auth, async (req, res) => {
  try {
    const context = await getAuthorizedAIContext(req);
    if (!context) return res.json({ answer: "No authorized medication data is available yet." });
    const prompt = `You are the HealthSync AI Medication Coach. The authenticated user is authorized to view the supplied HealthSync medication records. Use the exact medication names, doses, schedules, stock and logs from the data. Explain adherence patterns, missed/pending dose patterns, stock concerns, and practical reminder ideas. Never say you cannot provide the records when they are supplied. Never change doses, prescribe, or diagnose. Keep it under 180 words.\nDATA:\n${JSON.stringify(context)}`;
    const fallback = context.map(b => `${b.patient.name}: recorded adherence is ${b.adherenceRate}%. Review missed or pending doses and medication stock, and contact the clinician/pharmacist before changing any medication.`).join("\n");
    const result = await runOllama(prompt, fallback);
    res.json({ answer: result.answer, ai: { provider: result.live ? "Ollama" : "Local fallback", model: result.model, live: result.live } });
  } catch (error) { console.error("AI medication coach error:", error); res.status(500).json({ message: "Unable to generate medication guidance." }); }
});

app.post("/api/ai/vitals-analysis", auth, async (req, res) => {
  try {
    const context = await getAuthorizedAIContext(req);
    if (!context) return res.json({ answer: "No authorized vital data is available yet." });
    const prompt = `You are the HealthSync AI Vital Trend Analyst. Analyze only supplied recorded vitals. Identify changes or repeated unusual values without diagnosing. Mention which readings a clinician should review. Keep it under 180 words.\nDATA:\n${JSON.stringify(context.map(b => ({ patient: b.patient, vitals: b.vitals })))} `;
    const fallback = context.map(b => `${b.patient.name}: ${b.vitals.length ? `latest recorded vital at ${new Date(b.vitals[0].recordedAt).toLocaleString()}. Review repeated or unusual readings with a clinician.` : "No vital readings recorded."}`).join("\n");
    const result = await runOllama(prompt, fallback);
    res.json({ answer: result.answer, ai: { provider: result.live ? "Ollama" : "Local fallback", model: result.model, live: result.live } });
  } catch (error) { console.error("AI vitals error:", error); res.status(500).json({ message: "Unable to analyze vitals." }); }
});

app.post("/api/ai/symptom-analysis", auth, async (req, res) => {
  try {
    const symptoms = String(req.body?.symptoms || "").trim();
    if (!symptoms) return res.status(400).json({ message: "Enter symptoms first." });
    const prompt = `You are a cautious HealthSync symptom-support assistant. The user reports: ${symptoms}. Do not diagnose. Give: (1) possible general categories only if useful, (2) red-flag signs requiring urgent/emergency care, (3) what information to record, and (4) when to contact a clinician. Do not recommend prescription changes. Keep it under 220 words. Treat this as informational support, not medical diagnosis.`;
    const fallback = "I can help organize the symptoms, but I cannot diagnose them. Record when they started, severity, triggers, related symptoms and medicines. Seek urgent medical care for severe breathing difficulty, chest pain, fainting, severe bleeding, new confusion, or rapidly worsening symptoms.";
    const result = await runOllama(prompt, fallback);
    res.json({ answer: result.answer, ai: { provider: result.live ? "Ollama" : "Local fallback", model: result.model, live: result.live } });
  } catch (error) { console.error("AI symptom error:", error); res.status(500).json({ message: "Unable to analyze symptoms." }); }
});

// ---------------- Patient data ----------------
// All patient data is scoped to the authenticated user. Nothing here is hardcoded.
app.get("/api/medications", auth, async (req, res) => {
  try {
    const medications = await prisma.medication.findMany({
      where: { userId: Number(req.user.id) },
      include: { logs: { orderBy: { scheduledAt: "desc" }, take: 10 } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ medications });
  } catch (error) {
    console.error("Get medications error:", error);
    res.status(500).json({ message: "Unable to load medications." });
  }
});

app.post("/api/medications", auth, async (req, res) => {
  try {
    const { name, dosage, schedule, stock } = req.body || {};
    const cleanName = String(name || "").trim();
    const cleanDosage = String(dosage || "").trim();
    const cleanSchedule = String(schedule || "").trim();
    const cleanStock = Number(stock ?? 0);

    if (!cleanName || !cleanDosage || !cleanSchedule) {
      return res.status(400).json({ message: "Medicine name, dosage and schedule are required." });
    }
    if (!Number.isInteger(cleanStock) || cleanStock < 0) {
      return res.status(400).json({ message: "Stock must be a whole number of 0 or more." });
    }

    const medication = await prisma.medication.create({
      data: {
        userId: Number(req.user.id),
        name: cleanName,
        dosage: cleanDosage,
        schedule: cleanSchedule,
        stock: cleanStock,
      },
    });
    res.status(201).json({ medication });
  } catch (error) {
    console.error("Create medication error:", error);
    res.status(500).json({ message: "Unable to save medication." });
  }
});

app.post("/api/medications/:id/take", auth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const medication = await prisma.medication.findFirst({ where: { id, userId: Number(req.user.id) } });
    if (!medication) return res.status(404).json({ message: "Medication not found." });
    const now = new Date();
    const log = await prisma.medicationLog.create({ data: { medicationId: medication.id, userId: medication.userId, status: "TAKEN", scheduledAt: now, takenAt: now } });
    let updatedMedication = medication;
    if (medication.stock > 0) updatedMedication = await prisma.medication.update({ where: { id: medication.id }, data: { stock: { decrement: 1 } } });
    const connections = await prisma.careConnection.findMany({ where: { patientId: Number(req.user.id) }, select: { caregiverId: true, physicianId: true } });
    const recipients = [...new Set(connections.flatMap(c => [c.caregiverId, c.physicianId]).filter(Boolean))];
    for (const recipient of recipients) emitToUser(recipient, "medication:updated", { patientId: Number(req.user.id), medicationId: medication.id, log, medication: updatedMedication });
    res.json({ log, medicationId: medication.id, medication: updatedMedication });
  } catch (error) { console.error("Take medication error:", error); res.status(500).json({ message: "Unable to record the dose." }); }
});

app.delete("/api/medications/:id", auth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const medication = await prisma.medication.findFirst({
      where: { id, userId: Number(req.user.id) },
    });
    if (!medication) return res.status(404).json({ message: "Medication not found." });

    await prisma.medication.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error("Delete medication error:", error);
    res.status(500).json({ message: "Unable to delete medication." });
  }
});

app.get("/api/alerts", auth, async (req, res) => {
  try {
    const patientIds = req.user.role === "PATIENT"
      ? [Number(req.user.id)]
      : await getAssignedPatientIds(Number(req.user.id), req.user.role);
    const alerts = await prisma.alert.findMany({ where: { userId: { in: patientIds } }, orderBy: { createdAt: "desc" }, take: 100 });
    res.json({ alerts });
  } catch (error) { console.error("Get alerts error:", error); res.status(500).json({ message: "Unable to load alerts." }); }
});

app.patch("/api/alerts/:id/acknowledge", auth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.alert.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Alert not found." });
    let allowed = existing.userId === Number(req.user.id);
    if (!allowed && ["CAREGIVER", "PHYSICIAN"].includes(req.user.role)) allowed = await requireAssigned(req, res, existing.userId);
    if (!allowed) return res.status(403).json({ message: "You do not have access to this alert." });
    const alert = await prisma.alert.update({ where: { id }, data: { read: true } });
    emitToUser(existing.userId, "alert:updated", alert);
    res.json({ alert });
  } catch (error) { console.error("Acknowledge alert error:", error); res.status(500).json({ message: "Unable to acknowledge alert." }); }
});

app.post("/api/care-network/connect", auth, async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!email) return res.status(400).json({ message: "Enter the account email to connect." });
  const target = await prisma.user.findUnique({ where: { email } });
  if (!target) return res.status(404).json({ message: "No HealthSync account found for that email." });
  let patientId, caregiverId = null, physicianId = null;
  if (req.user.role === "PATIENT") {
    patientId = Number(req.user.id);
    if (target.role === "CAREGIVER") caregiverId = target.id;
    else if (target.role === "PHYSICIAN") physicianId = target.id;
    else return res.status(400).json({ message: "Patients can connect only a caregiver or physician." });
  } else if (req.user.role === "CAREGIVER") {
    if (target.role !== "PATIENT") return res.status(400).json({ message: "Caregivers can connect only a patient." });
    patientId = target.id; caregiverId = Number(req.user.id);
  } else if (req.user.role === "PHYSICIAN") {
    if (target.role !== "PATIENT") return res.status(400).json({ message: "Physicians can connect only a patient." });
    patientId = target.id; physicianId = Number(req.user.id);
  } else return res.status(403).json({ message: "Invalid role." });
  const existing = await prisma.careConnection.findFirst({ where: { patientId, caregiverId, physicianId } });
  if (existing) return res.json({ connection: existing, message: "Connection already exists." });
  const connection = await prisma.careConnection.create({ data: { patientId, caregiverId, physicianId } });
  const roleLabel = roleName(req.user.role);
  const connectionAlert = await prisma.alert.create({
    data: {
      userId: patientId,
      type: "care_connection",
      message: `${req.user.name} connected as ${roleLabel} to the patient care team.`,
      severity: "INFO",
    },
  });
  emitToUser(patientId, "care:updated", connection);
  emitToUser(patientId, "alert:created", connectionAlert);
  if (target.id !== Number(req.user.id)) emitToUser(target.id, "care:updated", connection);
  res.status(201).json({ connection, message: "Connection created successfully. The care team can now share authorized updates." });
});

app.get("/api/care-network", auth, async (req, res) => {
  try {
    let patientIds = [];
    if (req.user.role === "PATIENT") {
      patientIds = [Number(req.user.id)];
    } else {
      patientIds = await getAssignedPatientIds(Number(req.user.id), req.user.role);
    }

    if (!patientIds.length) return res.json({ connections: [] });

    // Return the COMPLETE care team for every patient this user is allowed to see.
    // This intentionally merges the separate caregiver/physician connection rows
    // so the three-way care relationship is visible to every authorized role.
    const rows = await prisma.careConnection.findMany({
      where: { patientId: { in: patientIds } },
      include: { patient: true, caregiver: true, physician: true },
      orderBy: { id: "asc" },
    });

    const grouped = new Map();
    for (const row of rows) {
      const key = row.patientId;
      if (!grouped.has(key)) {
        grouped.set(key, { patient: row.patient ? publicUser(row.patient) : null, caregiver: null, physician: null });
      }
      const item = grouped.get(key);
      if (row.caregiver) item.caregiver = publicUser(row.caregiver);
      if (row.physician) item.physician = publicUser(row.physician);
    }

    res.json({ connections: [...grouped.values()] });
  } catch (error) {
    console.error("Get care network error:", error);
    res.status(500).json({ message: "Unable to load care network." });
  }
});

app.get("/api/vitals", auth, async (req, res) => {
  try {
    const vitals = await prisma.vital.findMany({
      where: { userId: Number(req.user.id) },
      orderBy: { recordedAt: "desc" },
      take: 20,
    });
    res.json({ vitals });
  } catch (error) {
    console.error("Get vitals error:", error);
    res.status(500).json({ message: "Unable to load vitals." });
  }
});

app.post("/api/vitals", auth, async (req, res) => {
  try {
    const { heartRate, systolic, diastolic, glucose } = req.body || {};
    const values = {
      heartRate: heartRate === "" || heartRate == null ? null : Number(heartRate),
      systolic: systolic === "" || systolic == null ? null : Number(systolic),
      diastolic: diastolic === "" || diastolic == null ? null : Number(diastolic),
      glucose: glucose === "" || glucose == null ? null : Number(glucose),
    };

    if (Object.values(values).every((value) => value == null)) {
      return res.status(400).json({ message: "Enter at least one vital reading." });
    }
    if (Object.values(values).some((value) => value != null && !Number.isFinite(value))) {
      return res.status(400).json({ message: "Vital readings must be valid numbers." });
    }

    const vital = await prisma.vital.create({
      data: { userId: Number(req.user.id), ...values },
    });
    res.status(201).json({ vital });
  } catch (error) {
    console.error("Create vital error:", error);
    res.status(500).json({ message: "Unable to save vital reading." });
  }
});


app.post("/api/appointments/optimize", auth, async (req, res) => {
  if (req.user.role !== "PATIENT") return res.status(403).json({ message: "Patient access required." });
  const physicianId = Number(req.body?.physicianId), date = String(req.body?.date || "");
  const result = await slotResult(physicianId, date);
  if (result.error) return res.status(400).json({ message: result.error });
  res.json({ engine: "database-availability", suggestions: result.slots.map(time => ({ date, time, physicianId, doctor: result.physician.name })), criteria: { physicianId, date } });
});

app.get("/api/physicians", auth, async (req, res) => {
  if (req.user.role !== "PATIENT") return res.status(403).json({ message: "Patient access required." });
  const physicians = await prisma.user.findMany({ where: { role: "PHYSICIAN" }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  res.json({ physicians });
});

app.get("/api/physicians/:id/slots", auth, async (req, res) => {
  if (req.user.role !== "PATIENT") return res.status(403).json({ message: "Patient access required." });
  const result = await slotResult(Number(req.params.id), String(req.query.date || ""));
  if (result.error) return res.status(400).json({ message: result.error });
  res.json(result);
});

app.get("/api/physician/availability", auth, async (req, res) => {
  if (req.user.role !== "PHYSICIAN") return res.status(403).json({ message: "Physician access required." });
  const availability = await prisma.physicianAvailability.findMany({ where: { physicianId: Number(req.user.id) }, orderBy: { dayOfWeek: "asc" } });
  res.json({ availability });
});

app.put("/api/physician/availability", auth, async (req, res) => {
  if (req.user.role !== "PHYSICIAN") return res.status(403).json({ message: "Physician access required." });
  const rows = Array.isArray(req.body?.availability) ? req.body.availability : [];
  const clean = rows.map(row => ({ dayOfWeek: Number(row.dayOfWeek), startTime: String(row.startTime || ""), endTime: String(row.endTime || ""), slotDuration: Number(row.slotDuration || 30) }));
  if (clean.some(row => row.dayOfWeek < 0 || row.dayOfWeek > 6 || !validTime(row.startTime) || !validTime(row.endTime) || toMinutes(row.startTime) >= toMinutes(row.endTime) || ![15, 30, 45, 60].includes(row.slotDuration))) return res.status(400).json({ message: "Availability contains an invalid day, time range or slot duration." });
  const physicianId = Number(req.user.id);
  await prisma.$transaction(async tx => { await tx.physicianAvailability.deleteMany({ where: { physicianId } }); if (clean.length) await tx.physicianAvailability.createMany({ data: clean.map(row => ({ ...row, physicianId })) }); });
  const availability = await prisma.physicianAvailability.findMany({ where: { physicianId }, orderBy: { dayOfWeek: "asc" } });
  res.json({ availability });
});

app.get("/api/physician/unavailable-periods", auth, async (req, res) => {
  if (req.user.role !== "PHYSICIAN") return res.status(403).json({ message: "Physician access required." });
  const periods = await prisma.physicianUnavailablePeriod.findMany({ where: { physicianId: Number(req.user.id) }, orderBy: { startDate: "asc" } });
  res.json({ periods });
});

app.post("/api/physician/unavailable-periods", auth, async (req, res) => {
  if (req.user.role !== "PHYSICIAN") return res.status(403).json({ message: "Physician access required." });
  const startDate = String(req.body?.startDate || ""), endDate = String(req.body?.endDate || ""), reason = String(req.body?.reason || "").trim();
  if (!validDate(startDate) || !validDate(endDate) || endDate < startDate) return res.status(400).json({ message: "A valid unavailable date range is required." });
  const period = await prisma.physicianUnavailablePeriod.create({ data: { physicianId: Number(req.user.id), startDate, endDate, reason: reason || null } });
  res.status(201).json({ period });
});

app.delete("/api/physician/unavailable-periods/:id", auth, async (req, res) => {
  if (req.user.role !== "PHYSICIAN") return res.status(403).json({ message: "Physician access required." });
  const deleted = await prisma.physicianUnavailablePeriod.deleteMany({ where: { id: Number(req.params.id), physicianId: Number(req.user.id) } });
  if (!deleted.count) return res.status(404).json({ message: "Unavailable period not found." });
  res.json({ success: true });
});

app.get("/api/appointments", auth, async (req, res) => {
  try {
    let where;
    if (req.user.role === "PATIENT") where = { userId: Number(req.user.id) };
    else if (req.user.role === "PHYSICIAN") where = { physicianId: Number(req.user.id) };
    else where = { userId: { in: await getAssignedPatientIds(Number(req.user.id), "CAREGIVER") } };
    const appointments = await prisma.appointment.findMany({ where, include: { user: { select: { id: true, name: true } }, physician: { select: { id: true, name: true } } }, orderBy: [{ date: "asc" }, { time: "asc" }] });
    res.json({ appointments: appointments.map(appointmentView) });
  } catch (error) { console.error("Get appointments error:", error); res.status(500).json({ message: "Unable to load appointments." }); }
});

app.post("/api/appointments", auth, async (req, res) => {
  if (req.user.role !== "PATIENT") return res.status(403).json({ message: "Only patients can request appointments." });
  try {
    const physicianId = Number(req.body?.physicianId), date = String(req.body?.date || ""), time = String(req.body?.time || ""), reason = String(req.body?.reason || "").trim();
    if (!physicianId || !validDate(date) || !validTime(time) || !reason) return res.status(400).json({ message: "Physician, date, available time and reason are required." });
    const result = await slotResult(physicianId, date);
    if (result.error) return res.status(400).json({ message: result.error });
    if (!result.slots.includes(time)) return res.status(409).json({ message: "This time slot is no longer available. Please choose another." });
    const appointment = await prisma.appointment.create({ data: { userId: Number(req.user.id), physicianId, title: reason, reason, doctor: result.physician.name, date, time, scheduledAt: schedulingInstant(date, time), durationMinutes: result.availability.slotDuration, status: "REQUESTED", activeSlotKey: activeSlotKey(physicianId, date, time) }, include: { user: { select: { id: true, name: true } }, physician: { select: { id: true, name: true } } } });
    emitToUser(Number(req.user.id), "appointment:created", appointment);
    emitToUser(physicianId, "appointment:created", appointment);
    res.status(201).json({ appointment: appointmentView(appointment) });
  } catch (error) {
    if (error?.code === "P2002") return res.status(409).json({ message: "This time slot is no longer available. Please choose another." });
    console.error("Create appointment error:", error); res.status(500).json({ message: "Unable to request appointment." });
  }
});

app.patch("/api/appointments/:id/status", auth, async (req, res) => {
  if (req.user.role !== "PHYSICIAN") return res.status(403).json({ message: "Physician access required." });
  const existing = await prisma.appointment.findUnique({ where: { id: Number(req.params.id) } });
  if (!existing) return res.status(404).json({ message: "Appointment not found." });
  if (existing.physicianId !== Number(req.user.id)) return res.status(403).json({ message: "This appointment is not assigned to you." });
  const status = String(req.body?.status || "").toUpperCase();
  if (!(APPOINTMENT_TRANSITIONS[existing.status] || []).includes(status)) return res.status(409).json({ message: `Appointment cannot move from ${existing.status} to ${status}.` });
  const appointment = await prisma.appointment.update({ where: { id: existing.id }, data: { status, ...(["COMPLETED", "REJECTED", "CANCELLED"].includes(status) ? { activeSlotKey: null } : {}) } });
  const alert = await prisma.alert.create({ data: { userId: existing.userId, type: "appointment", message: `Appointment ${status.toLowerCase()} by ${req.user.name}.`, severity: "INFO" } });
  emitToUser(existing.userId, "appointment:updated", appointment); emitToUser(existing.userId, "alert:created", alert);
  res.json({ appointment });
});

app.patch("/api/appointments/:id/cancel", auth, async (req, res) => {
  if (req.user.role !== "PATIENT") return res.status(403).json({ message: "Only the patient can cancel this appointment." });
  const existing = await prisma.appointment.findUnique({ where: { id: Number(req.params.id) } });
  if (!existing) return res.status(404).json({ message: "Appointment not found." });
  if (existing.userId !== Number(req.user.id)) return res.status(403).json({ message: "You do not have access to this appointment." });
  if (!APPOINTMENT_ACTIVE.includes(existing.status)) return res.status(409).json({ message: `A ${existing.status.toLowerCase()} appointment cannot be cancelled.` });
  const appointment = await prisma.appointment.update({ where: { id: existing.id }, data: { status: "CANCELLED", activeSlotKey: null } });
  emitToUser(existing.userId, "appointment:updated", appointment); if (existing.physicianId) emitToUser(existing.physicianId, "appointment:updated", appointment);
  res.json({ appointment });
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("Authentication required"));
  try {
    socket.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  socket.emit("connected", { message: "HealthSync real-time connection established" });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: "Unexpected server error" });
});

httpServer.listen(PORT, () => {
  console.log(`HealthSync backend running on http://localhost:${PORT}`);
});
