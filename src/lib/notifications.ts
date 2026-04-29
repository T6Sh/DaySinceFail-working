// Local-only notifications: stored in localStorage, OS notifications via
// the Web Notification API (and Capacitor LocalNotifications when on native).
// No backend / realtime dependency — fully safe to add.

import { Capacitor } from "@capacitor/core";

export type NotifKind = "follow" | "streak_reset";
export type StoredNotif = {
  id: string;
  kind: NotifKind;
  title: string;
  body: string;
  url?: string;
  createdAt: number;
  read: boolean;
};

const KEY = (uid: string) => `notifs:${uid}`;
const PREFS_KEY = (uid: string) => `notifs:prefs:${uid}`;
const MAX = 100;

export type NotifPrefs = { follow: boolean; streak_reset: boolean };
const DEFAULT_PREFS: NotifPrefs = { follow: true, streak_reset: true };

export function getNotifPrefs(uid: string): NotifPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY(uid));
    if (!raw) return { ...DEFAULT_PREFS };
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function setNotifPrefs(uid: string, prefs: NotifPrefs) {
  localStorage.setItem(PREFS_KEY(uid), JSON.stringify(prefs));
  window.dispatchEvent(new CustomEvent("notifs:update"));
}

export function isKindEnabled(uid: string, kind: NotifKind): boolean {
  return getNotifPrefs(uid)[kind] !== false;
}

export function getNotifs(uid: string): StoredNotif[] {
  try {
    return JSON.parse(localStorage.getItem(KEY(uid)) || "[]");
  } catch {
    return [];
  }
}

export function saveNotifs(uid: string, list: StoredNotif[]) {
  localStorage.setItem(KEY(uid), JSON.stringify(list.slice(0, MAX)));
}

export function unreadCount(uid: string): number {
  return getNotifs(uid).filter((n) => !n.read).length;
}

export function markAllRead(uid: string) {
  saveNotifs(
    uid,
    getNotifs(uid).map((n) => ({ ...n, read: true }))
  );
}

export function clearAll(uid: string) {
  saveNotifs(uid, []);
}

export async function requestNotifPermission(): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const res = await LocalNotifications.requestPermissions();
      return res.display === "granted";
    }
    if (typeof Notification === "undefined") return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    const p = await Notification.requestPermission();
    return p === "granted";
  } catch {
    return false;
  }
}

async function fireOSNotification(title: string, body: string) {
  try {
    if (Capacitor.isNativePlatform()) {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      await LocalNotifications.schedule({
        notifications: [
          { id: Math.floor(Math.random() * 2_000_000_000), title, body, schedule: { at: new Date(Date.now() + 50) } },
        ],
      });
      return;
    }
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      // Only fire OS-level when tab is hidden / app in background
      if (typeof document !== "undefined" && document.visibilityState === "visible") return;
      new Notification(title, { body });
    }
  } catch {
    /* ignore */
  }
}

export async function pushNotif(uid: string, n: Omit<StoredNotif, "id" | "createdAt" | "read">) {
  if (!isKindEnabled(uid, n.kind)) return;
  const entry: StoredNotif = {
    ...n,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    read: false,
  };
  const list = getNotifs(uid);
  list.unshift(entry);
  saveNotifs(uid, list);
  await fireOSNotification(entry.title, entry.body);
  window.dispatchEvent(new CustomEvent("notifs:update"));
}
