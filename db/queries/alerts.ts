import { getDatabase } from "../database";

export interface Alert {
  alert_id: number;
  patient_id: number;
  nurse_id: number;
  log_id: number | null;
  alert_type: string;
  alert_message: string;
  alert_date: string;
  alert_time: string;
  status: string;
  created_at: string;
  patient_fname?: string;
  patient_lname?: string;
  room_name?: string;
}

export async function getAlertsByNurse(nurseId: number): Promise<Alert[]> {
  const db = await getDatabase();
  return await db.getAllAsync<Alert>(`
    SELECT a.*, p.fname as patient_fname, p.lname as patient_lname, r.room_name
    FROM alerts a
    JOIN patients p ON a.patient_id = p.patient_id
    LEFT JOIN rooms r ON p.room_id = r.room_id
    WHERE a.nurse_id = ?
    ORDER BY a.created_at DESC
    LIMIT 30
  `, [nurseId]);
}

export async function getAllAlerts(): Promise<Alert[]> {
  const db = await getDatabase();
  return await db.getAllAsync<Alert>(`
    SELECT a.*, p.fname as patient_fname, p.lname as patient_lname, r.room_name
    FROM alerts a
    JOIN patients p ON a.patient_id = p.patient_id
    LEFT JOIN rooms r ON p.room_id = r.room_id
    ORDER BY a.created_at DESC
    LIMIT 50
  `);
}

export async function createAlert(data: {
  patient_id: number;
  nurse_id: number;
  log_id?: number;
  alert_type: string;
  alert_message: string;
}): Promise<number> {
  const db = await getDatabase();
  const now = new Date();
  const date = now.toISOString().split("T")[0];
  const time = now.toTimeString().split(" ")[0];
  const result = await db.runAsync(
    `INSERT INTO alerts (patient_id, nurse_id, log_id, alert_type, alert_message, alert_date, alert_time, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'unread')`,
    [data.patient_id, data.nurse_id, data.log_id ?? null, data.alert_type, data.alert_message, date, time]
  );
  return result.lastInsertRowId;
}

export async function markAlertRead(alertId: number) {
  const db = await getDatabase();
  await db.runAsync(`UPDATE alerts SET status = 'read' WHERE alert_id = ?`, [alertId]);
}

export async function getUnreadAlertCount(nurseId: number): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM alerts WHERE nurse_id = ? AND status = 'unread'`,
    [nurseId]
  );
  return row?.count ?? 0;
}
