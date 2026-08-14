import type { MedicationSchedule } from "../db/queries/medications";

const STORAGE_KEY = "circlecare:web-medication-reminders";

function safeLocalStorageSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures in restrictive browser modes.
  }
}

export async function syncPatientMedicationNotifications(
  patientId: number,
  schedules: MedicationSchedule[],
  patientName: string
) {
  if (typeof window === "undefined") return false;

  safeLocalStorageSet(
    STORAGE_KEY,
    JSON.stringify({
      patientId,
      patientName,
      syncedAt: new Date().toISOString(),
      schedules: schedules.map((schedule) => ({
        schedule_id: schedule.schedule_id,
        med_name: schedule.med_name,
        dosage: schedule.dosage,
        time_schedule: schedule.time_schedule,
        frequency: schedule.frequency,
        start_date: schedule.start_date,
        end_date: schedule.end_date,
      })),
    })
  );

  if (!("Notification" in window)) {
    return true;
  }

  if (Notification.permission === "default") {
    try {
      await Notification.requestPermission();
    } catch {
      return false;
    }
  }

  return Notification.permission === "granted" || Notification.permission === "denied";
}
