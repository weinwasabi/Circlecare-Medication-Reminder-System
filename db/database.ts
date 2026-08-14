import * as SQLite from "expo-sqlite";

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync("circlecare.db");
  await initSchema(db);
  return db;
}

async function initSchema(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`PRAGMA journal_mode = WAL;`);
  await db.execAsync(`PRAGMA foreign_keys = ON;`);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fname TEXT,
      lname TEXT,
      email TEXT UNIQUE,
      password TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS nurses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fname TEXT,
      lname TEXT,
      contact_number TEXT,
      email TEXT UNIQUE,
      password TEXT,
      role TEXT DEFAULT 'Nurse',
      user_type TEXT DEFAULT 'nurse',
      created_by_admin INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (created_by_admin) REFERENCES admins(id)
    );

    CREATE TABLE IF NOT EXISTS illness (
      illness_id INTEGER PRIMARY KEY AUTOINCREMENT,
      illness_name TEXT,
      category TEXT,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS rooms (
      room_id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_name TEXT,
      room_type TEXT,
      capacity INTEGER,
      status TEXT
    );

    CREATE TABLE IF NOT EXISTS patients (
      patient_id INTEGER PRIMARY KEY AUTOINCREMENT,
      nurse_id INTEGER NOT NULL,
      illness_id INTEGER NOT NULL,
      room_id INTEGER NOT NULL,
      fname TEXT,
      lname TEXT,
      age INTEGER,
      sex TEXT,
      address TEXT,
      contact TEXT,
      username TEXT UNIQUE,
      password TEXT,
      status TEXT,
      created_by_admin INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (nurse_id) REFERENCES nurses(id),
      FOREIGN KEY (illness_id) REFERENCES illness(illness_id),
      FOREIGN KEY (room_id) REFERENCES rooms(room_id),
      FOREIGN KEY (created_by_admin) REFERENCES admins(id)
    );

    CREATE TABLE IF NOT EXISTS medications (
      med_id INTEGER PRIMARY KEY AUTOINCREMENT,
      med_name TEXT,
      dosage TEXT,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS medication_schedules (
      schedule_id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      nurse_id INTEGER,
      med_id INTEGER NOT NULL,
      time_schedule TEXT,
      frequency TEXT,
      start_date TEXT,
      end_date TEXT,
      status TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
      FOREIGN KEY (nurse_id) REFERENCES nurses(id),
      FOREIGN KEY (med_id) REFERENCES medications(med_id)
    );

    CREATE TABLE IF NOT EXISTS medication_logs (
      log_id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      schedule_id INTEGER NOT NULL,
      confirmation_date TEXT,
      confirmation_time TEXT,
      status TEXT,
      remarks TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
      FOREIGN KEY (schedule_id) REFERENCES medication_schedules(schedule_id)
    );

    CREATE TABLE IF NOT EXISTS alerts (
      alert_id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      nurse_id INTEGER NOT NULL,
      log_id INTEGER,
      alert_type TEXT,
      alert_message TEXT,
      alert_date TEXT,
      alert_time TEXT,
      status TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
      FOREIGN KEY (nurse_id) REFERENCES nurses(id),
      FOREIGN KEY (log_id) REFERENCES medication_logs(log_id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      notif_id INTEGER PRIMARY KEY AUTOINCREMENT,
      alert_id INTEGER NOT NULL,
      receiver_type TEXT,
      receiver_id INTEGER,
      message TEXT,
      sent_date TEXT,
      sent_time TEXT,
      status TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (alert_id) REFERENCES alerts(alert_id)
    );
  `);

  await runMigrations(db);
  await seedDefaults(db);
}

async function runMigrations(db: SQLite.SQLiteDatabase) {
  const scheduleCols = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(medication_schedules)`
  );
  const hasNurseId = scheduleCols.some((col) => col.name === "nurse_id");

  if (!hasNurseId) {
    await db.execAsync(`ALTER TABLE medication_schedules ADD COLUMN nurse_id INTEGER;`);
  }

  await db.execAsync(`
    UPDATE medication_schedules
    SET nurse_id = (
      SELECT patients.nurse_id
      FROM patients
      WHERE patients.patient_id = medication_schedules.patient_id
    )
    WHERE nurse_id IS NULL
  `);
}

async function seedDefaults(db: SQLite.SQLiteDatabase) {
  // Seed default admin if none exists
  const admin = await db.getFirstAsync(`SELECT id FROM admins LIMIT 1`);
  if (!admin) {
    await db.runAsync(
      `INSERT INTO admins (fname, lname, email, password) VALUES (?, ?, ?, ?)`,
      ["Super", "Admin", "admin@circlecare.app", "admin123"]
    );
  }

  // Seed default MHO Polomolok staff roster
  const staffCount = await db.getFirstAsync<{ c: number }>(`SELECT COUNT(*) as c FROM nurses`);
  if ((staffCount?.c ?? 0) === 0) {
    const staffRows = [
      ["Grace", "Doctor", "+63 917 111 0001", "grace@mho.polomolok", "mho123", "Doctor"],
      ["Mark", "Doctor", "+63 917 111 0002", "mark@mho.polomolok", "mho123", "Doctor"],
      ["Cha", "Doctor", "+63 917 111 0003", "cha@mho.polomolok", "mho123", "Doctor"],
      ["Gab", "Nurse", "+63 917 111 0004", "gab@mho.polomolok", "mho123", "Nurse"],
      ["Gretchen", "Nurse", "+63 917 111 0005", "gretchen@mho.polomolok", "mho123", "Nurse"],
    ] as const;

    for (const [fname, lname, contact, email, password, role] of staffRows) {
      await db.runAsync(
        `INSERT INTO nurses (fname, lname, contact_number, email, password, role, created_by_admin)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [fname, lname, contact, email, password, role, 1]
      );
    }
  }

  // Seed mental health conditions for the Teen Center
  const ill = await db.getFirstAsync(`SELECT illness_id FROM illness LIMIT 1`);
  if (!ill) {
    const illnesses = [
      ["Anxiety", "Mental Health", "Persistent worry or fear affecting daily functioning."],
      ["Depression", "Mental Health", "Low mood and loss of interest in usual activities."],
      ["Bipolar Disorder", "Mental Health", "Mood episodes involving elevated and depressive states."],
      ["PTSD", "Mental Health", "Trauma-related stress responses after distressing events."],
      ["Adjustment Disorder", "Mental Health", "Emotional or behavioral reaction to a significant life change."],
    ] as const;

    for (const [name, category, description] of illnesses) {
      await db.runAsync(
        `INSERT INTO illness (illness_name, category, description) VALUES (?, ?, ?)`,
        [name, category, description]
      );
    }
  }

  // Seed rooms
  const room = await db.getFirstAsync(`SELECT room_id FROM rooms LIMIT 1`);
  if (!room) {
    const roomData = [
      ["Room 101", "General", 4, "available"],
      ["Room 102", "General", 4, "available"],
      ["Room 201", "Private", 1, "available"],
      ["ICU-01", "ICU", 2, "available"],
    ];
    for (const r of roomData) {
      await db.runAsync(
        `INSERT INTO rooms (room_name, room_type, capacity, status) VALUES (?, ?, ?, ?)`,
        r
      );
    }
  }

}
