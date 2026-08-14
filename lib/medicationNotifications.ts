import * as Notifications from "expo-notifications";
import type { MedicationSchedule } from "../db/queries/medications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let notificationsReady = false;

function parseTime(time: string) {
  const [hours = "0", minutes = "0"] = time.split(":");
  return {
    hour: Number(hours) || 0,
    minute: Number(minutes) || 0,
  };
}

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1, 0, 0, 0, 0);
}

function getDailyOffsets(frequency: string) {
  if (frequency === "Twice a Day") return [0, 12];
  if (frequency === "Three Times a Day") return [0, 4, 8];
  return [0];
}

async function ensureNotificationsReady() {
  if (notificationsReady) return true;

  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) return false;

  await Notifications.setNotificationChannelAsync("medication-reminders", {
    name: "Medication Reminders",
    importance: Notifications.AndroidImportance.MAX,
    sound: "default",
    vibrationPattern: [0, 250, 250, 250],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });

  notificationsReady = true;
  return true;
}

export async function syncPatientMedicationNotifications(
  patientId: number,
  schedules: MedicationSchedule[],
  _patientName: string
) {
  const ready = await ensureNotificationsReady();
  if (!ready) return false;

  const existing = await Notifications.getAllScheduledNotificationsAsync();
  const patientNotifications = existing.filter(
    (item) => item.content.data?.patientId === patientId
  );

  await Promise.all(
    patientNotifications.map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier))
  );

  for (const schedule of schedules) {
    const start = parseDate(schedule.start_date);
    const end = parseDate(schedule.end_date || schedule.start_date);
    const { hour, minute } = parseTime(schedule.time_schedule);
    const dailyOffsets = getDailyOffsets(schedule.frequency);
    const lastAllowed = new Date(end);
    lastAllowed.setHours(23, 59, 59, 999);
    const currentDay = new Date(start);
    let scheduledCount = 0;

    while (currentDay <= lastAllowed && scheduledCount < 1098) {
      for (const offset of dailyOffsets) {
        const reminderAt = new Date(currentDay);
        reminderAt.setHours(hour + offset, minute, 0, 0);

        if (reminderAt > lastAllowed) {
          continue;
        }

        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Medication Reminder",
            body: `Time to take ${schedule.med_name}${schedule.dosage ? ` (${schedule.dosage})` : ""}`,
            sound: "default",
            priority: Notifications.AndroidNotificationPriority.MAX,
            data: {
              patientId,
              scheduleId: schedule.schedule_id,
              medName: schedule.med_name,
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
            year: reminderAt.getFullYear(),
            month: reminderAt.getMonth() + 1,
            day: reminderAt.getDate(),
            hour: reminderAt.getHours(),
            minute: reminderAt.getMinutes(),
            channelId: "medication-reminders",
          },
        });

        scheduledCount += 1;
      }

      currentDay.setDate(currentDay.getDate() + 1);
    }
  }

  return true;
}
