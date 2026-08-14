import { getDatabase } from "../database";

export interface Room {
  room_id: number;
  room_name: string;
  room_type: string;
  capacity: number;
  status: string;
  occupied?: number;
}

export async function getAllRooms(): Promise<Room[]> {
  const db = await getDatabase();
  return await db.getAllAsync<Room>(`
    SELECT r.*, COUNT(p.patient_id) as occupied
    FROM rooms r
    LEFT JOIN patients p ON r.room_id = p.room_id AND p.status = 'active'
    GROUP BY r.room_id
    ORDER BY r.room_name ASC
  `);
}

export async function getAssignableRooms(): Promise<Room[]> {
  const rooms = await getAllRooms();
  return rooms.filter((room) => (room.occupied ?? 0) < room.capacity);
}

export async function createRoom(data: {
  room_name: string;
  room_type: string;
  capacity: number;
  status?: string;
}): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO rooms (room_name, room_type, capacity, status)
     VALUES (?, ?, ?, ?)`,
    [data.room_name, data.room_type, data.capacity, data.status ?? "available"]
  );
  return result.lastInsertRowId;
}

export async function updateRoom(
  roomId: number,
  data: {
    room_name: string;
    room_type: string;
    capacity: number;
    status: string;
  }
) {
  const db = await getDatabase();
  const activePatients = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) as c FROM patients WHERE room_id = ? AND status = 'active'`,
    [roomId]
  );

  if ((activePatients?.c ?? 0) > data.capacity) {
    throw new Error("Capacity cannot be lower than the current active patients in this room.");
  }

  await db.runAsync(
    `UPDATE rooms
     SET room_name = ?, room_type = ?, capacity = ?, status = ?
     WHERE room_id = ?`,
    [data.room_name, data.room_type, data.capacity, data.status, roomId]
  );

  await refreshRoomStatus(roomId);
}

export async function deleteRoom(roomId: number) {
  const db = await getDatabase();
  const activePatients = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) as c FROM patients WHERE room_id = ? AND status = 'active'`,
    [roomId]
  );

  if ((activePatients?.c ?? 0) > 0) {
    throw new Error("Move or discharge active patients before deleting this room.");
  }

  await db.runAsync(`DELETE FROM rooms WHERE room_id = ?`, [roomId]);
}

export async function refreshRoomStatus(roomId: number) {
  const db = await getDatabase();
  const room = await db.getFirstAsync<{ capacity: number; status: string }>(
    `SELECT capacity, status FROM rooms WHERE room_id = ?`,
    [roomId]
  );
  if (!room) return;

  const activePatients = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) as c FROM patients WHERE room_id = ? AND status = 'active'`,
    [roomId]
  );
  const occupied = activePatients?.c ?? 0;

  const nextStatus =
    room.status === "maintenance"
      ? "maintenance"
      : occupied >= room.capacity
        ? "full"
        : "available";

  await db.runAsync(`UPDATE rooms SET status = ? WHERE room_id = ?`, [nextStatus, roomId]);
}
