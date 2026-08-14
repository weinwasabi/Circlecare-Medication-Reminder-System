import { getDatabase } from "../database";

export async function saveNotificationRecord(data: {
  alert_id?: number | null;
  receiver_type: string;
  receiver_id: number;
  message: string;
  sent_date: string;
  sent_time: string;
  status: string;
}) {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO notifications
     (alert_id, receiver_type, receiver_id, message, sent_date, sent_time, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.alert_id ?? null,
      data.receiver_type,
      data.receiver_id,
      data.message,
      data.sent_date,
      data.sent_time,
      data.status,
    ]
  );
}
