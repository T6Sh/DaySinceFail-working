// Daily streak reminder — fully local. Stores user's preferred time in
// localStorage. On native, schedules a repeating Capacitor LocalNotification.
// On web, uses a setTimeout loop while the app is open + a Notification when
// the scheduled time arrives.

import { Capacitor } from "@capacitor/core";
import { requestNotifPermission } from "./notifications";

const KEY = "reminder:daily"; // { enabled: boolean, hour: number, minute: number }
const NATIVE_ID = 777001;

export type ReminderSettings = {
  enabled: boolean;
  hour: number;   // 0-23
  minute: number; // 0-59
};

export function getReminder(): ReminderSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { enabled: false, hour: 21, minute: 0 };
}

export function saveReminder(s: ReminderSettings) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

function nextOccurrence(hour: number, minute: number): Date {
  const now = new Date();
  const next = new Date();
  next.setHours(hour, minute, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next;
}

export async function applyReminder(s: ReminderSettings) {
  saveReminder(s);

  if (Capacitor.isNativePlatform()) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      // Cancel any previous schedule
      await LocalNotifications.cancel({ notifications: [{ id: NATIVE_ID }] }).catch(() => {});
      if (!s.enabled) return;
      await LocalNotifications.schedule({
        notifications: [
          {
            id: NATIVE_ID,
            title: "Keep your streak alive",
            body: "Open DaysSinceFail and check in on your counters.",
            schedule: {
              on: { hour: s.hour, minute: s.minute },
              allowWhileIdle: true,
              every: "day",
            },
          },
        ],
      });
    } catch {/* ignore */}
    return;
  }

  // Web: clear any pending timer and schedule the next one in-page
  scheduleWebReminder(s);
}

let webTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleWebReminder(s: ReminderSettings) {
  if (webTimer) {
    clearTimeout(webTimer);
    webTimer = null;
  }
  if (!s.enabled) return;
  if (typeof Notification === "undefined") return;

  const fire = () => {
    try {
      if (Notification.permission === "granted") {
        new Notification("Keep your streak alive", {
          body: "Open DaysSinceFail and check in on your counters.",
        });
      }
    } catch {/* ignore */}
    // Re-arm for the next day
    scheduleWebReminder(getReminder());
  };

  const delay = nextOccurrence(s.hour, s.minute).getTime() - Date.now();
  // setTimeout max ~24.8 days; daily fits fine
  webTimer = setTimeout(fire, Math.max(1000, delay));
}

// Call on app boot to re-arm the web timer after a refresh.
export function bootReminders() {
  const s = getReminder();
  if (!Capacitor.isNativePlatform() && s.enabled) {
    scheduleWebReminder(s);
  }
}

export async function enableReminderWithPermission(s: ReminderSettings) {
  if (s.enabled) {
    const ok = await requestNotifPermission();
    if (!ok) {
      saveReminder({ ...s, enabled: false });
      return false;
    }
  }
  await applyReminder(s);
  return true;
}
