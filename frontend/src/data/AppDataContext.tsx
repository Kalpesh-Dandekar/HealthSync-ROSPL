import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";

import type {
  AlertItem,
  Appointment,
  HandoffNote,
  Medicine,
  Patient,
  VitalReading,
  ReportSummary,
} from "../types";

import {
  assessPatientRisk,
  type RiskResult,
} from "../ml/riskModel";

import {
  acknowledgeAlert as apiAcknowledgeAlert,
  cancelAppointment as apiCancelAppointment,
  connectRealtime,
  createAppointment,
  createHandoffNote,
  setSos,
  takeDose,
} from "../api/healthsyncApi";

import { roleDataApi } from "../api/roleData";

import {
  patientDataApi,
  type AlertRecord,
  type MedicationRecord,
} from "../api/patientData";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface AppDataContextValue {
  medicines: Medicine[];
  alerts: AlertItem[];
  handoffNotes: HandoffNote[];
  vitals: VitalReading[];
  patient: Patient;
  appointments: Appointment[];
  reports: ReportSummary[];
  adherenceRate: number;
  sosActive: boolean;

  riskAssessment: {
    overall: RiskResult;
    perMedicine: {
      medicine: Medicine;
      risk: RiskResult;
    }[];
  };

  logDose: (medicineId: string, doseId: string) => void;
  acknowledgeAlert: (alertId: string) => void;
  addHandoffNote: (
    note: Omit<HandoffNote, "id" | "timestamp">
  ) => void;
  toggleSos: () => void;
  cancelAppointment: (id: string) => void;
  bookAppointment: (
    appt: Omit<Appointment, "id" | "status"> & { patientId?: number }
  ) => void;
}

const AppDataContext =
  createContext<AppDataContextValue | null>(null);


/* =========================================================
   DATABASE -> FRONTEND MAPPERS
   ========================================================= */

function toMedicine(r: MedicationRecord): Medicine {
  const log = r.logs?.[0];

  const status = log
    ? log.status === "TAKEN"
      ? "taken"
      : log.status === "MISSED"
        ? "missed"
        : "pending"
    : "scheduled";

  return {
    id: String(r.id),
    name: r.name,
    dosage: r.dosage,
    frequency: r.schedule,
    compartment: r.schedule,
    stock: r.stock,
    lowStockThreshold: 6,

    doses: [
      {
        id: log
          ? `log-${log.id}`
          : `med-${r.id}-dose`,

        time: log
          ? new Date(log.scheduledAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : r.schedule,

        status,

        takenAt: log?.takenAt
          ? new Date(log.takenAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : undefined,
      },
    ],
  };
}


function toAlert(r: AlertRecord): AlertItem {
  return {
    id: String(r.id),

    type: r.type as AlertItem["type"],

    severity:
      r.severity === "HIGH"
        ? "critical"
        : r.severity === "WARNING"
          ? "warning"
          : "info",

    message: r.message,

    timestamp: new Date(r.createdAt).toLocaleString(),

    acknowledged: r.read,
  };
}


function toAppointment(r: {
  id: number;
  title: string;
  doctor: string;
  date: string;
  time: string;
  status: string;
  patientName?: string;
}): Appointment {
  const status = r.status.toLowerCase();

  return {
    id: String(r.id),
    withName: r.doctor,
    reason: r.title,
    patientName: r.patientName,
    date: r.date,
    time: r.time,
    mode: "in_person",

    status:
      status === "cancelled"
        ? "cancelled"
        : status === "completed"
          ? "completed"
          : "upcoming",
  };
}


/* =========================================================
   EMPTY PATIENT
   ========================================================= */

function emptyPatient(
  user?: {
    id: number;
    name: string;
  }
): Patient {
  return {
    id: user ? String(user.id) : "",
    name: user?.name || "",
    age: 0,
    patientCode: user ? `#${user.id}` : "",
    primaryCaregiver: "Not connected",
    physician: "Not connected",
    allergies: [],
    diagnoses: [],
    adherenceRate: 0,
  };
}


/* =========================================================
   PROVIDER
   ========================================================= */

export function AppDataProvider({
  children,
}: {
  children: ReactNode;
}) {
  const location = useLocation();

  const role =
    location.pathname.startsWith("/patient")
      ? "patient"
      : location.pathname.startsWith("/caregiver")
        ? "caregiver"
        : location.pathname.startsWith("/doctor")
          ? "doctor"
          : "none";


  /* =======================================================
     STATE
     ======================================================= */

  const [medicines, setMedicines] = useState<Medicine[]>([]);

  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  const [handoffNotes, setHandoffNotes] = useState<HandoffNote[]>([]);

  const [sosActive, setSosActive] = useState(false);

  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [vitals, setVitals] = useState<VitalReading[]>([]);

  const [patient, setPatient] =
    useState<Patient>(emptyPatient());

  const [reports, setReports] = useState<ReportSummary[]>([]);

  const [backendOnline, setBackendOnline] =
    useState(false);


  /* =======================================================
     LOAD LOGGED-IN PATIENT FROM DATABASE
     ======================================================= */

  const loadLivePatient = useCallback(async () => {
    const token =
      localStorage.getItem("healthsync_token");

    if (!token) {
      throw new Error("Not logged in");
    }

    const [
      me,
      medicationsData,
      vitalsData,
      appointmentsData,
      alertsData,
      careNetworkData,
    ] = await Promise.all([
      fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).then(async (response) => {
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Unable to load account"
          );
        }

        return data;
      }),

      patientDataApi.getMedications(),
      patientDataApi.getVitals(),
      patientDataApi.getAppointments(),
      patientDataApi.getAlerts(),
      patientDataApi.getCareNetwork(),
    ]);


    const user = me.user;

    const medicinesFromDatabase =
      medicationsData.medications.map(toMedicine);

    const connection =
      careNetworkData.connections?.[0];

    const currentPatient = emptyPatient(user);

    currentPatient.primaryCaregiver =
      connection?.caregiver?.name ||
      "Not connected";

    currentPatient.physician =
      connection?.physician?.name ||
      "Not connected";


    setMedicines(medicinesFromDatabase);


    setVitals(
      vitalsData.vitals.map((v) => ({
        time: new Date(
          v.recordedAt
        ).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),

        heartRate: v.heartRate ?? 0,
        bpSys: v.systolic ?? 0,
        bpDia: v.diastolic ?? 0,
        glucose: v.glucose ?? 0,
      }))
    );


    setAppointments(
      appointmentsData.appointments.map(toAppointment)
    );


    setAlerts(
      alertsData.alerts.map(toAlert)
    );
    setSosActive(alertsData.alerts.some((a:any) => a.type === "emergency" && !a.read));


    setPatient(currentPatient);

    setReports([]);

    setBackendOnline(true);


    localStorage.setItem(
      "healthsync_user",
      JSON.stringify(user)
    );
  }, []);


  /* =======================================================
     LOAD CAREGIVER / DOCTOR WORKSPACE FROM DATABASE
     ======================================================= */
  const loadRoleWorkspace = useCallback(async () => {
    if (role !== "caregiver" && role !== "doctor") return;
    const apiRole = role as "caregiver" | "doctor";
    setBackendOnline(false);
    setMedicines([]); setVitals([]); setAppointments([]); setAlerts([]); setHandoffNotes([]); setPatient(emptyPatient());
    const pathId = location.pathname.match(/\/patients\/(\d+)/)?.[1];
    const bundle = pathId
      ? await roleDataApi.getPatient(apiRole, pathId)
      : (await roleDataApi.getPatients(apiRole)).patients[0];
    if (!bundle) { setBackendOnline(true); return; }
    const p = bundle.patient;
    setPatient({ id:String(p.id), name:p.name, age:p.age || 0, patientCode:p.patientCode || `#${p.id}`, primaryCaregiver:p.primaryCaregiver || "Not connected", physician:p.physician || "Not connected", allergies:p.allergies || [], diagnoses:p.diagnoses || [], adherenceRate:bundle.adherenceRate || 0 });
    setMedicines(bundle.medications.map(toMedicine));
    setVitals(bundle.vitals.map((v:any)=>({ time:new Date(v.recordedAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}), heartRate:v.heartRate ?? 0, bpSys:v.systolic ?? 0, bpDia:v.diastolic ?? 0, glucose:v.glucose ?? 0 })));
    setAlerts(bundle.alerts.map(toAlert));
    setSosActive(bundle.alerts.some((a:any) => a.type === "emergency" && !a.read));
    const roleAppointments = await roleDataApi.getAppointments();
    setAppointments(roleAppointments.appointments.map(toAppointment));
    try { const notes=await roleDataApi.getNotes(pathId); setHandoffNotes(notes.notes); } catch { setHandoffNotes([]); }
    setBackendOnline(true);
  }, [role, location.pathname]);

  /* =======================================================
     INITIAL PATIENT LOAD
     ======================================================= */

  useEffect(() => {
    if (role !== "caregiver" && role !== "doctor") return;
    loadRoleWorkspace().catch(error => { console.error("Role workspace load error:", error); setBackendOnline(false); });
  }, [role, location.pathname, loadRoleWorkspace]);

  useEffect(() => {
    if (role !== "patient") {
      return;
    }

    let cancelled = false;

    // A login can replace the token while the provider stays mounted.
    // Reload whenever the patient route is entered so the new account
    // cannot inherit the previous patient's in-memory data.
    setBackendOnline(false);
    setPatient(emptyPatient());
    setMedicines([]);
    setVitals([]);
    setAppointments([]);
    setAlerts([]);

    loadLivePatient().catch((error) => {
      console.error(
        "Patient data load error:",
        error
      );

      if (!cancelled) {
        setBackendOnline(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [role, location.pathname, loadLivePatient]);


  /* =======================================================
     REALTIME PATIENT UPDATES

     IMPORTANT:
     There is ONLY ONE realtime effect here.
     ======================================================= */

  useEffect(() => {
    if (!backendOnline || role === "none") return;
    const disconnect = connectRealtime((event, payload) => {
      if (event === "sos:updated" && payload?.active) setSosActive(true);
      if (role === "patient") loadLivePatient().catch(() => undefined);
      else loadRoleWorkspace().catch(() => undefined);
    });
    return () => { disconnect(); };
  }, [role, backendOnline, loadLivePatient, loadRoleWorkspace]);


  /* =======================================================
     LOG DOSE
     ======================================================= */

  const logDose = useCallback(
    async (
      medicineId: string,
      doseId: string
    ) => {
      if (role === "patient") {
        try {
          await patientDataApi.takeMedication(
            Number(medicineId)
          );

          await loadLivePatient();
        } catch (error) {
          console.error(
            "Dose error:",
            error
          );
        }

        return;
      }

      try {
        await takeDose(doseId);
      } catch {
        setMedicines((previous) =>
          previous.map((medicine) =>
            medicine.id === medicineId
              ? {
                  ...medicine,

                  stock: Math.max(
                    0,
                    medicine.stock - 1
                  ),

                  doses: medicine.doses.map(
                    (dose) =>
                      dose.id === doseId
                        ? {
                            ...dose,
                            status: "taken",
                            takenAt:
                              new Date().toLocaleTimeString(
                                [],
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              ),
                          }
                        : dose
                  ),
                }
              : medicine
          )
        );
      }
    },
    [role, loadLivePatient]
  );


  /* =======================================================
     ACKNOWLEDGE ALERT
     ======================================================= */

  const acknowledgeAlert = useCallback(
    async (id: string) => {
      if (role === "patient") {
        try {
          await patientDataApi.acknowledgeAlert(
            Number(id)
          );

          await loadLivePatient();
        } catch (error) {
          console.error(error);
        }

        return;
      }

      try {
        await apiAcknowledgeAlert(id);
      } catch {
        setAlerts((previous) =>
          previous.map((alert) =>
            alert.id === id
              ? {
                  ...alert,
                  acknowledged: true,
                }
              : alert
          )
        );
      }
    },
    [role, loadLivePatient]
  );


  /* =======================================================
     HANDOFF NOTE
     ======================================================= */

  const addHandoffNote = useCallback(
    async (
      note: Omit<
        HandoffNote,
        "id" | "timestamp"
      >
    ) => {
      if (role === "patient") {
        try { const created = await roleDataApi.addNote(note.note); setHandoffNotes(previous => [created, ...previous]); await loadLivePatient(); } catch { /* patient can continue using local UI */ }
        return;
      }

      try {
        const created = await roleDataApi.addNote(note.note);
        setHandoffNotes((previous) => [created, ...previous]);
      } catch {
        setHandoffNotes((previous) => [
          {
            ...note,
            id: `h-${Date.now()}`,
            timestamp: "Just now",
          },
          ...previous,
        ]);
      }
    },
    [role]
  );


  /* =======================================================
     SOS
     ======================================================= */

  const toggleSos = useCallback(
    async () => {
      const next = !sosActive;

      if (role === "patient") {
        try { await roleDataApi.sendSos(next); } catch { /* keep local state for offline UI */ }
        setSosActive(next);
        return;
      }

      setSosActive(next);
      try { await setSos(next); } catch {
        setSosActive(next);
      }
    },
    [sosActive, role]
  );


  /* =======================================================
     CANCEL APPOINTMENT
     ======================================================= */

  const cancelAppointment = useCallback(
    async (id: string) => {
      if (role === "patient") {
        try {
          await patientDataApi.cancelAppointment(
            Number(id)
          );

          await loadLivePatient();
        } catch (error) {
          console.error(error);
        }

        return;
      }

      try {
        await apiCancelAppointment(id);
        await loadRoleWorkspace();
      } catch {
        setAppointments((previous) =>
          previous.map((appointment) =>
            appointment.id === id
              ? {
                  ...appointment,
                  status: "cancelled",
                }
              : appointment
          )
        );
      }
    },
    [role, loadLivePatient]
  );


  /* =======================================================
     BOOK APPOINTMENT
     ======================================================= */

  const bookAppointment = useCallback(
    async (
      appointment: Omit<
        Appointment,
        "id" | "status"
      > & { patientId?: number }
    ) => {
      if (role === "patient") {
        try {
          await patientDataApi.addAppointment({
            title: appointment.reason,
            doctor: appointment.withName,
            date: appointment.date,
            time: appointment.time,
          });

          await loadLivePatient();
        } catch (error) {
          console.error(error);
        }

        return;
      }

      try {
        const created =
          await createAppointment(
            appointment
          );

        setAppointments((previous) => [
          created,
          ...previous,
        ]);
      } catch {
        setAppointments((previous) => [
          {
            ...appointment,
            id: `ap-${Date.now()}`,
            status: "upcoming",
          },
          ...previous,
        ]);
      }
    },
    [role, loadLivePatient]
  );


  /* =======================================================
     ADHERENCE
     ======================================================= */

  const adherenceRate = useMemo(() => {
    if (role !== "patient") {
      const doses = medicines.flatMap(
        (medicine) => medicine.doses
      );

      return doses.length
        ? Math.round(
            (doses.filter(
              (dose) =>
                dose.status === "taken"
            ).length /
              doses.length) *
              100
          )
        : 0;
    }

    return medicines.length
      ? Math.round(
          (medicines.filter(
            (medicine) =>
              medicine.doses[0]?.status ===
              "taken"
          ).length /
            medicines.length) *
            100
        )
      : 0;
  }, [medicines, role]);


  /* =======================================================
     UPDATE PATIENT ADHERENCE
     ======================================================= */

  useEffect(() => {
    setPatient((previous) => ({
      ...previous,
      adherenceRate,
    }));
  }, [adherenceRate]);


  /* =======================================================
     RISK ASSESSMENT
     ======================================================= */

  const riskAssessment = useMemo(
    () => assessPatientRisk(medicines),
    [medicines]
  );


  /* =======================================================
     CONTEXT
     ======================================================= */

  return (
    <AppDataContext.Provider
      value={{
        medicines,
        alerts,
        handoffNotes,
        vitals,
        patient,
        appointments,
        reports,
        adherenceRate,
        sosActive,
        riskAssessment,

        logDose,
        acknowledgeAlert,
        addHandoffNote,
        toggleSos,
        cancelAppointment,
        bookAppointment,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}


/* =========================================================
   HOOK
   ========================================================= */

export function useAppData() {
  const context =
    useContext(AppDataContext);

  if (!context) {
    throw new Error(
      "useAppData must be used within AppDataProvider"
    );
  }

  return context;
}