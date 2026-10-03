import { Outlet } from "react-router-dom";
import { Activity, Bot, Calendar, ClipboardList, FileText, HeartPulse, PlusCircle, Users } from "lucide-react";
import { AppShell, type NavItem } from "../../components/layout/AppShell";
import { useAppData } from "../../data/AppDataContext";
import "./PatientLayout.css";
const navItems:NavItem[]=[
 {to:"/patient",label:"Adherence",icon:Activity,end:true},
 {to:"/patient/ai",label:"AI Assistant",icon:Bot},
 {to:"/patient/vitals",label:"Vitals",icon:HeartPulse},
 {to:"/patient/add-data",label:"Add Data",icon:PlusCircle},
 {to:"/patient/appointments",label:"Appointments",icon:Calendar},
 {to:"/patient/reports",label:"Reports",icon:ClipboardList},
 {to:"/patient/records",label:"Records",icon:FileText},
 {to:"/patient/care-network",label:"Care Network",icon:Users},
];
export function PatientLayout(){const{patient}=useAppData();return <AppShell role="patient" navItems={navItems} userName={patient.name||"Patient"}><Outlet/></AppShell>}
