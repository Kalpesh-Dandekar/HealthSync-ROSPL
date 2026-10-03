import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppDataProvider } from "./data/AppDataContext";

import { RoleSelect } from "./pages/RoleSelect";
import { AuthPage } from "./pages/AuthPage";

import { PatientLayout } from "./pages/patient/PatientLayout";
import { PatientDashboard } from "./pages/patient/PatientDashboard";
import { PatientVitals } from "./pages/patient/PatientVitals";
import { PatientRecords } from "./pages/patient/PatientRecords";
import { PatientAddData } from "./pages/patient/PatientAddData";

import { CaregiverLayout } from "./pages/caregiver/CaregiverLayout";
import { CaregiverDashboard } from "./pages/caregiver/CaregiverDashboard";
import { CaregiverAlerts } from "./pages/caregiver/CaregiverAlerts";

import { DoctorLayout } from "./pages/doctor/DoctorLayout";
import { DoctorPatientList } from "./pages/doctor/DoctorPatientList";
import { DoctorPatientDetail } from "./pages/doctor/DoctorPatientDetail";
import { DoctorEmergencies } from "./pages/doctor/DoctorEmergencies";

import { CareNetworkPage } from "./pages/shared/CareNetworkPage";
import { AppointmentsPage } from "./pages/shared/AppointmentsPage";
import { ReportsPage } from "./pages/shared/ReportsPage";
import { AIAssistantPage } from "./pages/shared/AIAssistantPage";
import { CaregiverPatients } from "./pages/caregiver/CaregiverPatients";
import { CaregiverPatientDetail } from "./pages/caregiver/CaregiverPatientDetail";

export default function App() {
  return (
    <BrowserRouter>
      <AppDataProvider>
        <Routes>
          <Route path="/" element={<RoleSelect />} />

          <Route
            path="/login"
            element={<AuthPage mode="login" />}
          />

          <Route
            path="/signup"
            element={<AuthPage mode="signup" />}
          />

          {/* PATIENT */}
          <Route path="/patient" element={<PatientLayout />}>
            <Route index element={<PatientDashboard />} />

            <Route
              path="vitals"
              element={<PatientVitals />}
            />

            <Route
              path="add-data"
              element={<PatientAddData />}
            />

            <Route
              path="appointments"
              element={<AppointmentsPage role="patient" />}
            />

            <Route
              path="reports"
              element={<ReportsPage role="patient" />}
            />

            <Route
              path="records"
              element={<PatientRecords />}
            />

            <Route path="ai" element={<AIAssistantPage />} />

            <Route
              path="care-network"
              element={
                <CareNetworkPage
                  authorName=""
                  authorRole="patient"
                />
              }
            />
          </Route>

          {/* CAREGIVER */}
          <Route path="/caregiver" element={<CaregiverLayout />}>
            <Route
              index
              element={<CaregiverDashboard />}
            />

            <Route
              path="patients"
              element={<CaregiverPatients />}
            />

            <Route
              path="patients/:id"
              element={<CaregiverPatientDetail />}
            />

            <Route
              path="alerts"
              element={<CaregiverAlerts />}
            />

            <Route
              path="appointments"
              element={<AppointmentsPage role="caregiver" />}
            />

            <Route
              path="reports"
              element={<ReportsPage role="caregiver" />}
            />

            <Route path="ai" element={<AIAssistantPage />} />

            <Route
              path="care-network"
              element={
                <CareNetworkPage
                  authorName=""
                  authorRole="caregiver"
                />
              }
            />
          </Route>

          {/* DOCTOR */}
          <Route path="/doctor" element={<DoctorLayout />}>
            <Route
              index
              element={<DoctorPatientList />}
            />

            <Route
              path="patients/:id"
              element={<DoctorPatientDetail />}
            />

            <Route
              path="appointments"
              element={<AppointmentsPage role="doctor" />}
            />

            <Route
              path="reports"
              element={<ReportsPage role="doctor" />}
            />

            <Route
              path="emergencies"
              element={<DoctorEmergencies />}
            />

            <Route path="ai" element={<AIAssistantPage />} />

            <Route
              path="care-network"
              element={
                <CareNetworkPage
                  authorName=""
                  authorRole="doctor"
                />
              }
            />
          </Route>

          {/* FALLBACK */}
          <Route
            path="*"
            element={<RoleSelect />}
          />
        </Routes>
      </AppDataProvider>
    </BrowserRouter>
  );
}