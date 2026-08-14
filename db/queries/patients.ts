import { getDatabase } from "../database";
import { refreshRoomStatus } from "./rooms";

export interface Patient {
  patient_id: number;
  fname: string;
  lname: string;
  age: number;
  sex: string;
  address: string;
  contact: string;
  username: string;
  password: string;
  status: string;
  nurse_id: number;
  illness_id: number;
  room_id: number;
  created_by_admin: number;
  illness_name?: string;
  room_name?: string;
  nurse_fname?: string;
  nurse_lname?: string;
}

export async function getAllPatients(): Promise<Patient[]> {
  const db = await getDatabase();
  return await db.getAllAsync<Patient>(`
    SELECT p.*, i.illness_name, r.room_name,
           n.fname as nurse_fname, n.lname as nurse_lname
    FROM patients p
    LEFT JOIN illness i ON p.illness_id = i.illness_id
    LEFT JOIN rooms r ON p.room_id = r.room_id
    LEFT JOIN nurses n ON p.nurse_id = n.id
    ORDER BY p.created_at DESC
  `);
}

export async function getPatientsByNurse(nurseId: number): Promise<Patient[]> {
  const db = await getDatabase();
  return await db.getAllAsync<Patient>(`
    SELECT p.*, i.illness_name, r.room_name
    FROM patients p
    LEFT JOIN illness i ON p.illness_id = i.illness_id
    LEFT JOIN rooms r ON p.room_id = r.room_id
    WHERE p.nurse_id = ?
    ORDER BY p.created_at DESC
  `, [nurseId]);
}

export async function getPatientById(id: number): Promise<Patient | null> {
  const db = await getDatabase();
  return await db.getFirstAsync<Patient>(`
    SELECT p.*, i.illness_name, r.room_name,
           n.fname as nurse_fname, n.lname as nurse_lname
    FROM patients p
    LEFT JOIN illness i ON p.illness_id = i.illness_id
    LEFT JOIN rooms r ON p.room_id = r.room_id
    LEFT JOIN nurses n ON p.nurse_id = n.id
    WHERE p.patient_id = ?
  `, [id]);
}

export async function loginPatient(
  username: string,
  password: string
): Promise<Patient | null> {
  const db = await getDatabase();
  return await db.getFirstAsync<Patient>(
    `SELECT * FROM patients WHERE username = ? AND password = ?`,
    [username, password]
  );
}

export async function createPatient(data: {
  nurse_id: number;
  illness_id: number;
  room_id: number;
  fname: string;
  lname: string;
  age: number;
  sex: string;
  address: string;
  contact: string;
  username: string;
  password: string;
  created_by_admin: number;
}): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO patients 
     (nurse_id, illness_id, room_id, fname, lname, age, sex, address, contact, username, password, status, created_by_admin)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
    [
      data.nurse_id, data.illness_id, data.room_id,
      data.fname, data.lname, data.age, data.sex,
      data.address, data.contact, data.username, data.password,
      data.created_by_admin,
    ]
  );
  await refreshRoomStatus(data.room_id);
  return result.lastInsertRowId;
}

export async function updatePatientStatus(id: number, status: string) {
  const db = await getDatabase();
  const patient = await db.getFirstAsync<{ room_id: number }>(
    `SELECT room_id FROM patients WHERE patient_id = ?`,
    [id]
  );
  await db.runAsync(`UPDATE patients SET status = ? WHERE patient_id = ?`, [status, id]);
  if (patient) {
    await refreshRoomStatus(patient.room_id);
  }
}

export async function updatePatient(
  id: number,
  data: {
    nurse_id: number;
    illness_id: number;
    room_id: number;
    fname: string;
    lname: string;
    age: number;
    sex: string;
    address: string;
    contact: string;
    username: string;
    password?: string;
    status: string;
  }
) {
  const db = await getDatabase();
  const current = await db.getFirstAsync<{ room_id: number; password: string; nurse_id: number }>(
    `SELECT room_id, password, nurse_id FROM patients WHERE patient_id = ?`,
    [id]
  );

  const password = data.password?.trim() ? data.password.trim() : current?.password ?? "";
  const nurseChanged = Boolean(current && current.nurse_id !== data.nurse_id);

  await db.runAsync(
    `UPDATE patients
     SET nurse_id = ?, illness_id = ?, room_id = ?, fname = ?, lname = ?, age = ?,
         sex = ?, address = ?, contact = ?, username = ?, password = ?, status = ?
     WHERE patient_id = ?`,
    [
      data.nurse_id,
      data.illness_id,
      data.room_id,
      data.fname,
      data.lname,
      data.age,
      data.sex,
      data.address,
      data.contact,
      data.username,
      password,
      data.status,
      id,
    ]
  );

  if (nurseChanged) {
    await db.runAsync(`UPDATE medication_schedules SET nurse_id = ? WHERE patient_id = ?`, [
      data.nurse_id,
      id,
    ]);
    await db.runAsync(
      `UPDATE alerts
       SET nurse_id = ?
       WHERE patient_id = ? AND status = 'unread'`,
      [data.nurse_id, id]
    );
  }

  if (current?.room_id && current.room_id !== data.room_id) {
    await refreshRoomStatus(current.room_id);
  }
  await refreshRoomStatus(data.room_id);
}

export async function deletePatient(id: number) {
  const db = await getDatabase();
  const current = await db.getFirstAsync<{ room_id: number }>(
    `SELECT room_id FROM patients WHERE patient_id = ?`,
    [id]
  );

  await db.runAsync(`DELETE FROM medication_logs WHERE patient_id = ?`, [id]);
  await db.runAsync(`DELETE FROM medication_schedules WHERE patient_id = ?`, [id]);
  await db.runAsync(`DELETE FROM alerts WHERE patient_id = ?`, [id]);
  await db.runAsync(`DELETE FROM patients WHERE patient_id = ?`, [id]);

  if (current?.room_id) {
    await refreshRoomStatus(current.room_id);
  }
}

export async function createIllness(name: string): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO illness (illness_name) VALUES (?)`,
    [name]
  );
  return result.lastInsertRowId;
}
