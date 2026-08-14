import { getDatabase } from "../database";

export interface Nurse {
  id: number;
  fname: string;
  lname: string;
  contact_number: string;
  email: string;
  password: string;
  role?: string;
  user_type: string;
  created_by_admin: number;
  created_at: string;
  patient_count?: number;
}

export async function getAllNurses(): Promise<Nurse[]> {
  const db = await getDatabase();
  return await db.getAllAsync<Nurse>(`
    SELECT n.*, COUNT(p.patient_id) as patient_count
    FROM nurses n
    LEFT JOIN patients p ON n.id = p.nurse_id AND p.status = 'active'
    GROUP BY n.id
    ORDER BY n.created_at DESC
  `);
}

export async function loginNurse(
  email: string,
  password: string
): Promise<Nurse | null> {
  const db = await getDatabase();
  return await db.getFirstAsync<Nurse>(
    `SELECT * FROM nurses WHERE email = ? AND password = ?`,
    [email, password]
  );
}

export async function loginAdmin(
  email: string,
  password: string
): Promise<{ id: number; fname: string; lname: string; email: string } | null> {
  const db = await getDatabase();
  return await db.getFirstAsync(
    `SELECT id, fname, lname, email FROM admins WHERE email = ? AND password = ?`,
    [email, password]
  );
}

export async function createNurse(data: {
  fname: string;
  lname: string;
  contact_number: string;
  email: string;
  password: string;
  role?: string;
  created_by_admin: number;
}): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO nurses (fname, lname, contact_number, email, password, role, created_by_admin)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [data.fname, data.lname, data.contact_number, data.email, data.password, data.role ?? "Nurse", data.created_by_admin]
  );
  return result.lastInsertRowId;
}

export async function updateNurse(
  id: number,
  data: {
    fname: string;
    lname: string;
    contact_number: string;
    email: string;
    role?: string;
    password?: string;
  }
) {
  const db = await getDatabase();
  const hasPassword = Boolean(data.password?.trim());

  if (hasPassword) {
    await db.runAsync(
      `UPDATE nurses
       SET fname = ?, lname = ?, contact_number = ?, email = ?, role = ?, password = ?
       WHERE id = ?`,
      [data.fname, data.lname, data.contact_number, data.email, data.role ?? "Nurse", data.password!.trim(), id]
    );
    return;
  }

  await db.runAsync(
    `UPDATE nurses
     SET fname = ?, lname = ?, contact_number = ?, email = ?, role = ?
     WHERE id = ?`,
    [data.fname, data.lname, data.contact_number, data.email, data.role ?? "Nurse", id]
  );
}

export async function deleteNurse(id: number) {
  const db = await getDatabase();
  const activePatients = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) as c FROM patients WHERE nurse_id = ? AND status = 'active'`,
    [id]
  );

  if ((activePatients?.c ?? 0) > 0) {
    throw new Error("Reassign or discharge this nurse's active patients before deleting.");
  }

  await db.runAsync(`DELETE FROM nurses WHERE id = ?`, [id]);
}
