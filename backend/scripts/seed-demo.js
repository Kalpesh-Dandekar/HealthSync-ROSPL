import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient } from "../generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";

// DEMO ACCOUNTS ONLY. These predictable credentials must never be used in production.
const DEMO_USERS = [
  { key: "aarav", name: "Aarav", email: "aarav@gmail.com", password: "aarav1234", role: "PATIENT" },
  { key: "riya", name: "Riya", email: "riya@gmail.com", password: "riya1234", role: "PATIENT" },
  { key: "neha", name: "Neha", email: "neha@gmail.com", password: "neha1234", role: "PHYSICIAN" },
  { key: "arjun", name: "Arjun", email: "arjun@gmail.com", password: "arjun1234", role: "PHYSICIAN" },
  { key: "meera", name: "Meera", email: "meera@gmail.com", password: "meera1234", role: "CAREGIVER" },
  { key: "karan", name: "Karan", email: "karan@gmail.com", password: "karan1234", role: "CAREGIVER" },
];
const connectionString=process.env.DATABASE_URL;
if(!connectionString)throw new Error("DATABASE_URL is required to seed demo data.");
const prisma=new PrismaClient({adapter:new PrismaPg({connectionString})});
const at=value=>new Date(value);

async function usersByKey(){const rows=await prisma.user.findMany({where:{email:{in:DEMO_USERS.map(user=>user.email)}}});return Object.fromEntries(DEMO_USERS.map(definition=>[definition.key,rows.find(row=>row.email===definition.email)]));}

async function assertNoCrossScope(users){
  const ids=Object.values(users).filter(Boolean).map(user=>user.id), patientIds=[users.aarav?.id,users.riya?.id].filter(Boolean);
  if(!ids.length)return;
  const [connections,records,appointments,emergencies,vitals]=await Promise.all([
    prisma.careConnection.count({where:{patientId:{notIn:patientIds},OR:[{physicianId:{in:ids}},{caregiverId:{in:ids}}]}}),
    prisma.clinicalRecord.count({where:{patientId:{notIn:patientIds},physicianId:{in:ids}}}),
    prisma.appointment.count({where:{userId:{notIn:patientIds},physicianId:{in:ids}}}),
    prisma.emergency.count({where:{patientId:{notIn:patientIds},OR:[{triggeredById:{in:ids}},{respondingPhysicianId:{in:ids}},{resolvedById:{in:ids}}]}}),
    prisma.vital.count({where:{userId:{notIn:patientIds},recordedById:{in:ids}}}),
  ]);
  if([connections,records,appointments,emergencies,vitals].some(Boolean))throw new Error("Demo accounts have cross-scope data. Clean/seed aborted to protect unrelated patients.");
}

async function clearPatientBaseline(tx,patientIds){
  const emergencyIds=(await tx.emergency.findMany({where:{patientId:{in:patientIds}},select:{id:true}})).map(row=>row.id);
  if(emergencyIds.length)await tx.emergencyCaregiverAcknowledgement.deleteMany({where:{emergencyId:{in:emergencyIds}}});
  await tx.emergency.deleteMany({where:{patientId:{in:patientIds}}});
  await tx.medicationLog.deleteMany({where:{userId:{in:patientIds}}});
  await tx.medication.deleteMany({where:{userId:{in:patientIds}}});
  await tx.vital.deleteMany({where:{userId:{in:patientIds}}});
  await tx.clinicalRecord.deleteMany({where:{patientId:{in:patientIds}}});
  await tx.appointment.deleteMany({where:{userId:{in:patientIds}}});
  await tx.alert.deleteMany({where:{userId:{in:patientIds}}});
  await tx.physicianConnectionRequest.deleteMany({where:{patientId:{in:patientIds}}});
  await tx.caregiverInvite.deleteMany({where:{patientId:{in:patientIds}}});
  await tx.careConnection.deleteMany({where:{patientId:{in:patientIds}}});
}

async function cleanDemo(){
  const users=await usersByKey();await assertNoCrossScope(users);const ids=Object.values(users).filter(Boolean).map(user=>user.id);if(!ids.length){console.log("No HealthSync demo accounts found.");return;}
  const patientIds=[users.aarav?.id,users.riya?.id].filter(Boolean);
  await prisma.$transaction(async tx=>{await clearPatientBaseline(tx,patientIds);await tx.emergencyCaregiverAcknowledgement.deleteMany({where:{caregiverId:{in:ids}}});await tx.physicianAvailability.deleteMany({where:{physicianId:{in:ids}}});await tx.physicianUnavailablePeriod.deleteMany({where:{physicianId:{in:ids}}});await tx.physicianConnectionRequest.deleteMany({where:{OR:[{senderId:{in:ids}},{recipientId:{in:ids}},{physicianId:{in:ids}}]}});await tx.careConnection.deleteMany({where:{OR:[{caregiverId:{in:ids}},{physicianId:{in:ids}}]}});await tx.user.deleteMany({where:{id:{in:ids}}});});
  console.log("HealthSync demo accounts and demo-owned data removed safely.");
}

async function seedDemo(){
  const protectedSelect={id:true,name:true,email:true,password:true,role:true,_count:{select:{patientConnections:true,caregiverConnections:true,physicianConnections:true,vitals:true,medications:true,patientAppointments:true,patientClinicalRecords:true,alerts:true,patientEmergencies:true}}};
  const beforeProtected=await prisma.user.findMany({where:{OR:[{name:{in:["root","jack","care"]}},{email:{in:["root","jack","care"]}}]},select:protectedSelect,orderBy:{id:"asc"}});
  const existing=await usersByKey();await assertNoCrossScope(existing);
  for(const definition of DEMO_USERS){const password=await bcrypt.hash(definition.password,10);await prisma.user.upsert({where:{email:definition.email},create:{name:definition.name,email:definition.email,password,role:definition.role},update:{name:definition.name,password,role:definition.role}});}
  const users=await usersByKey(),patientIds=[users.aarav.id,users.riya.id];
  await prisma.$transaction(async tx=>{
    await clearPatientBaseline(tx,patientIds);
    await tx.physicianAvailability.deleteMany({where:{physicianId:{in:[users.neha.id,users.arjun.id]}}});
    await tx.physicianAvailability.createMany({data:[users.neha.id,users.arjun.id].flatMap(physicianId=>[1,2,3,4,5].map(dayOfWeek=>({physicianId,dayOfWeek,startTime:"09:00",endTime:"17:00",slotDuration:30})))});
    await tx.careConnection.createMany({data:[{patientId:users.aarav.id,physicianId:users.neha.id},{patientId:users.aarav.id,caregiverId:users.meera.id},{patientId:users.riya.id,physicianId:users.arjun.id},{patientId:users.riya.id,caregiverId:users.karan.id}]});
    const aaravMeds=await Promise.all([
      tx.medication.create({data:{userId:users.aarav.id,name:"Amlodipine",dosage:"5 mg",schedule:"08:00 daily",stock:24,createdAt:at("2026-09-20T04:00:00Z")}}),
      tx.medication.create({data:{userId:users.aarav.id,name:"Metformin",dosage:"500 mg",schedule:"08:00 and 20:00",stock:38,createdAt:at("2026-09-20T04:05:00Z")}}),
      tx.medication.create({data:{userId:users.aarav.id,name:"Vitamin D3",dosage:"1000 IU",schedule:"09:00 daily",stock:18,createdAt:at("2026-09-20T04:10:00Z")}}),
    ]);
    const riyaMeds=await Promise.all([
      tx.medication.create({data:{userId:users.riya.id,name:"Cetirizine",dosage:"10 mg",schedule:"21:00 daily",stock:20,createdAt:at("2026-09-22T04:00:00Z")}}),
      tx.medication.create({data:{userId:users.riya.id,name:"Calcium carbonate",dosage:"500 mg",schedule:"09:00 daily",stock:26,createdAt:at("2026-09-22T04:05:00Z")}}),
    ]);
    const logDates=["2026-09-25","2026-09-26","2026-09-27","2026-09-28","2026-09-29","2026-09-30","2026-10-01","2026-10-02"],logData=[];for(let day=0;day<logDates.length;day++){for(const [index,medication] of aaravMeds.entries()){const scheduled=at(`${logDates[day]}T${index===1?"14":"03"}:00:00Z`);const missed=(day===2&&index===1)||(day===5&&index===0);logData.push({medicationId:medication.id,userId:users.aarav.id,status:missed?"MISSED":"TAKEN",scheduledAt:scheduled,takenAt:missed?null:new Date(scheduled.getTime()+20*60000)});}}for(let day=0;day<logDates.length;day++){for(const [index,medication] of riyaMeds.entries()){const scheduled=at(`${logDates[day]}T${index?"03":"15"}:30:00Z`);const missed=day===4&&index===0;logData.push({medicationId:medication.id,userId:users.riya.id,status:missed?"MISSED":"TAKEN",scheduledAt:scheduled,takenAt:missed?null:new Date(scheduled.getTime()+10*60000)});}}await tx.medicationLog.createMany({data:logData});
    const aaravVitals=[[128,82,76,102],[132,84,78,106],[130,83,75,101],[136,86,81,109],[133,84,77,104],[131,82,74,100],[134,85,79,105],[129,81,73,99]];const riyaVitals=[[118,76,70,92],[120,77,72,94],[117,75,69,90],[122,78,73,95],[119,76,71,91],[121,77,72,93],[118,74,68,89]];await tx.vital.createMany({data:[...aaravVitals.map(([systolic,diastolic,heartRate,glucose],i)=>({userId:users.aarav.id,recordedById:i%3===0?users.meera.id:users.aarav.id,source:i%3===0?"CAREGIVER":"PATIENT",systolic,diastolic,heartRate,glucose,recordedAt:at(`2026-${i<5?"09":"10"}-${String(i<5?26+i:i-4).padStart(2,"0")}T03:30:00Z`)})),...riyaVitals.map(([systolic,diastolic,heartRate,glucose],i)=>({userId:users.riya.id,recordedById:i%3===0?users.karan.id:users.riya.id,source:i%3===0?"CAREGIVER":"PATIENT",systolic,diastolic,heartRate,glucose,recordedAt:at(`2026-${i<5?"09":"10"}-${String(i<5?26+i:i-4).padStart(2,"0")}T04:00:00Z`)}))]});
    await tx.clinicalRecord.createMany({data:[{patientId:users.aarav.id,physicianId:users.neha.id,type:"CONSULTATION",title:"Routine wellness consultation",clinicalDate:at("2026-09-24T00:00:00Z"),findings:"Blood pressure shows mild variation across home readings.",interpretation:"Overall pattern remains suitable for routine monitoring.",recommendations:"Continue medications and record morning readings.",status:"NORMAL",followUpRequired:true,followUpDate:at("2026-10-20T00:00:00Z"),createdAt:at("2026-09-24T06:00:00Z")},{patientId:users.aarav.id,physicianId:users.neha.id,type:"FOLLOW_UP",title:"Medication adherence review",clinicalDate:at("2026-10-02T00:00:00Z"),findings:"Most doses recorded; two recent doses were missed.",interpretation:"Adherence is generally steady with room for routine consistency.",recommendations:"Use scheduled reminders and review at the next visit.",status:"NEEDS_ATTENTION",followUpRequired:true,followUpDate:at("2026-10-20T00:00:00Z"),createdAt:at("2026-10-02T07:00:00Z")},{patientId:users.riya.id,physicianId:users.arjun.id,type:"CONSULTATION",title:"Routine health review",clinicalDate:at("2026-09-25T00:00:00Z"),findings:"Home readings are stable with good medication consistency.",interpretation:"Current monitoring pattern is reassuring.",recommendations:"Continue the current routine and periodic readings.",status:"NORMAL",followUpRequired:true,followUpDate:at("2026-10-22T00:00:00Z"),createdAt:at("2026-09-25T06:30:00Z")},{patientId:users.riya.id,physicianId:users.arjun.id,type:"FOLLOW_UP",title:"Home monitoring follow-up",clinicalDate:at("2026-10-03T00:00:00Z"),findings:"Recent readings remain within the established personal range.",interpretation:"No new monitoring concerns recorded.",recommendations:"Maintain the current schedule until follow-up.",status:"NORMAL",followUpRequired:false,createdAt:at("2026-10-03T06:30:00Z")}]});
    await tx.appointment.createMany({data:[{userId:users.aarav.id,physicianId:users.neha.id,title:"Routine consultation",doctor:"Neha",date:"2026-09-24",time:"11:00",scheduledAt:at("2026-09-24T05:30:00Z"),durationMinutes:30,reason:"Routine consultation",status:"COMPLETED",createdAt:at("2026-09-18T05:00:00Z")},{userId:users.aarav.id,physicianId:users.neha.id,title:"Adherence follow-up",doctor:"Neha",date:"2026-10-20",time:"10:00",scheduledAt:at("2026-10-20T04:30:00Z"),durationMinutes:30,reason:"Medication adherence follow-up",status:"CONFIRMED",activeSlotKey:`${users.neha.id}:2026-10-20:10:00`,createdAt:at("2026-10-02T08:00:00Z")},{userId:users.riya.id,physicianId:users.arjun.id,title:"Routine review",doctor:"Arjun",date:"2026-09-25",time:"11:30",scheduledAt:at("2026-09-25T06:00:00Z"),durationMinutes:30,reason:"Routine health review",status:"COMPLETED",createdAt:at("2026-09-19T05:00:00Z")},{userId:users.riya.id,physicianId:users.arjun.id,title:"Monitoring follow-up",doctor:"Arjun",date:"2026-10-22",time:"11:00",scheduledAt:at("2026-10-22T05:30:00Z"),durationMinutes:30,reason:"Home monitoring follow-up",status:"CONFIRMED",activeSlotKey:`${users.arjun.id}:2026-10-22:11:00`,createdAt:at("2026-10-03T08:00:00Z")}]});
    await tx.alert.createMany({data:[{userId:users.aarav.id,type:"handoff_note",message:JSON.stringify({author:"Aarav",authorRole:"patient",note:"Morning readings have been recorded before breakfast."}),severity:"INFO",read:true,createdAt:at("2026-10-01T03:45:00Z")},{userId:users.aarav.id,type:"clinical_note",message:JSON.stringify({author:"Neha",authorRole:"doctor",note:"Continue the current monitoring routine until follow-up."}),severity:"INFO",read:true,createdAt:at("2026-10-02T07:15:00Z")},{userId:users.aarav.id,type:"care_observation",message:JSON.stringify({author:"Meera",authorRole:"caregiver",note:"Aarav has been keeping medication reminders visible near breakfast."}),severity:"INFO",read:true,createdAt:at("2026-10-03T04:30:00Z")},{userId:users.riya.id,type:"handoff_note",message:JSON.stringify({author:"Riya",authorRole:"patient",note:"Evening medication and readings are following the planned routine."}),severity:"INFO",read:true,createdAt:at("2026-10-02T15:30:00Z")},{userId:users.riya.id,type:"care_observation",message:JSON.stringify({author:"Karan",authorRole:"caregiver",note:"Riya has maintained a consistent home monitoring schedule."}),severity:"INFO",read:true,createdAt:at("2026-10-04T04:30:00Z")}]});
  });
  const afterProtected=await prisma.user.findMany({where:{id:{in:beforeProtected.map(user=>user.id)}},select:protectedSelect,orderBy:{id:"asc"}});
  if(JSON.stringify(beforeProtected)!==JSON.stringify(afterProtected))throw new Error("Protected root/jack/care account state changed; seed aborted.");
  const demoRows=await prisma.user.findMany({where:{email:{in:DEMO_USERS.map(user=>user.email)}},select:{id:true,email:true,password:true,role:true}});
  if(demoRows.length!==6)throw new Error("Expected exactly six demo accounts.");
  for(const definition of DEMO_USERS){const row=demoRows.find(user=>user.email===definition.email);if(!row||row.role!==definition.role||row.password===definition.password||!(await bcrypt.compare(definition.password,row.password)))throw new Error(`Demo account verification failed for ${definition.email}.`);}
  const [connections,pendingRequests,activeInvites,emergencies]=await Promise.all([prisma.careConnection.findMany({where:{patientId:{in:patientIds}},select:{patientId:true,physicianId:true,caregiverId:true}}),prisma.physicianConnectionRequest.count({where:{patientId:{in:patientIds},status:"PENDING"}}),prisma.caregiverInvite.count({where:{patientId:{in:patientIds},active:true,consumedAt:null}}),prisma.emergency.count({where:{patientId:{in:patientIds}}})]);
  const expectedConnections=new Set([`${users.aarav.id}:p:${users.neha.id}`,`${users.aarav.id}:c:${users.meera.id}`,`${users.riya.id}:p:${users.arjun.id}`,`${users.riya.id}:c:${users.karan.id}`]);
  const actualConnections=new Set(connections.map(connection=>connection.physicianId?`${connection.patientId}:p:${connection.physicianId}`:`${connection.patientId}:c:${connection.caregiverId}`));
  if(actualConnections.size!==expectedConnections.size||[...expectedConnections].some(key=>!actualConnections.has(key)))throw new Error("Demo care-circle verification failed.");
  if(pendingRequests||activeInvites||emergencies)throw new Error("Demo dynamic-state baseline is not clean.");
  const summary=await Promise.all([users.aarav,users.riya].map(async patient=>({name:patient.name,medications:await prisma.medication.count({where:{userId:patient.id}}),logs:await prisma.medicationLog.count({where:{userId:patient.id}}),vitals:await prisma.vital.count({where:{userId:patient.id}}),clinicalRecords:await prisma.clinicalRecord.count({where:{patientId:patient.id}}),appointments:await prisma.appointment.count({where:{userId:patient.id}}),sharedNotes:await prisma.alert.count({where:{userId:patient.id,type:{in:["handoff_note","clinical_note","care_observation"]}}}),connections:await prisma.careConnection.count({where:{patientId:patient.id}}),emergencies:await prisma.emergency.count({where:{patientId:patient.id}})})));
  console.log("HealthSync demo environment ready.\n");for(const role of ["PATIENT","PHYSICIAN","CAREGIVER"]){console.log(`${role}S`);for(const user of DEMO_USERS.filter(item=>item.role===role))console.log(`${user.name} — ${user.email}`);console.log("");}console.log("CARE CIRCLE A\nAarav → Neha + Meera\n\nCARE CIRCLE B\nRiya → Arjun + Karan\n");for(const item of summary)console.log(`${item.name}: ${item.medications} medications, ${item.logs} adherence logs, ${item.vitals} vitals, ${item.clinicalRecords} clinical records, ${item.appointments} appointments, ${item.sharedNotes} shared notes, ${item.connections} care connections, ${item.emergencies} emergencies.`);console.log("\nDemo baseline seeded with no active emergencies, pending requests, or unused invites.");
}

try{if(process.argv.includes("--clean"))await cleanDemo();else await seedDemo();}catch(error){console.error(`Demo seed failed: ${error.message}`);process.exitCode=1;}finally{await prisma.$disconnect();}
