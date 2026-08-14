import { getDatabase } from "../database";

export interface Medication {
  med_id: number;
  med_name: string;
  dosage: string;
  description: string;
  created_at: string;
}

export interface MedicationSchedule {
  schedule_id: number;
  patient_id: number;
  nurse_id: number;
  med_id: number;
  time_schedule: string;
  frequency: string;
  start_date: string;
  end_date: string;
  status: string;
  med_name?: string;
  dosage?: string;
  nurse_fname?: string;
  nurse_lname?: string;
}

export interface MedicationLog {
  log_id: number;
  patient_id: number;
  schedule_id: number;
  confirmation_date: string;
  confirmation_time: string;
  status: string;
  remarks: string;
  created_at: string;
  med_name?: string;
  time_schedule?: string;
}

export async function getAllMedications(): Promise<Medication[]> {
  const db = await getDatabase();
  return await db.getAllAsync<Medication>(
    `SELECT * FROM medications ORDER BY med_name ASC`
  );
}

export async function createMedication(data: {
  med_name: string;
  dosage: string;
  description: string;
}): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO medications (med_name, dosage, description)
     VALUES (?, ?, ?)`,
    [data.med_name, data.dosage, data.description]
  );
  return result.lastInsertRowId;
}

export async function findMedicationByName(name: string): Promise<Medication | null> {
  const db = await getDatabase();
  return await db.getFirstAsync<Medication>(
    `SELECT * FROM medications WHERE LOWER(med_name) = LOWER(?) LIMIT 1`,
    [name]
  );
}

export async function getSchedulesByPatient(
  patientId: number
): Promise<MedicationSchedule[]> {
  const db = await getDatabase();
  return await db.getAllAsync<MedicationSchedule>(`
    SELECT ms.*, m.med_name, m.dosage
    FROM medication_schedules ms
    JOIN medications m ON ms.med_id = m.med_id
    WHERE ms.patient_id = ? AND ms.status = 'active'
    ORDER BY ms.time_schedule ASC
  `, [patientId]);
}

export async function getTodaySchedules(
  patientId: number
): Promise<MedicationSchedule[]> {
  const db = await getDatabase();
  const today = new Date().toISOString().split("T")[0];
  return await db.getAllAsync<MedicationSchedule>(`
    SELECT ms.*, m.med_name, m.dosage
    FROM medication_schedules ms
    JOIN medications m ON ms.med_id = m.med_id
    WHERE ms.patient_id = ?
      AND ms.status = 'active'
      AND ms.start_date <= ?
      AND (ms.end_date IS NULL OR ms.end_date >= ?)
    ORDER BY ms.time_schedule ASC
  `, [patientId, today, today]);
}

export async function createSchedule(data: {
  patient_id: number;
  nurse_id: number;
  med_id: number;
  time_schedule: string;
  frequency: string;
  start_date: string;
  end_date: string;
}): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO medication_schedules
     (patient_id, nurse_id, med_id, time_schedule, frequency, start_date, end_date, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
    [
      data.patient_id, data.nurse_id, data.med_id, data.time_schedule,
      data.frequency, data.start_date, data.end_date,
    ]
  );
  return result.lastInsertRowId;
}

export async function getSchedulesByNurse(
  nurseId: number
): Promise<MedicationSchedule[]> {
  const db = await getDatabase();
  return await db.getAllAsync<MedicationSchedule>(`
    SELECT ms.*, m.med_name, m.dosage, n.fname as nurse_fname, n.lname as nurse_lname
    FROM medication_schedules ms
    JOIN medications m ON ms.med_id = m.med_id
    LEFT JOIN nurses n ON ms.nurse_id = n.id
    WHERE ms.nurse_id = ?
    ORDER BY ms.created_at DESC
  `, [nurseId]);
}

export async function logMedication(data: {
  patient_id: number;
  schedule_id: number;
  status: "taken" | "missed" | "skipped";
  remarks?: string;
}): Promise<number> {
  const db = await getDatabase();
  const now = new Date();
  const date = now.toISOString().split("T")[0];
  const time = now.toTimeString().split(" ")[0];
  const result = await db.runAsync(
    `INSERT INTO medication_logs
     (patient_id, schedule_id, confirmation_date, confirmation_time, status, remarks)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [data.patient_id, data.schedule_id, date, time, data.status, data.remarks || ""]
  );
  return result.lastInsertRowId;
}

export async function getLogsByPatient(patientId: number): Promise<MedicationLog[]> {
  const db = await getDatabase();
  return await db.getAllAsync<MedicationLog>(`
    SELECT ml.*, m.med_name, ms.time_schedule
    FROM medication_logs ml
    JOIN medication_schedules ms ON ml.schedule_id = ms.schedule_id
    JOIN medications m ON ms.med_id = m.med_id
    WHERE ml.patient_id = ?
    ORDER BY ml.created_at DESC
    LIMIT 50
  `, [patientId]);
}

export async function getTodayLogForSchedule(
  patientId: number,
  scheduleId: number
): Promise<MedicationLog | null> {
  const db = await getDatabase();
  const today = new Date().toISOString().split("T")[0];
  return await db.getFirstAsync<MedicationLog>(
    `SELECT * FROM medication_logs
     WHERE patient_id = ? AND schedule_id = ? AND confirmation_date = ?
     ORDER BY created_at DESC LIMIT 1`,
    [patientId, scheduleId, today]
  );
}
